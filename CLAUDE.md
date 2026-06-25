# scout-finder — Project Brief & Command Log (Claude는 작업 전 항상 먼저 읽을 것)

> **⛳️ 최우선 규칙**
> 사용자가 어떤 명령을 하든, **무조건 이 파일(CLAUDE.md)을 먼저 확인한 뒤** 작업을 시작한다.
> 이 문서는 (1) 프로젝트의 정체성·구조, (2) 확정된 의사결정, (3) 사용자의 명령 의도 기록을
> 담는 **단일 컨텍스트/메모리**다. 이미 합의된 내용은 다시 설명하지 말고 바로 반영한다.
> 의미 있는 변경/새 지시가 생기면 아래 **명령 기록 로그**에 한 줄로 append 한다.

---

## 1. 목적
지역(시/구/동)을 검색하거나 지도를 클릭하면, 그 위치 기준으로 가까운 스카우트 단위대를
**거리순**으로 지도·목록에 보여주는 정적 웹앱. **GPS 사용 가능**(브라우저 'Near me' 지오로케이션) + 검색·지도 클릭으로도 위치 지정. (이전 'GPS 미사용' 규칙은 v0.9.62에서 폐지)

## 2. 스택 / 제약 (반드시 준수)
- **Vanilla HTML/CSS/JS만.** 프레임워크·번들러·빌드 단계 도입 금지.
- 지도: **Leaflet 1.9.4** (cdnjs), 타일: **OpenStreetMap**.
- 클라이언트 단독 동작 — 외부 API 키·지오코딩 호출 금지. *(단, 영구저장/IP/댓글 등 §10
  백엔드 항목은 Cloudflare Pages Functions 도입을 전제로 별도 합의 후 진행)*
- UI 텍스트 **한국어**, 식별자/코드 **영어**.
- 디자인: 깔끔한 '필드 가이드/지도' 무드. generic AI 톤·보라 그라데이션 남발 금지.

