# /krjam-jebo — 공개 소식 제보 페이지 (변경 이력)
> 로그인 없는 공개 엔트리. 엔트리: `krjam-jebo.html`. 제보는 planning의 소식 인박스로 유입.

### 16.49 v0.9.156 — 공개 제보 페이지 `/krjam-jebo` + 인박스 담당자 배정
- 사용자: 현장 제보는 홍보부뿐 아니라 **일반 스카우트도** 가능해야 함 → **공개 전용 엔트리 페이지** 신설, 제보는 인박스로 자동 유입, 인박스에서 **담당자 배정**.
- **공개 페이지** `krjam-jebo.html`(클린 URL `/krjam-jebo`, 로그인·게이트 없음, 모바일 우선, 자체 인라인 CSS/JS·잼버리 브랜딩): 이름(필수)·소속/분단·위치(구역 select 29)·내용·사진(≤3, `downscale`/`uploadBlob` 인라인) → `POST /api/jp-tips`(무인증). 완료 화면 + 보관 고지. OG 메타.
- **API**(`jp-tips.js`): POST를 **무인증 허용**으로 변경(로그인 시 member, 아니면 `source:'public'`). 공개 제보는 **이름 필수**(`name_required`) + **IP 레이트리밋**(`jpt:rl:<ip>` 10분 8건, `too_many`) + **금지어 필터**(`bannedTerms`/`matchBanned`, `blocked_keyword`). 레코드에 `source`·`assignee` 추가. PATCH에 `assignee`(홍보부/관리자) 추가.
- **인박스**(app.js): 카드에 **외부 제보 배지**(`source==='public'`) + **담당자 배정 select**(roster, 홍보부만, `assignTip`→PATCH) + 배정 칩(`담당 이름`). 상단 **공개 제보 페이지 링크 바**(`/krjam-jebo` + 링크 복사). `.tip-src/.tip-asg/.tip-assign/.jebo-bar` CSS.
- 검증: `node --check`(app·jp-tips) + 헤드리스: 공개페이지(제목·구역30·사진슬롯·이름필수 검증) + 인박스(공개링크바·외부제보 배지·담당 select 7·배정 칩)·**콘솔 에러 0** + 라이브 비파괴(무인증 POST 빈값→400·이름없음→400, 401 아님=공개 허용 확인).

### 16.49b v0.9.157 — 공개 제보 페이지 한/영 이중언어 + 전화 필수 + 동의/참가확인 + 사진 10장
- 사용자 추가: 상단 큰 **한국어/English 토글**·사진 **용량제한 없이 최대 10장**·하단 **개인정보 동의 + 잼버리 참가자 확인 체크 2종**·**이름+전화번호 필수**.
- **이중언어**(`krjam-jebo.html` 전면 재작성): `T{ko,en}` 사전 + `applyLang()`(라벨·placeholder·구역 라벨[ko/en]·에러·동의문 전부) + 상단 sticky 큰 토글(`.langbar`, localStorage `jebo:lang`). 구역 EN 라벨(분단=로마자 'Keunmulgyeol Div.' 등) 추가.
- **사진**: 최대 3→**10장**, 다운스케일 1600/q0.85→**2800px/q0.92**(고화질, 사실상 용량 걱정 X). `image.js` 한도 **5→10MB**.
- **필수/동의**: 이름+**전화번호** 필수, 하단 체크 2종(개인정보 수집·이용 동의·참가자 확인) 모두 필수. API `jp-tips` 공개 POST에 `phone_required`/`consent_required`/`participant_required` 게이트 + 레코드에 `phone`·`consentAt`·`participant` 저장. 인박스 카드에 전화(`tel:` 링크) 표시.
- 검증: `node --check`(jp-tips·image·app) + 헤드리스(KO/EN 토글·전화 필드·체크 2종·검증 순서 이름→전화→내용→동의→참가·구역 KO 'JHQ 본부'/EN 'JHQ HQ'·MAXP 10·콘솔 에러 0) + 스크린샷 + 라이브 비파괴(이름없음→400·전화없음→phone_required·동의없음→consent_required, 모두 무기록). ⚠️ 실제 제보 1건은 운영 KV 기록 → 사용자 QA.

### 16.49c v0.9.158 — 공개 제보 리프레이밍: ‘현장(온사이트)’ → ‘잼버리 소식’(행사 전부터)
- 사용자: 공개 페이지를 온사이트 제보가 아니라 **제16회 한국잼버리 소식**을 모으는 창구로 — **잼버리 시작 전부터** 참가자 관련 특별 소식·사연을 미리 제보.
- 공개 페이지(`krjam-jebo.html`) 카피 교체(ko/en): 제목 ‘잼버리 소식 제보 / Share Jamboree News’, 리드(행사 전 특별 소식·사연 강조), 내용 placeholder, 위치→‘관련 위치(선택)’, `<title>`/OG. 필드·동의·전화 필수 등 구조는 §16.49b 유지.
- 인박스(planning): 탭 ‘현장 제보’→‘소식 제보’, 섹션 ‘잼버리 소식 제보’, 안내문·모달 제목·기사화/자료화 라벨 reword(내부 id `tips` 불변). 검증: `node --check`+헤드리스(제목 KO/EN·관련 위치·콘솔 0)+라이브 title 확인.
