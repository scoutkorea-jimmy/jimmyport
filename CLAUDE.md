# scout-finder — Project Brief & Command Log (Claude는 작업 전 항상 먼저 읽을 것)

> **⛳️ 최우선 규칙**
> 사용자가 어떤 명령을 하든, **무조건 이 파일(CLAUDE.md)을 먼저 확인한 뒤** 작업을 시작한다.
> 이 문서는 (1) 프로젝트의 정체성·구조, (2) 확정된 의사결정, (3) 사용자의 명령 의도 기록을
> 담는 **단일 컨텍스트/메모리**다. 이미 합의된 내용은 다시 설명하지 말고 바로 반영한다.
> 의미 있는 변경/새 지시가 생기면 아래 **명령 기록 로그**에 한 줄로 append 한다.

---

## 1. 목적
지역(시/구/동)을 검색하거나 지도를 클릭하면, 그 위치 기준으로 가까운 스카우트 단위대를
**거리순**으로 지도·목록에 보여주는 정적 웹앱. GPS 미사용 — 검색·지도 클릭으로 위치 지정.

## 2. 스택 / 제약 (반드시 준수)
- **Vanilla HTML/CSS/JS만.** 프레임워크·번들러·빌드 단계 도입 금지.
- 지도: **Leaflet 1.9.4** (cdnjs), 타일: **OpenStreetMap**.
- 클라이언트 단독 동작 — 외부 API 키·지오코딩 호출 금지. *(단, 영구저장/IP/댓글 등 §10
  백엔드 항목은 Cloudflare Pages Functions 도입을 전제로 별도 합의 후 진행)*
- UI 텍스트 **한국어**, 식별자/코드 **영어**.
- 디자인: 깔끔한 '필드 가이드/지도' 무드. generic AI 톤·보라 그라데이션 남발 금지.

## 3. 파일 구조
```
index.html        헤더+검색+2단(목록/지도)+푸터(데이터 다운로드·관리자 링크)
styles.css        브랜드 팔레트 + Wanted Sans(7단계) 테마 (공개+관리자 공용)
app.js            검색·centroid anchor·haversine 정렬·지도클릭 재정렬·핀색·범례·다운로드
manage.html       관리자 페이지 (단위대 CRUD + 좌표 지정)
manage.js         관리자 로직 (localStorage 편집본 + data.js 다운로드/JSON 가져오기)
data.js           SCOUT_UNITS + SCOUT_NSOS(176) + SCOUT_REGION_COLORS (← 데이터 교체 지점)
functions/api/*   백엔드 (units/submissions/comments/image/log + _lib)
version-watch.js  /VERSION 폴링 → 새 배포 시 우측 상단 새로고침 알림
VERSION           사이트 버전 (의미 있는 변경마다 bump)
README.md         실행·교체·배포 안내
KMS.md            ★ 모든 데이터·사양·API·운영 통합 문서 (단일 소스)
DESIGN.md         디자인 가이드 (토큰·폰트·컴포넌트)
```
> **모든 데이터·사양은 [KMS.md](KMS.md)에 통합.** 작업 전 KMS.md + 이 문서 함께 확인.

## 4. 조직 구조 (글로벌 표준 — WOSM)
```
WOSM Region → 국가(NSO) → 단위대
예) Asia-Pacific → Korea Scout Association → Yeongtong Scout Unit
```
- **지방연맹/지구연합회 개념 제거.** 국가(NSO)를 WOSM 공식 목록에서 선택.
- **단위대 종류**: `type` = "지역대" | "학교대" (표시: Community/School unit).
- **국가/NSO 목록**: `window.SCOUT_NSOS` (176개국: country EN/KO · nso · region · lang). 추후 전세계로 확장.
- **WOSM 5개 지역 색**: `window.SCOUT_REGION_COLORS` (Asia-Pacific/European/Arab/Africa/Interamerican). **핀 색 = 지역색.**
- 데이터 스키마: `{ id, name, type, country, country_ko, nso, region, lang, address(EN), lat, lng, sections[], meetingDay, contact, instagram, note }`
  - `country` 미지정 시 코드에서 "Republic of Korea" 기본. 좌표는 관리자에서 **OSM(Nominatim) 검색**으로 등록.

## 5. 디자인 시스템
- **브랜드 컬러(첨부 Color values)** 가 테마 기본. CSS `:root` 토큰:
  Scouting Purple `#622599`(=`--accent`), Midnight Purple `#4D006E`(=`--accent-ink`),
  Canvas White, Blossom Pink `#FF8DFF`, Fire Red `#FF5655`, Ember Orange `#FFAE80`,
  Ocean Blue `#0094B4`, River Blue `#82E6DE`, Forest Green `#248737`, Leaf Green `#9FED8F`.
  배경은 옅은 라벤더 캔버스(`--bg #f6f3fa`), 본문 ink `#221b2b`.
- **폰트: Wanted Sans Variable** (`@import` cdn.jsdelivr). **weight 7단계** `--fw-1..7`
  = 300/400/500/600/700/800/900 을 위계에 맞게 사용.

