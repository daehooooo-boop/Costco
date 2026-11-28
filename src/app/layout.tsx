import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} · ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  keywords: [...SITE.keywords],
  applicationName: SITE.name,
  authors: [{ name: SITE.creator.name, url: SITE.creator.url }],
  creator: SITE.creator.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.name,
    description: "지점별 휴무일, 이번 주 할인, 인기 TOP 10",
    url: "/",
    locale: "ko_KR",
  },
  twitter: { card: "summary_large_image" },
  ...(process.env.NEXT_PUBLIC_NAVER_VERIFICATION
    ? { verification: { other: { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_VERIFICATION } } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171a21" },
  ],
};

// 검색엔진·AI가 "누가 만든 어떤 서비스인지" 알 수 있게. 만든 사람은 허브(reyfarm.app)의 Person과 같은 @id
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE.url}/#app`,
      name: SITE.name,
      alternateName: SITE.nameEn,
      url: SITE.url,
      description: SITE.description,
      applicationCategory: "ShoppingApplication",
      operatingSystem: "Web",
      inLanguage: "ko-KR",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
      creator: { "@id": "https://reyfarm.app/#person" },
      isPartOf: { "@id": "https://reyfarm.app/#website" },
    },
    { "@type": "Person", "@id": "https://reyfarm.app/#person", name: SITE.creator.fullName, alternateName: SITE.creator.name, url: SITE.creator.url },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
