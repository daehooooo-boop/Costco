"use client";

import { useMemo, useSyncExternalStore } from "react";
import { addDays, nowHHMMKST, storeClosures, storeStatus, todayKST } from "@/lib/core";
import type { Announced, Deal, Holiday, ISODate, Meta, Overrides, Store } from "@/lib/types";
import { StoreTab } from "./StoreTab";
import { DealsTab } from "./DealsTab";
import { DealCard } from "./DealCard";
import { SITE } from "@/lib/site";

export interface AppData {
  stores: Store[];
  holidays: Holiday[];
  announced: Record<string, Announced>;
  overrides: Overrides;
  deals: Deal[];
  dealsToday: ISODate;
  popular: Deal[];
  popularBasis: string;
  meta: Meta;
}

const TABS = [
  { id: "store", label: "지점·휴무" },
  { id: "deals", label: "이번 주 할인" },
  { id: "popular", label: "인기 TOP 10" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STORE_KEY = "costco-store";
const STORE_EVENT = "costco-store-change";

function subscribeMinute(cb: () => void) {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
}
function readClock() {
  const now = new Date();
  return `${todayKST(now)}|${nowHHMMKST(now)}`;
}
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
function subscribeStore(cb: () => void) {
  window.addEventListener(STORE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(STORE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function readStore() {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

export function CostcoApp({ data }: { data: AppData }) {
  // 프리렌더 때는 현재 시각·브라우저 저장값을 읽을 수 없어 서버 값으로 먼저 그리고, 브라우저에서 바꾼다.
  const clockKey = useSyncExternalStore(subscribeMinute, readClock, () => `${data.dealsToday}|`);
  const [today, hhmm] = clockKey.split("|");
  const clock = useMemo(() => ({ today, hhmm: hhmm || undefined }), [today, hhmm]);

  const hash = useSyncExternalStore(subscribeHash, () => location.hash.slice(1), () => "");
  const tab: TabId = TABS.some((x) => x.id === hash) ? (hash as TabId) : "store";
  const saved = useSyncExternalStore(subscribeStore, readStore, () => null);
  const slug = saved && data.stores.some((s) => s.slug === saved) ? saved : "yangjae";

  const pickTab = (id: TabId) => {
    history.replaceState(null, "", `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  const pickStore = (s: string) => {
    try {
      localStorage.setItem(STORE_KEY, s);
    } catch {}
    window.dispatchEvent(new Event(STORE_EVENT));
  };

  const view = useMemo(() => {
    const closuresOf = (s: Store, to: ISODate) =>
      storeClosures(s, clock.today, to, {
        holidays: data.holidays,
        announced: data.announced[s.slug],
        manual: data.overrides.closures?.[s.slug],
      });
    const withHours = (s: Store) => ({ ...s, ...(data.announced[s.slug]?.hours ?? {}) });
    return data.stores.map((raw) => {
      const s = withHours(raw);
      const closures = closuresOf(s, addDays(clock.today, 70));
      return { store: s, closures, status: storeStatus(s, closures, clock.today, clock.hhmm) };
    });
  }, [data, clock]);

  const failed = Object.entries(data.meta.sources ?? {}).filter(([, v]) => !v.ok);
  const sourceName: Record<string, string> = { cocodalin: "코코달인", costpick: "코스트픽", holidays: "지점 휴무" };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-3 pb-2">
          <h1 className="text-[19px] font-bold tracking-tight whitespace-nowrap">
            이번 주 <span className="text-sale">코스트코</span>
          </h1>
          {tab === "store" && (
            <label className="min-w-0">
              <span className="sr-only">지점 선택</span>
              <select
                value={slug}
                onChange={(e) => pickStore(e.target.value)}
                className="h-10 max-w-[52vw] rounded-lg border border-line bg-card px-2.5 font-semibold text-ink"
              >
                {[...new Set(data.stores.map((s) => s.region))].map((r) => (
                  <optgroup key={r} label={r}>
                    {data.stores
                      .filter((s) => s.region === r)
                      .map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
        </div>
        <nav className="mx-auto flex max-w-3xl px-4" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => pickTab(t.id)}
              className={`flex-1 border-b-[3px] px-1 pt-2.5 pb-3 font-semibold transition-colors ${
                tab === t.id ? "border-brand text-ink" : "border-transparent text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4 pb-6">
        {failed.length > 0 && (
          <p className="mb-3 rounded-lg bg-sale-soft px-3 py-2.5 text-[13px] text-sale">
            {failed.map(([k]) => sourceName[k] ?? k).join(", ")} 최신 정보를 가져오지 못해 이전 정보를 보여주고 있어요.
          </p>
        )}
        {tab === "store" && <StoreTab view={view} slug={slug} today={clock.today} />}
        {tab === "deals" && <DealsTab deals={data.deals} overrides={data.overrides.deals} today={clock.today} />}
        {tab === "popular" && (
          <section>
            <p className="mb-2.5 text-[13px] text-muted">
              {data.popularBasis} · {stamp(data.meta.lastRun)}
            </p>
            <ol className="grid gap-2.5 sm:grid-cols-2">
              {data.popular.map((d, i) => (
                <DealCard key={d.id} deal={d} today={clock.today} rank={d.rank ?? i + 1} />
              ))}
            </ol>
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-10 text-[13px] text-muted">
        <p className="my-1.5">{data.meta.lastRun ? `마지막 자동 갱신 ${stamp(data.meta.lastRun)}` : "아직 자동 수집 전이에요"}</p>
        <p className="my-1.5 leading-relaxed">
          할인 정보는{" "}
          <a className="text-brand" href="https://cocodalin.com" target="_blank" rel="noopener">
            코코달인
          </a>
          과{" "}
          <a className="text-brand" href="https://costpick.co.kr" target="_blank" rel="noopener">
            코스트픽
          </a>
          (개봉역점 매대 가격), 지점 휴무는 코스트픽 지점 페이지를 바탕으로 매일 정리해요. 매장·시기에 따라 다를 수 있으니 방문 전 코스트코 공식 앱에서
          한 번 더 확인하세요. 코스트코와 관계없는 개인 정보 페이지예요.
        </p>
        <p className="my-1.5">
          만든 사람{" "}
          <a className="text-brand" href={SITE.creator.url}>
            {SITE.creator.name}
          </a>
        </p>
      </footer>
    </div>
  );
}

function stamp(iso?: string) {
  if (!iso) return "";
  const k = new Date(Date.parse(iso) + 9 * 3_600_000).toISOString();
  return `${+k.slice(5, 7)}월 ${+k.slice(8, 10)}일 ${k.slice(11, 16)}`;
}
