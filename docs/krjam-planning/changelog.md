# /krjam-planning — 홍보부 통합 관리 플랫폼 (변경 이력)
> vanilla. 모듈: `jamboree-plan/`. 엔트리: `krjam-planning.html`. 공개 제보 페이지는 [../krjam-jebo/changelog.md](../krjam-jebo/changelog.md).

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

### 18.6 v0.9.108 — 홍보부 보드 로그인 문구 정리 + 개인정보 수집·이용 동의
- 사용자 요청: (1) 게이트의 "대원 아이디/비밀번호" → **"아이디/비밀번호"**(대원 표현 제거), (2) **"회원가입" → "회원가입 신청"**, (3) 로그인엔 "계정이 필요하면 **홍보부장에게 문의**", 회원가입 신청 후엔 "**홍보부 부장에게 꼭 확인**하여 계정을 부여받으라" 안내, (4) 개인정보 수집·이용 동의 필요 여부 검토.
- 문구(`krjam-planning.html` 게이트 + `jamboree-plan/app.js`): 탭 `회원가입 신청`, 로그인 힌트(홍보부장 문의), 가입 힌트(부장 확인), 버튼 `회원가입 신청`, 성공 토스트/`pending_approval` 메시지 갱신.
- **개인정보 동의(검토 결론 = 필요)**: 가입 시 수집하는 이름·아이디·비밀번호(PBKDF2 해시)·접속 IP는 개인정보 → PIPA 제15조상 동의/근거 필요. 가입 폼에 **[필수] 수집·이용 동의 체크박스**(수집항목·목적·보유기간[~2026-11-09] 고지) 추가, 미동의 시 신청 불가. 서버 `functions/api/jp-members.js` register는 `body.consent===true` 아니면 400 `consent_required`, 레코드에 `consentAt` 저장. ⚠️ 후속 권장: /privacy(현 영문·댓글 중심)에 운영 보드 회원 계정 수집 항목 반영, 만 14세 미만 가입 시 법정대리인 동의(제22조의2).

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

### 16.42 v0.9.145 — 홍보부 관리 기능 3종: 자료실 + 게시 현황 대시보드 + 검수 코멘트
- 사용자 선택(AskUserQuestion): 자료 라이브러리·게시 현황 통계·검수 코멘트.
- **자료실(아카이브)** — 신규 탭 `library`(항상 접근, canSee 특례) + `functions/api/jp-assets.js`(KV `jpa:<id>`, GET 공개·POST/PATCH/DELETE 회원·작성자/관리자). 사진·완성 카드뉴스 PNG를 `/api/image`(downscale/uploadBlob 재사용)로 올리고 **태그·검색·필터·받기·삭제**. HTML 섹션 + `.libgrid/.libcard` CSS. setView/savedView/배선 추가.
- **게시 현황 대시보드** — `renderDashboard` 집계 확장: 콘텐츠 슬롯에서 게시(posted)/전체, 채널별(게시/전체), 담당자별 건수, 마감 임박(3일 내 미게시) → '게시 완료' 통계카드 + '게시 현황·통계' 패널(`.pubgrid`). 마감 임박 클릭→슬롯 모달.
- **검수 코멘트(기사)** — `jp-news` POST `action:comment`/`comment_delete`(article.comments[], 본인/관리자 삭제). 기사 카드에 '검수 N' 토글 → 코멘트 스레드(작성·삭제·Enter) `.ac-box`. (기사 수정은 기존 `canEditNews`+PUT 유지.)
- 검증: node --check(app·jp-assets·jp-news) + 라이브 GET jp-assets/jp-news 200 + 헤드리스(자료실 탭·섹션·함수 존재·콘솔 에러 0). ⚠️ 업로드·코멘트·대시보드 실데이터 흐름은 로그인 필요 → 사용자 QA(운영 KV 파괴적 쓰기 금지).

### 16.43 v0.9.150 — 현장 위치 지도(홍보부 인원 위치 시각화) 신설
- 사용자: 잼버리 야영장 배치도(사용자 업로드 `KakaoTalk_…png`, 시설물자관리본부 제작) 기반으로 **홍보부 인원의 위치를 대략적으로 표현**. AskUserQuestion 확정 — 대상=**홍보부 인원(roster)**, 위치=**일정표 자동 + 수동 배치(수동 우선)**, 단위=**이름붙은 구역에 스냅**.
- **자산**: 원본(3508×2481)을 `jamboree-plan/assets/sitemap.png`(2000×1414로 다운스케일)로 배치(루트 원본은 보존). 배경 이미지 위 절대배치 마커 방식(폴리곤 아님 → vanilla 단순).
- **구역(ZONES) 29개**: 본부·시설 17(JHQ·전시행사장·메인무대·급식·대회장야영장·과정1~5·물자보급·컵스숙소·주차장2·관리사무소·병원·운영요원숙소) + 분단 영지 7(큰물결·솔바람·빛누리·어울림·푸른별·평화숲·꿈동산) + 게이트 5. 각 구역 = 이미지 비율좌표(x,y 0~1) + 장소명 자동매칭 별칭(al). `zoneForPlace(txt)`=일정 장소명↔구역 substring 매칭(≥2자).
- **신규 탭 `sitemap`**(홍보부 운영 행, `mapPin` 아이콘): `canSee`에 특례 `v==='sitemap'→isStaff()`(홍보부 유형/관리자만, 회원유형 탭설정 불필요). setView/savedView/reflectAuthUI 연동.
- **2모드 세그**: ① **수동 배치**(기본) — 인원 클릭/드래그 선택 → 구역 클릭/드롭으로 배치, 선택바(`#sm-selbar`)에서 빼기·선택해제, 미배치 트레이(`#sm-tray`)로 드롭 시 해제. ② **일정표 연동** — 날짜 select + 15분 시간 슬라이더 → 그 시각 활성 일정(`assignees` 포함 + start≤t<end)의 `zone`(명시) 또는 `zoneForPlace(place)`로 자동 표시. **수동 배치가 있으면 항상 우선**(src='manual', 핀 배지). 위치 없는 인원은 트레이('위치 미상').
- **데이터**: 수동 배치 = `state.mappos`={pid:zoneKey}, 서버 KV `jp:mappos`(객체, `cleanMapPos`), `saveMapPos`=debouncedPut. applyServer 로드. 인원=roster(personLabel/색=인덱스 팔레트, 아바타=이름/역할 첫 글자).
- **일정표 구역 태깅**: 시간 일정 모달에 **‘현장 지도 구역’ select**(자동/29구역, `zoneOptions`) 추가 → `ttDraft.zone`·`buildCleanTT`·반복(series 'all') 복제·API `cleanTT.zone`(slice30). 지정 시 연동 모드에서 정확 표시(미지정=장소명 추정).
- API(`functions/api/jamboree-plan.js`): `MAPPOS` 키 + GET 응답에 `mappos` + PUT `body.mappos`(객체) 분기 + `cleanTT`에 zone.
- 검증: `node --check`(app·api) + 헤드리스 Chrome(CDP, 관리자 세션 시드): 게이트 통과·탭 활성·이미지 로드·29마커·6 트레이 / 선택→배치(stage)→mappos·트레이 5·핀 / 연동 모드 개영식 담당 지정+20:30→stage 자동(src sched, 메인스타디움→stage 매칭)·수동 1+자동 1=2 / TT 모달 구역 select 30옵션 / **콘솔 에러 0** + 스크린샷(배치도 풀폭·마커·트레이 정상). ⚠️ 실 인원/배치 저장 흐름은 로그인 필요 → 사용자 QA(운영 KV 파괴적 쓰기 금지).

### 16.51 v0.9.161 — 홍보부 대시보드 전면 확장(액션큐·실시간 D-day·오늘의 현장·파이프라인·팀별 워크로드·최근 자료/기사·D-count 요약)
- 사용자: "홍보부 대시에 있으면 좋을만한 것들 정리" → 제안 후 "모두 다 넣어봐". 기존 데이터만으로 만들 수 있는 위젯 7종을 `renderDashboard`에 일괄 추가.
- **B. 실시간 D-day 배너**: 헤더 시계와 별개로 대시 상단 큰 그린 배너 — `EVENT_DT` 기준 `D-N HH:MM:SS` 1초 갱신(`dashClockTimer`, 대시 벗어나면 `stopDashClock`) + 이번 주 남은 콘텐츠·마감 지남 수.
- **A. ‘지금 처리할 일’ 액션 큐**: 검수·승인 대기(`approval.state==='requested'`, staff)·마감 지난 미게시·미처리 소식 제보(`tips new`, 미배정 수)·기사 검수 의견(코멘트 합계, staff)·회원가입 승인 대기(admin, `loadDashMembers` 1회 캐시). 건수 뱃지+클릭 시 해당 탭/모달 이동. 없으면 ‘모두 처리됨 ✓’.
- **C. 오늘의 현장**: 오늘 시간 일정·현장 배치 인원(mappos)·미완료 촬영 요청(shoots) 3-스탯 + 오늘 타임테이블 리스트(클릭→`openTT`).
- **E. 콘텐츠 파이프라인**: 기획→작성중→완료·미게시→게시완료 스택 막대+범례(**제목 있는 실제 콘텐츠만** 집계 — 빈 시드 슬롯 제외).
- **G. 팀별 워크로드**: 방금 만든 2팀 구분 활용 — 홍보부장/각 팀별 인원수 + 담당 콘텐츠(owner 이름 매칭)·현장 시간일정(assignees) 건수.
- **F. 최근 자료실/최근 기사**: 자료 4개(이미지 썸네일/문서 아이콘)·기사 5개(검수 수) + 전체 보기.
- **D. 디데이 프로젝트 요약**: 승인 확정·이번 주 디데이 수 + 가까운 순 리스트 + `/krjam-dcount` 링크(planning이 이미 `/api/krjam-dcount` fetch).
- 통계 카드에 **디데이 신청** 추가(7종). 지연 로드(tips/news/library/members)는 대시 진입 시 자동 fetch 후 `curViewMode==='dashboard'`면 재렌더.
- 검증: `node --check` + 헤드리스 puppeteer(관리자 세션·전 API 목업) — D-day 라이브 틱·액션큐 5행(각 goto)·파이프라인(실콘텐츠 기준 1/1/1/0)·오늘의 현장 3스탯·팀별 워크로드(홍보부장/촬영팀/편집팀 콘텐츠·현장 건수)·최근 자료 2/기사 2·D-count 요약 2건·통계 7카드·**앱 콘솔 에러 0**(날씨 open-meteo CORS는 로컬 전용) + 풀페이지 스크린샷.

### 16.50 v0.9.160 — 홍보부 R&R 2팀 구분(팀명 편집) + 자료실 운영계획서/카드뉴스 구분 + D-count 승인 캘린더
- 사용자 3건(대화 중 순차 지시): (1) 홍보부 인원 R&R을 **홍보부장 아래 2개 팀**으로 나누고 **팀명 편집 가능**하게, (2) D-count 관리자 페이지에서 **승인 완료 신청을 캘린더 뷰**로, (3) 자료실을 **잼버리 운영 계획서 / 카드뉴스 자료**로 구분.
- **R&R 2팀 구분**(`jamboree-plan`): roster 멤버에 `team` 필드(`lead`/`t1`/`t2`) + 편집 가능 팀명 `state.teams`{t1,t2}(KV `jp:roster` 래퍼에 `teams` 병행 저장, GET/PUT 확장). `renderStaff` 재작성 — 단일 표에 **팀 구분 헤더 행**(홍보부장=고정 뱃지 / 1·2팀=이름 input, 팀별 ‘인원 추가’·인원수) + 멤버 행에 **팀 이동 select**(팀명 실시간 반영). 구버전 데이터 마이그레이션 `teamOf`(team 없으면 role에 ‘부장’ 포함 시 lead, 아니면 t1). thead 6→7열(팀 칸 추가). API `cleanRoster`에 team·`cleanTeams`(t1/t2) 추가.
- **자료실 구분**(`jamboree-plan`): jp-assets에 `category`(plan/cardnews/photo)·`ct`(문서 타입) 추가, POST가 `/api/file?id=`(문서·PDF·HWP)도 허용. 업로드 버튼 2개 — **운영 계획서 올리기**(문서+이미지, `uploadAttachment`로 /api/file 저장, category=plan)·**카드뉴스·사진 올리기**(이미지, PNG=cardnews/그 외=photo 자동). `renderLibrary` — 구분 탭(전체/운영계획서/카드뉴스/사진·기타, 카운트) + ‘전체’ 시 구분별 섹션 그룹핑, 문서 자산은 `libdoc` 카드(fileText 아이콘 + `docLabel(ct)` PDF/HWP/PPT/…). 레거시(category 없음)는 type로 폴백.
- **D-count 승인 캘린더**(`krjam-dcount`): 관리자 대시보드 최상단에 **‘✓ 승인 완료 캘린더’** 섹션(기본 열림) — `MonthGrid` `mode="approved"` 신설, 승인(`status==='승인'`) 신청을 targetDate로 매핑해 월 그리드에 **초록 셀(D-번호+신청자 이름)**로 표시, 클릭 시 아래 목록을 `승인` 필터로. `appByDate`/`approvedCount` 파생.
- 검증: `node --check`(app·jp-assets·jamboree-plan API) + esbuild(dcount JSX) + 헤드리스 puppeteer(로컬 http, fetch 목업) — R&R 3팀 헤더(홍보부장/1팀/2팀·인원수)·팀명 편집→select 라벨 실시간 갱신·팀 이동·7열 / 자료실 구분 탭 4개(전체5·계획서2·카드뉴스1·사진2)·섹션 그룹·문서 2/이미지 3·탭 필터 / D-count 승인 캘린더 2건(D-38 박지민·D-30 최규호 초록셀)·셀 클릭→승인 필터 / **콘솔 에러 0** + 스크린샷 3종. ⚠️ 실 저장(R&R·자료 업로드·D-count 승인)은 로그인/TOTP 필요 → 사용자 QA. 운영 KV 파괴적 쓰기 금지(§16.6) 준수.

### 16.48 v0.9.155 — 콘텐츠 ③: 마감일 + 검수/승인 워크플로 + 마감 브라우저 알림
- 사용자 선택 3종 중 **③콘텐츠 승인+마감 알림** 구현(콘텐츠 보드 확장).
- **데이터**: `cleanEdit`/EDEF/normEdit/slotEditPayload/isDefaultEdit에 `due`(YYYY-MM-DD)·`approval`{state:none/requested/approved/rejected,by,at,note} 추가(`normApproval`). 기존 카드 호환(기본값).
- **모달**(slotEl, sns-only): 마감일 date input + 검수/승인 컨트롤(`.apctrl`) — 검수 요청(누구나)·승인/반려(홍보부 isStaff, 반려 사유 prompt)·해제. 현재 상태 `.apnow` 배지.
- **카드/보드**: `cardEl`에 승인 배지(`.apbadge`)·마감 배지(`.duebadge` 임박 soon=오늘~내일·지남 over, 미게시만). 리스트 상단 **마감 배너**(`#due-banner` 임박/지남 건수) + **‘마감 알림 켜기’ 버튼**(Notification 권한).
- **알림**: `scanDueNotify`(권한 granted 시 마감 임박/지난 미게시 콘텐츠를 1일 1회 브라우저 알림, `localStorage` 중복 방지) + init에서 3초 후·5분 주기 스캔. `enableDueNotify`(권한 요청).
- 검증: `node --check`(app·api) + 헤드리스(관리자): 지난마감+승인 카드·오늘마감 카드 → over1/soon1 배지·승인 배지1·배너 ‘임박 1·지남 1’·알림 버튼·모달 마감일(값 2026-06-28)·승인 컨트롤(검수요청/승인/반려)·승인→‘승인됨’·`enableDueNotify` 무에러·**콘솔 에러 0**. ⚠️ 실 저장·알림 권한은 사용자 환경 QA.

### 16.47 v0.9.154 — 현장 지도 ②: 촬영 요청 핀 + 수동 배치 체크인 시각
- 사용자 선택 3종 중 **②지도 체크인·촬영요청** 구현(현장 지도 확장).
- **촬영 요청(shoots)**: jamboree-plan state/API에 `shoots` 추가(KV `jp:shoots`, `cleanShoot` {id,zone,title,time,note,status:open/done,assignees,by,createdAt}, GET키+PUT배열 분기). 현장 지도 하단 ‘촬영 요청’ 목록(인라인 카드: 상태토글·제목·구역 select[ZONES]·시간·메모·삭제, `saveShoots` 디바운스) + **지도에 카메라 핀**(`.smshoot`, 구역 좌표, open=빨강/done=회색, 클릭 시 해당 카드로 스크롤·flash). `addShoot`.
- **체크인 시각**: `mappos` 값 `문자열`→`{zone,at}`로 확장(`cleanMapPos` 양쪽 호환, 프런트 `mapZoneOf`/`mapAtOf`). 수동 배치 시 `at=now` 기록 → 말풍선에 ‘체크인 N분 전’(`checkinAgo`). 구버전 문자열 값도 그대로 동작.
- 검증: `node --check`(app·api) + 헤드리스(관리자): 촬영요청 섹션·빈상태·추가1·구역/제목→지도 핀1(제목 표시)·완료 토글(status done·핀 s-done)·수동배치→mappos 객체{zone,at}·말풍선 ‘체크인’·구버전 문자열 호환(stage)·**콘솔 에러 0**. ⚠️ 실 저장은 로그인 필요 → 사용자 QA.

### 16.46 v0.9.153 — 현장 제보 인박스(타 본부·대원 제보 → 홍보부 검토→기사/자료화)
- 사용자 선택 3종(현장 제보 인박스·지도 체크인/촬영요청·콘텐츠 승인+알림) 중 **①현장 제보 인박스** 먼저 구현.
- **신규 API** `functions/api/jp-tips.js`(KV `jpt:<id>`, `memberOrAdmin` 인증): GET(목록 최신순)·POST(제보 `{org,zone,text,photos[≤3],reporterName}`)·PATCH(검토 `status` new/used/rejected·note)·DELETE(작성자/관리자). 사진=`/api/image` URL만 저장, IP 마스킹 기록.
- **프런트**(`app.js`+탭/섹션/모달): 탭 `tips`(콘텐츠·SNS 그룹, 로그인 누구나 `canSee`). 제보 모달(소속·구역 select[ZONES 29]·내용·사진 ≤3 업로드, `downscale`/`uploadBlob` 재사용). 카드 그리드(사진·내용·제보자·소속·구역·시각·상태 뱃지) + 필터(전체/새 제보/채택/반려). **홍보부(isStaff) 검토 도구**: 채택/반려/되돌리기 + **‘기사로’**(news 에디터 prefill: text·photos) + **‘자료실로’**(사진→`/api/jp-assets`). 삭제=작성자/관리자. 아이콘 `inbox`/`camera` 추가, `.tipgrid/.tipcard/.tip-*` CSS.
- 검증: `node --check`(app·jp-tips) + 헤드리스(관리자 세션): 탭 노출·섹션·빈상태·필터4·샘플 카드2(뱃지 새제보/채택·검토도구·구역 라벨)·used 필터1·제보 모달(소속/구역30/내용/사진)·**콘솔 에러 0** + 스크린샷. ⚠️ 실 제보/검토 저장은 로그인 필요 → 사용자 QA.

### 16.45 v0.9.152 — 현장 지도: ‘지금 기준(실시간)’ ↔ ‘시간 지정(슬라이더)’ 모드 공존
- 사용자: 현재 시각 실시간 보기와 **타이머(슬라이더)로 특정 시각 배치 미리보기** 두 기능이 **공존**해야 함.
- **세그 토글**(`#sm-modeseg` 지금 기준/시간 지정): `smTimeMode`('now'/'pick'). `smMoment()`=now면 `smNow()`(실시간), pick면 `{day:smDay,h:smTimeMin/60}`(슬라이더). `smPersonZone`이 `smMoment()` 사용 → 두 모드 공통(수동>해당시점 일정>기본 JHQ). now=라이브 라벨+1분 자동갱신(now일 때만), pick=날짜 select + 15분 시간 슬라이더(기본 8/5 20:00). 캐시버스트 `?v=0.9.152`.
- 검증: 헤드리스 — 세그 ‘지금 기준|시간 지정’ / now=라이브 표시·sched 숨김·전원 JHQ / pick=sched 표시·날짜 8옵션·슬라이더 / 담당+8/5 20:00→메인무대(sched), 06:00→JHQ(일정 없음) / now 복귀 라이브 / **콘솔 에러 0**.

### 16.44 v0.9.151 — 현장 지도 가독성(겹침+N·말풍선) + 메뉴 그루핑 + 캐시 근본수정 + JHG→JHQ
- 사용자 라이브 피드백 다건 일괄.
- **캐시 근본 수정**(`functions/_middleware.js`): `_headers`의 `/* no-cache`가 **미들웨어가 감싼 정적 자산엔 미적용**(Pages 기본 `max-age=14400`)이라 새 배포가 브라우저에 수시간 지연되던 원인 확인(§17.9 반복 문제의 잔존). → 미들웨어가 `next()` 후 **`/api/*` 외 모든 응답에 `Cache-Control: no-cache` 강제 셋**(`new Response(res.body,res)`). API는 자체 캐시 유지. 이후 배포 **즉시 반영**(ETag 304).
- **메뉴 그루핑**(UX): 평면 2행(콘텐츠 6 + 홍보부 운영) → **라벨 4그룹** `nav.tabbar`(`.tabgroup`+`.tg-label`): **개요**(대시보드) · **콘텐츠·SNS**(캘린더·콘텐츠 리스트·기사·자료실) · **현장 일정**(잼버리 일정표·현장 위치 지도·의전 일정) · **인원·연락망**(홍보부 인원·협조 연락처·분단 연락망). `reflectAuthUI`가 `#tabrow-manage` 토글 → **그룹별 "보이는 탭 1개라도 있으면 표시"**(없으면 라벨째 숨김). 일반 회원=3그룹(인원·연락망 숨김), 관리자/홍보부=4그룹. (탭 라벨 일부 축약, data-v 불변)
- **현장 지도 동작 모델 변경**(사용자 지시): 수동/일정표 **모드 토글·날짜/시간 슬라이더·미배치 트레이 제거** → **단일 실시간 뷰**. 위치 우선순위 = **수동 지정 > 현재 시각(`smNow()`=실제 `new Date()`, 잼버리 8/2~8/9일 때만) 일정표 연동 > 기본 JHQ 본부**(전원 기본 JHQ). 임의 이동 시 수동 지정(우선·서버 저장), ‘수동 배치 초기화’로 자동 복귀. 상단 ‘지금 기준 · 날짜·시각’ 라이브 표시 + **1분마다 자동 갱신**(`setInterval`, sitemap 뷰일 때). 행사 기간 외엔 ‘전원 기본 위치(JHQ 본부)’.
- **현장 지도 가독성**(한 구역 다수 인원): 아바타 25→**30px**·구역 점 흰 채움+accent 3px 링(15px). 한 구역 **여러 명 → 대표 3명 겹쳐(stack) + `+N` 배지**, 라벨 ‘· N명’. **클릭 시 말풍선(`.smpop`)**으로 전체 명단(아바타·이름·일정/수동/기본 표시 + ‘이동’·수동만 ‘해제’). 클릭 흐름: 인원 선택중→구역 클릭=수동 배치, 미선택+인원 구역 클릭=말풍선, 빈 곳=닫기. 아바타 드래그=수동 이동. `smByZone`/`smPopZone`.
- **JHG → JHQ 본부**(오타 정정): 소스 `meetingSeeds` 8곳(`memo`) replace + **라이브 KV read-modify-write**(비파괴): events 8(memo)+timetable 8(place) → ‘JHG 회의실’→‘JHQ 본부’. 검증 후 라이브 JHG 0건·‘JHQ 본부’ 16건.
- 검증: `node --check`(app·middleware) + 헤드리스 Chrome(CDP, 관리자 세션): 그루핑 4그룹·라벨·일반회원 3그룹(staff/sitemap 숨김) / 모드토글·트레이 없음·라이브 시각 표시 / **전원 JHQ 기본**(6명·아바타 3+‘+3’) / 현재시각 mock(8/5 20:30)+담당 지정→그 인원 메인무대(sched)·나머지 JHQ / 수동 이동→food(manual·핀) / 말풍선 명단·이동·해제 / **콘솔 에러 0** + 스크린샷. ⚠️ 실 인원/배치 저장은 로그인 필요 → 사용자 QA.

