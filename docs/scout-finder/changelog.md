# Scout Tour Assistant — 변경 이력 (§9 명령 로그 + §17 관리자)
> 제품 사양은 [brief.md](brief.md).

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
- **글로벌 표준 전환**: 지방연맹/지구연합회 제거 → **국가·NSO 선택(WOSM 176개 공식 목록)**. 영문 단위대명·영문 주소. 좌표는 **OSM(Nominatim) 검색**. 핀 색 = **WOSM 지역(Region)**. 모든 것 영문 기준.
- 데이터는 **Cloudflare 서버(KV)에 저장**. 공개/관리자 모두 `/api/units`에서 로드.
- 관리자 편집은 **자동으로 서버 반영**(별도 저장 버튼 X, 비밀번호 1회 입력 후 debounce auto-save).
- 좌표는 "검색"이 아니라 **지도를 주소로 검색**(map flyTo) 후 클릭/드래그로 핀 지정. **주소·모임요일 필드 삭제**, **ID 자동 배정**. 연락처 → **Homepage (Instagram)** URL.
- **전부 영어**: 공개·관리자 모든 메뉴 한국어 제거. type/sections 데이터도 영문(Community/School unit, Beaver/Cub/Scout/Venture/Rover).
- **`/jamboree` 신규 — 한국잼버리 카드뉴스 제작기**(별개 미니앱): 25MB React 디자인 시안 번들을 포팅, 폰트 CDN 슬림화(25MB→~1.2MB). 6 패밀리 선택→프리뷰→PNG 다운로드→KV 저장. 홈에 링크 없음. React는 이 페이지에만 격리(본 앱 vanilla 유지). 상세 §15.
- 저장소: **KV namespace `SCOUT_KV`** (id `5b8071435ace47f9a8eccb8ade1b946e`), `wrangler.toml`로 바인딩.
- 관리자 인증: **Pages secret `ADMIN_TOKEN`** (값은 repo에 두지 않음). 요청 헤더 `X-Admin-Token`로 검증.
- IP: `CF-Connecting-IP` 헤더로 취득. KV 키: `units` / `pending` / `comments` / `log`.
- 배포: `functions/`는 `wrangler pages deploy . --project-name jimmyport`로 자동 포함.
  ⚠️ 커밋 메시지는 **ASCII 권장**(한글 메시지로 deploy 시 "Invalid commit message" 발생) — `--commit-message`에 영문 사용.

## 17. scout-finder 관리자 — Google 인증 + /admin 이전 + 샘플 정리

### 17.1 v0.9.58 — 샘플 단위대 전체 삭제(data.js 폴백 비움)
- 사용자: "단위대 찾기 데이터 샘플 모두 삭제." `data.js`의 `window.SCOUT_UNITS`(샘플 25개)를 `[]`로 비움. `SCOUT_NSOS`(176국)·`SCOUT_REGION_COLORS`는 유지. ⚠️ 공개 사이트는 `/api/units`(KV)를 우선 읽으므로 **라이브 KV의 샘플 25개는 별도 삭제 필요**(아래 17.2 Clear all units로 처리).

### 17.2 v0.9.59 — 관리자 인증을 Google 로그인 전용으로 + /admin 이전 + 기능 문서
- 사용자 4건(AskUserQuestion 확정): (1) 관리자 경로 manage→**admin**, (2) 개인정보 보호 위해 **Google Auth**, (3) **비밀번호 폐기, Google 인증만**, (4) UX 디자인은 직접 개발 예정 → 대신 **전 기능 문서화** 요청.
- **인증 교체**(`functions/api/_lib.js`): `isAdmin`(X-Admin-Token 비번) → **async Google ID 토큰 검증**. `verifyGoogleIdToken`(Google JWKS 서명검증 + `aud==GOOGLE_CLIENT_ID`·iss·exp·email_verified) + `adminUser`(이메일이 `ADMIN_EMAILS` 화이트리스트에 포함). JWKS 1h 캐시. 호출부 5개(`units` PUT·`submissions` GET/PATCH·`comments` GET/DELETE·`log` GET) 전부 `await isAdmin`로 변경.
- **신규 엔드포인트**: `auth-config.js`(공개 GET → `{googleClientId}`) · `me.js`(GET → 검증된 `{ok,email}` 또는 401).
- **경로 이전**: `manage.html`→`admin.html`, `manage.js`→`admin.js`(git mv). `/manage` 제거(→`/admin`). index.html 푸터 링크 `/admin`로.
- **프런트 게이트**(admin.html/admin.js): GIS 스크립트 + `#auth-gate` 오버레이(로그인 전 헤더·에디터 숨김). `Auth` 모듈 = auth-config로 clientId 로드→GIS 버튼→credential→`/api/me` 검증→`body.authed`+`init()` 1회. 저장은 `Authorization: Bearer <id_token>`(구 X-Admin-Token·prompt 비번 제거). 401/만료 시 재로그인 안내(로컬 드래프트 보존). "Signed in as …"+Sign out.
- **Clear all units 버튼**: 전체 비우기(확인)→`units=[]`→자동저장 PUT → **KV 샘플 정리용**(라이브 KV 25개는 사용자가 로그인 후 1클릭으로 제거).
- **환경변수**: `GOOGLE_CLIENT_ID`(공개, aud+프런트)·`ADMIN_EMAILS`(콤마, 미설정=관리 불가 안전기본). `ADMIN_TOKEN` 폐기. 사용자가 Pages 대시보드 env에 설정 + Google Cloud OAuth 웹 클라이언트(JS 원본 jimmypark.net) 발급 필요.
- **전 기능 문서**: `FEATURES.md` 신규 — 3앱(scout-finder 공개/admin, /jamboree, /jamboree-plan) + API + KV + env + 운영 한 문서 정리.
- 검증: `node --check` 8파일 OK + 라이브 배포 후 `/api/auth-config`·인증 없는 PUT 401·공개 GET 정상 확인.