## 6. 핵심 동작 규약
- 검색어 → 일치 유닛(name/type/federation/council/address) centroid 를 anchor 로.
- haversine 거리 **오름차순** 정렬, 목록·핀 갱신. 지도 클릭 시 그 좌표로 재정렬.
- anchor + 가까운 5개에 `fitBounds`. 거리 표기 **km, 소수 1자리**.
- 핀 색 = 연맹색, 핀 번호는 거리 순위(흑/백 글자 자동 대비). 기준점 핀은 다크 plum 별도.
- 결과 없음 → 안내 + "전체 보기".  **순서(배치) 개념 없음** — 관리자에 수동 정렬 UI 두지 않음.
- 모바일(≤820px): 헤더 **목록/지도 토글**로 단일 패널 전환(`body.view-list/view-map`).
- 새 버전 감지 시 우측 상단 "새로운 버전이 올라왔습니다 / 새로고침하세요" 알림.
- 키보드 접근성·aria 기본 처리, **콘솔 에러 0**. `data.js`만 교체하면 동작(로직/데이터 분리).

## 7. 관리자 (manage.html) — 현재
- 백엔드·로그인 없음 → **localStorage 로컬 편집 도구**. 추가/수정/삭제 + 좌표 지정(드래그/클릭).
- 편집본 `localStorage["scoutfinder:units"]` 저장 → 공개 사이트가 "편집본 미리보기"로 사용.
- 실제 반영: `data.js 다운로드` → 저장소 `data.js` 교체 → 커밋·배포.

## 8. 운영 규칙
- **자동 commit + push + 배포**: 검증 통과 즉시 git commit + push +
  `wrangler pages deploy . --project-name jimmyport --branch main`. 별도 지시 없어도 진행.
- 로컬 dev server 띄우지 말 것. 의미 있는 변경마다 `VERSION` bump.
- 배포 대상 Cloudflare Pages 프로젝트 `jimmyport` (도메인 jimmypark.net, CNAME 유지).
  `/manage.html` 은 clean-URL 로 `/manage` 308 리다이렉트(정상).

---

## 9. 명령 기록 로그 (Command Intent Log)
> 사용자의 지시·의도를 시간 순으로 누적. 같은 작업을 다시 설명하지 않기 위한 기준.

- 이전 jimmypark.net 개인 아카이브 → **전면 백지화**(데이터/파일), 새 프로젝트로 전환.
- **scout-finder** 신규: "내 주변 스카우트 지역대 찾기" 정적 웹앱 (위 §1~6 사양 확정).
- 샘플 데이터는 실지명·실좌표 기반, 명시 지역 전부 포함(현재 16곳). 기존 jimmypark 파일 삭제 정리.
- **관리자 페이지** 추가 — 정보 추가/수정 가능하게.
- 한국스카우트연맹 **조직 구조** 반영: 단위대(학교대/지역대)→지구연합회→지방특수연맹(22). 예) 비파지역대-목포지구연합회-전남연맹.
- 연맹/단위대/지구연합회 데이터 최신화 + **홈페이지에서 데이터 다운로드** 가능하게.
- 새 버전 올라오면 **우측 상단 새로고침 알림**.
- 전반적 **모바일·웹 친화 UI/UX**.
- **지역대 순서 배치 삭제** (순서는 중요치 않음 → 관리자 정렬 UI 제거).
- **22개 연맹을 색으로 핀 구분**, 연맹 간 색 절대 중복 금지.
- 첨부 **브랜드 컬러를 테마 기본**으로, 첨부 **Wanted Sans 폰트 + 7단계 weight** 활용.
- (요청) 이 CLAUDE.md 를 **명령 기록·컨텍스트 메모리**로 만들고, 명령 시 **항상 먼저 확인**하게 세팅.
- **누구나 단위대 추가** 가능(→ 승인 대기), **삭제는 관리자 승인**(공개 삭제 없음). 관리자 페이지에서 승인.
- 표시 항목 확정: ① 단위대 이름 + 지역대/학교대 ② **한국스카우트연맹 > 지방연맹 > 지구연합회** ③ 주요 활동 ④ 모집 카테고리(비버/컵/스카우트/벤처/로버) ⑤ **연락방법(없으면 "지방연맹 문의" 디폴트)**.
- 연락처에 **인스타그램 링크**도 가능.
- 대상 확장: 한국뿐 아니라 **전세계 172개국 스카우트**, **최초엔 아시아-태평양(APR) 중심**.
- 홈페이지 **국문/영문 2버전**, **영어를 기본**(외국인 친구 우선 대상).
- 댓글: **레딧식 쓰레드(대댓글) + 닉네임 + GDPR 준용**(동의 필수, 공개 IP 마스킹, 관리자 삭제=잊혀질 권리).
- **글로벌 표준 전환**: 지방연맹/지구연합회 제거 → **국가·NSO 선택(WOSM 176개 공식 목록)**. 영문 단위대명·영문 주소. 좌표는 **OSM(Nominatim) 검색**. 핀 색 = **WOSM 지역(Region)**. 모든 것 영문 기준.
- 데이터는 **Cloudflare 서버(KV)에 저장**. 공개/관리자 모두 `/api/units`에서 로드.
- 관리자 편집은 **자동으로 서버 반영**(별도 저장 버튼 X, 비밀번호 1회 입력 후 debounce auto-save).
- 좌표는 "검색"이 아니라 **지도를 주소로 검색**(map flyTo) 후 클릭/드래그로 핀 지정. **주소·모임요일 필드 삭제**, **ID 자동 배정**. 연락처 → **Homepage (Instagram)** URL.
- **전부 영어**: 공개·관리자 모든 메뉴 한국어 제거. type/sections 데이터도 영문(Community/School unit, Beaver/Cub/Scout/Venture/Rover).
- **`/jamboree` 신규 — 한국잼버리 카드뉴스 제작기**(별개 미니앱): 25MB React 디자인 시안 번들을 포팅, 폰트 CDN 슬림화(25MB→~1.2MB). 6 패밀리 선택→프리뷰→PNG 다운로드→KV 저장. 홈에 링크 없음. React는 이 페이지에만 격리(본 앱 vanilla 유지). 상세 §15.
- 저장소: **KV namespace `SCOUT_KV`** (id `5b8071435ace47f9a8eccb8ade1b946e`), `wrangler.toml`로 바인딩.
- 관리자 인증: **Pages secret `ADMIN_TOKEN`** (값은 repo에 두지 않음). 요청 헤더 `X-Admin-Token`로 검증.
- IP: `CF-Connecting-IP` 헤더로 취득. KV 키: `units` / `pending` / `comments` / `log`.
- 배포: `functions/`는 `wrangler pages deploy . --project-name jimmyport`로 자동 포함.
  ⚠️ 커밋 메시지는 **ASCII 권장**(한글 메시지로 deploy 시 "Invalid commit message" 발생) — `--commit-message`에 영문 사용.

