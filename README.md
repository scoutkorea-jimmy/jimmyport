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

## 파일 구조

```
index.html   레이아웃 + Leaflet CDN 로드
styles.css   필드 가이드/지도 무드 스타일
app.js       검색 · centroid anchor · haversine 정렬 · 지도클릭 재정렬 · 렌더링
data.js      window.SCOUT_UNITS 샘플 데이터 (← 교체 지점)
README.md    이 문서
```

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
  name,        // 지역대 이름
  federation,  // 시·도연맹
  district,    // 지구
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
