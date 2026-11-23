import { CostcoApp } from "@/components/CostcoApp";
import type { AppData } from "@/components/CostcoApp";
import stores from "../../data/stores.json";
import holidays from "../../data/holidays.json";
import announced from "../../data/closures-announced.json";
import overrides from "../../data/manual/overrides.json";
import deals from "../../data/deals.json";
import popular from "../../data/popular.json";
import meta from "../../data/meta.json";
import tips from "../../data/tips.json";

// 데이터는 빌드 때 묶인다. 수집기가 data/를 커밋하면 Vercel이 다시 배포한다.
const data = {
  stores: stores.stores,
  holidays: holidays.dates,
  announced: announced.stores,
  overrides,
  deals: deals.items,
  dealsToday: deals.today,
  popular: popular.items,
  popularBasis: popular.basis,
  meta,
  tips,
} as unknown as AppData;

export default function Home() {
  return <CostcoApp data={data} />;
}
