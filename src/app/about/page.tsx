import type { Metadata } from "next";
import Link from "next/link";
import { FAQ, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "소개·자주 묻는 질문",
  description: "이번 주 코스트코가 어떤 서비스인지, 휴무일·할인 정보를 어디서 언제 가져오는지, 개인정보와 상표·저작권 고지를 정리했어요.",
  alternates: { canonical: "/about" },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

const H2 = "text-[17px] font-bold tracking-tight";

export default function About() {
  return (
    <div className="min-h-dvh">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pt-6 pb-12 text-[15px] leading-relaxed">
        <Link href="/" className="text-[13px] text-brand">
          ← {SITE.name}
        </Link>

        <header className="flex flex-col gap-2">
          <h1 className="text-[22px] font-bold tracking-tight">{SITE.name} 소개</h1>
          <p>
            {SITE.name}는 코스트코 코리아 20개 지점의 휴무일과 영업시간, 이번 주 할인상품, 인기상품 TOP 10을 매일 아침 자동으로 정리해 주는 무료 웹
            서비스예요. 장 보러 가기 전에 &ldquo;오늘 내 지점 여나&rdquo;와 &ldquo;이번 주 뭐가 싸나&rdquo;를 한 화면에서 확인할 수 있어요.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className={H2}>자주 묻는 질문</h2>
          <dl className="flex flex-col gap-4">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-line bg-card p-4">
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-1 text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className={H2}>데이터 출처와 갱신</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>휴무일: 지점별 의무휴업 규칙 + 코스트픽 지점 페이지에 공지된 휴무 + 직접 확인한 변경 사항</li>
            <li>
              할인·인기상품:{" "}
              <a className="text-brand" href="https://cocodalin.com" target="_blank" rel="noopener">
                코코달인
              </a>
              ,{" "}
              <a className="text-brand" href="https://costpick.co.kr" target="_blank" rel="noopener">
                코스트픽
              </a>
              에 공개된 정보. 상품마다 출처를 표시하고 원래 페이지로 연결해요.
            </li>
            <li>이용 꿀팁: 코스트코 공식 안내와 언론·카드사 정리를 바탕으로 직접 요약하고 확인일을 적어요.</li>
            <li>매일 오전 7시(한국 시간)에 자동으로 다시 모아요. 실제 가격·휴무는 지점과 시기에 따라 다를 수 있어요.</li>
          </ul>
        </section>

        <section id="privacy" className="flex flex-col gap-2">
          <h2 className={H2}>개인정보</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>회원가입, 로그인, 입력 양식, 쿠키가 없고 이름·연락처 같은 개인정보를 수집하지 않아요.</li>
            <li>고른 지점은 이 기기의 브라우저(localStorage)에만 저장되고 서버로 보내지 않아요.</li>
            <li>
              방문 수는 쿠키 없는 Vercel Web Analytics로 개인을 알아볼 수 없게 집계해요. 호스팅과 통계는 Vercel Inc.(미국)가 맡고 있어 접속 기록이 미국
              등에서 처리될 수 있어요.
            </li>
            <li>광고는 없어요. 광고를 붙이게 되면 이 페이지에 먼저 알려 드려요.</li>
            <li>
              문의·삭제 요청:{" "}
              <a className="text-brand" href="mailto:rey.k@kakao.com">
                rey.k@kakao.com
              </a>{" "}
              (개인정보 보호 책임자 김대호). 운영자 공통 방침은{" "}
              <a className="text-brand" href="https://reyfarm.app/privacy/">
                reyfarm.app/privacy
              </a>
              에 있어요.
            </li>
          </ul>
        </section>

        <section id="notice" className="flex flex-col gap-2">
          <h2 className={H2}>상표·저작권 고지</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>코스트코(Costco)와 상품 브랜드 이름은 각 소유자의 상표예요. 서비스가 무엇을 다루는지 설명하기 위해서만 써요.</li>
            <li>이 서비스는 코스트코 및 코코달인·코스트픽과 제휴하거나 승인받지 않은 개인 프로젝트예요.</li>
            <li>상품 사진은 출처 사이트와 제조사의 저작물이라 싣지 않아요. 사진과 상세 정보는 각 상품의 출처 링크에서 확인해 주세요.</li>
            <li>
              권리자께서 표기나 내용에 문제가 있다고 알려 주시면 확인 즉시 고치거나 내릴게요:{" "}
              <a className="text-brand" href="mailto:rey.k@kakao.com">
                rey.k@kakao.com
              </a>
            </li>
            <li>이 서비스의 글, 디자인, 코드는 {SITE.copyright}예요.</li>
          </ul>
        </section>

        <footer className="text-[13px] text-muted">
          {SITE.copyright} ·{" "}
          <a className="text-brand" href={SITE.creator.url} rel="author">
            Rey.K가 만든 작은 서비스 · reyfarm.app
          </a>
        </footer>
      </main>
    </div>
  );
}
