# scout-finder — Design Guide (디자인 가이드)

> 모든 디자인은 이 문서를 **준용**한다. 토큰은 `styles.css`의 `:root`에 1:1로 존재하며,
> 새 컴포넌트/화면은 반드시 여기 토큰·규칙을 사용한다. (값을 하드코딩하지 말 것)
> 변경 시 이 문서와 `:root`를 함께 갱신한다. 상위 컨텍스트: [CLAUDE.md](CLAUDE.md).

---

## 1. 디자인 원칙
- **무드**: 깔끔한 '필드 가이드 / 지도'. 신뢰감 있고 기능 우선.
- **규칙 기반**: 색·타이포·간격·반경은 토큰만 사용. 임의 값 금지.
- **절제된 강조**: Scouting Purple은 강조(버튼·활성·링크·핀)에만. 면 전체를 보라로 덮지 않음.
- **금지**: 보라/네온 그라데이션, generic AI 톤, 과한 그림자.
- **대상**: 외국인 우선 → **홈페이지 UI는 영어 전용**(한국어 토글 없음).

## 2. 색 (Color tokens)
브랜드 팔레트(첨부 Color values)가 기본.

| 토큰 | HEX | 용도 |
|---|---|---|
| `--scout-purple` / `--accent` | `#622599` | 주 강조: 버튼·활성·링크·기본 핀 |
| `--midnight-purple` / `--accent-ink` | `#4d006e` | hover/진한 강조 |
| `--accent-soft` | `#f1e7f8` | 배지·칩·연한 강조 배경 |
| `--bg` | `#f6f3fa` | 페이지 배경(옅은 라벤더 캔버스) |
| `--surface` | `#ffffff` | 카드·헤더·패널 |
| `--surface-2` | `#faf8fd` | 입력·보조 면 |
| `--ink` | `#221b2b` | 본문 텍스트(완전 블랙 금지) |
| `--muted` | `#6e6878` | 보조 텍스트·라벨 |
| `--line` / `--line-2` | `#e8e2f0` / `#d6cce4` | 구분선 / 진한 보더 |
| `--anchor` | `#1c1524` | 지도 기준점 마커(연맹/국가 색과 분리) |
| 보조 브랜드색 | Fire `#ff5655` · Ember `#ffae80` · Ocean `#0094b4` · River `#82e6de` · Forest `#248737` · Leaf `#9fed8f` · Blossom `#ff8dff` | 상태/위험(danger=fire) 등 |

### 핀 색 규칙
- **핀/범례 색 = WOSM 지역(Region) 색** (`SCOUT_REGION_COLORS`): Asia-Pacific `#622599` · European `#0094b4` · Arab `#248737` · Africa `#d5521a` · Interamerican `#c2189e`.
- 핀 번호 글자색은 배경 명도로 흑(`#221b2b`)/백 자동. 기준점 핀은 `--anchor`.

## 3. 타이포그래피
- **폰트**: `Wanted Sans Variable` (cdn `@import`), 폴백 system Korean sans.
- **7단계 weight** — 위계별로만 사용:

| 토큰 | weight | 용도 |
|---|---|---|
| `--fw-1` | 300 | 보조 캡션·hint |
| `--fw-2` | 400 | 본문 |
| `--fw-3` | 500 | 강조 본문·입력값 |
| `--fw-4` | 600 | 라벨·소제목·affil |
| `--fw-5` | 700 | 버튼·배지·칩·토글 |
| `--fw-6` | 800 | 카드 제목·섹션 제목·통계 |
| `--fw-7` | 900 | 페이지 타이틀(h1) |

- 크기: 본문 ~0.84–0.88rem, 카드 제목 1.02rem, h1 `clamp(1.25rem,2.4vw,1.6rem)`. line-height 1.5 기본.

## 4. 간격·반경·그림자·모션
- **간격 스케일(4px 베이스)**: `--sp-1`4 · `--sp-2`8 · `--sp-3`12 · `--sp-4`16 · `--sp-5`22 · `--sp-6`32. 패딩/갭은 이 값 사용.
- **반경**: `--r-sm`7(칩·배지) · `--r-md`8(입력·버튼) · `--r-lg`12(카드·패널) · `--r-pill`(배지/토글).
- **그림자**: `--shadow` 하나만. 호버 시에만 약하게.
- **모션**: transition 0.15s ease. 과한 애니메이션 금지. `prefers-reduced-motion` 존중(레이아웃 흔들지 않기).

## 5. 포커스 · 접근성
- 모든 인터랙티브: `:focus-visible { outline/box-shadow: var(--focus) }` (`0 0 0 3px rgba(98,37,153,.4)`).
- 키보드 내비 가능, `aria-pressed`/`aria-label`/`role` 부여. 대비 AA 이상.
- 카드·핀은 버튼/role로 키보드 접근. 색만으로 정보 전달 금지(텍스트 병기).

## 6. 레이아웃
- **앱셸**: `body` `height:100dvh; overflow:hidden; flex column`. 헤더(auto) · 본문(flex:1, 내부 스크롤) · 푸터(auto).
- **데스크톱**: `.layout` grid `380px 1fr` (사이드바 + 지도). 컨테이너 max `1180px`.
- **모바일(≤820px)**: 단일 패널 + 헤더 **목록/지도 토글**(`body.view-list/.view-map`). 패널 `position:absolute; inset:0`.

## 7. 컴포넌트 (정의는 styles.css)
- **버튼**: primary(보라 채움) / secondary(보더) / danger(hover fire) / link-btn(텍스트). 반경 `--r-md`, weight `--fw-5`.
- **검색바**: surface-2 + 보더, focus-within 시 보라 + `--focus`.
- **결과 카드**: surface + `--line`, 반경 `--r-lg`. 구성: 순위(핀색) · 이름+종류배지 · `국가 · 지방연맹` · 거리배지 · 주소 · 주요활동 · 모집 카테고리(칩) · 모임요일+연락방법(없으면 "Contact the federation")+인스타.
- **칩**: `--accent-soft`/surface-2 + 보더, 반경 `--r-sm`.
- **핀(divIcon)**: 물방울형, 연맹/국가색 + 흰 보더. 기준점은 `--anchor` 원형.
- **팝업/범례/버전토스트/관리자 카드**: 동일 토큰 체계.

## 8. 라이팅(영문) 규칙
- 홈페이지 카피는 영어. 라벨 예: Meets / Main activities / Recruiting / Contact the federation / Instagram.
- 단위대·연맹명은 고유명사(영문 표기). 국가는 영문명.
