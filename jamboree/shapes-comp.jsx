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

Object.assign(window, { Shape, ShapeBadge, Stitch, ShapeScatter, richScatter });
})();
