"use client";

import { useMemo, useState } from "react";
import type { ISODate, Tip, TipSource } from "@/lib/types";

const BADGE: Record<TipSource, { label: string; cls: string }> = {
  official: { label: "공식 안내", cls: "bg-ok-soft text-ok" },
  guide: { label: "정리 기사", cls: "bg-chip text-ink" },
  community: { label: "이용자 경험", cls: "bg-chip text-muted" },
};

export interface TipSourceRef {
  label: string;
  url: string;
}

export function TipsTab({
  tips,
  categories,
  sources,
  checkedAt,
}: {
  tips: Tip[];
  categories: string[];
  sources: Record<string, TipSourceRef>;
  checkedAt: ISODate;
}) {
  const [cat, setCat] = useState("전체");
  // 직접 추가한 팁이 새 카테고리를 쓰면 뒤에 붙인다.
  const cats = useMemo(() => [...new Set([...categories, ...tips.map((t) => t.category)])], [categories, tips]);
  const list = cat === "전체" ? tips : tips.filter((t) => t.category === cat);

  return (
    <section>
      <div className="no-scrollbar mb-1.5 flex gap-1.5 overflow-x-auto pb-1.5" role="group" aria-label="꿀팁 분류">
        {["전체", ...cats].map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] ${cat === c ? "border-ink bg-ink text-bg" : "border-line bg-card text-ink"}`}
          >
            {c}
            {c === "전체" ? ` ${tips.length}` : ""}
          </button>
        ))}
      </div>
      <p className="mb-2 text-[13px] text-muted">
        {+checkedAt.slice(5, 7)}월 {+checkedAt.slice(8, 10)}일 기준으로 확인했어요. 규정은 바뀔 수 있으니 중요한 건 공식 안내를 확인하세요.
      </p>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {list.map((t) => {
          const ref = t.ref ? (sources[t.ref] ?? (t.ref.startsWith("https://") ? { label: "출처", url: t.ref } : null)) : null;
          return (
            <li key={t.id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted">{t.category}</span>
                <span className={`rounded px-1.5 py-0.5 font-semibold ${BADGE[t.source].cls}`}>{BADGE[t.source].label}</span>
              </div>
              <h3 className="text-[15.5px] leading-snug font-bold">{t.title}</h3>
              <p className="text-[14px] leading-relaxed text-muted">{t.body}</p>
              {ref && (
                <a href={ref.url} target="_blank" rel="noopener" className="mt-auto pt-1 text-xs text-brand">
                  {ref.label} 보기
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
