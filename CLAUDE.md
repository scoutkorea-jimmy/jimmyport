# jimmypark.net — Project Brief (Claude must read first)

> 이 문서는 Claude가 작업을 시작하기 전 항상 먼저 확인해야 합니다.
> 사이트의 정체성, 톤, 컬러, 정보구조가 여기서 결정됩니다.
> 추가 사양은 `data/design.json` (디자인 가이드)와 `data/kms.json` (기능 명세)에 보관됩니다.

---

## 1. Site purpose

이 사이트는 단순 포트폴리오가 아닙니다. 동시에 세 가지를 만족해야 합니다:

1. **박지민이라는 사람 자체를 소개하는 아카이브**
2. **업무 및 협업을 위한 신뢰 기반 소개서**
3. **스스로의 작업과 방향성을 기록하는 장기 문서**

따라서 방향은 "화려한 포트폴리오"보다 **"오래 남는 구조화된 기록"**.

---

## 2. UX/UI principles (반드시 준수)

- 복잡한 정보를 사람이 이해하기 쉬운 구조로 정리
- 과도한 인터랙션보다 명확한 흐름과 리듬을 우선
- 웹사이트이면서 동시에 **PDF 문서처럼 읽히게** 설계
- 각 섹션은 PDF 출력 시 페이지 단위로 자연스럽게 분리 (`page-break-inside: avoid`)
- 정보의 양보다 **구조적 안정감과 문장 밀도**가 중요
- "결과물 전시"보다 "사고방식과 운영 감각"
- 컨설팅 회사 느낌 X · "오래 현장에서 일해온 사람의 기록"처럼
- 스펙 과시 X · 관점과 태도가 드러나는 방향
- "한 번 소비되는 사이트" X · "다시 열어보게 되는 아카이브"

성격: **디지털 소개서 · 운영 철학 문서 · 글로벌 프로젝트 기록집 · 장기 아카이브 · PDF 저장 가능한 개인 브랜딩 북**

---

## 3. Language structure (bilingual editorial)

- **메인 언어 = 영어**
- 한국어는 **보조 해설 / sub text** 로 함께 제공
- 한국어는 번역 느낌이 아니라 자연스러운 보조 해설
- 영어가 메인 리듬, 한국어가 의미 보완

예시:

```
Complex stories and structures,
made clearer.

복잡한 이야기와 구조를
조금 더 명확하게 정리합니다.
```

CSS 구현: `.bilingual-en` (큰 영문) + `.bilingual-ko` (작은 한국어, muted gray).

---

## 4. Site flow — 8 sections (불변)

1. **WHO I AM** — 태도·방식·정체성. 직접 설명형 금지("저는 ~합니다" X)
2. **HOW I WORK** — 4 pillars: Video / Web · Digital / International · Global / Education · Speaking
3. **GLOBAL FIELD EXPERIENCE** — 18개국+ 자동 카운팅 + 현장 관찰 카피 + 국가 카드(왜 갔는지 + 관련 Experience 연계)
4. **WHAT I BUILD** — Portfolio (영상 · PM · 운영 · 글로벌 · 커뮤니케이션 · 웹 · 교육 · 문서화). 카드 클릭 → 모달(개요·문제·접근·운영구조·결과·기록·링크·도구)
5. **EDUCATION & SPEAKING** — 강의 활동. "어떤 주제 · 누구와 · 무엇을 전달"
6. **EXPERIENCE & CAREER** — 회사 단위 시간 순. 사람 중심
7. **PRINCIPLES** — 운영 원칙 메모 톤
8. **LET'S CONNECT** — Contact

각 섹션은 `section.archive-page` 단위로 독립, PDF 출력 시 페이지 단위 자연 분리.

> 사이트를 끝까지 읽고 나면 "무슨 일을 하는 사람"이 아니라 **"문제와 구조를 이런 방식으로 다루는 사람"**으로 남아야 함.

---

## 5. COLOR & VISUAL DIRECTION (필수 준수)

