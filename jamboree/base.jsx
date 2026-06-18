/* 한국잼버리 카드뉴스 — 공유 콘텐츠 + 프리미티브 */

(function () { // module scope - Babel standalone runs scripts in shared global scope
const C = {
  brandKr: '제16회 한국잼버리',
  brandEn: '16th Korea National Jamboree',
  sub: '강원에서 펼쳐지는 청소년 글로벌 축제',
  place: '강원 세계잼버리수련장',
  loc: 'GOSEONG · GANGWON',
  dateShort: '2026.8.5 – 8.9',
  org: '한국스카우트연맹',

  // 01 표지 — Hook
  hook: '이번 여름,\n가장 큰 캠프',
  coverSub: '강원에서 펼쳐지는 청소년 글로벌 축제',

  // 02 어떤 행사야?
  what: {
    big: '4박 5일,\n상상이 현실로',
    body: '20개국에서 모인 또래 친구 약 3,000명. 강원의 자연 속에서 함께 자고, 먹고, 모험하는 국내 최대 규모의 글로벌 청소년 캠프야.'
  },

  // 03 언제·어디서?
  when: [
    { k: '언제', v: '2026. 8. 5 – 8. 9', s: '수–일 · 4박 5일' },
    { k: '어디서', v: '강원 세계잼버리수련장', s: '강원특별자치도' },
    { k: '누가', v: '20개국 약 3,000명', s: '전 세계 청소년 스카우트' }
  ],

  // 04 즐길 거리
  program: [
    { t: 'K-POP 콘서트', s: '강원의 밤하늘 아래 떼창', big: 'K' },
    { t: '전시·공연·체험', s: '보고, 만지고, 즐기는 모든 것', big: '★' },
    { t: '과정활동', s: '스카우트 미션과 야외 모험', big: '⚑' },
    { t: '개영식 · 폐영식', s: '3,000명이 한자리에', big: '✶' }
  ],

  // 05 K-POP 하이라이트
  kpop: {
    big: 'K-POP\n콘서트',
    sub: '4박 5일의 하이라이트',
    body: '강원의 밤, 무대 위 별빛과 함성이 하나 되는 순간. 전 세계 친구들과 함께 떼창할 준비 됐어?'
  },

  // 06 누구랑 함께해?
  friends: {
    countries: '20', total: '3,000',
    line: '전 세계에서 모인 또래 친구들과 4박 5일.\n여기서 사귄 친구는 평생 간다니까?'
  },

  // 07 주제
  theme: { a: '평화를 잇다', b: '지구를 살리다', c: '미래를 개척하다', en: 'Peace and Planet, Ready for Future', tag: 'P&P · R4F' },

  // 08 마무리
  outro: { l1: '재밌겠지?', l2: '기대되지?', l3: '궁금한 건 언제든 물어봐!' }
};

const PAL = {
  purple: '#622599', midnight: '#4D006E', white: '#FFFFFF',
  pink: '#FF8DFF', red: '#FF5655', orange: '#FFAE80',
  ocean: '#0094B4', river: '#82E6DE', forest: '#248737', leaf: '#9FED8F'
};

/* ── Phase 2 편집 인프라 ──
 * 카드 내부 컴포넌트(Editable/Placeholder)가 자기 자신을 우측 패널에 '등록'하면
 * 제작기 셸이 카드별 폼을 자동 생성한다. (카드마다 스키마를 손으로 적지 않음) */
window.CCRegisterFieldCtx = React.createContext(null);   // (ekey, label) → 텍스트 폼
window.CCRegisterPhotoCtx = React.createContext(null);   // (slot, label) → 사진 업로드
window.CCRegisterSceneCtx = React.createContext(null);   // (scope) → 가운데 오브제(장면) 선택 폼
window.CCCardBgCtx = React.createContext(null);          // 현재 카드 배경색 → Logo가 흰/컬러 엠블럼 선택
window.CCFooterCtx = React.createContext(null);          // 콘텐츠 자동 푸터 {title,color,ink,page,total} (null=끔)

/* 스토어 구독 훅 — 폼/인라인 어느 쪽에서 바꿔도 카드가 즉시 갱신 */
function useCCStore() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => window.CCStore.sub(force), []);
  return window.CCStore;
}

/* React children → 순수 텍스트 (<br/>=공백, 중첩 span 재귀) — 폼 입력 기본값용 */
function textOf(node) {
  if (node == null || node === false || node === true) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node.type === 'br') return ' ';
  if (node.props && node.props.children != null) return textOf(node.props.children);
  return '';
}

