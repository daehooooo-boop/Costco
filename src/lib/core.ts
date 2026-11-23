// 화면과 수집기가 함께 쓰는 순수 함수. 날짜는 한국 시간 'YYYY-MM-DD' 문자열로 다룬다.
import type { Announced, Closure, Deal, Holiday, ISODate, ManualClosure, Overrides, RawDeal, Store, Tip } from "./types";

const DAY = 86_400_000;

export function todayKST(now: Date): ISODate {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}

export function nowHHMMKST(now: Date): string {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(11, 16);
}

export function addDays(iso: ISODate, n: number): ISODate {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
}

export function weekdayOf(iso: ISODate): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

/** year년 month월(1~12)의 n번째 weekday(0=일). 없으면 null */
export function nthWeekday(year: number, month: number, weekday: number, n: number): ISODate | null {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1) return null;
  return d.toISOString().slice(0, 10);
}

/** 규칙(둘째·넷째 X요일)과 명절로 계산한 휴무 */
export function ruleClosures(store: Store, from: ISODate, to: ISODate, holidays: Holiday[] = []) {
  const out = new Map<ISODate, string>();
  const { weekday, weeks } = store.closureRule;
  let y = +from.slice(0, 4);
  let m = +from.slice(5, 7);
  while (`${y}-${String(m).padStart(2, "0")}` <= to.slice(0, 7)) {
    for (const n of weeks) {
      const d = nthWeekday(y, m, weekday, n);
      if (d && d >= from && d <= to) out.set(d, "의무휴업");
    }
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  for (const h of holidays) if (h.date >= from && h.date <= to) out.set(h.date, h.name);
  return out;
}

/**
 * 지점 휴무. 우선순위: 직접 입력 > 지점 공지 > 규칙.
 * 공지는 수집한 날부터 마지막 공지일까지만 덮고, 그 뒤는 규칙으로 계산한다.
 */
export function storeClosures(
  store: Store,
  from: ISODate,
  to: ISODate,
  opts: { holidays?: Holiday[]; announced?: Announced; manual?: ManualClosure } = {},
): Closure[] {
  const { holidays = [], announced, manual } = opts;
  const result = new Map<ISODate, Closure>();
  const ann = announced?.dates?.length ? [...announced.dates].sort() : null;
  const coverFrom = announced?.checkedAt ?? "0000-00-00";
  const coverTo = ann ? ann[ann.length - 1] : null;

  for (const [d, why] of ruleClosures(store, from, to, holidays)) {
    if (coverTo && d >= coverFrom && d <= coverTo) continue;
    result.set(d, { date: d, reason: why, source: "rule" });
  }
  for (const d of ann ?? []) {
    if (d < from || d > to) continue;
    const hol = holidays.find((h) => h.date === d);
    const reason = hol ? hol.name : store.closureRule.weekday === weekdayOf(d) ? "의무휴업" : "지점 공지 휴무";
    result.set(d, { date: d, reason, source: "announced" });
  }
  for (const d of manual?.add ?? []) {
    if (d >= from && d <= to) result.set(d, { date: d, reason: manual?.memo || "직접 입력", source: "manual" });
  }
  for (const d of manual?.remove ?? []) result.delete(d);
  return [...result.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function storeStatus(store: Pick<Store, "open" | "close">, closures: Closure[], today: ISODate, nowHHMM?: string) {
  const closed = closures.find((c) => c.date === today);
  if (closed) return { open: false, label: `오늘 휴무 · ${closed.reason}` };
  if (nowHHMM && (nowHHMM < store.open || nowHHMM >= store.close)) return { open: false, label: "영업시간 아님" };
  return { open: true, label: "영업 중" };
}

/* ---------------- 할인상품 ---------------- */

const SOURCE_RANK: Record<string, number> = { manual: 0, cocodalin: 1, costpick: 2 };
const FIELDS = ["name", "brand", "category", "salePrice", "originalPrice", "discount", "discountRate", "startDate", "endDate", "image"] as const;

/**
 * 출처별 상품을 상품번호로 합친다. 가격·기간은 코코달인(전국 공통) 값이 우선,
 * 코스트픽(개봉역점 매대 가격)은 참고 출처로 refs에 남긴다.
 */
export function mergeDeals(lists: RawDeal[][]): Deal[] {
  const byKey = new Map<string, Deal>();
  for (const item of lists.flat()) {
    const key = item.itemNo ? `item:${item.itemNo}` : `${item.source}:${item.sourceId}`;
    const ref = { site: item.source, url: item.url, salePrice: item.salePrice, endDate: item.endDate, store: item.store ?? null };
    const prev = byKey.get(key);
    if (!prev) {
      const rest: Partial<RawDeal> = { ...item };
      delete rest.url;
      delete rest.sourceId;
      delete rest.store;
      byKey.set(key, { ...(rest as Omit<RawDeal, "url" | "sourceId" | "store">), id: key, refs: [ref] });
      continue;
    }
    prev.refs.push(ref);
    const preferNew = SOURCE_RANK[item.source] < SOURCE_RANK[prev.source];
    for (const f of FIELDS) {
      if (prev[f] == null || (preferNew && item[f] != null)) (prev as unknown as Record<string, unknown>)[f] = item[f];
    }
    if (preferNew) prev.source = item.source;
  }
  return [...byKey.values()];
}

export function fillDerived<T extends Partial<Deal>>(item: T): T {
  const i = { ...item };
  if (i.discount == null && i.originalPrice != null && i.salePrice != null) i.discount = i.originalPrice - i.salePrice;
  if (i.originalPrice == null && i.discount != null && i.salePrice != null) i.originalPrice = i.salePrice + i.discount;
  if (i.salePrice == null && i.discount != null && i.originalPrice != null) i.salePrice = i.originalPrice - i.discount;
  if (i.originalPrice && i.discount != null) i.discountRate = Math.round((i.discount / i.originalPrice) * 100);
  return i;
}

/** 직접 입력(overrides.deals)을 자동 수집 결과 위에 적용 */
export function applyDealOverrides(items: Deal[], overrides: Overrides["deals"] = {}): Deal[] {
  const hide = new Set(overrides.hide ?? []);
  const out = items
    .filter((i) => !hide.has(i.id) && !(i.itemNo && hide.has(i.itemNo)))
    .map((i) => {
      const p = overrides.patch?.[i.id] ?? (i.itemNo ? overrides.patch?.[i.itemNo] : undefined);
      return p ? { ...i, ...p, source: "manual" as const } : i;
    });
  for (const a of overrides.add ?? []) {
    out.push({ refs: [], ...a, name: a.name ?? "", id: a.id ?? `manual:${a.name}`, source: "manual" });
  }
  return out;
}

export function isActive(item: Pick<Deal, "startDate" | "endDate">, today: ISODate): boolean {
  if (item.endDate && item.endDate < today) return false;
  if (item.startDate && item.startDate > today) return false;
  return true;
}

/** 카테고리 표기 통일: "신선식품 · 빵" → "신선식품·빵" */
export function normalizeCategory(c?: string | null): string {
  return (c ?? "").replace(/\s*·\s*/g, "·").trim() || "기타";
}

/** 직접 입력한 꿀팁 숨김·추가를 반영한다. 같은 id를 추가하면 원래 팁을 대신한다. */
export function applyTipOverrides(items: Tip[], overrides: Overrides["tips"] = {}): Tip[] {
  const hide = new Set(overrides.hide ?? []);
  const added = new Map((overrides.add ?? []).map((t) => [t.id, t]));
  const out = items.filter((t) => !hide.has(t.id)).map((t) => added.get(t.id) ?? t);
  for (const t of added.values()) if (!items.some((i) => i.id === t.id) && !hide.has(t.id)) out.push(t);
  return out;
}