### API
- `GET /api/units` 공개: `{units, updatedAt}` (KV 비면 `units:null` → 클라가 data.js 폴백).
- `PUT /api/units` 관리자: 전체 저장 + updatedAt + 로그.
- `POST /api/submissions` 누구나: 단위대 추가 제안(승인 대기 + IP). `GET`(관리자) 목록. `PATCH`(관리자) `{id,action:approve|reject}`.
- `GET/POST/DELETE /api/comments`: 작성 `{name,body,parentId?,consent:true}` (GDPR 동의 필수). 공개 IP 마스킹, 관리자 원본. DELETE(관리자)는 댓글+대댓글 제거.
- `GET /api/log` 관리자: 변경 로그(수정일시·동작·IP).

## 11. 글로벌 모델 (BUILT — WOSM 국가/NSO)
- 위계: **WOSM Region → 국가(NSO) → 단위대**. 지방연맹/지구연합회 제거.
- `data.js`: `window.SCOUT_NSOS`(176개국 country EN/KO·nso·region·lang) + `window.SCOUT_REGION_COLORS`(5지역색).
- 핀/범례 색 = **WOSM 지역(Region)**. (`colorOf` = `REGION_COLORS[u.region]`)
- 영문 단위대명·영문 주소. 좌표는 관리자 **OSM(Nominatim) 검색** 또는 마커 드래그/지도클릭.
- 디자인은 [DESIGN.md](DESIGN.md) 준용 (브랜드 토큰 + Wanted Sans 7단계 + 간격/반경 스케일).

## 12. 프런트엔드 i18n + 표시 + 서버 (BUILT)
- **홈페이지 영어 전용**(`<html lang="en">`, 토글 없음). 관리자(manage.html)는 내부용 한국어.
- 공개/관리자 모두 **`/api/units`(Cloudflare KV)에서 로드**, 실패 시 data.js 폴백.
- 관리자 **"서버에 저장"** → `PUT /api/units`(비밀번호) → KV 반영 → 전 방문자 적용. 로컬 드래프트 병행.
- 카드/팝업: 이름+종류 · **국가 + 지역(Region) 태그** · NSO · 주소 · 주요활동 · 모집 카테고리 · 모임요일 + 연락방법(없으면 "Contact the national scout organization") + 인스타그램.

## 13. 댓글 UI (BUILT)
- **단위대 클릭(카드/팝업 💬) → 그 단위대 댓글 모달**(레딧식). `unitId`로 스코프.
- 쓰레드(대댓글 parentId 중첩), 닉네임(localStorage 기억), **GDPR 동의 체크박스 필수**, 공개 IP 마스킹 표시.

## 14. 진행 예정 (다음 빌드)
- 공개 **단위대 추가 제안 폼** → `/api/submissions`(누구나 추가→승인 대기).
- 관리자 **승인 대기/승인·거절 + 변경 로그(/api/log) + 댓글 관리(IP·삭제) 뷰**.

## 15. /jamboree — 한국잼버리 카드뉴스 제작기 (BUILT, Phase 1+2)
- **정체**: 제16회 한국잼버리(2026.8.5–8.9, 강원) 카드뉴스 제작·편집·PNG출력·KV저장 미니앱.
  scout-finder 본 앱과 **격리된 React 페이지**(본 앱 vanilla 규칙 불변). clean-URL `jamboree.html`→`/jamboree`(`/manage`와 동일, 홈 링크 없음).
- **출처**: `한국잼버리 카드뉴스 (포팅용)` 25MB React 번들(디자인 시안)에서 카드 컴포넌트만 추출.
  원본은 repo 밖(`../한국잼버리 카드뉴스 (포팅용 원본).html`)으로 이동(배포 제외). 폰트 CDN 슬림화로 25MB→~1.2MB.
