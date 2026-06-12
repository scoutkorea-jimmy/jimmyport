/* 라이브러리 공용 헬퍼 — 잉크색(톤다운 블랙) · 더블클릭 편집 · 흰배경 템플릿 */

const DMUTE = 'var(--cc-mute, #6f6878)';            // 보조 텍스트(그레이)
const INK = 'var(--cc-ink, #2b2630)';              // 본문 텍스트(톤다운 블랙)
window.DDayTweakCtx = React.createContext({});
/* 공통 브랜드 내용 공유 (행사명·날짜·장소·주최) */
window.GContentCtx = React.createContext({ brand: '제16회 한국잼버리', dateRange: '2026. 8. 5 – 8. 9', place: '강원 세계잼버리수련장', org: '한국스카우트연맹', openLine: '2026. 8. 5 개영' });

function Kicker({ children, c, style }) {
  return <div className="hi" style={{ fontWeight: 500, fontSize: 27, letterSpacing: '.14em', color: c, textTransform: 'uppercase', ...style }}>{children}</div>;
}

/* 카테고리 컬러칩 — 기본: 솔리드 키컬러(본문 우상단, 표지색과 매칭) / dot: 흰 알약+점(표지용) */
const CHIP_LIGHT = ['#FFAE80', '#9FED8F', '#82E6DE', '#FF8DFF'];
function CategoryChip({ label, color, top, right, bottom, left, dot }) {
  if (dot) {
    return (
      <span style={{ position: 'absolute', top, right, bottom, left, display: 'inline-flex', alignItems: 'center', gap: 11, background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 999, padding: '10px 22px 10px 14px', boxShadow: '0 3px 12px rgba(40,30,50,.12)' }}>
        <span style={{ width: 18, height: 18, borderRadius: '50%', background: color }} />
        <span className="hi" style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '.01em' }}>{label}</span>
      </span>
    );
  }
  const lightBg = CHIP_LIGHT.includes(color);
  return (
    <span className="hi" style={{ position: 'absolute', top, right, bottom, left, background: color, color: lightBg ? PAL.midnight : '#fff', borderRadius: 999, padding: '12px 26px', fontSize: 27, fontWeight: 700, letterSpacing: '.01em' }}>{label}</span>
  );
}

/* 더블클릭 인라인 편집 + 우측 폼 자동등록 (둘 다 CCStore 텍스트로 공유)
 * flabel: 우측 폼 라벨(짧게). 없으면 기본 텍스트를 라벨로 사용. */
function Editable({ ekey, tag = 'span', flabel, className, style, children }) {
  const Tag = tag;
  const store = useCCStore();
  const register = React.useContext(window.CCRegisterFieldCtx);
  const ref = React.useRef(null);
  const [editing, setEditing] = React.useState(false);
  const stored = store.getText(ekey);
  const display = stored != null ? stored : children;
  React.useEffect(() => {
    if (register) register(ekey, flabel || textOf(children), textOf(children));
  }, [ekey]); // eslint-disable-line
  return (
    <Tag ref={ref} className={className} title="더블클릭하여 수정"
      style={{ ...style, cursor: editing ? 'text' : 'inherit', outline: editing ? '2px solid rgba(98,37,153,.45)' : 'none', outlineOffset: 3, borderRadius: 4 }}
      contentEditable={editing} suppressContentEditableWarning
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); requestAnimationFrame(() => { const el = ref.current; if (!el) return; el.focus(); try { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (_) { } }); }}
      onBlur={(e) => { store.setText(ekey, e.currentTarget.textContent); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
    >{display}</Tag>
  );
}

function EdgeStitch({ fill, band = 36, top, bottom, style }) {
  return <div style={{ position: 'absolute', left: 0, right: 0, top, bottom, ...style }}><Stitch n="01" fill={fill} w={1080} band={band} /></div>;
}

function FooterBand({ bg = PAL.midnight, color = '#fff', left, right, h = 146, style, brandFoot }) {
  const gc = React.useContext(window.GContentCtx) || {};
  const L = brandFoot ? gc.brand : left;
  const R = brandFoot ? gc.openLine : right;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 100px', boxSizing: 'border-box', fontSize: 29, fontWeight: 300, ...style }}>
      <span>{L}</span><span style={{ textAlign: 'right' }}>{R}</span>
    </div>
  );
}

/* 흰배경 콘텐츠 — 도형아이콘 리스트 (편집 가능) */
function TopicList({ ek = 'list', kicker, title, kc = PAL.ocean, tab, items, cat }) {
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      {cat && <CategoryChip label={cat.label} color={cat.color} top={64} right={64} />}
      {tab && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, background: tab }} />}
      <div style={{ position: 'absolute', top: 64, left: tab ? 100 : 64, right: 64 }}>
        <Kicker c={kc}>{kicker}</Kicker>
        <Editable ekey={ek + '-title'} tag="div" className="hi" style={{ marginTop: 12, fontWeight: 700, fontSize: 80, color: INK }}>{title}</Editable>
      </div>
      <div style={{ position: 'absolute', left: tab ? 100 : 64, right: 64, top: 286, bottom: 66, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {items.map((x, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            <ShapeBadge n={x.n} fill={x.c} glyph={String(i + 1)} glyphColor="#fff" size={94} />
            <div>
              <Editable ekey={ek + '-it' + i + 't'} tag="div" className="hi" style={{ fontSize: 46, fontWeight: 700, color: INK, lineHeight: 1.04 }}>{x.t}</Editable>
              <Editable ekey={ek + '-it' + i + 's'} tag="div" style={{ fontSize: 27, color: DMUTE, fontWeight: 300, marginTop: 2 }}>{x.s}</Editable>
            </div>
          </div>
        ))}
      </div>
      <EdgeStitch fill="#62259922" bottom={20} />
    </Card>
  );
}

/* 흰배경 콘텐츠 — 소개 + 사진 (편집 가능) */
function TopicIntro({ ek = 'intro', kicker, title, body, kc = PAL.ocean, tab, photo = '현장 사진', accentBar = PAL.red, cat }) {
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      {cat && <CategoryChip label={cat.label} color={cat.color} top={64} right={64} />}
      {tab && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, background: tab }} />}
      <div style={{ position: 'absolute', top: 64, left: tab ? 100 : 64, right: 64 }}>
        <Kicker c={kc}>{kicker}</Kicker>
        <Editable ekey={ek + '-title'} tag="div" className="hi" style={{ marginTop: 12, fontWeight: 700, fontSize: 88, color: INK, lineHeight: 1.02 }}>{title}</Editable>
      </div>
      <Editable ekey={ek + '-body'} tag="div" style={{ position: 'absolute', left: tab ? 100 : 64, right: 64, top: 322, fontSize: 38, fontWeight: 300, lineHeight: 1.6, color: INK, paddingLeft: 28, borderLeft: `8px solid ${accentBar}` }}>{body}</Editable>
      <Placeholder tone="light" label={photo} slot={ek + '-photo'} slotLabel="사진" radius={18} style={{ position: 'absolute', left: tab ? 100 : 64, right: 64, bottom: 64, height: 300 }} />
    </Card>
  );
}

Object.assign(window, { DMUTE, INK, Kicker, CategoryChip, Editable, EdgeStitch, FooterBand, TopicList, TopicIntro });
