# scout-finder — KMS (Knowledge Management System)

> 이 프로젝트의 **모든 데이터·사양·운영 정보를 한곳에 모은 단일 문서**입니다.
> 작업 전 [CLAUDE.md](CLAUDE.md)(명령 로그)와 [DESIGN.md](DESIGN.md)(디자인 가이드)도 함께 참조.
> 데이터의 실제 원본은 `data.js`와 Cloudflare KV(`/api/units`)이며, 이 문서는 그 스냅샷·색인입니다.

---

## 0. 한눈에
- **제품**: 전세계 스카우트 단위대를 지도/거리순으로 찾는 정적 웹앱. **영어 전용.**
- **라이브**: https://jimmypark.net · 관리자 https://jimmypark.net/manage
- **호스팅**: Cloudflare Pages 프로젝트 `jimmyport` (도메인 jimmypark.net).
- **스택**: Vanilla HTML/CSS/JS + Leaflet 1.9.4(cdnjs) + OpenStreetMap. 백엔드 = Cloudflare Pages Functions + KV.
- **버전**: `VERSION` 파일 (현재 0.7.x 대).

## 1. 조직 모델 (WOSM 글로벌 표준)
```
WOSM Region → 국가(NSO) → 단위대(Unit)
예) Asia-Pacific → Korea Scout Association → Yeongtong Scout Unit
```
- 지방연맹/지구연합회 개념 없음(제거됨).
- 단위대 종류(type): **Community unit**(지역 중심) / **School unit**(학교 중심).

## 2. 데이터 스키마 (`window.SCOUT_UNITS`)
```js
{
  id,           // 자동 배정 (영문)
  name,         // 단위대 이름 (영문)
  type,         // "Community unit" | "School unit"
  country,      // WOSM 공식 국가명(영문). 미지정 시 "Republic of Korea"
  country_ko,   // 국가 한글명 (내부 참조용, 화면 비표시)
  nso, region, lang,   // 국가 선택 시 SCOUT_NSOS에서 자동 채움
  lat, lng,     // 좌표 (관리자: OSM 주소검색 또는 마커 드래그)
  place,        // OSM이 돌려준 영문 장소명 (관리자 참조용)
  sections,     // 모집 카테고리: "Beaver"|"Cub"|"Scout"|"Venture"|"Rover"
  homepage,     // Homepage (Instagram) URL — 없으면 "Contact the national scout organization"
  note          // 주요 활동 (Main activities)
}
```

## 3. 단위대 데이터 (샘플 25곳 — KV `units`가 원본)
국가별 5개씩, 모두 Asia-Pacific. 전체 레코드는 `data.js`/`/api/units`.

| 국가 (country) | NSO | 수 |
|---|---|---|
| Republic of Korea | Korea Scout Association | 5 |
| Singapore | The Singapore Scout Association | 5 |
| Mongolia | The Scout Association of Mongolia | 5 |
| Hong Kong | Scout Association of Hong Kong | 5 |
| Scouts of China (Taiwan) | The General Association of the Scouts of China | 5 |
| **합계** | | **25** |

## 4. 국가/NSO 목록 (`window.SCOUT_NSOS`, 176개국)
각 항목: `{ country(EN, WOSM 공식명), country_ko, nso, region, lang }`. 전체 176개 배열은 `data.js`에 있음(관리자 국가 드롭다운 소스).

지역(Region)별 분포 + 핀/범례 색(`window.SCOUT_REGION_COLORS`):

| WOSM Region | 국가 수 | 색 |
|---|---|---|
| Asia-Pacific | 33 | `#622599` (Scouting Purple) |
| European | 47 | `#0094b4` (Ocean Blue) |
| Arab | 19 | `#248737` (Forest Green) |
| Africa | 42 | `#d5521a` (Ember/Orange) |
| Interamerican | 35 | `#c2189e` (Magenta) |
| **합계** | **176** | |

> 핀 색 = 단위대의 `region` 색. 공식 언어(`lang`)는 English 또는 French.

## 5. 백엔드 API (Cloudflare Pages Functions + KV `SCOUT_KV`)
KV namespace id `5b8071435ace47f9a8eccb8ade1b946e`. KV 키: `units` · `pending` · `comments` · `log` · `img:<id>`.

