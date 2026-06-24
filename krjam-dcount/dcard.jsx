/* D-Count 카드 (D-가로 1480×1047) — krjam-cardnews 의 DDayWide 를 prop 기반 독립 모듈로 추출.
 * 편집 스토어/Editable 미사용: 순수 props 로만 렌더한다. krjam-dcount 의 신청 미리보기·출력 공용.
 * 의존: shapes.js · store.js · base.jsx(Card·Logo·PAL) · shapes-comp.jsx(ShapeScatter·MOTIF·scene·SCENES) · lib.jsx(Kicker·FooterBand)
 * 커스터마이즈 props: bgColor(배경색)·inkColor(글씨색)·sceneIdx(오른쪽 오브제 베리에이션)·teaser/kicker(문구)
 * ⚠️ Babel standalone 공유 스코프 → IIFE 필수. */
(function () {
  const M = window.MOTIF, sc = window.scene, P = window.PAL;
  window.GContentCtx = window.GContentCtx || React.createContext({});

  const WIDE_W = 1480, WIDE_H = 1047;

  const THEMES = [
    { bg: P.purple,   ink: '#fff',     num: P.leaf,     kicker: P.river,    fill: P.leaf,   track: 'rgba(255,255,255,.18)', cols: [P.orange, P.river, P.pink, P.leaf] },
    { bg: P.orange,   ink: P.midnight, num: P.purple,   kicker: P.midnight, fill: P.purple, track: 'rgba(77,0,110,.16)',    cols: [P.purple, P.red, P.ocean, P.forest] },
    { bg: P.ocean,    ink: '#fff',     num: '#fff',     kicker: '#fff',     fill: P.leaf,   track: 'rgba(255,255,255,.24)', cols: [P.leaf, P.orange, P.pink, P.river] },
    { bg: P.leaf,     ink: P.midnight, num: P.midnight, kicker: P.midnight, fill: P.forest, track: 'rgba(77,0,110,.16)',    cols: [P.purple, P.ocean, P.red, P.orange] },
    { bg: P.red,      ink: '#fff',     num: '#fff',     kicker: '#fff',     fill: P.pink,   track: 'rgba(255,255,255,.24)', cols: [P.pink, P.leaf, P.river, P.orange] },
    { bg: P.river,    ink: P.midnight, num: P.midnight, kicker: P.midnight, fill: P.ocean,  track: 'rgba(77,0,110,.16)',    cols: [P.purple, P.red, P.orange, P.forest] },
    { bg: P.forest,   ink: '#fff',     num: P.leaf,     kicker: P.leaf,     fill: P.leaf,   track: 'rgba(255,255,255,.2)',  cols: [P.river, P.orange, P.pink, P.leaf] },
    { bg: P.midnight, ink: '#fff',     num: P.orange,   kicker: P.river,    fill: P.orange, track: 'rgba(255,255,255,.18)', cols: [P.pink, P.leaf, P.river, P.orange] }
  ];
  const DAY_THEME = { bg: '#ffffff', ink: P.midnight, num: P.purple, kicker: P.purple, fill: P.purple, track: 'rgba(77,0,110,.16)', cols: [P.purple, P.ocean, P.forest, P.red] };

  function themeFor(dNumber, isDay) {
    if (isDay) return DAY_THEME;
    const n = parseInt(dNumber, 10) || 0;
    return THEMES[((n % THEMES.length) + THEMES.length) % THEMES.length];
  }

  /* 우측 컬럼 캠프 장면 — dday.jsx fmt==='wide' 분기를 그대로 포팅 (sceneIdx 미지정 시 기본) */
  function wideScatter(cols, isDay) {
    const c0 = cols[0], c1 = cols[1], c2 = cols[2], c3 = cols[3] || cols[0];
    if (isDay) return sc(
      M.tree(220, 880, 1.4, c3), M.tent(420, 880, 1.2, c0, c2), M.campfire(610, 880, 1.3, [c0, c1, c3]),
      M.hills(840, 880, 1.2, [c3, c1]), M.mountain(1080, 880, 1.3, c1, c2), M.sun(1330, 250, 1.0, c0)
    );
    return sc(
      M.sun(1330, 300, 1.05, c0), M.cloud(1130, 270, 0.8, c2),
      M.tree(1110, 700, 1.5, c3), M.tent(1310, 700, 1.3, c0, c2), M.campfire(1210, 870, 1.2, [c0, c1, c3]),
      M.hills(1380, 870, 1.0, [c3, c1])
    );
  }

  /* 오른쪽 오브제: sceneIdx 지정 시 SCENES[idx] 를 우측 컬럼에 배치, 아니면 기본 wideScatter */
  function scatterFor(sceneIdx, cols, isDay) {
    const has = sceneIdx != null && sceneIdx !== '' && window.SCENES && window.SCENES[sceneIdx];
    if (!has) return wideScatter(cols, isDay);
    const c = cols && cols.length ? cols : [P.orange, P.river, P.pink, P.leaf];
    return window.SCENES[sceneIdx].build(1240, 890, 1.0, [c[0], c[1] || c[0], c[2] || c[0], c[3] || c[1] || c[0]]);
  }
  window.DCOUNT_SCENE_LABELS = window.SCENE_LABELS || [];

  /* D-가로 카드 — props 만으로 렌더.
   * props: { dNumber(5~40), isDay, teaser, kicker?, bgColor?, inkColor?, sceneIdx?, theme?, footLeft?, footRight? } */
  function DCountCard({ dNumber, isDay, kicker, teaser, theme, bgColor, inkColor, sceneIdx, footLeft, footRight }) {
    const store = window.CCStore;
    const base = theme || themeFor(dNumber, isDay);
    const n = parseInt(dNumber, 10) || 0;
    const bg = bgColor || base.bg;
    const themed = !!(bgColor || inkColor);
    const autoInk = store && store.idealInk ? store.idealInk(bg) : '#fff';
    const ink = inkColor || (bgColor ? autoInk : base.ink);
    const num = themed ? ink : base.num;
    const kickerCol = themed ? ink : base.kicker;
    const fill = themed ? ink : base.fill;
    const track = themed ? (autoInk === '#fff' ? 'rgba(255,255,255,.2)' : 'rgba(77,0,110,.16)') : base.track;
    const prog = isDay ? 100 : Math.max(0, Math.min(100, Math.round((50 - n) / 50 * 100)));
    const kick = (kicker != null && kicker !== '') ? kicker : (isDay ? '2026. 8. 5 · 드디어!' : 'COUNTDOWN · ' + n + '일 전');
    return (
      <window.Card bg={bg} color={ink} pad={0}>
        <window.ShapeScatter items={scatterFor(sceneIdx, base.cols, isDay)} />
        <div style={{ position: 'absolute', top: 64, left: 84 }}><window.Kicker c={kickerCol}>{kick}</window.Kicker></div>
        {!isDay && <window.Logo size={120} style={{ position: 'absolute', top: 58, right: 96 }} />}
        {isDay && <window.Logo size={360} style={{ position: 'absolute', right: 130, top: 300 }} />}
        <div style={{ position: 'absolute', left: 84, top: 150, bottom: 210, width: 880, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="hi" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700, fontSize: 156, lineHeight: .84, color: num, letterSpacing: '.03em' }}>D-</div>
            <div style={{ fontWeight: 700, fontSize: (isDay ? 320 : 372), lineHeight: .9, color: num }}>{isDay ? 'DAY' : String(n)}</div>
            <div style={{ fontSize: 54, fontWeight: 300, marginTop: 49, color: ink, whiteSpace: 'pre-wrap' }}>{teaser}</div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 154, height: 16, background: track }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: prog + '%', background: fill }} />
        </div>
        <window.FooterBand bg="transparent" color={ink} h={130} left={footLeft || '제16회 한국잼버리'} right={footRight || '2026.8.5–8.9 · 강원 고성'} />
      </window.Card>
    );
  }

  window.DCountCard = DCountCard;
  window.dcountThemeFor = themeFor;
  window.DCOUNT_WIDE = { w: WIDE_W, h: WIDE_H };
  window.DCOUNT_THEME_COUNT = THEMES.length;
})();
