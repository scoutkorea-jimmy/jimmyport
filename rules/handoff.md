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
  - nav: `test/regress-krjam-planning-nav.js`, jebo: `test/regress-krjam-jebo.js`, fnc(플립북): `test/regress-krjam-fnc.js`
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

> 2026-07-26 코드 기준 전수 재확인 완료. **아래 목록에 없으면 남은 일이 아니다.** (지도 공백구역·renderTimetable 렌더러 추출·toggleNoCover/deleteAsset 분리는 **이미 완료**된 항목인데 이 문서가 옛 changelog 문구를 안고 있었다 → v0.9.231 에서 정리.)

**krjam-planning — 코드 작업 없음(현재 열린 기능/부채 0).** 남은 건 아래 사용자 액션·판단 대기뿐:
- **유실된 입영 데이터 재입력**(사용자): v0.9.229 이전 저장으로 사라진 값은 복구 불가(백업 없음). 이제 정상 보존되므로 R&R 표에서 재입력만 하면 됨.
- **식사 메뉴명 검수**(사용자): v0.9.195 시드는 제공 이미지 판독분 → 화면에서 인라인 수정 가능.
- **화면 내부 레이아웃 재배치**: §16.77~16.78 결론대로 **의도적 보류** — 추측 재배치는 운영자가 외운 위치만 흔든다. **실사용 피드백 수령 후** 진행.
- **8/9 저녁(폐영식) 전체 오프**: 2026-07-26 사용자 확인 = **현행 유지**(오후+저녁 모두 배정 불가). 되돌리려면 `app.js` `GLOBAL_OFF` 에서 `['2026-08-09','eve']` 제거.
- (중장기·요청 시) `jamboree-plan/app.js` 4,700줄 단일 파일 + 전역 `state` 의 도메인별 분리. 리스크 있어 사용자 확인하에 단계적으로.

**저장소 전역**
- **문서 이행 마지막 단계(미착수·큰 리스크)**: 코드의 서비스 폴더 이동(`app.js`·`tour/`·`jamboree/`·`jamboree-plan/` → 서비스 폴더)은 **라우팅·`?v=`·HTML src 전면 재배선** 필요. 라이브 라우팅이 깨질 수 있어 반드시 계획+단계적+회귀·헤드리스 검증 후, 사용자 확인하에 진행. → [stack-routing.md](stack-routing.md).
- **scout-finder(`/tour`)**: 공개 '단위대 추가 제안 폼'(`/api/submissions`) + 관리자 승인대기/변경로그(`/api/log`)/댓글관리 뷰 — [brief §14](../docs/scout-finder/brief.md). 죽은 편집기 CSS 정리는 디자인 자료 수령 후.
- Superpowers 플러그인: 설치는 대화형 `/plugin install superpowers@claude-plugins-official`(에이전트가 실행 불가, 사용자 안내만).

## 🧨 데이터 소실을 부르는 두 패턴 (신규 코드 작성 전 반드시 확인)
1. **서버 `clean*` 화이트리스트 누락** — roster/timetable/protocol 등에 **새 필드를 추가하면 `functions/api/jamboree-plan.js` 의 해당 `clean*` 에도 반드시 추가**한다. 안 하면 저장할 때마다 서버가 조용히 버린다(v0.9.229 `arrive` 실제 사고).
2. **로드 시 자동 시드·복원이 사용자의 삭제를 되돌림** — "그 id 가 없다"는 "아직 안 들어왔다"가 아니라 **"사용자가 지웠다"일 수 있다**. 시드 주입은 `domainStored(k)` 로 **저장된 적 없는 새 보드에만** 한다(v0.9.232). 데이터 파손 '복구'(id 중복 정리 등)와 '시드 주입'을 섞지 말 것.

## 🧪 조사할 때 걸리는 함정
- **`grep` 이 `jamboree-plan/app.js` 를 바이너리로 오판**해 매치를 **조용히 0건**으로 반환한다(`file` 판정은 UTF-8, very long lines 389). **`grep -a` 를 반드시 붙일 것.** 이걸 놓치면 멀쩡히 구현된 기능을 "미구현"으로 오진한다(실제로 v0.9.231 조사에서 발생).
- 회귀에 필요한 `puppeteer-core` 는 리포에 없다 → 스크래치패드에 `npm i puppeteer-core@22` 후 `NODE_PATH=<경로>/node_modules` 로 실행.

---

## 🗓 세션 이력 (최신 순)

