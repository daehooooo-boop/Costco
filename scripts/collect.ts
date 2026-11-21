// 자동 수집기: 할인상품·인기상품·지점 공지 휴무를 모아 data/*.json으로 저장한다.
// GitHub Actions가 매일 07:00 KST에 실행하고, 바뀐 데이터를 main에 커밋하면 Vercel이 다시 배포한다.
// 한 출처가 실패하거나 결과가 너무 적으면 그 출처는 직전 데이터를 유지한다.
import { readFile, writeFile } from "node:fs/promises";
import { COSTPICK_CATEGORIES, parseCocodalinList, parseCostpickHoliday, parseCostpickList } from "../src/lib/collect/parsers";
import { fillDerived, mergeDeals, todayKST } from "../src/lib/core";
import type { Announced, Deal, ISODate, Meta, RawDeal, Store } from "../src/lib/types";

const DATA = new URL("../data/", import.meta.url);
const UA = "Mozilla/5.0 (compatible; costco-farm/1.0; personal non-commercial use)";
const DELAY_MS = Number(process.env.COLLECT_DELAY_MS ?? 1500);
const COCODALIN_CATEGORIES = [7, 9, 10, 11, 8, 12, 1, 2, 3, 4, 5, 6];
const MIN_DEALS = 20; // 이보다 적으면 사이트 구조가 바뀐 것으로 보고 직전 데이터 유지

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function readJSON<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(new URL(name, DATA), "utf8")) as T;
  } catch {
    return fallback;
  }
}
const writeJSON = (name: string, obj: unknown) => writeFile(new URL(name, DATA), JSON.stringify(obj, null, 1) + "\n");

async function get(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "ko-KR,ko;q=0.9" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      await sleep(DELAY_MS);
      return text;
    } catch (e) {
      if (attempt >= 3) throw new Error(`${url}: ${(e as Error).message}`);
      await sleep(DELAY_MS * attempt * 2);
    }
  }
}

async function collectCocodalin() {
  const deals: RawDeal[] = [];
  for (const id of COCODALIN_CATEGORIES) deals.push(...parseCocodalinList(await get(`https://cocodalin.com/discount?category_id=${id}`)));
  const popular = parseCocodalinList(await get("https://cocodalin.com/popular"))
    .filter((p) => p.rank)
    .sort((a, b) => a.rank! - b.rank!);
  return { deals, popular };
}

async function collectCostpick(today: ISODate) {
  const deals: RawDeal[] = [];
  for (const slug of Object.keys(COSTPICK_CATEGORIES)) {
    deals.push(...parseCostpickList(await get(`https://costpick.co.kr/store-deals/category/${slug}`), { today, category: slug }));
  }
  return deals;
}

async function collectHolidays(stores: Store[], today: ISODate) {
  const out: Record<string, Announced> = {};
  for (const s of stores) {
    try {
      const r = parseCostpickHoliday(await get(`https://costpick.co.kr/holiday/${s.slug}`), today);
      if (r?.dates.length) out[s.slug] = { dates: r.dates, hours: r.hours, checkedAt: today };
    } catch (e) {
      console.warn("휴무 수집 실패", s.slug, (e as Error).message);
    }
  }
  return out;
}

/** 직전 deals.json에서 한 출처의 상품을 다시 RawDeal 모양으로 꺼낸다 */
function previousFrom(prev: Deal[], site: RawDeal["source"]): RawDeal[] {
  return prev.flatMap((d) => {
    const ref = d.refs.find((r) => r.site === site);
    if (!ref) return [];
    return [{
      source: site, sourceId: d.id, url: ref.url ?? "", itemNo: d.itemNo ?? null, name: d.name, brand: d.brand ?? null,
      category: d.category ?? null, salePrice: d.salePrice ?? null, originalPrice: d.originalPrice ?? null,
      discount: d.discount ?? null, discountRate: d.discountRate ?? null, startDate: d.startDate ?? null,
      endDate: d.endDate ?? null, image: d.image ?? null, store: ref.store ?? undefined,
    }];
  });
}

async function main() {
  const today = todayKST(new Date());
  const startedAt = new Date().toISOString();
  const meta = await readJSON<Meta>("meta.json", { sources: {} });
  delete meta.sample;
  const { stores } = await readJSON<{ stores: Store[] }>("stores.json", { stores: [] });

  const [coco, cp, hol] = await Promise.allSettled([collectCocodalin(), collectCostpick(today), collectHolidays(stores, today)]);

  const note = (key: string, settled: PromiseSettledResult<unknown>, count?: number) => {
    const prev = meta.sources[key];
    meta.sources[key] =
      settled.status === "fulfilled" && count
        ? { ok: true, count, at: today, lastOk: today }
        : { ok: false, at: today, lastOk: prev?.lastOk ?? null, error: settled.status === "rejected" ? String(settled.reason?.message ?? settled.reason) : `결과 ${count ?? 0}개 (사이트 구조 변경 의심)` };
  };

  // 할인상품
  const prev = await readJSON<{ items: Deal[] }>("deals.json", { items: [] });
  const cocoDeals = coco.status === "fulfilled" && coco.value.deals.length >= MIN_DEALS ? coco.value.deals : null;
  const cpDeals = cp.status === "fulfilled" && cp.value.length >= MIN_DEALS ? cp.value : null;
  note("cocodalin", coco, coco.status === "fulfilled" ? (cocoDeals?.length ?? coco.value.deals.length) : undefined);
  note("costpick", cp, cp.status === "fulfilled" ? (cpDeals?.length ?? cp.value.length) : undefined);
  if (!cocoDeals) meta.sources.cocodalin.ok = false;
  if (!cpDeals) meta.sources.costpick.ok = false;

  if (cocoDeals || cpDeals) {
    const items = mergeDeals([cocoDeals ?? previousFrom(prev.items, "cocodalin"), cpDeals ?? previousFrom(prev.items, "costpick")])
      .map((d) => fillDerived(d))
      .filter((d) => !d.endDate || d.endDate >= today);
    await writeJSON("deals.json", { updatedAt: startedAt, today, count: items.length, items });
    console.log(`할인상품 ${items.length}개 (코코달인 ${cocoDeals?.length ?? "이전값"}, 코스트픽 ${cpDeals?.length ?? "이전값"})`);
  }

  // 인기상품
  if (coco.status === "fulfilled" && coco.value.popular.length >= 5) {
    const items = mergeDeals([coco.value.popular.slice(0, 10)]).map((d) => fillDerived(d));
    await writeJSON("popular.json", { updatedAt: startedAt, basis: "코코달인 인기상품 순위", items });
    console.log(`인기상품 ${items.length}개`);
  }

  // 지점 공지 휴무
  if (hol.status === "fulfilled" && Object.keys(hol.value).length) {
    const prevAnn = await readJSON<{ stores: Record<string, Announced> }>("closures-announced.json", { stores: {} });
    await writeJSON("closures-announced.json", { updatedAt: startedAt, source: "costpick.co.kr/holiday", stores: { ...prevAnn.stores, ...hol.value } });
    console.log(`공지 휴무 ${Object.keys(hol.value).length}개 지점`);
  }
  note("holidays", hol, hol.status === "fulfilled" ? Object.keys(hol.value).length : undefined);

  meta.lastRun = startedAt;
  await writeJSON("meta.json", meta);

  if (Object.values(meta.sources).every((s) => !s.ok)) {
    console.error("모든 출처 수집 실패");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