- **파일**: `jamboree.html`(React18+Babel standalone+html-to-image CDN, Pretendard CDN, 브랜드폰트 자체호스트) ·
  `jamboree/{shapes.js,store.js,base.jsx,shapes-comp.jsx,lib.jsx,cover.jsx,templates.jsx,news.jsx,dday.jsx,app.jsx}` ·
  `jamboree/fonts/`(Cafe24ProSlim·Aggravo) · `jamboree/assets/logo.svg`(★플레이스홀더 — 실제 엠블럼 교체 필요).
  스크립트 로드 순서가 의존성(각 파일 `Object.assign(window,…)`로 공유); `app.jsx` 마지막.
  ⚠️ **모든 .jsx는 IIFE 래핑 필수** — Babel standalone은 스크립트를 전역 공유 스코프에서 실행하므로 톱레벨 `const`(예: `const P`)가 파일 간 충돌("already been declared" → 부팅 멈춤). 새 모듈 추가 시 `(function () { … })();`로 감쌀 것.
- **6 패밀리**: 표지(SEC_COVER 5)·콘텐츠(SEC_TEMPLATES 12)·소식형(SEC_NEWS 3, 1080×1350)·D피드(SEC_DDAY 8)·D스토리(_TALL 1080×1920)·D가로(_WIDE 1480×1047). 핀/도형색 = WOSM 팔레트(PAL, 본 앱과 동일 `#622599`계열).
- **편집**: 모든 패밀리 `Editable` 더블클릭 인라인편집(→`localStorage['cc-edit:'+ekey]`). 전역 브랜드(행사명/날짜/장소/주최/개영문구)는 우측 폼 → `GContentCtx`.
- **PNG**: `html-to-image` 네이티브 해상도 캡처(`document.fonts.ready` 후). **저장/불러오기**: `/api/jamboree`(GET 공개·PUT 관리자, `_lib.js` 재사용, KV 키 `jamboree`). 상태=`{text,props,images,brand}`(Phase 1 `editKeys` 호환). 토큰 1회 입력 후 `localStorage['jamboree:token']`.

### 15.1 Phase 2 (BUILT, v0.9.1)
- **편집 스토어** `jamboree/store.js`(plain JS, shapes.js 다음 로드) = `window.CCStore`: 텍스트(`cc-edit:`)·구조오버라이드(`cc-prop:<scope>` JSON)·이미지(`cc-img:<slot>` dataURL) + collect/hydrate(KV) + 구독 emit + `idealInk()`(배경 대비 잉크).
- **자동 폼**: `Editable`/`Placeholder`가 `CCRegisterFieldCtx`/`CCRegisterPhotoCtx`로 우측 패널에 자기 자신 등록 → **카드별 텍스트 폼·사진 목록 자동 생성**(카드 스키마 수기 X). 폼↔인라인 양방향(스토어 공유).
- **표지/D-day 폼편집**: 표지=에이브로우/제목 2행/부제/카테고리(Editable)+배경색·카테고리색 스와치. D-day=티저(Editable)+**D숫자(구조필드 → 진행바·키커 자동 재계산)**+배경색 스와치. 색 오버라이드 시 `idealInk` 자동 대비.
- **사진 업로드**: `Placeholder` slot화(표지·소식형·콘텐츠 전부) → 업로드 이미지로 교체. 업로드 시 다운스케일(사진 1600px JPEG / 엠블럼 1024px PNG).
- **엠블럼**: `Logo`가 `cc-img:logo` 업로드본 우선(플레이스홀더 SVG 폴백). 우측 '엠블럼' 업로드로 실제 엠블럼 교체.
- **덱 일괄 export**: 오프스크린 네이티브 렌더(별도 ReactDOM root) → 패밀리 전체 PNG 순차 다운로드("덱 PNG (n)").
- 검증: 벤더 Babel 전 모듈 컴파일체크 + 헤드리스 Chrome 오프스크린 렌더(표지·D-day override·사진·뉴스 정상). 원본 25MB 포팅 파일 `.gitignore` 처리.

### 15.2 Phase 3 (BUILT, v0.9.3) — 카드뉴스 한 편 빌더
- **덱 빌더**: 좌측 "카드뉴스 구성" — 표지→본문→엔딩 순서로 카드 담기/순서변경(↑↓)/빼기/클릭 시 해당 카드 편집. 덱은 `cc-prop:_deck`(스토어)에 저장 → **서버 저장에 자동 포함**.
- **ZIP 일괄**: 상단 "카드뉴스 ZIP (n)" — 덱 순서대로 오프스크린 네이티브 렌더 → JSZip(CDN 3.10.1)으로 `01_..png` 순번 묶음 다운로드. (패밀리 일괄 "덱 PNG"는 ZIP으로 대체)
- **엔딩 카드**: 콘텐츠 '13 · 엔딩형'(T_Outro) 신설 — 아웃트로 2행+한마디, 브랜드 푸터.
- **트윅**(`cc-prop:_tweaks`, 서버 저장 포함): 본문 글자색(ink)·본문 폰트·하이라이트 폰트(CSS 변수 `--cc-ink/--cc-main/--cc-hi`) + D-day 여백 슬라이더 5종(top/bot/gap/line/numScale → `DDayTweakCtx`).
- **정렬 오버라이드**: 표지(제목 블록)·D-day(NumStack)·소식형(헤드라인) `align`(left/center/right) — 우측 "텍스트 정렬" 세그먼트.
- **D숫자**: 모든 D-day 프리셋(50~1)에서 우측 "D-숫자" 필드로 자유 수정(진행바·키커 자동 재계산). 더블클릭 인라인 편집은 텍스트 전용(숫자는 폼).
- **겹침 감사**: puppeteer-core(벤더, /tmp) 실상호작용 테스트(더블클릭 편집·D숫자·덱·트윅 전부 패스) + 46종 전수 스크린샷 감사 → 표지 영외·식사 도형/부제 겹침, D-피드 D-DAY 로고/글자 터치, 빅넘버형(300px→230px) 수정. **디자인 변경 시 전수 스크린샷 감사 재실행할 것.**