## 3. 파일 구조 (라우팅 개편 v0.9.107 반영)
```
index.html           루트 = 도구 모음 랜딩 허브(noindex) → /tour·/krjam-* 카드 링크   [/]
tour/index.html      Scout Tour Assistant 공개 (지도·검색·거리정렬·댓글)              [/tour]
tour/admin.html      Tour 관리자 (TOTP 로그인, 단위대 CRUD + 좌표)                     [/tour/admin]
app.js, admin.js     공개·관리자 로직 (루트 위치, tour/* 는 절대경로 /app.js 로 참조)
styles.css           공개+관리자 공용 테마 (Bricolage + Hanken, 보라 #6336B5)
data.js              SCOUT_UNITS + SCOUT_NSOS(176) + SCOUT_REGION_COLORS (← 데이터 교체 지점)
krjam-cardnews.html  잼버리 카드뉴스 제작기(React) — 모듈은 jamboree/           [/krjam-cardnews] (구 /jamboree)
krjam-planning.html  잼버리 SNS 운영 캘린더(vanilla) — 모듈은 jamboree-plan/     [/krjam-planning]  (구 /jamboree-plan)
krjam-dcount.html    D-Count 자리(라우팅만 확보, 내용은 사용자가 작성)          [/krjam-dcount]
jamboree/ , jamboree-plan/   각 앱의 모듈·자산 폴더 (이름 유지)
functions/_middleware.js     내부파일(*.md·wrangler.toml·CNAME·package*.json·.claude 등) 404 차단
functions/api/*      백엔드 (units/submissions/comments/jamboree/jamboree-plan/jp-members/jp-news/login/image/file/log + _lib)
_redirects           구 경로(/jamboree·/jamboree-plan·/admin) → 신 경로 301
_headers             전 자산 no-cache(배포 즉시 반영)
version-watch.js     /VERSION 폴링 → 새 배포 시 우측 상단 새로고침 알림
VERSION              사이트 버전 (의미 있는 변경마다 bump)
KMS.md / FEATURES.md / README.md / DESIGN.md   내부 문서(웹 비공개 — _middleware 차단)
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
- 배포 대상 Cloudflare Pages 프로젝트 `jimmyport`. **도메인: `scoutingapp.net`(주력) + `jimmypark.net`(둘 다 Active, 동일 콘텐츠).** 둘 다 같은 프로젝트 커스텀 도메인. (사용자: jimmypark.net 노출돼도 무방 → 제거 안 함.)
- **라우팅(v0.9.107)**: `/`=랜딩 · `/tour`(+`/tour/admin`) · `/krjam-cardnews` · `/krjam-planning` · `/krjam-dcount`. 구 경로(`/jamboree`·`/jamboree-plan`·`/admin`)는 `_redirects` 301. `/tour` 는 디렉터리라 308→`/tour/`(정상).
- **공개 누수 차단**: `functions/_middleware.js` 가 `*.md`·`wrangler.toml`·`package*.json`·`.gitignore`·`CNAME`·`.claude/*` 를 404(`.assetsignore` 는 `wrangler pages deploy` 가 무시함). 내부 문서·설정은 웹에서 안 보임. GitHub 저장소는 공개(사용자: 무방).

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

### 15.17 v0.9.49 — 엠블럼 선택 + 가운데 오브제 10종 + 자동 푸터 + 5단계 절차형
- 사용자 4건(AskUserQuestion으로 디테일 확정): (1) **엠블럼을 저장된 것 중 선택** + 그 엠블럼을 **D-피드 워터마크에도** 반영, (2) 콘텐츠에 **표지 기준 자동 푸터(페이지번호+제목)**, (3) **가운데 오브제(캠프 풍경) 10종 선택**을 오브제 들어가는 모든 카드에, (4) **5단계 절차/방법형** 본문 타입 신설.
- **공유 컨텍스트**(`base.jsx`): `CCRegisterSceneCtx`(장면 폼 자동등록)·`CCFooterCtx`(자동 푸터 `{title,color,ink,page,total}`, null=끔) 추가.
- **장면 라이브러리**(`shapes-comp.jsx`): `SCENES` 10종(야영장·숲·산맥·바다·노을·밤 캠프·액티비티·장비·그룹 캠프·모닥불·산+호수·미니멀 자연) = MOTIF 조합 `build(x,y,s,c)`. `SceneScatter({scope,cx,by,s,cols,fallback})` — `cc-prop:<scope>.scene` 없으면 fallback(기존 디자인), 있으면 SCENES[idx]를 카드 앵커에 렌더. `CCRegisterSceneCtx`로 우측 패널에 자기 등록. `window.SCENE_LABELS`.
- **적용**(scatter 카드 fallback 보존): 표지 5(cx540·by800·s1.15)·콘텐츠 01소개/03인용/08빅넘버/09포스터/13엔딩·소식C. D-피드는 기존 17종 FEED_GFX 유지. 우측 패널 "가운데 오브제(캠프 풍경)" select(기본+10).
- **자동 푸터**(`lib.jsx` `AutoFooter`): 덱의 첫 표지 배경색 띠(64px) 좌=행사명(brand.brand)·우=`page/total`(덱 순서). 트윅 `footer`(기본 ON, 우측 패널 켜기/끄기 `Seg`). **표지·D-카운트 제외**, 본문 템플릿+소식(NewsFull/Card)에 `<AutoFooter/>` 장착(엔딩·NewsBand는 자체 바라 제외). 프리뷰/ZIP/한편/썸네일 모두 `CCFooterCtx.Provider`(export는 `footerCtxFor(i+1,deck.length)`). 색=`store.idealInk`.
- **엠블럼 선택**(`app.jsx` `EmblemPresetRow`): 저장 에셋 3종(logo.png 공식컬러·logo-white.png 흰매듭·logo-asset.png 굵은매듭)을 슬롯(logo/logo-white)별 썸네일로 선택→`store.setImage(slot, 경로)`(+기본 클리어). 업로드 병행. **D-피드 워터마크**(`dday.jsx` DDaySquare)가 선택 엠블럼 사용(어두운=logo-white·밝은=logo, 없으면 logo-asset 기본; 커스텀은 invert 안 함).
- **5단계 절차형**(`templates.jsx` `T_Steps`, '13 · 절차/방법형(5단계)', 엔딩=14로): 번호 배지(원04)+제목+설명 5행 + STEP n + AutoFooter. SEC_TEMPLATES 13→14종.
- 검증: 로컬 http서버+헤드리스 Chrome(파일 CORS 우회) — 6패밀리 렌더·14콘텐츠·장면 select(기본+10)·엠블럼 프리셋 6·푸터 토글·**콘솔 에러 0** + 스크린샷(표지 야영장 장면·소개형 푸터 2/3·5단계·D-피드 워터마크가 선택 엠블럼 반영). ⚠️ app.jsx에 이전 세션의 깨진 문자열 잔재(`/오류|실패|.../.test(listMsg)…`가 일부 상태문구·색 표현에 박힘)가 남아있음 — 부팅/기능엔 무해(상태 메시지 텍스트만 지저분), 별도 정리 권장.

### 15.18 v0.9.50 — UI 안정성 정리(P0) + 저장 기본 로컬 + 비번 서버 백업
- 사용자 평가 요청("카드뉴스 생성기 UI 안정성·그래픽 에디터 UX")에 따른 **P0 정리** + 저장 모델 변경.
- **깨진 문자열 11곳 전부 정리**(app.jsx): §15.17이 남긴 `/오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent` 잔재가 박혀 있던 상태/토스트/`confirm()`(특히 '새로 만들기' 다이얼로그)·모달 상태색 표현을 정상 한국어/정상 표현식으로 교체.
- **에러 경계 신설**(`class ErrorBoundary`): 카드 하나가 렌더 중 throw해도 앱 전체가 흰 화면으로 죽지 않게 — 프리뷰(`key=pv:<cardKey>`, 폴백 안내)·덱 썸네일(`key=th:<i>`, 폴백 null) 각각 격리.
- **저장 기본 = 로컬(브라우저 localStorage)**: 명명된 카드뉴스를 `jamboree:projects`(인덱스)+`jamboree:project:<id>`(state)로 저장. `lsSaveProject/lsLoadProject/lsDeleteProject/lsProjects` 헬퍼. 저장/불러오기/삭제/목록/자동저장(`doAutosave`)이 전부 로컬. 쿼터 초과 시 ok:false → 안내. 작성자 이름은 **선택**(게이트 제거).
- **서버 백업 = 선택 + 비밀번호 `scout1922`**: 모달 하단 '서버 백업' 섹션, 비번 입력 잠금 해제(localStorage `jamboree:server-ok`) 후에만 `/api/jamboree`(POST/GET/DELETE) 노출. 기본 흐름은 서버 미호출. 서버본 불러오기는 `currentId=null`(로컬 자동저장과 분리).
- 검증: 로컬 http + 헤드리스 Chrome(CDN Babel 컴파일) — 부팅·헤더·저장모달(로컬 목록 라벨·작성자 선택·서버 섹션·비번 scout1922 잠금해제→'서버에 저장' 노출)·**콘솔/페이지 에러 0**(404는 정적서버 /VERSION 한정).
- ⏳ 미적용(권장 후속): Undo/Redo, 줌, 모바일 에디터 레이아웃, 미저장 작업 이탈 가드.

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

### 16.3 v0.9.23 — 탭/콘텐츠 단위 관리/이미지 10장/페이스북 채널/로고 장식
- **상단 탭**(`.viewtabs`): 📅 캘린더 보기 / 📋 리스트 보기 — `setView(v)`가 `#calendar`/`#content` display 토글(localStorage `jamboree-plan:view`). 마케팅 캘린더는 항상 노출.
- **캘린더 콘텐츠 단위 관리**: 셀 안의 D-count/소식/이벤트/추가 칩에 `data-sk`+`.citem` → 개별 클릭 시 `openSlot`(그 콘텐츠만). 셀 우하단 `.cadd`(＋) → `addContent(date)` 후 그 슬롯 모달. 셀 배경/날짜 클릭은 `openDay`(전체).
- **추가/삭제**: `addContent(date)`(extra 슬롯 생성), `deleteSlot(date,s)`(extra=제거 / seed=`state.hidden[k]=true`). 카드 hover `✕`(`.cdel`)·모달 '삭제' 버튼(confirm). 리스트뷰 툴바 날짜선택+`＋ 콘텐츠 추가`. `daySlots`가 hidden 필터.
- **이미지 최대 10장**(`MAX_IMG`): `handleFiles` 잔여 계산·초과 toast·캡 도달 시 add 버튼 숨김+`(n/10)` 라벨.
- **채널(기본 페이스북)**: `EDEF.channel='페이스북'`, `CHANNELS`. 모달 상태·채널 셀렉트, 카드 `.chchip`(페북/인스타/유튜브 색). 링크 라벨/placeholder 페이스북 우선. export에 channel 포함.
- **로고 장식**: 헤더에 `jamboree/assets/logo.png`(색 엠블럼)+favicon. 장소 = '강원특별자치도 고성군 토성면 잼버리로 244'(공식 엠블럼 Goseong 표기 반영).
- 검증: 헤드리스 — 탭 전환·캘린더 칩 클릭→슬롯모달(채널 셀렉트)·셀＋추가·카드 채널칩/삭제·이미지 10/10 캡·리스트뷰 추가 모두 동작, 콘솔 에러 0.

### 16.4 v0.9.24 — 카드(콘텐츠)별 서버 저장 + 업데이트 히스토리(Tiptap) + IP기록/보관고지
- **per-card 저장**(`functions/api/jamboree-plan.js` 전면 재작성): 보드 전체 한 덩어리 저장 폐기 → 카드(슬롯)별 KV 키 `jp:s:<slotKey>` = `{edit, history:[{ts,author,ip,html}], deleted, updatedAt, author}`. 마케팅=`jp:marketing`. GET=list(prefix)+병렬 get로 `{slots,marketing}`. PUT는 `{slotKey,edit?,deleted?,addHistory?,author}` 또는 `{marketing,author}`.
- 클라: `scheduleSync/doSync`(전체저장) 제거 → `saveCard(k)`(900ms 디바운스, 카드별)·`sendDelete(k)`·`addHistoryNote(k,html)`·`saveMarketing()`·`saveAll()`(서버 저장 버튼=전 카드 일괄). `applyServer(j)`가 slots→edits/extra/hidden/history 복원. 편집 핸들러 전부 `renderAfterEdit(s.k,s)`로 변경.
- **업데이트 히스토리 = Tiptap 리치 에디터**: 모달에 히스토리 타임라인(작성자·시간·IP·렌더HTML) + 작성기. Tiptap v2 무료확장 전부를 **CDN ESM**(`esm.sh@2.11.5`, 빌드 없음, `window.__ttReady` 프라미스, 실패 시 contentEditable 폴백)로 로드: StarterKit+Underline/Link/Image/TextAlign/Highlight/Sub/Sup/TaskList/Table셋/TextStyle/Color/Typography/Placeholder. 24버튼 툴바. `addHistoryNote`→서버 append(작성자·IP 부여). `mdEditors` 라이프사이클(모달 닫기/새로고침 시 destroy).
- **작성자 IP 기록**: `maskIp(clientIp)`를 히스토리 항목·레코드에 저장(공개 마스킹). 변경로그(`log`)에는 기존대로 기록.
- **보관 고지 푸터**: 잼버리 종료(2026-08-09) 후 **3개월(~2026-11-09)** 보관 후 삭제 명시. **국문 주제 교체**: "평화를 잇다, 지구를 살리다, 미래를 개척하다". 카드뉴스 CTA(`/jamboree` 링크) 슬롯에 추가(본격 연동은 다음 단계).
- 검증: node 구문 + 헤드리스 — Tiptap 18확장 로드·24버튼 툴바·ProseMirror 마운트·히스토리 추가/표시·per-card 저장 무에러·applyServer 복원(edit/history/extra/hidden/marketing)·푸터/슬로건, 콘솔 에러 0.

### 16.5 v0.9.25 — 채널 복수·채널별 링크·첨부파일·SNS문구·라이브타이머·자동저장·캘린더 제목뷰
- **채널 복수 선택**: `e.channel`(string)→`e.channels`(array). 모달에 토글칩(`.chtog`, 최소 1개). 카드/캘린더 칩 다중 표시. `normEdit`로 구버전 호환.
- **콘텐츠 링크 복수 + 채널별 자동생성**: `e.link`→`e.links`(객체 `{채널:url}`). 선택한 채널마다 "채널 / 링크" 입력행 자동 생성(`renderLinks`), 채널 토글 시 즉시 재생성. 채널별 placeholder.
- **SNS용 텍스트 문구**: 기존 '업데이트 기록(메모)' 라벨 → **"SNS용 텍스트 문구"**(Tiptap 그대로, history=문구 버전 기록). 빈상태/버튼/placeholder 문구 변경.
- **관련 첨부파일**: 이미지 외 일반파일 업로드. 신규 `functions/api/file.js`(KV `file:<id>`, 최대 10MB, content-disposition 다운로드). 클라 `e.files=[{name,url,ct}]`, `handleAttachments`/`uploadAttachment`(X-Filename), 모달 첨부 목록+다운로드+삭제, 카드 📎 카운트.
- **상태 모달 최상단**: status 세그먼트를 head 바로 아래로 이동(제목보다 위).
- **마지막 작업자 IP 표시**: `state.meta[k]={author,ip,updatedAt}`(서버 레코드/응답에서). 모달 상단 `.lastedit` "마지막 작업: 이름 · IP · 시간". `applyServer`가 meta 복원, 저장 응답이 갱신(`applyMeta`/`updateLastEditUI`).
- **모두 즉시 서버 저장**: 작성자 게이트 제거 → 모든 편집이 항상 서버 PUT(텍스트 500ms 디바운스, 선택/토글/삭제/이미지/첨부=즉시 `now=true`). 상단 '서버 저장' 버튼 제거(자동저장), '작성자' 라벨+'↻ 새로고침'만. author 없으면 서버가 '익명'+IP 기록.
- **캘린더 = 제목 뷰**: 타입 태그(소식/이벤트/카테고리 pill) 제거 → 각 콘텐츠를 **제목**으로 표시(`.ctitle-cell`, 미입력은 faint=제목/시드/카테고리). **진행상태는 날짜 옆 작은 점**(`.sdot` 상태색, 슬롯별). 셀 클릭=openDay, 제목 클릭=openSlot, ＋=추가.
- **라이브 카운트다운**: 개영식 = **2026-08-05 20:00**(KST). 헤더 시계가 `D-N HH:MM:SS`로 1초마다 갱신(`renderClock`+`setInterval`). 캘린더 D라벨(날짜기준)은 유지.
- 검증: node 구문(3파일) + 헤드리스 — 시계 틱·채널 토글→링크행 증가·상태 최상단·첨부 UI·캘린더 제목/점(태그 0)·payload(channels/links/files)·콘솔 에러 0. 라이브 /api 스모크.

### 16.6 v0.9.26 — 데이터유실 방지(MERGE)·콘텐츠 종류 콤보·간단메모·휴지제거·국문 라벨
- ⚠️ **데이터 유실 사고 & 수정**: per-card 전환 후 `applyServer`가 **로컬을 서버로 덮어쓰기**라, 서버에 카드가 하나라도 있으면(=내가 라이브에 돌린 스모크 PUT 포함) 로컬 전용 내용이 사라짐(D-50 분실 원인). → `applyServer`를 **MERGE**로 변경(서버 카드는 자기 키만 갱신, 로컬 전용 카드 보존; deleted=true만 제거). init도 항상 merge. **교훈: 운영 KV에 파괴적 스모크 PUT 금지** — 이후 헤드리스+GET만.
- **콘텐츠 종류(ctype)**: 제목 앞 **입력형 드롭다운 콤보**(`buildTypeCombo`) — 기존 종류 선택 + 타이핑+Enter로 새 종류 추가 + 각 항목 ✕로 삭제. 전역 목록 `state.types`(서버 `jp:types`, `saveTypes`), 기본 `defaultTypes()`. **제목과 같은 줄**(`.titlerow`). 캘린더·카드에 `.ctchip`으로 제목 앞 표시.
- **간단 메모(Enter 등록)**: SNS 문구 섹션 아래 입력칸 — Enter로 즉시 등록(`addNote`→서버 `addNote`, 슬롯 record `notes[]`에 {ts,author,ip,text}). 타임라인 표시.
- **휴지 제거**: 캘린더 휴지기 빈 셀의 '휴지' 라벨 제거(그냥 비움). 빈 콘텐츠=회색(faint), 내용 있음=잉크색 유지(기존대로).
- **국문 라벨**: 좌상단 `제16회 한국잼버리 기획조정본부 홍보부`(orgtag), 헤더 eyebrow `기획조정본부 홍보부`, 타이틀 `제16회 한국잼버리 · SNS 운영 캘린더`(영문 제거).
- API: `cleanEdit`에 ctype, 슬롯 record에 notes[], GET `{slots,marketing,types}`, PUT `{types}`/`{addNote}`.
- 검증: 헤드리스 — **MERGE로 로컬 D-50 보존**(서버 부분응답에도 안 사라짐) 확인 + 종류 콤보(메뉴/추가/삭제)·간단메모 Enter·상태 최상단·라벨·휴지0, 콘솔 에러 0.

### 16.7 v0.9.27 — 구조 분리 + 통합 디자인 시스템 + 라인 아이콘 (UI 전면 개선 A)
- **파일 구조 정리**: `jamboree-plan.html`(1200줄) → **105줄**. 인라인 CSS/JS를 `jamboree-plan/` 폴더로 분리: `styles.css`(재작성)·`app.js`(메인 로직)·`editor.js`(Tiptap CDN ESM 모듈). `jamboree/`(카드뉴스 React)와 병렬 구조.
- **통합 디자인 시스템**(styles.css 신규): 토큰화(surface/ink/line/accent·status·channel 색, `--r-1/2/3`·`--pill`·`--sh-1/2/3`·`--ease`). 한 톤(green editorial)으로 버튼/칩/인풋/카드/모달/표 일관화. 산발 인라인 스타일·죽은 클래스(.tag/.pill/.ttl/구 테이블/.statusbadge 등) 제거.
- **모든 박스 칩 = pill**(`--pill` 999px): chchip/ctchip/typebadge/채널토글/링크라벨/상태세그/필터/카운트 전부. **콘텐츠 종류 칩 ↔ 제목 간격**(`ctchip margin-right`).
- **라인 아이콘**(이모지 제거): `ICON`+`icon()` 인라인 SVG(Feather/Lucide 스타일, stroke=currentColor). 동적(카드 meta·삭제·링크열기·이미지/첨부·툴바 형광/링크/정렬)·정적(`data-ic` 주입: 탭·새로고침·추가·닫기) 전부 교체.
- **캘린더 = 콘텐츠 단위 오픈**: 셀 배경 클릭 openDay 제거 → 콘텐츠 칩 클릭만 `openSlot`(콘텐츠 단위). `+`는 추가.
- **상단 작성자 입력 제거**(자동저장이라 불필요, IP는 서버가 기록). `authorVal()` 안전화(없으면 '익명'). 클락=솔리드 그린 pill, 범례=카드(단계 스와치+상태 점).
- 검증: 헤드리스 file:// — CSS/app/아이콘(127 svg) 로드·pill 999px·작성자 입력 없음·**콘텐츠 단위 오픈**(셀배경 X, 칩 O)·콘솔 에러 0. (Tiptap은 file:// 모듈 CORS로 미로드 → https 동일출처에서 정상; 라이브 검증)
- **다음(B)**: 모달 명시적 **저장 버튼** + 미저장 이탈 가드(저장/되돌리기/취소). 카드뉴스 본격 연동. 데이터 삭제 `/schedule`(2026-11-09).

### 16.8 v0.9.28 — 명시적 저장 + 미저장 가드 + 필터 확장 (UI 개선 B)
- **모달 = 임시 draft 편집 → 명시적 저장**: `openSlot`이 `curView.draft=clone(peek(k))` 생성, 필드 핸들러는 draft만 수정+`mark()`(자동저장 X). 하단 **저장 버튼**(`commitDraft`→`state.edits[k]=draft`+`doSaveCard` 즉시 서버). '저장되지 않은 변경 있음' 표시.
- **미저장 이탈 가드**: X/스크림/Esc/닫기 → dirty면 `showGuard` 3지선다 — **① 저장하고 나가기**(commit+close) **② 저장 안 함(되돌리기)**(draft 폐기) **③ 취소(계속 편집)**(가드만 닫고 머무름). `.guard` 오버레이.
- ⚠️ 예외(즉시 동작 유지): **SNS 문구/간단 메모**는 추가 즉시 서버(append 로그), **카드 상태 토글(보드)·캘린더 ＋추가**도 즉시(빠른 제스처). 콘텐츠 **삭제**는 confirm 후 즉시.
- **필터 확장**(리스트뷰): `curFilter={kind,v}` + `matchFilter` + `renderFilters`(동적). 그룹 — **유형**(D-count/소식/이벤트/추가)·**단계**(한국/외국/피날레/휴지기)·**채널**(5)·**상태**(기획/작성중/완료)·**종류**(typeList 동적). 정적 마크업 버튼 → `#filters` JS 렌더.
- 검증: 헤드리스 — draft 격리(편집≠커밋)·dirty 표시·가드 표시/취소-머묾/되돌리기-원복/저장-커밋·필터 23버튼 5그룹·채널필터 동작, 콘솔 에러 0. 라이브 https Tiptap 정상.

### 16.9 v0.9.29 — 가독성/검색/모달 헤더/필터 계층
- **캘린더 가독성**(사용자: 내용이 묻혀 보임): 빈 슬롯마다 반복되던 "한국 대표단/주요 소식" 라벨 제거 → **3티어**: 실제 콘텐츠(제목 있음)=흰 카드처럼 부각(`.cline.filled`) · 의미있는 시드(참가국/역할/이벤트)=옅게(`.cline.seed`) · 빈 슬롯=하단 작은 점선 칩(`.cmini`, 클릭=작성). 모두 콘텐츠 단위 클릭.
- **캘린더 검색**(`#cal-search`): 제목·종류·채널·링크·SNS문구·메모 대상. `searchQ`+`matchSearch`. 검색 시 비매칭 셀 `.dim`(흐리게), 보드도 검색 적용.
- **모달 헤더 = 날짜+D시점**: 풀 날짜(`2026. 7. 15. (수)`) + **D배지**(`md-dbadge`, D-DAY는 빨강) + 서브("외국 대표단 · D-count · 개영식까지 21일").
- **필터 계층**(사용자: 구분자 너무 작아 위계 무너짐): 인라인 `.fgrp` → **그룹별 줄**(`.frow`+`.flabel` 굵은 라벨 좌측 정렬): 전체/유형/단계/채널/상태/종류.
- 검증: 헤드리스 — 3티어(filled 2/seed 24/mini 34)·모달 날짜+D-21·검색 dim 55·필터 6라벨행, 콘솔 에러 0.
- **다음**: 드래그앤드랍으로 일정(콘텐츠) 날짜 이동.

### 16.10 v0.9.30 — 드래그앤드랍 일정(날짜) 이동
- 캘린더에서 **실제 콘텐츠(`.cline.filled`)를 드래그**해 다른 날짜 셀에 드롭 → 그 날짜로 이동. (네이티브 HTML5 DnD: draggable + dragstart/dragover(preventDefault)/drop, `.dragover` 하이라이트, `.dragging` 반투명.)
- `moveContent`: 대상 날짜에 **새 extra 슬롯** 생성 + 편집(제목/종류/채널/링크/이미지/첨부/상태)·**히스토리·메모까지 이전**. 원본=extra면 삭제, seed면 비움. 서버는 `putSlot`(대상 저장 + `setHistory`/`setNotes`)·`sendDelete`/원본 비우기로 동기화.
- API: PUT에 `setHistory`/`setNotes`(배열 통째 설정) 추가 — 이동 시 로그 이전용.
- 빈 슬롯/시드는 드래그 안 됨(이동할 내용 없음). 검증: 헤드리스 — draggable 1개·이동 후 원본 제목 ''·대상 extra에 제목/종류/히스토리 이전, 콘솔 에러 0.

### 16.11 v0.9.31 — 소식 자동생성 제거 (사용자가 직접 추가)
- 사용자 요청("비활성 소식 데이터 지워줘, 소식은 나중에 직접 추가"): `buildDays`의 **월·수·금 소식 자동 생성 제거**(스케줄 슬롯 60→44). 죽은 **소식 유형 필터 제거**. 소식 콘텐츠는 이제 `＋ 콘텐츠 추가`(extra)로 직접 작성.
- 서버의 **빈 소식 레코드 3개**(2026-07-01/07-13/07-15#sosik, 전부 빈 슬롯 확인 후) **DELETE 정리**(사용자 승인). 이벤트(7/6·7/26·8/5)는 유지.

### 16.12 v0.9.32 — 캘린더 호버 툴팁(전체 제목)
- 좁은 셀에서 잘리는 제목 → **콘텐츠 호버 시 커스텀 툴팁**으로 전체 제목 + 메타(날짜·D시점·단계·상태·채널) + 첨부/이미지/링크/SNS문구 개수 표시. 느린 native `title` 제거(중복 방지). `showCalTip`/`hideCalTip`/`calTipEl`(position:fixed, 위쪽 우선·공간 없으면 아래). `.citem` mouseenter/leave, renderCalendar 시작 시 숨김. 검증: 헤드리스 — 호버 시 전체 제목 표시·떠남 시 숨김·native title 없음, 콘솔 에러 0.

### 16.13 v0.9.33 — 안정성 강화 + SNS 운영 기능
- **(A) 안정성**: 저장 실패→`pending` 등록 후 `online` 이벤트·15초 주기 **자동 재시도**(`flushPending`/`slotByKey`), 상태줄 '저장 대기 n건'. **이탈 경고**(`beforeunload`: pending/모달 dirty). **렌더 방어**(cardEl try/catch). **링크 https 자동 정규화**(`normUrl`). 오프라인/온라인 토스트.
- **(B) SNS 기능**(콘텐츠별): 게시 예정 **시간**(time)·**담당자**(owner)·**해시태그**(tags)·**게시 완료**(posted/postedAt, 배지). **SNS 문구 복사**(히스토리별 평문+해시태그→클립보드, `htmlToText`/`copyText`). **글자 수**(Tiptap onUpdate, 인스타2200/X280 초과경고). 카드 메타·툴팁에 시간·담당자·게시됨.
- API `cleanEdit`에 time/owner/tags/posted/postedAt. EDEF/slotEditPayload/export 반영. 검증: 헤드리스 — 필드·게시토글·복사·htmlToText·normUrl·pending, 콘솔 에러 0.

### 16.14 v0.9.34 — 종류에 '회의' 추가(부서별 색 구분)
- `defaultTypes`에 **회의 · 기획조정본부 / 회의 · 홍보부** 추가(콤보 creatable이라 타 부서도 입력 가능). `CTYPE_COLOR`/`ctypeColor`: 기획조정본부=보라(#6B4FA0)·홍보부=청록(#0F8A8A)·기타 회의=슬레이트·일반콘텐츠=accent. `ctchip(t)` 헬퍼로 캘린더/카드/툴팁 칩 배경색을 종류색으로. 종류 콤보 옵션에 색 점(`.tdot`). '종류' 필터로 부서 회의만 보기 가능. 추가는 ＋ 콘텐츠 추가 후 종류 선택.

### 16.15 v0.9.35 — 회의/콘텐츠 분리 관리 (같은 캘린더 내)
- 사용자: 회의와 콘텐츠 플랜은 구분되어 관리, 단 별도 캘린더는 불필요(보여지는 방식으로 구분). `isMeeting(e)`=ctype에 '회의' 포함.
- **캘린더**: 회의 항목은 `.cline.meeting`(부서색 굵은 좌측 테두리)로 콘텐츠 카드와 구분.
- **리스트 구분 토글**(`kindFilter` all/content/meeting): 필터 상단 '구분' 행 [전체·콘텐츠·회의] → 보드를 종류로 분리. 보드 카드도 회의=`.meetingcard`(부서색 테두리).
- **진행률 = 콘텐츠 기준**(회의 제외) + 회의 건수 별도 표기("콘텐츠 완료 n/N · 회의 m건").
- **회의 모달 = SNS 항목 숨김**(`.slot.mtg .sns-only{display:none}`): 채널·링크·해시태그·이미지·SNS문구 숨기고 상태·종류/제목·회의시간/주재자·첨부(회의자료)·메모만. ctype를 회의↔콘텐츠로 바꾸면 `commit`이 `refreshModal`로 즉시 레이아웃 전환.
- 검증: 헤드리스 — 캘린더 회의/콘텐츠 라인 구분·모달 sns숨김+회의시간 라벨·구분토글(회의1/콘텐츠44)·진행률 문구, 콘솔 에러 0.

### 16.16 v0.9.36 — /jamboree 파비콘 + OG 이미지
- 카드뉴스 제작기(`jamboree.html`)에 **파비콘**(`jamboree/assets/logo.png`) + **OG/트위터 메타** 추가. **OG 이미지** `jamboree/assets/og.png`(1200×630) 신규 — 엠블럼+"제16회 한국잼버리 / 카드뉴스 제작기"+날짜/장소, 헤드리스 Chrome으로 HTML 템플릿 렌더 생성. og:image 절대URL(`https://jimmypark.net/jamboree/assets/og.png`).

### 16.17 v0.9.37 — /jamboree 제작기 셸을 캘린더 톤으로 통일
- 사용자: 카드뉴스 제작기 전체 UI를 홍보부 캘린더 톤앤매너에 맞춤. **카드 결과물(PAL/SWATCHES) 색 불변** — 에디터 크롬만 그린 에디토리얼로.
- `app.jsx`에 크롬 토큰 `UI`(bg/surface/ink/muted/line/accent #2F5D4A/accentInk #234636/soft/danger/shadow). 헤더=다크그린, 좌/우 패널·덱·모달 보더=line+소프트섀도우, 활성(패밀리 pill·사이드·Seg·슬라이더·덱·리스트)=accent green. inputStyle/fieldLabel/secLabel 토큰화. 회색텍스트(#5a5364/#9a93a3/#8b8492/#b3acbd)·보더(rgba(0,0,0,.08~.18))·danger 일괄 치환. 툴바 이모지(💾) 제거. 카드 스와치/INK는 WOSM 유지.
- 검증: Babel standalone 컴파일 OK + 라이브 https 부팅(헤더 #234636·버튼49·콘솔 에러 0). file://은 Babel src fetch CORS로 부팅 불가 → 라이브 검증.

### 16.18 v0.9.38 — 별도 '일정' 레이어(회의·장기 연속 일정)
- 사용자: 카드뉴스(콘텐츠) 일정과 **운영 일정**(회의 / 공모전 같은 여러 날 연속 일정)을 구분. 별도 캘린더가 아니라 **같은 캘린더에 띠(band)로** 표시(AskUserQuestion: "별도 '일정' 레이어" 선택).
- **API**(`functions/api/jamboree-plan.js`): KV 키 `jp:events` 추가. `cleanEvent(e)`=`{id,title,kind,start,end,owner,memo}`. GET이 `{slots,marketing,types,events}` 반환. PUT에 `if(Array.isArray(body.events))` 분기(최대 300, start 필수). 콘텐츠 슬롯과 완전 분리 저장.
- **앱**(`app.js`): `EVENT_KINDS`(회의#6B4FA0·공모전#0F8A8A·행사#C0492F·운영#2E6FAE·기타#7A6A57)·`eventColor`·`defaultEvents`(공모전 접수 07-06~26·결과공개 08-05·본행사 08-05~09)·`eventList`·`layoutEvents`(그리디 lane 배정). 기존 `buildDays`의 FIXED_EVENTS 제거, `defaultTypes`에서 '회의' 제거(일정으로 이관). `applyServer`가 `j.events` 로드, `saveEvents()` 디바운스 PUT(events). renderCalendar가 ctop 아래 `.bands`로 여러 날 띠 렌더(시작·일요일에 라벨, 양끝 라운드), 띠 클릭→`openEvent`. 모달 `openEvent/closeEvent/renderEventModal/commitEvent/deleteEventCur`(종류 칩·제목·기간 start~end·담당자·메모, 즉시 서버 저장). Escape/배경클릭 닫기.
- **마크업**: `#ev-scrim` 일정 편집 모달, 캘린더 sec-head "일정 추가" 버튼 + 범례에 "운영 일정(띠)" 안내.
- 검증: `node --check`(app.js·API) OK + 헤드리스 file:// 부팅(띠 27개·일정 추가 모달 5칩·띠 클릭 편집 열림, 콘솔 에러는 file:// CORS 한정).

### 16.19 v0.9.39 — 잼버리 일자별 시간 일정표 + 홍보부 R&R/배치표
- 사용자: (1) **잼버리 일자별 시간 단위 일정표**(8/5~8/9 시간별 행사), (2) **홍보부 인원 R&R + 현장 배치표**. → 상단 뷰탭에 "잼버리 일정표"·"인원·배치" 2개 추가.
- **API**(`jamboree-plan.js`): KV 키 `jp:timetable`/`jp:roster`/`jp:placement` 추가. `cleanTT`(id/day/start/end/title/place/cat/owner/memo)·`cleanRoster`(id/name/role/duty/contact/channel)·`cleanPlace`(id/name/day/zone/time/task). GET이 6키(`slots,marketing,types,events,timetable,roster,placement`) 반환. PUT에 각 배열 분기(timetable 400·roster 100·placement 300).
- **앱**(`app.js`): `JAM_DAYS`(5일·라벨)·`TT_CATS`(개·폐영식#C0492F/프로그램#2F5D4A/행사#6B4FA0/홍보활동#0F8A8A/식사#B07A1E/회의#2E6FAE/이동·기타#7A6A57)·`ttCatColor`. `defaultTimetable`(14개 시드, ★=홍보 핵심)·`defaultRoster`(6역할 R&R)·`defaultPlacement`(5배치). `state`에 `timetable/roster/placement` 추가, `applyServer` 로드. 저장: `debouncedPut` 헬퍼 + `saveTimetable`(ttTimer)·`saveRoster`(rosterTimer)·`savePlacement`(placeTimer) 독립 타이머.
- **렌더**: `renderTimetable`(날짜탭 `ttDay` localStorage 기억 → 선택일 시간순 정렬, 행마다 time/종류 select(색칩)/제목/장소/담당/메모 인풋, 입력 시 자동저장, 종류 변경 시 좌측 보더 재색)·`renderStaff`(R&R 테이블 + 배치표 테이블, `td.mk` contenteditable blur 저장 — 마케팅 테이블 패턴 재사용). `addTT/addRoster/addPlacement`.
- **뷰 전환**: `setView`가 calendar/list/timetable/staff 4개 토글 + 마케팅은 calendar/list에서만 노출. 탭 복원(localStorage). 아이콘 `users`·`mapPin` 추가.
- **마크업/CSS**: `#timetable`(날짜탭·범례·`.ttrow` 행·시간 인풋 124px로 한국어 오전/오후 전체 표시) + `#staff`(`#rostertbl`·`#placetbl` — 기존 `table`/`td.mk` 스타일 상속). `.rm` 삭제버튼 스타일 추가.
- 검증: `node --check` OK + 헤드리스 file://(4탭·일정표 5일탭·8/5 4행/8/6 3행·추가·R&R 6행/배치 5행·마케팅 숨김·추가 동작, 에러 0) + 스크린샷(일정표·인원배치 그린 톤 정상).

### 16.20 v0.9.40 — 일정표 = 타임테이블 그리드(8/2~8/9) + 일정↔인원배치 연동
- 사용자: (1) 일정표를 **타임테이블 형태**로, **8/2~8/9** 시간단위(세로=시간, 가로=날짜)로 한눈에 보게. (2) **일정에 사람을 Assign하면 인원·배치에 그 사람이 해당 시간 어디 있는지** 자동 표시.
- **타임테이블 그리드**(리스트→그리드 전면 교체): `JAM_DAYS` 8일(8/2~8/9), `TT_HS=6/TT_HE=23/TT_HH=46`(06–22시 행). `renderTimetable`이 `.ttgrid`(헤더=날짜 8열 + 시간 거터, 본문=시간행×날짜열)로 렌더. 이벤트=절대배치 블록(top/height=시작·길이, 색=종류). 겹침은 `ttLanes`(클러스터별 lane 분할 → 나란히). 빈 셀 클릭=그 시각 새 일정, 블록 클릭=편집. `t2h` 시:분 파싱.
- **시간 일정 편집 모달**(`#tt-scrim`, 리스트 인라인편집 폐기): 종류 칩·날짜 select·시작~종료·제목·장소·**담당 인원 칩(roster 기반 다중선택)**·메모. `openTT/closeTT/renderTTModal/commitTT/deleteTTCur`. 일정 item에 `assignees:[rosterId]` 추가(`owner` 제거). Escape/배경 닫기.
- **인원·배치 = 일정표 기반 파생뷰**(수동 배치표 폐기): `renderDerivedPlacement`가 roster 사람마다 자신이 담당(assignees)인 일정들을 날짜·시간순으로 카드 표시(언제·어디서·무슨 일정 / "n건 배치" or "배치 없음") + "담당 미지정 일정" 카드. 배치 슬롯 클릭→해당 일정 모달. R&R 표는 유지(편집 시 파생뷰 갱신).
- **API**: `cleanTT`에서 `owner`→`assignees`(배열, 최대 30). `jp:placement`(cleanPlace) 엔드포인트는 유지하되 UI 미사용(파생으로 대체).
- **CSS**: `.ttwrap/.ttgrid/.ttg-*`(그리드·sticky 헤더·블록) + `.placewrap/.pcard/.pslot`(사람별 배치 카드). 구 `.ttdays/.ttrow/.tin` 등 제거. 모바일=그리드 가로스크롤(min-width 880).
- 검증: `node --check`(app·API) OK + 헤드리스 file://(8일헤더·17시간행·18블록·8열 / 모달 7종류칩·6담당칩 / 담당지정→블록에 인원·파생뷰 'n건 배치'+미지정카드 / 빈셀클릭=새일정, 에러 0) + 스크린샷(그리드·모달·파생배치 정상).

### 16.21 v0.9.41 — 빈 roster 폴백(라이브 잔재 정리, 비파괴)
- 라이브 KV에 과거 테스트 잔재(완전 공백 roster 1행)가 남아 기본 6역할 대신 빈 1명만 표시됨. **운영 KV 파괴적 쓰기 금지 규칙** 준수 위해 DELETE 대신 클라 방어: `applyServer`가 서버 roster에서 **모든 필드가 공백인 행을 제외**, 남은 게 없으면 기본 R&R(6역할) 사용. 실데이터(한 필드라도 채워짐)는 그대로 보존.

### 16.22 v0.9.42 — 일정표 전체기간/일간 뷰 분리 + 동시간대 다중 일정 + 블록 삭제버튼
- 사용자: (1) 동시간대 여러 프로그램 등록 가능하게(이미 lane 분할 지원하나 8일뷰에선 슬리버로 좁음) → **전체 기간뷰/일간뷰 분리**. (2) 각 일정에 **삭제버튼 + 삭제 전 확인**.
- **뷰 모드**: `ttMode`('period'|'day', localStorage `jamboree-plan:ttmode`) + `ttDay`(선택일). `renderTTControls`가 세그(`#tt-modeseg` 전체기간/일간) + 일간일 때 날짜칩(`#tt-days` 8일) 렌더. `renderTimetable`이 `days`=전체(JAM_DAYS) 또는 [선택일]로 분기, 일간이면 `#tt-grid`에 `ttgrid-day` 클래스(단일 컬럼 풀폭 → 동시간대 일정이 lane으로 나란히 넓게).
- **삭제버튼**: 각 `.ttg-ev`에 hover 시 우상단 ✕(`.ttg-del`) → `deleteTT(id)`가 `confirm('이 일정을 삭제할까요?\n제목·시간')` 후 삭제·저장·재렌더(+staff 갱신). 모달의 삭제 버튼(confirm)도 유지.
- **CSS**: `.ttctrl/.seg/.ttdaytab`(뷰 토글·날짜칩) + `.ttgrid-day{min-width:0}`(일간 풀폭) + `.ttg-del`(블록 hover 삭제) + `.ttg-ev.big`(일간 여백). 동시간대 lane 분할은 기존 `ttLanes`(클러스터별) 그대로 — 일간뷰에서 풀폭 분배되어 가독.
- 검증: 헤드리스 file://(period 8열·날짜칩 숨김 / day 1열·8칩·ttgrid-day·8/5 4건→8/6 3건 / 삭제 confirm 떠서 3→2 / 에러 0) + 스크린샷(일간 8/6 오후 4개 동시 프로그램 나란히, 전체기간 8일 정상).

### 16.23 v0.9.43 — 일정표 인터랙션(15분 스냅·드래그 이동·리사이즈) + 24시간제 + 종류 입력칩 + 추가버튼 상단
- 사용자 요청 5건: (1) **15분 단위** 시간 등록, (2) **드래그앤드랍 이동**, (3) **상/하단 끌어 길이(시간) 조절**, (4) 좌측 축은 24h인데 모달은 12h(오전/오후)라 헷갈림 → **모두 24시간제**, (5) "시간 일정 추가" 버튼을 하단→**전체기간/일간과 같은 상단 줄**, (6) 일정 종류를 **입력형 칩 시스템**으로 편히 추가/삭제.
- **인터랙션**(pointer 이벤트): `TT_SNAP=0.25`(15분)·`snap15`·`h2hhmm`. `.ttg-ev`에 상/하단 리사이즈 핸들(`.ttg-rz.top/.bot`). `ttPointerDown/Move/Up`: move=블록 드래그(세로=시간, period뷰는 가로로 다른 날짜 컬럼=`ttColAt`+`.dropday` 하이라이트), resize-top/bottom=시작/종료 시각 조절(최소 15분). 드래그 중 라벨 실시간 갱신, drop 시 `t.start/end`(+이동 시 `t.day`) 갱신·저장·재렌더. 이동 3px 미만은 클릭=편집. 빈 셀 클릭도 클릭 위치 Y로 15분 스냅 시작시각.
- **24시간제**: 모달 시간 입력을 native `type=time`(로케일 12h) → **15분 단위 24h `<select>`**(`timeOptions`, 00:00~23:45 96개). 종료≤시작이면 자동 +15분(폼·commit 양쪽 가드).
- **종류 입력칩**(`state.ttcats`, KV `jp:ttcats`): `TT_CATS` 고정배열 폐기 → `ttCats()`/`ttCatColor`가 `state.ttcats`(기본 `defaultTtCats` 7종) 참조. 모달 종류 = `.chipset`(칩 클릭=선택, ✕=삭제 confirm, `.cinput` 입력+Enter=추가, 색은 `TTCAT_PALETTE`에서 미사용색 자동배정). 범례(`#tt-legend`)도 `ttCats()`로 동적 렌더. `saveTtCats` 디바운스 PUT. API GET 7→8키(`ttcats`), PUT `body.ttcats` 분기(`cleanTtCats`).
- **레이아웃**: "시간 일정 추가" 버튼을 `.ttctrl`(세그·날짜칩 줄) 우측으로 이동, 하단 `.tools` 제거.
- CSS: `.ttg-rz`(핸들)·`.ttg-ev{cursor:grab;touch-action:none}`·`.tt-dragging`·`.dropday` + `.chipset/.csel/.cdot/.cx/.cinput`(입력칩) + `.seg/.ttdaytab`.
- 검증: 헤드리스 file://(범례7·추가버튼 상단·하단tools없음 / 모달 시간=select 96개·12h표기0 / 종류칩 추가7→8(신규선택)·삭제→7 / **드래그 09:00–13:00→10:00–14:00**(길이유지)·**리사이즈 종료 14:00→15:00** 둘다 15분 스냅 / 에러 0) + 모달 스크린샷(입력칩·24h select 정상).

### 16.24 v0.9.44 — 미지정 일정 별도섹션 + 투입시간 + 보조선 + 종류 색변경 + IME 더블입력 수정
- 사용자 요청 6건 일괄: (1) **담당자 미지정 일정**을 현장 배치와 **별도 섹션**으로 분리. (2) 한글 IME에서 Enter 시 마지막 글자 더블 입력 버그. (3) 종류 **색상 변경**. (4) '일과' 라벨 색 `#504E48`. (5) 보조선(캘린더 30분·일간 10분) + 일간 행간 확대. (6) 현장 배치에 **사람별 투입시간 합계**.
- **미지정 분리**: `renderDerivedPlacement`가 사람 카드는 `#place-derived`, 미지정은 별도 `#place-unassigned`(+`#unassigned-head`, 없으면 숨김)로. 앰버 톤(`.pcard-un` dashed `--st-draft`, `.pcount.warn`).
- **IME 더블 수정**: Enter 핸들러 3곳(`tt-catinput`·간단메모 `ninp`·인라인편집 `inp`)에 `if(e.isComposing||e.keyCode===229) return;` 가드 — 조합 중 Enter는 무시(확정만).
- **종류 색변경**: 종류 칩의 점을 `<input type=color class=ccolor>`로 → change 시 `setTtCatColor`+저장+재렌더(그리드·범례 즉시 반영). 칩 클릭(선택)과 분리(stopPropagation).
- **보조선/행간**: `TT_HH` 동적(`TT_HH_PERIOD=46`/`TT_HH_DAY=84`, renderTimetable에서 모드별 설정 → 드래그·리사이즈·셀높이 동기). 셀 `background-image: repeating-linear-gradient` — 전체기간 23px(30분)·일간 14px(10분). 일간 행 84px로 확대.
- **투입시간**: `ttHours`(end-start)·`sumHours`·`fmtDur`(N시간 M분). 사람 카드 헤더에 건수(`pcount`)+**총 투입시간(`phours` 그린 배지)**.
- **'일과' 색**: 운영 KV의 `jp:ttcats`에 사용자가 추가한 '일과'(#A33A24) → 안전 read-modify-write PUT로 `#504E48` 변경(나머지 6종·전체 데이터 보존). 비파괴(스모크 아님·사용자 지시 변경).
- 검증: 헤드리스 file://(period셀46+그라데이션·day셀84+그라데이션 / 색피커 present·변경 반영 / 미지정=별도섹션(derived엔 없음)·표시 / 사람카드 투입시간 '4시간' / 에러 0) + 스크린샷(일간 10분선·taller, 배치 투입시간 배지·미지정 앰버섹션).

### 16.25 v0.9.45 — 인원별 오프타임(배정 불가 시간) + 충돌 차단
- 사용자: 각 인원별 **오프타임**(오전 09–12·오후 14–17·저녁 19–22)을 지정 → 그 시간엔 일정 **배정 불가**.
- **데이터**: `state.offtimes`={ rosterId:{ date:{am,pm,eve} } }, KV `jp:offtimes`(객체, `cleanOff`). `OFF_BLOCKS`(am/pm/eve + 09–12/14–17/19–22). 헬퍼 `isOff/toggleOff/offConflict(pid,date,sH,eH)`(시간 겹침)·`saveOfftimes`(debounce). applyServer 로드, stateDefaults `offtimes:null`.
- **편집 UI**(인원·배치 탭, R&R 아래): `renderOfftimes` — 인원 × 8일 × 3블록 토글 테이블(`#offtimes`, sticky 인원열, 가로스크롤). 토글=빨강(off). 변경 시 파생 배치 갱신.
- **배정 차단**: 시간 일정 모달의 담당 칩이 `offConflict` 검사 → 겹치면 `.offdis`(점선·빨강·'· 오프(오전)') + 클릭 시 toast로 차단(추가 안 됨). 이미 배정+오프면 `.offwarn`(빨강 아웃라인). 비오프 인원은 정상 배정.
- **충돌 표시**: 현장 배치 슬롯도 `offConflict` 시 `.conflict`(앰버 배경)+'오프충돌' 배지(오프타임을 나중에 지정한 경우 가시화). `placeSlotHTML(t,pid)`.
- **API**: GET 8→9키(`offtimes`), PUT `body.offtimes`(객체) 분기(`cleanOff`, 배열 분기들 뒤·slotKey 앞).
- 검증: 헤드리스 file://(오프표 6행×24토글 / 8/5 오전 off 설정→isOff / 모달서 그 인원 칩 offdis·'오프(오전)'·클릭해도 배정 안 됨 / 비오프 인원 배정됨 / 에러 0) + 스크린샷(오프 매트릭스 빨강 토글).

### 16.26 v0.9.46 — 오프타임 지정 가능 기간 = 8/3 오후부터
- 사용자: 오프타임은 **8/3 오후부터** 지정 가능(8/2 전체·8/3 오전은 불가). `OFF_START_DATE='2026-08-03'`·`OFF_START_BLOCK=1`(pm). `offAllowed(date,blockIdx)`(8/3은 pm·eve만, 8/4~8/9 전부, 그 전 불가)·`offDays()`(8/3~). `renderOfftimes`가 `offDays()` 열 + 비허용 블록은 빗금 `.offtog.na`(클릭 불가). `offConflict`도 `offAllowed` 블록만 검사. (직전 임시안 '본 행사 8/5부터'에서 8/3 오후로 정정.)
- 검증: 헤드리스 file://(열=8/3~8/9 7일·8/2 제외 / 8/3 오전=na·오후/저녁 클릭가능 / 토글버튼 120·na 6 / 에러 0).

### 16.27 v0.9.47 — 취재 연락처 탭(담당자 주소록) + 일정표 연동
- 사용자: 취재(섭외) 시 연락처를 찾기 쉽게 — (1) **취재 연락처 탭** 신설로 담당자 연락처를 한눈에 정리, (2) 잼버리 일정표의 시간 일정에 **배치 인원뿐 아니라 관련 담당자 연락처도** 연결, (3) 그 연락처를 별도 탭에서 한눈에. → 전역 주소록 + 일정 링크(roster/assignees 패턴과 동일) 하이브리드 채택.
- **데이터**: `state.contacts` 전역 주소록 = `[{id,name,org,role,phone,email,memo}]`, KV 키 `jp:contacts`(`cleanContact`). 시간 일정 item에 `contacts:[contactId]` 추가. `defaultContacts` 3행 시드(소속/직책 힌트, 이름 공백). `applyServer` 로드(배열 비어있지 않을 때만), `stateDefaults` `contacts:null`.
- **API**(`functions/api/jamboree-plan.js`): GET 9→10키(`contacts`), PUT `Array.isArray(body.contacts)` 분기(`cleanContact`, 최대 300). `cleanTT`에 `contacts` 배열(최대 30) 추가.
- **시간 일정 모달**: 담당 인원(배치) 아래에 **관련 취재 연락처** 섹션(`#tt-con`) — 전역 연락처를 칩으로 다중선택(`.evkind.con`, 선택=accent) + `+ 담당자 이름` 입력(`#tt-con-input`, Enter로 새 연락처 즉시 생성·연결, IME 가드). `openTT`/`commitTT`에 `contacts` 처리.
- **취재 연락처 탭**(`#contacts`, viewtabs에 `phone` 아이콘 탭 추가): contenteditable 주소록 표(이름·소속·직책·전화·이메일·메모 — roster 표 패턴, `.tblscroll` 가로스크롤) + 연락처 추가 + 검색(`con-search`: 이름/소속/직책/전화/이메일/메모/연결일정 대상) + 읽기전용 **연결된 일정** 칼럼(`.conlink` 칩, 클릭 시 `openTT`로 해당 일정 열림). 삭제 시 연결 일정에서 자동 unlink(`saveTimetable` 동기화). `renderContacts`/`contactSchedules`/`matchContact`. `setView`에 'contacts' + saved-view 복원.
- **연동 표시**: 시간 일정 블록은 일간뷰에서 연락처 라인(`.ttg-evp.con`, phone 아이콘) + 호버 툴팁에 `연락처 이름 전화`. 저장은 `debouncedPut('contactTimer',...)`.
- 검증: `node --check`(app·API) OK + 헤드리스 puppeteer file://(탭+아이콘·기본3행·추가4행 / TT모달 연락처섹션·칩4·입력칸·Enter추가→칩5 신규선택 / 저장→블록 con라인·연결일정칩 1 / 검색 1행 / **콘솔 에러 0**) + 스크린샷(취재 연락처 탭·TT모달 그린 톤 정상).

### 16.28 v0.9.48 — 취재 연락처 = 검색형 드롭다운(최대 3명·동명이인 직함 검색)
- 사용자: 시간 일정의 취재 연락처를 **칩 다중선택 → 검색형 드롭다운**으로. **최대 3명**, 선택된 연락처는 **이름 / 직함 / 전화번호** 표시, 이름 선택 시 **직함·전화 자동 로드**, **동명이인은 직함으로 검색**.
- **TT모달 픽커**(`#tt-con` 재작성): 선택된 연락처는 행(`.conrow` = ●이름·직함pill·전화·✕해제)으로 표시, 그 아래 검색 입력(`#tt-conpick-input`) + 드롭다운 메뉴(`#tt-conpick-menu`). 옵션(`.conpick-opt`)은 이름/직함/전화 표시, **이름·직함·소속·전화 어디로든 필터**(→ 동명이인 직함 검색). 선택 시 `addLinkedContact`(중복·3명 초과 차단), 해제는 인덱스 splice. 3명 도달 시 픽커 숨김+'최대 3명' 안내, 해제 시 재등장. 검색어가 매칭 없거나 입력 중이면 `‘<입력>’ 새 연락처로 추가`(`.conpick-add`)로 즉석 생성·연결(IME 가드). (기존 `.evkind.con` 칩·`#tt-con-input` 제거)
- 직함=`role`. 취재 연락처 탭 표 헤더 `직책·담당`→**`직함`**으로 통일. 블록/툴팁 연락처 표시(`.ttg-evp.con`)는 유지.
- 검증: `node --check` OK + 헤드리스 puppeteer file://(동명이인 김민수×2 시드 / 옵션3·각 이름·직함·전화 / 직함 '야영장' 검색→1건 / 선택→행에 직함·전화 자동 / 3명 도달 픽커 숨김·해제 후 재등장 / 저장→블록 con라인 / **콘솔 에러 0**) + 스크린샷(드롭다운 열림·선택행 정상).

### 16.29 v0.9.50 — 비밀번호 게이트 + 대시보드 탭(첫 탭) + 현장 날씨 모듈
- 사용자 3건: (1) 첫 진입 **비밀번호**(하드코딩 `scout1922`), (2) 맨 앞 **대시보드 탭** 신설, (3) 상단 **날씨 모듈**(강원 고성 토성면 잼버리로 244, 3일치 + 오늘 시간별 미래중심).
- **비밀번호 게이트**: `#pw-gate` 풀스크린 오버레이(`html.pw-ok`로 숨김). `<head>` 인라인 스크립트가 `localStorage['jamboree-plan:unlocked']==='1'`이면 즉시 통과(재방문 무플래시), 아니면 게이트 표시. `wirePwGate()`가 입력/Enter 처리 — `scout1922` 일치 시 unlocked 저장 후 통과, 불일치 시 에러. 오버레이가 불투명이라 콘텐츠 미노출.
- **대시보드 탭**(viewtabs 맨 앞 `data-v="dashboard"`, ICON `grid` 추가): 기본 뷰=dashboard(saved-view 목록에 포함). `setView`/`renderAll`이 dashboard 분기. `renderDashboard()` = 통계 6카드(개영 D-카운트·콘텐츠 진행 ready/total·운영 일정·시간 일정·인원·연락처·진행률 바) + 2패널(다가오는 콘텐츠/운영 일정, 클릭 시 `openSlot`/`openEvent`). 집계는 `daySlots`/`peek`/`isMeeting`/`eventList`/`rosterList`/`ttList`/`contactList` 재사용.
- **날씨 모듈**(`#wx`, **Open-Meteo** 무키 client fetch, `WX_LAT=38.286/WX_LON=128.520` Asia/Seoul): 현재(아이콘·온도·체감·습도) + **오늘/내일/모레 3일**(최고/최저·강수확률) + **시간별 12개**(지금부터, 미래 중심, 1시간 단위·강수%). WMO코드→이모지/한글 매핑(`WMO`/`wxInfo`). 30분 메모리 캐시, 실패 시 '다시 시도'. CDN/API 키 없음(본 규칙 준수).
- 검증: 로컬 http + 헤드리스 Chrome — 게이트 표시·오답 에러·`scout1922` 통과·대시보드 활성(통계 6·패널 2)·**날씨 라이브**(3일·시간별 12·현재온도)·탭 전환·**콘솔/페이지 에러 0**(404는 정적서버 /api·/VERSION 한정).

### 16.30 v0.9.51 — 분단 명단 + 발대식 식순 + 회의(캘린더) + 의전(별도 페이지·시간 게이트) + 오프타임 실시간
- 사용자 제공 자료(분단 명단표·잼버리 기간 회의·운영요원 발대식 식순·대회장/야영장 의전표) 반영 + roster→offtime 실시간 버그 수정.
- **분단 명단**(`divisions`, 탭 '분단·발대식'): 7분단 시드(분단명·소속·분단장·운영부장·야영안전부장·지원부장) 편집 표(`#divtbl`, td.mk contenteditable, 추가/삭제·자동저장). KV `jp:divisions`.
- **운영요원 발대식**(`launch`, 같은 탭): 일시/장소(`#launch-head` 인라인 편집) + 식순 7행(`#launchtbl` 시간·소요·식순·비고) 편집·추가/삭제. KV `jp:launch`(객체).
- **회의 → 캘린더**: `meetingSeeds()` 8건(분단야영장회의 8/4~8/8·분단장회의 8/4·6·8, 시간/참석/장소 memo)을 운영 일정(events, kind '회의')으로. `defaultEvents`에 concat + `mergeSeedMeetings()`(안정 id로 서버 events에 없으면 병합·저장) → 라이브 보드 캘린더에도 보라 띠로 표시·이벤트 모달 편집.
- **의전 일정**(`protocol`, 별도 탭 '의전 일정'): 대회장/부대회장/야영장/부야영장(5인) × 8/5~8/9 활동 25행 시드 편집 표(`#prtbl`: 구분·성명직책·날짜·시간·활동·장소·메모). KV `jp:protocol`. **캘린더 노출은 시간이 입력된 항목만**(`.cline.protocol` 금색 '의전' 칩, 클릭→의전 탭). 시간 비면 캘린더 미표시(요구사항).
- **오프타임 실시간 반영**: 홍보부 R&R(roster) 이름 수정 시 blur 핸들러가 `renderOfftimes()`도 호출(기존엔 `renderDerivedPlacement()`만 호출해 오프타임 표 이름이 새로고침 전까지 안 바뀌던 버그) → 이제 인원 수정 즉시 오프타임 매트릭스·현장 배치 모두 갱신.
- API(`jamboree-plan.js`): `jp:divisions/jp:protocol/jp:launch` 키 + `cleanDivision/cleanProtocol/cleanLaunch` + GET 13키 + PUT 분기(divisions/protocol 배열, launch 객체). setView/savedView에 orginfo·protocol 추가.
- 검증: `node --check`(app·API) + 헤드리스 Chrome — 탭 8개·분단 7행·발대식 일시+7식순·의전 25행·회의 events 8건·**의전 시간 입력→캘린더 1줄(시간 게이트)**·이벤트 띠 35개·**roster 이름 수정→오프타임 표 즉시 반영**·**콘솔 에러 0**.

### 16.31 v0.9.52 — 날씨 박스폭 채움 + 탭 리네이밍/발대식 제거 + 의전 고도화 + 24h 일정표·반복일정 + 분단 연맹목록
- 사용자 다건 피드백 일괄 반영.
- **날씨 시간별 줄 박스폭 채움**: `.wxh` 고정폭(60px)→`flex:1 1 58px`(넓으면 늘어 가득, 좁으면 가로 스크롤). 박스 우측 빈 공간 제거.
- **탭 리네이밍**: 인원·배치→**홍보부 인원 관리**, 취재 연락처→**협조 연락처**, 분단·발대식→**분단 연락망**. **운영요원 발대식 UI 제거**(launch 함수/데이터는 dormant).
- **분단 연락망에 소속 연맹 목록 추가**: division에 `federations` 필드(분단별 6~7개 연맹/국가, 예: 평화숲=서울북부연맹·경기북부연맹·부산연맹·일본·스리랑카·말레이시아). 2열을 '소속(지역)'→'소속 연맹'(줄바꿈 셀)로. `divisionList` 이름 기반 백필(구버전 데이터 보완). API `cleanDivision`에 federations.
- **의전 표 고도화**: 성명·직책 단일컬럼 → **성명/직책 2컬럼 분리**(`person`→`name`+`title`, 마이그레이션). 날짜=`<input type=date>`·시간=`<input type=time>`(캘린더 폼). **헤더 클릭 정렬**(`prSort`, 재클릭 토글 ▲▼). API `cleanProtocol` name/title(person 폴백).
- **의전 → 잼버리 일정표 노출**: 날짜·시간 지정된 의전 항목을 타임테이블에도 금색 '의전' 블록으로(읽기전용, 클릭→의전 탭). `ttLanes`에 의전 pseudo-ev 합류. **일간 뷰는 좌=일반 프로그램(취재일정)·우=의전**으로 분할(`.ttg-grouplab`·`.ttg-vsplit`), 전체기간 뷰는 통합 레인.
- **24시간 일정표**: `TT_HS=0, TT_HE=24`(기존 06–22시 → 00–23시 전체). 늦은 회의(22~23시) 노출.
- **시간 입력 = 시/분 숫자 입력**: 모달 96옵션 드롭다운(timeOptions) 제거 → `시 <input number 0-23> : 분 <input number 0-59>`(`ttTimeFields`/`readTimeFields`). 24h·숫자입력.
- **반복 일정**: 모달에 '반복' 날짜칩(JAM_DAYS) — 체크한 다른 날짜에 같은 일정을 독립 항목으로 일괄 생성(`commitTT` _repeat). 기준일 칩 disabled.
- 검증: `node --check`(app·API) + 헤드리스 — 탭 라벨 8개·연맹셀·발대식 없음·성명/직책 분리·date/time 인풋·정렬헤더 8·정렬 동작·의전→일정표 블록·일간 좌우라벨 2·24시간행·모달 시/분 인풋·반복칩 8·드롭다운 제거·**콘솔 에러 0**.

### 16.32 v0.9.53 — 시간 일정 블록에 세부 식순(rundown) 첨부
- 사용자: "개영식 같은 행사는 행사 세부 일정을 업로드할 수 있게" → AskUserQuestion으로 **식순 표 직접 입력 + 잼버리 일정표 블록에 부착** 확정(파일 업로드 아님).
- **세부 식순**: 시간 일정(timetable) item에 `rundown:[{time,title,note}]` 추가. 시간 일정 모달 하단 '세부 일정·식순' 섹션 — 시간·순서/내용·비고 행 인라인 입력(`rd-in`)·순서 추가/삭제. 포커스 유지 위해 input은 데이터만 갱신(추가/삭제만 재렌더).
- **commitTT**: rundown을 빈 행 제거 후 저장. **반복(_repeat) 복제에도 rundown 깊은복사**.
- **블록 배지**: 식순이 있는 블록에 `식순 N단계`(fileText 아이콘) 표시. 블록 클릭→모달에서 식순 보기·편집.
- API `cleanTT`에 `rundown`(최대 80행, time≤20·title/note≤200) 추가.
- 검증: 헤드리스 — 모달 식순 섹션·행 추가 2·제목/시간 입력→commit→**저장 1행(빈 행 필터)**·firstItem {20:00,개회 선언}·블록 식순 배지 1·**콘솔 에러 0**.

### 16.33 v0.9.54 — 연맹 칩+국가검색 · 캘린더 회색검색 · 반복수정 범위 · 일간 식순 인라인
- **분단 연락망 연맹=칩**: `federations`(콤마문자열)을 칩으로 렌더(`fedchip`), 칩별 ✕삭제 + `+연맹·국가` 입력칸 Enter추가. 상단 검색(`div-search`) — 일치 칩 `.hit`(accent), 비일치 분단행 `.rowdim`(흐림). `divFeds/setDivFeds`.
- **캘린더 검색 = 회색처리**(숨김 X): 기존 `vis` 필터(비일치 숨김)→ 전체 렌더 + 비일치에 `.ghost`(콘텐츠/시드/미니/이벤트띠/의전/상태점 전부). 일치만 색 유지. cell `.dim` 제거.
- **반복 일정 수정 범위**: 반복 생성 시 base+복제에 공통 `series` id 부여(`ttCopy`). 시리즈 멤버 수정 commit 시 `askSeriesScope` 다이얼로그(이 일정만 / 모든 반복 / 취소). '모든'=날짜 제외 필드(제목·시간·종류·장소·메모·담당·연락처·식순) 시리즈 전체 적용. API `cleanTT`에 `series`.
- **일간 뷰 식순 인라인**: 식순 있는 블록이 **일간(day)뷰에선 블록 내부에 단계(`ttg-rd` 시간·내용·비고) 인라인 표시**, 전체기간뷰는 `식순 N단계` 배지. ⚠️ 배지 글씨 안보임 버그(블록 흰글씨인데 `.ttg-evp.rd` 색 #234636) → `#fff`로 수정.
- 검증: 헤드리스 — 칩 40·'대만'검색 hit4/rowdim3·캘린더 ghost(숨김0·전부 렌더)·시리즈 3링크·수정 다이얼로그·'모든'적용 3·일간 식순 인라인 2행/기간 배지1·**콘솔 에러 0**.

### 16.34 v0.9.55 — 일간 식순을 시간 비례 서브타임라인으로
- 사용자: 식순을 텍스트로 펼치지 말고 "실제 해당 영역 안에서 시간 캘린더에 맞춰" 표기. → 일간(day)뷰에서 식순(시간 있는 단계)을 **블록 내부 절대배치 서브타임라인**으로: 각 단계 `top=(t2h(step)-eventStart)*TT_HH`, height=다음 단계까지(min 13px). 블록 제목은 우상단 핀 라벨(`ttg-rdtitle`), 단계는 `ttg-sub`(시간·내용 흰 글씨, 상단 구분선). `has-rd` 블록 padding 0으로 정확 정렬. 시간 없는 식순/전체기간뷰는 기존(배지·일반 블록).
- 검증: 헤드리스 — 14:00–15:30 + 식순 5단계 → 서브세그 top 0/14/42/84px(=시간오프셋×84) 정확 정렬·제목 핀·**콘솔 에러 0**.

### 16.35 v0.9.56 — 식순: 시간비례 절대배치 → 기본 블록 + 내부 미니 타임라인 리스트
- 사용자: "기본 타임라인 살리고 그 안에 서브타임라인. 지금 3분단위 쪼개져 보기 불편." → 16.34의 시간 엄격 절대배치(3분 간격 단계 겹침) 폐기. **기본 이벤트 블록(제목·시간 헤더) 유지 + 내부에 식순을 균일행 리스트**(`ttg-rd`/`ttg-rd-row` = 시각 점·시간·내용, 좌측 세로 레일 `ttg-rd::before`)로. 시간순 정렬은 유지하되 균일 높이라 단계 밀집해도 안 겹침·가독. 전체기간뷰는 `식순 N단계` 배지. `has-rd`/`ttg-sub`/`ttg-rdtitle` 제거.
- 검증: 헤드리스 — 발대식 14:00–15:30 + 7단계(3분 간격 포함) → 블록 헤더 유지·식순 7행 리스트·firstRow '14:00 개회 및 내빈소개'·**콘솔 에러 0** + 스크린샷(레일·점·시간·내용 깔끔).

## 17. scout-finder 관리자 — Google 인증 + /admin 이전 + 샘플 정리

### 17.1 v0.9.58 — 샘플 단위대 전체 삭제(data.js 폴백 비움)
- 사용자: "단위대 찾기 데이터 샘플 모두 삭제." `data.js`의 `window.SCOUT_UNITS`(샘플 25개)를 `[]`로 비움. `SCOUT_NSOS`(176국)·`SCOUT_REGION_COLORS`는 유지. ⚠️ 공개 사이트는 `/api/units`(KV)를 우선 읽으므로 **라이브 KV의 샘플 25개는 별도 삭제 필요**(아래 17.2 Clear all units로 처리).

### 17.2 v0.9.59 — 관리자 인증을 Google 로그인 전용으로 + /admin 이전 + 기능 문서
- 사용자 4건(AskUserQuestion 확정): (1) 관리자 경로 manage→**admin**, (2) 개인정보 보호 위해 **Google Auth**, (3) **비밀번호 폐기, Google 인증만**, (4) UX 디자인은 직접 개발 예정 → 대신 **전 기능 문서화** 요청.
- **인증 교체**(`functions/api/_lib.js`): `isAdmin`(X-Admin-Token 비번) → **async Google ID 토큰 검증**. `verifyGoogleIdToken`(Google JWKS 서명검증 + `aud==GOOGLE_CLIENT_ID`·iss·exp·email_verified) + `adminUser`(이메일이 `ADMIN_EMAILS` 화이트리스트에 포함). JWKS 1h 캐시. 호출부 5개(`units` PUT·`submissions` GET/PATCH·`comments` GET/DELETE·`log` GET) 전부 `await isAdmin`로 변경.
- **신규 엔드포인트**: `auth-config.js`(공개 GET → `{googleClientId}`) · `me.js`(GET → 검증된 `{ok,email}` 또는 401).
- **경로 이전**: `manage.html`→`admin.html`, `manage.js`→`admin.js`(git mv). `/manage` 제거(→`/admin`). index.html 푸터 링크 `/admin`로.
- **프런트 게이트**(admin.html/admin.js): GIS 스크립트 + `#auth-gate` 오버레이(로그인 전 헤더·에디터 숨김). `Auth` 모듈 = auth-config로 clientId 로드→GIS 버튼→credential→`/api/me` 검증→`body.authed`+`init()` 1회. 저장은 `Authorization: Bearer <id_token>`(구 X-Admin-Token·prompt 비번 제거). 401/만료 시 재로그인 안내(로컬 드래프트 보존). "Signed in as …"+Sign out.
- **Clear all units 버튼**: 전체 비우기(확인)→`units=[]`→자동저장 PUT → **KV 샘플 정리용**(라이브 KV 25개는 사용자가 로그인 후 1클릭으로 제거).
- **환경변수**: `GOOGLE_CLIENT_ID`(공개, aud+프런트)·`ADMIN_EMAILS`(콤마, 미설정=관리 불가 안전기본). `ADMIN_TOKEN` 폐기. 사용자가 Pages 대시보드 env에 설정 + Google Cloud OAuth 웹 클라이언트(JS 원본 jimmypark.net) 발급 필요.
- **전 기능 문서**: `FEATURES.md` 신규 — 3앱(scout-finder 공개/admin, /jamboree, /jamboree-plan) + API + KV + env + 운영 한 문서 정리.
- 검증: `node --check` 8파일 OK + 라이브 배포 후 `/api/auth-config`·인증 없는 PUT 401·공개 GET 정상 확인.

### 17.3 v0.9.60 — 공개 홈 인라인 편집기 제거(비번 프롬프트 노출 차단)
- 발견: 공개 `index.html`/`app.js`에 카드별 `✎ Edit` 버튼(`data-edit`)→`prompt("Admin password:")`→`X-Admin-Token` 저장의 **숨은 인라인 관리자 편집기**가 모든 방문자에게 노출돼 있었음. Google 전용 인증 전환으로 이 비번 경로는 깨짐(401)이고 "비번 금지" 방침과 충돌.
- 조치: 카드 HTML에서 `card-tools(✎ Edit)` + `edit-panel` 제거 → **공개 페이지 보기 전용**. 진입점(카드 Edit 버튼)이 사라져 편집/저장/삭제/`prompt` 함수 전부 **도달 불가**(`#edit-toggle/#add-btn-home/#save-btn`는 원래 index.html에 없음). 편집은 이제 `/admin`(Google)에서만.
- 잔여 편집기 JS는 호출처 없는 죽은 코드(무해) — 추후 정리 권장. 검증: `node --check` OK + 라이브 공개 페이지에 Edit 버튼 0.

### 17.4 v0.9.61 — 공개 app.js 死코드(인라인 편집기) 완전 제거
- 사용자: "필요없는 것들은 모두 삭제." 17.3에서 진입점만 막았던 공개 편집기 JS 전부 제거(약 11.5KB): `getToken`(prompt)·`saveServer`(X-Admin-Token)·`scheduleSave`·`reflectEditUI`·`toggleEditMode`·`openEdit`·`onEdit*`·`editGeocode`·`editFormHtml`·`countryOptions`·`addUnit`·`unitIndex`·`editPanelFor`·`editCoordText` + 전용 변수(`TOKEN_KEY`·`editMode`·`saveTimer`·`SECS`·`NSOS`·`round5`·`applyCountry`) + init 배선(edit-toggle/save-btn/add-btn-home, onEdit 리스너, $list 클릭의 data-edit 분기). `$list` 클릭은 카드→`setActive`만 유지.
- CSS는 보류: `section-toggle`·`readonly-line`·`coord-row`·`sections-box`는 `/admin`(admin.js)도 사용 → 공유. 죽은 편집기 CSS(`edit-form`·`ef-l`·`edit-panel`·`card-tools` 등) 정리는 디자인 자료 수령 후.
- 검증: `node --check` OK + 제거 식별자 11종 잔여 참조 0 + `card-tools/edit-panel/data-edit` 문자열 0.

### 17.5 v0.9.62 — scout-finder 전면 리디자인(공개+관리자) 적용
- 사용자 디자인 시안(`scout-finder/*.dc.html`, Bricolage+Hanken, 보라 #6336B5) 적용. 시안=디자인툴 React 컴프 → **vanilla 프로덕션으로 포팅**, 기존 백엔드(/api/units·/api/comments·Google 인증)에 연결. 원본 시안은 deploy 루트 밖(`../scout-finder-design/`)으로 이동.
- **새 데이터 모델**: `kind`(unit/office/heritage) · region **코드**(APR/EUR/ARB/AFR/IAR) · `tags[]`(office/heritage 카테고리) · `status`(published/draft) · `contact`(none/instagram/homepage)+`url` · `address` · `desc`. 기존 데이터 비어 깔끔 채택하되 `normUnit`이 옛 필드(type/place/note/homepage/region 풀네임) 흡수. 공개는 status!=='draft'만 표시.
- **REGION 팔레트**: APR #6A3FB5 · EUR #2F6FB0 · ARB #2E8B6B · AFR #C26A2E · IAR #C23E6E (JS 코드 상수).
- **공개**(`index.html`+`app.js`): 풀스크린 CARTO Voyager 지도 + 좌측 글라스 결과패널(접기) + 우측 지역 범례 + 하단 검색바(**Near me 지오로케이션** + Nearest unit/office/heritage 퀵) + 우측 댓글 드로어. 거리정렬(haversine)·지도클릭 앵커·검색 centroid 앵커. 댓글=서버 `/api/comments`(GDPR·IP 마스킹·24h). 마커=랭크 핀(office 사각/heritage ★)+상시 라벨+팝업.
  - ⚠️ **GPS 미사용 규칙(§1) 변경**: 시안의 'Near me'(navigator.geolocation) 채택. 검색·지도클릭도 병행.
- **관리자**(`admin.html`+`admin.js`): 시안 적용(툴바·좌측 레일·중앙 폼 Basics/Affiliation/Profile/Contact/Location·우측 드래그 지도·Import 모달·토스트). **Google 인증 게이트 유지**, 저장=`/api/units` PUT(Bearer) 700ms 자동저장. 국가 자동완성=SCOUT_NSOS(176)→region 코드 변환. Import `{"units":[]}`로 전체 비우기(KV 샘플 정리 대안).
- `styles.css` 전면 교체(디자인 글로벌; 컴포넌트 시각=마크업 인라인 고충실 포팅). 폰트=Google Fonts(Bricolage+Hanken), leaflet=unpkg.
- 검증: `node --check`(app·admin) OK + 로컬 헤드리스 스크린샷(공개=지도+패널+칩+범례+검색바 정상, 데이터 0='No places found'; 관리자=Google 게이트 렌더). 게이트 안쪽 UI는 라이브 Google 인증 후 검증.

### 17.6 v0.9.63 — GPS 규칙 채택 + 위치 제보(공개) → 관리자 승인
- **GPS 규칙 변경**: §1 'GPS 미사용' 폐지 → **사용 가능**(Near me) 명문화.
- **공개 'Report a location'**: 좌측 패널 하단 Download JSON 제거 → 그 자리에 **위치 제보 버튼**. 모달 폼(`#report-modal`): **제보자 이름·소속(필수)** + 장소명·종류(unit/office/heritage)·국가(SCOUT_NSOS 자동완성 NSO/region/lang)·설명·섹션(unit)·연락(none/instagram/homepage+URL)·주소검색(Nominatim→lat/lng). 제출 → `POST /api/submissions {unit, reporter}`. 성공 안내.
- **submissions API**: POST에 `reporter{name,affiliation}` 저장(둘 다 필수, 없으면 `reporter_required` 400). pending item에 `reporter` 포함, approve 시 unit만 units에 추가(reporter 비포함).
- **관리자 승인 UI**: 툴바 **Reports 버튼+미처리 카운트 배지**. 모달(`#pending-modal`)에 제보 목록(장소 요약 + 제보자 이름·소속·IP·시각) + **Approve/Reject**. approve→`PATCH approve`→units 반영(선택 유지 후 재로드), reject→confirm 후 `PATCH reject`. 부팅·열람 시 `GET /api/submissions`(Bearer)로 갱신.
- 검증: `node --check`(app·admin·submissions) OK + 헤드리스 스크린샷(제보 모달) + 라이브 스모크.

### 17.7 v0.9.64 — 관리자 인증을 Google 로그인 → TOTP(인증 앱 6자리)로 교체
- 사용자: "구글 로그인 필요없어 / Google Authenticator OTP로 로그인" (AskUserQuestion 확정: OTP 코드만·비밀키 내가 생성). 17.2에서 도입한 Google Auth 폐기.
- **백엔드**(`functions/api/_lib.js`): `verifyGoogleIdToken`/JWKS/`ADMIN_EMAILS` 제거 → **TOTP**(RFC 6238, HMAC-SHA1, base32 `env.TOTP_SECRET`, ±1 타임스텝) + **세션 토큰**(`issueSession`: `<expSec>.<base64url(HMAC-SHA256)>`, 키=`"sess:"+TOTP_SECRET`, 12h). `adminUser`=세션 서명·만료 검증→`{admin:true}`. **시크릿 교체 시 전 세션 무효화**.
- **신규** `functions/api/login.js`: `POST {code}`→TOTP 검증→세션 발급(`{ok,token,exp}`/401/429/503). IP당 10회 실패/10분 KV 레이트리밋.
- `auth-config.js`→`{mode:"totp",configured}`, `me.js`→`{ok:true}`(이메일 제거).
- **프런트**(`admin.html`/`admin.js`): GIS 스크립트·`#g-signin` 제거 → 6자리 OTP 입력 게이트(`#otp-form`/`#otp-input`). `Auth`=`POST /api/login`→세션토큰 메모리+localStorage(`scoutfinder:admin-session`, 12h, 재방문 시 `/api/me` 재확인). 관리 호출 `Authorization: Bearer <session_token>`. 401→"enter a new code".
- **환경변수**: `TOTP_SECRET`(base32, 시크릿) 1개로 단순화. `GOOGLE_CLIENT_ID`·`ADMIN_EMAILS`·`ADMIN_TOKEN` 폐기. ⚠️ 사용자가 Cloudflare Pages env에 `TOTP_SECRET` 설정 + 인증 앱에 같은 키 등록 필요(otpauth URL/QR 또는 수동 base32).
- 검증: RFC 6238 테스트 벡터(287082·081804) 일치 확인 + `_lib.js` ESM 임포트 라운드트립 13/13 PASS(TOTP accept/reject·세션 발급·위조/만료/시크릿교체 거부) + `node --check` admin.js·4개 함수 모듈 임포트 OK.

### 17.8 v0.9.65 — 제품명 Scout Finder → Scout Tour Assistant (표시 텍스트)
- 사용자: "프로젝트명도 Scout Finder 말고 Scout Tour Assistant가 좋아보여." **사용자에게 보이는 브랜드명만** 교체(5곳): `index.html` title·홈 헤더, `admin.html` title·인증 카드 h1·툴바 로고. (otpauth 발급 issuer 라벨도 'Scout Tour Assistant Admin'으로 갱신.)
- **내부 식별자는 유지**(변경 시 세션/저장/데이터 깨짐): localStorage `scoutfinder:*`, KV 네임스페이스 `SCOUT_KV`, 폴더/파일 `scout-finder`, Cloudflare 프로젝트 `jimmyport`, 코드 주석. 필요 시 추후 별도 작업으로 코드네임 리네임.
- 검증: deployable(`*.html/js/css`)에서 표시 'Scout Finder' 잔여 0 grep 확인.

### 17.9 v0.9.66 — 데이터 초기화 + 줌 클러스터링 + 세로꽉참 minZoom + 팝업 풀주소 복사 + World Bureau + 관리자 패널 리사이즈 + 버전표기
- 사용자 다건 일괄: (1) 등록 데이터 전체 삭제, (2) 줌아웃 시 지역/국가별 묶음, (3) 지도 축소 시 상하 여백 0, (4) 팝업에 풀 주소 표시 + 클릭 복사, (5) Region에 **World Bureau(WSB)** 카테고리 추가, (6) 관리자 지도↔폼 좌우 드래그 리사이즈, (7) 공개 푸터 Admin 아래 현재 버전 표기.
- **데이터 삭제**: 인증 세션으로 `PUT /api/units {units:[]}`(권한 있는 삭제, 스모크 아님) → count 0. data.js 폴백도 비어 공개 사이트 'No places found'.
- **줌 클러스터링**(`app.js` renderMarkers + `zoomend`): `z<=3` 지역(WSB 포함 region)·`z<=5` 국가(country)·그 이상 개별 핀. 그룹 centroid에 카운트 버블(`clusterHtml`, 색=지역색), 툴팁 "이름 · N". 버블 클릭 시 `flyToBounds`(region→maxZoom5·country→9)로 드릴다운. 단일 그룹은 flyTo 7. 검증(헤드리스 CDP, 25 units APR): world=1버블(Asia-Pacific·25)·zoom5=5국가버블·zoom8=25핀.
- **세로 꽉참 minZoom**(`fitMinZoom`): `ceil(log2(viewportH/256))`(최소2)로 minZoom 동적 설정 → 완전 축소해도 세로 여백 0. `maxBounds`=월드 + `maxBoundsViscosity:1`. resize 시 재계산. 검증: 1213px 높이 → minZoom 3, 회색 띠 없음.
- **팝업 풀주소 복사**(`popupHtml` + 위임 클릭): `u.address`를 핀아이콘+주소+'Copy' 힌트 행으로 표시, 클릭 시 `copyText`(clipboard API+execCommand 폴백) → 힌트 'Copied ✓'. `data-copy` document 위임 리스너.
- **World Bureau**: `REGION.WSB={full:'World Bureau',color:#4B4E8A}` + REGION_FULL 역매핑(app.js·admin.js 공통). 공개 범례·지역칩에 WSB 추가(검증: 범례 6행·칩 7개). 관리자 폼에 **Region 셀렉트(`f-region`, 6종)** 신설 — 국가 자동채움과 별개로 수동 지정(WSB 등), NSO·언어만 자동 표기로 분리.
- **관리자 패널 리사이즈**(`admin.html` `#col-splitter` + `admin.js initSplitter`): 폼↔지도 사이 드래그 핸들(pointer 이벤트), 폭 `localStorage scoutfinder:admin-mapw` 저장, 드래그 중 `map.invalidateSize()`, rail+최소폼 고려 clamp.
- **버전 표기**: 공개 푸터 Admin 아래 `#app-version`(app.js `loadVersion`→`/VERSION`). **캐시 버스팅**: index/admin html의 app.js·admin.js·styles.css·data.js·version-watch.js 참조에 `?v=0.9.66`(배포 즉시 새 JS 적용, 반복되던 캐시 문제 해소).
- 검증: `node --check`(app·admin) OK + 헤드리스 Chrome CDP(클러스터 3단계·minZoom·팝업복사행·범례WSB·버전·콘솔 정상).

### 17.10 v0.9.67 — HTML no-cache(_headers) + 관리자 30분 유휴 타임아웃 + minZoom 재확인
- **캐시 근본 해결**: 사용자가 배포 후에도 옛 HTML→옛 app.js를 봐서(범례 WSB 없음·옛 minZoom 여백) 수정이 반영 안 됨. 원인=HTML 브라우저 캐시(?v= 버스팅은 HTML이 신선해야 작동). → `_headers` 신설(`/* Cache-Control: no-cache`) → 모든 정적 자산 매 로드 재검증(ETag 304), 배포 즉시 반영. (`?v=0.9.67`은 방어용 유지.) ⚠️ `/admin.html`은 `/admin`으로 308 — curl 검증은 클린 URL로.
- **관리자 30분 유휴 타임아웃**(`admin.js` Auth): `IDLE_MS=30분`. `startIdle`이 pointerdown/keydown/input/change/wheel/touchstart(capture)로 `resetIdle` → 활동마다 카운트다운 초기화. 만료 시 세션 클리어+게이트("Signed out after 30 minutes of inactivity."). onAuthed에서 시작, showGate/signOut에서 stopIdle. (서버 세션 12h는 유지, 클라 유휴 로그아웃만 추가.)
- **minZoom 재확인**(사용자 재요청): 헤드리스 2560×1400 → minZoom 3, setZoom(0) 클램프=3, worldHeightPx 2048≥뷰포트 1313(fillsHeight true·bounds ±75) = 상하 여백 0·더 축소 불가 확인. 코드는 v0.9.66부터 정상이었고 캐시로 미반영이었음.
- **데이터 삭제 반영 확인**: `PUT units:[]` 후 KV 전파되어 GET count 0(공개 'No places found').
- 검증: `node --check` admin.js OK + 헤드리스(minZoom/클램프) + 라이브 `_headers` no-cache·clean URL.

### 17.11 v0.9.68 — 관리자 수동 Save 버튼 + 좌표 직접입력 + 다중 Contact(전화/인스타/이메일/홈페이지) + Profile 기본 접힘
- 사용자 4건: (1) 각 장소 수동 Save 버튼, (2) 위/경도 직접 입력, (3) Contact를 전화·인스타·이메일(+홈페이지) 각각 추가/공백 허용, (4) 폼에서 Profile 기본 접기.
- **수동 Save**: `save(manual)`로 확장(수동 시 토스트), 폼 헤더에 Save 버튼(`data-act="save"`→`saveNow`). 자동저장(700ms 디바운스)은 유지.
- **좌표 직접입력**: 기존 `f-lat/f-lng` input이 매 키 입력마다 `setCoords`로 **값을 재포맷**(`37.`→`37.00000`)해 타이핑 불가였음. → `onLatLngInput`(입력 중엔 모델·마커만 갱신, 인풋 값 미수정) + `commitLatLng`(blur/Enter 시 clamp·반올림·재포맷). `inputmode="decimal"`. 검증: '37.12' 타이핑 후 값 유지.
- **다중 Contact**: 단일 `contact`(none/instagram/homepage)+`url` 모델 폐기 → `instagram·homepage·phone·email` 4개 독립 옵션 필드(모두 공백 가능). `normUnit`(app.js·admin.js 공통)이 구모델(contact/url) 마이그레이션. 공개 팝업/목록은 있는 항목만 링크(Instagram·Homepage·전화 tel:·이메일 mailto:), 없으면 'Contact the national scout org'. 공개 **Report 폼**도 4필드로 교체. 관리자 승인 모달도 4필드 표시.
- **Profile 기본 접힘**: 폼 카드 5종(Basics/Affiliation/Profile/Contact/Location)을 접이식(`card()` 헬퍼 + `state.collapsed`, 헤더 클릭 토글·쉐브론). `collapsed.profile=true` 기본. DOM 토글(재렌더 없이 포커스 보존).
- 검증: 헤드리스 CDP — 공개(목록·팝업 4링크·Report 4필드) + 관리자(Fetch로 /api/me·/api/units 목업해 게이트 통과: Save 버튼·4 contact+lat/lng 필드·**Profile 기본 display:none**·Basics 표시·'37.12' 미재포맷·Profile 토글 펼침). `node --check` app·admin OK.

### 17.12 v0.9.69 — 좌표 'Show on map' 버튼 + 소수점 입력 오류 재확인
- 사용자: (1) 위/경도 입력 옆 **확인 버튼**으로 위치 표시, (2) 소수점이 안 찍히는 오류 확인.
- **소수점 오류**: 재현 결과 **v0.9.68에서 이미 해결됨**(구버전 `setCoords(v||0)`이 매 키 입력마다 `toFixed(5)`로 재포맷 → '.' 직후 '37.00000'이 되어 소수 입력 불가였음). 헤드리스 실제 키 입력 `3 7 . 5 6 → 37.56` 정상. 라이브 admin.js에 `onLatLngInput` 존재·구 핸들러 0 확인 → 사용자는 캐시된 옛 버전이었고 새로고침이면 해결.
- **Show on map 버튼**: Location 카드 위/경도 옆 `data-act="showcoord"` → `commitLatLng`(clamp·반올림·필드 재포맷) + `syncMarker(true)`(해당 좌표로 지도 recenter, zoom≥11). 검증: 48.8584/2.2945 입력→클릭→지도중심 서울→파리 이동.
- 검증: `node --check` admin.js OK + 헤드리스(버튼 존재·center 이동·필드 재포맷).

### 17.13 v0.9.70 — 공개 페이지 좌측 목록 카드 설명(bio) 기본 접기
- 사용자: "좌측메뉴에서 바이오를 접어놔" → (관리자 아니라) **공개 페이지 좌측 결과 목록 카드의 설명**을 기본 접기. (v0.9.68의 관리자 Profile 접기와는 별개.)
- `app.js renderList`: `u.desc` 90자 초과 시 기본 2줄 클램프(`-webkit-line-clamp:2`) + `Show more`/`Show less` 토글(`data-more`, `state.descExpanded[id]`). 90자 이하는 그대로 전체 표시(토글 없음). 토글 클릭은 목록 클릭 핸들러에서 `data-more` 우선 분기 → `renderList` 재렌더.
- 검증: 헤드리스 — 긴 설명 카드 기본 클램프(높이 ~36px·line-clamp 존재)·'Show more' 표시 → 클릭 시 클램프 해제·전체 텍스트·'Show less'.

### 17.14 v0.9.71 — 좌표 정밀도 5→7 소수자리 + 주소 영어 강제
- 사용자: 좌표 소수점 7자리까지. `admin.js` `setCoords`/`commitLatLng` `toFixed(5)`→`toFixed(7)`, 지도 캡션 `toFixed(4)`→7. 공개 Report 폼 `rFind` `toFixed(5)`→7. (관리자 승인 모달 요약은 toFixed(3) 유지 — 편집 필드 아님.)
- **Full address 영어 강제**(사용자: 사이트는 영어 전용): Nominatim 기본은 브라우저 언어를 따라가 한국어 혼입(예 '나이로비, 케냐') → 모든 Nominatim 호출(admin search·reverse, 공개 Report search)에 `&accept-language=en` 추가. 라이브 확인: en='…Sejong-daero, …Jung…' vs ko='…세종대로, 중구, 서울특별시, 대한민국'. ⚠️ 기존 저장된 혼합 주소는 재조회 전까지 유지(신규 조회분만 영어).
- 검증: 헤드리스 — '37.1234567' 입력→Show on map 커밋 후 값 유지, '37.12345678'→'37.1234568'(7자리 반올림). 잔여 좌표 toFixed(5/4) 0. Nominatim en 응답 영어 확인.

### 17.15 v0.9.72 — 공개 목록 컴팩트 행 + 정렬 + 부제목(subtitle)
- 사용자 2건: (1) 좌측 목록을 데이터 많아도 편하게(AskUserQuestion: **컴팩트 행 + 정렬** 선택), (2) 지도에 저장 지명 이름 + **부제목**(본제목보다 작고 회색).
- **컴팩트 행 + 정렬**(`app.js`): `renderList` 전면 개편 — 비선택 항목은 한 줄 요약(랭크 배지·이름 ellipsis·부제목 회색·종류/지역 칩·거리·댓글수), **선택 항목만 상세 펼침**(주소·설명+Show more·섹션/태그칩·연락처·댓글). 행 클릭=`select`(지도 flyTo+팝업+해당 행 펼침), 선택 행 `scrollIntoView`. 상단 `#sort-row` 정렬 칩(Distance/Name/Region, `state.sort` 기본 distance) → `sorted()`가 정렬모드 반영(거리 anchor 없으면 이름순 폴백). `renderSort` + wire 핸들러 + renderAll에 추가.
- **부제목**: 데이터 모델 `subtitle` 추가(normUnit app·admin 공통, addUnit 템플릿). 관리자 Basics 카드 'Subtitle' 입력(`f-subtitle`, 안내 '작게/회색'). 공개 표시: **지도 마커 라벨**(이름 굵게+부제목 작은 회색 2줄, `bindTooltip` HTML)·**팝업**(이름 아래 회색)·**목록 행**(이름 아래 회색 ellipsis).
- 검증: 헤드리스 — 정렬칩 3·컴팩트 3행·부제목 표시·기본 접힘→클릭 시 상세+Show more·Name 정렬 순서·지도 라벨 '이름 / 부제목'(예 'Yeoksam Scout Unit / Gangnam district · since 1971'). `node --check` app·admin OK.

### 17.16 v0.9.73 — 지도 좌우 무한 루프 + 목록 행마다 댓글 버튼 노출
- 사용자: (1) 지도 좌우 무한 루프, (2) 각 지명 댓글(이미 구현됨 — 발견성만 개선).
- **좌우 무한 루프**: `maxBounds`를 위도만 클램프(`[[-85.05,-1e6],[85.05,1e6]]`)로 변경 — 경도는 사실상 무제한이라 타일 wrap+`worldCopyJump`로 좌우 무한 스크롤, 위도는 ±85로 고정(상하 여백 0 유지). 검증: setView lng 400 허용·lat 89→83 클램프·북단 85.
- **댓글 발견성**: 컴팩트 redesign 후 💬가 선택 카드에만 보이던 문제 → 각 컴팩트 행 메타줄에 **클릭 가능한 💬+개수 버튼**(`data-comments`, 0 포함 항상 표시) 노출 → 행 선택 없이 바로 댓글 드로어 오픈(레딧식 쓰레드·GDPR·IP마스킹은 기존). 검증: 행 댓글버튼 클릭→drawer 열림·카드 선택 안 됨.

### 17.17 v0.9.74 — 댓글 금지어 필터(차단) + 관리자 단어 관리
- 사용자: 댓글에 금지어를 **막는**(차단) 필터. (AskUserQuestion '마스킹' 선택했으나 후속 메시지 '금지어를 막는 필터'로 차단 확정.)
- **서버 차단**(`_lib.js`+`comments.js`): `DEFAULT_BANNED`(영/한 욕설·스팸 27종) + KV `comments:blocklist`(관리자 커스텀) = `bannedTerms(env)`. `matchBanned(terms,text)`=원문 소문자 + 비영숫자 제거(tight) 양쪽 substring 매칭(`f.u.c.k`류 회피 탐지). POST /api/comments에서 name+body 검사 → 매칭 시 **400 `blocked_keyword`**(저장 안 함). 짧은 단어 오탐 방지: 목록은 'asshole' 등 완전어 사용('ass' 아님) → 'assemble' 통과 확인.
- **관리자 관리 UI**: 신규 `functions/api/comment-filter.js`(GET admin `{words,defaults}` · PUT admin `{words}`→KV, 최대 1000·중복제거). admin 툴바 'Comment filter' 버튼 + 모달(줄/콤마 구분 textarea, 기본목록 read-only details, Bearer 인증). `openFilter`/`saveFilter`.
- **공개 안내**: `app.js postComment`가 `blocked_keyword`→"contains words that aren't allowed", `consent_required`/`empty`도 친절 메시지.
- 검증: node 매칭 10케이스 전수(차단 6/허용 4, 한/영/tight/커스텀)·모듈 import OK·`node --check` client OK. 배포 후 라이브 비파괴 테스트(욕설 POST→400, 저장 안 됨).

### 17.18 v0.9.75 — 공개 페이지 좌측: 검색형 국가 필터 + Region › 국가 › 지역 그룹 트리
- 사용자: 공개 유저페이지 좌측 패널에 **국가 단위 필터(검색 가능)** 추가 + 목록을 기본 **Region → 국가 → 지역단위**로 그룹.
- **검색형 국가 필터**(`app.js`): region-chips 아래 `#country-filter`(index.html) — 트리거 버튼(🌐 + 현재 선택 + ×클리어 + chevron) 클릭 시 드롭다운(검색 인풋 + 스크롤 옵션). 옵션=현재 kind+region로 스코프된 국가 목록(`availableCountries`, `countryOf(u)=country||nso||"—"`), 각 옵션에 지역색 점 + 카운트. 검색 인풋 타이핑은 `#country-options`만 재렌더(포커스 유지). 선택 시 `pickCountry`(지도 `flyToBounds`로 해당 국가 핀에 포커스). `state.country`로 `sorted()` 필터. region 변경 시 country 리셋. **delegation+재렌더+바깥클릭 레이스**: 필터 내부 클릭은 `e.stopPropagation()`로 바깥-닫기 핸들러 차단(재렌더로 detach된 target이 outside로 오인돼 즉시 닫히던 버그 방지).
- **그룹 트리**(`renderList` 재작성, 행 빌더 `unitRowHtml(u,rank)` 추출): `state.grouped` 기본 ON → Region(색점·풀네임·코드·카운트, collapse) › 국가(들여쓰기·카운트, collapse) › 지역단위(place) 행. anchor+거리정렬이면 그룹을 최단거리순, 아니면 Region 선언순+국가 알파벳순. 헤더 클릭=`collapsedGroups` 토글. `select()`가 선택 단위의 region/country 그룹 자동 펼침. Sort 행에 **Grouped 토글** 추가(끄면 기존 평면 목록, Region 정렬은 grouped 시 숨김).
- 검증: 로컬 http + 헤드리스 Chrome(CDP, 샘플 7곳 APR/EUR·5국): 그룹 트리(r:APR/r:EUR·c:5)·country 검색('ger'→Germany,'kor'→Korea)·선택→해당국만(kr1/kr2)·×클리어→복원·Grouped 토글·Region collapse(EUR만 3)·**콘솔 에러 0** + 스크린샷(드롭다운·트리 그린톤 정상).

### 16.36 v0.9.57 — 사이트 전체 시간 24시간제 통일(로케일 의존 12h 제거)
- 사용자: "이 사이트내에서 관리하는 모든 시간은 24시간 기준으로 세팅." 전수 조사 결과 대부분은 이미 수동 패딩 24h(시계 카운트다운·일정표 그리드/블록·시/분 입력·날씨·저장 토스트). **로케일 의존 12h 위험 3곳만** 교정.
- **scout-finder 댓글 타임스탬프**(`app.js` `fmtTime`): `toLocaleString(...,{timeStyle:'short'})`(OS 영어 로케일에서 AM/PM) → `toLocaleDateString(medium)` + 수동 `HH:MM`(24h).
- **홍보부 캘린더 슬롯 모달 게시/회의 시간**(`jamboree-plan/app.js` ~829): native `<input type="time">`(OS 로케일 12h 픽커) → **시/분 숫자 입력**(`.evtimegrp` 0–23 / 0–59, 빈값=시간 미설정 유지, `pad2` 24h 저장).
- **의전 표 시간 입력**(`renderProtocol` 행, ~1768): `<input type="time">` → 동일 시/분 숫자 입력(`.prtime-h/.prtime-m`, change 시 24h `HH:MM` 저장·`refreshProtocolViews`). 날짜는 `type=date` 유지(AM/PM 무관).
- 검증: `node --check`(app.js·jamboree-plan/app.js) OK + grep으로 `type=time`/`timeStyle`/`hour12`/`toLocaleTimeString` 잔여 0 확인. `.evtimegrp/.evtime` CSS 기존 존재.

### 16.37 v0.9.103 — 대원 개별 ID/PW 로그인 + 대원 기사 탭
- 사용자 2건(AskUserQuestion 확정): (1) 대원이 **사진 2~3장 + 기사**를 자유롭게 올리는 페이지, (2) 대원별 **개별 ID/PW**. 결정: **개별 로그인으로 전면 교체**(공유 비번 `scout1922` 게이트 폐지) · **대원 자가 가입 → 관리자 승인** · 기사 = **jamboree-plan 새 탭** · 기사는 **즉시 게시·본인 자유 수정·삭제만 관리자**(내부 보드, 연맹 SNS 자동게시 아님).
- **관리자 신원 = 기존 TOTP 재사용**(신규 비밀/계정 없음): 게이트의 "관리자 인증코드로 입장" → 6자리 코드 → `/api/login`(기존) → 관리자 세션. 관리자 세션은 게이트 통과 + 승인 대기열·기사 삭제·대원 PW 초기화 권한.
- **백엔드**: `_lib.js`에 `hashPassword`/`verifyPassword`(PBKDF2-SHA256·100k·16B salt, base64)·`issueMemberSession`/`verifyMemberSession`(HMAC 서명, 키=`"member:"+TOTP_SECRET`, 12h, TOTP_SECRET 회전 시 전 대원 세션 무효)·`memberOrAdmin`(관리자→대원 순 Bearer 판정) 추가. 신규 `functions/api/jp-members.js`(KV `jpm:index`+`jpm:user:<u>`; POST register/login 공개·레이트리밋, GET 목록·PATCH approve/reject/reset 관리자) · `jp-news.js`(KV `jpn:<id>` prefix-list; GET 공개, POST 대원/관리자 세션, PUT 작성자 본인/관리자, DELETE 관리자, 사진 최대 3장은 `/api/image` URL만 저장).
- **프런트**: `jamboree-plan.html` 게이트 교체(`#auth-gate` 로그인/회원가입 탭 + 관리자 코드) · `기사` 탭/섹션 + 기사·대원계정 모달 2종 · 헤더 syncbar에 로그인 표시/로그아웃/대원계정(관리자만). `app.js` `wirePwGate`→**`Auth` 모듈**(세션 localStorage `jamboree-plan:session`, `authHeader`/`authJsonHeaders`, 401→재로그인) + `renderNews`/`openNewsEditor`/`commitNews`/`deleteNews`(사진 `downscale`+`uploadBlob` 재사용) + `openMembers`/approve/reject/reset. `setView`/savedView에 `news` 추가. `icon`에 logout/edit/check 추가. `styles.css`에 게이트·기사 카드 그리드·작성 모달 사진 슬롯·승인 목록 + `.fl/.ti/.ta/.btn.xs/.btn.danger/.whoami` 신설.
- ⚠️ 환경변수: 신규 비밀 불필요(서명 키=기존 `TOTP_SECRET`). 관리자=기존 인증 앱 코드.
- 검증: `node --check`(_lib·jp-members·jp-news·app.js) + `_lib` ESM 라운드트립 8/8(PBKDF2 해시·검증·대원 세션 발급/검증/위조·만료·시크릿회전·memberOrAdmin) + 헤드리스 Chrome(CDP, fetch 목업): 게이트→회원가입(pending 안내)→로그인(대원, 대원계정 버튼 숨김)→기사 작성(카드 1, 본인 수정만)→관리자 코드 로그인(관리자·대원계정 버튼·승인 대기 1)·**콘솔 에러 0**. ⚠️ 라이브 운영 KV에 파괴적 쓰기 금지(§16.6) — 테스트 계정/기사는 정리.

---

## 18. 도메인 이전 + 공개 누수 차단 + 라우팅 개편 (scoutingapp.net)
> 사용자: jimmypark.net이 공식 도메인이지만 **노출(주소창)되면 안 됨** → 새 도메인으로 전면 이전. + KMS·문서 현행화.

### 18.1 v0.9.104–0.9.105 — 내부 문서·설정 공개 서빙 차단(_middleware)
- 발견: `pages_build_output_dir="."`(루트 배포) + `.assetsignore` 미지원 → 라이브에서 `CLAUDE.md·KMS.md·FEATURES.md·README.md·DESIGN.md·wrangler.toml·package.json·.gitignore·CNAME·.claude/settings.local.json` 가 전부 **HTTP 200**(관리자 비번 `scout1922`·env명·KV id 노출). `.assetsignore` 는 `wrangler pages deploy`(4.97)가 **무시**함(프리뷰 URL로 확인).
- 조치: `functions/_middleware.js` — 정적 서빙 전에 가로채 `*.md`·`wrangler.toml`·`package*.json`·`.gitignore`·`.assetsignore`·`CNAME`·`.claude/*` 를 404, 그 외(/api/*·정적자산)는 `next()` 통과. 검증: 해당 경로 404, 앱·API·/VERSION 200.

### 18.2 v0.9.105 — 새 도메인 scoutingapp.net 연결
- 사용자가 `scoutingapp.net` 구매 → Cloudflare Pages `jimmyport` 프로젝트 **커스텀 도메인**으로 추가(Active). `jimmypark.net` 은 그대로 둠(사용자: "살아있어도 무방"). 두 도메인이 동일 콘텐츠 서빙.
- 코드: 카드뉴스 OG `og:image`/`og:url`·`twitter:image` + `CNAME` 파일을 scoutingapp.net으로 갱신. **API는 요청 origin(`u.origin`)·이미지/첨부 URL 상대경로(`/api/image?id=`)** 라 도메인 하드코딩 0 → 새 도메인에서 코드·데이터 수정 없이 작동(검증: scoutingapp.net에서 앱·API·문서차단 모두 정상).

### 18.3 v0.9.106 — 카드뉴스 서버백업 scout1922 → TOTP(공개 저장소 대응)
- `jamboree/app.jsx` 의 클라 하드코딩 비번 `scout1922`(서버 미검증 → `/api/jamboree` 사실상 공개) 폐기. **공개 GitHub 저장소라 하드코딩 교체는 무의미** → 서버 검증으로 전환.
- 서버: `functions/api/jamboree.js` GET/PUT/POST/DELETE에 `isAdmin`(Bearer 세션) 강제. 클라: 잠금해제를 관리자 **인증앱 6자리 코드 → `/api/login` → 세션**(localStorage `jamboree:session`, 12h)으로 교체, 서버 호출에 `Authorization: Bearer`. 401 시 재인증. 공개 소스에 비밀값 0. 검증: 무인증 401 ×5, 잘못된 코드 401, 페이지·타 API 200.

### 18.4 v0.9.107 — 라우팅 개편(도구 모음 랜딩 + /tour·/krjam-*)
- 사용자 확정 구조(AskUserQuestion): `/`=**도구 모음 랜딩 허브**(신규 `index.html`, noindex, 4개 도구 카드) · `/tour`=Tour(`tour/index.html`) · `/tour/admin`=Tour 관리자(`tour/admin.html`) · `/krjam-cardnews`=카드뉴스(구 `/jamboree`) · `/krjam-planning`=SNS 캘린더(구 `/jamboree-plan`) · `/krjam-dcount`=신규 자리(사용자가 직접 작성, 플레이스홀더만).
- 구현: HTML 엔트리만 이동/개명(`jamboree/`·`jamboree-plan/` 모듈 폴더명 유지). `tour/*` 는 서브디렉터리라 자산을 **루트 절대경로**(`/app.js`·`/admin.js`·`/styles.css`)로 고정. 구 경로는 `_redirects` 301. 상호링크(`/admin`→`/tour/admin`, jamboree-plan의 `/jamboree`→`/krjam-cardnews`)·카드뉴스 og:url 갱신.
- 검증: 신 경로 200(`/tour`는 308→`/tour/`)·구 경로 301 정확 매핑·자산 절대경로 200·카드뉴스 모듈 200·문서 404.

### 18.6 v0.9.108 — 홍보부 보드 로그인 문구 정리 + 개인정보 수집·이용 동의
- 사용자 요청: (1) 게이트의 "대원 아이디/비밀번호" → **"아이디/비밀번호"**(대원 표현 제거), (2) **"회원가입" → "회원가입 신청"**, (3) 로그인엔 "계정이 필요하면 **홍보부장에게 문의**", 회원가입 신청 후엔 "**홍보부 부장에게 꼭 확인**하여 계정을 부여받으라" 안내, (4) 개인정보 수집·이용 동의 필요 여부 검토.
- 문구(`krjam-planning.html` 게이트 + `jamboree-plan/app.js`): 탭 `회원가입 신청`, 로그인 힌트(홍보부장 문의), 가입 힌트(부장 확인), 버튼 `회원가입 신청`, 성공 토스트/`pending_approval` 메시지 갱신.
- **개인정보 동의(검토 결론 = 필요)**: 가입 시 수집하는 이름·아이디·비밀번호(PBKDF2 해시)·접속 IP는 개인정보 → PIPA 제15조상 동의/근거 필요. 가입 폼에 **[필수] 수집·이용 동의 체크박스**(수집항목·목적·보유기간[~2026-11-09] 고지) 추가, 미동의 시 신청 불가. 서버 `functions/api/jp-members.js` register는 `body.consent===true` 아니면 400 `consent_required`, 레코드에 `consentAt` 저장. ⚠️ 후속 권장: /privacy(현 영문·댓글 중심)에 운영 보드 회원 계정 수집 항목 반영, 만 14세 미만 가입 시 법정대리인 동의(제22조의2).

### 18.5 문서 현행화
- 본 §18 추가 + §3 파일구조 재작성(랜딩/tour/krjam-*/_middleware/_redirects 반영, 옛 manage.html 잔재 제거) + §8 운영규칙(도메인 2개·라우팅·누수차단) 갱신. KMS.md·FEATURES.md·README.md 의 라이브 URL·호스팅·경로도 scoutingapp.net + 신 라우팅으로 갱신.