### 2026-07-26 (7) — `/krjam-fnc` 모바일 이어보기(세로 스크롤) + 시크릿 전수 점검 (v0.9.237)
대상: `/krjam-fnc` + 저장소 전역 보안 점검. 상세: [../docs/krjam-fnc/changelog.md](../docs/krjam-fnc/changelog.md) §19.4, [stack-routing.md §8.1](stack-routing.md).
- **이어보기 모드**: 터치 기기 기본값으로 31쪽을 세로로 죽 잇는 연속 스크롤(문서 뷰어 방식). PC 는 책장 넘기기 유지. 하단 바 버튼으로 `이어보기 ↔ 한 장씩` 전환(기억). 확대는 브라우저 기본 핀치줌에 위임.
  - ⚠️ **현재 쪽 판정은 '상단 기준'**이어야 한다. 화면 중앙 기준으로 하면 세로 화면엔 3쪽이 동시에 보여서 목차로 20쪽을 열자마자 21~22쪽으로 튄다.
  - ⚠️ 스크롤 컨테이너 안 좌표는 `offsetTop`(offsetParent 의존) 말고 **rect 차이로 계산**. `.feed{position:relative}` 도 같이.
- **시크릿 전수 점검**(사용자 요청): 워킹트리 + **git 히스토리 전체**에서 실제 API 키·토큰·개인키 **0건**. `TOTP_SECRET`·`ADMIN_TOKEN` 은 Cloudflare 시크릿에만 존재.
  - 🔴 다만 `env.CC_PASS || "scout1922"` **하드코딩 폴백이 공개 저장소에 노출**되어 있고 `CC_PASS` 미설정이라 실사용 중 — 라이브에서 `/api/krjam-dcount?admin=1`(명단+IP)·`/api/jamboree?list=1` 이 그 비번으로 **200** 응답함을 확인.
  - **사용자 결정: 비번 교체·저장소 비공개 전환 모두 하지 않고 현행 유지.** → **에이전트가 임의로 `CC_PASS` 를 설정하거나 폴백을 제거하지 말 것**(팀원 로그인이 끊긴다). 배경·정리 순서는 [stack-routing.md §8.1](stack-routing.md).
- 상태: **회귀 82/82 통과**, 콘솔 0, VERSION 0.9.237.

### 2026-07-26 (6) — `/krjam-fnc` IST 업무배정표 전량 삭제 · 배포 순간 화면 깨짐 규명 (v0.9.236)
대상: `/krjam-fnc`. 상세: [../docs/krjam-fnc/changelog.md](../docs/krjam-fnc/changelog.md) §19.3.
- **IST 업무배정표 3쪽 전량 삭제**(원본 31·32·33쪽) → **31쪽**. 이미지·썸네일·**내려받기 PDF**(원본에서 한 번에 3쪽 제거 후 재출력, 6.2MB) 모두 반영. `업무배정` 문자열 전 쪽 0건 확인. 남은 실명은 5쪽 조직도뿐.
- 목차 챕터는 마지막 두 개를 합쳐 **8개**(`업무추진 일정 · 마무리`).
- ⚠️ **"갑자기 화면이 깨진다" = 배포 전파 순간의 구 HTML + 신 CSS 조합**(코드 문제 아님). 구 HTML 은 `toc` 가 `shell` 의 마지막 자식이라 신 CSS 의 사이드바 규칙이 세로 flex 마지막 칸으로 잡혀 뷰어를 납작하게 누른다. 라이브 CSS/JS 는 로컬과 바이트 동일, 5개 뷰포트 지오메트리 전부 정상임을 확인했다.
  - **DOM 구조를 바꾸는 배포는 이 조합이 몇 초간 존재할 수 있다.** 배포 검증은 20~30초 뒤에, 제보를 받으면 **강제 새로고침(⌘⇧R) 후 재현 여부부터** 확인. 문서는 `no-cache` 라 새로고침 한 번이면 복구된다.
- 상태: **회귀 67/67 통과**, 콘솔 0, VERSION 0.9.236.

