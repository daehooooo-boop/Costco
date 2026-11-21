/* eslint-disable @next/next/no-img-element -- 외부 출처 이미지를 그대로 보여 주므로 next/image 최적화를 쓰지 않는다 */
"use client";

import { useState } from "react";
import { daysBetween } from "@/lib/core";
import type { Deal, ISODate } from "@/lib/types";

const won = (n?: number | null) => (n == null ? "" : `${n.toLocaleString("ko-KR")}원`);
const md = (iso?: string | null) => (iso ? `${+iso.slice(5, 7)}.${+iso.slice(8, 10)}` : "");
const SRC: Record<string, string> = { cocodalin: "코코달인", costpick: "코스트픽 개봉역점", manual: "직접 입력" };

export function DealCard({ deal: d, today, rank }: { deal: Deal; today: ISODate; rank?: number }) {
  const [imgOk, setImgOk] = useState(Boolean(d.image));
  const left = d.endDate ? daysBetween(today, d.endDate) : null;
  const link = d.refs?.[0]?.url;

  return (
    <li className="relative flex gap-3 rounded-2xl border border-line bg-card p-3">
      {rank != null && (
        <span className="absolute top-2 left-2 z-[1] grid h-6 min-w-6 place-items-center rounded-md bg-brand px-1 text-[13px] font-extrabold text-brand-ink">
          {rank}
        </span>
      )}
      {imgOk && d.image ? (
        <img
          src={d.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgOk(false)}
          className="size-[84px] shrink-0 rounded-xl bg-chip object-cover"
        />
      ) : (
        <div className="size-[84px] shrink-0 rounded-xl bg-chip" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-muted">{d.category}</span>
        <span className="line-clamp-2 text-[14.5px] leading-snug font-semibold">
          {link ? (
            <a href={link} target="_blank" rel="noopener">
              {d.name}
            </a>
          ) : (
            d.name
          )}
        </span>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 tabular-nums">
          {d.salePrice ? <span className="text-[17px] font-extrabold">{won(d.salePrice)}</span> : null}
          {d.originalPrice && d.originalPrice !== d.salePrice ? <span className="text-[13px] text-muted line-through">{won(d.originalPrice)}</span> : null}
          {d.discount ? (
            <span className="text-[13px] font-bold text-sale">
              -{won(d.discount)}
              {d.discountRate ? ` (${d.discountRate}%)` : ""}
            </span>
          ) : null}
        </div>
        <div className="mt-auto flex justify-between gap-2 pt-1 text-xs text-muted">
          <span className="tabular-nums">
            {d.startDate ? `${md(d.startDate)} ~ ` : "~ "}
            {md(d.endDate)}
          </span>
          {left != null && <span className={`font-bold ${left <= 2 ? "text-sale" : "text-ink"}`}>{left <= 0 ? "오늘 마감" : `D-${left}`}</span>}
        </div>
        <span className="text-[11px] text-muted">{SRC[d.source] ?? d.source}</span>
      </div>
    </li>
  );
}
