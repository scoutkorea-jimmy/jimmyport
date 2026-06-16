/* World Scouting 공식 도형/스티치 — 인라인 SVG, fill 상속으로 리컬러 */

(function () { // module scope - Babel standalone runs scripts in shared global scope
function _wh(vb, h) { const p = vb.split(/\s+/).map(Number); return { w: h * (p[2] / p[3]), vw: p[2], vh: p[3] }; }

/* 단일 도형. n=번호, h=높이(px), outline=아웃라인본, fill=색 */
function Shape({ n, fill, h = 120, rot = 0, outline = false, style }) {
  const set = outline ? window.SHAPES.outlines : window.SHAPES.fills;
  const d = set[n]; if (!d) return null;
  const { w } = _wh(d.vb, h);
  return (
    <svg viewBox={d.vb} width={w} height={h} aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'inline-block', fill, transform: rot ? `rotate(${rot}deg)` : undefined, ...style }}
      dangerouslySetInnerHTML={{ __html: d.inner }} />
  );
}

/* 도형 배지 — 도형 위 글리프 중앙 (프로그램 아이콘용) */
function ShapeBadge({ n, fill, glyph, glyphColor, size = 110, style }) {
  const d = window.SHAPES.fills[n];
  const ar = d ? _wh(d.vb, size).w / size : 1;
  return (
    <div style={{ position: 'relative', width: size * ar, height: size, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <Shape n={n} fill={fill} h={size} style={{ position: 'absolute', inset: 0, margin: 'auto' }} />
      <span className="hi" style={{ position: 'relative', color: glyphColor, fontSize: size * 0.4, fontWeight: 700, lineHeight: 1 }}>{glyph}</span>
    </div>
  );
}

/* 체브론 스티치 라인 — 중앙 띠만 크롭해서 표시 */
function Stitch({ n = '01', fill, w = 600, band = 40, style }) {
  const s = window.SHAPES.stitches[n]; if (!s) return null;
  const { w: _, vw, vh } = _wh(s.vb, 0); const H = w * (vh / vw);
  return (
    <div aria-hidden="true" style={{ width: w, height: band, overflow: 'hidden', ...style }}>
      <svg viewBox={s.vb} width={w} height={H} style={{ display: 'block', fill, marginTop: -(H / 2 - band / 2) }} dangerouslySetInnerHTML={{ __html: s.inner }} />
    </div>
  );
}

/* 도형 스캐터 — 절대배치 흩뿌림. items=[{n,fill,h,top,left,right,bottom,rot,outline,op}] */
function ShapeScatter({ items, style }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', ...style }}>
      {items.map((s, i) => (
        <Shape key={i} n={s.n} fill={s.fill} h={s.h} rot={s.rot || 0} outline={s.outline}
          style={{ position: 'absolute', top: s.top, left: s.left, right: s.right, bottom: s.bottom, opacity: s.op != null ? s.op : 1 }} />
      ))}
    </div>
  );
}

/* ── 제너레이티브 스캐터 ──────────────────────────────────────────────
 * 텍스트/이미지 영역(avoid)을 피해 도형을 '풍성하게' 흩뿌린다.
 * 시드 기반 결정론적(PNG 캡처가 매 렌더 동일) — Math.random 미사용.
 * avoid = [{x,y,w,h}] 콘텐츠 바운딩박스. count↑ 일수록 도형 많아짐.
 * 빈 공간이 좁은 카드(텍스트 가득)는 자리 부족 → 자동으로 적게 배치(과밀 방지). */
function _rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function _ovl(a, b, m) { m = m || 0; return a.x < b.x + b.w + m && a.x + a.w > b.x - m && a.y < b.y + b.h + m && a.y + a.h > b.y - m; }

function richScatter(opt) {
  const w = opt.w || 1080, h = opt.h || 1080;
  const cols = opt.cols || [PAL.orange, PAL.river, PAL.pink, PAL.leaf];
  const bleed = opt.bleed || 'rgba(255,255,255,.10)';
  const avoid = opt.avoid || [];
  const count = opt.count != null ? opt.count : 10;
  const minH = opt.minH || 48, maxH = opt.maxH || 150;
  const bleeders = opt.bleeders != null ? opt.bleeders : 2;
  const gap = opt.gap != null ? opt.gap : -22;     // 음수 = 도형끼리 살짝 겹침 허용
  const ns = opt.ns || ['02', '03', '04', '05', '06', '07', '10'];
  const rnd = _rng(opt.seed || 1);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const out = [], rects = [];

  /* 코너 블리더 — 화면 밖으로 크게 잘리는 아웃라인 도형(깊이감) */
  const corners = [{ cx: 0, cy: 0 }, { cx: 1, cy: 0 }, { cx: 0, cy: 1 }, { cx: 1, cy: 1 }];
  for (let i = 0; i < bleeders; i++) {
    const c = corners[(i + (opt.seed || 0)) % corners.length];
    const bh = Math.round(h * (0.44 + rnd() * 0.34));
    const off = -Math.round(bh * (0.28 + rnd() * 0.24));
    const o = { n: pick(ns), outline: true, fill: bleed, h: bh, rot: rnd() < 0.5 ? 0 : 90 };
    if (c.cx === 0) o.left = off; else o.right = off;
    if (c.cy === 0) o.top = off; else o.bottom = off;
    out.push(o);
  }

  /* 채움 도형 — avoid·기존 도형과 충돌하지 않는 자리에 배치 */
  let filled = 0, tries = 0;
  while (filled < count && tries < count * 24) {
    tries++;
    const hh = Math.round(minH + rnd() * (maxH - minH));
    const x = Math.round(rnd() * (w - hh));
    const y = Math.round(rnd() * (h - hh));
    const r = { x, y, w: hh, h: hh };
    if (avoid.some((a) => _ovl(r, a, 10))) continue;
    if (rects.some((a) => _ovl(r, a, Math.max(gap, -hh * 0.4)))) continue;
    rects.push(r); filled++;
    out.push({ n: pick(ns), fill: cols[filled % cols.length], h: hh, top: y, left: x, rot: rnd() < 0.22 ? pick([45, 90, 180]) : 0 });
  }
  return out;
}

/* ── 형상화 모티프 (캠핑/자연물) ───────────────────────────────────────
 * WOSM 도형을 조합해 나무·텐트·모닥불·태양·언덕·산·구름을 만든다.
 * 각 함수는 절대좌표 items[] 반환 → ShapeScatter로 렌더. 무작위 더미 대신
 * '의미 있는 오브젝트'로 빈 공간을 채운다. cx=가로중심, by=바닥선(baseline). */
function _W(n, h) { const d = window.SHAPES.fills[n]; const p = d.vb.split(/\s+/).map(Number); return h * p[2] / p[3]; }
const MOTIF = {
  /* 소나무 — 삼각형 3단(노치 보이게 적층) */
  tree(cx, by, s, c) {
    c = c || PAL.leaf;
    const T = (H, baseY) => { const w = _W('09', H); return { n: '09', fill: c, h: H, left: cx - w / 2, top: baseY - H }; };
    return [T(120 * s, by), T(104 * s, by - 66 * s), T(86 * s, by - 128 * s)];
  },
  /* 산 — 큰 봉우리 + 뒤 봉우리 */
  mountain(cx, by, s, c1, c2) {
    c1 = c1 || PAL.forest; c2 = c2 || PAL.river;
    const M = (H, cxx, col) => { const w = _W('09', H); return { n: '09', fill: col, h: H, left: cxx - w / 2, top: by - H }; };
    return [M(112 * s, cx + 74 * s, c2), M(152 * s, cx, c1)];
  },
  /* 텐트 — 오두막 도형 + 어두운 입구 삼각형 */
  tent(cx, by, s, c, door) {
    c = c || PAL.orange; door = door || PAL.midnight;
    const w = _W('08', 120 * s), dh = 48 * s, dw = _W('09', dh);
    return [
      { n: '08', fill: c, h: 120 * s, left: cx - w / 2, top: by - 120 * s },
      { n: '09', fill: door, h: dh, left: cx - dw / 2, top: by - dh }
    ];
  },
  /* 모닥불 — 장작(사다리꼴) X + 불꽃(삼각형) 3겹. cols 주면 배경 대비 색 사용 */
  campfire(cx, by, s, cols) {
    const f = cols || [PAL.red, PAL.orange, PAL.leaf];
    const log = (rot, dx) => { const h = 22 * s, w = _W('07', h); return { n: '07', fill: PAL.midnight, h, left: cx + dx - w / 2, top: by - h, rot }; };
    const fl = (H, dx, col) => { const w = _W('09', H); return { n: '09', fill: col, h: H, left: cx + dx - w / 2, top: by - 16 * s - H }; };
    return [log(16, -13 * s), log(-16, 13 * s), fl(80 * s, 0, f[0]), fl(58 * s, -17 * s, f[1]), fl(40 * s, 14 * s, f[2] || f[0])];
  },
  /* 가방/배낭 — 손잡이(반원 아웃라인) + 몸통(정사각=다이아 45°회전) + 뚜껑(사다리꼴) + 앞주머니(반원) */
  backpack(cx, by, s, c, c2) {
    c = c || PAL.ocean; c2 = c2 || PAL.midnight;
    const H = 132 * s;                                   // 몸통 다이아 박스 높이 → 시각 정사각 ~0.7H
    const fh = 40 * s, fw = _W('07', fh) * 0.62;
    const ph = 40 * s, pw = _W('10', ph);
    const hh = 30 * s, hw = _W('10', hh);
    return [
      { n: '10', outline: true, fill: c2, h: hh, left: cx - hw / 2, top: by - H * 0.86 - hh }, // 손잡이
      { n: '02', rot: 45, fill: c, h: H, left: cx - H / 2, top: by - H * 0.86 },               // 몸통(정사각)
      { n: '07', fill: c2, h: fh, left: cx - fw / 2, top: by - H * 0.74 },                       // 뚜껑
      { n: '10', fill: c2, h: ph, left: cx - pw / 2, top: by - ph }                             // 앞주머니(바닥)
    ];
  },
  /* 태양/달 — 원 */
  sun(cx, cy, s, c) { c = c || PAL.orange; const h = 86 * s, w = _W('04', h); return [{ n: '04', fill: c, h, left: cx - w / 2, top: cy - h / 2 }]; },
  /* 구름 — 반원 3개 */
  cloud(cx, by, s, c) {
    c = c || 'rgba(255,255,255,.9)';
    const D = (H, dx) => { const w = _W('10', H); return { n: '10', fill: c, h: H, left: cx + dx - w / 2, top: by - H }; };
    return [D(46 * s, -42 * s), D(46 * s, 42 * s), D(66 * s, 0)];
  },
  /* 언덕/덤불 — 반원 2~3개 */
  hills(cx, by, s, cols) {
    cols = cols || [PAL.leaf, PAL.forest];
    const D = (H, dx, col) => { const w = _W('10', H); return { n: '10', fill: col, h: H, left: cx + dx - w / 2, top: by - H }; };
    return [D(70 * s, -64 * s, cols[0]), D(58 * s, 62 * s, cols[1] || cols[0])];
  }
};
/* 여러 모티프를 한 배열로 합치는 헬퍼 */
function scene() { return Array.prototype.concat.apply([], Array.prototype.slice.call(arguments)); }

Object.assign(window, { Shape, ShapeBadge, Stitch, ShapeScatter, richScatter, MOTIF, scene });
})();
