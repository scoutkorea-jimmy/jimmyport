# scoutingapp.net — 전체 기능 정리 (Feature Reference)

> 이 문서는 **사이트(scoutingapp.net) 안의 모든 페이지·기능·API**를 한 곳에 정리한 단일 참조 문서입니다.
> 데이터 스키마·운영 규칙의 상세는 [KMS.md](KMS.md), 의사결정/변경 이력은 [CLAUDE.md](CLAUDE.md) 참조.
> 스택: **Vanilla HTML/CSS/JS** (프레임워크/번들러 없음) + **Cloudflare Pages Functions**(백엔드) + **KV**(저장). 지도는 Leaflet + OSM.
> `/krjam-cardnews`만 예외적으로 격리된 React 페이지.

---

## 0. 사이트 구성 한눈에 (라우팅 v0.9.107)

| 경로 | 정체 | 스택 | 공개/비공개 | 인증 |
|------|------|------|------------|------|
| `/` | **도구 모음 랜딩 허브**(/tour·/krjam-* 링크) | Vanilla | 비공개(noindex) | — |
| `/tour` | **scout-finder** — 가까운 스카우트 단위대 찾기 | Vanilla + Leaflet | 공개(영문) | — |
| `/tour/admin` | scout-finder **관리자**(단위대 CRUD) | Vanilla + Leaflet | 비공개(noindex) | **TOTP**(인증 앱 6자리) |
| `/krjam-cardnews` | 한국잼버리 **카드뉴스 제작기** | React(격리) | 비공개(홈 링크 없음) | 서버 백업만 **TOTP** 세션 |
| `/krjam-planning` | 미디어부(홍보부) **SNS 운영 보드** | Vanilla | 비공개(noindex) | 대원 개별 ID/PW + 관리자 TOTP |
| `/krjam-dcount` | 한국잼버리 **D-Count**(준비 중·자리만) | Vanilla | 비공개(noindex) | — |
| `/api/*` | 백엔드(Pages Functions) | JS modules | — | 공개 GET / 관리 TOTP 세션 |

> 구 경로 `/`·`/admin`·`/jamboree`·`/jamboree-plan` 은 `_redirects`로 신 경로 301. 내부 파일(*.md·wrangler.toml·CNAME·.claude 등)은 `functions/_middleware.js`가 404.

- 배포 대상: Cloudflare Pages 프로젝트 **`jimmyport`** (커스텀 도메인 **`scoutingapp.net`** + `jimmypark.net`, 둘 다 Active).
- 버전: 루트 `VERSION` 파일. 새 배포 감지 시 `version-watch.js`가 우측 상단 새로고침 알림 표시.

---

## 1. scout-finder — 공개 페이지 (`/tour`, `tour/index.html`)

**목적**: 지역을 검색하거나 지도를 클릭하면 그 위치 기준으로 가까운 스카우트 단위대를 **거리순**으로 지도·목록에 표시. (GPS 미사용)

### 검색 / 위치 지정
- 검색어 → 일치 단위대(name/type/NSO/country/region) **centroid**를 기준점(anchor)으로.
- **지도 클릭** 시 그 좌표로 재정렬.
- **haversine 거리 오름차순** 정렬 → 목록·핀 갱신. 거리 표기 **km(소수 1자리)**.
- 기준점 + 가까운 5개에 `fitBounds`.

### 지도 / 핀
- Leaflet 1.9.4 + OpenStreetMap 타일.
- **핀 색 = WOSM 지역(Region)** (`SCOUT_REGION_COLORS`: Asia-Pacific/European/Arab/Africa/Interamerican).
- 핀 번호 = 거리 순위(글자 흑/백 자동 대비). 기준점 핀은 다크 plum 별도.
- **범례**: 지역별 색 안내.

### 목록 카드 / 팝업
표시 항목: 단위대 이름 + 종류(Community/School unit) · **국가 + 지역(Region) 태그** · NSO · 주소(place) · 주요 활동 · 모집 카테고리(Beaver/Cub/Scout/Venture/Rover) · 연락방법(없으면 "Contact the national scout organization") · 홈페이지/인스타그램 링크.