### 15.3 Phase 4 (BUILT, v0.9.4) — 자간·글자크기·여백 트윅 + 한 편 결합
- **자간**: 트윅 `track`(em) → `--cc-track`, `Card`에 `letterSpacing: var(--cc-track, normal)` cascade(본문/제목 텍스트). kicker/번호 등 자체 letterSpacing은 유지.
- **글자크기 일괄(내용 기준)**: 트윅 `fz` → `--cc-fz`. `Editable`의 숫자 fontSize를 `calc(px * var(--cc-fz,1))`로 변환 → 모든 '내용' 텍스트만 일괄 스케일(라벨·D번호 제외; D번호는 numScale).
- **전체 여백 일괄**: 트윅 `margin`(px) → `Framed` 래퍼가 카드 콘텐츠를 균일 축소(흰 테두리). 미리보기/PNG/ZIP/한편 모두 공용. 기본 0(무변화).
- **한 편 PNG(카드뉴스 결합)**: 덱 모듈을 세로로 이어붙인 **단일 PNG**(`jamboree_cardnews_full.png`). 오프스크린 네이티브 렌더 → html-to-image → canvas로 targetW(=덱 최대폭) 정규화·세로 누적. 툴바: ZIP / 한 편 PNG / 이 카드 PNG.
- **D-피드 배경 강화**: `ddScatter`에 `fmt='feed'` 분기 — 우측 컬럼·하단(y780~1050) 도형 4종+좌하단 1종 추가(숫자/티저/푸터/진행바 회피). story/wide는 기존 유지.
- 트윅 4종(ink·track·fz·margin)·정렬·D번호·덱 전부 `cc-prop:_tweaks/_deck`로 서버 저장 포함. 검증: 실상호작용(트윅 CSS var·덱 2장·한편 1080×2160 다운로드 OK) + 전수 감사 무겹침.

### 15.4 Phase 5 (BUILT, v0.9.6) — 흰 엠블럼 자동 전환 + 도형 풍성하게
- **흰색 엠블럼**: 어두운 배경=흰색, 밝은 배경=컬러 엠블럼 자동 선택. `Card`가 배경색을 `window.CCCardBgCtx`로 제공 → `Logo`가 `store.idealInk(bg)==='#fff'`면 흰색 사용. 기본 에셋 `jamboree/assets/logo-white.png`(흰)·`logo.png`(컬러). 업로드 슬롯 2개: `logo`(밝은용)·`logo-white`(어두운용), 우측 '엠블럼' 패널. 헤더 툴바 로고도 흰색(다크 헤더).
- **도형 풍성하게**(WOSM 오브젝트 적극 활용): `richScatter`(shapes-comp.jsx) — 시드 결정론적(PNG 캡처 안정), `avoid`(텍스트/숫자/로고 바운딩박스)를 피해 빈 공간을 도형으로 가득 채움 + 코너 블리더. 적용: 표지5(공유 레이아웃 자동생성, 수기 scatter 제거)·D-day 3포맷 전부(`ddScatter`→포맷 실제 크기 기반 재작성, feed가 1080×1080 아닌 1080×1350임을 반영)·콘텐츠 09포스터/13엔딩/08빅넘버·소식C. 흰 텍스트 카드(01·02·03)는 가독성 위해 코너 액센트만(count 4~5). 이미지/그리드 카드(04~07,10~12)는 의도적으로 클린 유지.
- 검증: 헤드리스 Chrome(내장 WebSocket+CDP) 전 패밀리 스크린샷 — 콘솔 에러 0, 어두운 배경 흰 엠블럼/밝은(핑크) 컬러 엠블럼 확인, 텍스트·로고 무겹침.

### 15.5 Phase 6 (BUILT, v0.9.7) — 정방형→카드뉴스 1080×1350 + 도형 형상화(캠핑/자연물)
- **기본 크기 변경**: 표지·콘텐츠 정방형(1080×1080) → **카드뉴스 1080×1350**(인스타 4:5, 소식형·D-피드와 동일). 카드 내부는 상/하단 앵커라 대부분 자동 적응. 타임라인(12)만 상단 쏠림 → 세로 중앙(top 360→520)으로 조정.
- **무작위 스캐터 → 형상화 모티프**: 사용자 피드백("도형 더미가 난잡, 자연물/캠핑용품으로 형상화"). `MOTIF`(shapes-comp.jsx): `tree`(삼각형09 3단 소나무)·`mountain`(09)·`tent`(오두막08+입구09)·`campfire`(장작07+불꽃09)·`sun`(원04)·`cloud`(반원10×3)·`hills`(반원10). 각 함수 (cx,by=바닥선,s,색) → 절대좌표 items. `window.scene(...)`로 합침. **표지는 사용자 승인대로 랜덤 richScatter 유지**(1350용 avoid 갱신).
- **적용**: D-day 3포맷 전부(feed/story/wide)+isDay → 캠프 풍경(우측 컬럼 또는 상하 띠). 콘텐츠 09포스터·13엔딩·08빅넘버 → 캠프 풍경. 소식C → 상단 해/구름+하단 풍경. 흰 텍스트 01소개·03인용 → 빈 공간에 작은 비네트(나무+텐트+언덕), 02FAQ는 본문 가득 차 생략. 도형 형상화 = 09삼각형/08오두막/10반원/07사다리꼴/04원/06불꽃 활용.
- 검증: 헤드리스 전 카드 스크린샷 — 콘솔 에러 0, 캠프 풍경 명확·텍스트/숫자/로고 무겹침, 1350 레이아웃 정상.