### 16.52 v0.9.163 — 자료실 100MB(R2 도입) + 콘텐츠 리스트 UX 4개선
- 사용자 3건: (1) 원격 동기화, (2) 리스트 보기 개선, (3) 자료실 업로드 1개당 100MB.
- **원격**: `origin/main` == 로컬(`9607f25`), ahead/behind 0 · working tree clean → 조치 없음.
- ⚠️ **100MB = KV로 불가** → R2 도입(AskUserQuestion 확정): Cloudflare **KV는 값 1개당 25MiB가 하드 리밋**이라 `file.js`의 MAX만 올리면 25MB 초과 시 `put`이 실패한다. §18.7의 "R2 없음" 방침을 사용자 승인 하에 변경.
- **R2 인프라**: 버킷 `jimmyport-assets` 생성(`wrangler r2 bucket create`) + `wrangler.toml`에 `[[r2_buckets]] binding="SCOUT_R2"`. 계정에 R2는 이미 활성(타 프로젝트 버킷 4종 존재)이라 사용자 추가 조치 없음.
- **신규 `functions/api/r2.js`** — **8MiB 청크 멀티파트**(단순 POST 아님): Workers 요청 본문 제한이 Free/Pro 100MB라 100MB 파일 1회 POST는 경계에 걸림 → 청크로 우회 + 진행률 확보. `POST ?action=create` → `PUT ?action=part&part=N` 반복 → `POST ?action=complete`(실패 시 `abort`). GET `?id=<key>`는 공개 스트림(`/api/file`과 동일). 보안: 키는 서버 생성만 허용(`^jpa\/[A-Za-z0-9-]{8,64}$` → 경로 조작 차단), 업로드는 `memberOrAdmin`, **complete 시 실제 `obj.size`로 100MB 재검증**(클라가 create의 size를 속여도 차단 후 delete), 파트 상한 12MiB. 바인딩 없으면 503 `r2_unbound`(조용한 실패 방지).
- **클라**(`jamboree-plan/app.js`): `uploadAttachment(file,onProg)`가 **8MB 이하=기존 KV(`/api/file`) · 초과=R2 멀티파트**로 분기(`uploadLarge`) → 자료실·콘텐츠 모달 첨부 양쪽이 함께 100MB 지원. `handleAttachments` 10MB 게이트 → `MAX_FILE`(100MB). `uploadAssets`는 **순차 업로드**(큰 파일이 대역폭 경합하지 않게) + **진행률 바**(`#lib-progress`, 100MB는 오래 걸려 토스트만으론 상태 불명). `jp-assets` url 화이트리스트에 `r2` 추가, **DELETE 시 R2 실물까지 삭제**(용량 큼).
- **콘텐츠 리스트 4개선**(사용자가 4개 모두 선택): ① **빈 슬롯 기본 숨김** — 기존 `isDefaultEdit`(+history/notes) 재사용한 `isBlankSlot`으로 손 안 댄 시드 38개를 숨겨 기획 칼럼 도배 해소(v0.9.21의 '빈 테이블' 문제가 칸반에서 재발했던 것), `빈 슬롯 보기 (n)` 토글(localStorage). ② **필터바 접이식**(기본 접힘) + 활성 필터 요약(`▸ 필터 · 상태 완료 · 검색 “…”`) — 6줄 23버튼이 보드를 밀어내던 문제. ③ **칼럼 간 드래그앤드롭** 상태 이동(`.dropcol` 하이라이트, 카드 하단 세그는 모바일 폴백으로 유지). ④ **정렬 세그**(날짜/마감/담당자/제목, localStorage). 기존 캘린더 DnD(`dragSrc`)와 충돌 없게 `boardDrag`·`.bdragging` 별도 네임스페이스.
- 검증: `node --check` + ESM 임포트(r2·jp-assets) + **헤드리스 Chrome(puppeteer-core, 로컬 http, /api/* 전부 목업 → 운영 KV 무접촉) 19/19 PASS** — 빈 슬롯 기본 3장·토글 시 41장(3+38)·정렬 세그 4·필터 기본 접힘·요약 표시·드롭 하이라이트·드래그로 기획→완료 이동 / **100MB→8MiB 13파트·complete에 13 etag·abort 0·101MB는 시도 자체 차단** / **콘솔 에러 0** + 스크린샷. ⚠️ 실제 R2 업로드(라이브 바인딩)는 로그인 필요 → 사용자 QA. 운영 KV 파괴적 쓰기 금지(§16.6) 준수.

### 16.53 v0.9.164 — 소식 제보 → 일정(자동분기) + 제보 양식 희망 일시 + 자료실 업로드 모달
- 사용자 3건: (1) "소식제보 받으면 우리가 일정과 날짜를 정하고 담당자가 배정되면 일정표에도 노출", (2) 제보 양식에 날짜·시간 **선택항목**, (3) 자료실 문서 업로드를 **팝업 아닌 모달**로.
- ⚠️ **일정표는 8/2~8/9(JAM_DAYS) 8일만** 다루는데 §16.49c에서 제보를 "행사 전부터" 받게 바꿔서, 7월 제보엔 올릴 자리가 없음 → AskUserQuestion으로 **날짜 자동 분기** 확정.
- **제보 → 일정 잡기**(`openTipSchedule`/`commitTipSchedule`): 제보 카드(홍보부만) '일정 잡기' 버튼 → 모달(날짜·시작시각·소요·제목·담당 인원·구역). **날짜로 자동 분기** — `isJamDay(d)`면 **잼버리 일정표**에 취재 블록(`cat:'홍보활동'`, assignees, zone, `tipId`), 아니면 **콘텐츠 캘린더** 슬롯(`addContent`+제목/시각/담당/`ctype:'취재'`). 날짜 바꾸면 목적지 배너가 **라이브 전환**(소요시간 필드도 일정표일 때만). 프리필 = 제보자 희망 일시·구역·본문 첫 줄(제목 추정)·기존 담당.
- **양방향 링크**: 제보 record에 `scheduled{kind:'tt'|'slot',ref,date,time}` → 카드에 일정 칩(teal=일정표/보라=캘린더, 클릭 시 `openTipScheduled`가 해당 탭+모달로 이동), 버튼은 '일정 변경'+'링크 해제'(`unscheduleTip`, 일정 자체는 보존). 반대 방향은 timetable item의 `tipId`. 담당자도 제보에 동기화.
- **제보 양식 희망 일시**(`krjam-jebo.html`, ko/en): 관련 위치 아래 `희망 날짜 · 시간 (선택)` — `type=date` + **시/분 number 입력**(§16.36 24시간제 준수, `type=time` 금지). `wishTime()`이 시·분 모두 유효할 때만 `HH:MM` zero-pad, 아니면 빈 문자열(선택 항목이라 제출을 막지 않음). T 사전 ko/en 추가.
- **API**(`jp-tips.js`): `date`/`time`(제보자 희망) + `scheduled`(홍보부가 잡은 일정) 필드. `cleanDate`/`cleanTime`/`cleanScheduled` — 형식 안 맞으면 조용히 버림(선택 항목이라 제보 자체는 통과). PATCH에서 date/time/scheduled 갱신(`scheduled:null`=해제).
- ⚠️ **서버 필드 누락 2건 사전 발견·수정**: (a) `cleanEdit`에 **`memo`가 없어** 슬롯에 제보 본문을 넣으려던 `e.memo`가 조용히 스트립될 것 → 해당 라인 제거. (b) `cleanTT`에 **`tipId`가 없어** 일정표→제보 역링크가 저장 시 사라질 것 → `cleanTT`에 `tipId` 추가 + `buildCleanTT`에도 추가(편집 시 유실 방지, `openTT`의 `clone(ex)`는 이미 보존).
- **자료실 업로드 모달**(`window.prompt` 태그 입력 폐기): `openLibUpload`→`#lib-scrim` 모달(파일 목록 + 개별 크기 + ✕로 빼기 + 100MB 초과 표시/경고 + 태그 입력 + 유효 파일 수 반영 버튼)→`commitLibUpload`→`uploadAssets(files,cat,tags)`. `uploadAssets` 시그니처에 tags 추가(prompt 제거).
- UI 수정: 제보 카드 `.tip-top`에 칩이 4개(상태·외부제보·담당·일정)가 되며 글자가 세로로 쪼개짐 → `flex-wrap:wrap` + 칩 `white-space:nowrap`. 목적지 배너 flex gap이 `<b>` 뒤 "에"를 띄어놓던 것 → 텍스트를 `<span>`으로 감쌈. 제보 완료 문구 '소중한 **현장** 소식' → '잼버리 소식'(§16.49c 리프레이밍 잔재).
- 검증: `node --check`(app·jp-tips·jamboree-plan) + krjam-jebo 인라인 JS 파싱 + **헤드리스 Chrome 36/36 PASS**(로컬 http, /api/* 목업 → 운영 KV 무접촉) — 공개 폼(날짜/시/분·(선택)·`type=time` 0개·EN 번역·미입력 제출 가능·9/5→`09:05`) / 제보 카드(희망 일시·일정 잡기·프리필·제목 추정·구역·담당칩) / **8/5→일정표 분기·7/20→캘린더 분기(라이브 전환)** / 캘린더 경로 슬롯 저장(제목·20:00·김기자·취재) · 일정표 경로 timetable 생성(홍보활동·assignees·zone·tipId) · scheduled 링크 slot/tt 양쪽 · 담당 동기화 · 일정 칩/변경/해제 / 업로드 모달(목록 2·초과 경고·태그·업로드(1)·파일 빼기·**prompt 미사용**) / **콘솔 에러 0** + 스크린샷 4종. ⚠️ 실 저장 흐름은 로그인 필요 → 사용자 QA. 운영 KV 파괴적 쓰기 금지(§16.6) 준수.

### 16.54 v0.9.165 — 자료실 카드 클릭=미리보기 + 일정표 '취재 불필요' 체크(회색 처리)
- 사용자 2건: (1) 자료실 카드 클릭 시 바로 다운로드가 아니라 **무슨 자료인지 볼 수 있게**, (2) 일정표에서 **취재 불필요한 일정 체크** → **저채도·고명도 비활성 회색**.
- ⚠️ **미리보기 제약 발견**: `/api/file`·`/api/r2` 는 `content-disposition: attachment` 를 강제해 PDF 를 iframe 에 띄우면 브라우저가 다시 다운로드한다. (`/api/image` 는 disposition 없이 inline 이라 이미지엔 문제 없음.) → 두 엔드포인트에 **`&inline=1`** 지원 추가(붙이면 `inline`, 없으면 종전대로 `attachment`). **기존 '받기' 링크는 파라미터 없이 그대로 → 다운로드 동작 불변**(하위 호환).
- **자료 미리보기**(`openAsset`/`closeAsset` + `#asset-scrim`): 카드 전체가 트리거(`data-lib-open`, role=button·키보드 Enter/Space). 이미지=큰 이미지 · PDF=`iframe`(inline=1) · 그 외=형식 배지 + "미리보기 미지원, 받기로 확인" 안내. 메타(구분·형식·용량·올린 사람·날짜) + 태그. 푸터=받기(attachment 유지)·새 탭·삭제(작성자/관리자). 닫을 때 `asset-body` 비워 **iframe 백그라운드 로딩 중단**. `deleteAsset` 성공 시 열려 있던 자료면 모달도 닫음.
  - 순수 헬퍼 분리: `assetById(id)`·`inlineUrl(u)`·`isPdfAsset(a)` (입력→반환, 부작용 없음).
  - 카드 썸네일 `<a>`→`<div>`(바로 열리던 링크 제거). **'받기' 링크는 `data-lib-dl` 로 위임에서 early-return** → 미리보기 안 열리고 그대로 다운로드.
  - `jp-assets` POST 에 `size` 저장(구버전 기록은 0 → 카드/모달에서 '—' 또는 생략).
- **취재 불필요**(`noCover`): timetable item 에 `noCover` 필드. ① **블록 hover 토글**(`.ttg-cov`, 삭제 ✕ 옆 — 여러 건을 모달 없이 빠르게 표시) ② **모달 체크박스**(`#tt-f-nocover`). 켜져 있으면 hover 아니어도 계속 보임(`.on`).
  - 회색 처리: 블록 배경은 **인라인 `style="background:catColor"`** 라 CSS 로 덮으려면 `!important` 필요 → `.ttg-ev.nocover{background:#EDEFF0!important;color:#98A0A6!important;...}`. **흰 글자 유지 시 밝은 배경에서 안 보이므로 글자도 회색으로 함께 지정**(가독성). `취재 X` 배지 추가. 실측 검증: **채도 S=0.021 · 명도 V=0.922 · 글자 rgb(152,160,166)**.
  - ⚠️ 함정 2건: (a) `.ttg-ev` 의 `pointerdown` 이 드래그를 시작하므로 **`.ttg-cov` 를 예외 목록에 추가**(안 하면 토글 클릭이 블록 드래그가 됨). (b) `commitTT` 의 시리즈 '모든 반복' 분기는 필드를 **명시 나열**이라 `noCover` 를 추가(누락 시 반복 일정에 전파 안 됨). `ttCopy` 는 `Object.assign` 이라 자동.
  - 서버 `cleanTT` 에 `noCover:!!e.noCover` 추가(없으면 저장 시 스트립됨).
- 검증: `node --check` + 4개 API ESM 임포트 + **헤드리스 Chrome 30/30 PASS**(로컬 http, /api/* 목업 → 운영 KV 무접촉) — 자료실 14/14(카드 클릭=미리보기·PDF inline=1·이미지·미지원 안내·메타·받기는 미리보기 안 열림·닫기 시 iframe 정리) / 일정표 15/15(hover 토글 노출·`.nocover`·취재 X 배지·서버 noCover 저장·다른 일정 무영향·**저채도 고명도 실측**·해제·모달 체크박스·모달 저장 유지·**토글이 드래그를 시작하지 않음**) / **콘솔 에러 0** + 스크린샷(일반=컬러 vs 취재불필요=회색 대비 확인).
- **남은 기술 부채**: (1) `toggleNoCover`/`deleteAsset` 이 상태변경+저장+렌더+토스트를 함께 수행 — 기존 `deleteTT` 등과 같은 관행이라 이번엔 맞췄고, 추후 `mutate → save → render` 분리 권장. (2) `renderTimetable` 이 1블록에서 마크업·이벤트배선·레이아웃 계산을 모두 처리(약 70줄) — 블록 렌더러 추출이 다음 후보. (3) `jamboree-plan/app.js` 3,000줄+ 단일 파일·전역 `state` — 도메인별(tips/library/timetable) 분리가 중장기 과제. 우선순위: (2) > (1) > (3).

### 16.55 v0.9.166 — 기술 부채 정리(§16.54가 남긴 3건) + krjam-planning 구조 분리
- 사용자 "모두 진행해" → §16.54의 남은 부채 3건 전부. **최우선 규칙 ③(코드 작업 원칙)** 적용 첫 사례.
- **기능 변경 0건.** 순수 구조 개선 — 사용자 눈에 보이는 동작은 이전과 동일해야 하고, 실제로 동일함을 회귀로 증명함.
- **⓪ 회귀 테스트 먼저**(§3.3 "테스트 또는 검증 수단을 만든다"): `regress.js` — 로컬 http + 실제 Chrome, `/api/*` 전부 목업(운영 KV 무접촉). 부팅·탭·보드(빈슬롯/정렬/필터/DnD)·캘린더·일정표(좌표 픽셀·회색·토글·모달·전체기간)·제보→일정(분기)·자료실(미리보기/업로드/R2 13청크)·대시·인원 = **33항목**. 리팩터링 **각 단계마다 실행 + baseline diff**(생성 id만 정규화). 4단계 전부 **33/33 · baseline과 완전 동일**.
- **① `renderTimetable` 분해**(1함수 ~70줄 → 역할별): `ttBlockGeometry`(좌표 계산, DOM 무접근·부작용 없음) · `ttGeoStyle` · `ttBlockTooltip` · `ttRundownHtml` · `ttProtocolBlockHtml` · `ttEventBlockHtml` · `ttBlocksHtml`(레인 배치) · `ttHeadHtml` · `ttHoursHtml` · `ttCellsHtml` · `ttColumnHtml` · `renderTTLegend` · `wireTimetableGrid`(부작용) → `renderTimetable`은 조립만. 문자열 누적 클로저(`emitTT`가 외부 `H`를 mutate)를 **반환값 조립**으로 교체. `TT_HH`는 `col.hh`로 주입(드래그가 같은 전역을 참조해야 해 전역 갱신은 유지, 이유를 주석에 명시).
- **② mutate → save → render 분리**: `saveTimetable(); renderTimetable(); if(staff) renderStaff();` 3줄이 **4곳에 복사**(deleteTT·toggleNoCover·finishTT·deleteTTCur)돼 있던 것을 `afterTimetableChange()` 하나로(§4.6). 데이터만 바꾸는 `setTtNoCover`/`removeTt`/`ttById` 분리. `deleteAsset`은 network(`requestAssetDelete`) / state(`removeAssetFromList`) / UI(orchestration)로 3분할하고 **실패 원인을 auth·forbidden·network로 구분**(§7 "모든 오류를 하나의 일반 오류로 바꾸지 않는다") → `ASSET_DELETE_ERR` 상수.
- **③ app.js 분리**(3,469 → **3,232줄**, 신규 3파일): 로드 순서 **core → upload → library → app**(classic script, HTML 인라인 onclick 0개라 안전).
  - `core.js`(111줄) — leaf 유틸: WD/WDS·날짜(ymd/iso/dayDiff/todayISO)·esc/pad2/fmtMB/fmtNewsTime/normUrl/htmlToText/mkid·ICON+icon·toast/copyText·downscale/uploadBlob. **의존성 0 · 단방향(app→core)**. 같은 배열이 `WD`/`WDS` 두 이름으로 중복 선언돼 있던 것 별칭으로 통일.
  - `upload.js`(56줄) — 저장소 선택 규칙(KV ≤8MB / R2 >8MB 멀티파트) + `uploadAttachment`/`uploadLarge`. 자료실·콘텐츠 첨부가 공유하므로 도메인 아닌 인프라로.
  - `library.js`(203줄) — 자료실 도메인 전체(목록·미리보기·업로드 모달·삭제). 상태 소유(`libItems` 등)를 파일 주석에 명시.
  - 검증: 4파일 간 **함수·전역 var 중복 정의 0** 확인(뒤 로드가 앞을 덮어쓰는 사고 방지).
- **캐시버스터 정리**: `?v=0.9.161`(버전과 4단계 어긋나 있었음) → `0.9.166`. `_middleware`의 no-cache가 있어 장애는 아니었으나 의도대로 정정.
- **남은 기술 부채**(우선순위 순): (1) **세션 계층(`Auth`/`authHeader`/`authExpired`)이 아직 app.js** → `upload.js`·`library.js`가 app.js 전역을 역참조(개념적 순환). `session.js`로 빼면 core→session→upload→library→app 단방향 완성. `authExpired`가 `reflectAuthUI`(app UI)를 부르는 것이 걸림돌 — 콜백 주입으로 끊을 수 있음. (2) 남은 도메인(tips·timetable·calendar·board·dashboard)이 여전히 app.js 3,232줄에 공존 — library.js 패턴 그대로 반복하면 됨(회귀 스위트가 이미 각 도메인을 커버). (3) 전역 `state` 객체를 여러 렌더러가 직접 변경 — 도메인 분리 후 소유자를 파일 단위로 고정하는 것이 순서.
- **회귀 스위트를 repo 에 보존**: `test/regress-krjam-planning.js` + `test/README.md`(실행법·커버 범위·목업 한계). 다음 리팩터링도 이걸 baseline 으로 쓴다.
  - ⚠️ 이 과정에서 **`test/` 가 라이브에 공개 서빙된다는 걸 발견** — `_middleware.js` BLOCKED 는 `*.md`·설정파일만 막고 `test/*.js` 는 통과였음. `/^\/test(\/|$)/i` 추가로 404 처리(§18.1과 같은 종류의 누수).
- ⚠️ 검증 한계: 회귀 스위트는 `/api/*` 목업이라 **실제 로그인·서버 저장 경로는 미포함** → 사용자 QA 필요. 운영 KV 파괴적 쓰기 금지(§16.6) 준수.

### 16.56 v0.9.167 — 소식 제보 카드 가로 배치
- 사용자: "가로로 길게 배치되면 좋을듯해"(제보 카드 스크린샷). 좁은 그리드라 제목·연락처·도구가 계속 접혀 읽기 나빴음.
- **CSS만 변경**(마크업·JS 0): `.tipgrid` `repeat(auto-fill,minmax(290px,1fr))` 그리드 → **세로 스택 flex**(카드가 풀폭 행). `.tipcard` `column` → **`row`**(사진 좌 232px · 내용 우 `flex:1;min-width:0`). `.tip-tools` `margin-top:2px`→`auto`(사진이 더 높을 때 도구가 아래 정렬).
- ⚠️ 함정 2건: (a) `.tip-photos` 배경(`--line-2`)이 카드 높이만큼 늘어나는데 `.tip-thumb` 의 `min-height:110px/max-height:230px` 때문에 이미지가 안 채워서 **사진 아래 회색 여백**이 생김 → 가로 배치에서만 `height:100%;max-height:none`. (b) 그 오버라이드가 **모바일(column)로 새면** 사진 열 높이가 auto 라 `height:100%` 가 무너짐 → `@media(max-width:820px)` 에서 원래 값 복원(+ `flex-direction:column`).
- 검증: 헤드리스 — 1400px=`row`·430px=`column` 전환, 사진 유/무 카드 스크린샷(회색 여백 해소·모바일 사진 정상), **회귀 34/34**(기존 33 전부 유지 + 레이아웃 항목 1 신규). 회귀 스위트에 `제보 카드 가로 배치(row)` 어서션 추가해 다음에 깨지면 잡히게 함.
- 관찰(미조치, 별건): ≤430px 에서 syncbar `.orgtag` 가 글자당 줄바꿈됨(버튼들이 안 줄어 폭을 0으로 밀어냄). 이번 변경과 무관한 기존 이슈라 범위 밖으로 두고 기록만.

### 16.57 v0.9.168 — 레거시 파일 정리 + 내부 원본 공개 차단
- 사용자 "레거시 파일 중 필요없는것들은 모두 지워버리고". 전수 조사 후 **판단 필요 3건은 AskUserQuestion 으로 확정**하고 삭제(임의 삭제 금지 — 2건은 CLAUDE.md 에 '보존' 결정이 기록돼 있었음).
- **삭제**:
  - `박지민 포트폴리오 사이트/`(9파일 1.5MB) — 코드 참조 0. 최우선규칙②의 '포트폴리오 예정(새 repo)' 자료였으나 **사용자가 완전 삭제 선택**(처음부터 새로 만들 계획). 과거 커밋에 남아 복구 가능(`git show 86b1928^:"박지민 포트폴리오 사이트/..."`).
    - ⚠️ **정정**: 조사 당시 이 경로가 200 이라 '공개 노출'로 보고했으나 **오판이었음**. Pages 는 매칭되는 자산이 없으면 **index.html 을 폴백으로 200 반환**한다(존재한 적 없는 `/definitely-not-real.txt` 도 200). 삭제 전 배포본(a4754bea)에 직접 확인한 결과 `text/html · 7,104B`(=랜딩 폴백)였고 실제 파일이 아니었다 — 한글·공백 경로라 자산으로 매칭되지 않았던 것. **교훈: Pages 에서 노출 판정은 상태코드가 아니라 `content-type`/`size` 로 할 것.**
  - `.github/workflows/deploy-on-push.yml` — `CLOUDFLARE_API_TOKEN`/`ACCOUNT_ID` secrets 가 **등록된 적이 없어 모든 push 마다 실패**(최근 5회 전부 failure, 14~19s 만에 'Missing secret' 종료). 존재하지 않는 `ADMIN_VERSION` 을 검증하고 이름도 구 도메인(jimmypark.net) 기준. 수동 `wrangler pages deploy`(§8)와 중복이라 제거 → 실패 알림·빨간 배지 노이즈 해소.
  - `.nojekyll`(빈 파일)·`CNAME`(내용 `scoutingapp.net`) — **GitHub Pages 관례 파일**. Cloudflare Pages 는 둘 다 읽지 않고 커스텀 도메인은 대시보드 설정. 참조 0 확인 후 제거. **삭제 후 두 도메인 200 재확인**(아래 검증).
- **보존 + 비공개**(사용자 선택): 루트 `KakaoTalk_Photo_2026-06-26-15-09-57.png`(872KB, 야영장 배치도 원본 · 시설물자관리본부 제작) — §16.43 의 '루트 원본 보존' 결정 유지하되 **라이브 공개 차단**. ⚠️ 이건 폴백이 아니라 **실제 노출이 맞았음**(삭제 전 배포본에서 `image/png · 889,263B` 확인) — 내부 문서가 URL 만 알면 받아지는 상태였다. `_middleware.js` BLOCKED 에 `/^\/KakaoTalk_Photo_[\d-]+\.png$/i` 추가. 앱이 실제로 쓰는 건 `jamboree-plan/assets/sitemap.png`(다운스케일본)이라 동작 영향 0.
- **유지 판정**(레거시로 오해하기 쉬우나 사용 중): `privacy.html`(index·tour/index 에서 링크) · `functions/api/auth-config.js`·`me.js`(admin.js 사용) · 루트 `app.js`/`admin.js`/`styles.css`/`data.js`(§18.4 — `tour/*` 가 루트 절대경로로 참조) · `data.js` 의 `SCOUT_NSOS`/`SCOUT_REGION_COLORS`(SCOUT_UNITS 만 비어 있음).
- **이미 정리됨 확인**: §17.4 가 남긴 죽은 편집기 CSS(`edit-form`·`ef-l`·`edit-panel`·`card-tools` 등) 는 v0.9.62 styles.css 전면 교체로 **이미 0건**.
- 미조치(코드 내 dormant, 파일 아님): `jp:placement`(§16.20 UI 미사용) · `launch`(§16.32 발대식 UI 제거 후 함수/데이터 잔존) — app.js 안의 죽은 경로라 파일 삭제 범위 밖. 도메인 분리(§16.55 부채 2) 때 함께 걷어내는 것이 안전.
- 검증: **회귀 34/34**(앱 무영향) + 배포 후 라이브 — **배치도 원본 404**(미들웨어 차단 확인) · `sitemap.png` 200(앱 사용본 정상) · **scoutingapp.net / jimmypark.net 둘 다 200**(CNAME 삭제가 커스텀 도메인에 영향 없음 확인) · 5개 앱 200 · 회귀 34/34.
  - ⚠️ 삭제된 경로는 404 가 아니라 **index.html 폴백 200** 이 뜬다(Pages 기본 동작, 404.html 없음). 삭제 검증은 상태코드가 아니라 **디스크·git 부재 + content-type** 으로 확인함.

### 16.58 v0.9.169~0.9.171 — 디자인 개선 STEP 1~3 (krjam-planning + krjam-jebo)
- 사용자: "컬러감 디자인 + 운영계획 + 샘플 디자인 시스템 제안" → **"예쁘게가 아니라 명확하고 이해하기 쉬운 게 중요"** → 계획 수립 후 "모든 작업을 순서대로 진행".
- ⚠️ **범위 정정**: 처음엔 5개 앱의 폰트·색 불일치를 결함으로 진단했으나, 사용자가 **"다 다른 사이트가 맞고, 제보랑 플랜만 같은 사이트"** 라고 정정 → 그 진단은 폐기. 랜딩·tour·카드뉴스·디데이는 **의도적으로 다른 사이트**이므로 손대지 않음.
- **감사 방법**: 눈이 아니라 계산 — WCAG 2.1 상대휘도로 41색(토큰 34 + 일정표 종류 7) 전수 대비 측정 + 헤드리스 실측(1440·390px).
- **STEP 1 (v0.9.169) — 현장에서 깨지는 것**
  - ⚠️ **모바일 상단 붕괴**: 390px 에서 `.orgtag` 가 **13px 폭 × 326px 높이**로 한 글자씩 세로로 쪼개져 첫 화면 300px 을 먹고 페이지가 **421px 로 넘침**. 원인 = `.syncbar` 가 flex 인데 `.orgtag` 에 flex 설정이 없음 → **한국어는 어느 글자에서나 줄바꿈되므로 min-content 가 한 글자** → 버튼들이 폭을 다 가져감. 해결: 라벨에 자기 줄(`flex:1 1 100%`), `spacer` 숨김, **모바일에선 sticky 해제**(3행 바가 작은 화면을 영구 점유할 이유 없음). `#rostertbl`(7열 552px)은 기존 `.tblscroll` 패턴으로. → **12개 탭 × 390·430px 전수 넘침 0**.
  - ⚠️ **흰 글씨가 안 읽힘**: 상태 배지 2.67/3.15/3.99, 일정표 블록 4.18/3.72 — **가장 많이 보는 신호가 가장 안 읽혔다**. 솔리드(선택 상태·점)는 어둡게(7.74/5.92/6.41), 반복 노출 배지(`.tip-badge`·`.apbadge`·`.postbadge`·`.dp-st`)는 **연한 배경 + 진한 잉크 칩**으로. `--muted` 4.63→5.14, `--danger` 4.55→5.50, 채널 명도 조정.
  - ⚠️ **`--faint`(2.01)가 실제 텍스트에 쓰이고 있었음** — 탭 그룹 라벨·캘린더 시드 제목 등. 문서엔 "플레이스홀더 전용"이라 적혀 있었으나 현실이 달랐다 → 3.40 으로 올리고 **실제 텍스트 8곳은 `--muted` 로 승격**, faint 는 점선·빗금·플레이스홀더 전용으로 한정.
- **STEP 2 (v0.9.170) — 한 제품으로 묶기**
  - 두 화면은 한 사이트인데 **토큰을 각자 복붙**해 이미 드리프트: `--r-2` 12 vs **13px**, `--sh-1`·`--sh-2` 상이. 색·타입은 같은데 **모서리·그림자만 어긋나** "비슷한데 안 맞는" 상태였다.
  - **`jamboree-plan/tokens.css` 단일 원본** 신설 → `styles.css` 는 `:root` 제거, 제보 페이지는 인라인 토큰 버리고 `<link>`. r-2=12px·그림자 플랜 값으로 통일. **19개 토큰 브라우저 계산값 완전 일치** 확인.
  - **타입 스케일 7단계 토큰**(`--fs-1..7`) 추가 — 현행 21종(0.5px 차이·`13.3333` 브라우저 기본값 누수 포함)은 위계로 일하지 않는다. **새 코드부터** 적용, 일괄 치환 안 함.
  - **폰트 폴백**: 스택이 `Arial`(한글 없음)로 끝나 그 자리만 글자 모양이 달랐음 → `--font-sans` 로 통일, 끝을 한글 폰트로 닫음.
- **STEP 3 (v0.9.171) — 규칙을 코드에 심기**
  - **색 피커 가드**(`core.js` `darkenToContrast`, 순수 함수): 일정표 종류 색은 사용자가 고르는데 그 위에 흰 글씨가 얹힌다 → **규칙이 코드에 없으면 팔레트는 반드시 다시 무너진다.** 미달이면 통과할 때까지 어둡게 + 이유 안내, **이미 통과하는 색은 건드리지 않음**(사용자 선택 존중). 검증: 형광 노랑 1.27→4.82(hue 유지), **무작위 4096색 전수에서 미달 탈출 0**. 자동배정 `TTCAT_PALETTE` 14색도 미달 섞여 있던 것 전부 통과로 교체.
  - **회귀 스위트 34→40**: 흰 글씨 대비·상태/단계 토큰 대비·390/430px 넘침·상단 라벨 붕괴. **디자인 회귀는 diff 에 안 보이므로 어서션으로 고정**. 음성 테스트로 실효성 확인 — 옛 색을 되돌리자 **39/40 으로 실패하며 원인 토큰 3개를 지목**.
- **원칙**(문서화): ① 형태가 축을, 색이 값을 나타낸다(상태=연한 칩 · 단계=솔리드 띠 · 채널=pill · 종류=블록) → 축이 달라 hue 를 재사용해도 형태로 갈린다 → **한국 대표단의 초록을 안 바꿔도 됨**(운영자가 외운 뜻을 깨는 비용이 더 큼). ② 흰 글씨는 4.5 이상인 색에만. ③ 색은 혼자 일하지 않는다. ④ 새 색은 규칙을 통과해야 들어온다.
- **STEP 4(행사 후, 미실시)**: 제보 데스크톱 프리앰블 333px·언어 토글 78px 바 정리, 탭 12개 재편 — 운영자가 위치를 외운 상태라 **행사 중 이동 금지**.
- 산출물: 디자인 진단·로드맵 / 디자인 시스템·운영계획 아티팩트 2종. 검증: 회귀 **40/40** · 모바일 24/24 · 두 화면 토큰 일치 · 콘솔 에러 0.

### 16.59 v0.9.180 — 버그 일괄 수정(멀티에이전트 리뷰) + 보안 게이트 + 자료실 목록형/문서명 + 마스터 계정 + dormant 정리
- 사용자: "버그 수정이랑 부채정리부터" + 추가 3건(자료실 목록형·업로드 문서명·박지민 마스터). 병렬 리뷰 에이전트 3개(프런트/서버API/크로스파일)로 버그 헌팅 후 일괄 반영.
- **회귀 스위트 실행환경 복구**: `test/*.js` 3파일의 `ROOT` 가 `/Users/jimmy/...`로 하드코딩(다른 머신 경로) → `path.resolve(__dirname,'..')`. puppeteer-core 는 스크래치 설치+`NODE_PATH`. ⚠️ 쉘 내장 grep 이 간헐 무출력 — `/usr/bin/grep` 사용.
- **HIGH 버그 수정**:
  - **자료실 이미지 업로드 전멸**(v0.9.145부터): `uploadBlob`(core.js)은 URL **문자열**로 resolve 하는데 library.js 가 `.json()` 재호출 → TypeError → 전건 "실패" 집계. 문자열 그대로 받아 `record({url},…)` 로 수정.
  - **모든 저장 작성자 '익명'**: `authorVal()` 이 v0.9.27에서 제거된 `#author` 입력을 계속 읽음 → `Auth.name||Auth.username||'익명'` 으로 연결(카드/메모/문구/일정 전부 실명 기록 복구).
  - **세션 만료 후 게이트 재표시 시 로그인 불능**: `wireAuthGate` 가 세션 있으면 조기 반환해 폼 미배선 → 배선은 항상 수행.
  - **sanitizeHtml 우회 XSS**: 정규식(`\son\w+=`)이 `<img/src=x/onerror=…>` 통과 → DOMParser 파스 후 태그/속성 화이트리스트 방식으로 재작성.
- **보안 게이트(서버)**: ① `/api/jamboree-plan` GET/PUT/DELETE 에 `memberOrAdmin` 필수(기존 완전 무인증 — 비로그인 wipe·연락처/실명 공개 노출). 캐시 조회보다 먼저 검사. 클라 전 호출부 `authJsonHeaders()`/`authHeader()` + 401→`authExpired`, 보드 로드는 `loadBoard()`(로그인 후·`onAuthed`). ② `/api/file` POST 인증 필수, `/api/image` POST IP 레이트리밋(40/10분, `_lib.uploadRateOk`). ③ **authorName 사칭 차단**: jp-news/jp-assets/jp-tips 표시명을 body 가 아닌 **세션 서명값**(`who.name`)으로. ④ 예약 아이디(`admin` 등) 가입 차단(관리자 sentinel 탈취 방지). ⑤ dcount 사진 URL `^\/api\/image\?id=[A-Za-z0-9_-]+$` 전체형식 강제 + planning 캘린더 디데이 칩 esc()(속성 탈출 XSS).
- **MEDIUM/LOW**: 일정잡기 모달 날짜 변경 시 구역·소요 초기화(재렌더 전 회수), 자정 `parseInt||10`→NaN 검사, 첨부 진행률 `svg.nodeValue` no-op→textContent, `fmtNewsTime` Invalid Date 가드.
- **자료실**: **카드 그리드→목록형(행)**(CSS만, 클래스 유지 — 64px 썸네일·이름/태그/메타·우측 도구, ≤640px 랩). 업로드 모달에 **파일별 "검색될 문서명" 입력**(기본=파일명, input 위임으로 포커스 유지, 초과 파일과 인덱스 동기 필터) + `size` 저장.
- **마스터 계정**: 회원 레코드 `master` 플래그 — 로그인 시 세션에 `{username,name,master}` **서명**, `memberOrAdmin` 이 master→`admin:true` 판정(TOTP `adminUser` 는 불변 — tour/dcount 무영향). jp-members GET/PATCH 게이트 = TOTP 또는 마스터. PATCH `action:'master'` + 회원관리 모달 "마스터 지정/해제" 버튼·배지. 클라 `Auth.master`(isAdmin 포함, 15분 유휴 로그아웃은 TOTP 전용, 비번변경 가능). ⚠️ **박지민(tsak1420) 지정은 KV 직접 쓰기가 권한정책상 차단** → 배포 후 관리자(TOTP) 로그인 → 회원 관리 → "마스터 지정" 1클릭 → 본인 재로그인.
- **dormant 정리**(§16.55 부채 ①대응): launch(발대식) 함수·API 분기·KV 분기, placement(수동 배치표) 전부, `saveAll`/`openDay`/`timeOptions`/`smSelectPerson`/`updatePendingUI`/`contactSub`/`contactPhoneLine`, 죽은 CSS(.viewtabs·.addslot·.cdot·.sc-bar·.smchip). KV `jp:launch`/`jp:placement` 데이터는 잔존(무해).
- **미해결(기록)**: 공유 배열 lost-update(timetable 등 12키 통짜 덮어쓰기 — 동시 편집 유실 가능, 아키텍처 과제) · jp-tips GET 이 일반 회원에게도 제보자 전화 노출(승인 회원 한정이라 중위험, 제품 결정 필요) · session.js 분리(부채 ②)는 다음 회차.
- 검증: **회귀 42/42**(목록형·문서명 어서션 2개 신설) · nav 20/20 · jebo 29/29 · `node --check` 전 파일 · `_lib` ESM 임포트. ⚠️ 구세션(이름 미서명)은 표시명이 아이디로 폴백 — 재로그인 시 정상.

### 16.60 v0.9.181 — 소식 제보(jp-tips)를 홍보부 전용으로 (§16.59 미해결 마감)
- 사용자: "홍보부 유형만 보도록 조치해놔." §16.59에서 중위험으로 남겼던 제보자 전화·실명 노출(일반 회원도 GET 가능)을 마감.
- **staff 판정을 세션에 서명**: `jp-members` 로그인이 `tabs` 에 관리 탭(staff/contacts/orginfo/protocol) 하나라도 있으면(=홍보부 유형) 또는 master 면 `staff:true` 를 세션 payload 에 서명. `_lib.memberOrAdmin` 이 `staff` 반환(TOTP 관리자·마스터는 항상 true) — KV 재조회 없이 판정.
- **서버 게이트**(`jp-tips.js`): GET·PATCH 를 `who.staff` 요구(기존 `memberOrAdmin` = 모든 회원 → 일반 회원 통과였음). 비-staff 는 403. DELETE 는 staff 또는 본인 제보. POST(제보 등록)는 공개/회원 그대로(제보 창구라 열림).
- **프런트**: `Auth.canSee('tips')` 를 sitemap 과 함께 `isStaff()` 게이트(기존 무조건 true). `loadTips` 는 staff 일 때만 호출, 대시보드 액션 큐 '미처리 소식 제보'도 staff 게이트. setView 는 이미 canSee 로 막혀 일반 회원은 tips 뷰 도달 불가.
- 검증: 회귀 nav 20→22(일반 회원 소식 제보 탭 없음·직접 호출 차단 신설) · planning 42/42 · jebo 29/29 · `node --check`·ESM. ⚠️ 구세션(staff 미서명)은 재로그인해야 홍보부 탭 노출 — 서버는 세션 staff 없으면 403이라 데이터는 안전.

### 16.61 v0.9.182 — /krjam-planning 토스(Toss) 스타일 시각 개편 (크롬만, 색·구조 유지)
- 사용자: "홈페이지 디자인을 완전히 개혁, 토스 스타일로." AskUserQuestion으로 **레이아웃만 토스풍(색은 스카우트 유지)** 확정 → 이후 "이 대화에서는 **/krjam-planning만**" 재강조. 랜딩·jebo·dcount는 손대지 않음.
- **원칙**: 색 토큰(브랜드·상태·대비 검증값)·탭 구조/위치·기능 전부 유지, **형태 언어만** 토스로. 운영자가 외운 탭 위치를 지키기 위해 크롬(카드·버튼·입력·모달·여백·모서리·그림자·타이포)만 변경.
- **토스 토큰**(styles.css `:root` 오버라이드): 모서리 확대(r-1 8→10·r-2 14→16·r-3 18→20·r-field 12→14·r-card 16→18) + **부드럽게 번지는 2단 그림자**(하드 테두리 대신 부양감) + `--field-bg`/`--field-bg-focus`(채워진 입력 배경) + 토스식 감속 ease.
  - ⚠️ **tokens.css 는 krjam-jebo 와 공유하는 단일 원본** — 거기 값을 바꾸면 제보 페이지 룩도 바뀐다. 사용자 스코프("planning만") 준수 위해 tokens.css 는 **원복**하고 토스 토큰은 styles.css(planning만 로드)에서만 오버라이드. jebo 무영향 확인.
- **프리미티브**(styles.css): 버튼(크게+둥글게+`:active` scale 누름 피드백, 채움 우선) · 입력(`.ti/.ta`·`.fld`·`.evinput`·`.typeinput`·`.noteinput`·auth = 채워진 회색 배경→포커스 시 흰색 부상) · 탭(알약 pill, 채워진 비활성/솔리드 활성) · 헤더 h1 30px·섹션 h2 800 굵게 · 모달/대시보드 카드(테두리 → line-2, 넉넉한 패딩, 부드러운 부양) · `.btn.xs` min-height 재지정(base 44 상속 방지).
- 검증: **헤드리스 스크린샷 육안 확인**(대시보드·리스트/칸반·모달·모바일 — 알약 탭·플로팅 카드·채워진 입력·큰 버튼 확인) + 회귀 **42/42·22/22·29/29**(대비·넘침·flexDirection 유지, jebo 무변경) + 라이브(styles.css 오버라이드 존재·tokens.css 원복 확인).
- 남은 여지(후속 후보): 세그먼트 컨트롤(.statusseg 등) 활성 모서리 라운드, 캘린더 셀 디테일, 모션 트랜지션 확장. 사용자 피드백 후 진행.

### 16.62 v0.9.183 — /krjam-planning 다크 관제 테마 실제 구현(1단계)
- 사용자: 목업 3종(관제×정밀 컨셉 / 페이지별 PC·모바일 / 업무흐름 재설계 최종)을 아티팩트로 검토 후 **"말 말고 실제 구현하라 · 다크 관제가 취향"**. → 목업 단계 종료, 실제 프로덕션 코드에 이식 시작. **다단계**(각 단계 실제 배포·검증)로 진행 — 1단계 = 다크 관제 **테마**를 전 화면에 적용.
- ⚠️ **다크 = 단순 색 뒤집기가 아니라 리팩터**: 앱이 라이트 전제(토큰 이중역할·하드코딩 밝은 색 ~50곳·회귀 대비 테스트가 라이트 기준). **토큰 계약을 둘로 분리** — 상태/단계/위험 솔리드(--st-*·--c-*·--danger)는 "흰 글씨 얹는 배경"이라 어둡게 유지(흰글씨 4.5+), 텍스트 역할(--muted·--ink-2)은 어두운 지면(--bg) 위 4.5+로 밝게. 채널(--ch-*)은 어두운 칩 + 밝은 글씨.
- **구현**(styles.css :root 오버라이드, krjam-planning 전용 — tokens.css는 jebo 공유라 불변): 다크 팔레트(--bg #0F1311·surface 계열·ink 밝게) + 신호 그린 accent(#1F7350, 흰글씨 4.8 / accent-ink #66DDA0 텍스트용) + 헤어라인 라인 + 다크 그림자 + 채워진 다크 입력.
- **하드코딩 라이트 색 보정**: styles.css 말미에 보정 블록(syncbar·guard·캘린더 filled 라인·evkind/libtag/libcat·팝오버·유형/상태 배지·의전 골드·nocover 회색·ghost·제보/일정 칩 등) + app.js 인라인(dcard 캘린더·STCHIP·TIP_STATUS) 다크 틴트+밝은 글씨로. D-day 배너·시계·진행바 그라데이션은 밝은 끝에 흰 글씨 묻힘 방지로 어두운 초록 고정.
- **회귀 다크 계약 갱신**: 토큰 대비 테스트를 솔리드(흰글씨 4.5+)/텍스트(지면 4.5+) 둘로 분리, '취재 불필요' 배경 검사를 특정 밝은값→**저채도(채도차 ≤16)**로(라이트·다크 공용). --danger는 흰글씨 계약 지키게 #C0492F(4.5+), 텍스트 배지는 밝게 별도.
- 검증: 회귀 **43/43·22/22·29/29**(jebo 라이트 유지 확인) + 헤드리스 실제 보드 스크린샷 육안(대시보드·리스트/칸반·모달·일정표 전부 다크 일관·가독). ⚠️ 목업의 **IA 4공간 재편·콘텐츠 파이프라인·지도 공백구역**은 2단계(JS/HTML 구조 변경)로 별도 실제 구현 예정 — 이번은 테마만.

### 16.63 v0.9.184 — /krjam-planning IA 재편: 12탭 → 업무 4공간(2단 내비게이션) (2단계)
- 사용자: "구조 재편 들어가". 목업 최종안의 **업무 중심 IA**를 실제 코드에 이식. 뷰 렌더 로직·기능·데이터는 그대로, **내비게이션 셸만 2단 구조**로 바꿔 리스크 최소화.
- **12개 평평한 탭 → 업무 4공간 + 공간별 세부**: ① 대시보드(dashboard) ② 콘텐츠(calendar·list·news·tips) ③ 현장(timetable·sitemap·protocol) ④ 팀·자료(staff·contacts·orginfo·library). 상단 **공간바(wsbar)** → 선택 공간의 **세부바(subbar)**만 아래 노출(뷰 1개인 대시보드는 세부바 숨김).
- **HTML**(krjam-planning.html): `.tabbar`(4 tabgroup 전개) → `.wsbar`(4 wstab) + `.subbar`(12 vtab, 각 `data-ws` 태그). 항목 이름·순서·기능 불변.
- **CSS**: `.tabgroup/.tg-label/.tg-tabs` 제거, `.wsbar/.wstab/.subbar` 신설(다크 관제 톤, wstab=primary·vtab=sub). 모바일: 상단 wsbar 숨김 + subbar 상단 sticky 가로 스크롤.
- **JS**(app.js): `WS_LIST/WS_VIEWS/wsOfView/wsHasVisible` + `renderNav()`(공간·세부 활성/가시성, canSee 기준) + `setWorkspace(ws)`(그 공간 마지막 뷰/첫 뷰로, `wsLastView` 기억). `setView`가 renderNav 호출·wsLastView 갱신. `reflectAuthUI`는 renderNav+renderBotNav 로 단순화(옛 vtab/그룹 표시 로직 제거). **모바일 하단 탭 = 4공간**(옛 5탭+더보기 시트 폐기 — navItems/openNavSheet/BOTNAV_PRIMARY 제거, 세부는 상단 subbar 스크롤로). 배선: wstab→setWorkspace, vtab→setView, botnav[data-bnws]→setWorkspace.
- 권한: canSee 그대로 — 공간은 "보이는 뷰가 하나라도 있으면" 노출. 일반 회원 = 대시보드+콘텐츠(캘린더·리스트·기사)+현장(일정표만)+팀·자료(자료실만), 관리 탭(staff/contacts/orginfo/protocol/sitemap/tips) 안 보임·직접호출 차단 유지.
- 검증: **회귀 nav 18/18 전면 재작성**(2단: 공간→세부로 PC·모바일 12뷰 전부 도달·권한·넘침 0) + planning 43/43(부팅 검사 .tabbar→.wsbar·.tabgroup→.wstab, go()=setView 직접) + jebo 29/29 + 헤드리스 실제 보드(PC 공간바+세부바·모바일 하단 4공간+상단 세부 스크롤) 육안. ⚠️ 옛 navsheet DOM/CSS(.sheet 등)는 dormant 잔존(숨김·무해, 추후 정리). ⏳ 3단계=콘텐츠 파이프라인(제보 인박스+검수 단계) · 4단계=지도 공백구역 — 별도 실제 구현.

### 16.64 v0.9.185 — 현장 지도 다크 오버레이 + 대시보드 업무 우선 정리
- 사용자 2건: (1) 현장 위치 지도가 밝은 배치도라 다크 테마에서 마커가 묻힘 → "약간 검정 얹어 마커 잘 보이게", (2) 대시보드 인원·연락처 카드 불필요 + "첫 대시보드를 더 업무적 관점에서 직관적으로".
- **지도 오버레이**: `.smstage::after` = `rgba(0,0,0,.42)` 반투명 검정을 **이미지 위·마커(z-index 2+) 아래**에 깔아(pointer-events:none, 클릭 통과) 배치도를 눌러 아바타·존 점·라벨·촬영 핀이 도드라지게.
- **대시보드 업무 우선**: (a) `인원·연락처`(참고성)·`개영까지`(위 D-day 배너와 중복) 통계 카드 제거 → 5개(콘텐츠 진행·게시 완료·운영 일정·시간 일정·디데이 신청)로 정리. (b) **날씨 모듈을 맨 아래로 이동**(renderDashboard 말미 `#wx`를 `#dashboard` 끝으로 appendChild, idempotent) — 열면 D-day → 지금 처리할 일 → 콘텐츠 진행이 먼저. (c) sec-head 부제 "…날씨 · 운영 현황"→"지금 처리할 일 · 콘텐츠 진행 · 일정 현황을 한눈에".
- 검증: 회귀 43/43·18/18·29/29 + 헤드리스 실제 보드(지도 마커 대비·대시보드 업무 우선 순서) 육안 + 라이브(오버레이·카드 제거·날씨 이동 확인). ⏳ 3단계 콘텐츠 파이프라인 · 4단계 지도 공백구역은 여전히 예정.

### 16.65 v0.9.186 — 의전 표 3종 개선(인원별 그루핑 + 시간 숫자만 + 장소 구역 공유)
- 사용자 라이브 3건(의전 일정 사용 중 마찰): (1) 시간 입력 숫자 스피너 불편 → "그냥 숫자만", (2) 장소를 기존 장소(구역) 데이터와 공유, (3) 성명/직책(인원)별 그루핑.
- **인원별 그루핑**(renderProtocol 재작성): `protPersonKey`(성명+직책+구분)로 정렬·묶고, 인원 셀(구분·성명·직책)은 **rowspan 으로 한 번만** 표시(그 아래 그 인원의 일정들, 그룹 경계 border-top). 인원 셀 편집 시 **그룹 전체 행에 전파**(m.name/title/role 일괄). 헤더 정렬(prSort)은 그루핑으로 대체(th onclick 제거).
- **시간 숫자만**: `type=number`(스피너) → `type=text inputmode=numeric maxlength=2` + `input` 시 `replace(/\D/g,'')`로 숫자만, change/blur 에 clamp(0-23/0-59)·24h 저장. CSS 로 웹킷/무 스피너 제거.
- **장소 = 구역 공유**: `contenteditable` 자유입력 → `<select>`(`protPlaceOptions`) — 현장 지도 `ZONES` 라벨을 옵션으로 공유. 기존 커스텀 장소는 상단 옵션으로 보존.
- 버그픽스: 의전 행 삭제 시 `saveProtocol()` 누락(서버 미저장)이던 것 추가.
- 검증: 회귀 43/43·18/18·29/29 + 헤드리스 의전 뷰(부야영장 김상협 5건·야영장 김시범 등 인원별 묶임·시:분 숫자 입력·장소 드롭다운) 육안. ⏳ **주의: "마저 진행"의 3단계(콘텐츠 파이프라인)·4단계(지도 공백구역)는 이 의전 요청들로 중단됨 — 아직 미구현.** 지도 공백구역은 renderCoverageGaps 설계까지만(코드 미작성).

### 16.66 v0.9.187~0.9.188 — 날씨 헤더 이동 + 행사기간 표기 + 의전 시작~종료 + 날씨 모달
- **v0.9.187**: (1) 대시보드 날씨 모듈을 **헤더 행사기간~D-day 사이 컴팩트 배지**(`#wx-head`)로 이동. (2) '회기'→**'행사기간'**. (3) 의전 표에 **시작~종료 시간**(종료 미입력 시 시작+30분 기본, 일정표 pseudo-block 도 반영). API `cleanProtocol` 에 `endTime`.
- **v0.9.188**: 헤더 날씨 배지 **클릭 → 모달**(현재 날씨·최고/최저·강수확률·**일출/일몰** + 시간별 온도·강수%). Open-Meteo daily 쿼리에 `sunrise,sunset` 추가. `renderWeatherModal`/`fmtHm`.

### 16.67 v0.9.189 — 콘텐츠 파이프라인 보드 + 의전 순서 정렬 + 컵 참관단 일정 + 의전 상세 등록
- 사용자 4건(대화 중 순차): (1) 콘텐츠를 **파이프라인 보드뷰**로(목업 반영), 모바일은 세그먼트, (2) 의전 순서는 **대회장→부대회장→야영장→부야영장 + 성명 가나다순**, (3) **컵 참관단 일정표**(8/4~8/9)를 잼버리 일정표에 추가, (4) **의전 일정 전체**(5인 상세 시각·장소, 8/5~8/9)를 모두 등록.
- **콘텐츠 파이프라인**(renderBoard 재작성): status+approval 을 5단계로 파생 `pipelineStage`(제보 인박스→기획→작성중→검수→완료·게시). **검수=approval.state==='requested' 파생**(새 상태값 안 만듦). 홍보부(staff)면 **제보 인박스 컬럼**(tips status==='new', '콘텐츠로 전환 →'`data-tipconv`→openTipSchedule) 맨 앞. 컬럼 드롭→`setPipelineStage`. `.board` grid-auto-flow(4~5컬럼 가변). **모바일 세그먼트**(`#board-mseg`, 한 단계씩 `boardMStage`, `.col.msel` 만 표시). `loadTips` 완료 시 list 뷰도 `afterTipsLoaded`로 갱신.
- **의전 정렬**: `protRoleRank`(부- 접두를 substring 먼저 판정) → 구분 우선, 성명 `localeCompare('ko')`, 직책, 날짜·시간. `protPersonKey` 의 제어문자(\x01) 구분자를 `|` 로 정리.
- **컵 참관단**(`cubObserverSeeds`/`mergeCubObservers`, 종류 `컵 참관단`): 안정 id `cub-MMDD-HHMM` 로 35블록 **시드 병합**(있으면 건너뜀, 멱등). init `loadBoard` 에서 `addTtCat`(색 보장)+누락분만 추가. 일자 분포 8/4(6)·8/5(4)·8/6(8)·8/7(8)·8/8(5)·8/9(4).
- **의전 상세**(`defaultProtocol` 교체 + `upgradeProtocol`): 개략 시드(시각·장소 없음)→**41건 상세**(5인×활동별, 시각·장소, memo '(안)'=종료 미확정). 안정 id `prot-NN`. `upgradeProtocol` = 서버 protocol 이 비었거나 **시각이 하나도 없으면(구 시드) 상세본으로 교체+저장**(상세본은 시각 있어 멱등, 사용자 편집분은 보존). 의전은 `data-pid` pseudo-block 이라 일정표에도 '의전' 블록으로 노출.
- ⚠️ 라이브 protocol 은 401(인증)이라 읽지 못함 → 파괴적 쓰기 없이, 클라이언트가 로그인 후 스스로 승격(사용자 세션의 PUT). 운영 KV 파괴적 쓰기 금지(§16.6) 준수.
- 검증: `node --check`(app·API) + 회귀 **45/45·18/18**(파이프라인 5칼럼·인박스·모바일 세그먼트·드래그 단계이동, 컵 병합 4/35건 반영으로 일정표 단언 갱신) + 헤드리스(파이프라인 데스크톱/모바일 스샷·의전 순서·컵 35블록·의전 41건 신규/구시드승격 양쪽·8/5 의전블록 10·**콘솔 에러 0**). ⏳ 미완: 식사 메뉴 게시판, 자료실 카테고리 자유추가.

### 16.68 v0.9.190 — 식사 메뉴 게시판 + 컵 참관단 1기/2기·독립 트랙·일간 3열 분리
- 사용자 라이브 피드백 다건: (1) **식사 메뉴 게시판** 추가(대원+운영요원, 날짜×조·중·석식 편집표), (2) 컵 참관단을 **1기/2기 구분**, (3) 범례에 비슷한 색 행사 섞임(컵=개폐 빨강 중복), (4) 일간뷰에서 **잼버리 일정 / 의전 일정 / 컵 참관단을 별도 열**로.
- **식사 메뉴**(field 공간, 신규 뷰 `meals`): `state.meals={crew:{date:{b,l,d}},staff:{}}`, KV `jp:meals`, API GET/PUT+`cleanMeals`(그룹2·날짜31·끼니3 clip). `renderMeals`/`saveMeals`(debounce) + 대원/운영요원 세그(`#meal-groupseg`, `mealGroup`) + 8/3~8/9 × 조·중·석식 contenteditable. `canSee('meals')=true`(전 회원 열람). core.js `utensils` 아이콘 추가.
- **컵 참관단 = 독립 트랙**(카테고리 아님): timetable item 에 `track:'cub'`+`batch:1|2`. **1기 8/4~8/7(오전) · 2기 8/7(오후)~8/9**(8/7 교대 — 오전 1기 퇴소·오후 2기 입소, AskUserQuestion 확정). 시드 id `cub-<기수>-MMDD-HHMM`. `mergeCubObservers` = **ttcats 에서 '컵 참관단' 제거**(구버전 addTtCat 흔적)+**구 스킴(`cub-\d{4}-\d{4}`) 정리**+신 기수 시드 병합(멱등, 시드 전용 id 만 매칭→사용자 생성분 불변). cleanTT 에 track·batch.
- **일간뷰 N열 분리**(`ttColumnHtml` 재작성): 존재하는 트랙만 균등 열 — **잼버리 일정 · 의전 일정 · 컵 참관단**(off/span % 기반, `.ttg-vsplit`+`.ttg-grouplab` 인라인 위치, 라벨색 gl-pr 앰버·gl-cub 블루). 전체기간 뷰는 통합 레인.
- **색/범례**: 컵 블록 = 기수색 `CUB_BATCH_COLOR`(1기 #3F6FA8 블루·2기 #A85B3F, `darkenToContrast` 보정) + `.cubtag`(1기/2기 배지). 범례에서 컵 참관단 카테고리 제거, 대신 구분선 뒤 **컵 1기·컵 2기 스와치**(개폐 빨강과 안 섞임).
- 검증: `node --check`(app·core·API) + 회귀 **51/51·18/18**(일간뷰 3열·기수 태그·컵색≠빨강·범례 컵참관단 제거+1/2기·식사 7일×3끼·대원 기본토글) + 헤드리스(8/7 3열 스샷·1기 블루블록·구스킴 자동정리·식사 저장·**콘솔 에러 0**).

### 16.69 v0.9.191 — 의전 상세본 공유 보드 영속 + 일정표 트랙 필터
- 사용자 "빨리 의전일정 모두 상세 등록하고 배포"(반복) — v0.9.189 상세본이 라이브에 안 보이던 문제: `upgradeProtocol` 이 fresh(서버에 protocol 없음)일 때 렌더만 하고 PUT 안 함 → 공유 KV 에 없었음.
- **upgradeProtocol 강화**: `applyServer` 가 `state._protoFromServer`(서버 실제 저장본 유무) 기록 → **서버에 없거나 구 시드(시각 0)면 상세 41건으로 확정 + `saveProtocol()` PUT**(공유 보드 영속). 상세본은 시각 있어 멱등, 사용자 실제 편집(서버 저장+시각 있음)은 보존.
- **일정표 트랙 필터**(`ttFilter`, localStorage): 칩 `전체 / 잼버리 일정 / 의전 일정 / 컵 1기 / 컵 2기` → `ttColumnHtml` 이 트랙별 필터 적용(전체기간·일간 공통). `renderTTFilter`/`ttTrackOfItem`/`ttTrackOn`.
- 검증: 회귀 51/51·18/18 + 헤드리스(fresh→PUT 41·컵1기만=22블록·전체 토글) + 라이브 배포 확인.

### 16.70 v0.9.192 — 자료실 카테고리 자유 추가 + 카테고리별 보기 + 마스터/업로더 편집
- 사용자 3건(§16.42 이후 미완): (1) 카테고리 **자유 추가**, (2) 카테고리별 보기, (3) 기존 자료를 **마스터/업로더가 편집**.
- **서버**(`jp-assets.js`): POST/PATCH 의 카테고리 고정 3종(`{plan,cardnews,photo}`) 제한 제거 → **임의 문자열 허용(≤40자)**. PATCH 는 이미 author/admin(=마스터) 권한(§16.59) — 이름·카테고리·태그 수정.
- **프런트**(`library.js`): `LIB_CATS`(고정)→ `LIB_BASE`(기본 3종 키/라벨) + `libCats()`(기본3 + 자료들이 쓰는 사용자 정의 카테고리 자동 수집) + `libCatKey`(라벨/키→키, 그 외 문자열 그대로). 카테고리 탭·섹션 그룹핑이 `libCats()` 기반. **업로드 모달**에 카테고리 datalist(선택 또는 새로 입력, `captureLibUp`으로 파일 삭제/커밋 시 보존). **편집 UI**: 미리보기 모달에 `수정` 버튼(마스터·관리자/업로더 본인) → 이름·카테고리(datalist)·태그 인라인 편집 → `PATCH`. 카드뉴스/사진 자동추정(record) 제거 → 고른 카테고리 그대로 저장.
- 검증: `node --check`(library·app·API) + 회귀 **53/53·18/18**(자료 수정 UI·자유 카테고리 PATCH 신설) + 헤드리스(사용자정의 '홍보물' 탭·카운트·필터·관리자 편집 버튼·PATCH category=홍보물·콘솔 에러 0[목업 이미지 404 제외]).

### 16.71 v0.9.193~0.9.195 — 의전 상세본 확정(prot-NN)·캘린더 이벤트 그루핑 + 식사 메뉴 3그룹+데이터 + 컵 편집 버그 + 취재 펜아이콘
- **v0.9.193 의전 상세본 안 들어오던 문제**: 라이브 KV의 옛 개략본에 사용자가 시각 하나(18:30)를 넣어 `L.every(시각 없음)` 조건이 막힘. → `upgradeProtocol` 을 **상세본 고유 id(`prot-NN`) 부재로 판정**(있으면 보존, 없으면 상세 41건 교체+PUT). 시각 한둘 있어도 교체.
- **v0.9.194 캘린더 의전 = 사람 단위**(잘못) → **v0.9.195 이벤트(활동) 단위로 재수정**: 같은 활동+시각을 한 칩으로 묶고 참여자를 **구분(대회장 등)+이름**으로 나열(직책 총재 X). 예 "07:00 아침 배식봉사 · 대회장 이찬희 · 야영장 김시범". 구분 순서 정렬.
- **식사 메뉴 3그룹 + 실제 데이터**(사용자 제공 이미지): `crew`(2그룹)→ **대원 일반식(crew_n) · 대원 특별식(crew_s) · 운영요원(staff)**. `defaultMeals()` 로 전 메뉴 시드(대원 8/5~8/9 · 운영요원 8/3~8/9, 조·중·석식), `upgradeMeals`(서버 비면 시드+PUT). 여러 품목 줄바꿈 저장(cell `white-space:pre-wrap`, blur 는 `innerText`). 운영요원 고정메뉴 노트. API `cleanMeals` 3키(crew 호환). ⚠️ 메뉴명은 이미지 판독분이라 사용자 검수 필요(인라인 수정 가능).
- **컵 일정 편집 시 위치 변경 버그**: `buildCleanTT` 에 `track`/`batch` 누락 → 편집 커밋 시 컵 항목이 track 잃고 잼버리 열로 이동. → buildCleanTT 에 track·batch 추가(보존).
- **취재 불필요 토글 아이콘 카메라→펜(edit)**. (촬영 요청 핀은 카메라 유지)
- 검증: 회귀 53/53·18/18 + 헤드리스(의전 옛시드+18:30→상세41 PUT·8/7 이벤트그루핑 3칩[아침배식봉사 2인]·식사 3그룹 시드 줄바꿈·특별식 황태미역국·컵 편집 track 보존 cub/1→cub/1·펜 아이콘 path·콘솔 에러 0).

### 16.72 v0.9.210 — /krjam-planning 디자인 가이드(⛳️규칙④) 정합성 전면 개편 (타이포 바닥 13px · 컨트롤 40px · 대비)
- 사용자: "디자인 가이드 기준으로 평가하고 정합성 안 맞는 부분 **모두 전격적으로** 개편. 아직 정식 런칭 전이라 과감히 해도 무방." → **v0.9.205 가 유보한 타협을 푸는 작업**(그 커밋은 "full 13px on dense timetable/calendar would break layout" 이라며 10.5~11px 에서 멈췄고, 그 후퇴를 잡을 테스트가 없어 그대로 남아 있었다).
- **기준**: DESIGN.md 는 scout-finder(보라·Wanted Sans·영문 전용) 문서라 이 보드에 적용 대상이 아니다 → **CLAUDE.md 최우선규칙 ④(UI/UX 가이드) + 다크 테마 예외**(사용자 확정 2026-07-17)로 평가. 색·구조·탭 위치·기능은 그대로, **정합성만** 교정.
- **감사(눈이 아니라 계산)**: 헤드리스로 13개 뷰 렌더 후 실측 — **13px 미만 텍스트 750개(108종)** · **버튼 40px 미만 31종** · **대비 4.5 미만 46개** · 자간 -3.5%(h1) · 카드 중첩 0(양호).
- **① 타이포 바닥 13px**: tokens.css 스케일은 바닥이 11·12px 이라 규칙 자체를 어긴다. 단 그 파일은 **krjam-jebo 와 공유하는 단일 원본**이라(§16.61) 건드리지 않고 **styles.css `:root` 에서 planning 전용으로 칸만 위로**(13/14/15/16/18/22/28). 하드코딩 `font-size` **21종 → 전량 `var(--fs-*)`**(9·10·10.5·11·11.5·12·12.5 → 13). 0.5px 중간값 제거.
- **② 밀집 그리드 = 글자만 키우면 깨진다 → 행을 함께 키움**(v0.9.205 가 포기한 지점): `TT_HH_PERIOD 46→60`·`TT_HH_DAY 84→96`(app.js) + 보조선 간격 파생 갱신(30분=hh/2·10분=hh/6). 검증: 전체기간 뷰 **36블록 전부 잘림 0**(scrollHeight==clientHeight). 겹쳐 슬리버가 된 레인(<48px)은 `@container` 로 글자를 숨겨 **색 막대**로 — "가2웟킬" 같은 세로 한 글자 줄은 어떤 크기로도 못 읽는다(제목은 hover 툴팁·일간 뷰가 책임).
- **③ 대비 — 원인은 테마가 스스로 문서화한 토큰 계약 위반**: `--accent`(흰 글씨용 어두운 배경)를 **글자색으로 86곳** 사용(3.23) → `--accent-ink`. `--faint`("플레이스홀더 전용, 본문·라벨 금지")를 실제 텍스트로 → `--muted`(플레이스홀더·빗금·비활성만 잔류). `--danger` 텍스트 23곳 → 신설 `--danger-ink`. 주말 머리 `--c-fin/--c-intl`(띠 색) → 밝은 잉크. `.prtag` 솔리드 골드+흰 글씨 3.72 → 골드 틴트+밝은 잉크(5.11). `.colh .cnt` 3.07 → 연한 면+진한 잉크. 흰 글씨 4.5 미달 솔리드(#0f8a8a 4.18·#6b4fa0)는 **hue 유지·명도만** 통과선까지(운영자가 외운 뜻을 깨지 않는다). 형광 `mark` 글자색 미지정(다크에서 밝은 잉크 상속 → 노란 배경에 묻힘) → 어두운 잉크 고정. **다크에서 안 보이던 보조선**(`rgba(60,69,63,.07)` = 어두운 색을 어두운 면에) → 흰 알파.
- **④ 컨트롤 40px 바닥**: `--h-ctl:40px` 신설 → 버튼·필터칩·세그먼트·토글·날짜탭·오프타임 토글·모달 닫기(30px) 등 **31종 → 0종**. 겹쳐 뜨는 micro 컨트롤(블록 위 ✕·칩 안 ✕)은 40px 를 주면 대상을 덮으므로 **`--h-ctl-mini:24px` 문서화된 예외**. 자간 -3.5%/-3% → -2%.
- **⑤ 규칙을 테스트에 못 박음**(v0.9.171 STEP3 패턴): 회귀에 **[디자인 — 타이포·컨트롤]** 4종 신설 — 10개 뷰 렌더 훑어 13px 바닥·40px 바닥·자간·카드중첩. **음성 테스트로 실효성 확인**(옛 값 11px·32px 복원 시 FAIL + 위반 요소 지목). 이번에도 이 어서션이 임시 감사가 놓친 **모달 닫기 30px** 를 잡았다(모달 열린 상태를 훑기 때문).
- 검증: `node -c` + 회귀 **56/56**(52→56, 신설 4) · nav **18/18** · **jebo 29/29(무영향 = tokens.css 불변 확인)** · 실측 재감사(13px미만 **750→0** · 버튼 **31종→0** · 대비 **46→2**[남은 2 = `.offtog.na` 비활성 빗금 토글 — WCAG 1.4.3 비활성 예외, 취소선+빗금으로 형태가 상태를 전달]) · 스크린샷 육안(일간 블록 "개영식/20:00–21:30/김기자/식순" 전부 판독 · 캘린더 · 오프타임 40px · 모바일 390 넘침 0).
- ⚠️ 블록 좌표 회귀 기대값(top/height)은 **TT_HH_DAY 파생값**이라 1680/123 → 1920/141 로 갱신 — 상수가 아니라 파생값임을 테스트 주석에 명시.
- 남은 부채: 전체기간 뷰의 레인 슬리버는 색 막대로 두는 것이 현재 답(일간 뷰가 상세 담당) — 근본은 레인 배치 자체를 줄이는 것. `.offtog.na` 는 비활성 예외로 유지.

### 16.73 v0.9.211 — 의전 촬영 담당(의전 표 ↔ 일정표 ↔ 촬영 리스트 3면 공유) + 슈퍼스타J 일정
- 사용자 2건: (1) "의전일정에도 **촬영담당자**를 지정할 수 있게 하고 **쌍방으로 추가삭제**", (2) 사용자 제공 **슈퍼스타J 일정표**(스크린샷) 추가.
- ⚠️ "쌍방"이 이 코드베이스에서 세 갈래로 읽혀(§v0.9.208 이 촬영리스트↔일정표를 "쌍방"이라 부름) **AskUserQuestion 으로 확정** → **셋 다**(의전 표 ↔ 일정표 의전 블록 ↔ 촬영 리스트) + **현장 배치·오프타임에도 반영**.
- **원본은 하나**(`protocol[].assignees`): 세 화면이 각자 복사본을 들면 반드시 어긋나므로 `shootAssignees` 처럼 **원본 배열을 직접 읽고 쓴다**. `protById`/`protAssignees`/`toggleProtAssignee`/`protAsTtLike`/`protAssignedTo` 를 별도 블록으로 신설(기존 함수에 얹지 않음, 최우선규칙 ③).
- **① 의전 표**: '촬영 담당' 열 = **버튼 하나**(현재 담당 표시 / `＋ 담당 지정`) → 지정 모달. ⚠️ 처음엔 칸에 인원 칩을 직접 깔았으나 **명단 6명 × 의전 41행이면 표가 칩으로 뒤덮여** 버튼+모달로 교체(지정 UI 는 일정표와 **같은 모달 하나**로 통일 — 두 벌을 만들면 규칙이 갈라진다).
- **② 일정표 의전 블록**: 읽기 전용(클릭=의전 탭 점프)이라 일정표에서 배정하다 흐름이 끊겼다 → **클릭 시 촬영 담당 모달**(`#pra-scrim`), 블록에 담당 이름 표시(`.ttg-evp`). 상세 편집은 모달의 '의전 탭에서 편집'으로 남김.
- **③ 촬영 리스트**: `mergeShootlistFromProtocol()` — **담당이 지정된 의전만** 행 생성(의전 41건이 전부 촬영 대상은 아님 → 담당 지정 = "이건 우리가 찍는다"가 기준). `prId` 로 연동, `shootAssignees`/`toggleShootAssignee` 가 prId 를 원본으로 해석 → 촬영 리스트에서 고쳐도 의전에 반영. 담당 해제 시 행 제거하되 **촬영 포인트를 적어 둔 행은 보존**(사용자가 쓴 내용을 지우지 않는다).
- **④ 현장 배치·오프타임**: `renderDerivedPlacement` 가 `protAssignedTo(pid)` 를 합류(의전 촬영도 그 시간에 사람을 현장에 묶는 일 — 빠지면 '배치 없음'으로 보이고 오프타임 겹침도 안 잡힌다). 파생 항목은 `_pid`(클릭 시 담당 모달)·`_color`(의전 골드 — `ttCatColor('의전')` 은 사용자 편집 대상 ttcats 에 없어 갈색 폴백). 담당 칩은 `offConflict` 검사 → 겹치면 **배정 차단**(이미 배정된 사람은 해제만).
- **슈퍼스타J**(사용자 제공): 소무대 · 8/6~8/8 · 5회차(13:00–14:00 / 18:30–19:30) · cat=행사 → `superstarJSeeds`+`mergeSuperstarJ`(고정 id `ssj-MMDD-HHMM`, **멱등**). 일정표에 넣으면 `mergeShootlistFromTimetable` 이 촬영 리스트 행까지 자동 생성 → **회차별 촬영 포인트**는 `SHOOT_POINT_SEED` 로 그 자동 생성 행에 실림.
- API(`jamboree-plan.js`): `cleanProtocol` 에 **`assignees`**, `cleanShoot2` 에 **`prId`** 추가(⚠️ 없으면 저장 시 조용히 스트립 — §16.53 cleanTT 와 같은 함정).
- ⚠️ **미해결(사용자 판단 필요)**: `소무대` 가 현장 지도 ZONES 에 없다. 게다가 `stage`(메인무대)의 별칭에 **`'무대'`** 가 있어 `zoneForPlace('소무대')` 가 **메인무대로 잘못 매칭**된다(부분문자열 매칭) → 슈퍼스타J 담당자가 현장 지도에서 메인무대에 표시됨. 배치도상 실제 좌표를 몰라 임의로 만들지 않았다. 소무대 위치를 주시면 ZONES 에 추가하고 별칭 충돌도 함께 정리.
- 검증: `node -c` + API 임포트 + 회귀 **65/65**(56→65, 의전 3면 공유 9종 신설: 표→모달→반영 · 블록 담당 표시/모달 · 일정표에서 추가→같은 배열 · 촬영 리스트 행 생성 · 리스트에서 해제→의전 반영 · 배치 파생 · 오프타임 차단 · 슈퍼스타J 멱등 · 촬영 포인트 시드) · nav 18/18 · jebo 29/29 · 스크린샷(의전 표 한 줄 버튼 · 담당 모달).

### 16.74 v0.9.212 — 🔴 v0.9.210 회귀 수정: 일정 제목이 통째로 사라져 "일정 추가 안 됨"으로 보이던 문제 + 소무대 오매칭
- 사용자: "슈퍼스타 일정 추가가 안된거같은데 확인해줘. 일단 소무대가 안보이는데 소무대는 일단 비워두고 정보만 추가해놔줘."
- **원인 = §16.72(v0.9.210)에서 내가 넣은 규칙**. 슈퍼스타J 5건은 정상 병합돼 있었고(로드 경로 실측 확인) **글자만 전부 숨겨져 색 막대로만** 보였다 → 사용자 눈엔 추가가 안 된 것.
  - `.ttg-ev{container-type:inline-size}` + `@container (max-width:48px){...display:none}` 은 **패딩을 뺀 콘텐츠 박스**를 잰다. 폭 58px 블록도 내부 46px 라 규칙에 걸렸고, **기본 뷰(전체 기간)의 레인 대부분이 그 폭** → 멀쩡한 일정 제목이 광범위하게 사라졌다.
  - 조치: **규칙 전면 제거**(되살리지 말 것 — 코드에 사유 주석). 좁은 블록은 기존 `nowrap+ellipsis` 가 "슈퍼스타J…" 로 줄여서라도 있음을 알린다. **잘려서 읽기 나쁜 것 ≪ 아예 안 보이는 것.** 원래 잡으려던 슬리버 세로글자("가2웟킬")는 그대로 두는 게 낫다(일간 뷰·툴팁이 상세 담당).
  - **교훈**: v0.9.210 은 "13px 미만 0 / 버튼 40px" 같은 **수치**는 전수 검증했지만 "글자가 실제로 보이는가"는 검증하지 않았다. 데이터가 있는데 화면에서 사라지는 실패는 대비·크기 검사를 전부 통과한다.
- **회귀 신설**(음성 테스트로 실효성 확인 — 문제의 규칙을 되살리면 FAIL + 블록 id 지목): **`전체 기간 뷰: 제목 있는 블록은 글자가 보인다(숨김 0)`**(43블록 검사). ⚠️ 측정 함정: **숨겨진 섹션에서 재면 전부 0px** 라 "안 보임"으로 오판한다 → `go('timetable')` 로 띄운 뒤 측정(테스트 작성 중 실제로 겪음).
- **소무대**(사용자 지시대로 구역은 비움): `stage`(메인무대) 별칭의 **`'무대'` 제거** — 부분문자열 매칭이라 `zoneForPlace('소무대')` 가 메인무대를 물어와 슈퍼스타J 담당자가 지도에서 **엉뚱한 곳에 표시**됐다. 이제 `소무대→null`(구역 없음), `메인무대/메인 스타디움→stage` 유지. 장소 텍스트 `소무대` 는 **사용자 원본 데이터라 보존**. 회귀 신설(`소무대는 메인무대로 잘못 매칭되지 않는다`). 배치도상 실제 좌표를 받으면 ZONES 에 추가할 것.
- 검증: 회귀 **67/67**(65→67) · nav 18/18 · jebo 29/29 + 실측(기본 전체기간 뷰에서 ssj 5블록 **글자보임=true**) + 스크린샷.

### 16.75 v0.9.213 — 일간 뷰 트랙 열 너비 드래그 + 🔴 컵 track 유실 복구 + 중복 점검
- 사용자 3건: (1) 일간 뷰 3열(잼버리/의전/컵)을 **구분선 잡고 좌우로 끌어** 조절, (2) "식사메뉴랑 이런것들이 정상적으로 들어가있는지 **검토**", (3) "**컵 1차가 섞인 것 같다 · 중복으로 데이터가 잘못 들어간 것 같다**".
- **🔴 "컵 1기가 섞인" 원인 규명**: §16.71(v0.9.195)이 고친 버그 — **v0.9.195 이전 `buildCleanTT` 가 `track`/`batch` 를 빠뜨려**, 컵 일정을 **한 번이라도 편집하면** track 이 벗겨진 채 저장됐고 그 뒤로 계속 **'잼버리 일정' 열에 섞여** 나온다. 코드는 고쳤지만 **그때 망가진 데이터는 보드에 그대로 남아 있다**(사용자가 지금 보는 게 그것).
  - 조치: `mergeCubObservers` 에 **복구** 추가 — id 가 `cub-<기수>-MMDD-HHMM` 로 스스로 컵 시드임을 증명하므로 `track`/`batch` 만 되살린다(사용자가 고친 제목·시각·담당은 불변, 멱등).
- **id 중복 정리**(`dedupeTimetableById`, 로드 시): 같은 id 가 둘이면 `ttById` 가 첫 번째만 잡아 **편집·삭제가 엉뚱한 쪽에 걸리고 나머지는 유령**이 된다(배열 통짜 저장의 lost-update 부채에서 생길 수 있음). **내용이 더 채워진 쪽**(담당·식순·메모·장소)을 남긴다.
- **중복 점검 배너**(`ttDupGroups`/`renderTTDupes`, 일정표): 보드 데이터는 서버에 있어(로그인 필요) 내가 못 보므로 **앱이 스스로 찾아 보여 준다**. 같은 날·시각·제목이 2건 이상이면 배너 + 항목별 `열기/삭제`. **자동 삭제 안 함**(같은 제목이라도 담당·메모가 달라 무엇을 남길지는 사람이 정한다). ⚠️ 키에 `track`/`batch` 포함 — **컵 1기·2기가 같은 시각 같은 제목(8/7 저녁식사 등)인 건 정상**이라 중복이 아니다.
- **트랙 열 너비 드래그**: `.ttg-vsplit` 을 1px 선 → **11px 히트박스 손잡이**(hover 시 초록, `cursor:col-resize`, 더블클릭=균등 복귀). 트랙 수가 날마다 1~3개로 달라지므로 고정 %가 아니라 **가중치**(`ttColW`, 렌더 시 정규화) — 3열에서 넓힌 비중이 1열 날에도 안 깨진다. 개인 화면 설정이라 localStorage(`jamboree-plan:ttcolw`). 인접 두 트랙만 가중치를 주고받아 합이 일정(다른 열 안 움직임), 하한 `TT_COL_MIN`. 드래그 중 `renderTimetable` 이 구분선 DOM 을 새로 만들므로 **리스너는 document 에**(기존 블록 드래그와 같은 방식) + rAF 스로틀.
- **데이터 검토 결과(시드 기준 전수)**: 식사 **대원 일반식 5일(8/5~8/9)·대원 특별식 5일·운영요원 7일(8/3~8/9)** · 일정표 41건(**컵 1기 22 / 컵 2기 13** = 35, 슈퍼스타J 5) · 의전 41건(시각 미입력 0) · 촬영 리스트 59행(촬영 포인트 58) · **중복 0 · 같은 id 0**. 시드·병합 로직 자체는 정상 → 이상이 있다면 **라이브 보드에 누적된 값**이고, 위 복구·정리·배너가 로드 시 처리한다.
- 검증: 회귀 **74/74**(67→74, 7종 신설: track 복구 · batch 교정 · 중복 배너 · **같은 id 정리(내용 많은 쪽 보존·멱등)** · 1기2기 오탐 없음 · 구분선 손잡이 · 드래그+저장) · nav 18/18 · jebo 29/29 + 스크린샷.
- ⚠️ 회귀 작성 중 함정: 재현하려고 `ttList().concat([같은 id])` 하면 **복구가 아니라 중복**을 만든다 → 기존 항목을 map 으로 망가뜨려야 정확한 재현.

### 16.76 v0.9.214 — 전면 재설계 1단계: 라이트 전환(차분한 PM 보드) + IA 좌측 사이드바
- 사용자: "모든 화면을 다시 설계해줘. **차분한 프로젝트 관리 보드**로 가되, 가볍지만 확실하고 편리하게." → AskUserQuestion 으로 **라이트 전환(Linear·Notion 톤)** + **전면 재설계(IA 포함)** 확정. ⚠️ 오늘 오전 확정했던 다크 관제(§16.62)를 사용자가 뒤집은 것 — 규칙④의 '화이트 배경' 기본으로 복귀하므로 **테마 예외 조항은 소멸**.
- **① 라이트 전환 = 레이어 제거**: `tokens.css` 는 jebo 와 공유하는 **원래부터 라이트인 원본**이라, 다크로 뒤집느라 얹었던 것을 걷어내면 된다 → styles.css 의 **`:root` 색 오버라이드**(v0.9.183)와 **"하드코딩 라이트 색 보정" 블록**(43줄) **삭제**. 남은 오버라이드는 색이 아니라 **규칙**뿐(타입 바닥 --fs-*, 컨트롤 높이 --h-ctl, --danger-ink, 형태·그림자). CSS 가 오히려 단순해졌다.
- ⚠️ **함정 3건**(라이트 복귀 때 드러남): (a) `--sh-1:none` 으로 두면 `box-shadow:0 0 0 1px accent, var(--sh-1)` 합성이 **CSS 통째로 무효** → 아주 옅은 실제 그림자로. (b) 일정표 **보조선**이 v0.9.210 에서 흰 알파였다 → 밝은 지면에선 안 보여 어두운 알파로 되돌림(다크↔라이트에서 서로 반대로 사라지는 값). (c) 배치도 **검정 오버레이**(다크에서 마커 띄우려던 것) → 흰 오버레이.
- **대비 재측정 후 수정**: `.prtag` 솔리드 금+흰글씨 3.72 → 연한 금 면+진한 잉크(가이드④ 규칙2) · `ttg-grouplab.gl-pr/gl-cub` 2.58/2.47(다크용 밝은 금·파랑을 흰 라벨 위에) → 진한 값 · **JS 인라인 배지색**(`STCHIP`·`TIP_STATUS`, v0.9.183 이 다크 틴트로 바꿔둔 것) → **토큰 참조로** 교체(하드코딩 제거). 최종 실측: 13px미만 **0** · 버튼 40px미만 **0**(mini 예외 제외) · 대비 위반 **0**(비활성 `offtog.na`·그라디언트 오탐 제외).
- **② IA = 좌측 사이드바**(PM 보드 표준): 2단 상단바(공간→세부, v0.9.184)를 **사이드바 한 장**으로 — 4그룹 14항목이 **접히지 않고 모두** 보인다("지금 어디에 있고 무엇이 더 있는지"가 늘 보임). 브랜드(엠블럼+보드명) → 사이드바 상단, 사용자 → 하단. 모바일(<1024)은 **기존 하단 탭 4공간 + 세부바 유지**(검증된 UX 라 건드리지 않음).
- **내비 원본 일원화**: 뷰 목록이 **HTML 정적 버튼 14개 + JS 그룹 정의** 양쪽에 있었다(둘이 어긋날 수 있는 구조). → `VIEW_META`(라벨·아이콘) 신설 + `renderSidebar`/`renderSubbar` 가 `WS_LIST`/`WS_VIEWS` 하나에서 그린다. 정적 마크업·배선 제거.
- **헤더 슬림**: 사이드바가 정체성을 들고 있으므로 PC 에서 헤더의 **엠블럼·에이브로우·슬로건 접음**(제목+기간·장소+날씨+D-day 만). 매 화면 세로 공간을 돌려받음.
- 검증: 회귀 **74/74** · nav **17/17**(사이드바 기준으로 갱신: 4그룹14항목·좌측 sticky·모바일 숨김·권한) · **jebo 29/29**(tokens.css 불변 = 무영향) + 실측 감사 + 스크린샷(대시보드·콘텐츠 보드·일정표).
- ⚠️ nav 스위트에서 **`본문이 메뉴 아래(좌우분할 아님)` 단언 삭제** — 옛 상단바 IA 전용이라 이번 IA 와 정면으로 모순(좌우 분할이 의도).
- **남은 작업(2단계)**: 화면별 레이아웃 재구성(대시보드 카드 밀도·일정표·캘린더·표 계열의 PM 보드화), 모바일 사이드바 드로어 검토, 헤더→컨텍스트바 통합.

### 16.77 v0.9.215 — 전면 재설계 2단계: 컨텍스트 바 통합 + 모바일 드로어
- 사용자 "마저 모두 작업해. 별도로 허락받지 말고" → §16.76 이 남긴 2단계 완료.
- **① 2층 바 → 컨텍스트 바 한 줄**: 상단바(조직명·계정·동기화) + 헤더(엠블럼·보드명·슬로건·기간·장소·날씨·D-day)가 쌓여 **매 화면 약 260px** 를 먹었다. 정체성은 사이드바가 들고 있고 **기간·장소는 대시보드 D-day 배너가 이미 같은 말을 한다**(중복) → 컨텍스트 바에는 **지금 보는 화면 이름 · 날씨 · D-day · 저장 상태 · 계정**만. `header.top` 마크업 제거, `renderHeader` 는 요소 없어도 안전하게(null 가드). sticky 유지 — D-day·저장 상태는 스크롤해도 보여야 한다.
- **② 모바일 드로어**: 사이드바를 폰에서 화면 밖(`translateX(-101%)`)에 두고 햄버거로 끌어온다 + 스크림/Escape/항목선택으로 닫힘. **하단 탭(공간 4개)은 유지** — 역할이 다르다(엄지로 빠른 공간 전환 vs 14개 어디로든 한 번에). 자리를 먹지 않으므로 둘 다 둔다.
- ⚠️ **함정 3건**(회귀가 전부 즉시 잡음):
  - `.topbar{flex-wrap:nowrap}` 을 전역으로 주자 **390px 에서 726px 로 터졌다** → 한 줄 강제는 **PC 에서만**(폰은 접혀야 들어온다). 좁아지면 날씨부터 접고(≤1279) 저장 상태는 ≤520 에서 접는다 — D-day 가 우선.
  - CSS 블록을 줄 번호로 잘라내며 **`.wxc`/`.clock`/`.wxm-*`(날씨·시계·모달) 규칙까지 삭제**됐다. 줄 단위 필터로 복원하니 **여러 줄 규칙이 잘려 중괄호가 깨져** 무관한 화면(제보 카드·자료실·nocover)이 동시에 틀어졌다 → 원본에서 **범위 통째로** 복원 + 중괄호 균형 검사.
  - 새로 만든 햄버거가 **21px** 라 40px 단언에 걸렸다(§16.72 의 컨트롤 바닥 규칙이 새 UI 에서 바로 작동).
- **`color-mix` 제거**: 컨텍스트 바 반투명 배경의 computed 값이 `color(srgb 0.96 …)`(0~1 표기)로 나와, 색을 읽는 쪽이 rgb 0~255 로 오해한다(실측 감사가 대비 1.27 로 오판). 지면색을 아는 자리라 평범한 `rgba(247,248,247,.88)` 로.
- 검증: 회귀 **74/74** · nav **19/19**(드로어 2종 신설: 햄버거→열림·항목선택→닫힘+이동. ⚠️ transition .22s 라 즉시 재면 화면 밖 → 500ms 대기 + "화면 안으로 들어왔는가"(left>-40)로 판정, 픽셀 0 단언은 애니메이션 지터에 취약) · **jebo 29/29** + 실측(13px미만 0 · 버튼 40px미만 0 · 대비 위반 0[비활성·그라디언트 오탐 제외]) + 스크린샷.
- **남은 것**: 화면 내부 레이아웃(대시보드 카드 밀도·표 계열)은 라이트 톤 위에서 정상 동작하나, 화면별 정보 재배치는 사용자 사용 후 피드백을 받아 진행하는 편이 낫다(추측으로 재배치하면 운영자가 외운 위치만 흔든다).

### 16.78 v0.9.216 — krjam-planning 잔여 작업 마무리: 촬영 공백 구역 + 개인정보 고지 보강
- 사용자 "다른앱은 말고, krjam-planning만 마저 모든 작업을 진행해줘" → §16.77 이 남긴 구체 항목 2건을 구현하고, 3번째(화면 내부 레이아웃 재배치)는 §16.77 의 결론대로 **의도적으로 보류**(추측 재배치 = 운영자가 외운 위치만 흔듦; 사용 피드백 후 진행).
- **① 현장 지도 ‘촬영 공백’ 구역**(설계만 있고 미구현이던 renderCoverageGaps): 기준 시각(smMoment — 실시간 또는 시간지정 슬라이더)에 **일정은 열려 있는데 그 구역에 홍보부 인원이 아무도 없는** 곳을 찾아 표시. `computeCoverageGaps()` = `ttList`(진행 중 일정) × `smByZone`(인원 배치) 교차 → 인원 0인 구역만 gap. 지도 마커는 **앰버(`--st-draft`) 펄스 + 라벨 상시 노출**(`.smzone.gap`), 지도 아래 **‘촬영 공백’ 패널**(구역명 + 진행 중 일정 제목·시각, 클릭 시 해당 마커 flash). 공백 0이면 초록 ‘모든 일정 구역에 인원 있음’, 진행 중 일정이 없으면(또는 실시간 모드 행사 기간 외) 패널 숨김. 아이콘 `alert`(경고 삼각형) 신설(core.js). `prefers-reduced-motion` 시 펄스 정지.
- **② 개인정보 고지 보강**(privacy.html 은 tour 앱 전용 영문 정책이라 부적합 → 이 보드의 **한국어 푸터**를 강화): 단일 문장 → 구조화 목록 — **수집 항목**(회원 계정: 이름·아이디·비밀번호[암호화]·접속 IP[마스킹] / 작성·수정 기록: 작성자·IP·시각 / 업로드 자료) · **목적** · **보유기간**(~2026-11-09) · **열람·정정·삭제·동의 철회 권리** · **문의처**(홍보부장·02-6335-2000) · **만 14세 미만 법정대리인 동의**. `.foot-priv` 리스트 CSS 신설. (가입 폼 동의 체크박스는 §18.6 에서 이미 존재 — 푸터는 상시 고지 보강.)
- 검증: `node --check`(app·core) + 회귀 **74→78/78**(현장 지도 촬영 공백 4종 신설: 12:00 급식 일정 있는데 담당 0 → 공백 감지·마커·패널 / 20:00 개영식은 담당 배치되어 공백 아님) · nav **19/19** · jebo **29/29** + 헤드리스 스크린샷(앰버 공백 마커·패널[급식·과정4]·강화된 푸터 육안 확인, **콘솔 에러 0**). 운영 KV 파괴적 쓰기 없음(GET·헤드리스 목업만).

### 16.79 v0.9.217 — 콘텐츠 보드 열 너비/숨기기 + 기사 리치텍스트·목차 + 지도 어둡게 + 세그 줄바꿈 수정
- 사용자 4건(대화 중 순차, 스크린샷 기반): (1) 콘텐츠 리스트 열이 좁다 → 열 너비 슬라이더 + 열별 숨기기, (2) 기사 본문을 범용 리치텍스트 에디터로 + 사진 3장(장당 10MB) + 목차에 글번호·제목·작성자·퍼블리싱 여부·카드뉴스 가공 여부, (3) 현장 지도에 검정 30% 오버레이로 마커 가독성↑, (4) 상태 세그 '작성중'이 줄바꿈됨.
- **① 콘텐츠 보드 열 컨트롤**(`renderBoard`+상단 `#boardview`): `.board` 를 `grid-auto-columns:minmax(0,1fr)`(균등·좁음) → `minmax(var(--board-colw,300px),1fr)+overflow-x:auto`(맞으면 채우고 넘치면 가로 스크롤). 위쪽에 **열 너비 슬라이더**(`board-colw`, 240~560px, localStorage) + **열 표시 토글 칩 5개**(제보 인박스·기획·작성중·검수·완료·게시, 각 40px 가이드 준수, `boardHidden` localStorage). 숨긴 열은 렌더 제외(집계·진행률은 그대로). 모바일은 단일 컬럼 세그라 컨트롤 숨김.
- **② 기사 리치텍스트 + 목차**: 본문 textarea → **Tiptap**(기존 `editor.js` `__ttReady` 재사용, 24버튼 툴바 `buildToolbar`, 실패 시 contentEditable 폴백, `newsBodyEditor` 라이프사이클·닫기 시 destroy). 저장=HTML, 표시=`sanitizeHtml`(구버전 평문은 줄바꿈만). 사진 **장당 10MB 초과 제외**(`handleNewsFiles` size 가드) + 사진 영역만 `renderNewsPhotos` 로 갱신(에디터 재마운트 안 함→작성 중 보존). **목차 = 표**(카드그리드 폐기): 번호(작성순 파생)·제목·작성자·작성일·**퍼블리싱**·**카드뉴스** 6열, 제목 클릭 시 본문(리치)+검수 코멘트 펼침. 퍼블리싱/카드뉴스 = 토글(`action:'flags'`, 작성자·홍보부·관리자). API `jp-news.js`: `published`/`cardnewsDone` 필드 + POST `action:'flags'` + 본문 8000→20000자(HTML). editor.js placeholder 'SNS 게시 문구'→'내용을 입력하세요'(뉴스·SNS 공용).
- **③ 현장 지도 오버레이**(`.smstage::after`): 라이트 전환(v0.9.185) 때 흰색(.34)으로 뒤집혀 마커가 묻혔음 → **검정 30%**(`rgba(0,0,0,.30)`). 흰 테두리 아바타·흰 배경 라벨·앰버 공백 마커가 어두운 배치도 위로 도드라짐(마커는 z-index 2+, 오버레이 1).
- **④ 세그 줄바꿈**: `.statusseg button`·`.card .seg button` 에 `white-space:nowrap`(+ statusseg padding 0→0 6px) → 좁아도 '작성중' 한 줄.
- 검증: `node --check`(app·editor·jp-news) + 회귀 **78→87/87**(보드 열 4종: 슬라이더·칩5·`--board-colw` 갱신·열 숨김→컬럼 감소 / 기사 목차 5종: 6열·글번호·토글존재·제목클릭 본문펼침(strong 정화)·퍼블리싱 flags API) · nav 19/19 · jebo 29/29 + 헤드리스 스크린샷(목차 표·리치 에디터 24툴바·보드 열 컨트롤·지도 30% 오버레이, **콘솔 에러 0**, Tiptap 실제 로드 확인). 운영 KV 파괴적 쓰기 없음.

### 16.80 v0.9.218 — 자료실: 텍스트형 자료(참고자료·공지사항, 리치텍스트) + 모든 파일 형식(mp3 등) 허용
- 사용자 2건(대화 중 순차): (1) 자료실에 운영계획서·PDF 외 **참고자료·공지사항 등 텍스트형 자료**를 텍스트 편집기로 작성·관리, (2) **mp3·기타 형태의 문서 등 어떤 파일**이든 올리기.
- **① 텍스트형 자료**(파일 없이 리치텍스트 본문): `jp-assets.js` 에 `kind:'text'` 도입 — POST `{kind:'text',name,category,body(HTML),tags}`(파일 URL 없음), PATCH 에 `body` 수정 추가, 본문 40000자. 파일 자료는 `kind:'file'` 명시(구버전=file 취급). 카테고리 기본 `notice`. 클라(`library.js`): `LIB_BASE` 에 **참고자료(reference)·공지사항(notice)** 추가. `isTextAsset` · 텍스트 카드(`libtextthumb` 아이콘·accent 좌측선·**받기 버튼 없음**) · `openAsset` 텍스트 분기(**`sanitizeHtml` 정화 본문**만·받기/새탭 숨김) · `openAssetEdit` 텍스트면 전용 편집 모달로. 신규 모달 `#libtext-scrim`(제목·구분 datalist·**Tiptap 본문**·태그) — `openLibText`/`renderLibTextEditor`/`commitLibText`, 저장=POST(새)·PATCH(수정). '텍스트 자료 작성' 버튼.
- **② 모든 파일 형식**: '운영 계획서 올리기' → **'문서·파일 올리기'**, `accept` 속성 **제거**(모든 파일 허용 — mp3·오디오·비디오·문서 등). 저장은 기존대로 `/api/file`(≤8MB KV) · `/api/r2`(>8MB) 가 임의 content-type 처리(이미 지원). `docLabel` 에 MP3/AUDIO/VIDEO 라벨, `isAudioAsset`, `openAsset` **오디오=`<audio controls>` 인라인 플레이어**(inline=1). (파일당 100MB 상한 유지.)
- **리팩터링**: 기사 본문·텍스트 자료가 같은 Tiptap 스택을 쓰므로 마운트 코드를 **공용 `mountRichEditor(wrap,initHtml,onUpdate)`**(app.js, `buildToolbar` 재사용, 실패 시 contentEditable 폴백, handle.destroy())로 모음 — `mountNewsBodyEditor` 도 이걸 쓰도록 정리(중복 제거). editor.js placeholder 'SNS 게시 문구'→'내용을 입력하세요'(§16.79).
- 검증: `node --check`(app·library·jp-assets) + 회귀 **87→91/91**(자료실: 4건[파일·텍스트·오디오]·구분탭 전체+5 / 텍스트 보기=리치 본문·받기 숨김 / 텍스트 작성 모달·저장 kind:text / 오디오 audio 플레이어 / accept 제한 없음. 기사 목차 5종은 mountRichEditor 리팩터 후에도 유지) · nav 19/19 · jebo 29/29 + 헤드리스 스크린샷(자료실 목록[텍스트 accent·MP3 라벨]·텍스트 보기[제목/헤딩/불릿/태그/메타·받기 없음]·텍스트 편집기 24툴바, **콘솔 에러 0**, Tiptap 실제 로드). 운영 KV 파괴적 쓰기 없음.

### 16.81 v0.9.219 — 자료실 '카드뉴스·사진 올리기' 제거 + 보도자료 게시판 신설(팀·자료)
- 사용자 2건: (1) 자료실 **'카드뉴스·사진 올리기' 버튼 삭제**, (2) 팀·자료에 **보도자료 게시판 신설**.
- **① 카드뉴스·사진 올리기 제거**: `lib-file-media` 버튼·배선 삭제. 이미지는 **'문서·파일 올리기'**(모든 파일 허용, §16.80)로 계속 올릴 수 있어 기능 손실 없음(모달에서 카테고리 지정). 안내문·빈 상태 문구 갱신.
- **② 보도자료 게시판**(`press`, 신규 뷰): 언론·매체 배포용 **공식 보도자료** 관리. 사이드바 **팀·자료 그룹**에 '보도자료'(megaphone 아이콘) 추가, **홍보부·관리자 전용**(`canSee('press')=isStaff()`, tips·sitemap 과 동일). 신규 API `functions/api/jp-press.js`(KV `jpp:<id>`, staff 게이트): GET(목록)·POST(작성/`action:'status'` 토글)·PUT(작성자·관리자 수정)·DELETE(작성자·관리자, R2 첨부 실물 정리). 필드=제목·본문(HTML)·배포일·담당자·배포 매체·상태(draft/released)·첨부[≤10]. 클라(app.js press 도메인): **목차 표**(번호·제목·배포일·담당자·상태) + 통계바(전체·배포완료·작성중), 제목 클릭 시 본문(정화)·첨부(받기)·배포 매체 펼침, 상태 토글. 작성/수정 모달=제목·배포 예정일·담당자·배포 매체·상태 세그·**Tiptap 본문**(공용 `mountRichEditor`)·첨부(이미지 다운스케일/그 외 `uploadAttachment`, 최대 10). 아이콘 `megaphone` 신설(core.js).
- 검증: `node --check`(app·core·jp-press·jp-assets) + 회귀 **91→96/96**(보도자료 5종: 목차 5열·통계바 / 배포일·담당자·상태토글 / 제목클릭 본문·첨부·배포매체 펼침 / 상태 API released / 작성 모달·저장 released·매체. 디자인 SWEEP 에 press·news 뷰 추가, `press-attx` MINI 예외) · nav **19/19**(항목 14→15·보도자료 포함, 일반 회원 press 숨김·직접호출 차단) · jebo 29/29 + 헤드리스 스크린샷(보도자료 목차[배포완료 pill·첨부 배지]·펼침[리치 본문·PDF/이미지 첨부·배포 매체]·작성 모달 24툴바, **콘솔 에러 0**, Tiptap 로드). 신규 KV 바인딩 불필요(SCOUT_KV·SCOUT_R2 기존). 운영 KV 파괴적 쓰기 없음.

### 16.82 v0.9.220 — 🔴 기사 삭제 시 로그아웃 버그 수정 + 자료실·기사 GET 인증 게이트 + 콘텐츠 슬롯 모달 영역 박스화
- 사용자 안정성 점검 요청 → 진단 후 3건 처리(동시편집 lost-update ②는 큰 구조 변경이라 다음 회차로 분리).
- **🔴 기사 삭제 = 로그아웃 버그**: `jp-news` DELETE 만 `adminUser`(TOTP 세션 전용) 게이트라, **마스터 '회원' 세션**(id/pw 로그인)은 `adminUser` 에서 401 → 클라 `authExpired()` 가 **로그아웃**시켰다(다른 API 는 전부 `memberOrAdmin`). → DELETE 를 `memberOrAdmin` 으로 통일: 세션 없으면 401(재로그인), 로그인했지만 관리자/마스터 아니면 **403**(권한 안내 토스트, 로그아웃 아님). 클라 `deleteNews` 에 403 처리 추가. `jp-members` 는 `isManager`(adminUser ∥ master)로 이미 정상 → 형제 버그 없음.
- **① 자료실·기사 GET 인증 게이트**: `jp-assets`·`jp-news` GET 이 **무인증 공개**라 내부 자료(문서·텍스트 공지·참고자료)·기사 목록이 로그인 없이 조회됐다(비교: `jp-tips`·`jp-press` 는 staff 게이트). → 두 GET 에 `memberOrAdmin` 추가(회원 전체 열람, 비로그인 401). 클라 `loadNews`·`loadLibrary` 에 `authHeader()` + 401→`authExpired`.
- **② 콘텐츠 슬롯 모달 영역 박스화**(사용자 "각 영역의 박스가 잘 안보여"): 슬롯 모달이 바깥 카드 1장 안에 `.fld` 섹션들이 평평하게 흘러 구분이 안 됐다. **카드-인-카드(§규칙④)를 피해** 바깥 `.slot` 카드를 제거(plain flex 컨테이너)하고 **각 `.fld` 섹션을 또렷한 박스**(surface-3 배경 + 헤어라인 테두리 + 패딩 + radius)로, 섹션 안 입력은 흰색으로 대비. `.tip-sch.slot`(별도 인라인 칩)은 `:not(.tip-sch)` 로 제외.
- 검증: `node --check`(jp-news·jp-assets·app·library) + 회귀 **96→97/97**(슬롯 모달 각 영역 박스 어서션 신설) · nav 19/19 · jebo 29/29 + 헤드리스 스크린샷(슬롯 모달 7+영역 박스·흰 입력·콘솔 에러 0) + 배포 후 라이브 curl(무권한 DELETE→403[401 아님]).
- ⏳ **다음(②동시편집)**: jamboree-plan 14개 도메인 통짜 배열 저장의 lost-update — 서버 per-item 병합 또는 낙관적 버전 가드. 별도 회차.

### 16.83 v0.9.221 — ② 동시편집 유실 방지(서버 per-item 병합) + 모바일 반응형 표 + PC/태블릿 화면 채움
- 사용자: "남은것(②) 해주고, UI가 특히 모바일에서 답답한 것 모두 개선" + 중간에 "PC·태블릿은 빈 영역 없이 최대한 채워".
- **② 동시편집 lost-update 방지**(§16.59 미해결 마감): jamboree-plan 14개 공유 도메인이 배열/객체 통째 저장이라 두 사람이 같은 도메인 동시 편집 시 나중 PUT 이 앞 PUT 을 조용히 덮어썼다. **버전 가드 + per-item 병합** 도입 — 각 KV 키의 `updatedAt` 을 버전으로, GET 이 `versions` 맵을 함께 반환. 클라는 `boardVer` 로 추적하고 PUT 에 `baseVer` 동봉. 서버 `saveDomain()`: baseVer==현재버전이면 **통짜 교체(현행과 동일 — 삭제 정상·테스트 불변)**, 다르면(=그 사이 누가 저장) **id 기준 병합**(들어온 값 우선 + 서버 전용 항목 보존) → 서로 다른 항목 동시 편집이 둘 다 살아남음. 병합 응답(`merged/value/key`)을 클라 `onPutResponse` 가 로컬 반영 + 안내 토스트. ⚠️ 병합 시 상대가 방금 삭제한 항목은 되살 수 있음(충돌 창·드묾·재삭제 가능). id 없는 config(types·ttcats)는 통짜 유지.
- **모바일 반응형 표**: 좁은 화면(≤640px)에서 가로 스크롤로 답답하던 데이터 표(협조 연락처·홍보부 인원·분단·식사·마케팅)를 **행=‘라벨+값’ 카드로 세로 스택**. `labelizeTable()`+MutationObserver 로 열 제목(data-label)을 렌더마다 자동 부여, `.datatable` @media 로 스택. `#contbl{min-width:880px}`·`.newstbl{min-width:640px}` 등 데스크톱 고정폭은 `!important` 로 모바일 무력화. 기사·보도자료 목차는 작성자·작성일 열 숨겨 번호·제목·상태에 집중. ⚠️ **의전(prtbl)은 인원별 rowspan 그루핑이라 행마다 셀 수가 달라 라벨이 어긋남 → 스택 제외(가로 스크롤 유지)**. offtimes 매트릭스·타임테이블 그리드도 본질상 넓어 스크롤 유지.
- **PC/태블릿 화면 채움**: `.wrap{max-width:1180px}` 캡이 넓은 화면에서 좌우 빈 공간을 만들었다 → **2280px 로 상향**(ERP는 표·보드가 폭을 쓸수록 좋다, 초광폭만 상한). 콘텐츠 파이프라인 보드는 `grid-auto-flow:column`+overflow 조합에서 1fr 이 안 늘어 우측이 비었다 → **열 수만큼 `repeat(N,minmax(colw,1fr))` 명시 그리드**(renderBoard)로 넓으면 채우고 좁으면 최소폭 후 스크롤. 슬롯 모달 시:분 입력이 반쪽을 먹던 것 → 시간칸 compact·담당자 채움.
- 검증: `node --check` + `mergeArrById` 순수함수 5/5(다른 항목 동시편집 보존·id없으면 통짜) + 회귀 **97→101/101**(동시편집 3종[boardVer·baseVer·병합반영]·보드 채움 1 신설) · nav 19/19 · jebo 29/29 + 헤드리스 모바일 감사(연락처·인원·분단·식사·보도자료 스택·콘솔 0)·와이드 2264px 보드 우측여백 0·스크린샷.

### 16.84 v0.9.222 — 모달 전반 섹션 박스화(영역·입력 구분) + 의전 장소 칸 확대
- 사용자: "모달들이 영역·박스 구분이 안 돼 입력이 너무 불편"(시간 일정 편집 모달 스샷) + "의전 장소 칸이 좁아 값이 잘림, 전반적으로 안 잘리게".
- **모달 섹션 박스화**: v0.9.220 이 슬롯 모달(`.slot .fld`)만 박스로 했는데, 나머지 모달은 라벨+입력이 평평하게 흘러 영역 구분이 안 됐다. **두 컨벤션 모두 박스**로 통일 — `.evfld`(TT·이벤트) 는 CSS 로 바로 박스, `.fl` 기반(제보·기사·보도자료·텍스트 자료)은 신규 **`sectionizeFl(mbody)`**(라벨+다음 라벨 전까지를 `.fl-sec` div 로 감쌈, 내부에 .fl 있는 사전 그룹[press-fields]은 그 자체를 박스로; 노드 '이동'이라 이벤트·id 보존)로 렌더 후 감싼다. 톤=슬롯과 동일(연회색 surface-3 패널 + 헤어라인 + 흰 입력). 각 render 끝에 `sectionizeFl` 호출(news·press·libtext·tip).
- **의전 장소 칸 확대**: 표 `장소` 열 96→156px(select 값 잘림 해소), 메모 108→132px.
- 검증: `node --check`(app·library) + 회귀 **101→102/102**(모달 `.fl-sec` 박스 어서션 신설; press/tip 에디터 테스트가 sectionizeFl 통과) · nav 19/19 · jebo 29/29 + 헤드리스 스크린샷(TT 13박스·보도자료 6박스[배포일+담당자 그룹 포함]·콘솔 0).

### 16.85 v0.9.223 — 인원별 입영 시점 + 입영 이전 배정 차단 + (마저) 의전 그룹핑 시각·장소 기준
- 사용자 2건: (1) 홍보부 인원 각자 **입영 시점**(현장 도착 일시) 입력, (2) **입영 시점 이전엔 업무 배정 불가**. + 직전 미커밋 작업(의전 그룹핑) 마무리.
- **① 입영 시점 필드**: `roster[].arrive`("YYYY-MM-DDThh:mm"). R&R 표에 **입영 시점 열** 신설(연락처↔팀 사이, `datetime-local` 입력 · min/max=8/2~8/9). `renderStaff` 행에 `.arr-in` 추가, change 시 `saveRoster()`+`renderDerivedPlacement()`. team-row colspan 7→8, HTML thead 8열, 모바일 라벨은 `labelizeTable` 이 인덱스로 자동 부여. CSS `.arr-in`(styles.css). 저장은 기존 roster PUT 에 실려 감(스킴 변경 없음, 구버전=arrive 없음→차단 안 함).
- **② 입영 이전 배정 차단**(오프타임과 같은 취지의 가드, **별도 함수로 분리**): 신규 순수함수 `arriveOf`·`arriveLabel`·`arriveConflict(pid,date,sH)` + 통합 판정 `assignBlock(pid,date,sH,eH)`(입영 이전 우선 → 오프타임, `{tip,tag}` 반환). 배정 4지점을 `offConflict`→`assignBlock` 으로 교체(같은 `offdis`/`offwarn` 클래스 재사용, CSS 무변경): 일정표 담당 칩·토글, 의전 담당 칩(`protAssigneeChips`)·`wireProtAssignChips`, 현장 배치 슬롯(`placeSlotHTML`). 입영일 당일은 시작 시각이 입영 시각 이전이면 차단(시각 미정=이전으로 간주, 안전측). 촬영 리스트 칩은 기존과 동일하게 오프/입영 미적용(연동 행은 tt·의전에서 이미 차단, 독립 행은 구조화 일시 없음).
- **③ (마저) 의전 그룹핑**: 캘린더·타임테이블에서 의전 항목 묶음 키를 `시각+활동명`→**`시각+장소`**로 변경(개영식 등 사람마다 활동 문구가 조금 달라도 한 카드로). 신규 `protGroupName(people)`=묶인 항목 중 **가장 짧은 활동명**을 대표로.
- 검증: `node --check`(app·test) + 회귀 **102→105/105**(신규 3: 입영 이전=차단·이후=허용 판정 / 입영 전 담당 칩 UI 차단 / 표에 입영 입력 렌더) · 오프타임 테스트 불변 · nav/jebo 영향 없음 + 헤드리스 스크린샷(R&R 입영 열 datetime 입력·의전 모달 '이사진 · 입영 전' offdis 차단·김기자 배정 가능, **콘솔 에러 0**). 운영 KV 파괴적 쓰기 없음.

### 16.86 v0.9.224 — 입영↔오프타임 연계(그리드 자동표시) + 오프타임 셀 세로 스택(좁은 화면 깨짐) + 배정 사후 정리(잔여 부채)
- 사용자 3건(대화 중 순차): (1) 남은 기술부채 모두 해결, (2) 입영 시점은 잼버리 기간 중에만 잡으니 **오프타임과 연계**, (3) 오프타임 그리드가 **좁은 화면에서 깨짐**(오전/오후/저녁 2+1 삼각형).
- **① 배정 사후 정리(부채 해결)**: 배정 시점엔 `assignBlock`이 막지만, **입영/오프타임을 배정 이후에 늦게 설정**하면 옛 배정이 '배정 불가'로 남았다. 신규 `findAvailabilityConflicts(pid)`(일정표·의전·**독립 촬영행** 스캔)+`enforceAvailability(pid)`(확인 후 해제, 취소 시 유지) → 입영 변경·오프타임 토글 시 호출. 독립 촬영행은 신규 `shootSchedWhen(m)`(연동 행=원본, 독립 행=자유 텍스트 sched를 `M/D … HH:MM` 패턴 파싱, 못 읽으면 미적용)로 일시를 얻어 촬영 상세 담당 칩에도 `assignBlock` 적용(표시+토글 차단).
- **② 입영↔오프타임 연계**: 오프타임 그리드에서 각 인원의 **입영 시점 이전** 시간대(블록 시작이 입영 이전)를 **앰버(#8A5A0B) 자동-오프 셀**로 표시(수동 오프[빨강]과 구분·토글 아님·`arriveConflict(pid,date,블록시작시각)`). R&R 표 입영 변경 시 그리드 즉시 갱신. 섹션 sub/note에 빨강=오프·앰버=입영 전 범례 추가.
- **③ 오프타임 셀 세로 스택**: 셀 안 3블록이 좁은 칸에서 `inline-block`으로 흘러 2+1 삼각형으로 깨졌다 → `.offcell .offtog{display:block;width:100%}`로 **세로 스택 통일**(예측 가능·모바일 정렬), `.offtbl` min-width 760→**560px**(가로 스크롤 유지·훨씬 좁게). 겸사겸사 오프타임 클릭 핸들러를 `.offtog[data-pid]`(토글 버튼)만으로 좁혀 na/arr 스팬 오클릭(빈 pid 저장) 잠재버그 제거.
- **④ 새 배포 시 자동저장 후 강제 새로고침**(사용자 4번째): `version-watch.js` 가 새 버전 감지 시 **작업 중 내용 flush → 5초 뒤 강제 새로고침**(전 6초). 공용 스크립트라 앱이 노출하는 `window.flushPendingSaves()` 훅(없으면 `app:flush-save` 이벤트)으로 페이지 무관하게 동작. app.js: 디바운스 저장(`debouncedPut`·카드·마케팅·이벤트)이 각자 '즉시 실행' 클로저를 flush 레지스트리에 등록/해제하고, `flushPendingSaves()` 가 대기 중인 걸 전부 즉시 발사(+`saveLocal`) → 500ms 디바운스가 안 나간 편집도 새로고침 전에 서버 저장. 토스트 문구·수동 '지금 새로고침' 도 flush 경유.
- 검증: `node --check`(app·version-watch·test) + 회귀 **105→111/111**(신규 6: 입영 늦게 설정→해제[확인 수락]·[취소 유지] / 촬영 sched 파싱+독립행 가드 / 입영 전 오프타임 자동표시 연계 / 셀 세로 스택 / 새 버전 flush 즉시 발사) · 오프타임·의전 기존 테스트 불변 + 헤드리스 스크린샷(430px 오프타임 그리드: 세로 스택·입영 전 앰버 자동표시 정확[김기자 8/5·이사진 8/6 기준]·삼각형 깨짐 해소, **콘솔 에러 0**). 운영 KV 파괴적 쓰기 없음.

### 16.87 v0.9.225 — 입영 시점 입력 = 날짜+블록 칩(datetime 폐기) + 개영식 카운트다운 검토
- 사용자 2건: (1) 입영 시점을 datetime 위젯 대신 **칩형(오프타임처럼)** 으로, (2) 개영식 카운트다운 재검토.
- **① 입영 = 날짜 드롭다운 + 오전/오후/저녁 칩**: R&R 표 입영 칸의 `datetime-local` 을 폐기하고 **날짜 select(8/2~8/9·미정) + 블록칩 3개**(오프타임 앰버 톤 통일)로 교체. 저장값은 기존과 동일한 `"YYYY-MM-DDThh:mm"`(블록 시작=오전 09:00·오후 14:00·저녁 19:00)이라 `assignBlock`·그리드 앰버·배정 가드 전부 무변경. 신규 `arriveCellHtml`/`wireArriveCell`/`commitArrive`(변경 시 저장+입영 전 담당 정리+표·그리드 재렌더), 날짜만 고르면 오전 기본. 잼버리 기간만 선택 가능(드롭다운 자체가 8일치).
- **② 개영식 카운트다운 검토**: `EVENT_DT=2026-08-05 20:00`까지 diff 를 24h 단위로 내림 → D 숫자가 **매일 20:00에 감소**(자정 아님)해 저녁엔 달력보다 하루 일찍 보이는 off-by-one 을 진단. 사용자 선택 = **정밀 카운트다운(개영식 20:00까지) 유지** → 로직 변경 없음(수학적으로 정확함 확인). 저녁 감소는 이 방식의 특성으로 수용.
- 검증: `node --check`(app·test) + 회귀 **111→112/112**(입영 칩 렌더[datetime 아님]·칩 클릭 저장값[날짜→오전 기본·저녁→19:00] 신규, 기존 입영/오프타임/연계 테스트 불변) + 헤드리스 스크린샷(R&R 입영 = 날짜+블록 칩[김기자 8/5 오전·이사진 8/6 오후]·오프타임 그리드 앰버 연계 일치, **콘솔 에러 0**). 운영 KV 파괴적 쓰기 없음.

### 16.88 v0.9.226 — 입영 블록칩 세그먼트 디자인 + '타인 수정 중' 오탐 수정(같은 작성자 병합 안 함)
- 사용자 3건: (1) 입영 블록 버튼이 겉돎(디자인), (2) 타인이 없는데 "타인이 수정 중"이라 저장 막힘, (3) 입영으로 생긴 오프데이(앰버)는 직접 수정 불가.
- **① 입영 블록칩 = 세그먼트 컨트롤**: 오전/오후/저녁이 각자 테두리 박스로 흩어져 겉돌던 것을 **`.card .seg` 와 같은 톤**(테두리 하나의 pill + 분리선으로 연결된 3칸, 선택=앰버)으로 통일. CSS `.arrblks`/`.arrblk` 만 변경(마크업·저장값·로직 무변경).
- **② '다른 사람이 편집 중' 오탐 수정**(서버): 동시편집 병합 가드가 `baseVer !== storedVer` 이기만 하면 병합→"다른 사람이 편집 중" 토스트를 띄웠다. 혼자여도 **같은 사람의 연속 저장(레이스)·캐시로 baseVer 만 옛것**이면 오탐. → `saveDomain` 에 **작성자 비교** 도입: 신규 순수함수 `conflictByOther(baseVer,storedVer,storedAuthor,author)` = 버전이 다르고 **작성자가 실제로 다를 때만** 병합. 같은 작성자면 통짜 저장(병합 아님). KV wrap 에 `author` 저장. 구버전 데이터(작성자 없음)는 병합 안 함(통짜) — 안전측.
- **③ 입영 앰버 셀 직접 수정 불가**: 이미 v0.9.224 부터 앰버(입영 전) 셀은 `<span>`(토글 버튼 아님)이고 클릭 핸들러(`.offtog[data-pid]`)에서 제외되어 수정 불가 — 재확인. (기존 테스트 '입영 전 자동표시·토글아님=true' 가 검증.)
- 검증: `node --check`(app·server·test) + **서버 회귀 신설 `test/regress-krjam-planning-server.js` 7/7**(conflictByOther: 같은작성자·다른작성자·같은버전·baseVer없음·storedVer없음·구버전·작성자미상) + 클라 회귀 **112/112**(입영 칩 렌더·클릭 불변) + 헤드리스 스크린샷(입영 세그먼트칩[김기자 8/5 오전·이사진 8/6 오후]·오프타임 앰버 연계, **콘솔 에러 0**). 운영 KV 파괴적 쓰기 없음.

### 16.89 v0.9.227 — 오프타임 그리드 8/2부터(전 기간) + 입영 전 자동 잠금 정합 + 입영 전 수동오프 정리
- 사용자: "8/2 저녁 입영이면 8/2 점심까지 오프데이에서 자동 비활성화되게. 기존 오프데이 설정은 지워라." (입영을 8/2 로 잡아도 그리드가 8/3부터라 8/2 가 안 보이고 자동 잠금이 안 됐음.)
- **① 그리드 전 기간(8/2~8/9)**: `OFF_START_DATE 8/3→8/2` · `OFF_START_BLOCK 1→0` — '8/3 오후부터' 하드코딩 제한(빗금 na) 제거. 이제 조기 불가는 **입영 시점이 담당**(입영 전=자동 앰버). 8/2 저녁 입영 → 8/2 오전·오후 앰버 자동 잠금(수정 불가), 저녁부터 배정 가능.
- **② 입영 전 수동오프 정리**(`pruneOffBeforeArrival`): 입영 전 칸에 남아 있던 **수동 오프 설정을 삭제**(그 칸은 이제 입영 기준 자동 오프라 중복·무의미). 입영 변경 시(`commitArrive`) + 그리드 렌더 시(기존 데이터 1회 청소, 이후 0) 실행. 입영 **이후** 수동오프는 유지.
- 안내문 갱신(빗금·8/3 제한 문구 제거, 앰버=자동 잠금·수정 불가·수동오프 자동정리 명시).
- 검증: `node --check`(app·test) + 회귀 **112→114/114**(입영 전 수동오프 정리[입영 후 유지]·그리드 8/2 포함+앰버 신규; 연계 테스트 8→12칸으로 8/2 포함 확인) + 헤드리스 스크린샷(그리드 8/2 시작·김기자 8/2 저녁 입영→8/2 오전·오후 앰버 잠금·저녁 배정가능·na 빗금 제거, **콘솔 에러 0**). 운영 KV 파괴적 쓰기 없음(입영 전 수동오프 정리는 비파괴 read-modify-write).

### 16.90 v0.9.228 — 입영 전 자동 오프데이 = 앰버 → 회색 음영
- 사용자: "입영 시점으로 처리되는 오프데이는 회색에 음영처리." → `.offtog.arr` 를 앰버 솔리드 → **회색 대각 음영**(`repeating-linear-gradient` surface-2/3, 뮤트 텍스트, cursor not-allowed)으로. 수동 오프(빨강)와 명확히 구분되고 '자동·수정 불가' 느낌. 범례 문구도 '앰버=입영 전' → '회색 음영=입영 전'.
- 검증: 회귀 **114/114**(클래스명 불변, 라벨만 갱신) + 헤드리스 스크린샷(입영 전 셀 회색 대각 음영·저녁 배정가능, 콘솔 0).

> 버전 bump 없는 라이브 데이터·KV 조치도 **모두 명확히** 기록한다(사용자 지시 2026-06-25). 일시·대상·전후·검증 포함.

### 16.91 v0.9.229 — 🔴 입영(arrive) 데이터 유실 수정 (서버 cleanRoster 누락)
- 사용자: "자꾸 입영시점 데이터를 날린다." → **원인 확정**: v0.9.223 에서 클라 roster 에 `arrive` 필드를 추가했으나 **서버 `cleanRoster` 화이트리스트에 `arrive` 를 넣지 않아**, roster 를 저장할 때마다(`saveRoster`) 서버가 arrive 를 **버렸다**. 화면엔 남지만 저장→다음 로드/새로고침 때 사라짐(특히 v0.9.224 자동 새로고침이 잦아 노출↑).
- 수정: `cleanRoster` 에 `arrive:(e.arrive||"").slice(0,20)` 추가(한 줄). 이제 저장 시 보존.
- 검증: 서버 회귀 **7→10/10**(cleanRoster: arrive 보존·빈값·기존필드 유지 신규) + `node --check`. ⚠️ **이미 유실된 값은 복구 불가**(백업 없음) — 재입력 필요.

### 16.92 v0.9.230 — 8/9 오후·저녁 전체 오프(폐영일) + handoff 문서 관례
- 사용자: "8/9 오후 이후 블록은 모두 오프(마지막 폐영식)." → **전체 오프 규칙**(코드·전원·수정 불가) 신설.
- `GLOBAL_OFF=[['2026-08-09','pm'],['2026-08-09','eve']]` + `isGlobalOff`/`globalOffConflict`. `assignBlock` 에 입영 다음 우선순위로 편입 → 모든 인원 8/9 오후·저녁 배정 불가(오전은 가능). 그리드에 **빨강 빗금** 셀(`.offtog.goff`·토글 아님)로 표시(회색 음영=입영 전, 빨강=수동 오프와 구분). 범례 갱신. 라이브 KV 미접촉(코드 규칙이라 인증 불필요).
- ⚠️ 폐영식(8/9 저녁 19:00)도 전체 오프에 포함 — 지시대로 저녁까지 배정 불가. 저녁(폐영식)은 배정 가능해야 하면 GLOBAL_OFF 에서 eve 제거.
- 검증: 회귀 **114→116/116**(8/9 오후·저녁 전체 오프 배정 불가·오전/타일 가능·그리드 goff 셀 신규) + 헤드리스 스크린샷(8/9 오후·저녁 빨강 빗금·오전 가능, 콘솔 0).

### 16.93 v0.9.231 — dormant navsheet 잔재 제거(§16.63 이후 미정리) + 잔여 작업 현황 재확인
- 사용자 "planning 사이트만 마저 작업" → handoff 의 '남은 일' 을 **코드 기준으로 전수 재확인**한 결과 4건 중 3건이 이미 완료 상태였다(문서만 옛 항목을 안고 있었음).
  - **지도 공백구역**: v0.9.216(§16.78)에서 `computeCoverageGaps`/`renderCoverageGaps` 로 이미 구현 — handoff 미반영이었음.
  - **`renderTimetable` 블록 렌더러 추출**: 이미 완료 — 현재 13줄로, 마크업(`ttColumnHtml`/`ttBlocksHtml`)·이벤트 배선(`wireTimetableGrid`)·컨트롤(`renderTTControls`)이 각각 분리돼 있다.
  - **`toggleNoCover`/`deleteAsset` mutate→save→render 분리**: v0.9.224(§16.86 "남은 기술부채 모두 해결")에서 완료 — 순수 변경자 `setTtNoCover`·`removeTt`(app.js)·`removeAssetFromList`·`requestAssetDelete`(library.js) 추출됨.
  - ⚠️ **조사 함정**: `jamboree-plan/app.js` 는 grep 이 **바이너리로 오판**해(`file`=UTF-8, very long lines 389) 매치를 조용히 0건으로 반환한다. **`grep -a` 를 반드시 붙일 것** — 이걸 놓치면 "구현 안 됨"으로 오진한다.
- **실제 처리 = dormant navsheet 제거**(§16.63 v0.9.184 에서 모바일 하단 탭이 4공간으로 바뀌며 죽었으나 잔존): 호출처 0·다른 모듈 미사용 확인 후 3지점 삭제 — `krjam-planning.html` 의 `#navsheet` 블록 4줄, `app.js` 의 `closeNavSheet()`(유일 참조가 자기 자신), `styles.css` 의 `.sheet*` 18줄(+`@keyframes sheetUp`). (`library.js` 의 `sheet` 는 `spreadsheet` MIME 매칭이라 무관.)
- **8/9 저녁(폐영식) 전체 오프**: 사용자 확인 결과 **현행 유지**(오후+저녁 모두 배정 불가) — `GLOBAL_OFF` 무변경.
- 검증: `node --check`(app) + 회귀 **클라 116/116 · nav 19/19 · jebo 29/29 · 서버 10/10**(전부 불변 통과) + 잔재 grep 0. 운영 KV 파괴적 쓰기 없음.

### 16.94 v0.9.232 — 🔴 로드 시 시드 복원이 사용자 데이터를 덮어쓰던 문제 일괄 수정 + 잔여 배정 점검 + 다기기 동시편집 + 캐시 헤더
- 사용자 "기능적으로 오류가 검증이 필요한 것들을 찾아봐" → 조사 후 "검증하고 개선해". 6건 중 **4건은 실제 Chrome + `/api` 목업으로 재현까지 확인**한 뒤 고쳤다(운영 KV 무접촉).
- **🔴 ① 의전 데이터 소실**(재현: 사용자 2건 → 로드 후 41건, 사용자 행 0/2 생존, 서버로 41건 PUT): `upgradeProtocol` 이 "`prot-NN` id 가 하나도 없으면 구 개략 시드"로 판정해 상세 41건으로 **교체 + 공유 KV PUT** 했다. 그런데 `addProtocol()` 은 `mkid()` 로 행을 만들어 **사용자가 직접 추가한 행은 절대 `prot-NN` 이 아니다** → 시드를 지우고 의전을 새로 짜면 새로고침 한 번에 전부 소실(전원 영향·백업 없음). §16.91(arrive 유실)과 같은 '조용한 소실' 계열.
- **② 지운 시드가 매 로드마다 부활**(재현: events 0→8 · timetable 1→41[컵·슈퍼스타J] · shootlist 0→59, 각각 서버 PUT까지): `mergeSeedMeetings`·`mergeCubObservers`·`mergeSuperstarJ`·`mergeShootlistGates`·`upgradeShootList` 가 "그 id 가 없다"를 "아직 안 들어왔다"로만 읽고 **"사용자가 지웠다"를 구분하지 못했다**(tombstone 없음).
- **③ 식사 메뉴를 비우면 시드 복원**(재현: 비워 둔 대원 일반식에 5일치 재주입): `upgradeMeals` 가 내용 0이면 재시드 → '메뉴 미정' 운영이 불가능했다.
- **①②③ 공통 수정 — 시드는 '새 보드'에만**: 신규 `domainStored(k)` = 서버 GET 의 `versions` 맵에 그 도메인 키가 있는지. 서버 `rd()` 는 **KV 키가 존재할 때만** `versions[vkey]` 를 채우므로, 있으면 = 누군가 저장한 보드 = **지금 값이 사용자의 뜻**이다. 위 6개 함수 전부에 이 가드를 달았다. `upgradeProtocol` 은 추가로 **로컬(localStorage) 편집분이 있으면 그것도 보존**(서버엔 없고 로컬에만 있는 경우). 멱등 '복구'(컵 track/batch 되살리기·id 중복 정리)는 데이터 파손 수리라 가드와 무관하게 계속 돈다. `mergeShootlistFromTimetable` 은 **`noCover`(취재 불필요) 일정의 촬영행을 새로 만들지 않게** 해, 지운 파생 행도 억제할 수 있게 했다.
- **④ 나중에 생긴 규칙에 걸린 기존 배정**(재현: 8/9 15:00 일정에 담당 1명 남아 있고 `assignBlock` 은 배정 불가 판정): `enforceAvailability` 는 **입영 변경·오프타임 토글 두 곳에서만** 돌아, v0.9.230 이 8/9 오후·저녁을 전체 오프로 만들기 전에 잡아 둔 배정은 아무도 정리하지 않았다(화면=배정 불가, 데이터=담당 존재). → 신규 `findAllAvailabilityConflicts()`(전원 스캔) + **일정표 '배정 불가 잔여 담당' 점검 배너**(`renderTTAvail`, `#tt-avail`, 중복 점검 배너와 같은 톤). 인원별로 묶어 사유 태그·일정명·열기 버튼, '이 인원 N건 담당 해제'는 기존 `enforceAvailability`(확인 후 해제)를 그대로 재사용. **자동 삭제는 하지 않는다** — 중복 배너와 같은 원칙.
- **⑤ 같은 계정 다기기 lost update**: `conflictByOther` 가 작성자만 비교해, 한 사람이 PC·휴대폰(또는 두 탭)에서 열어 두면 나중 저장이 앞 저장을 **경고 없이** 통째로 덮어썼다(v0.9.226 이 오탐을 잡으려 넣은 트레이드오프). → **편집 창 id(`client`)** 도입: 클라는 `sessionStorage` 기반 탭 단위 id 를 PUT 에 동봉(`CLIENT_ID`), 서버는 wrap 에 저장하고 `conflictByOther(baseVer,storedVer,storedAuthor,author,storedClient,client)` 로 **작성자가 같아도 창이 다르면 병합**. 같은 탭의 연속 저장은 여전히 병합 안 함 = v0.9.226 오탐 방지 유지. client 없는 구버전 클라/데이터는 예전 동작으로 폴백(안전측). `saveDomain` 은 `now, author` 두 인자를 쓰기 맥락 객체 `W={now,author,client}` 하나로 통일(14개 호출부 동일 형태).
- **⑥ 개인정보 응답 캐시 헤더**: 보드 GET 은 인원 실명·전화·이메일을 담는데 `Cache-Control: public, max-age=30` 이라 브라우저·중간 캐시 저장을 허용했다(무인증 유출은 `memberOrAdmin` 이 이미 차단). → **엣지 캐시(`caches.default`)에는 캐시 가능한 사본을 넣어 KV 읽기 절감은 유지**하고, 사용자에게 돌려주는 응답만 신규 `privateJson()` 으로 `private, no-store`. 캐시 히트 경로도 같은 헤더로 감싼다.
- 검증: `node --check`(app·API) + 회귀 **클라 116→124/124**(신규 8: 저장된 보드 판정 / 지운 회의 시드 미부활 / **사용자 의전 행이 시드로 교체 안 됨** / 새 보드에는 시드 정상 주입[회의·의전 41·식사] / noCover 촬영행 미부활 / 잔여 배정 배너 노출 / 배너 해제 동작 / PUT 에 client 동봉) · 서버 **10→16/16**(client 차원 6종) · nav 19/19 · jebo 29/29 + **진단 스크립트 재실행으로 4건 재현 소멸 확인**(의전 2/2 생존·로드 중 PUT 0건 / events·timetable 시드 부활 0 / 잔여 배정은 배너로 노출). 운영 KV 파괴적 쓰기 없음(GET·헤드리스 목업만).
- ⚠️ **테스트 목업도 함께 현실화**: 기존 목업은 `versions` 로 "저장된 보드"라 선언하면서 시드는 담지 않아, 새 규칙에선 시드가 주입되지 않는다(12건 실패). 라이브 보드처럼 **시드를 이미 담은 timetable** 을 돌려주도록 고쳤다(앱의 `cubObserverSeeds()`/`superstarJSeeds()` 재사용).

### 16.95 v0.9.233 — 데이터 안정성 6종: 저장 재시도 큐 · 미저장 보호 · 새로고침 가드 · 보드 백업 · 길이/개수 가드
- 사용자 "모두 데이터를 안정적으로 서비스하는데 집중" → 조사(보고 후 승인) → 승인된 6건 전부 구현. 조사 근거는 실제 Chrome + `/api` 목업 재현(운영 KV 무접촉).
- **먼저 확인된 '이상 없음'**: 서버 `clean*` 화이트리스트 vs 클라 실제 필드 **8개 도메인 전수 자동 대조 결과 유실 필드 0건**(v0.9.229 `arrive` 계열 재발 없음). `buildCleanTT`(클라)와 `cleanTT`(서버)도 17키 일치.
- **🔴 ① 저장 실패 = 조용한 유실 → 재시도 큐**(재현: 실패 후 12초간 재시도 0회 → 새로고침 → 편집분 소실): 슬롯(카드) 저장에는 `pending` 재시도가 있었는데 **14개 도메인 저장에는 없어** `setSt('저장 실패')` 한 줄만 남기고 끝났다. 신규 `sendDomainPut`(모든 도메인 저장의 단일 경로) + `domPending` 큐 + **15초 주기·`online` 이벤트 재시도** + 상단 상태 `저장 대기 N건 — 자동 재시도`(`.st.warn`). raw fetch 였던 `saveMarketing`·`saveTypes`·`saveEvents` 도 이 경로로 통일(이제 실패해도 안 사라짐).
  - ⚠️ **재시도는 옛 배열을 보내면 안 된다** — 저장 대상은 `state.timetable=out` 처럼 통째 교체되므로, body 를 객체가 아닌 **thunk**로 받고 보낼 때마다 현재 state 에서 다시 만든다. 도메인별 정의를 `DOMAIN_BODY` 한 곳에 모아 저장 함수·복구가 같은 정의를 쓴다.
- **② 미저장 변경 보호**: `applyServer` 가 서버 값을 무조건 대입해, 저장 실패 상태로 새로고침하면 화면은 물론 `saveLocal()` 을 통해 **localStorage 백업까지 서버 값**이 되어 복구 경로가 사라졌다. → 대기 중인 도메인은 서버 값으로 **덮지 않는다**(`hasUnsaved(dom)`). 큐가 메모리에만 있으면 새로고침 한 번에 무의미하므로 **`jamboree-plan:unsaved` 표식을 localStorage 에 남기고**, 다음 로드에서 `restoreUnsaved()`(GET 보다 먼저)가 로컬 값을 지키고 다시 올린다.
- **③ 저장 가드 바 + 이탈 경고**(`#save-guard`): 상단에 `저장되지 않은 변경 N개 영역` + **[지금 다시 저장] [서버 값으로 되돌리기]**. 되돌리기는 표식까지 지우고 새로고침(되돌릴 수 없음을 확인받는다). 대기분이 있는 채 창을 닫으면 `beforeunload` 경고. `version-watch` 는 flush 후에도 대기분이 남아 있으면 **강제 새로고침을 미루고 5초마다 재확인**(새로고침이 실패분을 삼키던 경로 차단).
- **④ 보드 백업**(홍보부·관리자 전용, 인원 화면 하단): 기존 `exportJSON` 은 콘텐츠 캘린더 슬롯+마케팅만 담아 **운영 데이터에는 내보내기도 복원도 없었다**(v0.9.229·232 소실이 전부 '복구 불가'였던 이유). 신규 `boardBackupData`/`exportBoardBackup` 이 14개 도메인 + teams 를 파일 하나로, `importBoardBackup` 이 그 파일로 복원(파일 검증 → 영역별 건수 요약 → **2단계 확인** → 도메인별 저장 함수 경유라 재시도·병합 그대로 적용).
- **⑤ 길이 가드**: 서버 `clean*` 가 저장 시 자르는 값(의전 메모 400 · 일정 메모 500 · 담당업무 400 · 활동 300 · 촬영 포인트 400 …)을 클라에도 `FIELD_MAX` 로 두고 `clipField` 가 자르면서 **토스트로 알린다**. 전에는 화면엔 다 보이다가 다음 로드에서야 잘려 있었다. 적용: 인원·연락처·분단·의전 표(contenteditable), 식사 셀, 촬영 상세 모달(+`maxlength`), 일정 모달 제목·장소·메모.
- **⑥ 항목 수 상한 근접 경고**: 서버 cap(`timetable 400 · shootlist 500 · contacts/events/marketing 300 · protocol/shoots 200 · roster 100 · divisions/ttcats/types 60`)의 **90% 도달 시 저장 가드 바에 경고**(넘으면 뒤쪽이 조용히 잘린다).
- 검증: `node --check`(app·version-watch) + 회귀 **클라 124→132/132**(신규 8: 실패 시 큐 등록·상태 / localStorage 표식 / 가드 바·version-watch 훅 / **대기 도메인은 서버 값으로 안 덮임** / 재시도 성공 시 큐·표식 정리와 최신 값 전송 / 백업 13개 영역 / 길이 클립 / 상한 90% 경고) · nav 19/19 · jebo 29/29 · 서버 16/16 + **진단 스크립트 재현 소멸 확인**(실패→재시도 발생→새로고침 후에도 편집분 보존) + v0.9.232 프로브 2종 재실행으로 회귀 없음. 운영 KV 파괴적 쓰기 없음.

### 16.96 v0.9.243 — 모션 (사용자: "전반적으로 화려하면서도 유려하게 사용상에 거슬리지 않게")

랜딩(`/`)과 **의도적으로 다르게** 잡았다. 이 화면은 데이터가 빽빽하고 하루 종일 들여다보는 도구라, 상시 움직이는 배경 레이어는 두지 않는다(오로라·불티 없음 — 회귀가 이걸 검사한다). 모션은 전부 **사용자의 동작에 붙어** "지금 무슨 일이 일어났는지"를 말한다.

**표현 계층만 손댔다 — 데이터 흐름(저장·병합·대기 큐)은 한 줄도 바꾸지 않았다.**

- **화면 전환**: `.wrap>section` 이 240ms 페이드+상승. `setView` 가 `display` 를 토글하면 애니메이션이 다시 시작되므로 **JS 변경 0**.
  - ⚠️ `animation-fill-mode` 를 쓰지 않는다. 끝난 뒤 `transform` 이 남으면 섹션 안의 `position:fixed`(예: `#shoot-scrim`) 기준이 뒤틀린다. 회귀가 "끝나면 transform 이 남지 않음"을 검사한다.
- **모달**: 배경 페이드(160ms) + 창이 12px 떠오르며 안착(260ms). `.scrim.show` / `.scrim.show>*`.
- **토스트**: 아래에서 떠오르며 등장. 기본 `translateX(-50%)` 를 키프레임이 그대로 지킨다.
- **좌측 메뉴**: 현재 화면에 3px 막대가 `scaleY` 로 자란다 — 색만으로 상태를 말하지 않는다(tokens.css 규칙 ③).
- **조작 요소**: 버튼 hover 1px 상승 / `:active` 눌림, 칩 `:active` 축소. 크기·터치 타깃은 그대로.
- **통신 진행 표시**(신규): 저장·불러오기가 도는 동안 상단 2px 띠. `netBusy(±1)` 카운터 + `html.net-busy` 토글뿐이고, `sendDomainPut` 은 **기존 체인 끝에 값을 그대로 흘려보내는 `.then` 하나만** 덧붙였다(이미 `.catch` 가 실패를 삼키므로 성공·실패 모두 이 지점을 지난다 → 표시가 남지 않는다).
- **저장 완료 순간**: 상태 문구(`#syncst`)가 한 번 튄다.
- `prefers-reduced-motion` 이면 전부 정지(진행 표시는 흐름 없이 색으로만 남는다).

**검증**: 신규 `test/regress-krjam-planning-motion.js` **22/22** — 상시 무한 애니메이션이 진행 표시뿐인지 · 배경 레이어 부재 · 전환 중 움직이고 끝나면 transform 잔류 없음 · 메뉴 막대 · **진행 표시가 켜지고 반드시 꺼지는지**(카운터 음수 방지 포함) · 실제 저장 경로에서의 점멸 · 모달 안착 · 터치 타깃 유지 · 모션 줄이기. 기존 회귀 **planning 132 · nav 19 · server 16 · jebo 29 전부 통과**.

### 16.97 v0.9.244 — 화면 전환을 페이드만으로 (기하 검사 흔들림 제거)

**증상**: v0.9.243 배포 후 `regress-krjam-planning` 이 **3회 중 2회** "조작 요소 전부 40px 이상"에서 실패. 모션 블록을 통째로 빼면 3/3 통과 → 내 변경이 원인임을 먼저 확정했다.

**원인**(실측): 정지 상태의 `.btn.sm` 은 정확히 40.00px 인데, 회귀는 `setView` 250ms 뒤에 재는 반면 전환 애니메이션(`jpViewIn`)은 240ms 라 **마지막 프레임에 걸린다**. 그 순간 섹션에 `matrix(1,0,0,1,0,5.25861e-06)` 짜리 잔여 이동이 남아 있고, `getBoundingClientRect()` 가 코너를 변환하며 생긴 부동소수 오차로 높이를 **39.999999996** 으로 돌려준다 → `< 40` 에 걸린다. 터치 타깃 하한이 정확히 40px 라 오차가 그대로 드러났다.

**조치**: `.wrap>section` 전환에서 **transform 을 없애고 페이드만** 한다(`@keyframes jpViewIn{from{opacity:0}to{opacity:1}}`, .22s).
- 실제로 작아진 적은 없지만, **장식이 기하 검사를 흔드는 것 자체가 결함**이다. 데이터 보드에서 7px 떠오르는 연출은 그 위험을 감수할 값어치가 없다.
- 덤: transform 이 아예 없으니 섹션 안 `position:fixed`(`#shoot-scrim`) 기준이 뒤틀릴 여지도 사라졌다.
- 곁가지로 `.btn`/`.vtab` 의 눌림도 `scale(.97)` → `translateY(1px)` 로 바꿨다. 높이가 정확히 40px 인 컨트롤을 scale 로 줄이면 그 순간 하한을 깬다.

**회귀에 고정**: `regress-krjam-planning-motion` 에 **"전환 중에도 transform 을 쓰지 않음"**(23/23). 이 검사가 있으면 누가 다시 `translateY` 를 넣는 순간 잡힌다.

**교훈**: 회귀가 "가끔" 실패하면 그건 플레이키가 아니라 **결함**이다. 원인을 못 찾으면 재시도로 덮지 말고, 변경을 통째로 빼봐서 내 탓인지부터 가른 뒤 실측으로 좁힌다.

### 16.98 v0.9.249 — 보도자료 탭을 게시판으로 (읽기 모달 · 다중 선택 · 단계 3종)

**사용자**: "기사작성을 실제 게시판처럼 해줘. 모달로 열려서 관리할 수 있게 — 지금은 그냥 접혔다 펴지고 막 이러니까 좀 별로네" + "여러개를 한번에 선택 / 한번에 삭제" + "상태 3단계(초안 · 최종검수완료 · 퍼블리싱완료)".

**① 아코디언 → 읽기 모달**
- 전에는 제목을 누르면 표 아래에 상세 행(`.news-detailrow`)을 끼워 넣었다. 본문이 길면 표가 통째로 밀려 목록의 의미가 사라졌다.
- 이제 제목을 누르면 **읽기 모달**(`#pressview-scrim`)이 열려 본문·첨부·메타를 보여주고, 그 안에서 **단계 변경·수정·삭제**까지 한다. 목록은 목록으로만 남는다.
- `renderPressDetail()` 과 `togglePressExpand()` · `expandedPress` 제거.

**② 다중 선택 · 일괄 작업**
- 행마다 체크박스 + 헤더 전체 선택. 선택이 있으면 통계바 자리가 **일괄 작업 바**로 바뀐다(N개 선택 · 단계 3버튼 · 선택 삭제 · 선택 해제).
- ⚠️ **권한 없는 글은 건드리지 않는다.** `canEditPress`(관리자 또는 작성자)로 거른 뒤, 제외된 건수를 토스트로 알린다. 삭제는 확인 대화상자에서 제외 건수까지 미리 알린다.

**③ 단계 3종** — `draft`(초안) · `reviewed`(최종검수 완료) · `published`(퍼블리싱 완료)
- ⚠️ **서버 화이트리스트를 먼저 넓혔다.** `functions/api/jp-press.js` 의 `cleanStatus` 가 `released|draft` 만 허용했으므로, 새 값을 그냥 보내면 **조용히 초안으로 저장**된다([handoff 데이터 소실 패턴 ①](../../rules/handoff.md)).
- 기존 데이터(`released`)는 **마이그레이션 쓰기 없이** 읽을 때·쓸 때 `published` 로 승격한다(운영 KV 파괴적 쓰기 금지). 저장하면 그때 새 값으로 굳는다.
- 3단계라 '토글'이 성립하지 않아 `togglePressStatus` → `setPressStatus(id, st)` 로 교체.

**작업 중 잡은 것**
- 일괄 작업 버튼이 안 먹었다 — 위임 클릭 리스너가 `#press-list` 에만 걸려 있어 **일괄 바(`#press-bar`)의 클릭이 잡히지 않았다.** 같은 핸들러를 두 컨테이너에 건다.
- 본 회귀(`regress-krjam-planning.js`)의 보도자료 블록이 옛 계약(5열·`data-press-expand`·`released`)을 들고 있어 깨졌다 → 새 계약으로 갱신(133/133).

**검증**: 신규 `test/regress-krjam-press.js` **26/26** — 서버 단계 정규화 4종(구 `released` 승격·모르는 값 차단 포함) · 목록 6열/체크박스 · **본문을 목록에 끼워 넣지 않음**(아코디언 부활 감지) · 읽기 모달(본문 정화·첨부·매체·단계 강조·API 전달) · 전체 선택/일괄 단계/일괄 삭제 · **권한 없는 글 제외**(관리자 3건 vs 부원 2건) · 작성 모달 3단계. 전체 스위트 **3회 연속 실패 0건**(410건 ×3).

### 16.99 v0.9.250 — 기사 탭을 게시판으로 (사용자 요청 원본) + 작성 순서 지정

> ⚠️ **§16.98(v0.9.249)은 대상 탭을 잘못 짚었다.** 사용자가 말한 곳은 **홍보부원 기사** 탭인데 **보도자료** 탭을 고쳤다.
> 보도자료 개편 자체는 되돌리지 않는다(같은 문제를 같은 방식으로 해결한 개선이고, 회귀 26건으로 고정돼 있다). 이번 판에서 **원래 요청 대상인 기사 탭**을 같은 수준으로 올린다.

**① 아코디언 → 게시판**
- 제목 클릭 = 표 아래 상세 행(`.news-detailrow`) 삽입 → **읽기 모달**(`#newsview-scrim`). 목록은 목록으로만 남는다.
- `renderNewsDetail()` · `toggleNewsExpand()` · `expandedNews` 제거.
- 표는 7열 — 선택 · 번호 · 제목 · 작성자 · 작성일 · **단계** · 카드뉴스. 제목 칸에는 부제목과 태그 3개까지 함께 보인다.

**② 다중 선택 · 일괄 작업**
- 행 체크박스 + 헤더 전체 선택(`#news-ckall`). 선택이 있으면 통계바(`#news-bar`)가 **일괄 작업 바**로 바뀐다(N개 선택 · 단계 3버튼 · 선택 삭제 · 선택 해제).
- ⚠️ **일괄 삭제는 관리자만.** 부원 세션에서는 호출이 아예 나가지 않는다(회귀로 고정).

**③ 단계 3종** — `draft`(초안) · `reviewed`(최종검수 완료) · `published`(퍼블리싱 완료)
- ⚠️ **서버 화이트리스트를 먼저 넓혔다.** `functions/api/jp-news.js` 는 `published`(boolean)만 알고 있었다. 새 필드를 그냥 보내면 **저장은 성공한 듯 보이고 값만 사라진다**([데이터 소실 패턴 ①](../../rules/handoff.md)).
- 기존 기사는 **마이그레이션 쓰기 없이** 읽을 때 `published:true → published` · `false → draft` 로 유도한다(운영 KV 파괴적 쓰기 금지). 저장하면 그때 굳는다.
- 하위호환으로 `published` boolean 도 계속 함께 저장한다 — 카드뉴스 등 이 값을 읽는 경로가 남아 있다.

**④ 작성 입력** — 사용자가 지정한 순서 `제목 → 부제목 → 내용 → 사진 → 태그`(+ 단계)
- **부제목** 신설. **태그**는 칩 입력(Enter·쉼표로 커밋, x 로 제거, `#` 자동 제거, 24자·10개·중복 차단).
- 입력이 허전하다는 지적에 대한 답 — 필드를 늘린 게 아니라 **기사가 실제로 갖는 정보**(부제목·태그·단계)를 넣고 순서를 취재 흐름에 맞췄다.

**작업 중 잡은 것 — 🔴 카드 저장이 "저장 대기 N건" 표시를 덮었다**
- `setSaveSt()` 에는 "대기분이 항상 이긴다"는 규칙이 주석까지 달려 있었는데, `doSaveCard()` 의 성공/실패 콜백만 그 규칙을 우회해 `setSt()` 를 직접 불렀다.
- 카드 저장이 늦게 끝나면 상태줄이 "오프라인/네트워크 오류…" 나 성공 메시지로 바뀌어, **안 저장된 작업이 있는데도 건수 표시가 사라졌다.** 회귀가 라운드마다 흔들린 원인이기도 하다.
- `cardSt()` 를 두어 카드 경로도 같은 규칙을 타게 했다. 회귀 1건 추가(`카드 저장 실패가 대기 건수 표시를 덮지 않음`).

**작업 중 잡은 것 — 🔴 아코디언을 모달로 옮기며 기능 두 개가 사라졌다**
- **검수 코멘트**(`renderArticleComments`)와 **카드뉴스 만들기** 버튼이 옛 상세 영역에만 있었다. 함수는 남아 있고 위임 리스너도 살아 있는데 **부르는 곳이 없어** 조용히 사라졌다 — 목록의 코멘트 개수 배지만 남아 더 헷갈렸다.
- 읽기 모달에 둘 다 복원하고, 모달 안에서도 위임 클릭·Enter 등록이 되게 `#nv-body`·`#nv-tools` 에 같은 핸들러를 걸었다. 코멘트 등록/삭제·플래그 변경 후 **열려 있는 모달도 다시 그린다**.
- 삭제하면 열려 있던 모달이 그대로 남아 **지워진 기사를 보고 있었다** → 닫는다. 검수 코멘트 삭제(작은 x)는 확인을 받는다.

**작업 중 잡은 것 — 🔴 좁은 화면에서 표가 깨졌다(보도자료도 같은 결함)**
- `<th>작성자</th>` 처럼 **머리 셀에만 클래스가 없었다.** 모바일 규칙은 `.nr-author`/`.nr-date` 를 숨기는데 td 만 숨겨져 **머리 7칸 · 몸통 5칸**이 됐고, 제목 칸이 72px 로 눌려 글자가 세로로 한 자씩 섰다.
- 머리에도 같은 클래스를 준다. 부제목·태그는 제목 아래로 내리고(`flex-basis:100%`), 좁은 화면에서는 카드뉴스 열을 빼되 **토글을 읽기 모달에 넣어** 폰에서도 조작할 수 있게 했다. 표 폭 497→364px(넘침 0).
- 읽기 모달 바닥도 도구가 많아 **닫기 버튼이 화면 밖으로 나가 있었다** → `.mfoot{flex-wrap}` + 좁은 화면에서 도구줄을 한 줄로.
- ⚠️ **이 결함은 v0.9.249(보도자료)에도 그대로 있었다** — 배포된 상태였다. 같이 고치고 양쪽 회귀에 모바일 실측을 넣었다.

**접근성 실측으로 잡은 것** — 새 UI 를 픽셀로 재보니 두 건이 걸렸다.
- 서식 도구(`.ttb`) 28px: 마우스 화면에서 24개를 40px 로 키우면 도구줄이 본문보다 커진다 → **터치 기기에서만 40px**(`@media (pointer:coarse)`).
- 검수 코멘트 삭제 x 17px: 터치에서 누르는 면만 40px 로 넓힌다. 음수 margin 은 옆 작성일 글자를 덮어 오조작이 되므로 줄 높이를 쓴다.

**검증**: 신규 `test/regress-krjam-news.js` **43/43** — 서버 단계 정규화 5종(구 `published` boolean 유도·모르는 값 차단 포함) · **안 보낸 부제목·태그를 PUT 이 지우지 않는지** · 목록 7열/체크박스 · **본문을 목록에 끼워 넣지 않음** · 작성 모달 **필드 순서 고정** · 태그 칩(커밋·중복) · 저장 payload · 읽기 모달(**검수 코멘트·카드뉴스 만들기 유지**·삭제 시 닫힘) · 일괄 단계/삭제 · **부원 일괄 삭제 차단** · 접근성 실측(목록·두 모달 글자 13px+/조작 40px+, 터치 서식도구·코멘트 x 40px+) · **모바일 레이아웃 실측**(열 어긋남·가로 넘침·제목 칸 폭·모달 버튼 이탈). 보도자료 회귀에도 같은 모바일 검사 추가 **31/31**. 본 회귀는 새 계약으로 갱신해 **136/136**. 전체 스위트 **3회 연속 실패 0건**(464건 ×3).

### 16.100 v0.9.251 — 기사 버전 관리 (V1부터 자동 증가 · 전 판 기록 · 코멘트 버전 표시)

사용자 요청: "기사를 수정하면 자동으로 버전을 V1부터 올려주고, 버전 기록을 모두 다 히스토리에 남겨줘. 버전을 업데이트하더라도 검수 코멘트는 그대로 살려주고, 검수 코멘트는 언제 버전을 기준으로 달린 건지 버전 기록해줘."

**① 버전 · 히스토리** (`functions/api/jp-news.js`)
- `rec.version` — 생성 시 **V1**, 수정할 때마다 +1. `rec.history[]` 에 **그 판의 내용 전체**(제목·부제목·본문·사진·태그 + 시각·수정자)를 통째로 쌓는다. 목록 조각이 아니라 전체라서 옛 판을 그대로 다시 읽을 수 있다.
- ⚠️ **단계(stage)·카드뉴스 플래그 변경은 버전을 올리지 않는다.** `sameContent()` 로 내용이 실제로 달라졌을 때만 올린다 — 안 그러면 단계 한 번 바꿀 때마다 V가 튀어 기록이 의미를 잃는다.
- ⚠️ **옛 기사(버전 없음)는 읽을 때만 V1 로 유도**한다(운영 KV 파괴적 쓰기 금지). 첫 수정이 들어오면 그때 **수정 전 내용이 V1 로 굳고** 새 내용이 V2 가 된다 — 기존 기사도 원본을 잃지 않는다.
- KV 값 상한이 있어 40판 / 약 1.5MB 를 넘으면 오래된 판부터 버리되, **몇 판을 버렸는지 `historyTrimmed` 에 남기고 화면에도 표시**한다. 조용히 줄이면 "전부 남는다"고 믿게 된다.

**② 검수 코멘트는 살리고, 기준 버전을 찍는다**
- 코멘트는 `rec.comments` 에 그대로 있고 버전 증가는 이를 건드리지 않는다(회귀로 고정).
- 코멘트를 달 때 **그 시점 버전 `c.v`** 를 저장한다. 옛 코멘트에 `v` 가 없으면 **읽을 때** 시각으로 역산한다(`versionAt()` — 히스토리 시각과 비교).
- 화면: 코멘트 작성자 옆에 `V1`·`V3` 배지. 어느 판을 보고 쓴 의견인지 남는다.

**③ 화면** (`jamboree-plan/app.js`)
- 읽기 모달 상단에 현재 버전 배지 `V3`.
- **버전 기록** 접이식 목록(최신 판이 위, 현재 판 표시). 한 판을 고르면 **그 자리에서 그 판을 읽는다**(제목·부제목·본문·사진·태그). "현재 판으로" 로 복귀.
- 되돌리기(현재 판 교체)는 **넣지 않았다** — 요청은 '기록'이고, 되돌리기는 현재 내용을 덮는 파괴적 조작이라 별도 확인이 필요하다.
- 모달 바닥 도구가 많아 넓은 화면에서도 닫기만 다음 줄로 떨어지던 것 → 도구는 한 줄, 삭제·수정·닫기는 그 아래 오른쪽으로 정리.

**검증**: `test/regress-krjam-news.js` **58/58** — 스냅샷이 내용을 통째로 담는지(배열 복사 포함) · 단계만 바뀐 저장은 같다고 보는지 · 다섯 필드 중 하나만 달라도 다르다고 보는지 · 시각 역산 · 생성 V1/수정 +1 · 코멘트에 버전 각인 · **PUT 이 코멘트를 건드리지 않는지** · 버린 판 수 표기 · 화면(버전 배지·코멘트 배지·기록 3판·옛 판 읽기·복귀). 전체 스위트 3회 연속.

### 16.101 v0.9.251(계속) — 장문 검수 코멘트 · 사진 담당자 · 코멘트 알림

**① 검수 코멘트를 장문·줄바꿈으로** (사용자: "줄바꿈 처리가 가능한 장문 형태로")
- `input` → `textarea`. **Enter 는 줄바꿈**, 등록은 버튼 또는 **⌘/Ctrl+Enter**. Enter 로 전송하면 둘째 줄을 쓸 수 없다.
- 입력에 따라 높이가 자란다(최대 260px, 그 뒤 스크롤). 서버 상한 1000자 → **4000자**, `\r\n` 은 `\n` 으로 정규화해 저장.
- 표시는 `white-space:pre-wrap` — 붙여 넣은 여러 줄이 한 줄로 뭉치지 않는다.

**② 사진 담당자 배정** (사용자: "홍보부원 기사에 사진 담당자도 배정해줘")
- 작성 모달의 **사진 구역 안**에 담당자 칸(홍보부 인원 명단 `datalist` + 직접 입력). ⚠️ 최상위 입력 순서(제목→부제목→내용→사진→태그)는 사용자가 정한 것이므로 건드리지 않았다.
- 읽기 모달에서도 바로 배정/변경(권한: 작성자·홍보부·관리자). 목록의 작성자 칸에 `📷 이름` 한 줄.
- ⚠️ **인원 id 가 아니라 이름을 저장**한다 — 명단에서 빠져도 "누가 찍기로 했는지"는 남아야 한다.
- ⚠️ **담당자 배정은 버전을 올리지 않는다**(단계와 같은 축의 워크플로 정보). `flags` 경로로 저장.

**③ 코멘트 알림** (사용자: "코멘트가 달리면 알람기능을 추가해서 알려주면 좋겠다")
- 헤더에 종 + 안 읽은 수 배지. 목록에서 항목을 누르면 **그 기사가 모달로 열린다**.
- 대상: **내가 쓴 기사** + **내가 코멘트를 단 기사**에 달린 **남의** 코멘트. 내 코멘트가 나에게 오면 소음이다.
- ⚠️ **서버에 알림 저장소를 새로 만들지 않았다.** 코멘트는 이미 기사 레코드에 있으므로 화면에서 뽑는다 — KV 스키마를 늘리면 저장 실패·유실 경로가 하나 더 생긴다. 읽음 시각만 기기별 `localStorage`(`jamboree-plan:noti-read`).
- 목록을 다시 불러올 때 새 코멘트가 있으면 토스트로 한 번 알린다(같은 것을 반복해 띄우지 않게 마지막 시각을 기억).
- **한계(명시)**: 읽음 표시가 **기기별**이라 다른 기기에서 다시 안 읽음으로 보인다. 브라우저를 닫은 동안에는 알리지 않는다(푸시 아님). 서버 알림함이 필요해지면 별도 작업.

**검증**: `test/regress-krjam-news.js` **77/77** — 담당자 이름 정리(공백 접기·40자)·세 저장 경로·**버전 불변** · 코멘트 4000자/줄바꿈 보존 · textarea 여부 · **Enter 는 전송하지 않음** · ⌘Enter 전송 + 높이 증가 · `pre-wrap` · 알림 대상 판별(내 기사/참여 기사, 내 코멘트 제외) · 배지·모두 읽음·재열람 유지·항목 클릭 시 모달.

### 16.102 v0.9.252 — 서버 알림함 · 우선순위 별점(반개) · 영문 가공 검토

**① 서버 알림함** (`functions/api/jp-noti.js` 신규)
- v0.9.251 알림은 화면에서 뽑고 읽음만 기기별 `localStorage` 에 뒀다 → **다른 기기에서 다시 안 읽음**으로 보였다. 읽음 상태를 서버에 둬야 맞는다.
- KV `jpnt:<username>` = `{items[], readAt}`. 코멘트가 저장되면 **작성자 + 그 기사에 코멘트를 단 사람들**(본인 제외)의 알림함에 한 건씩 쌓는다. 사람당 100건, 같은 코멘트는 두 번 안 쌓는다.
- ⚠️ **알림은 부수 효과다.** `fanoutComment` 는 `try/catch` 안에서 부르고 내부에서도 던지지 않는다 — 알림 쓰기가 실패해서 코멘트가 안 저장되면 본말전도다.
- ⚠️ 기존 키를 건드리지 않는다(새 `jpnt:` 접두사만). 클라이언트는 서버 알림함을 우선하되 **서버가 안 되면 v0.9.251 방식(화면 유도)으로 되돌아간다** — 알림 하나로 보드가 멈추면 안 된다.
- 갱신: 로그인 직후 · 종을 열 때 · 탭 복귀 시 · 5분마다.

**② 우선순위 별점 (별 5개 · 반개 단위)** — 사용자 요청
- 목록에 `우선순위` 열. **별 하나가 버튼 하나**이고, 누른 x 좌표가 그 별의 **왼쪽 절반이면 .5**, 오른쪽이면 온개다. 별을 10개로 쪼개 늘어놓으면 손가락으로 못 누른다.
- **같은 값을 다시 누르면 0(미지정)** 으로 지운다. 색만으로 말하지 않도록 숫자(3.5)를 함께 보여 준다.
- 서버 `cleanPriority` 가 0~5 · 0.5 스냅 · 범위 밖·문자열은 0. **버전을 올리지 않는다**(단계·담당자와 같은 축).
- 좁은 화면에서는 목록에서 열을 빼고 **기사를 열어 매긴다**(제목 칸을 지켜야 목록을 읽을 수 있다).

**③ 영문 가공 검토** — 사용자 요청("영문으로도 가공이 필요한 기사인지도 검토")
- 상태 4종: **미검토 · 영문 필요 · 영문 완료 · 불필요**. 목록의 칩을 누르면 순환하고, 읽기 모달에서는 4개 중 직접 고른다.
- 통계바에 **영문 필요 N** 을 함께 보여 준다(검토가 밀린 건수를 한눈에).
- 서버 `cleanEn` 화이트리스트 — 모르는 값은 '미검토'. **버전을 올리지 않는다**(카드뉴스 가공과 같은 축).

**검증**: `test/regress-krjam-news.js` **94/94** — 별점 스냅 10종 · 왼쪽 절반=.5 / 오른쪽=온개 · 같은 값 재클릭 시 0 · 영문 4종 화이트리스트와 칩 순환 · 통계바 · **우선순위·영문이 버전을 올리지 않는지** · 알림 수신자 판별(본인 제외·중복 제거) · 알림 항목 축약 · **알림 실패가 코멘트 저장을 막지 않는지** · 서버 알림함 우선 · 모두 읽음이 서버로 · **서버가 죽으면 화면 유도로 되돌아가는지** · 영문 칩 40px.

### 16.103 v0.9.253 — 취재 담당자 · 협조부서 정리

**① 취재 담당자** (사용자: "기사 관련 탭에서는 담당자를 배정할 수 있게(취재 담당자)")
- 사진 담당자 옆에 **취재 담당자**를 나란히 뒀다. 작성 모달에서 입력하고, 읽기 모달에서 바로 배정·변경한다(권한: 작성자·홍보부·관리자).
- 목록의 작성자 칸에 `취재 ○○○` · `사진 ○○○` 두 줄로 보인다.
- ⚠️ 사진 담당자와 같은 축이라 **버전을 올리지 않는다**(내용 수정이 아니라 담당 지정).

**② 협조부서 정리** (사용자: "각 관련 협조부서들을 정리할 수 있는 기능")
- 기사마다 **협조부서 목록**(최대 10개, 칩 입력). 후보는 **협조 연락처에 적힌 소속** + 자주 쓰는 본부 이름을 `datalist` 로 띄우고, 직접 입력도 된다.
- ⚠️ **부서 id 가 아니라 이름을 저장**한다 — 연락처 목록이 바뀌어도 "어느 부서와 함께 했는지"는 남아야 한다.
- 읽기 모달에 칩으로 보여 준다. 서버 화이트리스트 `cleanDepts`(공백 접기 · 중복 제거 · 40자 · 10개).

**검증**: `test/regress-krjam-news.js` **102/102** — 협조부서 정리 규칙 · 세 저장 경로 · **버전을 올리지 않는지** · 목록/모달 표시 · 모달 배정 · 칩 입력(중복 차단) · 후보 datalist · 저장 payload.
