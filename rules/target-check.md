# 규칙 ② — 작업 대상 먼저 확인 (MUST ASK)
*(신설 2026-06-27, 사용자 "무조건" 지시. 기본 동작을 **오버라이드**한다.)*

> **모든 작업·수정·명령에 대해, 착수 전에 "어떤 대상"인지 먼저 묻고 확정한다.** 대상이 명시되지 않았거나 모호하면 **반드시 AskUserQuestion 으로 질문 후** 진행. 단, 현재 대화 흐름에서 대상이 이미 확정된 경우 같은 작업 동안 재질문은 생략.

두 층위로 구분해 확인한다:

**① 홈페이지/repo 단위**
- `jimmyport` — 이 repo · `scoutingapp.net`(주력) + `jimmypark.net`
- `gilwell-media` — 별도 repo
- `jimmyport` 포트폴리오 — 예정 · 새 repo

**② 앱(서비스) 단위** (jimmyport repo 내 — 각 서비스 문서는 `docs/<service>/`)
| 라우트 | 서비스 | 문서 |
|---|---|---|
| `/` (랜딩) · `/tour` · `/tour/admin` | Scout Tour Assistant | [docs/scout-finder/](../docs/scout-finder/) |
| `/krjam-planning` | 홍보부 통합 관리 플랫폼 | [docs/krjam-planning/](../docs/krjam-planning/) |
| `/krjam-jebo` | 공개 소식 제보 | [docs/krjam-jebo/](../docs/krjam-jebo/) |

⛔ **종료된 서비스(2026-08-14)**: `/krjam-cardnews` · `/krjam-dcount` · `/krjam-fnc`·`/krjam-fnc-book`.
사용자가 이 셋을 대상으로 지목하면 **이미 종료됐음을 먼저 알리고**, 복원이 필요한지 확인한 뒤 진행한다(코드는 종료 아카이브에만 있다).

대상이 확정되면 **해당 `docs/<service>/` 문서를 먼저 읽고** 착수한다.