### 댓글 (레딧식)
- 단위대 클릭(카드/팝업 💬) → **그 단위대 댓글 패널**(`unitId` 스코프).
- 쓰레드(대댓글 `parentId` 중첩), 닉네임(localStorage 기억), **GDPR 동의 체크박스 필수**, 공개 IP 마스킹 표시.
- 타임스탬프 **24시간제** 표기.

### 기타
- 결과 없음 → 안내 + "전체 보기".
- 모바일(≤820px): 헤더 **목록/지도 토글**(`body.view-list/view-map`).
- 푸터: **데이터 다운로드(JSON)** + **Admin(`/admin`)** 링크.
- 데이터 로드: **`/api/units`(KV) 우선**, 실패/빈 값(`units:null`)이면 `data.js` 폴백.
- 영문 전용(`<html lang="en">`), aria/키보드 접근성, 콘솔 에러 0 목표.

---

## 2. scout-finder — 관리자 (`/tour/admin`, `tour/admin.html` + `admin.js`)

**목적**: 단위대 추가/수정/삭제 + 좌표 지정. 변경은 **자동으로 KV 서버에 반영**(전 방문자 적용).

### 인증 — TOTP 전용 (Google Authenticator 6자리 코드)
- 페이지 진입 시 **OTP 게이트**(`#auth-gate`)가 전체를 가림. 로그인 전에는 콘텐츠/지도 비노출.
- 인증 앱(Google Authenticator 등)의 **6자리 코드 입력** → `POST /api/login {code}` → 서버가 `env.TOTP_SECRET`(base32)와 대조(±1 타임스텝 허용) → 통과 시 **서명된 세션 토큰** 발급.
- 세션 토큰은 `TOTP_SECRET`에서 파생한 키로 HMAC-SHA256 서명(`<exp>.<sig>`), 유효기간 **12시간**. localStorage(`scoutfinder:admin-session`)에 저장 → 재방문 시 게이트 통과(`/api/me`로 재확인).
- 비밀번호·구글 계정·이메일 전혀 사용 안 함. **비밀키를 가진 사람 = 관리자**(단일 관리자 모델).
- 무차별 대입 방지: `POST /api/login`은 IP당 **10회 실패/10분** 초과 시 429.
- 401(세션 만료) 시 → "Session expired — enter a new code" 안내 + 재로그인(로컬 드래프트 보존). 모든 관리 API 호출은 `Authorization: Bearer <session_token>` 헤더 사용.

### 편집 기능
- **+ Add unit**: 새 단위대 추가(ID 자동 배정 `unit-…`).
- **국가 선택(WOSM 176개 목록)** → NSO / region / language **자동 채움**.
- **좌표 지정**: 지도를 주소로 검색(OSM/Nominatim) 후 클릭("Set on map") 또는 **마커 드래그**. 핀 색 = 지역색.
- **종류**: Community unit / School unit. **모집 섹션**: Beaver/Cub/Scout/Venture/Rover.
- **자동 저장**: 편집 → 900ms 디바운스 → `PUT /api/units`. 로컬 드래프트(`localStorage`) 병행(서버 우선).
- **Reload from server**: 로컬 변경 폐기 후 서버에서 재로드.
- **Clear all units**: 전체 비우기(확인 후) → 빈 배열 저장(샘플/초기화용).
- **Download data.js** / **Copy JSON** / **Import JSON**: 데이터 내보내기·가져오기.
- **Edit/Map 뷰 토글**, 모바일 대응.

---

## 3. /krjam-cardnews — 한국잼버리 카드뉴스 제작기 (`krjam-cardnews.html` + `jamboree/*.jsx`)

**목적**: 제16회 한국잼버리(2026.8.5–8.9, 강원 고성) 카드뉴스를 **제작·편집·PNG 출력·저장**하는 미니앱. 본 앱과 **격리된 React 페이지**(CDN React18 + Babel standalone + html-to-image).

### 6개 카드 패밀리
표지(5) · 콘텐츠(14, 절차/방법 5단계·엔딩 포함) · 소식형(3, 1080×1350) · D-피드(8) · D-스토리(1080×1920) · D-가로(1480×1047). 기본 크기 **1080×1350**(인스타 4:5). 색 = WOSM 팔레트.

