# HANDOFF — 다음 작업자 필독 (작업 착수 전 이 문서부터 확인)

> **이 문서는 "지금 상태 + 바로 이어서 할 일"의 단일 진입점**이다. 모든 작업을 마칠 때마다 맨 위 **최신 세션** 블록을 갱신한다(가장 최근이 맨 위). 상세 이력은 각 `docs/<service>/changelog.md`.
> 규칙: **작업 착수 전 반드시 이 handoff → [00-index.md](00-index.md) → 대상 문서 순으로 확인.**

---

## 🧭 빠른 시작 (환경·검증·배포)

- **주 대상**: `/krjam-planning`(홍보부 통합 관리, 모듈 `jamboree-plan/`, 엔트리 `krjam-planning.html`). 배포처: Cloudflare Pages 프로젝트 `jimmyport` → `scoutingapp.net`.
- **스택**: Vanilla HTML/CSS/JS. **빌드 단계 없음**. 서버는 Cloudflare Pages Functions(`functions/api/*`), 저장소 KV `SCOUT_KV` + R2 `SCOUT_R2`.
- **검증(로컬)**:
  - `node --check jamboree-plan/app.js` (문법)
  - 클라 회귀(실제 Chrome + `/api` 목업, 운영 KV 무접촉): `node test/regress-krjam-planning.js` — **puppeteer-core 필요**(리포에 없음). 스크래치패드 등에 `npm i puppeteer-core@22` 후 `NODE_PATH=<경로>/node_modules node test/regress-krjam-planning.js`. Chrome 경로 하드코딩: `/Applications/Google Chrome.app/...`.
  - 서버 순수함수 회귀(브라우저 불필요): `node test/regress-krjam-planning-server.js`
  - nav: `test/regress-krjam-planning-nav.js`, jebo: `test/regress-krjam-jebo.js`
- **배포**(검증 통과 시): `git commit && git push && wrangler pages deploy . --project-name jimmyport --branch main --commit-dirty=true`. 의미 있는 변경마다 `VERSION` + `krjam-planning.html` 의 `?v=` 동시 bump, 커밋 메시지 ASCII 권장.
- **버전 확인**: `curl -s https://scoutingapp.net/VERSION` / 자산 `?v=`.
- ⚠️ **운영 KV(`SCOUT_KV`) 파괴적 쓰기 금지**. 검증은 GET·헤드리스 목업. 라이브 데이터 조치는 read-modify-write(비파괴) + [operations-log.md](operations-log.md) 기록. (API 쓰기는 회원/관리자 세션 필요 — 무인증 curl PUT 불가.)

## 🔑 알아둘 비자명 포인트 (`jamboree-plan/app.js` ~4,600줄 단일 파일)
- **입영 시점**(`roster[].arrive`, "YYYY-MM-DDThh:mm"): R&R 표의 **날짜 드롭다운 + 오전/오후/저녁 세그먼트 칩**으로 입력(블록 시작 09:00/14:00/19:00 저장). ⚠️ **서버 `cleanRoster`(functions/api/jamboree-plan.js)에 필드 화이트리스트가 있다 — roster 에 새 필드를 추가하면 반드시 여기에도 추가**(안 하면 저장 때마다 유실. v0.9.223→229 실제 버그였음).
- **배정 가드** `assignBlock(pid,date,sH,eH)` = 입영 전 → 전체 오프(8/9 오후·저녁) → 개별 오프타임 순. 일정표·의전 담당 칩, 현장 배치, 촬영 상세 칩이 전부 이걸 사용. 오프타임 그리드 색: **회색 음영=입영 전(자동)** · **빨강 빗금=전체 오프(GLOBAL_OFF)** · **빨강=수동 오프(편집)** · 흰색=가능.
- **동시편집 병합**: 서버 `saveDomain` 이 `conflictByOther(baseVer,storedVer,storedAuthor,author)` 로 판정 — **다른 작성자**가 그 사이 바꿨을 때만 병합('다른 사람이 편집 중'). 같은 작성자면 통짜 저장(혼자 오탐 방지).
- **저장 flush**: 디바운스 저장(`debouncedPut`·카드·마케팅·이벤트)이 flush 레지스트리에 등록. `window.flushPendingSaves()` 가 대기분을 즉시 발사. `version-watch.js` 가 새 배포 감지 시 flush → **5초 뒤 강제 새로고침**(전 페이지 공용).
- **개영식 카운트다운**: `EVENT_DT=2026-08-05 20:00` 정밀 카운트다운(사용자가 이 방식 유지 선택; D 숫자가 20:00에 감소하는 특성 수용).

