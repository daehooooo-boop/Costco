"use client";

import { useMemo, useState } from "react";
import { applyDealOverrides, isActive, normalizeCategory } from "@/lib/core";
import type { Deal, ISODate, Overrides } from "@/lib/types";
import { DealCard } from "./DealCard";

const PAGE = 40;
type Sort = "rate" | "amount" | "ending" | "price";
const SORTS: Record<Sort, { label: string; fn: (a: Deal, b: Deal) => number }> = {
  rate: { label: "할인율 높은 순", fn: (a, b) => (b.discountRate ?? -1) - (a.discountRate ?? -1) },
  amount: { label: "할인액 큰 순", fn: (a, b) => (b.discount ?? -1) - (a.discount ?? -1) },
  ending: { label: "마감 임박 순", fn: (a, b) => (a.endDate ?? "9").localeCompare(b.endDate ?? "9") },
  price: { label: "가격 낮은 순", fn: (a, b) => (a.salePrice ?? 1e12) - (b.salePrice ?? 1e12) },
};

export function DealsTab({ deals, overrides, today }: { deals: Deal[]; overrides?: Overrides["deals"]; today: ISODate }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("rate");
  const [cat, setCat] = useState("전체");
  const [shown, setShown] = useState(PAGE);

  const active = useMemo(
    () => applyDealOverrides(deals, overrides).filter((d) => isActive(d, today) && (d.salePrice || d.discount)),
    [deals, overrides, today],
  );
  const cats = useMemo(() => {
    const count = new Map<string, number>();
    for (const d of active) count.set(normalizeCategory(d.category), (count.get(normalizeCategory(d.category)) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [active]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return active
      .filter((d) => (cat === "전체" || normalizeCategory(d.category) === cat) && (!needle || d.name.toLowerCase().includes(needle)))
      .sort(SORTS[sort].fn);
  }, [active, cat, q, sort]);

  const reset = () => setShown(PAGE);

  return (
    <section>
      <div className="mb-2.5 flex gap-2">
        <input
          id="deal-search"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            reset();
          }}
          placeholder="상품 이름 검색"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-card px-2.5 text-ink"
        />
        <select
          id="deal-sort"
          aria-label="정렬"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as Sort);
            reset();
          }}
          className="h-10 rounded-lg border border-line bg-card px-2 text-ink"
        >
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="no-scrollbar mb-1.5 flex gap-1.5 overflow-x-auto pb-1.5" role="group" aria-label="카테고리">
        {["전체", ...cats].map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={cat === c}
            onClick={() => {
              setCat(c);
              reset();
            }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] ${cat === c ? "border-ink bg-ink text-bg" : "border-line bg-card text-ink"}`}
          >
            {c}
            {c === "전체" ? ` ${active.length}` : ""}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[13px] text-muted">진행 중 {list.length.toLocaleString()}개</p>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {list.slice(0, shown).map((d) => (
          <DealCard key={d.id} deal={d} today={today} />
        ))}
        {list.length === 0 && <li className="py-8 text-center text-muted">조건에 맞는 할인상품이 없어요</li>}
      </ul>
      {list.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="mt-3 w-full rounded-xl border border-line bg-card p-3 font-semibold"
        >
          더 보기
        </button>
      )}
    </section>
  );
}
