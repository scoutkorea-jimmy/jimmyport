/* D-## 카운트다운 — WOSM 팔레트 풀활용 · 3비율 · 여백 Tweak
 * Phase 2: D숫자(구조 필드, 진행바 자동 재계산) + 티저(인라인/폼) + 배경색 오버라이드(cc-prop:<ek>) */

(function () { // module scope - Babel standalone runs scripts in shared global scope
/* 캠핑/자연물 풍경 — 무작위 더미 대신 나무·텐트·모닥불·태양·언덕·산으로 구성.
 * 숫자/티저/로고/푸터 영역을 피해 우측 컬럼 또는 상하 빈 띠에 '캠프 장면'을 배치. */
const M = window.MOTIF, sc = window.scene;

/* ── D-피드 우측 그래픽 베리에이션 (17종) ──────────────────────────────
 * 우측 컬럼(x~700-1070, y~240-1090, 진행바/푸터 위)에 캠핑/자연물 장면.
 * 각 함수 C={c0,c1,c2,c3} → items[]. 우측 패널 "오른쪽 그래픽"으로 선택. */
const _star = (cx, cy, h, c) => ({ n: '02', fill: c, h, left: cx - h / 2, top: cy - h / 2 });
const _bird = (cx, cy, h, c) => ({ n: '06', fill: c, h, left: cx - h * 0.25, top: cy - h / 2, rot: -90 });
const FEED_GFX = [
  (C) => sc(M.sun(975, 300, 1.05, C.c0), M.cloud(800, 320, 0.8, C.c2), M.tree(840, 770, 1.4, C.c3), M.tent(995, 770, 1.15, C.c0, C.c2), M.campfire(905, 980, 1.25, [C.c0, C.c1, C.c3]), M.hills(900, 1080, 1.0, [C.c3, C.c1])), // 캠프사이트
  (C) => sc(M.sun(990, 300, 0.9, C.c0), M.tree(800, 560, 1.0, C.c3), M.tree(960, 650, 1.3, C.c1), M.tree(870, 860, 1.7, C.c3), M.hills(890, 1080, 1.1, [C.c1, C.c3])), // 숲
  (C) => sc(M.sun(980, 300, 0.9, C.c0), M.mountain(870, 760, 1.95, C.c1, C.c2), M.mountain(960, 820, 1.3, C.c2, C.c1), M.hills(880, 1080, 1.1, [C.c3, C.c1])), // 산맥
  (C) => sc(M.sun(985, 300, 0.85, C.c2), _star(820, 340, 26, C.c0), _star(900, 400, 18, C.c1), _star(1000, 430, 22, C.c3), M.tent(885, 790, 1.55, C.c0, C.c2), M.campfire(900, 1010, 1.45, [C.c0, C.c1, C.c3])), // 밤 캠프
  (C) => sc(M.tree(800, 560, 0.9, C.c3), M.backpack(905, 800, 1.45, C.c2, C.c1), M.tent(870, 1015, 1.1, C.c0, C.c2)), // 장비
  (C) => sc(M.sun(990, 300, 0.85, C.c0), M.tent(810, 800, 1.05, C.c1, C.c2), M.tent(985, 840, 1.25, C.c0, C.c2), M.campfire(895, 1010, 1.2, [C.c1, C.c0, C.c3]), M.hills(890, 1090, 1.0, [C.c3, C.c1])), // 그룹 캠프
  (C) => sc(M.mountain(880, 740, 1.75, C.c1, C.c2), M.tree(800, 770, 1.0, C.c3), M.hills(885, 910, 1.25, [C.c3, C.c1]), M.hills(895, 1030, 1.15, [C.c1, C.c3])), // 호숫가
  (C) => sc(M.sun(890, 430, 1.7, C.c0), M.hills(815, 1050, 1.25, [C.c3, C.c1]), M.hills(965, 1090, 1.05, [C.c1, C.c3])), // 해+초원
  (C) => sc(M.sun(990, 300, 0.8, C.c0), M.tree(885, 880, 2.15, C.c3), M.hills(885, 1085, 1.1, [C.c1, C.c3])), // 큰 소나무
  (C) => sc(M.sun(990, 300, 0.8, C.c0), M.mountain(875, 740, 1.7, C.c1, C.c2), M.backpack(905, 1000, 1.1, C.c2, C.c0)), // 산+가방
  (C) => sc(M.tree(795, 560, 0.8, C.c3), M.tree(985, 560, 0.8, C.c1), M.campfire(885, 880, 2.1, [C.c0, C.c1, C.c3]), M.hills(885, 1085, 1.0, [C.c3, C.c1])), // 모닥불 중심
  (C) => sc(M.sun(985, 300, 0.9, C.c0), _bird(820, 360, 46, C.c2), _bird(900, 410, 40, C.c2), M.tent(885, 830, 1.7, C.c0, C.c2), M.hills(885, 1085, 1.0, [C.c3, C.c1])), // 텐트+새
  (C) => sc(M.sun(985, 300, 0.85, C.c0), M.hills(835, 700, 1.35, [C.c3, C.c1]), M.hills(945, 830, 1.25, [C.c1, C.c3]), M.hills(870, 970, 1.35, [C.c3, C.c1]), M.hills(900, 1090, 1.25, [C.c1, C.c3])), // 언덕 겹층
  (C) => sc(M.cloud(870, 330, 1.0, C.c2), M.mountain(900, 770, 1.7, C.c1, C.c2), M.tree(790, 790, 1.1, C.c3), M.hills(890, 1085, 1.0, [C.c3, C.c1])), // 산+나무+구름
  (C) => sc(M.tree(790, 790, 1.05, C.c3), M.tent(905, 810, 1.1, C.c0, C.c2), M.backpack(1005, 835, 0.78, C.c2, C.c1), M.campfire(850, 1015, 1.1, [C.c0, C.c1, C.c3]), M.hills(890, 1090, 1.0, [C.c3, C.c1])), // 풀 장비
  (C) => sc(M.sun(900, 410, 1.45, C.c0), M.mountain(890, 830, 1.6, C.c1, C.c2), M.hills(890, 1085, 1.0, [C.c3, C.c1])), // 미니멀
  (C) => sc(M.cloud(815, 320, 1.0, C.c2), M.sun(985, 340, 0.9, C.c0), M.tree(885, 880, 1.75, C.c3), M.campfire(885, 1015, 1.0, [C.c0, C.c1, C.c3]), M.hills(885, 1090, 1.0, [C.c3, C.c1])) // 해+구름+나무
];
window.FEED_GFX_COUNT = FEED_GFX.length;
window.FEED_GFX_LABELS = ['캠프사이트', '숲', '산맥', '밤 캠프', '장비', '그룹 캠프', '호숫가', '해+초원', '큰 소나무', '산+가방', '모닥불 중심', '텐트+새', '언덕 겹층', '산+나무+구름', '풀 장비', '미니멀', '해+구름+나무'];

function ddScatter(i, isDay, cols, bleed, fmt, gfx) {
  const c0 = cols[0], c1 = cols[1], c2 = cols[2], c3 = cols[3] || cols[0];
  if (fmt === 'feed' && !isDay) {
    const def = i % FEED_GFX.length;
    let gi = (gfx != null && gfx !== '') ? (parseInt(gfx, 10) || 0) : def;
    gi = ((gi % FEED_GFX.length) + FEED_GFX.length) % FEED_GFX.length;
    return FEED_GFX[gi]({ c0, c1, c2, c3 });
  }
  if (fmt === 'story') {
    if (isDay) return sc(                                  // 1080×1920, 큰 로고 중앙 → 하단 띠에 캠프
      M.mountain(820, 1560, 1.4, c1, c2), M.tree(250, 1560, 1.4, c3),
      M.tent(470, 1560, 1.2, c0, c2), M.campfire(660, 1560, 1.3, [c0, c1, c3]), M.hills(940, 1560, 1.2, [c3, c1]),
      M.sun(870, 470, 1.0, c0)
    );
    return sc(                                             // 상단 띠(로고 아래) + 하단 띠
      M.sun(560, 470, 1.0, c0), M.cloud(840, 470, 0.8, c2),
      M.tree(240, 660, 1.4, c3), M.tent(430, 660, 1.2, c0, c2), M.mountain(850, 660, 1.4, c1, c2),
      M.campfire(360, 1560, 1.5, [c0, c1, c3]), M.hills(720, 1560, 1.3, [c3, c1]), M.tree(910, 1560, 1.1, c3)
    );
  }
  if (fmt === 'wide') {
    if (isDay) return sc(                                  // 1480×1047, 큰 로고 우중앙 → 하단 캠프
      M.tree(220, 880, 1.4, c3), M.tent(420, 880, 1.2, c0, c2), M.campfire(610, 880, 1.3, [c0, c1, c3]),
      M.hills(840, 880, 1.2, [c3, c1]), M.mountain(1080, 880, 1.3, c1, c2), M.sun(1330, 250, 1.0, c0)
    );
    return sc(                                             // 우측 컬럼 캠프 + 태양
      M.sun(1330, 300, 1.05, c0), M.cloud(1130, 270, 0.8, c2),
      M.tree(1110, 700, 1.5, c3), M.tent(1310, 700, 1.3, c0, c2), M.campfire(1210, 870, 1.2, [c0, c1, c3]),
      M.hills(1380, 870, 1.0, [c3, c1])
    );
  }
  /* feed (1080×1350) D-DAY — 큰 로고 중앙 → 하단 캠프 띠 */
  return sc(
    M.tree(190, 1060, 1.3, c3), M.tent(380, 1060, 1.15, c0, c2), M.campfire(560, 1060, 1.2, [c0, c1, c3]),
    M.hills(780, 1060, 1.1, [c3, c1]), M.mountain(960, 1060, 1.2, c1, c2), M.sun(880, 250, 0.9, c0)
  );
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
  const autoKicker = c.isDay ? c.kickerText : ('COUNTDOWN · ' + n + '일 전');
  const kickerText = (ov.kicker != null && ov.kicker !== '') ? ov.kicker : autoKicker;
  // 정렬 오버라이드: left/center/right → flex align
  const align = ov.align === 'center' ? 'center' : ov.align === 'right' ? 'flex-end' : ov.align === 'left' ? 'flex-start' : null;
  return { bg, ink, numColor, kickerColor, fill, track, bleed, n, prog, kickerText, align, gfx: ov.gfx };
}

function NumStack({ ek, numColor, ink, isDay, num, teaser, dSize, nSize, tSize, gap, lead = 0, align = 'flex-start' }) {
  const ta = align === 'center' ? 'center' : align === 'flex-end' ? 'right' : 'left';
  const tw = React.useContext(window.DDayTweakCtx) || {};
  const dx1 = tw.dx1 || 0, dx2 = tw.dx2 || 0;   // 1행("D-")·2행(숫자) 좌우 이동
  return (
    <div className="hi" style={{ display: 'flex', flexDirection: 'column', alignItems: align }}>
      <div style={{ fontWeight: 700, fontSize: dSize, lineHeight: .84, color: numColor, letterSpacing: '.03em', transform: dx1 ? `translateX(${dx1}px)` : undefined }}>D-</div>
      <div style={{ fontWeight: 700, fontSize: nSize, lineHeight: .9, color: numColor, marginTop: lead, transform: dx2 ? `translateX(${dx2}px)` : undefined }}>{isDay ? 'DAY' : String(num)}</div>
      <Editable ekey={ek + '-teaser'} flabel="티저" tag="div" style={{ fontSize: tSize, fontWeight: 300, marginTop: gap != null ? gap : Math.round(tSize * 0.9), color: ink, textAlign: ta }}>{teaser}</Editable>
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
  const store = useCCStore();
  const e = useDDeff(c);
  const wmDark = e.ink === '#fff';   // 어두운 배경=흰 매듭 / 밝은 배경=어두운(invert) 매듭
  // 선택한 엠블럼을 배경 워터마크에도 반영(없으면 기본 매듭 에셋). 커스텀 엠블럼은 invert 안 함.
  const wmCustom = wmDark ? store.getImage('logo-white') : store.getImage('logo');
  const wmSrc = wmCustom || 'jamboree/assets/logo-asset.png';
  const wmFilter = (!wmCustom && !wmDark) ? 'invert(1)' : 'none';
  return (
    <Card bg={e.bg} color={e.ink} pad={0}>
      {/* 잼버리 매듭(엠블럼) 배경 워터마크 — 크기/위치/농도 트윅(--cc-wm-*) */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <img src={wmSrc} alt="" style={{ position: 'absolute', width: 1560, height: 1560, left: -480, top: 110, objectFit: 'contain', opacity: 'calc(' + (wmDark ? 0.13 : 0.1) + ' * var(--cc-wm-opacity, 1))', filter: wmFilter, transform: 'translate(var(--cc-wm-dx,0px), var(--cc-wm-dy,0px)) rotate(var(--cc-wm-rot,0deg)) scale(var(--cc-wm-scale,1))', transformOrigin: 'center center' }} />
      </div>
      <ShapeScatter items={ddScatter(c.i, c.isDay, c.cols, e.bleed, c.fmt, e.gfx)} />
      <div style={{ position: 'absolute', top: 70, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Kicker c={e.kickerColor}>{e.kickerText}</Kicker>{!c.isDay && <Logo size={100} />}
      </div>
      {c.isDay && <Logo size={250} style={{ position: 'absolute', right: 64, top: 300 }} />} {/* "DAY" 글자와 간격 확보 */}
      <div style={{ position: 'absolute', left: 72, right: 72, top: 220 + (tw.topAdj || 0), bottom: 240 + (tw.botAdj || 0), display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <NumStack ek={c.ek} numColor={e.numColor} ink={e.ink} isDay={c.isDay} num={e.n} teaser={c.teaser} dSize={120 * ns} nSize={272 * ns} tSize={44} gap={40 + (tw.gapAdj || 0)} lead={tw.lineAdj || 0} align={e.align || 'flex-start'} />
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
      <ShapeScatter items={ddScatter(c.i, c.isDay, c.cols, e.bleed, c.fmt, e.gfx)} />
      <div style={{ position: 'absolute', top: 92, left: 80, right: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <Logo size={c.isDay ? 230 : 116} />
        <Kicker c={e.kickerColor} style={{ textAlign: 'center' }}>{e.kickerText}</Kicker>
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 360 + (tw.topAdj || 0), bottom: 300 + (tw.botAdj || 0), display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <NumStack ek={c.ek} numColor={e.numColor} ink={e.ink} isDay={c.isDay} num={e.n} teaser={c.teaser} dSize={150 * ns} nSize={336 * ns} tSize={50} gap={45 + (tw.gapAdj || 0)} lead={tw.lineAdj || 0} align={e.align || 'center'} />
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
      <ShapeScatter items={ddScatter(c.i, c.isDay, c.cols, e.bleed, c.fmt, e.gfx)} />
      <div style={{ position: 'absolute', top: 64, left: 84 }}><Kicker c={e.kickerColor}>{e.kickerText}</Kicker></div>
      {!c.isDay && <Logo size={120} style={{ position: 'absolute', top: 58, right: 96 }} />}
      {c.isDay && <Logo size={360} style={{ position: 'absolute', right: 130, top: 300 }} />}
      <div style={{ position: 'absolute', left: 84, top: 150 + (tw.topAdj || 0), bottom: 210 + (tw.botAdj || 0), width: 880, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <NumStack ek={c.ek} numColor={e.numColor} ink={e.ink} isDay={c.isDay} num={e.n} teaser={c.teaser} dSize={156 * ns} nSize={(c.isDay ? 320 : 372) * ns} tSize={54} gap={49 + (tw.gapAdj || 0)} lead={tw.lineAdj || 0} align={e.align || 'flex-start'} />
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
  { dday: true, bg: '#ffffff', ink: P.midnight, num: P.purple, kickerColor: P.purple, fill: P.purple, track: 'rgba(77,0,110,.16)', cols: [P.purple, P.ocean, P.forest, P.red], teaser: '드디어 개영! 기대되지?' }
];

function buildDD(Comp, fmt) {
  return DD.map((x, i) => {
    const isDay = !!x.dday;
    const id = isDay ? 'dday' : 'd' + x.n;
    const label = isDay ? 'D-DAY' : 'D-' + x.n;
    const kickerText = isDay ? '2026. 8. 5 · 드디어!' : 'COUNTDOWN · ' + x.n + '일 전';
    const bleed = x.ink === '#fff' ? 'rgba(255,255,255,.08)' : 'rgba(77,0,110,.07)';
    const c = { ...x, i, isDay, kickerText, bleed, fmt, ek: fmt + '-' + id };
    return { id, label, node: <Comp c={c} /> };
  });
}

window.SEC_DDAY = buildDD(DDaySquare, 'feed');
window.SEC_DDAY_TALL = buildDD(DDayTall, 'story');
window.SEC_DDAY_WIDE = buildDD(DDayWide, 'wide');
})();