## ⏭️ 남은 일 / 열린 항목
- **문서 이행 마지막 단계(미착수·큰 리스크)**: 코드의 서비스 폴더 이동(`app.js`·`tour/`·`jamboree/`·`jamboree-plan/` → 서비스 폴더)은 **라우팅·`?v=`·HTML src 전면 재배선** 필요. 라이브 라우팅이 깨질 수 있어 반드시 계획+단계적+회귀·헤드리스 검증 후, 사용자 확인하에 진행. → [stack-routing.md](stack-routing.md).
- **8/9 저녁(폐영식) 전체 오프 포함 여부**: 현재 지시대로 8/9 오후+저녁 모두 전체 오프(폐영식 배정 불가). 저녁을 배정 가능하게 하려면 `app.js` `GLOBAL_OFF` 에서 `['2026-08-09','eve']` 제거.
- **유실된 입영 데이터**: v0.9.229 이전 저장으로 사라진 값은 복구 불가(백업 없음) → 사용자가 재입력해야 함(이제 정상 보존).
- Superpowers 플러그인: 설치는 대화형 `/plugin install superpowers@claude-plugins-official`(에이전트가 실행 불가, 사용자 안내만).

---

## 🗓 세션 이력 (최신 순)

### 2026-07-25 — 입영 시점 기능 일괄 (v0.9.223 → v0.9.230) · 문서 구조 이행
대상: `/krjam-planning`. 상세: [../docs/krjam-planning/changelog.md](../docs/krjam-planning/changelog.md) §16.79~16.92.
- **v0.9.223** 입영 시점 필드 + 입영 이전 배정 차단(assignBlock, 4개 지점).
- **v0.9.224** 배정 사후 정리(enforceAvailability)·입영↔오프타임 연계(그리드 자동 표시)·오프타임 셀 세로 스택(좁은 화면)·새 배포 시 자동저장 후 5초 강제 새로고침.
- **v0.9.225** 입영 입력 datetime → 날짜+블록 칩. 개영식 카운트다운 검토(정밀 유지).
- **v0.9.226** 입영 블록칩 세그먼트 디자인 · '타인 수정 중' 오탐 수정(같은 작성자 병합 안 함, `conflictByOther`).
- **v0.9.227** 오프타임 그리드 8/2부터(전 기간) · 입영 전 자동 잠금 · 입영 전 수동오프 정리(pruneOffBeforeArrival).
- **v0.9.228** 입영 전 자동 오프 = 앰버 → 회색 음영.
- **🔴 v0.9.229** 입영(arrive) 데이터 유실 수정 — 서버 `cleanRoster` 화이트리스트에 `arrive` 누락이었음(핵심 교훈: roster 신규 필드는 서버 clean에도 추가).
- **v0.9.230** 8/9 오후·저녁 전체 오프(폐영일, `GLOBAL_OFF`, 빨강 빗금).
- **문서 이행**: `CLAUDE.md` 1356줄 → 55줄 색인, governance는 `rules/`, 서비스 이력은 `docs/<service>/` 로 분리(커밋 `05ac1ee`).
- 상태: **회귀 클라 116/116 · 서버 10/10 통과, 콘솔 0, 프로덕션 v0.9.230 라이브, 워킹트리 클린.**