### 15.6 Phase 7 (BUILT, v0.9.8) — 표지도 형상화 + 가방 모티프 + 모닥불 색 보정
- 사용자 추가 피드백: "표지 랜덤 스캐터가 더 난잡. 오브젝트를 줄이더라도 도형들이 **하나의 인식 가능한 사물**(캠프파이어/캠핑/가방/산)을 이루게." → **표지도 랜덤 richScatter 제거, 캠핑 풍경 모티프로 교체**(산·나무·텐트·모닥불·가방+해). 표지 5종 공유.
- **가방(backpack) 모티프 추가**: 손잡이(반원 아웃라인)+몸통(02 다이아 45°회전=정사각)+뚜껑(07)+앞주머니(반원10).
- **모닥불 색 배경 대비**: `MOTIF.campfire(cx,by,s,cols)` — cols 주면 불꽃을 대비색으로(빨강/주황 배경에서 빨강 불꽃이 묻히던 문제 해결). D-day 전 포맷·빅넘버(빨강)에 cols 전달.
- ⚠️ **운영**: 별도 지시 없어도 변경 즉시 commit+push+deploy (사용자 재확인, §8).

### 15.7 Phase 8 (BUILT, v0.9.9)
- **D-피드 우측 그래픽 17종 베리에이션**: `FEED_GFX`(dday.jsx) — 캠프사이트/숲/산맥/밤캠프/장비/그룹캠프/호숫가/해+초원/큰소나무/산+가방/모닥불중심/텐트+새/언덕겹층/산+나무+구름/풀장비/미니멀/해+구름+나무. 우측 패널 "오른쪽 그래픽" select(`cc-prop:<feedScope>.gfx`, 기본=카드index%17). feed non-isDay만. `ddScatter(...,gfx)`.
- **엠블럼 크기·위치 트윅**: `_tweaks.logoScale/logoDX/logoDY` → CSS 변수 `--cc-logo-scale/dx/dy`. `Logo`가 span(위치)+img(transform scale+translate)로 분리 적용 → 전 카드 엠블럼 일괄. 우측 '엠블럼' 섹션 슬라이더 3종.
- **에이브로 기본**: 표지 메인 "2026 · KOREA NATIONAL JAMBOREE".
- **D-DAY 당일 배경 흰색**(`#ffffff`, num=purple) — 밝은 배경이라 컬러 엠블럼 자동.

### 15.8 Phase 9 (BUILT, v0.9.10)
- **서버 저장 카드뉴스 목록**: `functions/api/jamboree.js` 확장 — 작업 슬롯(KEY=jamboree, GET/PUT 기존)은 그대로 + 이름 있는 다중 저장(index `jamboree:index`=[{id,name,updatedAt}], item `jamboree:item:<id>`). `GET ?list=1` 목록, `GET ?id=` 개별, `POST {name,state}` 새 저장(관리자), `DELETE ?id=` 삭제(관리자). 툴바 "목록" 버튼 → 모달(목록·불러오기·삭제·"현재를 새 카드뉴스로 저장"). 기존 "서버 저장/불러오기"는 "작업 저장/작업 불러오기"로 라벨 변경(작업 슬롯).
- **전체 여백 트윅(배경색 유지)**: 흰 테두리(Framed) 제거 → `Card`가 콘텐츠를 `transform: scale(var(--cc-content-scale))`로 안쪽 축소, **배경색은 가장자리까지 유지**. 트윅 `pad`(0~16%) → `--cc-content-scale=1-pad`. 미리보기/PNG/ZIP/한편 공용(전역 CSS 변수). (기존 px margin·Framed·mScale 제거)
- **D넘버 줄간격**: NumStack "D-" lineHeight .84 / 숫자 .9 로 기본 간격 조정(겹침 없이 타이트). `lineAdj` 트윅 병행.

### 15.9 v0.9.11
- **단색 화이트 엠블럼 교체**: `jamboree/assets/logo-white.png`를 새 단색(knot 마크) 버전으로 교체. 로고 크기 조절은 기존 '엠블럼 크기' 슬라이더(`logoScale`)로 이미 제공.

### 15.10 v0.9.12
- **D-피드 배경 로고 워터마크**: `DDaySquare`(feed)에 잼버리 매듭 로고(`logo-white` 업로드 우선)를 중앙 대형(1240px) 옅은 워터마크로 깔음(도형보다 뒤). 어두운 배경=흰색(opacity .09) / 밝은 배경=`invert`(opacity .07)로 자동 대비.

### 15.11 v0.9.13
- **새 에셋 `jamboree/assets/logo-asset.png`**(굵은 매듭 마크) — D-피드 배경 워터마크를 이 에셋으로 교체(기존 흐릿한 중앙 stamp → 좌측 풀블리드 앵커, base 1560px). 어두운=흰(.13)/밝은=invert(.1).
- **워터마크 트윅**: `_tweaks.wmScale/wmDX/wmDY/wmOpacity` → CSS 변수 `--cc-wm-scale/dx/dy/opacity`(opacity는 `calc(base * var)`). 우측 '트윅 > D-피드 배경 매듭(에셋)' 슬라이더 4종.
- **전체 자동 저장**: store(텍스트/도형/사진/트윅/덱)+brand 변경을 1.6s 디바운스로 작업 슬롯(`PUT /api/jamboree`)에 자동 저장. **토큰 1회 입력("작업 저장") 후 동작**(localStorage `jamboree:token`). 첫 마운트 emit 1회는 skip.

