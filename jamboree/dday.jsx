/* D-## 카운트다운 — WOSM 팔레트 풀활용 · 3비율 · 여백 Tweak
 * Phase 2: D숫자(구조 필드, 진행바 자동 재계산) + 티저(인라인/폼) + 배경색 오버라이드(cc-prop:<ek>) */

(function () { // module scope - Babel standalone runs scripts in shared global scope
/* 도형 스캐터 — 우측 컬러 클러스터 + 코너 블리더 (숫자/카피 영역 회피) */
function ddScatter(i, isDay, cols, bleed) {
  if (isDay) return [
    { n: '03', outline: true, fill: bleed, h: 320, top: -100, left: -100 },
    { n: '02', fill: cols[0], h: 60, top: 132, right: 540 },
    { n: '05', fill: cols[1], h: 78, top: 150, right: 360, rot: 90 },
    { n: '04', fill: cols[2], h: 50, bottom: 300, right: 470 },
    { n: '06', fill: cols[3], h: 92, bottom: 285, right: 360 }
  ];
  const L = [
    [['02', 132, 248, 110], ['04', 76, 300, 300], ['05', 98, 444, 86], ['06', 132, 566, 250]],
    [['05', 116, 240, 200], ['02', 134, 386, 86], ['04', 66, 524, 270], ['03', 90, 604, 124]],
    [['06', 152, 250, 116], ['04', 72, 262, 304], ['02', 60, 432, 252], ['05', 100, 566, 96]],
    [['03', 124, 250, 150], ['05', 84, 384, 86], ['06', 128, 504, 240], ['04', 58, 628, 120]],
    [['04', 124, 248, 108], ['02', 72, 360, 286], ['05', 104, 472, 88], ['06', 110, 600, 230]]
  ];
  const arr = L[i % L.length].map((s, k) => ({ n: s[0], fill: cols[k % cols.length], h: s[1], top: s[2], right: s[3] }));
  arr.push({ n: i % 2 ? '02' : '05', outline: true, fill: bleed, h: 560, bottom: -170, left: -150 });
  return arr;
}

/* 오버라이드(배경색·D숫자) 반영한 유효값 — 3비율 컴포넌트가 공유 */
function useDDeff(c) {
  const store = useCCStore();
  const ov = store.getProps(c.ek);
  const themed = !!ov.bg;
  const bg = ov.bg || c.bg;
  const ink = themed ? store.idealInk(bg) : c.ink;
  const numColor = themed ? store.idealInk(bg) : c.num;
  const kickerColor = themed ? numColor : c.kickerColor;
  const fill = themed ? numColor : c.fill;
  const track = themed ? (ink === '#fff' ? 'rgba(255,255,255,.2)' : 'rgba(77,0,110,.16)') : c.track;
  const bleed = themed ? (ink === '#fff' ? 'rgba(255,255,255,.08)' : 'rgba(77,0,110,.07)') : c.bleed;
  const n = (ov.n != null && ov.n !== '') ? (parseInt(ov.n, 10) || 0) : c.n;
  const prog = c.isDay ? 100 : Math.max(0, Math.min(100, Math.round((50 - n) / 50 * 100)));
  const kickerText = c.isDay ? c.kickerText : ('COUNTDOWN · ' + n + '일 전');
  return { bg, ink, numColor, kickerColor, fill, track, bleed, n, prog, kickerText };
}

function NumStack({ ek, numColor, ink, isDay, num, teaser, dSize, nSize, tSize, gap, lead = 0, align = 'flex-start' }) {
  return (
    <div className="hi" style={{ display: 'flex', flexDirection: 'column', alignItems: align }}>
      <div style={{ fontWeight: 700, fontSize: dSize, lineHeight: .9, color: numColor, letterSpacing: '.03em' }}>D-</div>
      <div style={{ fontWeight: 700, fontSize: nSize, lineHeight: .92, color: numColor, marginTop: lead }}>{isDay ? 'DAY' : String(num)}</div>
      <Editable ekey={ek + '-teaser'} flabel="티저" tag="div" style={{ fontSize: tSize, fontWeight: 300, marginTop: gap != null ? gap : Math.round(tSize * 0.9), color: ink, textAlign: align === 'center' ? 'center' : 'left' }}>{teaser}</Editable>
    </div>
  );
}

function Prog({ prog, fill, track, bottom }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom, height: 16, background: track }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: prog + '%', background: fill }} />
    </div>
  );
}