### 편집
- 모든 텍스트 **더블클릭 인라인 편집** + 우측 패널 **자동 생성 폼**(카드별 텍스트/사진 자동 등록). 줄바꿈 지원.
- **전역 브랜드**(행사명/날짜/장소/주최/개영문구) 폼.
- **사진 업로드**(슬롯별 교체, 자동 다운스케일) · **엠블럼 선택**(저장 에셋 3종 + 업로드, 밝은/어두운 배경용 2슬롯, 흰색 자동 전환).
- **가운데 오브제(캠프 풍경) 10종 선택** + 형상화 모티프(나무/산/텐트/모닥불/가방 등, 결정론적 스캐터).
- **자동 푸터**(페이지번호+제목, 표지 기준 색).
- **트윅**: 글자색·폰트·자간(track)·글자크기(fz)·여백(pad)·D-day 여백·정렬·D-숫자·워터마크(크기/위치/회전/투명도)·엠블럼(크기/위치).

### 출력 / 저장
- **이 카드 PNG** / **카드뉴스 ZIP**(덱 순서대로 JSZip) / **한 편 PNG**(덱 세로 결합 단일 이미지). 네이티브 해상도 캡처.
- **덱 빌더**(하단 가로 슬라이드): 표지→본문→엔딩 담기/순서변경/빼기, 칩=실제 카드 썸네일.
- **저장(기본 로컬)**: 명명된 카드뉴스를 `localStorage`(`jamboree:projects`)에 저장/불러오기/삭제 + 자동저장. 작성자 이름 선택.
- **서버 백업(선택, 비밀번호 `scout1922`)**: 잠금 해제 후 `/api/jamboree`(POST/GET/DELETE)로 KV 저장.
- 에러 경계(`ErrorBoundary`)로 카드 1개 오류가 앱 전체를 죽이지 않음.

---

## 4. /krjam-planning — 미디어부 SNS 운영 보드 (`krjam-planning.html` + `jamboree-plan/`)

**목적**: 제16회 한국잼버리 **홍보부(기획조정본부)** SNS 운영/콘텐츠/일정/인원을 관리하는 보드. Vanilla. **비밀번호 게이트 `scout1922`**(최초 1회, 이후 기억).

### 상단 탭 (뷰)
**대시보드 · 캘린더 · 리스트 · 잼버리 일정표 · 홍보부 인원 관리 · 협조 연락처 · 분단 연락망 · 의전 일정**

### 4.1 대시보드
- 개영식 **D-카운트**(라이브, 2026-08-05 20:00 KST 기준 `D-N HH:MM:SS`), 통계 6카드(콘텐츠 진행/운영 일정/시간 일정/인원/연락처/진행률 바), 다가오는 콘텐츠·운영 일정 패널(클릭 시 편집).
- **현장 날씨 모듈**(Open-Meteo, 키 없음): 현재 + 3일 예보 + 시간별 12개(미래 중심, 24시간제).

### 4.2 캘린더
- 일요일 시작. 콘텐츠를 **제목**으로 표시(3티어: 실제 콘텐츠/시드/빈 슬롯). 상태는 날짜 옆 작은 점.
- **D-Count 단계**(색 구분): 한국 대표단 D-40~D-22 → 외국 대표단(17개국) D-21~D-5 → 피날레 D-4~D-day.
- **운영 일정 띠(band)**: 회의/공모전/행사 등 여러 날 연속 일정을 띠로(레인 배정).
- **의전 일정**: 시간이 입력된 의전 항목만 금색 칩으로 노출.
- 콘텐츠 호버 **툴팁**(전체 제목+메타), **검색**(비일치 회색 처리), **드래그앤드랍**으로 날짜 이동.

### 4.3 콘텐츠 (슬롯) 편집 — 모달
- 상태(기획/작성중/완료) · 콘텐츠 종류(입력형 콤보, 부서별 색) · 제목 · **채널 복수**(페이스북/인스타/유튜브 등) · **채널별 링크** · 게시 예정 **시간(24시간제 시·분)**/담당자 · 해시태그 · 게시 완료 · 글자 수 카운트.
- **이미지 최대 10장**(다운스케일) + **첨부파일**(`/api/file`, 최대 10MB).
- **SNS용 텍스트 문구 = Tiptap 리치 에디터**(24버튼, 버전 히스토리, 작성자·IP·시간 기록, 평문+해시태그 복사).
- **간단 메모**(Enter 등록, IME 가드).
- **명시적 저장 + 미저장 이탈 가드**(저장/되돌리기/취소).

