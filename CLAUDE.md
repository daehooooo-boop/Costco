@AGENTS.md

# 이번 주 코스트코 — 개발 규칙

코스트코 코리아 20개 지점의 휴무일·영업시간, 이번 주 할인상품, 인기 TOP 10을 매일 자동으로 정리해 보여주는 서비스.

## 먼저 읽을 것
1. docs/기획서.md — 기준 문서
2. docs/decisions.md — 무엇을 왜 정했는지

## 원칙
- 관리 화면 없이 완전 자동으로 돈다. 사람이 매주 손대야 하는 기능은 넣지 않는다
- 직접 입력(data/manual/overrides.json)은 항상 자동 수집보다 우선한다. 관리 화면은 이 파일 모양을 기준으로 붙인다
- 출처 사이트가 바뀌어 수집이 깨져도 화면은 직전 데이터로 계속 동작해야 한다
- 접속하자마자 "오늘 내 지점 여나"가 보여야 한다
- 사용자는 20년+ UI/UX·BX 디자인 리더. 디자인 기초 설명은 빼고 실무 수준으로, 간결하게

## 코드 규칙
- Next.js 16. API가 학습 데이터와 다를 수 있으니 node_modules/next/dist/docs/ 확인
- Cache Components가 켜져 있어 클라이언트 컴포넌트도 프리렌더된다. 렌더 중에 new Date()·localStorage를 읽지 말고 useSyncExternalStore로 읽는다
- 날짜는 한국 시간 'YYYY-MM-DD' 문자열(src/lib/core.ts). 휴무·할인 계산은 순수 함수로 두고 테스트한다
- 파서(src/lib/collect/parsers.ts)는 클래스 이름보다 텍스트 모양으로 읽는다. 바꾸면 __fixtures__에 실제 HTML 조각을 추가하고 테스트한다
- 색은 globals.css 토큰만
- 주석·UI 문구는 한국어. 주석은 "왜"만 짧게
- 비밀값은 커밋·문서·메모에 쓰지 않는다

## 명령어
npm run dev / npm run lint / npm test / npm run build / npm run collect(실제 사이트 수집, 인터넷 필요)
작업을 마치기 전에 lint, test, build가 모두 통과해야 한다.

## 작업 방식
- 브랜치 → PR(base main) → 사용자가 머지 → Vercel 자동 배포. main에 직접 push 금지
- 예외: GitHub Actions 수집 봇은 data/만 main에 직접 커밋한다(docs/decisions.md D3)
- 다른 기능 브랜치를 base로 잡지 않는다
- Claude 클라우드 세션에서는 코코달인·코스트픽 접속이 막혀 있을 수 있다. 사이트 구조는 사용자 컴퓨터의 브라우저로 확인한다