### 2026-07-26 (5) — `/krjam-fnc` 31쪽 삭제 · 목차 좌측 사이드바 · 엠블럼 (v0.9.235)
대상: `/krjam-fnc`. 상세: [../docs/krjam-fnc/changelog.md](../docs/krjam-fnc/changelog.md) §19.2.
- **31쪽(IST 업무배정 8/3·8/4·8/5) 삭제** — 이미지/썸네일 제거 + 32~34 → 31~33 재번호, `TOTAL` 33.
  ⚠️ **뷰어에서 감추는 것만으론 부족하다**: `assets/*.pdf` 를 받으면 그대로 보이므로 **내려받기 PDF 도 재생성**(`pdfseparate` → 제외 → `pdfunite` → `pdftocairo -pdf`). 다만 poppler 재출력은 폰트를 페이지마다 다시 심어 **2.1MB → 6.3MB**(원본 34쪽 재출력도 5.7MB). `qpdf`·`gs`·PyObjC 없음, 이미지 PDF 는 23MB. 더 줄이려면 `brew install qpdf` 후 `qpdf --pages` 로 다시 만들 것.
- **목차를 좌측으로**: 넓은 화면(≥1024px)은 레이아웃의 일부인 **상시 사이드바**(접으면 뷰어 확장, 상태 기억), 좁은 화면은 **좌측 드로어**. 항목을 썸네일 행으로 바꾸고 슬라이드 실물 기준 **9개 챕터**(`CHAPTERS`)로 묶음.
- 상단바에 **한국잼버리 공식 엠블럼** 추가(favicon·OG 는 원래부터 잼버리 엠블럼/톤).
- ⚠️ **교훈 추가**: 반응형 패널의 열림 상태를 `localStorage` 에 저장할 땐 **넓은 화면에서만** 저장한다. 안 그러면 데스크톱에서 저장한 '열림'을 모바일이 물려받아 드로어가 콘텐츠를 덮은 채 뜬다(회귀가 잡아냄).
- 상태: **회귀 65/65 통과**(48 → 65 확장), 콘솔 0, VERSION 0.9.235.

### 2026-07-26 (4) — 신규 서비스 `/krjam-fnc` 급식편의본부 OT 플립북 (v0.9.234)
대상: **신규** `/krjam-fnc`. 상세: [../docs/krjam-fnc/changelog.md](../docs/krjam-fnc/changelog.md) §19.1.
- 사용자 제공 PDF(급식편의본부 오리엔테이션 34쪽)를 **플립북 서브페이지**로. 확정(AskUserQuestion): 경로 `/krjam-fnc` · **PDF 원본 이미지 그대로** · **루트 랜딩 미노출**(실명 업무배정표 포함, URL 공유 전용) · 목차·확대/전체화면·PDF 내려받기·딥링크 전부.
- 자산: `pdftoppm -r 144` → `cwebp -q 84` = `krjam-fnc/pages/p01..34.webp`(4.3MB) + 썸네일 320×180(316KB) + 원본 PDF + OG 1200×630. **원본 PDF 는 `~/Downloads` 가 아니라 리포 안(`krjam-fnc/assets/`)이 진본**.
- 뷰어(`krjam-fnc/app.js`, 의존성 0): 3D 책장 넘김(`rotateY` 0→-95°, backface-visibility 로 뒷면 반전 회피) · 키보드/스와이프/휠/스크러버 · 썸네일 목차 · 확대(더블탭·핀치·휠) · **세로 화면 '가로 보기'(1.85배)** · `#p12` 딥링크.
- ⚠️ **재사용할 교훈 3가지**(다른 페이지에도 그대로 적용됨):
  1. `[hidden]` 은 `display` 를 지정한 **클래스 규칙에 진다** → 전역 `[hidden]{display:none!important}` 없으면 숨긴 패널이 화면을 덮고 **클릭을 조용히 가로챈다**(원인 못 찾으면 "버튼이 안 눌린다"로 보인다).
  2. `img` 의 `width`/`height` 속성 + CSS `width` 만 지정 = 양쪽 확정 → **`aspect-ratio` 무시**. `height:auto` 필요.
  3. flex 아이템의 기본 `flex-shrink:1` 은 `transform:rotate` 전 기준으로 폭을 눌러버린다 → `flex:none`.
- 상태: **신규 회귀 `test/regress-krjam-fnc.js` 48/48 통과**(실제 Chrome, 정적 서버, 서버·KV 무접촉), 콘솔 0, VERSION 0.9.234.

