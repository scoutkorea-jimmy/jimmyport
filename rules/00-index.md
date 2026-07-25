# Rules & Docs — 색인 (AI가 작업 전 먼저 참조)

`CLAUDE.md`(작업 기준 ~100줄)의 연계 문서 전체 지도. **CLAUDE.md → 이 색인 → 대상 문서** 순으로 참조한다.

## 규칙 ① — 단일 컨텍스트/메모리 원칙
사용자가 어떤 명령을 하든 **무조건 `CLAUDE.md` 를 먼저 확인한 뒤** 작업을 시작한다. 프로젝트 지식은 (1) 정체성·구조 (2) 확정된 의사결정 (3) 명령 의도 기록을 담는 **단일 컨텍스트**이며, 지금은 아래 문서 트리로 분산되어 있다. 이미 합의된 내용은 다시 설명하지 말고 바로 반영한다. **의미 있는 변경/새 지시가 생기면 해당 `docs/<service>/changelog.md` 맨 아래에 한 줄 append**, 라이브 KV/데이터 조치는 [operations-log.md](operations-log.md) 에 기록한다.

## 규칙 (governance — 기본 동작 오버라이드)
- [target-check.md](target-check.md) — **규칙 ② 작업 대상 먼저 확인 (MUST ASK)**
- [code-work.md](code-work.md) — 규칙 ③ 코드 작업·리팩터링 원칙
- [ui-ux.md](ui-ux.md) — 규칙 ④ UI/UX 디자인 규칙
- [stack-routing.md](stack-routing.md) — 스택·제약 · 파일구조 · 라우팅 · 도메인 · 운영(§2·§3·§8·§18)
- [operations-log.md](operations-log.md) — 라이브 KV/데이터/인프라 조치 로그(버전 bump 없는 조치도 모두)

## 서비스별 문서 (`docs/<service>/`)
- [../docs/scout-finder/brief.md](../docs/scout-finder/brief.md) · [changelog.md](../docs/scout-finder/changelog.md) — Scout Tour Assistant (`/`·`/tour`)
- [../docs/krjam-cardnews/changelog.md](../docs/krjam-cardnews/changelog.md) — 카드뉴스 제작기 (`/krjam-cardnews`)
- [../docs/krjam-planning/changelog.md](../docs/krjam-planning/changelog.md) — 홍보부 통합 관리 (`/krjam-planning`)
- [../docs/krjam-dcount/changelog.md](../docs/krjam-dcount/changelog.md) — 디데이 프로젝트 (`/krjam-dcount`)
- [../docs/krjam-jebo/changelog.md](../docs/krjam-jebo/changelog.md) — 공개 소식 제보 (`/krjam-jebo`)

## 기타 내부 문서 (웹 비공개 — `_middleware` 차단)
`KMS.md`(데이터·사양 통합) · `FEATURES.md`(전 기능) · `README.md` · `DESIGN.md`(scout-finder 디자인 토큰).