### 18.7 v0.9.109–0.9.111 — /krjam-dcount D-COUNT 신청 시스템 + D-가로 모듈 추출
- **v0.9.109 버그픽스**: 홍보부 회원가입 동의 체크박스가 세로로 깨짐 — `.auth-box input{width:100%}`가 체크박스까지 늘려 라벨 텍스트를 0폭으로 밀었음 → `:not([type=checkbox])` 제외 + `.auth-consent` flex 규칙. 로그인 힌트 `<br>` 두 줄 처리.
- **v0.9.110 D-가로 모듈 추출**: krjam-cardnews `DDayWide`(1480×1047)를 편집 스토어/Editable 의존 없이 **prop만 받는 독립 모듈** `krjam-dcount/dcard.jsx`(`window.DCountCard`)로. 공유 프리미티브(Card/Logo/Kicker/ShapeScatter/MOTIF/scene/PAL)만 재사용. `krjam-dcount.html`(React, 카드용 자체호스트 폰트 + krjam-planning 그린 크롬). 커스터마이즈 props: 문구(teaser)·상단문구(kicker)·**배경색·글씨색·오른쪽 오브제(SCENES 12종)**. 글씨색 지정 시 숫자/키커/푸터 동일 색, 배경만 지정 시 `idealInk` 자동 대비.
- **v0.9.111 신청 시스템 전체**(사용자: "모든 기능 한 번에 개발, 나중에 일괄 검수"). `functions/api/krjam-dcount.js`(KV): 슬롯 `dcount:slots`(D-40~D-5, **관리자 수동 시딩**, 자동생성 X)·신청 `dcount:app:<no>`(PBKDF2 비번)·**선점잠금** `dcount:lock:<date>`(ACTIVE 상태가 점유)·인덱스 `dcount:index`. **마감 버퍼 없음**(target_date까지 신청). 카드=D-가로 텍스트/그래픽 → **사진 업로드·R2 없음**(초상권 동의는 사진 포함 시 적용 문구).
  - 공개: `GET`(슬롯+점유상태 색) · `POST apply`(5종 동의 필수→**신청번호+비번 1회 발급**+날짜 잠금) · `lookup`/`edit`(검토중만)/`withdraw`(날짜 해제).
  - 관리자(기존 TOTP `/api/login`): `GET ?admin=1`(전체+IP) · `PATCH seed`/`slot`(개폐)/`approve`/`reject`(사유)/`changes`.
  - 프런트 `krjam-dcount/app.jsx`: 캘린더(상태색)·신청 폼(커스터마이저+라이브 미리보기+5종 동의)·발급 모달·조회/수정/철회·관리자(목록·필터·승인/반려·슬롯 시딩/개폐).
