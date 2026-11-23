import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCocodalinList, parseCostpickList, parseCostpickHoliday, parseKoreanEnd } from "./collect/parsers";
import { nthWeekday, storeClosures, mergeDeals, fillDerived, applyDealOverrides, applyTipOverrides, isActive } from "./core";
import type { RawDeal, Store, Deal, Tip } from "./types";
import tipsData from "../../data/tips.json";

describe("코스트코 데이터", () => {
const fx = (n: string) => readFileSync(new URL(`./collect/__fixtures__/${n}`, import.meta.url), 'utf8');
const sunday: Store = { name: '', region: '', address: '', open: '10:00', close: '22:00', slug: 's', closureRule: { weekday: 0, weeks: [2, 4] } };
const holidays = [{ date: '2027-02-07', name: '설날' }];

test('둘째·넷째 일요일 계산', () => {
  assert.equal(nthWeekday(2026, 11, 0, 2), '2026-11-08');
  assert.equal(nthWeekday(2026, 11, 0, 4), '2026-11-22');
  assert.equal(nthWeekday(2026, 11, 3, 4), '2026-11-25'); // 일산 넷째 수요일
  assert.equal(nthWeekday(2026, 11, 1, 4), '2026-11-23'); // 대구 넷째 월요일
  assert.equal(nthWeekday(2026, 2, 0, 5), null);
});

test('규칙 + 명절', () => {
  const r = storeClosures(sunday, '2027-02-01', '2027-02-28', { holidays }).map((c) => c.date + c.reason);
  assert.deepEqual(r, ['2027-02-07설날', '2027-02-14의무휴업', '2027-02-28의무휴업']);
});

test('공지된 휴무가 규칙보다 우선 (울산 12/9 수요일, 12/13 일요일 아님)', () => {
  const announced = { dates: ['2026-11-22', '2026-12-09', '2026-12-27'], checkedAt: '2026-11-20' };
  const r = storeClosures(sunday, '2026-11-20', '2027-01-31', { announced }).map((c) => c.date);
  assert.deepEqual(r, ['2026-11-22', '2026-12-09', '2026-12-27', '2027-01-10', '2027-01-24']);
});

test('직접 입력이 가장 우선', () => {
  const announced = { dates: ['2026-11-22'], checkedAt: '2026-11-20' };
  const manual = { add: ['2026-11-30'], remove: ['2026-11-22'], memo: '임시 휴무' };
  const r = storeClosures(sunday, '2026-11-20', '2026-11-30', { announced, manual });
  assert.deepEqual(r.map((c) => [c.date, c.source]), [['2026-11-30', 'manual']]);
});

test('코코달인 할인 목록 파싱', () => {
  const items = parseCocodalinList(fx('cocodalin-list.html'));
  assert.equal(items.length, 3, '중복 카드는 한 번만');
  const [a, b, c] = items;
  assert.deepEqual(
    { itemNo: a.itemNo, sale: a.salePrice, orig: a.originalPrice, dis: a.discount, rate: a.discountRate, s: a.startDate, e: a.endDate, cat: a.category },
    { itemNo: '693546', sale: 15990, orig: 19190, dis: 3200, rate: 17, s: '2026-11-19', e: '2026-11-22', cat: '신선식품 · 빵' },
  );
  assert.equal(a.image, 'https://image.cocodalin.com/product/sm/chicken.jpg');
  assert.equal(a.url, 'https://cocodalin.com/product/11689');
  assert.deepEqual([b.salePrice, b.discount, b.originalPrice], [null, 3000, null]);
  assert.deepEqual([c.salePrice, c.discount], [7990, 8000]);
  assert.equal(fillDerived<RawDeal>(c).originalPrice, 15990);
});

test('코코달인 인기 순위 파싱', () => {
  const items = parseCocodalinList(fx('cocodalin-popular.html'));
  assert.deepEqual(items.map((i) => i.rank), [1, 2]);
  assert.deepEqual([items[0].name, items[0].salePrice, items[0].originalPrice, items[0].discount, items[0].discountRate], ['신라명과 프리미엄 탕종식빵 880G', 7790, 9790, 2000, 20]);
});

test('코스트픽 목록 파싱', () => {
  const items = parseCostpickList(fx('costpick-list.html'), { today: '2026-11-20', category: 'food' });
  assert.equal(items.length, 2);
  assert.deepEqual([items[0].itemNo, items[0].salePrice, items[0].originalPrice, items[0].discountRate, items[0].endDate, items[0].category], ['693793', 29990, 39990, 25, '2026-11-22', '식품']);
  assert.equal(items[1].name, 'HAAGEN-DAZS 스틱바 80ML X 10CT');
  assert.equal(items[1].endDate, '2026-11-20');
});

test('한국어 마감일과 연도 넘김', () => {
  assert.equal(parseKoreanEnd('1월 3일까지', '2026-12-28'), '2027-01-03');
  assert.equal(parseKoreanEnd('12월 31일까지', '2026-12-28'), '2026-12-31');
});

test('코스트픽 지점 휴무 파싱', () => {
  const r = parseCostpickHoliday(fx('costpick-holiday.html'), '2026-11-20')!;
  assert.deepEqual(r.dates, ['2026-11-22', '2026-12-09', '2026-12-27']);
  assert.deepEqual(r.hours, { open: '10:00', close: '22:00' });
});

test('출처 병합: 같은 상품번호는 하나로, 코코달인 가격 우선', () => {
  const coco = parseCocodalinList(fx('cocodalin-list.html'));
  const cp: RawDeal[] = [{ source: 'costpick', sourceId: '693546', itemNo: '693546', name: '닭갈비', salePrice: 15000, endDate: '2026-11-23', url: 'u', store: '개봉역점', category: null, originalPrice: null, discount: null, discountRate: null, startDate: null, image: null }];
  const merged = mergeDeals([cp, coco]);
  const m = merged.find((i) => i.itemNo === '693546')!;
  assert.equal(merged.length, 3);
  assert.equal(m.salePrice, 15990);
  assert.equal(m.source, 'cocodalin');
  assert.equal(m.refs.length, 2);
});

test('직접 입력 할인 덮어쓰기·숨기기·추가', () => {
  const items: Deal[] = [{ source: 'cocodalin', refs: [], id: 'item:1', itemNo: '1', name: 'A', salePrice: 100 }, { source: 'cocodalin', refs: [], id: 'item:2', itemNo: '2', name: 'B' }];
  const out = applyDealOverrides(items, { hide: ['2'], patch: { 'item:1': { salePrice: 90 } }, add: [{ name: '쿠폰 상품', salePrice: 5 }] });
  assert.deepEqual(out.map((i) => [i.name, i.salePrice, i.source]), [['A', 90, 'manual'], ['쿠폰 상품', 5, 'manual']]);
});

test('진행 중 판정', () => {
  assert.equal(isActive({ startDate: '2026-11-19', endDate: '2026-11-22' }, '2026-11-20'), true);
  assert.equal(isActive({ startDate: '2026-11-21', endDate: '2026-11-22' }, '2026-11-20'), false);
  assert.equal(isActive({ endDate: '2026-11-19' }, '2026-11-20'), false);
});

test('꿀팁 직접 입력: 숨김·교체·추가', () => {
  const t = (id: string, title = id): Tip => ({ id, category: '장보기', title, body: '', source: 'community' });
  const r = applyTipOverrides([t('a'), t('b'), t('c')], { hide: ['b'], add: [t('c', '고친 c'), t('d')] });
  assert.deepEqual(r.map((x) => x.title), ['a', '고친 c', 'd']);
  assert.deepEqual(applyTipOverrides([t('a')]).map((x) => x.id), ['a']);
});

test('꿀팁 데이터: id 중복 없음, 카테고리·출처 키가 모두 정의됨', () => {
  const ids = tipsData.items.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const x of tipsData.items) {
    assert.ok(tipsData.categories.includes(x.category), x.id);
    assert.ok(['official', 'guide', 'community'].includes(x.source), x.id);
    if ('ref' in x && x.ref) assert.ok(x.ref in tipsData.sources, x.id);
    if (x.source !== 'community') assert.ok('ref' in x && x.ref, `${x.id}: 공식·정리 출처는 링크가 있어야 함`);
  }
});
});
