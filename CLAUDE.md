# scout-finder — Project Brief (Claude must read first)

> 이 레포는 이전의 jimmypark.net 개인 아카이브에서 **scout-finder 정적 웹앱**으로
> 전면 전환되었습니다. (이전 내용은 git 히스토리에 보존)

## 1. 목적

사용자가 지역(시/구/동)을 검색하거나 지도를 클릭하면, 그 위치를 기준으로
가까운 스카우트 지역대를 **거리순**으로 지도와 목록에 보여주는 정적 웹앱.
GPS 미사용 — 검색·지도 클릭 기반 위치 지정.

## 2. 스택 / 제약 (반드시 준수)

- **Vanilla HTML/CSS/JS만.** 프레임워크·번들러·빌드 단계 도입 금지.
- 지도: **Leaflet 1.9.4** (cdnjs CDN), 타일: **OpenStreetMap**.
- **외부 API 키·지오코딩 호출 금지** — 전부 클라이언트에서 동작.
- 위치 매칭은 데이터 내 `name/federation/district/address` 부분일치(오프라인).
- UI 텍스트는 **한국어**, 식별자/코드는 **영어**.
- 디자인: 깔끔한 '필드 가이드/지도' 무드. **보라색 그라데이션·generic AI 톤 금지.**

## 3. 파일 구조 (이 5개로 유지)

```
index.html   레이아웃 + Leaflet CDN
styles.css   스타일 (포레스트 그린 강조 + 종이 톤)
app.js       검색·centroid anchor·haversine 정렬·지도클릭 재정렬·렌더링
data.js      window.SCOUT_UNITS (← 데이터 교체 지점, 로직과 완전 분리)
README.md    실행·교체·배포 안내
```

## 4. 핵심 로직 규약

- 검색어 → 일치 유닛들의 좌표 **centroid**를 anchor로.
- haversine 으로 anchor→전체 거리 계산, **오름차순** 정렬해 목록·마커 갱신.
- 지도 클릭 시 그 좌표를 anchor로 동일 재정렬.
- 지도는 anchor + 가까운 상위 5개에 `fitBounds`.
- 거리 표기 **km, 소수 1자리**.
- 결과 없음 → 안내 + "전체 보기" 복귀.
- `data.js`만 교체하면 동작하도록 **로직/데이터 분리 유지**.
- 키보드 접근성·aria 기본 처리, **콘솔 에러 0**.

## 5. 데이터 (data.js)

- 현재는 **샘플** (헤더 "샘플 데이터" 배지). 실데이터 연결 시 교체.
- 모든 위치는 '동' 단위. 좌표(lat/lng) 필수.
- 스키마: `{ id, name, federation, district, address, lat, lng, sections[], meetingDay, contact, note }`

## 6. 운영 규칙

- **자동 commit + push + 배포**: 변경 검증 통과 즉시 git commit + push +
  `wrangler pages deploy . --project-name jimmyport`. 별도 지시 없어도 진행.
- 로컬 dev server는 띄우지 말 것.
- 배포 대상 Cloudflare Pages 프로젝트는 `jimmyport` (도메인 jimmypark.net / CNAME 유지).