### 4.4 리스트 / 칸반
- 칸반 보드(기획/작성중/완료 3열), 카드 하단 상태 토글, 진행률 바.
- **필터**: 유형·단계·채널·상태·종류·구분(콘텐츠/회의).

### 4.5 잼버리 일정표 (타임테이블)
- **8/2~8/9 그리드**(세로=시간 00–23시 24h, 가로=날짜). 전체기간 뷰 / 일간 뷰.
- 이벤트 블록 = 종류색, 겹침 레인 분할. **15분 스냅 드래그 이동 + 상/하단 리사이즈**.
- 모달: 종류(입력칩, 색 변경) · 날짜 · **시작~종료(24시간제 시·분 숫자 입력)** · 제목 · 장소 · **담당 인원(roster 다중)** · **협조 연락처(검색형 드롭다운, 최대 3명)** · 메모 · **반복 일정** · **세부 식순(rundown)**.
- 식순 있는 블록: 일간 뷰에서 내부 **미니 타임라인 리스트**(시각·내용), 전체기간 뷰는 "식순 N단계" 배지.
- 의전 항목(날짜·시간)도 일정표에 금색 블록(읽기전용).

### 4.6 홍보부 인원 관리
- **R&R 표**(역할·담당·연락처 편집).
- **현장 배치 = 일정표 파생뷰**: 사람별 담당 일정(언제·어디서·무엇) + 총 투입시간. 담당 미지정 일정 별도 섹션.
- **오프타임(배정 불가 시간)**: 인원 × 날짜 × 3블록(오전 09–12·오후 14–17·저녁 19–22) 토글. 8/3 오후부터 지정 가능. 일정 배정 시 충돌 차단/표시.

### 4.7 협조 연락처 / 분단 연락망 / 의전
- **협조 연락처**: 전역 주소록(이름·소속·직함·전화·이메일·메모) + 검색 + 연결된 일정 칩. 일정 모달에서 검색형 드롭다운으로 연결(동명이인 직함 검색).
- **분단 연락망**: 7분단(분단명·소속 연맹 칩·분단장 등) 편집 + 연맹/국가 검색.
- **의전 일정**: 대회장/부대회장/야영장 등 활동 표(성명/직책 분리, 날짜·시간, 헤더 정렬). 시간 입력 항목만 캘린더/일정표 노출.

### 4.8 공통
- 단일 공유 보드(작성자 이름 기반, 토큰 없음). **로컬 즉시저장 + 서버 자동저장**(per-card, 디바운스). 저장 실패 시 재시도 큐 + 이탈 경고.
- 마케팅 캘린더(연간 시드 표). 보관 고지(잼버리 종료 후 3개월 ~2026-11-09).
- 모든 시간 **24시간제**.

---

## 5. 백엔드 API (`functions/api/`)

> 공개 GET은 인증 불필요. **관리 작업은 TOTP 세션 토큰(Bearer)** 필요(`isAdmin`/`adminUser`).

### scout-finder
| 엔드포인트 | 메서드 | 인증 | 설명 |
|-----------|--------|------|------|
| `/api/units` | GET | 공개 | 단위대 목록(`{units, updatedAt}`, KV 비면 `units:null`) |
| `/api/units` | PUT | **관리** | 전체 저장 + updatedAt + 변경 로그 |
| `/api/submissions` | POST | 공개 | 단위대 추가 제안(승인 대기 + IP) |
| `/api/submissions` | GET / PATCH | **관리** | 대기 목록 / `{id,action:approve\|reject}` |
| `/api/comments` | GET / POST / DELETE | 공개(작성)·**관리**(삭제) | 댓글(GDPR 동의 필수, 공개 IP 마스킹, 삭제는 대댓글 포함) |
| `/api/log` | GET | **관리** | 변경 로그(시각·동작·IP) |
| `/api/login` | POST | 공개 | `{code}` TOTP 검증 → 세션 토큰 발급(`{ok,token,exp}` / 401 / 429 / 503) |
| `/api/auth-config` | GET | 공개 | 인증 모드 안내(`{mode:"totp", configured}`) |
| `/api/me` | GET | **관리** | 세션 토큰 검증(`{ok:true}` 또는 401) |
| `/api/image` | POST | 공개 | 이미지 바이트 업로드 → `{url}` |
| `/api/file` | (POST/GET) | 공개 | 일반 첨부파일(최대 10MB, 다운로드) |

