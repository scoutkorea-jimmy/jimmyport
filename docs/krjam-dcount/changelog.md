# /krjam-dcount — 디데이 프로젝트 (변경 이력)
> React 격리. 모듈: `krjam-dcount/`. 엔트리: `krjam-dcount.html`.

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

### 18.23 v0.9.147 — /krjam-dcount 국문/영문 i18n + 언어 토글
- 사용자: "디데이 프로젝트 영문 버전 추가 + 홈페이지에서 잘 보이게 국문/영문 전환 버튼." 참가국(외국 대표단) 대상이라 영문화 적합.
- **i18n 방식**(app.jsx): 모듈 레벨 `LANG`(localStorage `dcount:lang` + `?lang=` + 브라우저 언어 자동감지, 기본 ko) + `L(ko,en)` 헬퍼. **데이터 키(상태값 `승인`·`신청가능` 등 API 값)는 한국어 유지**, 표시 라벨만 `SS_LABEL`/`ST_LABEL`로 영문 매핑. 토글 시 `LANG=v` 동기 갱신 후 setState → 트리 전체 재렌더(MASTER 패턴과 동일).
- **언어 토글**: syncbar 우측에 `한국어 / EN` 세그먼트 pill(활성=accent green), 항상 노출. `setLang`이 localStorage·`<html lang>`·`window.__dcLang` 갱신.
- **번역 범위**: 공개 플로우 전부 — 헤더(행사명·제목·부제)·4단계 안내·안내문구 2종·탭·달력(요일/월/범례/슬롯상태)·신청 모달(필드·5개 동의문·버튼·에러)·결과 모달·조회/수정/철회·사진 업로드. **관리자(MasterStyle·반려/승인 다이얼로그·대시보드)는 내부용이라 한국어 유지**(의도). 장면 라벨(SCENE_LABELS)은 공유 모듈이라 한국어 유지(모티프 이름, 경미).
- **카드 자체 텍스트**(dcard.jsx): `window.__dcLang==='en'`이면 키커 `COUNTDOWN · N days to go`(국문 `N일 전`)·당일 `At last!`·푸터 기본 `KOREA NATIONAL JAMBOREE`/`2026.8.5–8.9 · Gangwon, Korea`. 프리뷰·A4 출력 모두 선택 언어 반영.
- 검증: 로컬 http + 헤드리스 Chrome — KO/EN 스크린샷(헤더·탭·범례·안내 정상) + **CDP 토글 클릭 라이브 전환**(디데이 프로젝트→D-day Project, `<html lang>`=en) + **콘솔 에러 0**. 잔여 한국어는 admin/데이터정의/주석뿐 확인.

### 18.24 v0.9.148 — 영문 스카우트 용어 검토 반영
- 사용자: "번역이 스카우트 용어로서 적절한지 재검토." 저장소 기존 영문 표기와 대조 후 3건 교정.
- **소속대**: `Unit / group` → **`Scout unit`**(사이트 전역 단위대 표기 `Scout unit` 9곳과 통일, 신청·수정 폼 2곳).
- **카드 푸터 장소**(dcard.jsx): `Gangwon, Korea` → **`Goseong, Gangwon`**(공식 엠블럼 영문 표기 고성·강원에 맞춤).
- **홍보부**: `PR Team` → **`Media Team`**(AskUserQuestion으로 사용자 확정 — 초기 미디어부 취지·SNS/콘텐츠 제작 강조). 헤더 에이브로우·4단계·안내문·결과/대기 메시지 6곳 일괄(트레일링 스페이스 유지 확인).
- 적절 판정·유지: Korea Scout Association(공식 NSO)·16th Korea National Jamboree·Scout family·Jamboree·상태 라벨(Submitted/Approved/…). 검증: EN 재렌더(에이브로우 Media Team·"once the Media team confirms it, " 띄어쓰기 정상)·콘솔 에러 0.