### 15.12 v0.9.14
- **워터마크 회전 추가** + 컨트롤 위치 이동: `wmRot`(`--cc-wm-rot`, transform에 rotate 추가). 워터마크 크기/좌우/상하/**회전**/투명도 슬라이더를 접힌 트윅에서 **D-피드 "이 카드 편집" 패널 상단('배경 오브제')으로 이동**(발견성↑, familyKey==='dday'에 노출).
- **D-숫자 1·2행 좌우 이동**: `_tweaks.dx1/dx2` → `NumStack`의 "D-"(1행)·숫자(2행) `translateX`. 편집 패널 'D-숫자 줄 위치' 슬라이더 2종.

### 15.14 v0.9.16–0.9.17
- **모달 통합 저장/불러오기(v0.9.16)**: window.prompt 제거 → 모달에 관리자 토큰 입력칸 + 현재 작업 저장(PUT)/새로 저장(POST)/최근 작업 불러오기/목록 불러오기·삭제 + 인라인 상태. 토큰=React state(localStorage). 툴바는 "💾 저장·불러오기" 단일 버튼.
- **하단 덱 슬라이드(v0.9.17)**: 카드뉴스 구성을 좌측→하단 가로 슬라이드 바로 이동. 칩별 순서(◀▶)·✕삭제·클릭편집, "+ 현재 카드 담기".
- **콘솔 정리(v0.9.17)**: jamboree.html에서 Babel in-browser advisory 경고만 console.warn 필터로 억제. (라이브 스윕 결과 에러·네트워크 실패 0, Babel 경고만 있었음)



### 15.16 v0.9.19 — 덱 썸네일 미리보기 + 새로 만들기 + 즉시 삭제
- **하단 덱 칩 = 실제 카드 썸네일**: 각 칩에 `r.card.node`를 `transform: scale(116/famW)`로 축소 렌더(DDayTweakCtx+GContentCtx 래핑, pointerEvents:none). 순번 배지·✕삭제 오버레이·◀▶ 순서·패밀리 라벨.
- **새로 만들기**: `CCStore.clearAll()`(cc-edit/cc-prop/cc-img 전체 삭제)+brand 리셋+currentId 해제. 상단 툴바 "+ 새로 만들기" & 모달 "+ 새로 만들기"(confirm).
- **삭제 즉시 반영**: 모달 목록에서 삭제 시 `savedItems` 즉시 필터(KV 최종 일관성 지연 보완).

### 15.15 v0.9.18 — 작성자 이름 기반 저장 + 컬러 엠블럼 교체
- **토큰 제거 → 작성자 이름**: `functions/api/jamboree.js` PUT/POST/DELETE에서 `isAdmin` 제거. POST/PUT body에 `author` 저장(index에 `author` 포함). PUT은 `id` 있으면 해당 항목 갱신, 없으면 작업 슬롯.
- 프런트: `token`→`author`(localStorage `jamboree:author`). 불러온/저장한 항목 `currentId` 추적 → **자동 저장이 그 항목을 갱신**(작성자 이름 있을 때). 모달: 작성자 이름 입력 + "저장(덮어쓰기)"/"새 사본"/"+ 새 카드뉴스" + 목록(작성자·날짜 표시·현재 항목 강조).
- **밝은 배경용 컬러 엠블럼 교체**: `jamboree/assets/logo.png` 공식 풀컬러 엠블럼(매듭+텍스트링+태극+스카우트)로 교체.

### 15.13 v0.9.15
- **키커 문구 편집**: D-day `useDDeff`에 `ov.kicker` 오버라이드(비우면 자동 'COUNTDOWN · N일 전'/isDay 기본). 편집 패널 '키커 문구(상단)' 입력(ddScope, 자동 placeholder). 카드별 저장.
- **텍스트 줄바꿈 지원**: `Editable` — 인라인 편집 시 Enter로 줄바꿈(커밋=blur/Escape), 저장은 `innerText`(줄바꿈 보존), 렌더 `white-space: pre-wrap`. 폼(`FieldInput`)은 def>14자 또는 값에 `\n` 있으면 textarea(줄바꿈 가능 안내). 티저 등 전체 텍스트 적용.

---