/* Card shell — 1080×1080, clipped, brand body font */
function Card({ bg, color = '#fff', pad = 88, children, style }) {
  return (
    <window.CCCardBgCtx.Provider value={bg}>
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', background: bg, color,
        fontFamily: "var(--cc-main, 'Cafe24ProSlim'), 'Apple SD Gothic Neo', sans-serif",
        letterSpacing: 'var(--cc-track, normal)', ...style
      }}>
        {/* 전체 여백: 콘텐츠만 안쪽으로 축소(배경색은 가장자리까지 유지) */}
        <div style={{ position: 'absolute', inset: 0, padding: pad, boxSizing: 'border-box', transform: 'scale(var(--cc-content-scale, 1))', transformOrigin: 'center center' }}>
          {children}
        </div>
      </div>
    </window.CCCardBgCtx.Provider>
  );
}

/* 엠블럼 — 어두운 배경에서는 흰색 버전, 밝은 배경에서는 컬러 버전을 자동 선택.
 * (배경 밝기 판정은 store.idealInk: 흰 잉크 추천 = 어두운 배경) */
function Logo({ size = 150, style }) {
  const store = useCCStore();
  const bg = React.useContext(window.CCCardBgCtx);
  const onDark = store.idealInk(bg) === '#fff';
  const src = onDark
    ? (store.getImage('logo-white') || store.getImage('logo') || 'jamboree/assets/logo-white.png')
    : (store.getImage('logo') || 'jamboree/assets/logo.png');
  // 바깥 span = 호출부 위치(절대배치/translateX 등), 안쪽 img = 전역 엠블럼 트윅(크기·위치)
  return (
    <span style={{ display: 'inline-block', lineHeight: 0, ...style }}>
      <img src={src} alt="제16회 한국잼버리 엠블럼" width={size} height={size}
        style={{ display: 'block', objectFit: 'contain', transformOrigin: 'center',
          transform: 'translate(var(--cc-logo-dx,0px), var(--cc-logo-dy,0px)) scale(var(--cc-logo-scale,1))' }} />
    </span>
  );
}

function Pill({ children, bg, color, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, background: bg, color,
      borderRadius: 999, padding: '14px 28px', fontSize: 30, fontWeight: 700,
      fontFamily: "'Cafe24ProSlim',sans-serif", ...style
    }}>{children}</span>
  );
}

/* Striped photo placeholder with monospace label.
 * slot 지정 시: (1) 업로드된 사진이 있으면 그 사진을 cover로 렌더,
 *              (2) 우측 패널 '사진' 목록에 자기 자신을 등록한다. */
function Placeholder({ label = '현장 사진', tone = 'light', radius = 0, slot, slotLabel, style }) {
  const store = useCCStore();
  const register = React.useContext(window.CCRegisterPhotoCtx);
  React.useEffect(() => { if (slot && register) register(slot, slotLabel || label || slot); }, [slot]);
  const img = slot ? store.getImage(slot) : null;
  if (img) {
    return (
      <div style={{ position: 'relative', borderRadius: radius, overflow: 'hidden', ...style }}>
        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  const dark = tone === 'dark';
  const a = dark ? 'rgba(255,255,255,.12)' : 'rgba(98,37,153,.10)';
  const b = dark ? 'rgba(255,255,255,.04)' : 'rgba(98,37,153,.035)';
  const ink = dark ? 'rgba(255,255,255,.74)' : 'rgba(77,0,110,.62)';
  const brd = dark ? 'rgba(255,255,255,.4)' : 'rgba(98,37,153,.32)';
  return (
    <div style={{
      position: 'relative', borderRadius: radius, overflow: 'hidden',
      background: `repeating-linear-gradient(45deg, ${a} 0 16px, ${b} 16px 32px)`,
      border: `2px dashed ${brd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style
    }}>
      {label ? <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 22, letterSpacing: '.05em', color: ink, textTransform: 'uppercase' }}>◳ {label}</span> : null}
    </div>
  );
}

/* Overlapping circle cluster — logo-knot echo (decorative, any colors) */
function GeoCluster({ style, scale = 1 }) {
  const cs = [
    { c: PAL.orange, d: 124, x: 0, y: 44 },
    { c: PAL.river, d: 90, x: 100, y: 0 },
    { c: PAL.leaf, d: 74, x: 156, y: 92 },
    { c: PAL.pink, d: 60, x: 64, y: 128 }
  ];
  return (
    <div style={{ position: 'absolute', ...style }}>
      {cs.map((o, i) => (
        <span key={i} style={{ position: 'absolute', left: o.x * scale, top: o.y * scale, width: o.d * scale, height: o.d * scale, borderRadius: '50%', background: o.c }} />
      ))}
    </div>
  );
}

Object.assign(window, { C, PAL, Card, Logo, Pill, Placeholder, GeoCluster, useCCStore, textOf });
})();
