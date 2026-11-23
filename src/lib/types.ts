export type ISODate = string; // 'YYYY-MM-DD' (한국 시간)

export interface Store {
  slug: string;
  name: string;
  region: string;
  address: string;
  open: string;
  close: string;
  closureRule: { weekday: number; weeks: number[] };
}

export interface Holiday {
  date: ISODate;
  name: string;
}

export interface Announced {
  dates: ISODate[];
  checkedAt: ISODate;
  hours?: { open: string; close: string } | null;
}

export interface ManualClosure {
  add?: ISODate[];
  remove?: ISODate[];
  memo?: string;
}

export type ClosureSource = "rule" | "announced" | "manual";
export interface Closure {
  date: ISODate;
  reason: string;
  source: ClosureSource;
}

export type DealSource = "cocodalin" | "costpick" | "manual";

export interface DealRef {
  site: DealSource;
  url?: string;
  salePrice?: number | null;
  endDate?: ISODate | null;
  store?: string | null;
}

/** 수집기가 한 출처에서 읽은 상품 한 건 */
export interface RawDeal {
  source: DealSource;
  sourceId: string;
  url: string;
  itemNo: string | null;
  name: string;
  brand?: string | null;
  category: string | null;
  salePrice: number | null;
  originalPrice: number | null;
  discount: number | null;
  discountRate: number | null;
  startDate: ISODate | null;
  endDate: ISODate | null;
  image: string | null;
  store?: string;
  rank?: number;
}

/** 화면에 보여주는 상품 (출처를 합친 결과) */
export interface Deal {
  id: string;
  itemNo?: string | null;
  name: string;
  brand?: string | null;
  category?: string | null;
  salePrice?: number | null;
  originalPrice?: number | null;
  discount?: number | null;
  discountRate?: number | null;
  startDate?: ISODate | null;
  endDate?: ISODate | null;
  image?: string | null;
  source: DealSource;
  refs: DealRef[];
  rank?: number;
}

/** 직접 입력 데이터. 나중에 관리 화면이 이 모양을 고칩니다. */
export interface Overrides {
  closures?: Record<string, ManualClosure>;
  deals?: {
    add?: Partial<Deal>[];
    hide?: string[];
    patch?: Record<string, Partial<Deal>>;
  };
  tips?: {
    add?: Tip[];
    hide?: string[];
  };
  coupons?: unknown[];
  notices?: { text: string; until?: ISODate }[];
}

export interface SourceStatus {
  ok: boolean;
  count?: number;
  at: ISODate;
  lastOk?: ISODate | null;
  error?: string;
}

export interface Meta {
  lastRun?: string;
  sample?: boolean;
  sources: Record<string, SourceStatus>;
}

/** 꿀팁 출처의 믿을 정도: 코스트코 공식 안내 > 언론·카드사 정리 > 이용자 경험 */
export type TipSource = "official" | "guide" | "community";

export interface Tip {
  id: string;
  category: string;
  title: string;
  body: string;
  source: TipSource;
  /** tips.json의 sources 키, 또는 직접 쓴 URL */
  ref?: string;
}