### 2026-07-26 (3) — 데이터 안정성 6종 (v0.9.233)
대상: `/krjam-planning`. 상세: [../docs/krjam-planning/changelog.md](../docs/krjam-planning/changelog.md) §16.95.
- **이상 없음 확인**: 서버 `clean*` vs 클라 필드 **8개 도메인 전수 대조 → 유실 필드 0건**(arrive 계열 재발 없음).
- **저장 실패가 조용한 유실이던 문제**: 슬롯 저장에만 있던 재시도 큐를 14개 도메인에도 도입(`sendDomainPut`·`domPending`·15초/`online` 재시도). raw fetch 였던 marketing·types·events 도 통일.
- **미저장 보호**: 대기 중 도메인은 `applyServer` 가 덮지 않음 + **localStorage 표식**(`jamboree-plan:unsaved`)으로 새로고침 후에도 `restoreUnsaved()` 가 로컬 값을 지키고 재전송. 저장 가드 바(다시 저장/되돌리기) · `beforeunload` 경고 · version-watch 강제 새로고침 보류.
- **보드 백업 신설**(인원 화면, 홍보부·관리자 전용): 14개 도메인 JSON 내보내기/복원 — 그동안 운영 데이터엔 복구 수단이 아예 없었다.
- **길이·개수 가드**: 서버 상한과 같은 `FIELD_MAX` 로 자를 때 알림, 항목 수 90% 도달 시 경고.
- 상태: **회귀 클라 132/132 · nav 19/19 · jebo 29/29 · 서버 16/16 통과, 콘솔 0, 프로덕션 v0.9.233 배포.**

### 2026-07-26 (2) — 기능 오류 조사 → 6건 수정 (v0.9.232)
대상: `/krjam-planning`. 상세: [../docs/krjam-planning/changelog.md](../docs/krjam-planning/changelog.md) §16.94.
- 사용자 "검증이 필요한 것들을 찾아봐" → "검증하고 개선해". 6건 발견, **4건은 실제 Chrome 재현 후** 수정.
- **🔴 시드 복원이 사용자 데이터를 덮어씀**: `upgradeProtocol` 이 사용자가 직접 넣은 의전(랜덤 id)을 시드 41건으로 교체+공유 KV PUT 했다. 지운 시드(회의·컵·슈퍼스타J·촬영 게이트)도 매 로드마다 부활했고, 식사를 비우면 재시드됐다. → 신규 **`domainStored(k)`**(서버 `versions` 에 도메인 키가 있으면 = 저장된 보드 = 사용자 값이 정답) 가드를 6개 함수에 적용.
- **잔여 배정 점검 배너**(`renderTTAvail`): 나중에 생긴 규칙(8/9 전체 오프)에 걸린 기존 배정을 전원 스캔해 일정표에 표시. 해제는 기존 `enforceAvailability` 재사용, **자동 삭제 없음**.
- **다기기 동시편집**: 편집 창 id(`client`, sessionStorage) 도입 → 같은 계정이라도 다른 창이면 병합(lost update 방지). 같은 탭 연속 저장은 병합 안 함(v0.9.226 오탐 방지 유지).
- **개인정보 응답 캐시**: 보드 GET 을 `private, no-store` 로(엣지 캐시 사본은 유지해 KV 읽기 절감).
- 상태: **회귀 클라 124/124 · nav 19/19 · jebo 29/29 · 서버 16/16 통과, 콘솔 0, 프로덕션 v0.9.232 배포.**

### 2026-07-26 — 잔여 작업 현황 재확인 + dormant navsheet 제거 (v0.9.231)
대상: `/krjam-planning`. 상세: [../docs/krjam-planning/changelog.md](../docs/krjam-planning/changelog.md) §16.93.
- 사용자 "planning 사이트만 마저 작업" → **남은 일 목록을 코드 기준으로 전수 재확인**. 4건 중 3건(지도 공백구역·renderTimetable 렌더러 추출·toggleNoCover/deleteAsset 분리)이 **이미 완료**였고 이 문서만 옛 항목을 안고 있었다 → 위 '남은 일' 섹션 전면 갱신.
- **실제 처리**: §16.63(v0.9.184)에서 죽은 뒤 남아 있던 **navsheet 잔재 3지점 제거** — `krjam-planning.html` `#navsheet` 블록 · `app.js` `closeNavSheet()` · `styles.css` `.sheet*` 18줄(+`@keyframes sheetUp`).
- **8/9 저녁(폐영식)**: 사용자 확인 = 현행 유지(전체 오프), 코드 무변경.
- ⚠️ **교훈**: `grep` 이 `jamboree-plan/app.js` 를 바이너리로 오판해 매치 0건을 반환 → **`grep -a` 필수**(위 '조사할 때 걸리는 함정').
- 상태: **회귀 클라 116/116 · nav 19/19 · jebo 29/29 · 서버 10/10 통과, 콘솔 0, 프로덕션 v0.9.231 배포.**

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