/* 정사각 1080×1080 */
function DDaySquare({ c }) {
  const tw = React.useContext(window.DDayTweakCtx) || {}; const ns = tw.numScale || 1;
  const e = useDDeff(c);
  return (
    <Card bg={e.bg} color={e.ink} pad={0}>
      <ShapeScatter items={ddScatter(c.i, c.isDay, c.cols, e.bleed)} />
      <div style={{ position: 'absolute', top: 70, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Kicker c={e.kickerColor}>{e.kickerText}</Kicker>{!c.isDay && <Logo size={100} />}
      </div>
      {c.isDay && <Logo size={300} style={{ position: 'absolute', right: 80, top: 350 }} />}
      <div style={{ position: 'absolute', left: 72, right: 72, top: 220 + (tw.topAdj || 0), bottom: 240 + (tw.botAdj || 0), display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <NumStack ek={c.ek} numColor={e.numColor} ink={e.ink} isDay={c.isDay} num={e.n} teaser={c.teaser} dSize={120 * ns} nSize={272 * ns} tSize={44} gap={40 + (tw.gapAdj || 0)} lead={tw.lineAdj || 0} />
      </div>
      <Prog prog={e.prog} fill={e.fill} track={e.track} bottom={186} />
      <FooterBand bg="transparent" color={e.ink} brandFoot />
    </Card>
  );
}

/* 세로형 인스타 1080×1350 */
function DDayTall({ c }) {
  const tw = React.useContext(window.DDayTweakCtx) || {}; const ns = tw.numScale || 1;
  const e = useDDeff(c);
  return (
    <Card bg={e.bg} color={e.ink} pad={0}>
      <ShapeScatter items={ddScatter(c.i, c.isDay, c.cols, e.bleed)} />
      <div style={{ position: 'absolute', top: 92, left: 80, right: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <Logo size={c.isDay ? 230 : 116} />
        <Kicker c={e.kickerColor} style={{ textAlign: 'center' }}>{e.kickerText}</Kicker>
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 360 + (tw.topAdj || 0), bottom: 300 + (tw.botAdj || 0), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <NumStack ek={c.ek} numColor={e.numColor} ink={e.ink} isDay={c.isDay} num={e.n} teaser={c.teaser} dSize={150 * ns} nSize={336 * ns} tSize={50} gap={45 + (tw.gapAdj || 0)} lead={tw.lineAdj || 0} align="center" />
      </div>
      <Prog prog={e.prog} fill={e.fill} track={e.track} bottom={214} />
      <FooterBand bg="transparent" color={e.ink} brandFoot h={160} />
    </Card>
  );
}

/* A4 가로 1480×1047 */
function DDayWide({ c }) {
  const tw = React.useContext(window.DDayTweakCtx) || {}; const ns = tw.numScale || 1;
  const e = useDDeff(c);
  return (
    <Card bg={e.bg} color={e.ink} pad={0}>
      <ShapeScatter items={ddScatter(c.i, c.isDay, c.cols, e.bleed)} />
      <div style={{ position: 'absolute', top: 64, left: 84 }}><Kicker c={e.kickerColor}>{e.kickerText}</Kicker></div>
      {!c.isDay && <Logo size={120} style={{ position: 'absolute', top: 58, right: 96 }} />}
      {c.isDay && <Logo size={360} style={{ position: 'absolute', right: 130, top: 300 }} />}
      <div style={{ position: 'absolute', left: 84, top: 150 + (tw.topAdj || 0), bottom: 210 + (tw.botAdj || 0), width: 880, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <NumStack ek={c.ek} numColor={e.numColor} ink={e.ink} isDay={c.isDay} num={e.n} teaser={c.teaser} dSize={156 * ns} nSize={(c.isDay ? 320 : 372) * ns} tSize={54} gap={49 + (tw.gapAdj || 0)} lead={tw.lineAdj || 0} />
      </div>
      <Prog prog={e.prog} fill={e.fill} track={e.track} bottom={154} />
      <FooterBand bg="transparent" color={e.ink} brandFoot h={130} />
    </Card>
  );
}

const P = PAL;
/* WOSM 팔레트 로테이션: 어두운 배경=밝은 숫자 / 밝은 배경=어두운 숫자 (모두 대비 통과) */
const DD = [
  { n: 50, bg: P.purple, ink: '#fff', num: P.leaf, kickerColor: P.river, fill: P.leaf, track: 'rgba(255,255,255,.18)', cols: [P.orange, P.river, P.pink, P.leaf], teaser: '이제 50일! 카운트다운 시작' },
  { n: 40, bg: P.orange, ink: P.midnight, num: P.purple, kickerColor: P.midnight, fill: P.purple, track: 'rgba(77,0,110,.16)', cols: [P.purple, P.red, P.ocean, P.forest], teaser: '세계가 강원으로 향합니다' },
  { n: 30, bg: P.ocean, ink: '#fff', num: '#fff', kickerColor: '#fff', fill: P.leaf, track: 'rgba(255,255,255,.24)', cols: [P.leaf, P.orange, P.pink, P.river], teaser: '한 달 뒤, 캠프가 열려요' },
  { n: 20, bg: P.leaf, ink: P.midnight, num: P.midnight, kickerColor: P.midnight, fill: P.forest, track: 'rgba(77,0,110,.16)', cols: [P.purple, P.ocean, P.red, P.orange], teaser: '스무 밤만 자면!' },
  { n: 10, bg: P.red, ink: '#fff', num: '#fff', kickerColor: '#fff', fill: P.pink, track: 'rgba(255,255,255,.24)', cols: [P.pink, P.leaf, P.river, P.orange], teaser: '열흘 앞으로 성큼' },
  { n: 5, bg: P.river, ink: P.midnight, num: P.midnight, kickerColor: P.midnight, fill: P.ocean, track: 'rgba(77,0,110,.16)', cols: [P.purple, P.red, P.orange, P.forest], teaser: '이제 정말 코앞이야' },
  { n: 1, bg: P.midnight, ink: '#fff', num: P.orange, kickerColor: P.river, fill: P.orange, track: 'rgba(255,255,255,.18)', cols: [P.pink, P.leaf, P.river, P.orange], teaser: '내일, 드디어 만나요' },
  { dday: true, bg: P.pink, ink: P.midnight, num: P.midnight, kickerColor: P.purple, fill: P.purple, track: 'rgba(77,0,110,.16)', cols: [P.purple, P.ocean, P.forest, P.red], teaser: '드디어 개영! 기대되지?' }
];

function buildDD(Comp, fmt) {
  return DD.map((x, i) => {
    const isDay = !!x.dday;
    const id = isDay ? 'dday' : 'd' + x.n;
    const label = isDay ? 'D-DAY' : 'D-' + x.n;
    const kickerText = isDay ? '2026. 8. 5 · 드디어!' : 'COUNTDOWN · ' + x.n + '일 전';
    const bleed = x.ink === '#fff' ? 'rgba(255,255,255,.08)' : 'rgba(77,0,110,.07)';
    const c = { ...x, i, isDay, kickerText, bleed, ek: fmt + '-' + id };
    return { id, label, node: <Comp c={c} /> };
  });
}

window.SEC_DDAY = buildDD(DDaySquare, 'feed');
window.SEC_DDAY_TALL = buildDD(DDayTall, 'story');
window.SEC_DDAY_WIDE = buildDD(DDayWide, 'wide');
})();