### Tone
- 트렌디함 X · **신뢰감 + 깊이 + 오래 남는 분위기**
- 전략 문서 · 글로벌 필드노트 · 에디토리얼 아카이브 · 장기 기록물 같은 인상
- 와인바/럭셔리/감성 브랜딩 느낌 금지
- 크리에이티브 에이전시 느낌 금지

### Color tokens (CSS `:root`)

| 토큰 | Hex | 용도 |
|---|---|---|
| `--accent` (Burgundy) | **`#6E1F32`** | 강조 only — link hover, section highlight, key typography, divider accent, active states, editorial markers |
| `--accent-ink` (Rose) | `#8A3445` | accent의 hover/secondary |
| `--bg` (Warm paper) | **`#F6F3EF`** | main background. 절대 순백(#FFF) 사용 금지 |
| `--surface` (Lighter paper) | `#FAF8F4` | card / panel surface |
| `--ink` (Deep charcoal) | **`#1E1E1E`** | 본문 텍스트. 완전 블랙(#000) 금지 |
| `--muted` (Warm gray) | **`#6B6763`** | 보조 텍스트: 한국어 서브, description, caption, metadata, dates |
| `--line` (Soft neutral) | **`#D8D2CB`** | divider · 얇은 border. 과한 사용 금지 |
| `--soft` (Warm tint) | `#EBE7E0` | 약한 배경 강조 |

### Burgundy usage rule
- 사이트 전체를 버건디로 덮지 말 것
- "중요한 생각 · 연결 포인트 · 기억되어야 할 문장"에만 최소한
- 사용처: Hero 핵심 단어 · active nav · quote marker · small label · hover · principles numbering · editorial divider

### Visual tone keywords (do)
- Editorial Archive · Field Notes · Structured Minimalism · Quiet Confidence · Operational Elegance · Human-centered Systems

### Forbidden (don't)
- 스타트업 SaaS 랜딩페이지 / 화려한 에이전시 / Behance 스타일 / 블랙 기반 포트폴리오 / 미래적 UI / 과한 glassmorphism / neon / gradient-heavy UI

### Typography
- Sans-serif humanist (Inter / Geist / IBM Plex Sans / Suisse Int'l / Neue Haas Grotesk)
- 한글: Pretendard / SUIT / Paperlogy / Wanted Sans
- line-height 넉넉하게, 자간 좁히지 말 것
- geometric 폰트 피하기

### Print / PDF
- 인쇄 시 대비 유지 · 흑백 출력 시 정보 계층 유지
- 버건디는 인쇄 시 검게 뭉개지지 않도록 (#6E1F32은 print-safe)
- `@media print` 필수 — `page-break-inside: avoid`, hide header/nav/modal, simplify grids

---

## 6. Operating rules (jimmyport-specific)

- **자동 commit + push + 배포**: 변경 검증 통과 즉시 git commit + push + (시크릿 없는 동안) `wrangler pages deploy . --project-name jimmyport`. 별도 지시 없어도 진행. 로컬 dev server 띄우지 말 것.
- **버전**: `VERSION` (사이트) + `ADMIN_VERSION` (관리자). 의미 있는 변경마다 patch+1.
- **데이터 소스**: `data/site-config.json` · `data/portfolio.json` · `data/career.json` · `data/kms.json` · `data/wiki.json` · `data/design.json`
- **관리자**: `manage.html`에서 KMS · Wiki · Design Guide 패널은 제거됨 (편집 금지, 코드 레벨에서만 관리)
- **배포 경로**: GitHub Actions `deploy-on-push.yml` (Cloudflare secrets 누락 중 → 로컬 wrangler 호출로 우회)

---

## 7. Final impression check

작업이 끝났을 때 사이트가 **"잘 만든 크리에이터 포트폴리오"**가 아니라
**"생각과 구조를 오래 다뤄온 사람의 디지털 아카이브"**처럼 보여야 합니다.

버건디는 그 안에서 **"조용한 중심감"**으로 존재해야 합니다.
