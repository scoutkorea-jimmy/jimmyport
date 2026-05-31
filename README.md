# scout-finder — 내 주변 스카우트 지역대 찾기

지역(시/구/동)을 검색하거나 지도를 클릭하면, 그 위치를 기준으로 가까운
스카우트 지역대를 거리순으로 지도와 목록에 보여주는 **정적 웹앱**입니다.
GPS를 쓰지 않고 검색·지도 클릭으로 기준 위치를 정합니다.

## 특징

- **Vanilla HTML/CSS/JS** — 프레임워크·번들러·빌드 단계 없음.
- 지도: **Leaflet 1.9.4** (cdnjs CDN) + **OpenStreetMap** 타일.
- **외부 API 키·지오코딩 호출 없음** — 전부 클라이언트에서 동작.
- 검색은 데이터 내 `name / federation / district / address` **부분일치**.
  일치 항목들의 좌표 **중심(centroid)** 을 기준점으로 삼아 haversine 거리로 정렬.
- 지도를 클릭하면 그 지점을 기준점으로 재정렬 (GPS 대체).
- 로직과 데이터가 **완전히 분리** — `data.js`만 교체하면 다른 데이터로 바로 동작.

## 한국스카우트연맹 조직 구조

```
단위대(학교대 / 지역대) → 지구연합회 → 지방·특수연맹(22개)
예) 비파지역대 → 목포지구연합회 → 전남연맹
```

- **단위대**: 학교 중심으로 발전한 **학교대**, 지역 중심으로 발전한 **지역대**.
- **지방·특수연맹 22개**: 지역연맹 18(서울북부·서울남부·부산·대구·인천·광주·대전·울산·
  경기북부·경기남부·강원·충북·충남세종·전북·전남·경북·경남·제주) + 특수연맹 4(가톨릭·원불교·불교·기독교).
  목록은 `data.js`의 `window.SCOUT_FEDERATIONS`에 있습니다.

## 파일 구조

```
index.html   레이아웃 + Leaflet CDN 로드 (푸터에 데이터 다운로드)
styles.css   필드 가이드/지도 무드 스타일 (+ 관리자 스타일)
app.js       검색 · centroid anchor · haversine 정렬 · 지도클릭 재정렬 · 렌더링
manage.html  관리자 페이지 (단위대 추가/수정/삭제 + 좌표 지정)
manage.js    관리자 로직 (localStorage 편집본 + data.js 다운로드/가져오기)
data.js      window.SCOUT_UNITS + window.SCOUT_FEDERATIONS (← 데이터 교체 지점)
README.md    이 문서
```

## 관리자 페이지 (manage.html)

백엔드·키가 없는 정적 사이트이므로 **브라우저 로컬 편집 도구**입니다.

1. `manage.html` 에서 단위대를 추가/수정/삭제하고, 지도 마커를 드래그하거나
   "지도에서 위치 지정"으로 좌표를 찍습니다.
2. 편집 내용은 **localStorage**(`scoutfinder:units`)에 자동 저장되고,
   같은 브라우저의 공개 사이트는 이 편집본을 "편집본 미리보기"로 보여줍니다.
3. 실제 사이트에 반영하려면 **`data.js 다운로드`** 로 받은 파일을 저장소의
   `data.js`로 교체하고 커밋·배포합니다. (또는 `JSON 복사`/`JSON 가져오기` 활용)
4. `샘플로 초기화` 는 로컬 편집본을 버리고 배포된 `data.js`로 되돌립니다.

> 로그인은 없습니다. 편집은 그 브라우저에만 머무르며, 커밋하기 전까지 실제
> 배포 데이터는 바뀌지 않습니다.

## 로컬 실행

`file://` 로 열어도 동작하지만, 일부 브라우저 캐싱/보안 정책을 피하려면
간단한 정적 서버로 실행하는 것을 권장합니다.

```bash
# Python 3
python3 -m http.server 8080
# 또는 Node
npx serve .
```

이후 브라우저에서 `http://localhost:8080` 접속.

## 데이터 교체

`data.js`의 `window.SCOUT_UNITS` 배열만 교체하면 됩니다. app.js 수정 불필요.

각 항목 스키마:

```js
{
  id,          // 고유 식별자 (영문 kebab-case)
  name,        // 단위대 이름 (예: 비파지역대, 한솔고등학교대)
  type,        // 단위대 종류: "지역대" | "학교대"
  federation,  // 지방·특수연맹 (22개 중 하나, 예: 전남연맹)
  council,     // 지구연합회 (예: 목포지구연합회)
  address,     // 동 단위 전체주소
  lat, lng,    // 동의 실제 대략 위경도 (검색 anchor·거리 계산)
  sections,    // 운영 부문 배열: 비버/컵/스카우트/벤처/로버 중 일부
  meetingDay,  // 정기모임 요일
  contact,     // 연락처
  note,        // 비고
}
```

- 검색·정렬은 전적으로 `lat/lng`에 의존하므로 좌표는 반드시 채워야 합니다.
- `sections`가 비어 있어도 동작하며, 칩이 표시되지 않을 뿐입니다.
- 공개 사이트 푸터의 **"데이터 다운로드 (JSON)" / "data.js 다운로드"** 로
  현재 표시 중인 데이터를 그대로 내려받을 수 있습니다.

## Cloudflare Pages 배포

빌드 단계가 없으므로 정적 파일을 그대로 올립니다.

**대시보드(Git 연동):**
1. Cloudflare Pages → Create a project → 저장소 연결.
2. Framework preset: **None**, Build command: 비움, Output directory: `/` (루트).

**Wrangler CLI(직접 배포):**
```bash
wrangler pages deploy . --project-name <your-project> --branch main
```

> 외부 키·서버가 없으므로 환경변수 설정이 필요 없습니다.

## 라이선스 / 데이터 주의

현재 데이터는 **샘플(예시)** 입니다. 헤더의 "샘플 데이터" 배지로 표시되며,
실제 운영 시 `data.js`를 실데이터로 교체하세요.
지도 타일·데이터는 OpenStreetMap (ODbL) 기여자에게 귀속됩니다.