- 미결정(O-1~O-5) 기본값: **버퍼 0** · 통지=조회페이지(번호+비번) · 승인본=내부목록(자동 SNS X) · O-2=문구+커스터마이즈(사진 없음).
- 검증: `node --check`(API) + Babel 컴파일(dcard·app) + 헤드리스 부팅(그린 톤·탭·빈 캘린더 안내, 콘솔 에러 0) + API(공개 GET 200·admin 401·apply 검증 400·**KV 쓰기 0**). ⚠️ 슬롯 시딩·신청·승인 실데이터 흐름은 관리자 TOTP 필요 → **사용자 일괄 QA**. 운영 KV 파괴적 쓰기 금지(§16.6) 준수.

### 18.8 v0.9.112–0.9.113 — D-Count 고도화(달력·자동슬롯·이름/전화 인증·A4·마스터스타일·공격내성·오버플로우 제거)
- 사용자 다건 라이브 피드백 일괄 반영(스크린샷 기반 디버깅).
- **슬롯 자동생성**(D-40~D-5, 시딩 폐지)·**마감 없음**(날짜 경과 마감 제거, 관리자 닫힘만). 캘린더=**월 그리드(일요일 시작)**·**15초 실시간 폴링**. 슬롯 상태 점(신청가능/검토중/확정/닫힘).
- **신청번호=신청자 이름, 비번=휴대전화 끝 4자리**(휴대폰 형식 강제). KEY=이름(이름 1건 활성+날짜 1건 선점). 상단문구(kicker) 자동·수정 불가, **카드 문구 2줄**, **오브제 색=배경색 자동 매칭**(밝음=DEEP/어둠=BRIGHT).
- **마스터 스타일**(관리자 전역 여백/크기 → KV `dcount:style`, 모든 카드 적용): 전체여백(pad)·위(topAdj)·아래(botAdj)·**D↔숫자(lead)**·**숫자↔문구(gap)**·숫자크기(numScale) 슬라이더 + 라이브 미리보기.
- **승인 카드 A4(가로 1480×1047) PNG 출력**(html-to-image, 오프스크린 네이티브 렌더, pixelRatio 2). 조회(승인)·관리자 목록에 버튼.
- **관리자 개선**: 통계칩(검토대기/승인/전체)·접이식(마스터스타일+슬롯달력)·검토대기 우선 정렬·**15분 유휴 자동 로그아웃**. 상단 **연맹 문의 02-6335-2000** 배너.
- **공격 내성**(사용자: "공격당해도 안정 운영"): KV TTL 레이트리밋 — apply 8/10분·lookup IP 40·신청번호 7회(4자리 비번 무차별 차단), 실패 카운트·성공 시 클리어, **제네릭 `bad_credentials`**(존재여부 enumeration 차단), 입력 클립.
- **모바일 최적화 고정폭**(480px, PC=좌우 여백만). **오버플로우 근본 차단**: ScaledCard=ResizeObserver+`aspect-ratio`+width:100%, `.dc-wrap *{min-width:0}`(grid/flex 함정), 카드/모달 클립, `.dc-row` 세로 스택.
- 검증: `node --check`+Babel + **CDP 실측(PC1280·모바일390): `scrollW===innerW`(가로 오버플로우 0)·모달 480/358·콘솔 에러 0** + 스크린샷(달력 월그리드·신청 모달 정렬). 실데이터 흐름(시딩 없음→자동, 신청/승인/A4)은 사용자 일괄 QA.

