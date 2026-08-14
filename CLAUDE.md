# jimmyport — AI 작업 기준 (Claude는 작업 전 항상 먼저 읽을 것)

이 파일은 **AI의 작업 기준 색인**이다. 상세 사양·이력·규칙은 아래 연계 문서를 참조한다.
프로젝트 지식의 단일 진입점: **CLAUDE.md → [rules/00-index.md](rules/00-index.md) → 대상 문서**.

> 🚩 **착수 전 무조건 [rules/handoff.md](rules/handoff.md) 먼저 확인** — 현재 상태·환경·검증/배포·남은 일. **모든 작업을 마칠 때마다 handoff.md 를 갱신**해 다음 작업자가 바로 이어갈 수 있게 한다.

---

## 🚦 규칙 0 — 모든 작업은 "대상 확인"으로 시작 (MUST ASK)

> **어떤 명령을 받든, 착수 전에 "어떤 홈페이지/서비스를 대상으로 작업하려는 것인지" 먼저 묻고 확정한다.**
> 대상이 명시되지 않았거나 모호하면 **반드시 `AskUserQuestion` 으로 질문한 뒤** 진행한다.
> (예외: 현재 대화 흐름에서 대상이 이미 확정된 경우, 같은 작업 동안 재질문 생략.)

확인 층위 · 상세 절차 → **[rules/target-check.md](rules/target-check.md)**

- **repo 단위**: `jimmyport`(이 repo · scoutingapp.net) · `gilwell-media`(별도 repo) · `jimmyport` 포트폴리오(예정)
- **서비스 단위**(이 repo): `/`·`/tour` · `/krjam-planning` · `/krjam-jebo`
  - ⛔ **종료됨(2026-08-14)**: `/krjam-cardnews`·`/krjam-dcount`·`/krjam-fnc` — 코드·데이터는 종료 아카이브에만 있다(§종료 서비스).

대상 확정 후 **해당 `docs/<service>/` 문서를 먼저 읽고** 착수한다.

---

## 📐 작업 기준 (governance — 아래 규칙은 기본 동작을 오버라이드)

1. **단일 메모리**: 합의된 내용은 다시 설명하지 말고 바로 반영. 의미 있는 변경/새 지시는 해당 `docs/<service>/changelog.md` 맨 아래에 한 줄 append. 라이브 KV/데이터 조치는 [rules/operations-log.md](rules/operations-log.md) 에 기록(버전 bump 없어도 **모두**).
   - **틀린 판단·헛돌던 검사·못 한 것은 [rules/failures.md](rules/failures.md) 에 남긴다.** changelog 는 *한 일*, failures 는 ***틀린 일***. 특히 **구조적으로 못 하는 것(§3)** 은 시도하기 전에 먼저 확인한다.
2. **작업 대상 먼저 확인** → [rules/target-check.md](rules/target-check.md) *(위 규칙 0)*
3. **코드 작업·리팩터링 원칙** → [rules/code-work.md](rules/code-work.md)
   - 기존 기능/UX 깨지 않기 · 실행흐름·의존관계 먼저 파악 · 스파게티 복제 금지 · 신규는 별도 함수/모듈로 분리 · 점진적 · 수정 전후 동작 동일성 검증(회귀 `test/`).
4. **UI/UX 디자인 규칙** → [rules/ui-ux.md](rules/ui-ux.md)
   - 심미성보다 사용성 · 카드중첩 금지 · 폰트 ≥13px · 버튼 ≥40px · 대비 4.5+ · 시간 HH:MM(24h).

## 🧱 스택·라우팅·운영 → [rules/stack-routing.md](rules/stack-routing.md)

