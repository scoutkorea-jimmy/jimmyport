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
data.js           SCOUT_UNITS + SCOUT_FEDERATIONS + SCOUT_FEDERATION_COLORS (← 데이터 교체 지점)
version-watch.js  /VERSION 폴링 → 새 배포 시 우측 상단 새로고침 알림
VERSION           사이트 버전 (의미 있는 변경마다 bump)
README.md         실행·교체·배포 안내
```

## 4. 조직 구조 (한국스카우트연맹)
```
단위대(학교대 / 지역대) → 지구연합회 → 지방·특수연맹(22개)
예) 비파지역대 → 목포지구연합회 → 전남연맹
```
- **단위대 종류**: `type` = "지역대"(지역 중심) | "학교대"(학교 중심).
- **22개 연맹** = 지역 18 + 특수 4. 목록은 `data.js`의 `window.SCOUT_FEDERATIONS`.
- **연맹별 고유 핀 색상**: `window.SCOUT_FEDERATION_COLORS` (22색, 상호 절대 중복 금지).
- 데이터 스키마: `{ id, name, type, federation, council, address, lat, lng, sections[], meetingDay, contact, note }`
  - `federation` = 지방·특수연맹, `council` = 지구연합회.

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

## 10. 백엔드 (BUILT — Cloudflare Pages Functions + KV)
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

## 11. 진행 예정 (프런트엔드 통합 — 다음 빌드)
> 백엔드는 완료·검증됨. 아래 프런트 작업이 남음(글로벌·i18n 모델 포함).
- 공개 사이트가 `/api/units`에서 로드(폴백 data.js), 표시 항목 §9 재구성(인스타·연락방법 디폴트).
- **국/영문 i18n (영어 기본)**, 글로벌(APR 우선) 국가 차원 + 스키마에 `country`/`instagram` 추가.
- 공개 **단위대 추가 제안 폼** → `/api/submissions`. 관리자 페이지 **승인 대기/승인·거절 + 로그 + 댓글(IP) 뷰**, 서버 저장(PUT, 비밀번호 게이트).
- **레딧식 쓰레드 댓글 UI** + 닉네임 + GDPR 동의/프라이버시 고지.