### 17.3 v0.9.60 — 공개 홈 인라인 편집기 제거(비번 프롬프트 노출 차단)
- 발견: 공개 `index.html`/`app.js`에 카드별 `✎ Edit` 버튼(`data-edit`)→`prompt("Admin password:")`→`X-Admin-Token` 저장의 **숨은 인라인 관리자 편집기**가 모든 방문자에게 노출돼 있었음. Google 전용 인증 전환으로 이 비번 경로는 깨짐(401)이고 "비번 금지" 방침과 충돌.
- 조치: 카드 HTML에서 `card-tools(✎ Edit)` + `edit-panel` 제거 → **공개 페이지 보기 전용**. 진입점(카드 Edit 버튼)이 사라져 편집/저장/삭제/`prompt` 함수 전부 **도달 불가**(`#edit-toggle/#add-btn-home/#save-btn`는 원래 index.html에 없음). 편집은 이제 `/admin`(Google)에서만.
- 잔여 편집기 JS는 호출처 없는 죽은 코드(무해) — 추후 정리 권장. 검증: `node --check` OK + 라이브 공개 페이지에 Edit 버튼 0.

### 17.4 v0.9.61 — 공개 app.js 死코드(인라인 편집기) 완전 제거
- 사용자: "필요없는 것들은 모두 삭제." 17.3에서 진입점만 막았던 공개 편집기 JS 전부 제거(약 11.5KB): `getToken`(prompt)·`saveServer`(X-Admin-Token)·`scheduleSave`·`reflectEditUI`·`toggleEditMode`·`openEdit`·`onEdit*`·`editGeocode`·`editFormHtml`·`countryOptions`·`addUnit`·`unitIndex`·`editPanelFor`·`editCoordText` + 전용 변수(`TOKEN_KEY`·`editMode`·`saveTimer`·`SECS`·`NSOS`·`round5`·`applyCountry`) + init 배선(edit-toggle/save-btn/add-btn-home, onEdit 리스너, $list 클릭의 data-edit 분기). `$list` 클릭은 카드→`setActive`만 유지.
- CSS는 보류: `section-toggle`·`readonly-line`·`coord-row`·`sections-box`는 `/admin`(admin.js)도 사용 → 공유. 죽은 편집기 CSS(`edit-form`·`ef-l`·`edit-panel`·`card-tools` 등) 정리는 디자인 자료 수령 후.
- 검증: `node --check` OK + 제거 식별자 11종 잔여 참조 0 + `card-tools/edit-panel/data-edit` 문자열 0.

