// 출처 사이트 HTML → RawDeal. 클래스 이름보다 텍스트 모양으로 읽어 사이트 디자인 변경에 덜 깨지게 한다.
import * as cheerio from "cheerio";
import { addDays } from "../core";
import type { ISODate, RawDeal } from "../types";

const won = (s: string) => {
  const m = s.replace(/\s/g, "").match(/-?([\d,]+)원/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
};
const clean = (s?: string | null) => String(s ?? "").replace(/\s+/g, " ").trim();

/* ---------- 코코달인 /discount?category_id=N, /popular ---------- */
// 카드 <article>: /product/{id} 링크, <h3> 상품명, "item # 번호", 가격 span(정가는 line-through), 기간, 인기 순위 span.

export function parseCocodalinList(html: string, base = "https://cocodalin.com"): RawDeal[] {
  const $ = cheerio.load(html);
  const seen = new Map<string, RawDeal>();
  $("article").each((_, el) => {
    const $a = $(el);
    const href = $a.find('a[href*="/product/"]').first().attr("href");
    const id = href?.match(/\/product\/(\d+)/)?.[1];
    const name = clean($a.find("h3").first().text());
    if (!href || !id || !name || seen.has(id)) return;

    let itemNo: string | null = null;
    let rate: number | null = null;
    let salePrice: number | null = null;
    let originalPrice: number | null = null;
    let discount: number | null = null;

    $a.find("p, span, div").each((_, s) => {
      const $s = $(s);
      const t = clean($s.text());
      const m = t.match(/^item\s*#\s*(\d+)$/i);
      if (m && !itemNo) itemNo = m[1];
      if (rate == null && /^\d{1,2}\s*%$/.test(t)) rate = Number(t.replace(/\D/g, ""));
      // 가격은 다른 요소를 품지 않은 단일 요소에서만 읽는다
      if (s.tagName === "div" || $s.children("span").length) return;
      if (!/^-?\s*[\d,]+원(\s*할인)?$/.test(t)) return;
      const v = won(t);
      if (/line-through/.test($s.attr("class") ?? "")) originalPrice = v;
      else if (t.startsWith("-") || t.includes("할인")) discount = v;
      else if (salePrice == null) salePrice = v;
    });

    const dates = clean($a.text()).match(/(\d{4})\.(\d{2})\.(\d{2})\s*~\s*(\d{4})\.(\d{2})\.(\d{2})/);
    const rank = Number(clean($a.children("span").first().text())) || undefined;

    let image: string | null = null;
    try {
      const u = new URL($a.find("img").first().attr("src") ?? "", base);
      const raw = u.searchParams.get("url");
      image = raw ? encodeURI(raw) : u.href;
    } catch {}

    seen.set(id, {
      source: "cocodalin",
      sourceId: id,
      url: new URL(href, base).href,
      itemNo,
      name,
      category: clean($a.find("p").first().text()) || null,
      salePrice,
      originalPrice,
      discount,
      discountRate: rate,
      startDate: dates ? `${dates[1]}-${dates[2]}-${dates[3]}` : null,
      endDate: dates ? `${dates[4]}-${dates[5]}-${dates[6]}` : null,
      image,
      ...(rank ? { rank } : {}),
    });
  });
  return [...seen.values()];
}

/* ---------- 코스트픽 /store-deals/category/{slug} ---------- */
// 카드 <a href="/store-deals/{상품번호}">: 브랜드 <p>, 상품명 <h3>, 할인율, 판매가, 정가(line-through), "11월 22일까지".

export const COSTPICK_CATEGORIES: Record<string, string> = {
  food: "식품", drink: "음료", liquor: "주류", beauty: "뷰티·헬스", fashion: "의류·잡화", living: "생활·위생",
  electronics: "디지털·가전", furniture: "가구·침구", kitchen: "주방", toy: "완구", pet: "반려동물",
  outdoor: "아웃도어", season: "시즌", etc: "기타",
};

export function parseCostpickList(html: string, opts: { today: ISODate; category?: string; base?: string }): RawDeal[] {
  const { today, category, base = "https://costpick.co.kr" } = opts;
  const $ = cheerio.load(html);
  const out = new Map<string, RawDeal>();
  $('a[href^="/store-deals/"]').each((_, el) => {
    const $a = $(el);
    const id = $a.attr("href")?.match(/^\/store-deals\/(\d+)$/)?.[1];
    if (!id || out.has(id)) return;
    const name = clean($a.find("h3").first().text());
    if (!name) return;
    const brand = clean($a.find("p").first().text()) || null;

    const $orig = $a.find(".line-through").first();
    const originalPrice = $orig.length ? won($orig.text()) : null;
    let salePrice: number | null = null;
    $a.find("span").each((_, s) => {
      const $s = $(s);
      if (salePrice != null || $s.closest(".line-through").length) return;
      const t = clean($s.text());
      if (/^[\d,]+\s*원$/.test(t)) salePrice = won(t);
    });
    const text = clean($a.text());
    const rate = text.match(/(\d{1,2})\s*%/)?.[1];
    const img = $a.find("img").first().attr("src");

    out.set(id, {
      source: "costpick",
      sourceId: id,
      url: new URL(`/store-deals/${id}`, base).href,
      itemNo: id,
      name: brand && !name.startsWith(brand) ? `${brand} ${name}` : name,
      brand,
      category: category ? (COSTPICK_CATEGORIES[category] ?? category) : null,
      salePrice,
      originalPrice,
      discount: originalPrice != null && salePrice != null ? originalPrice - salePrice : null,
      discountRate: rate ? Number(rate) : null,
      startDate: null,
      endDate: parseKoreanEnd(text, today),
      image: img ? new URL(img, base).href : null,
      store: "개봉역점",
    });
  });
  return [...out.values()];
}

/** "11월 22일까지" / "오늘까지" / "내일까지" → YYYY-MM-DD. 12월에 본 "1월 3일까지"는 다음 해 */
export function parseKoreanEnd(text: string, today: ISODate): ISODate | null {
  if (/오늘까지/.test(text)) return today;
  if (/내일까지/.test(text)) return addDays(today, 1);
  const m = text.match(/(\d{1,2})월\s*(\d{1,2})일까지/);
  if (!m) return null;
  let y = +today.slice(0, 4);
  const mo = +m[1];
  if (mo < +today.slice(5, 7) - 6) y += 1;
  return `${y}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/* ---------- 코스트픽 /holiday/{slug} ---------- */
// "앞으로의 휴무일 11월 22일 (일) 2일 뒤 12월 9일 (수) ..." 구간과 "영업시간은 매일 10:00부터 22:00까지"를 읽는다.

export function parseCostpickHoliday(html: string, today: ISODate) {
  const $ = cheerio.load(html);
  const text = clean(($("main").length ? $("main") : $("body")).text());
  const start = text.indexOf("앞으로의 휴무일");
  if (start < 0) return null;
  const end = text.indexOf("코스트코 한국 지점은", start);
  const seg = text.slice(start, end > 0 ? end : start + 400);
  const dates: ISODate[] = [];
  for (const m of seg.matchAll(/(\d{1,2})월\s*(\d{1,2})일\s*\([일월화수목금토]\)/g)) {
    const d = parseKoreanEnd(`${m[1]}월 ${m[2]}일까지`, today);
    if (d && !dates.includes(d)) dates.push(d);
  }
  const hours = text.match(/영업시간은 매일 (\d{2}:\d{2})부터 (\d{2}:\d{2})까지/);
  return { dates, hours: hours ? { open: hours[1], close: hours[2] } : null };
}
