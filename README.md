# 이번 주 코스트코

코스트코 코리아 20개 지점의 휴무일·영업시간, 이번 주 할인상품, 인기상품 TOP 10을 매일 아침 자동으로 정리해 보여줘요. 관리 화면 없이 돌아가요.

## 실행

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # 휴무 계산·파서 테스트
npm run collect   # 실제 사이트에서 수집해 data/ 갱신 (인터넷 필요)
```

## 구조

| 경로 | 내용 |
| --- | --- |
| `src/app/page.tsx` | `data/*.json`을 빌드 때 읽어 화면에 넘김 |
| `src/components/` | 지점·휴무, 이번 주 할인, 인기 TOP 10 화면 |
| `src/lib/core.ts` | 휴무 계산, 출처 병합, 직접 입력 적용 (순수 함수) |
| `src/lib/collect/parsers.ts` | 코코달인·코스트픽 HTML 읽기 |
| `scripts/collect.ts` | 수집기 |
| `data/stores.json`, `holidays.json` | 지점·명절 설정 (사람이 가끔 고침) |
| `data/deals.json`, `popular.json`, `closures-announced.json`, `meta.json` | 수집 결과 |
| `data/manual/overrides.json` | 직접 입력. 나중에 관리 화면이 고칠 파일 |
| `.github/workflows/collect.yml` | 매일 07:00 KST 수집 → data/ 커밋 |
| `docs/` | 기획서, 결정 기록 |

## 자동 갱신

```
GitHub Actions (매일 07:00 KST)
  → npm test → npm run collect
      코코달인 12개 카테고리 (할인 약 560개, 기간·할인액)
      코코달인 /popular (인기 순위)
      코스트픽 14개 카테고리 (개봉역점 매대 가격, 보조)
      코스트픽 지점 페이지 20곳 (공지된 다음 휴무일, 영업시간)
  → 바뀐 data/를 main에 커밋 → Vercel 자동 배포
```

한 출처가 실패하거나 결과가 20개 미만이면 그 출처는 직전 데이터를 유지하고 화면 위에 안내가 떠요. 요청 사이에 1.5초씩 쉬어요.

휴무일 우선순위는 직접 입력 > 지점 공지 > 규칙(둘째·넷째 일요일, 일산점 수요일, 대구 두 곳 월요일, 설·추석 당일)이에요.

## 배포

1. Vercel → Add New → Project → `costco-farm` Import (프로젝트 이름 `costco-farm`)
2. 배포 확인 후 Settings → Domains에 `costco.reyfarm.app` 추가
3. Analytics 탭 → Enable
4. GitHub 저장소 Settings → Actions → General → Workflow permissions가 **Read and write**인지 확인
5. Actions 탭 → 데이터 수집 → Run workflow로 첫 수집

매년 1월에 `data/holidays.json`에 다음 해 설·추석 날짜를 추가해 주세요.

## 나중에 관리 화면

`data/manual/overrides.json` 모양:

```json
{
  "closures": { "uijeongbu": { "add": ["2026-12-31"], "remove": [], "memo": "재고조사" } },
  "deals": {
    "add":   [{ "name": "쿠폰북 상품", "salePrice": 9990, "startDate": "2026-12-01", "endDate": "2026-12-14" }],
    "hide":  ["item:693546"],
    "patch": { "item:1165114": { "salePrice": 10990 } }
  },
  "coupons": [],
  "notices": []
}
```

가장 간단한 길은 이 파일을 GitHub API로 고치는 페이지예요(저장하면 1~2분 뒤 재배포). 즉시 반영이 필요해지면 같은 모양을 Neon DB로 옮기고 `page.tsx`에서 읽는 곳만 바꾸면 돼요. 병합 로직은 그대로 써요.

## 출처

할인: [코코달인](https://cocodalin.com), [코스트픽](https://costpick.co.kr) · 휴무·영업시간: 코스트픽 지점 페이지. 두 사이트 모두 robots.txt에서 해당 경로를 허용해요. 코스트코 공식 사이트는 자동 조회를 막아 두어 쓰지 않아요. 개인적·비상업적 정보 페이지예요.