## 16. /jamboree-plan — 미디어부 SNS 운영 캘린더 (BUILT, v0.9.20)
- **정체**: 제16회 한국잼버리(2026.8.5–8.9) **미디어부 SNS 운영/콘텐츠 계획 보드**. clean-URL `jamboree-plan.html`→`/jamboree-plan`(`/jamboree`·`/manage`와 동일, 홈 링크 없음, noindex). **vanilla HTML/CSS/JS**(본 앱 규칙 준수, React 아님). 사용자가 준 깨진(mojibake) 참조 HTML을 정상 인코딩으로 재구축 + 4·5번 기능 추가.
- **핵심 5요소**: ① SNS 운영 캘린더(일요일 시작) ② **D-Count 일정**(D-40 시작: 해외 대표단 D-40~24 → 서브캠프 이야기 D-23~17 → 신청자 D-16~5 → 피날레 D-4~D-day) ③ 콘텐츠 계획(주요 소식 월·수·금 + 이벤트 7/6·7/26·8/5) ④ **날짜/제목 클릭 → 콘텐츠 제목 + 링크(URL) + 업로드 이미지** 등록 ⑤ 스카우트 연간 마케팅 캘린더(편집형 표).
- **스케줄은 규칙으로 결정론 생성**(`buildDays`): 기간 2026-06-15~08-09, EVENT_DAY=2026-08-05. `dday`로 phase/항목 자동. `today`/D-count는 실제 `new Date()` 기준(살아있는 카운트다운). 검증: node로 reference와 동일 확인(56일·소식 16일 월수금·이벤트 3·피날레 시드 일치) + 헤드리스 Chrome 렌더(콘솔 에러 0, 모달 동작).
- **편집 오버레이 모델**(구조 미저장, 결정론 재생성 위): `state={edits:{"<date>#<type>":{title,link,images:[url],status,memo}}, extra:{<date>:[{id,...}]}, marketing:[...], header}`. `peek()`=읽기전용, `getEdit()`=편집(persist), `prune()`=기본값 제거 후 저장.
- **저장**: 단일 공유 보드 `functions/api/jamboree-plan.js`(KV 키 `jamboree-plan`, 작성자 이름 기반·토큰 없음, GET/PUT). 프런트는 항상 localStorage 즉시저장 + 작성자 입력 시 1.5s 디바운스 서버 자동저장 + "서버 저장"/"불러오기" 버튼. 부팅 시 서버 보드 있으면 우선.
- **이미지**: 기존 `/api/image`(POST 바이트→`{url}`) 재사용. 업로드 시 canvas 다운스케일(최대 1600px JPEG 0.85) 후 URL만 state에 저장(경량). 모달 썸네일 그리드 + 라이트박스 확대 + 삭제.
- **마케팅 캘린더**: `defaultMarketing()` 시드 5행(세계 스카우트의 날 2/22, 새학기 모집 3월, 어린이날 5/5, 잼버리 개영 8/5, 가을 야영 10월) — contenteditable 표·행 추가/삭제, state.marketing에 저장.

### 16.1 v0.9.21 — UX 개편: 60행 빈 테이블 → 칸반 보드
- 사용자 피드백("UX 매우 불편") → 스크린샷 진단: 캘린더 아래 **60행짜리 빈 테이블**이 똑같은 "콘텐츠 입력…" 행만 끝없이 나열 + 모바일 캘린더 과밀. 사용자에게 메인 편집 구조 선택 받음 → **칸반 보드(상태별)** 채택.
- **칸반 보드**(`renderBoard`/`cardEl`, 기존 `renderTable`/`applyFilter` 제거): 기획/작성중/완료 3열. 카드 = 슬롯(D라벨·날짜·유형·카테고리·제목/미입력·🔗🖼📝 표시) + 카드 하단 **3분할 상태 토글**(현재 상태=상태색 강조, `STCOL`). 상태 클릭 시 즉시 열 이동. 상단 **진행률 바**(완료 n/60). 유형 필터(전체/D-count/소식/이벤트)는 보드 전체에 적용.
- **모달 단일 슬롯 모드**: `curDay`→`curView{mode:'day'|'slot'}`. 카드 클릭=`openSlot`(그 슬롯 1개만), 캘린더 날짜 클릭=`openDay`(그날 전체+슬롯 추가). `showModal`/`refreshModal` 통합(슬롯 삭제·이미지 변경 시 mode별 갱신).
- **모바일**: 보드 ≤760px 가로 스크롤(`flex` + scroll-snap, 칼럼 78vw). 캘린더 ≤680px 압축(카테고리 태그 숨김, 소식/이벤트 pill→점, 셀 min-height 58). `.modal` 풀폭.
- 검증: node 구문체크 + 헤드리스 Chrome(3열·60카드·상태이동 [60,0,0]→[59,0,1]·진행률·슬롯 모달·이벤트 필터 3개·모바일 가로스크롤, 콘솔 에러 0).

### 16.2 v0.9.22 — D-count 단계 재정의(한국→외국 17개국→피날레 담당자)
- 사용자 지시로 `phaseOf` 경계 변경: **한국 대표단 D-40~D-22**(국내 D-count 신청, 19일, 초록 c-sub) → **외국 대표단 D-21~D-5**(17개국, 17일, 파랑 c-intl) → **피날레 D-4~D-day**(빨강). 기존 해외/서브캠프/신청자 3단계 제거.
- **외국 17개국 = D-21~D-5 정확히 17일** → `foreignTitle(dd)` seedTitle `참가국 ①~⑰`(1일 1개국, 국가명으로 수정 전제). `CIRCLED` 원문자 배열.
- **피날레 = 그날 D-count 카드 드는 담당자(역할)**: D-4 국제 커미셔너 · D-3 야영장(캠프치프) · D-2 한국스카우트연맹 총재 · D-1 전체 운영요원 · D-DAY 개영식. (`finaleTitle` 교체)
- `CAT_COLOR`/`CAT_TINT`/범례 갱신. 소식(월·수·금)·이벤트(7/6·7/26·8/5)는 유지. 검증: node 로직(한국19·외국17(참가국①~⑰)·피날레 역할5) + 헤드리스 렌더 콘솔 에러 0, 캘린더 단계색·피날레 역할 표기 확인.
