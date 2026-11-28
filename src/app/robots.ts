import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// AI 검색(ChatGPT·Perplexity 등)에 출처로 나오는 게 목표라 크롤러를 막지 않는다
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