| Method · Endpoint | 권한 | 설명 |
|---|---|---|
| `GET /api/units` | 공개 | `{units, updatedAt}` (없으면 data.js 폴백) |
| `PUT /api/units` | 관리자 | 전체 저장 + updatedAt + 로그 |
| `POST /api/submissions` | 공개 | 단위대 추가 제안(승인 대기 + IP) |
| `GET /api/submissions` | 관리자 | 대기 목록 |
| `PATCH /api/submissions` | 관리자 | `{id, action:"approve"|"reject"}` |
| `GET /api/comments` | 공개 | 목록 (공개=IP 마스킹, 관리자=원본) |
| `POST /api/comments` | 공개 | `{name, body, unitId, parentId?, imageUrl?, consent:true}` |
| `DELETE /api/comments?id=` | 관리자 | 댓글+대댓글 삭제(잊혀질 권리) |
| `POST /api/image` | 공개 | 이미지 업로드(image/*, ≤2MB) → `{url}` |
| `GET /api/image?id=` | 공개 | 이미지 제공 |
| `GET /api/log` | 관리자 | 변경 로그(수정일시·동작·IP) |

- **관리자 인증**: 헤더 `X-Admin-Token` = Pages secret **`ADMIN_TOKEN`** (값은 코드/깃·이 문서에 두지 않음. 변경: `wrangler pages secret put ADMIN_TOKEN --project-name jimmyport`).
- **IP**: `CF-Connecting-IP` 헤더로 취득.

## 6. 기능
- **검색/거리**: name·country·nso·region 부분일치 → 일치 centroid를 anchor → haversine 오름차순. 지도 클릭 시 그 지점으로 재정렬. anchor+상위5 fitBounds. 거리 km 1자리.
- **표시(카드/팝업)**: 이름+종류 · 국가+지역(Region)태그 · NSO · 주요활동 · 모집 카테고리 · Homepage(Instagram)|기본문구.
- **댓글(레딧식, 단위대별)**: 카드/팝업 💬 → 카드 아래 **인라인 펼침 패널**. 상위 댓글 **10개 페이지네이션**(Load more), 대댓글 중첩. 표시 = **닉네임 + 내용 + 마스킹 IP**. **사진 첨부**(업로드→/api/image). **GDPR 동의 필수**.
- **관리자(manage.html)**: 국가(NSO) 드롭다운(자동 region/lang), **Location = OSM 주소검색**(한글 입력→영문 저장, `accept-language=en`)·마커 드래그, Homepage(Instagram), 모집 카테고리, 주요활동. **편집 자동 서버 저장**(비밀번호 1회). data.js 다운로드/JSON/가져오기/서버 재로드.
- **버전 알림**: `/VERSION` 폴링 → 새 배포 시 우측 상단 "A new version is available / Refresh".
- **모바일**: ≤820px 목록/지도 토글.

## 7. 디자인 (요약 — 상세 [DESIGN.md](DESIGN.md))
- 브랜드 컬러 토큰(`:root`): accent `#622599`, ink `#221b2b`, bg `#f6f3fa`, surface `#fff` 등.
- 폰트 **Wanted Sans Variable**, weight **7단계**(`--fw-1`~`--fw-7`=300~900).
- 간격 4px 스케일(`--sp-*`), 반경(`--r-sm/md/lg`), 포커스 `--focus`.

## 8. 파일 구조
```
index.html · styles.css · app.js · data.js · version-watch.js   (공개)
manage.html · manage.js                                          (관리자)
functions/api/{_lib,units,submissions,comments,image,log}.js     (백엔드)
wrangler.toml (KV 바인딩) · VERSION · README.md
CLAUDE.md(명령 로그) · DESIGN.md(디자인) · KMS.md(이 문서)
```

## 9. 운영/배포
- 자동: git commit + push + `wrangler pages deploy . --project-name jimmyport`. 커밋 메시지는 **ASCII**(한글 시 deploy 실패).
- 의미 있는 변경마다 `VERSION` bump.
- 미진행(다음): 공개 단위대 추가 제안 폼 UI, 관리자 승인/로그/댓글관리 뷰.
