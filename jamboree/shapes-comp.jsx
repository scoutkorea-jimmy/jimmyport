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

Object.assign(window, { Shape, ShapeBadge, Stitch, ShapeScatter });
})();