### 18.25 v0.9.149 — D-count 달력 가시성: 신청가능 셀 초록 채움
- 사용자: 달력이 가시성 떨어짐(흰 카드+작은 신청가능 pill이 다 비슷) → "신청가능한 날은 초록색으로 셀을 채우자."
- **CSS만 변경**(krjam-dcount.html): `.dc-slot2.open` = `--st-ready`(#2F8F6B) 솔리드 배경+테두리, D번호·날짜 흰색, 내부 pill 흰색 반투명(`rgba(255,255,255,.24)!important`로 인라인 초록 배경 오버라이드). hover=진한 초록+살짝 떠오름. 점유(확정/검토중)·닫힘은 기존 `.dim`(opacity .5) 유지 → 가능=초록 채움 vs 불가=흐림 대비.
- 검증: CDP로 `/api/krjam-dcount` 목킹(36슬롯, 확정/검토중/닫힘 섞음) 후 렌더 — 신청가능 초록 채움·확정/검토중/닫힘 흐림 구분 명확, 콘솔 정상.
### 18.27 v0.9.162 — /krjam-dcount 관리자 로그인 TOTP → 공유 비밀번호(scout1922)
- 사용자: "관리자에 scout1922로 로그인할수있게 바꿔줘"(AskUserQuestion으로 대상 = **/krjam-dcount 관리자** 확정). 카드뉴스(§18.20 v0.9.138)와 동일한 공유 비밀번호 게이트 패턴 채택.
- **백엔드**(`functions/api/krjam-dcount.js`): `requireAdmin(request,env)` 헬퍼 신설 — 관리자 세션(TOTP `isAdmin`) **또는** 헤더 `X-CC-Pass === env.CC_PASS`(기본 `scout1922`) 허용. 관리자 GET(`?admin=1`)·PATCH 인증을 `isAdmin`→`requireAdmin`으로 교체. (TOTP 세션도 계속 유효 — 병행.)
- **프런트**(`krjam-dcount/app.jsx`): 관리자 게이트 6자리 TOTP 코드 → **비밀번호 입력**(`type=password`). `adminToken()`/`setAdmin()`/`bearer()`가 세션토큰(`{token}`, `Authorization: Bearer`) → 공유 비번(`{pass,exp}`, `X-CC-Pass`)으로 전환(localStorage `krjam-dcount:admin`, 12h). `login()`은 `/api/login` POST 대신 `GET ?admin=1` + `X-CC-Pass`로 검증(401 아니면 통과). 10분 유휴 자동 로그아웃·유휴 카운트다운은 유지. 세션 만료 문구 '코드'→'비밀번호'.
- ⚠️ env `CC_PASS` 미설정 시 기본 `scout1922`(카드뉴스와 공유). 공개 저장소라 노출되나 내부 운영 게이트 용도. 기존 저장된 TOTP 세션(`{token}`)은 shape 불일치로 자동 무효 → 재로그인.
- 검증: `node --check`(API) + esbuild(app.jsx) 컴파일 OK. 잔여 `/api/login`·`setCode`·`.token` 참조 0.

### 18.xx v0.9.293 — 🔴 관리자 응답에서 신청 비밀번호 자료(salt·hash) 제거 + 목록 병렬 읽기
2026-08-04 시스템 안정성 종합점검에서 발견.

**① 🔴 관리자 목록이 비밀번호 해시를 그대로 내보내고 있었다**
- `GET /api/krjam-dcount?admin=1` 이 KV 신청 레코드를 **통째로** 실어 보내, 응답에 PBKDF2 `salt`·`hash` 가 전부 들어갔다(라이브 확인: 신청 29건 전원).
- 왜 위험한가: 신청 비밀번호는 **전화 끝 4자리** — 경우의 수가 **1만뿐**이다. `salt`+`hash` 를 손에 넣으면 오프라인에서 전부 맞춰 볼 수 있고, 그러면 `lookup`/`edit`/`withdraw` 로 **남의 신청을 조회·수정·철회**할 수 있다. 서버의 무차별 대입 제한(IP 40회·신청번호 7회)은 온라인 시도만 막지 오프라인 대입은 못 막는다.
- 게다가 이 응답은 **공유 비밀번호 한 개**로 열린다(§18.27, `X-CC-Pass`).
- 결정적으로 **관리자 화면은 이 둘을 쓰지도 않는다** — `app.jsx` 는 `contact`·`ip`·`approvedBy` 만 본다. **안 쓰는 비밀을 내보내고 있었던 것.**
- 조치: `adminApp(rec)` 로 `salt`·`hash` 를 덜어내고 보낸다. 화면이 쓰는 필드는 그대로 유지(회귀로 확인).
- 회귀 10건 추가(순수함수 스위트 — D-Count 전용 스위트가 없어 여기 둔다): 무인증 401 · 틀린 비번 401 · 맞는 비번 200 · `salt`/`hash` 부재 · **화면이 쓰는 필드 존치** · 공개 응답에 `applications` 없음 · 공개 승인 카드에 전화·salt·hash 없음. 옛 코드로 되돌리면 2건 FAIL 하는 것까지 확인.

**② 목록을 KV 에서 순차로 읽던 것 병렬화**
- 관리자 목록(신청 N건)과 공개 승인 카드가 `for (…) { await SCOUT_KV.get() }` 였다 — v0.9.287 이 홍보부 목록 4종에서 고친 바로 그 패턴이 여기 남아 있었다.
- `Promise.all` + `map` 으로 바꿨다. ⚠️ `map` 이 자리를 고정하므로 병렬이어도 `index` 순서는 안 뒤바뀐다.
- `dclog`·`visits` 두 번의 왕복도 한 묶음으로.

**⏭️ 판단 대기(사용자 확정 2026-08-04) — 공유 비밀번호 `scout1922` 는 현행 유지**
- 이 비밀번호는 **소스에 적힌 기본값**(`env.CC_PASS || "scout1922"`)이고, 라이브에서 `CC_PASS` 가 설정돼 있지 않아 **그대로 통한다**(확인함). 이걸로 신청자 이름·전화·소속·IP·동의기록이 열린다.
- 사용자 판단: **행사 중 운영 혼선을 피해 지금은 그대로 둔다.** 이번엔 salt·hash 유출만 막았다.
- 나중에 닫으려면 셋 중 하나: (ㄱ) Cloudflare 에 `CC_PASS` 설정(코드 무변경, 쓰는 사람에게 새 비번 통지 필요) (ㄴ) 소스 기본값 제거해 fail-closed (ㄷ) D-Count 관리자만 TOTP 전용으로.
