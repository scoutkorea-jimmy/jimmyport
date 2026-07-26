# 스택 · 파일구조 · 라우팅 · 도메인 · 운영 규칙
> §2 스택/제약 · §3 파일구조 · §8 운영 · §18 도메인/라우팅/누수차단. 라이브 KV/데이터 조치 이력은 [operations-log.md](operations-log.md).

## 2. 스택 / 제약 (반드시 준수)
- **Vanilla HTML/CSS/JS만.** 프레임워크·번들러·빌드 단계 도입 금지.
- 지도: **Leaflet 1.9.4** (cdnjs), 타일: **OpenStreetMap**.
- 클라이언트 단독 동작 — 외부 API 키·지오코딩 호출 금지. *(단, 영구저장/IP/댓글 등 §10
  백엔드 항목은 Cloudflare Pages Functions 도입을 전제로 별도 합의 후 진행)*
- UI 텍스트 **한국어**, 식별자/코드 **영어**.
- 디자인: 깔끔한 '필드 가이드/지도' 무드. generic AI 톤·보라 그라데이션 남발 금지.

## 3. 파일 구조 (라우팅 개편 v0.9.107 반영)
```
index.html           루트 = 도구 모음 랜딩 허브(noindex) → /tour·/krjam-* 카드 링크   [/]
tour/index.html      Scout Tour Assistant 공개 (지도·검색·거리정렬·댓글)              [/tour]
tour/admin.html      Tour 관리자 (TOTP 로그인, 단위대 CRUD + 좌표)                     [/tour/admin]
app.js, admin.js     공개·관리자 로직 (루트 위치, tour/* 는 절대경로 /app.js 로 참조)
styles.css           공개+관리자 공용 테마 (Bricolage + Hanken, 보라 #6336B5)
data.js              SCOUT_UNITS + SCOUT_NSOS(176) + SCOUT_REGION_COLORS (← 데이터 교체 지점)
krjam-cardnews.html  잼버리 카드뉴스 제작기(React) — 모듈은 jamboree/           [/krjam-cardnews] (구 /jamboree)
krjam-planning.html  잼버리 SNS 운영 캘린더(vanilla) — 모듈은 jamboree-plan/     [/krjam-planning]  (구 /jamboree-plan)
krjam-dcount.html    D-Count 자리(라우팅만 확보, 내용은 사용자가 작성)          [/krjam-dcount]
krjam-fnc.html       급식편의본부 OT 플립북(vanilla) — 모듈은 krjam-fnc/       [/krjam-fnc]
jamboree/ , jamboree-plan/   각 앱의 모듈·자산 폴더 (이름 유지)
krjam-fnc/           app.js·styles.css + pages/(31쪽 webp)·thumbs/·assets/(내려받기 PDF·OG)
functions/_middleware.js     내부파일(*.md·wrangler.toml·CNAME·package*.json·.claude 등) 404 차단
functions/api/*      백엔드 (units/submissions/comments/jamboree/jamboree-plan/jp-members/jp-news/login/image/file/log + _lib)
_redirects           구 경로(/jamboree·/jamboree-plan·/admin) → 신 경로 301
_headers             전 자산 no-cache(배포 즉시 반영)
version-watch.js     /VERSION 폴링 → 새 배포 시 우측 상단 새로고침 알림
VERSION              사이트 버전 (의미 있는 변경마다 bump)
KMS.md / FEATURES.md / README.md / DESIGN.md   내부 문서(웹 비공개 — _middleware 차단)
```
> **모든 데이터·사양은 [KMS.md](../KMS.md)에 통합.** 작업 전 KMS.md + 이 문서 함께 확인.

## 8. 운영 규칙
- **자동 commit + push + 배포**: 검증 통과 즉시 git commit + push +
  `wrangler pages deploy . --project-name jimmyport --branch main`. 별도 지시 없어도 진행.