### 18.9 v0.9.114 — D-Count 추가 요구 일괄(달력 5일그룹·사진·로그·엠블럼·동의·전화·표지·BP미디어)
- 사용자 라이브 피드백 다건(스크린샷 기반) 일괄.
- 캘린더: 월 그리드 → **D-40부터 5일 단위 그룹**(D-40~D-36 …). 헤더 엠블럼 비율 깨짐(`.dc-wrap *{min-width:0}`가 flex 아이템 축소) → `flex:0 0 auto` 고정.
- 카드 오브제 색 = **자연물 상식**(c0 해=주황·c3 나무/언덕=초록): 밝은배경 NAT_LIGHT(forest)·어두운배경 NAT_DARK(leaf). 마스터스타일에 **우측 상단 엠블럼 선택**(자동+컬러/흰색/매듭 3종, `cleanStyle.logo`, 카드 Logo 오버라이드).
- 신청: 휴대전화 **자동 하이픈**, 콘텐츠 사용권 동의에 **잼버리 화보집** 활용 추가. 마스터스타일 슬라이더 D↔숫자(lead)·숫자↔문구(gap).
- **승인 후 사진 3장 업로드**(각 5MB, `/api/image` 한도 2→5MB, `POST action:photos` status 승인만, `rec.photos`) + 관리자 카드에 썸네일. **승인 7일 내 미공유 시 무고지 취소** 안내.
- **로그**: 관리자 GET `log`(최근 100) + 접이식 뷰어 + **로그 초기화**(`PATCH action:clearlog` — 초기화 자체는 `log.cleared` 감사 기록을 **무조건** 남김).
- 표지(landing): 카드 제목 풀네임(카드뉴스 제작기/홍보부 통합 관리 플랫폼/디데이 신청홈페이지) + 하단 **BP MEDIA(bpmedia.net)** 링크. version-watch.js = 자체 스타일 **우측 상단 토스트**(국문).
- 검증: node --check+Babel + CDP(PC1280): 5일그룹 캘린더·헤더 엠블럼 원형·**오버플로우 0·콘솔 0** + 스크린샷(캘린더·표지). 사진/로그/엠블럼/승인흐름은 관리자 TOTP·실데이터라 사용자 QA.