- **Vanilla HTML/CSS/JS만.** 프레임워크·번들러·**빌드 단계 도입 금지**(카드뉴스·디데이 React는 해당 페이지에만 격리).
- 배포: 검증 통과 즉시 `git commit + push + wrangler pages deploy . --project-name jimmyport --branch main` (별도 지시 없어도 진행). 커밋 메시지 **ASCII 권장**.
- 의미 있는 변경마다 `VERSION` bump. 로컬 dev server 상시 구동 금지.
- 도메인: `scoutingapp.net`(주력) + `jimmypark.net`. 내부문서·설정은 `functions/_middleware.js` 가 404 차단.
- ⚠️ **운영 KV(`SCOUT_KV`) 파괴적 쓰기 금지** — 스모크 PUT 금지, 검증은 GET·헤드리스 목업. 불가피한 조치는 read-modify-write(비파괴) + operations-log 기록.

---

## 🗂 서비스별 문서 지도 (`docs/<service>/`)

| 라우트 | 서비스 | 모듈/엔트리 | 문서 |
|---|---|---|---|
| `/` · `/tour` · `/tour/admin` | Scout Tour Assistant | `index.html` · `tour/`(app.js·admin.js·data.js·styles.css) | [brief](docs/scout-finder/brief.md) · [changelog](docs/scout-finder/changelog.md) |
| `/krjam-planning` | 홍보부 통합 관리 플랫폼 | `jamboree-plan/` | [changelog](docs/krjam-planning/changelog.md) |
| `/krjam-jebo` | 공개 소식 제보 | `krjam-jebo.html` | [changelog](docs/krjam-jebo/changelog.md) |

- 백엔드(Cloudflare Pages Functions): `functions/api/*`, 저장소 KV `SCOUT_KV` + R2 `SCOUT_R2`.
- 데이터·사양 통합: `KMS.md` · 전 기능: `FEATURES.md` · 규칙/문서 전체 색인: [rules/00-index.md](rules/00-index.md).

## ⛔ 종료 서비스 (2026-08-14 · v0.9.295)

**카드뉴스 제작기(`/krjam-cardnews`) · 디데이 프로젝트(`/krjam-dcount`) · 급식편의본부(`/krjam-fnc`·`/krjam-fnc-book`)** 는 행사 종료와 함께 **공식 종료**했다. 코드·자산·문서·회귀·라이브 데이터는 전부 지웠고, **되살릴 근거는 종료 아카이브 하나뿐**이다.

- 아카이브: `KRJAM16-종료서비스-아카이브-20260814.zip` (사용자 보관 · 74MB) — 복원 절차는 그 안 `README.md`
- 주소는 살아 있다 → `_redirects` 가 **302** 로 `/service-ended?s=<키>` (종료 안내 화면) 로 보낸다. **301 금지**(브라우저 영구 캐시 → 되살려도 안 돌아온다)
- ⚠️ **`jamboree/` 를 통째로 지우지 말 것** — `assets/logo.png`·`og-planning.png` 는 랜딩·홍보부·제보가 **아직 쓰는 공유 자산**이다(모듈·폰트만 지웠다)
- ⚠️ **라이브 KV 는 그대로 둔다**(사용자 지시) — 특히 디데이 참가자 사진 29장. 아카이브에 사본이 있지만 원본을 지우지 않는다
- 회귀: `test/regress-service-ended.js`(25건) 가 '덜 지움(죽은 링크)'과 '더 지움(공유 자산 파괴)'을 양쪽으로 막는다

> ✅ **폴더 정리 완료(v0.9.299)**: **엔트리 HTML 은 루트 고정**(Pages 는 파일명이 곧 주소), **모듈·자산은 서비스 폴더로**. `/tour` 앱 4개(`app.js`·`admin.js`·`data.js`·`styles.css`)를 `tour/` 로, `jamboree/assets/` 를 `assets/` 로 합치고, 배치도 고해상 원본을 `_private/` 로 옮겼다(루트 파일 25→19). 옮긴 자산의 옛 주소는 `_redirects` 301 — **이미 공유된 링크의 SNS 미리보기가 깨지지 않게** 한 것이다. 구조는 [rules/stack-routing.md §3](rules/stack-routing.md) 참조.