- 로컬 dev server 띄우지 말 것. 의미 있는 변경마다 `VERSION` bump.
- 배포 대상 Cloudflare Pages 프로젝트 `jimmyport`. **도메인: `scoutingapp.net`(주력) + `jimmypark.net`(둘 다 Active, 동일 콘텐츠).** 둘 다 같은 프로젝트 커스텀 도메인. (사용자: jimmypark.net 노출돼도 무방 → 제거 안 함.)
- **라우팅(v0.9.107)**: `/`=랜딩 · `/tour`(+`/tour/admin`) · `/krjam-cardnews` · `/krjam-planning` · `/krjam-dcount` · `/krjam-jebo`(+`/jebo`) · `/krjam-fnc`(v0.9.234). 구 경로(`/jamboree`·`/jamboree-plan`·`/admin`)는 `_redirects` 301. `/tour` 는 디렉터리라 308→`/tour/`(정상).
  - `krjam-*.html` 과 **같은 이름의 모듈 폴더가 공존**해도 Pages 는 확장자 없는 경로에 .html 을 먼저 매칭한다(`/krjam-dcount` 200 로 확인된 기존 패턴 — `/krjam-fnc` 도 동일).
  - **랜딩 미노출 서비스**: `/krjam-fnc` 는 실명 업무배정표가 포함돼 있어 사용자 지시로 루트 랜딩 카드에 넣지 않는다(noindex + URL 공유 전용).
- **공개 누수 차단**: `functions/_middleware.js` 가 `*.md`·`wrangler.toml`·`package*.json`·`.gitignore`·`CNAME`·`.claude/*` 를 404(`.assetsignore` 는 `wrangler pages deploy` 가 무시함). 내부 문서·설정은 웹에서 안 보임. GitHub 저장소는 공개(사용자: 무방).

### 8.1 시크릿 점검 결과 · 사용자 결정 (2026-07-26)
전수 점검(워킹트리 + **git 히스토리 전체**) 결과 **실제 API 키·토큰·개인키는 0건**. `TOTP_SECRET`·`ADMIN_TOKEN` 은 Cloudflare 시크릿에만 있고 코드/문서에 값이 박힌 적 없다. `.claude/settings.local.json` 은 권한 허용목록뿐. `wrangler.toml` 의 KV id·R2 버킷명은 자격증명이 아니라 단독으로는 사용 불가.

⚠️ **알려진·수용된 노출 — 임의로 바꾸지 말 것**
- `functions/api/jamboree.js` · `functions/api/krjam-dcount.js` 의 `env.CC_PASS || "scout1922"` **하드코딩 폴백**. Cloudflare 에 `CC_PASS` 가 **미설정**이라 폴백이 실사용 중이고, 값은 공개 저장소·문서에 그대로 적혀 있다.
- 실측(2026-07-26, GET 상태코드만): `X-CC-Pass: scout1922` 로 `/api/krjam-dcount?admin=1`(신청자 명단 + IP) · `/api/jamboree?list=1` **둘 다 200**. 무인증은 401.
- **사용자 결정: 교체하지 않고 현행 유지 + 저장소도 공개 유지**(AskUserQuestion 확인). 따라서 **에이전트가 임의로 `CC_PASS` 를 설정하거나 폴백을 제거하지 말 것** — 그 순간 팀원들의 카드뉴스 서버백업·디데이 관리자 로그인이 끊긴다.
- 나중에 정리한다면 순서는 **① `CC_PASS` 시크릿 설정 → ② 코드의 `|| "scout1922"` 제거(미설정 시 차단) → ③ 팀에 새 비번 공지**. 히스토리에 남은 값은 되돌릴 수 없으므로 교체(rotation)만이 유효한 조치다.

---

## 18. 도메인 이전 + 공개 누수 차단 + 라우팅 개편 (scoutingapp.net)
> 사용자: jimmypark.net이 공식 도메인이지만 **노출(주소창)되면 안 됨** → 새 도메인으로 전면 이전. + KMS·문서 현행화.