### 18.10 v0.9.115–0.9.117 — 디데이 프로젝트 크래시 수정·리네임·세부라우팅·planning 연동
- **v0.9.115 크래시 핫픽스**: dcard.jsx에서 `BRIGHT/DEEP`를 `NAT_DARK/NAT_LIGHT`로 개명하며 `colsForBg`·`scatterFor` 참조를 안 고쳐 `ReferenceError: BRIGHT is not defined`(커스텀 배경색 카드 렌더 시 페이지 다운). 참조 수정. (CDP로 흰배경 lookup 렌더 navOk·에러 0 확인)
- **v0.9.116**: 'D-COUNT 카드' → **'디데이 프로젝트'** 전면 리네임(타이틀·헤더·syncbar·탭·랜딩 카드) + **스카우트 톤** 카피. 상단 **반려 안내**(비속어·상업·정치 → 반려) 배너를 빠른확정 배너 위에. **해시 세부라우팅**(`#/lookup`·`#/admin`, hashchange 동기화). 캘린더에서 '실시간·5일단위' 라벨 + 그룹 헤더(D-40~D-36 …) 텍스트 제거(5개씩 행 그룹은 유지).
- **v0.9.117 planning 연동**: dcount 공개 GET에 `approved`[{targetDate,dNumber,name}] 추가(게시용 카드라 이름 공개 안전). `jamboree-plan/app.js`가 init에서 `/api/krjam-dcount` fetch → `dcountApproved` → 캘린더 셀에 **★ 디데이 D-NN · 이름** 칩(클릭 시 `/krjam-dcount` 새 탭). 검증: 공개 GET `approved` 반환 확인.