### 17.5 v0.9.62 — scout-finder 전면 리디자인(공개+관리자) 적용
- 사용자 디자인 시안(`scout-finder/*.dc.html`, Bricolage+Hanken, 보라 #6336B5) 적용. 시안=디자인툴 React 컴프 → **vanilla 프로덕션으로 포팅**, 기존 백엔드(/api/units·/api/comments·Google 인증)에 연결. 원본 시안은 deploy 루트 밖(`../scout-finder-design/`)으로 이동.
- **새 데이터 모델**: `kind`(unit/office/heritage) · region **코드**(APR/EUR/ARB/AFR/IAR) · `tags[]`(office/heritage 카테고리) · `status`(published/draft) · `contact`(none/instagram/homepage)+`url` · `address` · `desc`. 기존 데이터 비어 깔끔 채택하되 `normUnit`이 옛 필드(type/place/note/homepage/region 풀네임) 흡수. 공개는 status!=='draft'만 표시.
- **REGION 팔레트**: APR #6A3FB5 · EUR #2F6FB0 · ARB #2E8B6B · AFR #C26A2E · IAR #C23E6E (JS 코드 상수).
- **공개**(`index.html`+`app.js`): 풀스크린 CARTO Voyager 지도 + 좌측 글라스 결과패널(접기) + 우측 지역 범례 + 하단 검색바(**Near me 지오로케이션** + Nearest unit/office/heritage 퀵) + 우측 댓글 드로어. 거리정렬(haversine)·지도클릭 앵커·검색 centroid 앵커. 댓글=서버 `/api/comments`(GDPR·IP 마스킹·24h). 마커=랭크 핀(office 사각/heritage ★)+상시 라벨+팝업.
  - ⚠️ **GPS 미사용 규칙(§1) 변경**: 시안의 'Near me'(navigator.geolocation) 채택. 검색·지도클릭도 병행.
- **관리자**(`admin.html`+`admin.js`): 시안 적용(툴바·좌측 레일·중앙 폼 Basics/Affiliation/Profile/Contact/Location·우측 드래그 지도·Import 모달·토스트). **Google 인증 게이트 유지**, 저장=`/api/units` PUT(Bearer) 700ms 자동저장. 국가 자동완성=SCOUT_NSOS(176)→region 코드 변환. Import `{"units":[]}`로 전체 비우기(KV 샘플 정리 대안).
- `styles.css` 전면 교체(디자인 글로벌; 컴포넌트 시각=마크업 인라인 고충실 포팅). 폰트=Google Fonts(Bricolage+Hanken), leaflet=unpkg.
- 검증: `node --check`(app·admin) OK + 로컬 헤드리스 스크린샷(공개=지도+패널+칩+범례+검색바 정상, 데이터 0='No places found'; 관리자=Google 게이트 렌더). 게이트 안쪽 UI는 라이브 Google 인증 후 검증.

### 17.6 v0.9.63 — GPS 규칙 채택 + 위치 제보(공개) → 관리자 승인
- **GPS 규칙 변경**: §1 'GPS 미사용' 폐지 → **사용 가능**(Near me) 명문화.
- **공개 'Report a location'**: 좌측 패널 하단 Download JSON 제거 → 그 자리에 **위치 제보 버튼**. 모달 폼(`#report-modal`): **제보자 이름·소속(필수)** + 장소명·종류(unit/office/heritage)·국가(SCOUT_NSOS 자동완성 NSO/region/lang)·설명·섹션(unit)·연락(none/instagram/homepage+URL)·주소검색(Nominatim→lat/lng). 제출 → `POST /api/submissions {unit, reporter}`. 성공 안내.
- **submissions API**: POST에 `reporter{name,affiliation}` 저장(둘 다 필수, 없으면 `reporter_required` 400). pending item에 `reporter` 포함, approve 시 unit만 units에 추가(reporter 비포함).
- **관리자 승인 UI**: 툴바 **Reports 버튼+미처리 카운트 배지**. 모달(`#pending-modal`)에 제보 목록(장소 요약 + 제보자 이름·소속·IP·시각) + **Approve/Reject**. approve→`PATCH approve`→units 반영(선택 유지 후 재로드), reject→confirm 후 `PATCH reject`. 부팅·열람 시 `GET /api/submissions`(Bearer)로 갱신.
- 검증: `node --check`(app·admin·submissions) OK + 헤드리스 스크린샷(제보 모달) + 라이브 스모크.

### 17.7 v0.9.64 — 관리자 인증을 Google 로그인 → TOTP(인증 앱 6자리)로 교체
- 사용자: "구글 로그인 필요없어 / Google Authenticator OTP로 로그인" (AskUserQuestion 확정: OTP 코드만·비밀키 내가 생성). 17.2에서 도입한 Google Auth 폐기.
- **백엔드**(`functions/api/_lib.js`): `verifyGoogleIdToken`/JWKS/`ADMIN_EMAILS` 제거 → **TOTP**(RFC 6238, HMAC-SHA1, base32 `env.TOTP_SECRET`, ±1 타임스텝) + **세션 토큰**(`issueSession`: `<expSec>.<base64url(HMAC-SHA256)>`, 키=`"sess:"+TOTP_SECRET`, 12h). `adminUser`=세션 서명·만료 검증→`{admin:true}`. **시크릿 교체 시 전 세션 무효화**.
- **신규** `functions/api/login.js`: `POST {code}`→TOTP 검증→세션 발급(`{ok,token,exp}`/401/429/503). IP당 10회 실패/10분 KV 레이트리밋.
- `auth-config.js`→`{mode:"totp",configured}`, `me.js`→`{ok:true}`(이메일 제거).
- **프런트**(`admin.html`/`admin.js`): GIS 스크립트·`#g-signin` 제거 → 6자리 OTP 입력 게이트(`#otp-form`/`#otp-input`). `Auth`=`POST /api/login`→세션토큰 메모리+localStorage(`scoutfinder:admin-session`, 12h, 재방문 시 `/api/me` 재확인). 관리 호출 `Authorization: Bearer <session_token>`. 401→"enter a new code".
- **환경변수**: `TOTP_SECRET`(base32, 시크릿) 1개로 단순화. `GOOGLE_CLIENT_ID`·`ADMIN_EMAILS`·`ADMIN_TOKEN` 폐기. ⚠️ 사용자가 Cloudflare Pages env에 `TOTP_SECRET` 설정 + 인증 앱에 같은 키 등록 필요(otpauth URL/QR 또는 수동 base32).
- 검증: RFC 6238 테스트 벡터(287082·081804) 일치 확인 + `_lib.js` ESM 임포트 라운드트립 13/13 PASS(TOTP accept/reject·세션 발급·위조/만료/시크릿교체 거부) + `node --check` admin.js·4개 함수 모듈 임포트 OK.

### 17.8 v0.9.65 — 제품명 Scout Finder → Scout Tour Assistant (표시 텍스트)
- 사용자: "프로젝트명도 Scout Finder 말고 Scout Tour Assistant가 좋아보여." **사용자에게 보이는 브랜드명만** 교체(5곳): `index.html` title·홈 헤더, `admin.html` title·인증 카드 h1·툴바 로고. (otpauth 발급 issuer 라벨도 'Scout Tour Assistant Admin'으로 갱신.)
- **내부 식별자는 유지**(변경 시 세션/저장/데이터 깨짐): localStorage `scoutfinder:*`, KV 네임스페이스 `SCOUT_KV`, 폴더/파일 `scout-finder`, Cloudflare 프로젝트 `jimmyport`, 코드 주석. 필요 시 추후 별도 작업으로 코드네임 리네임.
- 검증: deployable(`*.html/js/css`)에서 표시 'Scout Finder' 잔여 0 grep 확인.

### 17.9 v0.9.66 — 데이터 초기화 + 줌 클러스터링 + 세로꽉참 minZoom + 팝업 풀주소 복사 + World Bureau + 관리자 패널 리사이즈 + 버전표기
- 사용자 다건 일괄: (1) 등록 데이터 전체 삭제, (2) 줌아웃 시 지역/국가별 묶음, (3) 지도 축소 시 상하 여백 0, (4) 팝업에 풀 주소 표시 + 클릭 복사, (5) Region에 **World Bureau(WSB)** 카테고리 추가, (6) 관리자 지도↔폼 좌우 드래그 리사이즈, (7) 공개 푸터 Admin 아래 현재 버전 표기.
- **데이터 삭제**: 인증 세션으로 `PUT /api/units {units:[]}`(권한 있는 삭제, 스모크 아님) → count 0. data.js 폴백도 비어 공개 사이트 'No places found'.
- **줌 클러스터링**(`app.js` renderMarkers + `zoomend`): `z<=3` 지역(WSB 포함 region)·`z<=5` 국가(country)·그 이상 개별 핀. 그룹 centroid에 카운트 버블(`clusterHtml`, 색=지역색), 툴팁 "이름 · N". 버블 클릭 시 `flyToBounds`(region→maxZoom5·country→9)로 드릴다운. 단일 그룹은 flyTo 7. 검증(헤드리스 CDP, 25 units APR): world=1버블(Asia-Pacific·25)·zoom5=5국가버블·zoom8=25핀.
- **세로 꽉참 minZoom**(`fitMinZoom`): `ceil(log2(viewportH/256))`(최소2)로 minZoom 동적 설정 → 완전 축소해도 세로 여백 0. `maxBounds`=월드 + `maxBoundsViscosity:1`. resize 시 재계산. 검증: 1213px 높이 → minZoom 3, 회색 띠 없음.
- **팝업 풀주소 복사**(`popupHtml` + 위임 클릭): `u.address`를 핀아이콘+주소+'Copy' 힌트 행으로 표시, 클릭 시 `copyText`(clipboard API+execCommand 폴백) → 힌트 'Copied ✓'. `data-copy` document 위임 리스너.
- **World Bureau**: `REGION.WSB={full:'World Bureau',color:#4B4E8A}` + REGION_FULL 역매핑(app.js·admin.js 공통). 공개 범례·지역칩에 WSB 추가(검증: 범례 6행·칩 7개). 관리자 폼에 **Region 셀렉트(`f-region`, 6종)** 신설 — 국가 자동채움과 별개로 수동 지정(WSB 등), NSO·언어만 자동 표기로 분리.
- **관리자 패널 리사이즈**(`admin.html` `#col-splitter` + `admin.js initSplitter`): 폼↔지도 사이 드래그 핸들(pointer 이벤트), 폭 `localStorage scoutfinder:admin-mapw` 저장, 드래그 중 `map.invalidateSize()`, rail+최소폼 고려 clamp.
- **버전 표기**: 공개 푸터 Admin 아래 `#app-version`(app.js `loadVersion`→`/VERSION`). **캐시 버스팅**: index/admin html의 app.js·admin.js·styles.css·data.js·version-watch.js 참조에 `?v=0.9.66`(배포 즉시 새 JS 적용, 반복되던 캐시 문제 해소).
- 검증: `node --check`(app·admin) OK + 헤드리스 Chrome CDP(클러스터 3단계·minZoom·팝업복사행·범례WSB·버전·콘솔 정상).

### 17.10 v0.9.67 — HTML no-cache(_headers) + 관리자 30분 유휴 타임아웃 + minZoom 재확인
- **캐시 근본 해결**: 사용자가 배포 후에도 옛 HTML→옛 app.js를 봐서(범례 WSB 없음·옛 minZoom 여백) 수정이 반영 안 됨. 원인=HTML 브라우저 캐시(?v= 버스팅은 HTML이 신선해야 작동). → `_headers` 신설(`/* Cache-Control: no-cache`) → 모든 정적 자산 매 로드 재검증(ETag 304), 배포 즉시 반영. (`?v=0.9.67`은 방어용 유지.) ⚠️ `/admin.html`은 `/admin`으로 308 — curl 검증은 클린 URL로.
- **관리자 30분 유휴 타임아웃**(`admin.js` Auth): `IDLE_MS=30분`. `startIdle`이 pointerdown/keydown/input/change/wheel/touchstart(capture)로 `resetIdle` → 활동마다 카운트다운 초기화. 만료 시 세션 클리어+게이트("Signed out after 30 minutes of inactivity."). onAuthed에서 시작, showGate/signOut에서 stopIdle. (서버 세션 12h는 유지, 클라 유휴 로그아웃만 추가.)
- **minZoom 재확인**(사용자 재요청): 헤드리스 2560×1400 → minZoom 3, setZoom(0) 클램프=3, worldHeightPx 2048≥뷰포트 1313(fillsHeight true·bounds ±75) = 상하 여백 0·더 축소 불가 확인. 코드는 v0.9.66부터 정상이었고 캐시로 미반영이었음.
- **데이터 삭제 반영 확인**: `PUT units:[]` 후 KV 전파되어 GET count 0(공개 'No places found').
- 검증: `node --check` admin.js OK + 헤드리스(minZoom/클램프) + 라이브 `_headers` no-cache·clean URL.

### 17.11 v0.9.68 — 관리자 수동 Save 버튼 + 좌표 직접입력 + 다중 Contact(전화/인스타/이메일/홈페이지) + Profile 기본 접힘
- 사용자 4건: (1) 각 장소 수동 Save 버튼, (2) 위/경도 직접 입력, (3) Contact를 전화·인스타·이메일(+홈페이지) 각각 추가/공백 허용, (4) 폼에서 Profile 기본 접기.
- **수동 Save**: `save(manual)`로 확장(수동 시 토스트), 폼 헤더에 Save 버튼(`data-act="save"`→`saveNow`). 자동저장(700ms 디바운스)은 유지.
- **좌표 직접입력**: 기존 `f-lat/f-lng` input이 매 키 입력마다 `setCoords`로 **값을 재포맷**(`37.`→`37.00000`)해 타이핑 불가였음. → `onLatLngInput`(입력 중엔 모델·마커만 갱신, 인풋 값 미수정) + `commitLatLng`(blur/Enter 시 clamp·반올림·재포맷). `inputmode="decimal"`. 검증: '37.12' 타이핑 후 값 유지.
- **다중 Contact**: 단일 `contact`(none/instagram/homepage)+`url` 모델 폐기 → `instagram·homepage·phone·email` 4개 독립 옵션 필드(모두 공백 가능). `normUnit`(app.js·admin.js 공통)이 구모델(contact/url) 마이그레이션. 공개 팝업/목록은 있는 항목만 링크(Instagram·Homepage·전화 tel:·이메일 mailto:), 없으면 'Contact the national scout org'. 공개 **Report 폼**도 4필드로 교체. 관리자 승인 모달도 4필드 표시.
- **Profile 기본 접힘**: 폼 카드 5종(Basics/Affiliation/Profile/Contact/Location)을 접이식(`card()` 헬퍼 + `state.collapsed`, 헤더 클릭 토글·쉐브론). `collapsed.profile=true` 기본. DOM 토글(재렌더 없이 포커스 보존).
- 검증: 헤드리스 CDP — 공개(목록·팝업 4링크·Report 4필드) + 관리자(Fetch로 /api/me·/api/units 목업해 게이트 통과: Save 버튼·4 contact+lat/lng 필드·**Profile 기본 display:none**·Basics 표시·'37.12' 미재포맷·Profile 토글 펼침). `node --check` app·admin OK.

### 17.12 v0.9.69 — 좌표 'Show on map' 버튼 + 소수점 입력 오류 재확인
- 사용자: (1) 위/경도 입력 옆 **확인 버튼**으로 위치 표시, (2) 소수점이 안 찍히는 오류 확인.
- **소수점 오류**: 재현 결과 **v0.9.68에서 이미 해결됨**(구버전 `setCoords(v||0)`이 매 키 입력마다 `toFixed(5)`로 재포맷 → '.' 직후 '37.00000'이 되어 소수 입력 불가였음). 헤드리스 실제 키 입력 `3 7 . 5 6 → 37.56` 정상. 라이브 admin.js에 `onLatLngInput` 존재·구 핸들러 0 확인 → 사용자는 캐시된 옛 버전이었고 새로고침이면 해결.
- **Show on map 버튼**: Location 카드 위/경도 옆 `data-act="showcoord"` → `commitLatLng`(clamp·반올림·필드 재포맷) + `syncMarker(true)`(해당 좌표로 지도 recenter, zoom≥11). 검증: 48.8584/2.2945 입력→클릭→지도중심 서울→파리 이동.
- 검증: `node --check` admin.js OK + 헤드리스(버튼 존재·center 이동·필드 재포맷).

### 17.13 v0.9.70 — 공개 페이지 좌측 목록 카드 설명(bio) 기본 접기
- 사용자: "좌측메뉴에서 바이오를 접어놔" → (관리자 아니라) **공개 페이지 좌측 결과 목록 카드의 설명**을 기본 접기. (v0.9.68의 관리자 Profile 접기와는 별개.)
- `app.js renderList`: `u.desc` 90자 초과 시 기본 2줄 클램프(`-webkit-line-clamp:2`) + `Show more`/`Show less` 토글(`data-more`, `state.descExpanded[id]`). 90자 이하는 그대로 전체 표시(토글 없음). 토글 클릭은 목록 클릭 핸들러에서 `data-more` 우선 분기 → `renderList` 재렌더.
- 검증: 헤드리스 — 긴 설명 카드 기본 클램프(높이 ~36px·line-clamp 존재)·'Show more' 표시 → 클릭 시 클램프 해제·전체 텍스트·'Show less'.

### 17.14 v0.9.71 — 좌표 정밀도 5→7 소수자리 + 주소 영어 강제
- 사용자: 좌표 소수점 7자리까지. `admin.js` `setCoords`/`commitLatLng` `toFixed(5)`→`toFixed(7)`, 지도 캡션 `toFixed(4)`→7. 공개 Report 폼 `rFind` `toFixed(5)`→7. (관리자 승인 모달 요약은 toFixed(3) 유지 — 편집 필드 아님.)
- **Full address 영어 강제**(사용자: 사이트는 영어 전용): Nominatim 기본은 브라우저 언어를 따라가 한국어 혼입(예 '나이로비, 케냐') → 모든 Nominatim 호출(admin search·reverse, 공개 Report search)에 `&accept-language=en` 추가. 라이브 확인: en='…Sejong-daero, …Jung…' vs ko='…세종대로, 중구, 서울특별시, 대한민국'. ⚠️ 기존 저장된 혼합 주소는 재조회 전까지 유지(신규 조회분만 영어).
- 검증: 헤드리스 — '37.1234567' 입력→Show on map 커밋 후 값 유지, '37.12345678'→'37.1234568'(7자리 반올림). 잔여 좌표 toFixed(5/4) 0. Nominatim en 응답 영어 확인.

### 17.15 v0.9.72 — 공개 목록 컴팩트 행 + 정렬 + 부제목(subtitle)
- 사용자 2건: (1) 좌측 목록을 데이터 많아도 편하게(AskUserQuestion: **컴팩트 행 + 정렬** 선택), (2) 지도에 저장 지명 이름 + **부제목**(본제목보다 작고 회색).
- **컴팩트 행 + 정렬**(`app.js`): `renderList` 전면 개편 — 비선택 항목은 한 줄 요약(랭크 배지·이름 ellipsis·부제목 회색·종류/지역 칩·거리·댓글수), **선택 항목만 상세 펼침**(주소·설명+Show more·섹션/태그칩·연락처·댓글). 행 클릭=`select`(지도 flyTo+팝업+해당 행 펼침), 선택 행 `scrollIntoView`. 상단 `#sort-row` 정렬 칩(Distance/Name/Region, `state.sort` 기본 distance) → `sorted()`가 정렬모드 반영(거리 anchor 없으면 이름순 폴백). `renderSort` + wire 핸들러 + renderAll에 추가.
- **부제목**: 데이터 모델 `subtitle` 추가(normUnit app·admin 공통, addUnit 템플릿). 관리자 Basics 카드 'Subtitle' 입력(`f-subtitle`, 안내 '작게/회색'). 공개 표시: **지도 마커 라벨**(이름 굵게+부제목 작은 회색 2줄, `bindTooltip` HTML)·**팝업**(이름 아래 회색)·**목록 행**(이름 아래 회색 ellipsis).
- 검증: 헤드리스 — 정렬칩 3·컴팩트 3행·부제목 표시·기본 접힘→클릭 시 상세+Show more·Name 정렬 순서·지도 라벨 '이름 / 부제목'(예 'Yeoksam Scout Unit / Gangnam district · since 1971'). `node --check` app·admin OK.

### 17.16 v0.9.73 — 지도 좌우 무한 루프 + 목록 행마다 댓글 버튼 노출
- 사용자: (1) 지도 좌우 무한 루프, (2) 각 지명 댓글(이미 구현됨 — 발견성만 개선).
- **좌우 무한 루프**: `maxBounds`를 위도만 클램프(`[[-85.05,-1e6],[85.05,1e6]]`)로 변경 — 경도는 사실상 무제한이라 타일 wrap+`worldCopyJump`로 좌우 무한 스크롤, 위도는 ±85로 고정(상하 여백 0 유지). 검증: setView lng 400 허용·lat 89→83 클램프·북단 85.
- **댓글 발견성**: 컴팩트 redesign 후 💬가 선택 카드에만 보이던 문제 → 각 컴팩트 행 메타줄에 **클릭 가능한 💬+개수 버튼**(`data-comments`, 0 포함 항상 표시) 노출 → 행 선택 없이 바로 댓글 드로어 오픈(레딧식 쓰레드·GDPR·IP마스킹은 기존). 검증: 행 댓글버튼 클릭→drawer 열림·카드 선택 안 됨.

### 17.17 v0.9.74 — 댓글 금지어 필터(차단) + 관리자 단어 관리
- 사용자: 댓글에 금지어를 **막는**(차단) 필터. (AskUserQuestion '마스킹' 선택했으나 후속 메시지 '금지어를 막는 필터'로 차단 확정.)
- **서버 차단**(`_lib.js`+`comments.js`): `DEFAULT_BANNED`(영/한 욕설·스팸 27종) + KV `comments:blocklist`(관리자 커스텀) = `bannedTerms(env)`. `matchBanned(terms,text)`=원문 소문자 + 비영숫자 제거(tight) 양쪽 substring 매칭(`f.u.c.k`류 회피 탐지). POST /api/comments에서 name+body 검사 → 매칭 시 **400 `blocked_keyword`**(저장 안 함). 짧은 단어 오탐 방지: 목록은 'asshole' 등 완전어 사용('ass' 아님) → 'assemble' 통과 확인.
- **관리자 관리 UI**: 신규 `functions/api/comment-filter.js`(GET admin `{words,defaults}` · PUT admin `{words}`→KV, 최대 1000·중복제거). admin 툴바 'Comment filter' 버튼 + 모달(줄/콤마 구분 textarea, 기본목록 read-only details, Bearer 인증). `openFilter`/`saveFilter`.
- **공개 안내**: `app.js postComment`가 `blocked_keyword`→"contains words that aren't allowed", `consent_required`/`empty`도 친절 메시지.
- 검증: node 매칭 10케이스 전수(차단 6/허용 4, 한/영/tight/커스텀)·모듈 import OK·`node --check` client OK. 배포 후 라이브 비파괴 테스트(욕설 POST→400, 저장 안 됨).

### 17.18 v0.9.75 — 공개 페이지 좌측: 검색형 국가 필터 + Region › 국가 › 지역 그룹 트리
- 사용자: 공개 유저페이지 좌측 패널에 **국가 단위 필터(검색 가능)** 추가 + 목록을 기본 **Region → 국가 → 지역단위**로 그룹.
- **검색형 국가 필터**(`app.js`): region-chips 아래 `#country-filter`(index.html) — 트리거 버튼(🌐 + 현재 선택 + ×클리어 + chevron) 클릭 시 드롭다운(검색 인풋 + 스크롤 옵션). 옵션=현재 kind+region로 스코프된 국가 목록(`availableCountries`, `countryOf(u)=country||nso||"—"`), 각 옵션에 지역색 점 + 카운트. 검색 인풋 타이핑은 `#country-options`만 재렌더(포커스 유지). 선택 시 `pickCountry`(지도 `flyToBounds`로 해당 국가 핀에 포커스). `state.country`로 `sorted()` 필터. region 변경 시 country 리셋. **delegation+재렌더+바깥클릭 레이스**: 필터 내부 클릭은 `e.stopPropagation()`로 바깥-닫기 핸들러 차단(재렌더로 detach된 target이 outside로 오인돼 즉시 닫히던 버그 방지).
- **그룹 트리**(`renderList` 재작성, 행 빌더 `unitRowHtml(u,rank)` 추출): `state.grouped` 기본 ON → Region(색점·풀네임·코드·카운트, collapse) › 국가(들여쓰기·카운트, collapse) › 지역단위(place) 행. anchor+거리정렬이면 그룹을 최단거리순, 아니면 Region 선언순+국가 알파벳순. 헤더 클릭=`collapsedGroups` 토글. `select()`가 선택 단위의 region/country 그룹 자동 펼침. Sort 행에 **Grouped 토글** 추가(끄면 기존 평면 목록, Region 정렬은 grouped 시 숨김).
- 검증: 로컬 http + 헤드리스 Chrome(CDP, 샘플 7곳 APR/EUR·5국): 그룹 트리(r:APR/r:EUR·c:5)·country 검색('ger'→Germany,'kor'→Korea)·선택→해당국만(kr1/kr2)·×클리어→복원·Grouped 토글·Region collapse(EUR만 3)·**콘솔 에러 0** + 스크린샷(드롭다운·트리 그린톤 정상).

### 19.12 v0.9.248 — 전 화면 접근성 하한 일괄 정리 (139건)

사용자: "픽셀단위로 확인해서 139건 모두 해결해". 회귀가 붙어 있던 3개 화면(랜딩·플립북·planning)만 깨끗했고, **나머지 6개 화면은 아무도 보고 있지 않았다.**

**먼저 하네스부터** — `test/regress-a11y-sweep.js` 신설(8개 화면 × 2해상도 = 32검사). 고치고 재는 게 아니라, **재면서 고치도록** 순서를 뒤집었다.

| 화면 | 조치 |
|---|---|
| `/tour` | `tour/index.html`·`app.js`·`admin.js`·`styles.css` 의 13px 미만 폰트 전부 상향 · Leaflet 줌 30→40px(`.leaflet-touch .leaflet-bar a` 특이도로 덮음) · 푸터 링크 40px |
| `/krjam-cardnews` | **UI(`jamboree/app.jsx`)만** 13px 하한 — `cover/dday/news/base.jsx`(카드 렌더러)는 **손대지 않았다**. 사용자가 만드는 그래픽이라 글자를 키우면 결과물이 망가진다. 버튼 40px |
| `/krjam-dcount` | `krjam-dcount/app.jsx` 인라인 `fontSize` 하한 · `.dc-btn` 40px · 버튼 전역 40px |
| `/krjam-jebo` | 폰트 하한 · 언어 세그먼트 32→40px |
| `/privacy` | badge 10px 등 전부 13px · '지도로 돌아가기' 링크 40px |
| `/krjam-planning` 게이트 | '관리자 인증코드로 입장' 23→40px |

**규칙 충돌 1건을 둘 다 지키는 쪽으로 해결**: 제보 페이지는 "헤더 ≤64px"(폼이 첫 화면에 들어와야 한다) 회귀가 있는데, 언어 버튼을 40px 로 키우자 67px 이 됐다. 어느 규칙도 완화하지 않고 **헤더 여백을 10→7px** 로 줄여 61px 로 맞췄다(폼 첫 입력 y=337).

**예외는 사유와 함께 코드·회귀 양쪽에 적었다**: 지도 핀 글자(`.leaflet-marker-icon`)와 출처 표기(`.leaflet-control-attribution`)는 '본문·라벨'이 아니라 지도 그래픽이다 — 13px 로 키우면 핀이 지도를 덮고, 출처는 OSM 라이선스상 지울 수도 없다.

**측정 기준도 바로잡았다**: 처음엔 모든 `<a>` 를 조작 요소로 셌더니 문장 속 이메일·출처 링크까지 40px 대상이 됐다. `display:inline` 인 링크는 제외한다 — 문단을 깨뜨리는 건 규칙의 의도가 아니다.

**검증**: 스윕 32/32 · 전체 스위트 **3회 연속 실패 0건**(383건 ×3) · 5개 화면 스크린샷 육안 확인(가로 넘침 0, 카드 아트워크 무변경).

### v0.9.277 — 지도 데이터 보호: 한 번의 실수로 전부 날아가던 길 차단
- 배경: `/api/units` PUT 은 단위대 전체를 **통째로** 덮어쓴다. 여기에 CSV '덮어쓰기' 업로드가 붙으면서, 전부 잃는 길이 두 개 생겼다.
  - **㉮ 관리자 화면이 데이터를 못 불러오면** `units = []` 로 두고 "All changes saved" 라고 적었다 → 그 뒤 아무 편집이나 하면 **빈 목록이 운영 KV 에 덮인다**.
  - **㉯ CSV 덮어쓰기**에 잘못된 파일을 올리면 기존 데이터가 즉시 사라진다(확인 절차 없음).
- **화면**: `unitsLoaded` 플래그 — 불러오기 전에는 저장하지 않는다. 불러오기 실패 시 화면을 비우고 저장을 잠그며 "Could not load data — saving is disabled" 를 적는다(**data.js 씨앗으로 채우지 않는다** — 씨앗이 운영 데이터를 덮는 사고가 다른 보드에서 실제로 있었다). CSV 덮어쓰기는 "현재 N곳이 모두 지워지고 CSV 의 M곳으로 바뀝니다" 를 숫자로 보여 주고 한 번 묻는다.
- **서버**(마지막 방어선): `empty_guard`(저장된 게 있는데 빈 목록 → 409) · `shrink_guard`(10곳 이상에서 **절반 아래**로 줄면 409) · 덮어쓰기 직전 **스냅샷** `units:snap` 최근 10개(30일) · `GET ?snapshots=1`(관리자만) · `PUT {restore:"<at>"}` 되돌리기 · `appendLog` 에 `units.save`/`units.restore` 기록. 의도한 삭제는 `confirmEmpty`/`confirmShrink` 로 통과하고, 화면은 409 를 받으면 사람에게 물어 다시 보낸다.
- 검증: `test/regress-tour-csv.js` 13→**25/25** — 덮어쓰기 확인창(취소하면 기존 데이터 그대로) · 불러오기 실패 시 저장 잠금(PUT 자체가 나가지 않음) · 서버 가드/스냅샷/되돌리기/감사기록은 **배포되는 units.js 모듈**을 가짜 KV 로 직접 돌려 확인.

### v0.9.297 — 랜딩 `/` 정돈: 장식을 걷어내고 여백·계층으로 (사용자 지시 "랜딩도 손봐줘")
v0.9.240~241 에서 넣은 화려한 연출이 **이 저장소가 스스로 정한 규칙을 어기고 있었다.**
`rules/ui-ux.md`(규칙 ④ — 사용자가 직접 준 가이드라인, 기본 동작을 오버라이드): *심미성보다 사용성 · 불필요한 원형 오브젝트·강한 배경색 지양(시선 분산) · **3D 기교 금지** · 은은한 그라디언트*.
`DESIGN.md`: ***금지 — 보라/네온 그라데이션, generic AI 톤, 과한 그림자***.
→ 디자인 훅이 5건을 반복해 지적했고, 처음엔 "의도된 연출"로 넘겼다가 **규칙 문서를 다시 읽고 오판임을 확인**했다.

**걷어낸 것** (사용자 확정: 배경은 *"아주 은은하게 한 겹만"*, 로고·제목은 *"정리한다"*)
- 배경 **5겹 → 1겹**: 오로라 2겹(conic 46s·64s 회전) · 색덩어리 3개(blur 70px 표류) · 매듭선 3줄 · 불티 6~10개 · 그레인 → **움직이지 않는 radial 한 겹**(`body::before`).
- 카드: 무지개 아우라(`.ring` conic 5.5s) · 빛 쓸기(`.sheen`) · 커서 3D 기울기(`perspective`+`rotateX/Y`) · 커서 광원 · 아이콘 5종 키프레임(bounce/zoomy/wiggle/turn/pulse) · 유리(`backdrop-filter`).
- 제목: 그라데이션 글자(`background-clip:text`) + 글자 하나씩 떠오르는 11개 `<b>` → **단색 한 덩어리**.
- 로고: 흐르는 그라데이션 + 빛 쓸기 무한반복 → **단색 브랜드색**, 그림자도 색 없는 얕은 것으로.
- **무한 반복 애니메이션이 0개가 됐다.** 움직이는 것은 진입 연출 하나뿐이고 easing 은 ease-out-quart(바운스 금지).

**타입 계층** — 8종(13·13.5·14.5·17·19·23·28) → **4단계 13 · 16.5 · 21 · 28**(단계마다 1.27배 이상, 최대/최소 2.15배).
- ⚠️ 모바일에서 제목을 24px 로 줄이던 규칙을 **없앴다** — 스케일에 없는 다섯 번째 크기가 생겨 카드 제목(21px)과 1.14배밖에 차이가 안 난다. 두 단어짜리 제목이라 390px 에서도 28px 로 들어간다.
- 본문 13.5 → **16.5px**(ui-ux.md 본문 14~16). 카드가 조금 커졌지만 읽기가 확연히 낫다.

**로딩바** — `width` 애니메이션 → **`transform:scaleX()`**. width 는 매 프레임 레이아웃을 다시 잡는다. 색조 글로우(`0 0 12px` 보라)도 제거.

**대비 실측(전부 통과)**: 제목 14.73 · 부제 6.19 · 카드 제목 16.67 · 카드 본문 6.80 · 태그 13.63 · 푸터 6.19 · 호버 상태 본문 6.80.

**회귀 `test/regress-landing.js` 를 새 계약으로 다시 썼다(46건)** — 옛 검사는 걷어낸 장식의 **존재**를 단언하고 있었다(아우라·빛줄기·불티 개수·11개 글자·기울기 갱신).
- 새로 넣은 것: 무한 애니메이션 0 · 그라데이션 글자 0 · 3D 0 · 오프셋0 글로우 0 · 유리 0 · 배경 장식 DOM 0 · **타입 스케일 4단계 밖 크기 0** · 로딩바가 transform 인가 · 대비 6종.
- 🔴 **검사 자체의 결함 2건을 잡았다**(DoD 2-1):
  1. **계산된 스타일만 보면 3D 를 놓친다** — `.reveal` 의 `animation:… forwards` 가 마지막 키프레임 `transform:none` 으로 요소의 transform 을 덮어써서, 3D 를 되돌려 넣어도 `getComputedStyle().transform` 이 `none` 이었다. → **스타일시트 원문**도 함께 훑는다.
  2. **크롬은 평범한 `CSSStyleRule` 에도 (CSS 중첩용) 빈 `cssRules` 를 단다** — `if(r.cssRules) 내려가기` 로 짠 순회가 36개 규칙 중 **2개만** 담았다(전부 빈 목록으로 내려가 버렸다). 최상위 `cssText` 만 모으면 `@media`·`@keyframes` 안쪽까지 다 들어온다.
- **이빨 확인 5종**: 무한 애니메이션 재도입 → 2건 FAIL · 그라데이션 글자 → FAIL · 3D 기울기 → FAIL · 색조 글로우 → FAIL · 모바일 24px → FAIL.

**검증**: 랜딩 46건 · a11y 스윕이 `/` 도 훑는다 → 14종 **735건, 2라운드 ALL GREEN** + 감사 1종 0건. 디자인 디텍터 **0건**.

### v0.9.298 — 문의처를 `scoutkorea@kakao.com` 으로
사용자 지시. 바뀐 곳: 종료 안내 `service-ended.html` 2곳(문의 버튼 mailto + 푸터) · 개인정보 처리방침 `privacy.html` 6곳(3개 링크의 href·본문).

- ⚠️ **주소가 두 화면에 흩어져 있어 한 곳만 고치면 법적 고지에 죽은 주소가 남는다.** `test/regress-service-ended.js` 에 검사 2건을 넣어 못 박았다 — 두 파일에서 **현재 주소가 아닌 메일 주소를 전부 찾아내고**, 종료 안내의 문의 버튼이 현재 주소로 가는지 본다. privacy 한 곳만 옛 주소로 되돌려 FAIL 하는 것까지 확인(이빨).
- privacy 는 **운영 중인** Scout Tour Assistant 의 처리방침이라 종료 작업 범위 밖 → 사용자에게 확인 후 함께 변경.
- ⚠️ 라이브에서는 Cloudflare **이메일 난독화**가 주소를 `/cdn-cgi/l/email-protection#…` 로 바꿔 내보낸다(응답마다 토큰이 달라 **라이브 HTML 해시가 매번 다르다** — 로컬과 안 맞는다고 배포 실패로 오진하지 말 것). 클릭·표시는 CF 스크립트가 되돌려 정상 동작한다.
- 검증: 종료 스위트 28→**30** → 14종 **737건**, 2라운드 ALL GREEN.

### v0.9.299 — 폴더트리 정리: 엔트리는 루트 고정, 모듈·자산은 서비스 폴더로
사용자: *"뭔가 왤케 폴더트리가 정리가 안된거같지"*. 실사해 보니 세 가지가 어수선했다.

1. **`/tour` 앱의 몸통 4개가 루트에 흩어져 있었다** — `app.js`(76KB)·`admin.js`(76KB)·`data.js`(27KB)·`styles.css`. `tour/index.html`·`tour/admin.html` 이 `/app.js` 같은 **루트 절대경로**로 부르고 있었다. 폴더는 있는데 내용물이 밖에 나와 있는 꼴.
2. **`admin.js` 가 두 개인데 완전히 다른 앱이었다** — 루트(투어 관리자 76KB) vs `admin/admin.js`(운영 현황 30KB).
3. **OG 이미지가 두 군데로 갈려 있었다** — `assets/`(랜딩·투어) vs `jamboree/assets/`(잼버리). 게다가 `jamboree/` 는 서비스 종료로 **공용 이미지 3개만 남은 상태**라 이름이 내용과 어긋났다.

**왜 다 옮길 수는 없나**: Cloudflare Pages 는 **루트 `.html` 파일명이 곧 주소**다(`krjam-planning.html` → `/krjam-planning`). 엔트리 HTML 7개는 루트를 못 벗어난다. **반면 js·css·이미지는 옮겨도 된다** — HTML 의 `src` 만 고치면 라우팅과 무관하다. 그 경계대로만 정리했다.

**옮긴 것** (루트 파일 **25 → 19개**)
- `app.js`·`admin.js`·`data.js`·`styles.css` → **`tour/`** (이름 충돌도 함께 해소)
- `jamboree/assets/{logo,og-planning}.png` → **`assets/`** · 미사용 `artboard-jam-white.png` 삭제 · **`jamboree/` 폴더 소멸**
- 배치도 고해상 원본 2장 → **`_private/`**, `_middleware` 가 **폴더째** 차단(옛 파일명 규칙도 남겨 둠)

**⚠️ 옛 주소를 301 로 살렸다** — 자산 URL 이 바뀌면 **이미 카카오톡·페이스북에 공유된 링크의 미리보기가 깨진다**(크롤러가 옛 OG URL 을 캐시한다). `_redirects` 에 6줄 추가: `jamboree/assets/*` 2개 + `/app.js`·`/admin.js`·`/data.js`·`/styles.css`(옛 `?v=` 를 물고 있는 브라우저 대비). 자산이라 302 가 아니라 **301** 이 맞다.

**바뀌지 않은 것**: 라우팅 · 화면 · 기능. `?v=` 만 0.9.299 로 올렸다.

**검증**: 14종 **737건 2라운드 ALL GREEN**. 라이브에서 옛 자산 주소 301 → 새 위치 200 · `_private/` 404 확인.
⚠️ 이동 직후 `regress-service-ended` 가 한 번 콘솔 404 로 실패했으나 **이후 3회 연속 30/30** 으로 재현되지 않았다(파일시스템 타이밍 추정). 재현되면 서버 응답 로깅을 붙여 URL 을 특정할 것.