### jamboree / jamboree-plan
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/jamboree` | GET / PUT / POST / DELETE | 카드뉴스 작업 슬롯 + 명명 저장(목록/개별). 서버 백업은 비번 `scout1922` 게이트(프런트) |
| `/api/jamboree-plan` | GET / PUT | 미디어부 보드. per-card 키(`jp:s:<slotKey>`) + `jp:marketing/types/events/timetable/roster/offtimes/contacts/divisions/protocol/ttcats` 등 |

### 인증 메커니즘 (`_lib.js`)
- `verifyTotp(env, code)` → `env.TOTP_SECRET`(base32) 디코드 → HMAC-SHA1 HOTP를 현재 30초 윈도(±1)로 계산해 6자리 코드 대조. RFC 6238 표준(Google Authenticator 호환).
- `issueSession(env)` → `<expEpochSec>.<base64url(HMAC-SHA256)>` 세션 토큰 발급(키 = `"sess:"+TOTP_SECRET`, 12시간).
- `adminUser(request, env)` → `Authorization: Bearer <token>` 추출 → 세션 서명·만료 검증 → 유효 시 `{admin:true}`. `isAdmin` = boolean. **`TOTP_SECRET` 교체 시 기존 세션 전부 무효화**.
- 공통 유틸: `json`, `clientIp`(CF-Connecting-IP), `maskIp`, `getArr/putArr`, `appendLog`, `newId`.

---

## 6. 저장소 (Cloudflare KV: `SCOUT_KV`)

- scout-finder: `units` · `pending` · `comments` · `log`
- jamboree: `jamboree`(작업 슬롯) · `jamboree:index` · `jamboree:item:<id>`
- jamboree-plan: `jamboree-plan`(구) · per-card `jp:s:<slotKey>` · `jp:marketing/types/events/timetable/roster/placement/ttcats/offtimes/contacts/divisions/protocol/launch`
- 첨부: `file:<id>`, 이미지 업로드

---

## 7. 환경변수 / 시크릿 (Cloudflare Pages)

| 이름 | 용도 | 비고 |
|------|------|------|
| `TOTP_SECRET` | 관리자 인증 TOTP 비밀키(base32) | **시크릿**(노출 금지). 미설정 시 `/api/login`이 503 → 아무도 관리 불가(안전 기본값) |

> **`GOOGLE_CLIENT_ID`·`ADMIN_EMAILS`·`ADMIN_TOKEN`은 더 이상 사용하지 않음** — TOTP(인증 앱 6자리 코드)로 대체됨.

### TOTP 설정 절차 (최초 1회)
1. base32 비밀키 1개 생성(서버가 생성해 전달).
2. Cloudflare Pages(`jimmyport`) → Settings → **Environment variables(Production)** 에 `TOTP_SECRET`(시크릿)로 추가.
3. 휴대폰 **Google Authenticator**(또는 호환 앱)에 같은 키를 등록 — otpauth URL을 QR로 스캔하거나 base32 키를 수동 입력(SHA1·6자리·30초).
4. 재배포 후 `/admin` → 앱에 표시된 6자리 코드 입력 → 접근. 키 분실/유출 시 새 키로 교체하면 기존 세션 전부 무효화.

---

## 8. 운영 / 배포

- 자동 commit + push + `wrangler pages deploy . --project-name jimmyport --branch main`.
- 커밋 메시지는 **ASCII 권장**(한글 메시지 deploy 시 "Invalid commit message").
- 의미 있는 변경마다 `VERSION` bump. 로컬 dev server는 띄우지 않음.
- 디자인 토큰/폰트: [DESIGN.md](DESIGN.md) (브랜드 컬러 + Wanted Sans 7단계).