### 18.11 v0.9.118 — 사진 올리기 탭·스카우트 가족 톤·관리자 10분 타이머·BP 카드·planning 사진
- 카피: '대원'→'스카우트 가족이 함께 준비하는 잼버리' 톤, '한 대가 맡고' 제거 → "홍보부를 통해 신청이 정상 확인되면 A4로 출력해 사진 촬영하고 올려주세요!" + **4단계 안내 칩**(신청→승인→A4·촬영→사진). 표기 **제16회 한국잼버리 기획조정본부 홍보부**.
- 탭 재구성: **디데이 달력 / 신청 조회 / 사진 올리기**(공개) + 관리자=syncbar 작은 링크. **사진 올리기** = 신청정보(이름+전화4자리) 로그인 → 승인 시 A4 출력+`PhotoUploader`, 미승인/반려/철회는 상태 안내. 신청 조회에서는 업로더 제거(사진 올리기로 안내).
- 관리자 **15→10분** 유휴 타임아웃 + 툴바에 **남은 시간 카운트다운**(⏱ mm:ss, 60초 미만 빨강).
- 랜딩: **BP MEDIA = 2열 가득 채우는 카드**(grid-column 1/-1, 아이콘·설명·bpmedia.net↗).
- planning 연동 강화: dcount `approved`에 **photos·teaser·org** 포함(승인 앱 레코드 read) → jamboree-plan 캘린더 ★디데이 칩에 **사진 썸네일+문구** 표시, 썸네일 클릭=원본 열기(홍보부 SNS 카드뉴스 준비용).
- 검증: node/Babel + CDP(모바일 430): 사진올리기(#/photo)·조회(#/lookup)·관리자(#/admin) 렌더·**해시 라우팅·콘솔 에러 0** + 스크린샷(디데이 헤더·사진올리기 로그인·랜딩 BP카드). planning 썸네일·관리자 타이머·승인흐름은 로그인/실데이터 QA.

### 18.12 v0.9.119 — 관리자 대시보드·반려 모달·기록·상단문구 편집·표현 정리
- 관리자 **대시보드**: 방문자 수(`dcount:visits`, IP/1일 1회 `POST action:visit`)·**클릭 가능한 통계칩**(검토대기/승인/반려/철회/전체→필터)·**10분 유휴 카운트다운 타이머 pill**(60초 미만 빨강).
- **반려 = 모달**(prompt/toast 아님): `REJECT_REASONS` 체크박스(비속어·상업·정치·저작권·정신부합·중복·문구미흡)+**기타 사유** textarea → 사유 합쳐 저장(신청자에게 안내).
- **기록 = D-count 전용**(`dcount:log`): 신청·승인·반려·수정요청·철회 기록(개발 로그 분리). 관리자 뷰 'D-count 기록'. **초기화**(`clearlog`)는 `dcount:log`만 비우되 '기록 초기화' 항목을 **무조건** 남김(테스트용, 라이브 후 보존 의도).
- **상단 안내 문구 편집**: `masterStyle.notice`(관리자 textarea) → 신청 페이지 상단 배너 표시(빈 값=기본 반려 안내).
- 표현: '신청번호'→**'신청자 이름'** 전면 통일. 제출 완료 모달에 **홍보부 1~6시간 승인 안내 + 02-6335-2000**. '사진 공유'→**'D-day 카운트 사진 업로드하기'**(부각 박스).
- 검증: node/Babel + 공개 GET(approved에 teaser/photos)·visit POST 200·admin 401 + CDP 탭 클릭·해시·**콘솔 에러 0**. 대시보드/반려모달/기록/문구편집은 관리자 TOTP QA.

### 18.13 v0.9.121 — 카드뉴스 오브제 점검 + 표지 장면 정리
- 사용자: 카드뉴스 오브제가 조금씩 틀어지고 오버플로우 우려. CDP 전수(6패밀리) 점검.
- **오버플로우 결론(안전)**: 카드는 `overflow:hidden`이라 오브제가 카드 밖(에디터)으로 새지 않음. 측정된 큰 오버플로우(D-피드 worst 304px·표지 88px)는 **배경 매듭 워터마크의 의도된 블리드**(클리핑됨)로 버그 아님. 콘텐츠·소식형 0, 스토리·가로 12~14px(코너 블리더).
- **실제 이슈 = 표지(cover) 장면 클러스터**: `cover.jsx` genScatter가 tree(285)·tent(445)·mountain(560)·campfire(640)·**backpack(820)**를 한 베이스라인(735)에 밀집 → 우측 겹침 + 가방 손잡이(아웃라인 반원) 부유. → **넓게 펼친 캠프 풍경으로 재구성**(해·구름 / 산·언덕 뒤배경 / 나무·텐트·모닥불 전경, 가방 제거, y 760). 표지 5종 공유(커스텀 scatter 없음)라 일괄 적용. 검증: 재캡처 시 겹침 해소·콘솔 에러 0.

### 18.14 v0.9.122–0.9.123 — 카드뉴스 오브제 색을 자연물 상식대로
- 사용자: 오브제 색이 비현실적(나무 핑크·산 보라 등), 배경별 변화도 어정쩡. → MOTIF 기본값은 자연색인데 **호출부가 임의 팔레트색을 덮어쓰는 게 원인**.
- 해결(중앙화·`shapes-comp.jsx`): 각 MOTIF가 **자연색을 강제** — `_lum(전달색)`(배경 대비색의 밝기)로 **밝은/진한 톤만** 고르고 hue는 상식 고정. tree/mountain/hills=초록(밝은 leaf/진한 forest), sun=주황, cloud=흰색/연하늘, tent=따뜻한색(주황/빨강)+**입구는 항상 어두운 그늘(midnight)**, campfire=불색(빨강·주황·연노랑 `FIRE`). 호출부 수정 불필요.
- 검증: 헤드리스 전 패밀리 재캡처 — 흰 구름·주황 해·초록 나무·초록/청록 산·주황 텐트(어두운 입구)·불색 모닥불·초록 언덕, **콘솔 에러 0**. 배경(어두움/밝음)에 따라 톤만 자연스레 변함.

### 18.15 v0.9.124 — 카드뉴스 푸터 번호 두께통일 + 이미지 이동/크기 + 오브제 위치 + 배경 농도
- 사용자 4건: (1) 하단 페이지번호가 너무 두꺼움 → 좌측 '제16회 한국잼버리'와 같은 두께·폰트로. (2) 이미지를 더블클릭하면 상하좌우 이동·크기조절(왼쪽 확장 포함). (3) 오브제(캠프 장면) 위치를 상하좌우 이동(긴 텍스트 가림 방지). (4) 배경색 농도 조정.
- **푸터 번호**(`lib.jsx` AutoFooter): `className="hi"`(Aggravo) + `fontWeight 700` → 좌측 제목과 동일하게 `fontWeight 500`·기본체(Cafe24)·`letterSpacing .01em`. tabular-nums만 유지.
- **이미지 이동/크기**(`base.jsx` Placeholder): 사진 있는 슬롯 더블클릭 → 편집모드(보라 아웃라인+모서리 핸들+'✓ 완료' 버튼). 본문 드래그=이동, 모서리 드래그=크기(scale). 카드 프리뷰 스케일 보정(`conv = rect.w/offsetW / sc`). 트랜스폼 `{dx,dy,sc}`을 `cc-prop:imgxf-<slot>`에 저장 → 프리뷰·PNG 공용. 편집모드 UI는 로컬 state라 PNG 출력엔 안 나옴.
- **오브제 위치**(`shapes-comp.jsx` SceneScatter): scope의 `ox`/`oy`로 ShapeScatter에 `translate` 적용(fallback·SCENES 모두). 우측 패널 '오브제 위치(좌우/상하)' 슬라이더(±500px) — 장면 등록 카드(표지·콘텐츠 01/03/08/09/13·소식C).
- **배경색 농도**(`store.js` `dilute(hex,density)` 흰색 희석 추가): cover·dday가 `bgDensity`(기본100) 적용, 잉크 자동 재대비(idealInk on diluted). 우측 패널 '배경색 농도' 슬라이더(30~100%, cover/dday 배경 섹션).
- 검증: 6모듈 babel 컴파일 OK + 헤드리스 — 패널에 배경색농도·오브제위치 노출, 표지 density40→옅은 보라+오브제 우상단 이동, 소개형 푸터·자연 오브제 정상, **콘솔 에러 0**.

### 18.16 v0.9.125–0.9.126 — 배경농도(사진 비침)·에이브로우 한줄·이미지영역 슬라이더·모든 텍스트 더블클릭
- 사용자 라이브 피드백 다건 일괄.
- **배경색 농도 = 사진 비침**(`cover.jsx`): 기존 dilute(흰색 혼합)은 배경사진을 더 가렸음. → 배경사진 있으면 농도=**색 오버레이 투명도**(낮출수록 사진이 비침), 없으면 기존 흰색 희석 유지. 배경사진 Placeholder는 `bare`(빈 영역 줄무늬 제거). 검증: 초록 사진 + 농도35%→사진 그대로 비침.
- **에이브로우/헤드라인 한 줄**(`lib.jsx` Editable `nowrap` 옵션 → `whiteSpace:pre`): Enter 없으면 자동 줄바꿈 안 함(한 줄), Enter만 줄바꿈. cover 에이브로우·제목 1·2행에 적용. 검증: 긴 에이브로우 clientH 33px(1줄)·whiteSpace pre.
- **이미지 영역 크기/위치**(`base.jsx` Placeholder + `app.jsx` PhotoRow): imgxf 트랜스폼을 **빈 플레이스홀더에도** 적용 + PhotoRow에 '영역 크기/좌우/상하' 슬라이더. (더블클릭 드래그는 사진 업로드 후, 슬라이더는 빈 영역 포함 항상.)
- **모든 텍스트 더블클릭 인라인 편집**: Editable 인라인 편집은 원래 작동(제목·본문·에이브로우 — 헤드리스로 contentEditable 확인). 추가로 **Kicker·CategoryChip에 `ek` 옵션** 추가 → Editable 렌더(더블클릭+우측 패널 자동 필드). THead(대부분 콘텐츠 카드 공통) + 직접 사용처(04·05·06·08·09 kicker/카테고리) + 03 인용출처 + 05 캡션부제 + 11·12 그리드 라벨 배선. cover 카테고리는 기존 중첩 Editable 유지. 검증: 06 카드 'MEALS'·'식사' 더블클릭→contentEditable, 레이아웃 무결·콘솔 에러 0.

### 18.17 v0.9.127 — 사진 프레임내 확대/이동(영역배율 폐기) + 텍스트별 색상 + 그리드 라벨 얇게
- 사용자 정정: 이미지 '영역 배율(sc)'이 아니라 **사진 자체를 프레임 안에서 확대·이동**해 objectFit:cover 자동 크롭을 조절하고 싶음.
- **사진 트랜스폼을 프레임→img로 이동**(`base.jsx` Placeholder): 프레임(슬롯 박스·overflow:hidden)은 고정, `<img>`에 `translate(dx,dy) scale(sc)` 적용 → 확대/이동으로 크롭 조절(왜곡 없음, cover 재적합). 더블클릭 드래그=이동·모서리=확대. PhotoRow 슬라이더 '사진 확대(줌, 1~5)/좌우/상하'(사진 있을 때만). 빈/ bare 플레이스홀더는 트랜스폼 없음. 검증: img `translate(80px,0) scale(2)`.
- **텍스트별 글자색 오버라이드**(`lib.jsx` Editable + `app.jsx` FieldInput): `cc-prop:txtcol[ekey]`. Editable이 있으면 적용(프리뷰·PNG 공용). 패널 각 텍스트 필드에 컬러피커+✕(기본). 사진 위 텍스트 가독성(흰 글자 등). 검증: 라벨 color rgb(255,255,255).
- **이미지 그리드(10) 라벨 얇게**: `className="hi"`(Aggravo 700) → weight 500 기본체(Cafe24) — 하단 '제16회 한국잼버리' 푸터와 동일 톤. 검증: weight 500·Cafe24ProSlim.
- 검증: 헤드리스 — 10 카드 사진 확대/이동(img 트랜스폼)·라벨 흰색·얇은 폰트, 콘솔 에러 0 + 스크린샷.

### 18.18 v0.9.128–0.9.130 — 사진 위 텍스트 그림자 + 디데이 승인문구 + 덱 카드 독립화
- **v0.9.128 사진 위 텍스트 드롭섀도**: Editable `shadow` 옵션 + per-ekey `txtsh` 오버라이드(`cc-prop:txtsh`). 패널 각 텍스트 필드에 '그림자' 토글(글자색 옆). over-photo 라벨 기본 적용: 이미지 그리드(10)·풀이미지(04) 제목·빅넘버(08).
- **v0.9.129 디데이 승인 문구**: krjam-dcount 제출완료 모달 '빠르게 1~6시간' → **'매일 오후 12시·오후 6시경 일괄 검토·승인'**.
- **v0.9.130 덱 카드 독립 인스턴스**(사용자: 같은 폼 3장이 연동됨): 같은 템플릿을 덱에 여러 번 담으면 같은 편집키 공유 → 한 장 수정이 전부 반영되던 문제. **`window.CCScope` 컨텍스트**(인스턴스 접두사)를 모든 per-card 키에 prepend: Editable(텍스트·색·그림자)·Placeholder(이미지·imgxf)·SceneScatter(장면·오브제위치)·cover/dday(자체 prop scope). 덱 프리뷰/썸네일/export는 `CCScope.Provider value={it.k}`로 래핑, 에디터는 `instKey` 상태로 현재 인스턴스 추적(우측 패널 scope·cardKey·footer 인덱스 동기화). **'현재 카드 담기'=현재 카드 내용 스냅샷 복사 → 새 독립 인스턴스**(fields/photos/scenes/scope 키 복사). **1회 마이그레이션**: 키 없는 기존 덱 중복 엔트리는 독립화(첫 장은 내용 유지, 중복은 템플릿 기본값으로 리셋). Logo/tweaks/brand는 전역(스코프 제외). 검증: 로컬+라이브 — 같은 06 템플릿 2장이 서로 다른 키로 독립 렌더(INST_ONE/INST_TWO 각각), 콘솔 에러 0.
  ⚠️ 기존에 만든 연동된 중복 카드: 첫 장만 내용 유지, 2번째부터는 기본값으로 초기화되니 다시 채워야 함.

### 18.19 v0.9.131–0.9.133 — 사진 트윅 재설계(가장자리별 영역 확장 + 빈틈없는 크롭)
- **v0.9.131**: 사진 확대/이동 슬라이더가 `{cur}` 게이트로 사진 없을 때 사라지던 것 → 항상 표시(없으면 흐리게+안내).
- **v0.9.132**(되돌림): 균일 '영역 크기(배율)' + 위치 — 사용자가 "가장자리별로"를 원해 폐기.
- **v0.9.133 가장자리별 영역 확장 + object-position 크롭**: 사용자 2건 — (1) 영역을 상/하/좌/우 **가장자리별로** 키우기, (2) 사진 이동 시 translate라 틀 밖으로 나가 빈 틈 생김 → 보이는 부분만 이동해야.
  - **Placeholder 재구성**(`base.jsx`): outer(슬롯 위치, overflow visible) + **inner div(음수 inset `left:-el/right:-er/top:-et/bottom:-eb`, overflow hidden)** → anchor 스타일 무관하게 가장자리별 확장. 사진은 inner 안에서 `objectFit:cover` + `objectPosition:px% py%`(크롭 위치) + `transform:scale(sc)`(확대). translate 폐기 → **빈 틈 없음**.
  - 우측 패널 PhotoRow: '영역(틀) 가장자리 확장' 위/아래/왼쪽/오른쪽(px, 음수=축소) + '사진 확대·크롭 위치' 줌(1~5×)·크롭 좌우/상하(0~100%). 더블클릭 드래그=크롭 이동, 모서리=확대. 빈 플레이스홀더에도 확장 적용. imgxf 스코프(덱 인스턴스별·deckAdd 복사) 유지.
  - 검증: 헤드리스 — er140·et80 → inner right -140px·top -80px, img objectFit cover·objectPosition 10% 50%, 에러 0 + 스크린샷(영역 우/상 확장·빈틈없이 크롭).
- 글로벌 vs per-card: 행사명·날짜·장소·주최·폰트·본문색·엠블럼·푸터=전역(공통), 카테고리칩·제목·본문·사진=카드별 독립(덱 인스턴스). 사용자 질문(상단 칩 글로벌?)에 답: 카테고리는 카드마다 달라 per-card 유지가 맞고, 특정 요소 전역화 원하면 별도 지정.

### 18.20 v0.9.134–0.9.139 — ZIP깨짐 수정·패널 접이식·칩 통일/글로벌·본문영역·사진 서버저장·scout1922
- **v0.9.134 ZIP/한편 export 깨짐 수정**: 오프스크린 카드를 크기 없는 호스트에 렌더 → absolute-inset 카드가 0폭으로 무너져 텍스트가 한 글자씩 깨짐. **고정 width×height div로 감싸**(메인 프리뷰와 동일) 정상 레이아웃 후 캡처. 검증: 오프스크린 cardW 1080·텍스트 정상.
- **v0.9.135 D-count 승인 문구**: 신청 폼·조회·상단 배너에도 '매일 오후 12시·오후 6시 일괄 승인' 추가.
- **v0.9.136 패널 1차 정리 + 글로벌 칩 + 본문영역**: 우측 패널 '세트 공통' 구분 + 접이식 Section. 카테고리 칩 세트공통(chipBg/chipInk/chipText, DDayTweakCtx). `--cc-textw`로 본문 영역 우측 확장 트윅(Card 콘텐츠 div right 음수).
- **v0.9.137 칩 색규칙 + 전체 접이식 + API 비번**: 칩 글씨색=칩(점) 색, 표지는 글씨/배경 역배색(`dot` 프롭=표지). 모든 트윅/카드별 그룹을 접이식 Section으로. `/api/jamboree`가 `X-CC-Pass`(env.CC_PASS 기본 scout1922)도 허용(관리자 TOTP와 병행).
- **v0.9.138 사진 서버 저장 + scout1922 클라**(사용자 최우선): 사진 업로드를 **`/api/image` POST→URL**로 전환(state 경량·어디서나 로드, 실패 시 dataURL 폴백). 서버 백업을 TOTP→**공유 비밀번호(scout1922)**로 교체(localStorage `jamboree:pass`, `X-CC-Pass` 헤더). 비번 입력 시 저장/목록/불러오기 — 다른 기기·다른 곳에서 같은 비번으로 접근.
- **v0.9.139 핫픽스**: jamboree.js에서 `requireAdmin`→`requireAuth` 정의만 바꾸고 **호출부 4곳 미교체 → 미정의 참조로 500**(error 1101). 호출부 교체. 검증: no-pass 401·scout1922 200·wrong 401, /api/image 업로드 200+서빙, 콘솔 에러 0, 표지 칩 역배색.
- ⚠️ 운영 KV 파괴적 쓰기 금지 준수(읽기·이미지 추가만 테스트). env `CC_PASS` 미설정 시 기본 scout1922(공개 저장소라 노출되나 저작물 초안용 공유 게이트).

### 18.21 v0.9.140 — 칩 점=글씨 일치 + 흰색/커스텀 스와치 + 안내숨김 + 전체접힘 + ZIP 중앙모달
- **칩 점색 = 글씨색 일치**(`lib.jsx` `dotC = ink`): 점이 카테고리색·글씨가 따로여서 틀어지던 것 → 점=글씨 항상 동일. 검증: 06 식사칩 점·글씨 둘 다 주황.
- **스와치 흰색 + 커스텀**(`app.jsx` Swatches): 모든 Swatches에 직접 색 선택(무지개 `+` → `<input type=color>`). 칩 배경/글씨색은 `CHIP_SW`(흰색 포함).
- **편집 안내 텍스트 제거**: 프리뷰의 '텍스트 더블클릭 또는 오른쪽 패널에서 편집' pill 제거(편집은 그대로 동작).
- **사이드 트윅 전체 기본 접힘**: 모든 Section의 `open` 제거 → 기본 접힘.
- **내보내기 진행 중앙 모달**(`busy` 오버레이): ZIP/한편/PNG 생성 중 화면 중앙에 스피너 + 진행(`ZIP n/m`) 표시(상단 토스트만으론 안 보임 해소).
- 검증: 헤드리스 — 전체 접힘·흰 스와치·커스텀피커 2·안내 제거·콘솔 에러 0 + 칩 스샷(점·글씨 일치).

### 16.38 v0.9.141 — 홍보부 보드: 대원→홍보부원 계정 + 회원 유형별 탭 접근 + 2줄 메뉴
- 사용자: 계정 개념을 '대원'→'홍보부원'으로, 관리자페이지에서 회원 유형 결정 + 유형별 접근 탭 구분, 메뉴는 2줄로 보기 편하게.
- **유형(type) 필드**(`functions/api/jp-members.js`): 레코드·인덱스·로그인응답에 `type`('일반' 기본). PATCH `action:'type'`로 관리자가 지정. 가입 시 '일반'.
- **탭 접근 권한**(`app.js`): `MANAGE_TABS=[staff,contacts,orginfo,protocol]`. `Auth.type`(로그인 응답에서 저장) + `Auth.isStaff()`(admin 또는 type==='홍보부') + `Auth.canSee(v)`. `reflectAuthUI`가 관리 탭/관리 행을 비-홍보부에게 숨김. `setView`가 비허용 탭 → 대시보드로. **일반=콘텐츠 탭만, 홍보부/관리자=관리 탭까지.**
- **2줄 메뉴**(`krjam-planning.html` + `styles.css`): 1행 콘텐츠(대시보드·기사·캘린더·리스트·일정표) / 2행 '홍보부 운영'(인원·협조연락처·분단·의전, `#tabrow-manage`, 점선 구분 + 라벨). 일반 회원에겐 2행 숨김.
- **회원관리**(`openMembers`): 승인 회원마다 유형 select(일반/홍보부) → `setMemberType`(change 위임). '승인된 회원'·'홍보부원 기사' 등 명칭 변경(마케팅 시드 '대원 모집'은 유지). 안내: 유형 변경은 회원 재로그인 시 적용.
- 검증: 헤드리스 — 게이트·2줄 메뉴·관리행 4탭·'홍보부 운영' 라벨·명칭 변경·콘솔 에러 0. ⚠️ 유형 지정·접근 차단 실흐름은 관리자 TOTP + 회원계정 필요 → 사용자 QA(운영 KV 파괴적 쓰기 금지 준수).

### 16.39 v0.9.142 — 관리자 정의 회원 유형 + 유형별 탭 접근 + 개인 비번 변경 + 관리자 15분 유휴
- **회원 유형 관리자 정의**(`jp-members.js` KV `jpm:types`={유형명:[탭키…]}, 기본 일반/홍보부): GET이 types 반환, PATCH `action:'types'`로 관리자가 유형 추가/탭 지정/삭제(`cleanTypes` 유효 탭만, '일반' 보존). 로그인이 `member.type→types[type]`로 접근 가능 `tabs` 배열을 응답.
- **유형별 탭 접근**(`app.js`): `Auth.tabs`(로그인 저장)·`canSee(v)=admin||tabs.includes(v)`(tabs 비면 콘텐츠 탭 폴백—구버전 세션 잠금 방지)·`isStaff`(관리탭 보유 여부). `reflectAuthUI`/`setView`가 탭/관리행 가시성·접근 차단.
- **회원관리 UI**(`openMembers/renderMembers`): '회원 유형·접근 탭' 섹션 — 유형별 9탭 체크박스(즉시 저장)·삭제·`+ 유형 추가`. 회원 유형 드롭다운=유형 목록(고정 2개 아님). `saveMemberTypes`(PATCH types)·data-type-tab/data-type-del 위임.
- **개인 비밀번호 변경**: POST `action:'change_password'`(memberOrAdmin로 본인 세션 인증→현재 비번 검증→새 비번). 헤더 '비밀번호 변경' 버튼(비관리자 노출)→prompt 흐름.
- **관리자 15분 유휴 자동 로그아웃**: `resetAdminIdle`(pointer/key/wheel/touch/input/change 활동마다 리셋)·`startIdleWatch`(init)·onAuthed에서 시작. admin일 때만.
- 검증: `node --check`(app·api) + 헤드리스(부팅·게이트·changepw 버튼·유휴/비번 함수·콘솔 에러 0) + API no-auth 401. ⚠️ 유형 추가·탭 지정·접근 차단·15분 유휴 실흐름은 관리자 TOTP+회원계정 필요 → 사용자 QA(운영 KV 파괴적 쓰기 금지).

### 16.40 v0.9.143 — 회원 유형 이름 수정(회원 일괄 이전)
- 사용자: 기존 유형 이름도 수정 가능해야. 유형명을 **수정 가능한 입력칸**으로(칸 밖 클릭 시 적용). `PATCH action:'rename_type'{from,to}` → 유형 설정 키 변경 + 해당 유형 회원(`jpm:index`+`jpm:user`)의 `type` 일괄 이전. 클라 `renameType`(중복 이름 차단·완료 후 openMembers 새로고침). 기본 '일반' 강제 제거 → cleanTypes/로그인 폴백은 첫 유형 사용(빈 설정이면 기본 일반/홍보부 재시드). 검증: node --check + 부팅·함수·콘솔 에러 0.

### 16.41 v0.9.144 — 홍보부 기사 ↔ 카드뉴스 제작기 연결 (+ 기사 수정 확인)
- 기사 수정은 기존 구현(작성자/관리자 `canEditNews`+PUT `/api/jp-news`, 카드 '수정' 버튼). 유지.
- **기사 → 카드뉴스 연결**: 기사 카드에 '카드뉴스 만들기' 버튼 → `localStorage['cc-import']={title,body,images,at}` 저장 후 `/krjam-cardnews` 새 탭. 제작기(`jamboree/app.jsx`)가 마운트 시 cc-import(30분 내) 감지 → 헤더 아래 '📰 기사 가져오기' 배너 → '현재 카드에 채우기'가 현재 카드 `fields`(첫 필드=제목·긴 def=본문)·`photos` 슬롯에 기사 내용/사진 주입 후 cc-import 제거. 검증: 배너 표시·채우기 시 제목 카드 반영·배너 닫힘·콘솔 에러 0.
