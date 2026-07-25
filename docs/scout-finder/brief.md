# Scout Tour Assistant (scout-finder) — 제품 사양
> `/`(랜딩) · `/tour` · `/tour/admin`. 스택·라우팅·운영 규칙은 [rules/stack-routing.md](../../rules/stack-routing.md), 관리자·변경 이력은 [changelog.md](changelog.md).

## 1. 목적
지역(시/구/동)을 검색하거나 지도를 클릭하면, 그 위치 기준으로 가까운 스카우트 단위대를
**거리순**으로 지도·목록에 보여주는 정적 웹앱. **GPS 사용 가능**(브라우저 'Near me' 지오로케이션) + 검색·지도 클릭으로도 위치 지정. (이전 'GPS 미사용' 규칙은 v0.9.62에서 폐지)

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
- 디자인은 [DESIGN.md](../../DESIGN.md) 준용 (브랜드 토큰 + Wanted Sans 7단계 + 간격/반경 스케일).

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
