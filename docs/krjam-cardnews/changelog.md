# /krjam-cardnews — 한국잼버리 카드뉴스 제작기 (변경 이력)
> React 격리 페이지(본 앱 vanilla 규칙 불변). 모듈: `jamboree/`. 엔트리: `krjam-cardnews.html`.

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

### 18.3 v0.9.106 — 카드뉴스 서버백업 scout1922 → TOTP(공개 저장소 대응)
- `jamboree/app.jsx` 의 클라 하드코딩 비번 `scout1922`(서버 미검증 → `/api/jamboree` 사실상 공개) 폐기. **공개 GitHub 저장소라 하드코딩 교체는 무의미** → 서버 검증으로 전환.
- 서버: `functions/api/jamboree.js` GET/PUT/POST/DELETE에 `isAdmin`(Bearer 세션) 강제. 클라: 잠금해제를 관리자 **인증앱 6자리 코드 → `/api/login` → 세션**(localStorage `jamboree:session`, 12h)으로 교체, 서버 호출에 `Authorization: Bearer`. 401 시 재인증. 공개 소스에 비밀값 0. 검증: 무인증 401 ×5, 잘못된 코드 401, 페이지·타 API 200.

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

### 18.26 v0.9.159 — 카드뉴스: 텍스트도 영역 가장자리 확장 + 05 이미지+캡션형 내용 텍스트 + 서버 저장 덮어쓰기
- 사용자 3건: (1) 텍스트도 사진처럼 **영역(글상자) 가장자리 확장**, (2) **이미지+캡션형(05)** 에 타이틀 말고 **내용 텍스트**도 수정, (3) 한번 저장하면 **덮어쓰기**도.
- **텍스트 영역 가장자리 확장**(`lib.jsx` `Editable` + `app.jsx` `FieldInput`): 사진(`imgxf-`)과 동일 개념의 per-text `txtxf-<K>`(et/eb/el/er px). Editable이 이를 **음수 마진**으로 변환해 글상자를 키움(절대배치 텍스트는 left/right 양쪽이면 폭, top만이면 위치가 확장; 음수=축소). 기존 style의 marginTop/Bottom을 더해 합성(클로버 X). FieldInput 각 텍스트에 `↔ 영역` 토글(접힘 기본, 글씨색/그림자 버튼 옆) → 위/아래/왼쪽/오른쪽 슬라이더(−200~600px)+초기화. `<label>` 안에 range 중첩 회피 위해 래퍼 div로 재구성. `deckAdd`가 `txtxf-` 사본 복사(덱 인스턴스 독립). collect/hydrate는 `cc-prop:*` 일괄이라 자동 저장.
- **05 이미지+캡션형 내용 텍스트**(`templates.jsx` `T_ImageCaption`): 이미지(520) + 캡션(제목, top676) + **신규 `-body` Editable(내용, top858~bottom168, fz33/lh1.55)** + 하단 라벨(`-sub`). 우측 패널 '텍스트'에 자동 등록(긴 def라 textarea + 기사 import의 bodyF 매핑 대상).
- **서버 저장 덮어쓰기**(`app.jsx`): 로컬 저장은 이미 currentId로 덮어쓰기(+자동저장)였고, **서버 백업만 매번 POST(중복 생성)** 라 갭. → `serverCurrentId/Name` 추적: 서버 저장/불러오기 후 다시 저장 시 **PUT(덮어쓰기)**, 항목 사라졌으면(404) POST 폴백. 모달에 '현재 서버 항목' 표시·'서버에 저장(덮어쓰기)'·**'새 사본으로 저장'**·목록 현재항목 강조('· 현재'). serverDelete가 현재항목이면 추적 해제.
- 검증: Babel(react preset) 9모듈 컴파일 OK + 헤드리스 puppeteer(http, fetch 목업): 05 패널 텍스트 4필드(카테고리/캡션/내용/라벨)+내용 textarea 렌더·프리뷰 캡션·내용 노출 / 본문 `↔ 영역` 왼쪽200→marginLeft −200px·위로100→marginTop −100px·미설정 0 / 서버 1차 POST→2차 **PUT 동일 id(중복 X)**·새사본 버튼 / **콘솔 에러 0**.
