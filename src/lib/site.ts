export const SITE = {
  name: "이번 주 코스트코",
  description: "코스트코 코리아 20개 지점 휴무일·영업시간, 이번 주 할인상품, 인기상품 TOP 10을 매일 아침 자동으로 정리해요.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://costco.reyfarm.app",
  creator: { name: "Rey.K", url: "https://reyfarm.app" },
} as const;
