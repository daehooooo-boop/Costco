"use client";

import { useState } from "react";
import { addDays, daysBetween, weekdayOf } from "@/lib/core";
import type { Closure, ISODate, Store } from "@/lib/types";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const NTH: Record<number, string> = { 1: "첫째", 2: "둘째", 3: "셋째", 4: "넷째", 5: "다섯째" };
export const fmtDate = (iso: ISODate) => `${+iso.slice(5, 7)}월 ${+iso.slice(8, 10)}일 (${WD[weekdayOf(iso)]})`;

interface Row {
  store: Store;
  closures: Closure[];
  status: { open: boolean; label: string };
}

export function StoreTab({ view, slug, today, onPick }: { view: Row[]; slug: string; today: ISODate; onPick: (slug: string) => void }) {
  const me = view.find((v) => v.store.slug === slug) ?? view[0];
  const regions = [...new Set(view.map((v) => v.store.region))];
  // 고른 지점이 속한 지역을 먼저 펼쳐 둔다. 지역을 직접 누르면 그 지역을 보여 준다.
  const [regionPick, setRegionPick] = useState<string | null>(null);
  const region = regionPick ?? me.store.region;
  const { store: s, closures, status } = me;
  const next = closures.slice(0, 4);
  const q = encodeURIComponent(`코스트코 ${s.name}`);
  const twoWeeks = addDays(today, 13);

  return (
    <div className="grid gap-3">
      <section className="rounded-2xl border border-line bg-card p-4" aria-labelledby="pick-title">
        <h2 id="pick-title" className="mb-2.5 font-bold">
          내 지점 고르기
        </h2>
        <div className="no-scrollbar -mx-1 mb-2.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="지역">
          {regions.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={region === r}
              onClick={() => setRegionPick(r)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] ${region === r ? "border-ink bg-ink text-bg" : "border-line bg-card text-ink"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="지점">
          {view
            .filter((v) => v.store.region === region)
            .map(({ store: x, status: st }) => {
              const on = x.slug === me.store.slug;
              return (
                <button
                  key={x.slug}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onPick(x.slug)}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    on ? "border-brand bg-brand text-brand-ink" : "border-line bg-bg text-ink"
                  }`}
                >
                  <span className="font-semibold">{x.name}</span>
                  <span className={`text-xs ${on ? "opacity-85" : st.open ? "text-ok" : "text-sale"}`}>{st.label}</span>
                </button>
              );
            })}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 font-bold">{s.name}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${status.open ? "bg-ok-soft text-ok" : "bg-sale-soft text-sale"}`}>
            {status.label}
          </span>
          <span className="text-[22px] font-bold tabular-nums tracking-tight">
            {s.open} – {s.close}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">{s.address}</p>
        <div className="mt-2.5 flex flex-wrap gap-2 text-[13px]">
          <a className="rounded-lg bg-chip px-2.5 py-1.5" href={`https://map.naver.com/p/search/${q}`} target="_blank" rel="noopener">
            네이버 지도
          </a>
          <a className="rounded-lg bg-chip px-2.5 py-1.5" href={`https://map.kakao.com/?q=${q}`} target="_blank" rel="noopener">
            카카오맵
          </a>
          <a className="rounded-lg bg-chip px-2.5 py-1.5" href="tel:1899-9900">
            전화 1899-9900
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 font-bold">{s.name} 다음 휴무일</h2>
        <ul>
          {next.length === 0 && <li className="py-2 text-muted">예정된 휴무가 없어요</li>}
          {next.map((c) => {
            const dd = daysBetween(today, c.date);
            return (
              <li key={c.date} className="flex justify-between gap-2 border-t border-line py-2.5 first:border-t-0">
                <span className="font-semibold">{fmtDate(c.date)}</span>
                <span className={`text-xs ${c.reason === "의무휴업" ? "text-muted" : "font-semibold text-sale"}`}>
                  {c.reason} · {dd === 0 ? "오늘" : `${dd}일 뒤`}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 text-[13px] text-muted">
          매달 {s.closureRule.weeks.map((w) => NTH[w]).join("·")} {WD[s.closureRule.weekday]}요일 정기 휴무, 설·추석 당일 휴무. 지점이 공지한 날짜가 있으면 그
          날짜를 따라요.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 font-bold">전 지점 2주 안 휴무</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-1.5 py-2 font-medium">지점</th>
                <th className="px-1.5 py-2 font-medium">영업시간</th>
                <th className="px-1.5 py-2 font-medium">휴무</th>
              </tr>
            </thead>
            <tbody>
              {view.map(({ store: x, closures: cs }) => {
                const soon = cs.filter((c) => c.date <= twoWeeks);
                return (
                  <tr key={x.slug} className={`border-t border-line whitespace-nowrap ${x.slug === s.slug ? "font-bold" : ""}`}>
                    <td className="px-1.5 py-2">{x.name}</td>
                    <td className="px-1.5 py-2 tabular-nums">
                      {x.open}–{x.close}
                    </td>
                    <td className="px-1.5 py-2">
                      {soon.length === 0 ? (
                        <span className="text-muted">없음</span>
                      ) : (
                        soon.map((c, i) => (
                          <span key={c.date} className={c.date === today ? "font-bold text-sale" : ""}>
                            {i > 0 && ", "}
                            {c.date === today ? "오늘" : fmtDate(c.date)}
                          </span>
                        ))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