### 18.1 v0.9.104–0.9.105 — 내부 문서·설정 공개 서빙 차단(_middleware)
- 발견: `pages_build_output_dir="."`(루트 배포) + `.assetsignore` 미지원 → 라이브에서 `CLAUDE.md·KMS.md·FEATURES.md·README.md·DESIGN.md·wrangler.toml·package.json·.gitignore·CNAME·.claude/settings.local.json` 가 전부 **HTTP 200**(관리자 비번 `scout1922`·env명·KV id 노출). `.assetsignore` 는 `wrangler pages deploy`(4.97)가 **무시**함(프리뷰 URL로 확인).
- 조치: `functions/_middleware.js` — 정적 서빙 전에 가로채 `*.md`·`wrangler.toml`·`package*.json`·`.gitignore`·`.assetsignore`·`CNAME`·`.claude/*` 를 404, 그 외(/api/*·정적자산)는 `next()` 통과. 검증: 해당 경로 404, 앱·API·/VERSION 200.

### 18.2 v0.9.105 — 새 도메인 scoutingapp.net 연결
- 사용자가 `scoutingapp.net` 구매 → Cloudflare Pages `jimmyport` 프로젝트 **커스텀 도메인**으로 추가(Active). `jimmypark.net` 은 그대로 둠(사용자: "살아있어도 무방"). 두 도메인이 동일 콘텐츠 서빙.
- 코드: 카드뉴스 OG `og:image`/`og:url`·`twitter:image` + `CNAME` 파일을 scoutingapp.net으로 갱신. **API는 요청 origin(`u.origin`)·이미지/첨부 URL 상대경로(`/api/image?id=`)** 라 도메인 하드코딩 0 → 새 도메인에서 코드·데이터 수정 없이 작동(검증: scoutingapp.net에서 앱·API·문서차단 모두 정상).

### 18.4 v0.9.107 — 라우팅 개편(도구 모음 랜딩 + /tour·/krjam-*)
- 사용자 확정 구조(AskUserQuestion): `/`=**도구 모음 랜딩 허브**(신규 `index.html`, noindex, 4개 도구 카드) · `/tour`=Tour(`tour/index.html`) · `/tour/admin`=Tour 관리자(`tour/admin.html`) · `/krjam-cardnews`=카드뉴스(구 `/jamboree`) · `/krjam-planning`=SNS 캘린더(구 `/jamboree-plan`) · `/krjam-dcount`=신규 자리(사용자가 직접 작성, 플레이스홀더만).
- 구현: HTML 엔트리만 이동/개명(`jamboree/`·`jamboree-plan/` 모듈 폴더명 유지). `tour/*` 는 서브디렉터리라 자산을 **루트 절대경로**(`/app.js`·`/admin.js`·`/styles.css`)로 고정. 구 경로는 `_redirects` 301. 상호링크(`/admin`→`/tour/admin`, jamboree-plan의 `/jamboree`→`/krjam-cardnews`)·카드뉴스 og:url 갱신.
- 검증: 신 경로 200(`/tour`는 308→`/tour/`)·구 경로 301 정확 매핑·자산 절대경로 200·카드뉴스 모듈 200·문서 404.

### 18.5 문서 현행화
- 본 §18 추가 + §3 파일구조 재작성(랜딩/tour/krjam-*/_middleware/_redirects 반영, 옛 manage.html 잔재 제거) + §8 운영규칙(도메인 2개·라우팅·누수차단) 갱신. KMS.md·FEATURES.md·README.md 의 라이브 URL·호스팅·경로도 scoutingapp.net + 신 라우팅으로 갱신.

### 18.22 v0.9.146 — 페이지별 OG 이미지 4종 신설(랜딩·Tour·홍보부보드·디데이)
- 기존엔 카드뉴스(`krjam-cardnews`, `jamboree/assets/og.png`)에만 OG가 있었음. 사용자: "카드뉴스처럼 다른 페이지들도 OG 이미지 적절히 만들어줘. 잼버리 관련은 잼버리 OG로."
- **생성 방식**(기존 og.png와 동일): HTML 템플릿 → 헤드리스 Chrome(`--headless=new --screenshot --window-size=1200,630 --virtual-time-budget`) 1200×630 PNG 렌더. 엠블럼은 base64 임베드, 폰트는 Pretendard(CDN)·Bricolage/Hanken(Google Fonts).
- **잼버리 톤**(기존 og.png와 동일 레이아웃: 라벤더 그라데이션 + 좌측 공식 엠블럼 + 우측 행사명/제목/부제/메타):
  - `jamboree/assets/og-planning.png` → krjam-planning("홍보부 통합 관리 플랫폼").
  - `jamboree/assets/og-dcount.png` → krjam-dcount("디데이 프로젝트").
- **자체 브랜드 톤**(보라 #6336B5):
  - `assets/og-landing.png`(루트 신규 `assets/`) → index 랜딩("Scouting App" 보라 그라데이션 마크 + 도구 칩 4종).
  - `assets/og-tour.png` → tour("Scout Tour Assistant" + 맵핀 모티프, EN).
- **메타 배선**: 4개 HTML `<head>`에 og:type/site_name/title/description/image(절대 URL `https://scoutingapp.net/...`)/image:width·height/url + twitter:card(summary_large_image) 추가. 카드뉴스 메타 블록 패턴 준용.
- 스킵(의도): `privacy.html`(법적 하위 페이지·저가치)·`tour/admin.html`(noindex 관리자). 루트 `assets/*.png`는 `_middleware` BLOCKED(.md·config류)에 안 걸려 정상 서빙.
- 검증: 4종 모두 1200×630 렌더 + 시각 확인(폰트 로드·레이아웃 정상). 배포 후 라이브 og:image 200 확인 예정.
