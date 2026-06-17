/* 한국잼버리 카드뉴스 제작기 — 제작기 셸 (Phase 3)
 * 좌: 패밀리/베리에이션 + 카드뉴스 구성(덱: 표지→본문→엔딩, ZIP 일괄)
 * 중앙: 라이브 프리뷰(더블클릭 인라인편집)
 * 우: ① 이 카드 편집(D숫자/색/정렬/텍스트/사진) ② 트윅(폰트·글자색·D여백) ③ 브랜드 ④ 엠블럼
 * 상단: PNG · ZIP(덱) · 서버 저장/불러오기(KV — 덱·트윅 포함) */

(function () { // module scope - Babel standalone runs scripts in shared global scope
const { useState, useRef, useEffect, useLayoutEffect, useCallback, useReducer } = React;
const P = window.PAL;
/* 제작기 셸(크롬) 디자인 토큰 — 홍보부 캘린더와 톤 통일 (그린 에디토리얼).
   카드 결과물 색은 PAL/SWATCHES 그대로 유지. */
const UI = { bg:'#F3F4F1', surface:'#FFFFFF', surface2:'#FAFBF9', ink:'#1B211D', ink2:'#3E453F',
  muted:'#697066', faint:'#9AA0A0', line:'#E4E7E1', accent:'#2F5D4A', accentInk:'#234636',
  soft:'#E8F0EB', danger:'#B5503C', sh1:'0 1px 2px rgba(22,32,26,.04), 0 1px 3px rgba(22,32,26,.05)', sh2:'0 6px 20px rgba(22,32,26,.10)' };

const FAMILIES = [
  { key: 'cover',    label: '표지',      sec: () => window.SEC_COVER,      w: 1080, h: 1350 },
  { key: 'tpl',      label: '콘텐츠',    sec: () => window.SEC_TEMPLATES,  w: 1080, h: 1350 },
  { key: 'news',     label: '소식형',    sec: () => window.SEC_NEWS,       w: 1080, h: 1350 },
  { key: 'dday',     label: 'D-피드',    sec: () => window.SEC_DDAY,       w: 1080, h: 1350 },
  { key: 'ddayTall', label: 'D-스토리',  sec: () => window.SEC_DDAY_TALL,  w: 1080, h: 1920 },
  { key: 'ddayWide', label: 'D-가로',    sec: () => window.SEC_DDAY_WIDE,  w: 1480, h: 1047 },
];
const famOf = (key) => FAMILIES.find((f) => f.key === key);
const DD_FMT = { dday: 'feed', ddayTall: 'story', ddayWide: 'wide' };

const BRAND_FIELDS = [
  { k: 'brand',     label: '행사명',     ph: '제16회 한국잼버리' },
  { k: 'dateRange', label: '날짜',       ph: '2026. 8. 5 – 8. 9' },
  { k: 'place',     label: '장소',       ph: '강원 세계잼버리수련장' },
  { k: 'org',       label: '주최',       ph: '한국스카우트연맹' },
  { k: 'openLine',  label: '개영 문구',  ph: '2026. 8. 5 개영' },
];
const DEFAULT_BRAND = {
  brand: '제16회 한국잼버리', dateRange: '2026. 8. 5 – 8. 9',
  place: '강원 세계잼버리수련장', org: '한국스카우트연맹', openLine: '2026. 8. 5 개영',
};

const AUTHOR_KEY = 'jamboree:author';
const SWATCHES = [P.purple, P.midnight, P.ocean, P.forest, P.red, P.orange, P.pink, P.river, P.leaf];

/* 트윅 기본값 + 폰트 옵션 (원본 시안 Tweaks 복원 + 자간/글자크기/여백 일괄) */
const TWEAK_DEFAULTS = { ink: '#2b2630', fontMain: 'cafe24', fontHi: 'aggravo', fz: 1, track: 0, pad: 0, topAdj: 0, botAdj: 0, gapAdj: 0, lineAdj: 0, numScale: 1, logoScale: 1, logoDX: 0, logoDY: 0, wmScale: 1, wmDX: 0, wmDY: 0, wmRot: 0, wmOpacity: 1, dx1: 0, dx2: 0 };
const FONT_MAIN = { cafe24: { l: '카페24 슬림', v: "'Cafe24ProSlim'" }, pretendard: { l: '프리텐다드', v: "'Pretendard'" }, system: { l: '시스템', v: 'system-ui' } };
const FONT_HI = { aggravo: { l: '어그로(SB)', v: "'Aggravo'" }, pretendard: { l: '프리텐다드', v: "'Pretendard'" }, cafe24: { l: '카페24 슬림', v: "'Cafe24ProSlim'" } };
const INK_SWATCHES = ['#2b2630', '#4D006E', '#333333', '#622599'];

const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid '+UI.line, borderRadius: 8, padding: '9px 11px', fontSize: 13.5, fontFamily: 'inherit', color: UI.ink, background: UI.surface };
const fieldLabel = { display: 'block', fontSize: 12, fontWeight: 600, color: UI.muted, marginBottom: 4 };
const secLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '.02em', color: UI.muted, margin: '4px 0 8px' };

function Swatches({ value, onPick, colors = SWATCHES, clearable }) {
  const v = (value || '').toLowerCase();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
      {colors.map((c) => (
        <button key={c} type="button" title={c} onClick={() => onPick(c)}
          style={{ width: 26, height: 26, borderRadius: 6, background: c, cursor: 'pointer', padding: 0,
            border: v === c.toLowerCase() ? '3px solid #2b2630' : '1px solid '+UI.line }} />
      ))}
      {clearable && (
        <button type="button" onClick={() => onPick('')}
          style={{ height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid '+UI.line, background: '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', color: UI.muted, fontFamily: 'inherit' }}>기본</button>
      )}
    </div>
  );
}

/* 세그먼트 버튼 (정렬 등) */
function Seg({ value, options, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onPick(k)} style={{
          flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid',
          borderColor: value === k ? UI.accent : UI.line,
          background: value === k ? UI.accent : '#fff', color: value === k ? '#fff' : UI.muted,
          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>{l}</button>
      ))}
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={{ ...fieldLabel, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span><span style={{ color: UI.faint }}>{value}{unit}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} style={{ width: '100%', accentColor: UI.accent }} />
    </label>
  );
}

/* 여백 트윅: 카드 콘텐츠를 균일하게 안쪽으로(흰 테두리) — 미리보기/내보내기 공용 */
function Framed({ w, h, margin, children }) {
  const s = margin > 0 ? (w - 2 * margin) / w : 1;
  return (
    <div style={{ position: 'relative', width: w, height: h, background: '#fff', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: s !== 1 ? `scale(${s})` : 'none', transformOrigin: 'center center' }}>{children}</div>
    </div>
  );
}

function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }

function imageFileToDataUrl(file, opts) {
  const { maxDim = 1600, mime = 'image/jpeg', quality = 0.85 } = opts || {};
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      const s = Math.min(1, maxDim / Math.max(w, h));
      w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try { resolve(cv.toDataURL(mime, quality)); } catch (e) { reject(e); }
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function PhotoRow({ slot, label, png }) {
  const store = useCCStore();
  const inputRef = useRef(null);
  const cur = store.getImage(slot);
  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) { try { store.setImage(slot, await imageFileToDataUrl(f, png ? { mime: 'image/png', maxDim: 1024 } : {})); } catch (_) {} }
    e.target.value = '';
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 44, height: 44, flex: '0 0 auto', borderRadius: 8, overflow: 'hidden', border: '1px solid '+UI.line, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cur ? '#fff' : 'repeating-linear-gradient(45deg,#eef0ec 0 8px,#f6f7f4 8px 16px)' }}>
        {cur ? <img src={cur} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 16, color: UI.faint }}>◳</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: UI.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <button type="button" onClick={() => inputRef.current && inputRef.current.click()} style={{ border: 'none', background: 'none', padding: 0, color: UI.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{cur ? '변경' : '업로드'}</button>
          {cur && <button type="button" onClick={() => store.setImage(slot, null)} style={{ border: 'none', background: 'none', padding: 0, color: UI.danger, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
    </div>
  );
}

function FieldInput({ field }) {
  const store = useCCStore();
  const v = store.getText(field.ekey);
  const cur = v != null ? v : (field.def || '');
  const long = (field.def || '').length > 14 || cur.indexOf('\n') >= 0;   // 줄바꿈 있으면/길면 textarea
  const common = { value: cur, placeholder: field.def || '', onChange: (e) => store.setText(field.ekey, e.target.value), style: { ...inputStyle, ...(long ? { resize: 'vertical', minHeight: 56, lineHeight: 1.4, whiteSpace: 'pre-wrap' } : null) } };
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={fieldLabel}>{(field.label || '항목').slice(0, 22)}</span>
      {long ? <textarea rows={2} {...common} /> : <input {...common} />}
      {long && <span style={{ fontSize: 10.5, color: '#a9a2b3', display: 'block', marginTop: 2 }}>줄바꿈(Enter) 가능</span>}
    </label>
  );
}

function Toolbar({ onPng, onStitch, onZip, onList, onNew, status, busy, zipCount }) {
  const btn = (extra) => ({ border: '1px solid transparent', borderRadius: 8, padding: '8px 13px', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? .55 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap', ...extra });
  const ghost = { background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.22)' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.8)', minWidth: 92, textAlign: 'right' }}>{status}</span>
      <button disabled={busy} onClick={onNew} style={btn(ghost)}>+ 새로 만들기</button>
      <button disabled={busy} onClick={onList} style={btn(ghost)}>저장 · 불러오기</button>
      <button disabled={busy} onClick={onZip} style={btn(ghost)}>ZIP ({zipCount})</button>
      <button disabled={busy} onClick={onStitch} style={btn(ghost)}>한 편 PNG ({zipCount})</button>
      <button disabled={busy} onClick={onPng} style={btn({ background: '#fff', color: UI.accentInk })}>이 카드 PNG</button>
    </div>
  );
}

function App() {
  const store = useCCStore();
  const [familyKey, setFamilyKey] = useState('cover');
  const [variationId, setVariationId] = useState(null);
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [remount, setRemount] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [listOpen, setListOpen] = useState(false);
  const [savedItems, setSavedItems] = useState(null);   // null=미로딩, []=빈
  const [listMsg, setListMsg] = useState('');
  const [saveName, setSaveName] = useState('');
  const [currentId, setCurrentId] = useState(null);     // 불러온/저장한 항목 id (자동저장 대상)
  const [currentName, setCurrentName] = useState('');
  const [author, setAuthorState] = useState(() => { try { return localStorage.getItem(AUTHOR_KEY) || ''; } catch (_) { return ''; } });
  const setAuthor = useCallback((v) => { setAuthorState(v); try { if (v) localStorage.setItem(AUTHOR_KEY, v); else localStorage.removeItem(AUTHOR_KEY); } catch (_) {} }, []);

  const family = famOf(familyKey);
  const cards = family.sec() || [];
  const card = cards.find((c) => c.id === variationId) || cards[0];
  const cardKey = familyKey + '|' + (card ? card.id : '');

  /* ── 트윅 (스토어 cc-prop:_tweaks — 서버 저장에 자동 포함) ── */
  const tweaks = { ...TWEAK_DEFAULTS, ...store.getProps('_tweaks') };
  const setTweak = (k, v) => store.setProp('_tweaks', k, v === TWEAK_DEFAULTS[k] ? '' : v);
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--cc-ink', tweaks.ink);
    r.setProperty('--cc-main', (FONT_MAIN[tweaks.fontMain] || FONT_MAIN.cafe24).v);
    r.setProperty('--cc-hi', (FONT_HI[tweaks.fontHi] || FONT_HI.aggravo).v);
    r.setProperty('--cc-fz', String(tweaks.fz || 1));
    r.setProperty('--cc-track', tweaks.track ? tweaks.track + 'em' : 'normal');
    r.setProperty('--cc-logo-scale', String(tweaks.logoScale || 1));
    r.setProperty('--cc-logo-dx', (tweaks.logoDX || 0) + 'px');
    r.setProperty('--cc-logo-dy', (tweaks.logoDY || 0) + 'px');
    r.setProperty('--cc-content-scale', String(1 - (tweaks.pad || 0)));
    r.setProperty('--cc-wm-scale', String(tweaks.wmScale || 1));
    r.setProperty('--cc-wm-dx', (tweaks.wmDX || 0) + 'px');
    r.setProperty('--cc-wm-dy', (tweaks.wmDY || 0) + 'px');
    r.setProperty('--cc-wm-rot', (tweaks.wmRot || 0) + 'deg');
    r.setProperty('--cc-wm-opacity', String(tweaks.wmOpacity != null ? tweaks.wmOpacity : 1));
  }, [tweaks.ink, tweaks.fontMain, tweaks.fontHi, tweaks.fz, tweaks.track, tweaks.logoScale, tweaks.logoDX, tweaks.logoDY, tweaks.pad, tweaks.wmScale, tweaks.wmDX, tweaks.wmDY, tweaks.wmRot, tweaks.wmOpacity]);

  /* ── 덱: 카드뉴스 한 편 구성 (cc-prop:_deck — 서버 저장에 자동 포함) ── */
  const deck = store.getProp('_deck', 'cards', []);
  const setDeck = (arr) => store.setProp('_deck', 'cards', arr.length ? arr : '');
  const deckAdd = () => { if (card) setDeck([...deck, { f: familyKey, id: card.id }]); };
  const deckMove = (i, d) => { const a = deck.slice(); const j = i + d; if (j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; setDeck(a); };
  const deckRemove = (i) => { const a = deck.slice(); a.splice(i, 1); setDeck(a); };
  const deckResolve = (it) => {
    const f = famOf(it.f); if (!f) return null;
    const c = (f.sec() || []).find((x) => x.id === it.id);
    return c ? { fam: f, card: c } : null;
  };

  /* ── 카드별 폼 자동등록 ── */
  const reg = useRef({ field: new Map(), photo: new Map() });
  const [, bump] = useReducer((x) => x + 1, 0);
  const registerField = useCallback((ekey, label, def) => {
    const k = cardKey + ' ' + ekey;
    if (reg.current.field.has(k)) return;
    reg.current.field.set(k, { cardKey, ekey, label, def }); bump();
  }, [cardKey]);
  const registerPhoto = useCallback((slot, label) => {
    const k = cardKey + ' ' + slot;
    if (reg.current.photo.has(k)) return;
    reg.current.photo.set(k, { cardKey, slot, label }); bump();
  }, [cardKey]);
  const fields = Array.from(reg.current.field.values()).filter((f) => f.cardKey === cardKey);
  const photos = Array.from(reg.current.photo.values()).filter((p) => p.cardKey === cardKey);

  const coverScope = familyKey === 'cover' && card ? 'cover-' + card.id : null;
  const ddScope = DD_FMT[familyKey] && card ? DD_FMT[familyKey] + '-' + card.id : null;
  const newsScope = familyKey === 'news' && card ? 'news-' + card.id : null;
  const alignScope = coverScope || ddScope || newsScope;
  const ddIsDay = !!ddScope && card && card.id === 'dday';
  const ddDefaultN = ddScope && card && !ddIsDay ? card.id.replace(/^d/, '') : '';

  const stageRef = useRef(null);
  const nativeRef = useRef(null);

  useLayoutEffect(() => {
    const el = stageRef.current; if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = box.w && box.h ? Math.min(box.w / family.w, box.h / family.h, 1) : 0.3;

  useEffect(() => { setVariationId(cards[0] ? cards[0].id : null); /* eslint-disable-next-line */ }, [familyKey]);

  const flash = (msg) => { setStatus(msg); window.clearTimeout(flash._t); flash._t = window.setTimeout(() => setStatus(''), 3500); };

  /* ── 서버 저장/불러오기 (작성자 이름 기반, 토큰 없음) ── */
  const refreshList = useCallback(async () => {
    try {
      const res = await fetch('/api/jamboree?list=1');
      const data = await res.json();
      setSavedItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) { setSavedItems([]); setListMsg('목록 불러오기 /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent'); }
  }, []);
  const openList = useCallback(() => { setListOpen(true); setListMsg(''); setSavedItems(null); refreshList(); }, [refreshList]);

  // 현재 작업 저장: 불러온 항목이 있으면 그 항목 갱신, 없으면 새 항목 생성
  const saveWorking = useCallback(async () => {
    if (!author.trim()) { setListMsg('작성자 이름을 먼저 입력하세요'); return; }
    setBusy(true); setListMsg('저장 중…');
    try {
      const state = Object.assign(window.CCStore.collect(), { brand });
      let res, data;
      if (currentId) {
        res = await fetch('/api/jamboree', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: currentId, name: currentName || saveName, author, state }) });
      } else {
        const name = (saveName || brand.brand || '카드뉴스').trim();
        res = await fetch('/api/jamboree', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, author, state }) });
        data = await res.json().catch(() => null);
        if (res.ok && data && data.id) { setCurrentId(data.id); setCurrentName(name); }
      }
      if (!res.ok) { setListMsg('저장 /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent (' + res.status + ')'); return; }
      setListMsg('저장됨 ✓'); flash('저장됨 ✓'); refreshList();
    } catch (e) { setListMsg('네트워크 오류'); } finally { setBusy(false); }
  }, [author, brand, currentId, currentName, saveName, refreshList]);

  const saveAsNew = useCallback(async () => {
    if (!author.trim()) { setListMsg('작성자 이름을 먼저 입력하세요'); return; }
    const name = (saveName || brand.brand || '카드뉴스').trim();
    setBusy(true); setListMsg('저장 중…');
    try {
      const state = Object.assign(window.CCStore.collect(), { brand });
      const res = await fetch('/api/jamboree', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, author, state }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setListMsg('저장 /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent (' + res.status + ')'); return; }
      if (data && data.id) { setCurrentId(data.id); setCurrentName(name); }
      setListMsg('"' + name + '" 저장됨 ✓'); setSaveName(''); refreshList();
    } catch (e) { setListMsg('네트워크 오류'); } finally { setBusy(false); }
  }, [author, brand, saveName, refreshList]);

  const loadItem = useCallback(async (it) => {
    setBusy(true); setListMsg('불러오는 중…');
    try {
      const res = await fetch('/api/jamboree?id=' + encodeURIComponent(it.id));
      const data = await res.json();
      if (!data || !data.state) { setListMsg('불러오기 /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent'); return; }
      window.CCStore.hydrate(data.state);
      if (data.state.brand) setBrand(Object.assign({}, DEFAULT_BRAND, data.state.brand));
      setCurrentId(it.id); setCurrentName(it.name || '');
      if (it.author) setAuthor(it.author);
      setRemount((n) => n + 1); setListOpen(false); flash('불러옴 ✓');
    } catch (e) { setListMsg('불러오기 /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent'); } finally { setBusy(false); }
  }, [setAuthor]);

  const deleteItem = useCallback(async (it) => {
    if (!window.confirm('"' + it.name + '" 삭제할까요?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/jamboree?id=' + encodeURIComponent(it.id), { method: 'DELETE' });
      if (!res.ok) { setListMsg('삭제 /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent'); return; }
      if (currentId === it.id) { setCurrentId(null); setCurrentName(''); }
      setSavedItems((prev) => Array.isArray(prev) ? prev.filter((x) => x.id !== it.id) : prev);  // 즉시 반영(KV 지연 보완)
      setListMsg('삭제됨 ✓');
    } catch (e) { setListMsg('네트워크 오류'); } finally { setBusy(false); }
  }, [currentId, refreshList]);

  const newProject = useCallback(() => {
    if (!window.confirm('새 카드뉴스를 시작할까요? 저장하지 /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent은 현재 편집 내용은 사라집니다.')) return;
    window.CCStore.clearAll();
    setBrand(DEFAULT_BRAND); setCurrentId(null); setCurrentName(''); setSaveName('');
    setRemount((n) => n + 1); setListMsg('새 카드뉴스 시작됨'); flash('새 카드뉴스 ✓');
  }, []);

  /* ── 자동 저장: 불러온/저장한 항목이 있으면 그 항목을 갱신(작성자 이름 필요) ── */
  const brandRef = useRef(brand);
  useEffect(() => { brandRef.current = brand; }, [brand]);
  const authorRef = useRef(author);
  useEffect(() => { authorRef.current = author; }, [author]);
  const curRef = useRef({ id: currentId, name: currentName });
  useEffect(() => { curRef.current = { id: currentId, name: currentName }; }, [currentId, currentName]);
  const autosaveT = useRef(0);
  const autosaveReady = useRef(false);
  const doAutosave = useCallback(async () => {
    const a = (authorRef.current || '').trim(); const cur = curRef.current;
    if (!a || !cur.id) return;   // 작성자 + 저장된 항목이 있을 때만 자동 갱신
    try {
      const state = Object.assign(window.CCStore.collect(), { brand: brandRef.current });
      const res = await fetch('/api/jamboree', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: cur.id, name: cur.name, author: a, state }) });
      if (res.ok) flash('자동 저장됨 ✓');
    } catch (_) {}
  }, []);
  const scheduleAutosave = useCallback(() => {
    window.clearTimeout(autosaveT.current);
    autosaveT.current = window.setTimeout(doAutosave, 1600);
  }, [doAutosave]);
  useEffect(() => {
    const unsub = window.CCStore.sub(() => { if (autosaveReady.current) scheduleAutosave(); });
    autosaveReady.current = true;
    return () => { if (unsub) unsub(); window.clearTimeout(autosaveT.current); };
  }, [scheduleAutosave]);
  useEffect(() => { if (autosaveReady.current) scheduleAutosave(); /* eslint-disable-next-line */ }, [brand]);

  const onPng = useCallback(async () => {
    const node = nativeRef.current; if (!node || !window.htmlToImage) { flash('준비 안 됨'); return; }
    setBusy(true); flash('PNG 생성 중…');
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const dataUrl = await window.htmlToImage.toPng(node, { width: family.w, height: family.h, pixelRatio: 1, cacheBust: true, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.download = `jamboree_${family.key}_${card ? card.id : 'card'}.png`;
      a.href = dataUrl; a.click();
      flash('다운로드 ✓');
    } catch (e) { console.error(e); flash('PNG /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent'); } finally { setBusy(false); }
  }, [family, card]);

  /* ── 카드뉴스 ZIP: 덱 순서대로 오프스크린 네이티브 렌더 → JSZip ── */
  const offRef = useRef(null);
  const ensureOff = () => {
    if (offRef.current) return offRef.current;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-99999px;top:0;z-index:-1;pointer-events:none;';
    document.body.appendChild(host);
    offRef.current = { host, root: ReactDOM.createRoot(host) };
    return offRef.current;
  };
  const onZip = useCallback(async () => {
    if (!window.htmlToImage || !window.JSZip) { flash('준비 안 됨'); return; }
    if (!deck.length) { flash('덱이 비어 있어요 — 카드를 담아주세요'); return; }
    setBusy(true);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const zip = new window.JSZip();
      const { host, root } = ensureOff();
      for (let i = 0; i < deck.length; i++) {
        const r = deckResolve(deck[i]); if (!r) continue;
        flash(`ZIP ${i + 1}/${deck.length}`);
        await new Promise((res) => {
          root.render(
            <window.DDayTweakCtx.Provider value={tweaks}>
              <window.GContentCtx.Provider value={brand}>
                {r.card.node}
              </window.GContentCtx.Provider>
            </window.DDayTweakCtx.Provider>
          );
          requestAnimationFrame(() => requestAnimationFrame(res));
        });
        const target = host.firstElementChild;
        const dataUrl = await window.htmlToImage.toPng(target, { width: r.fam.w, height: r.fam.h, pixelRatio: 1, cacheBust: true, backgroundColor: '#ffffff' });
        zip.file(`${String(i + 1).padStart(2, '0')}_${deck[i].f}_${deck[i].id}.png`, dataUrl.split(',')[1], { base64: true });
      }
      root.render(null);
      flash('압축 중…');
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.download = 'jamboree_cardnews.zip';
      a.href = URL.createObjectURL(blob); a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      flash('ZIP 완료 ✓');
    } catch (e) { console.error(e); flash('ZIP /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent'); } finally { setBusy(false); }
  }, [deck, brand, tweaks]);

  /* ── 한 편 PNG: 덱 모듈을 세로로 이어붙인 단일 이미지 (카드뉴스 한 편) ── */
  const onStitch = useCallback(async () => {
    if (!window.htmlToImage) { flash('준비 안 됨'); return; }
    if (!deck.length) { flash('덱이 비어 있어요 — 카드를 담아주세요'); return; }
    setBusy(true);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const { host, root } = ensureOff();
      const targetW = Math.max(...deck.map((it) => { const f = famOf(it.f); return f ? f.w : 1080; }));
      const imgs = [];
      for (let i = 0; i < deck.length; i++) {
        const r = deckResolve(deck[i]); if (!r) continue;
        flash(`한 편 ${i + 1}/${deck.length}`);
        await new Promise((res) => {
          root.render(
            <window.DDayTweakCtx.Provider value={tweaks}>
              <window.GContentCtx.Provider value={brand}>
                {r.card.node}
              </window.GContentCtx.Provider>
            </window.DDayTweakCtx.Provider>
          );
          requestAnimationFrame(() => requestAnimationFrame(res));
        });
        const dataUrl = await window.htmlToImage.toPng(host.firstElementChild, { width: r.fam.w, height: r.fam.h, pixelRatio: 1, cacheBust: true, backgroundColor: '#ffffff' });
        imgs.push({ im: await loadImage(dataUrl), w: r.fam.w, h: r.fam.h });
      }
      root.render(null);
      if (!imgs.length) { flash('내보낼 카드 없음'); return; }
      flash('이어붙이는 중…');
      const scaled = imgs.map((x) => ({ im: x.im, h: Math.round(x.h * targetW / x.w) }));
      const totalH = scaled.reduce((a, x) => a + x.h, 0);
      const cv = document.createElement('canvas'); cv.width = targetW; cv.height = totalH;
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetW, totalH);
      let y = 0;
      for (const x of scaled) { ctx.drawImage(x.im, 0, y, targetW, x.h); y += x.h; }
      const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
      const a = document.createElement('a');
      a.download = 'jamboree_cardnews_full.png';
      a.href = URL.createObjectURL(blob); a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      flash('한 편 완성 ✓');
    } catch (e) { console.error(e); flash('한 편 /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent'); } finally { setBusy(false); }
  }, [deck, brand, tweaks]);

  const sideBtn = (active) => ({
    display: 'block', width: '100%', textAlign: 'left', border: '1px solid '+(active?UI.accent:'transparent'), cursor: 'pointer',
    background: active ? UI.accent : 'transparent', color: active ? '#fff' : UI.ink,
    padding: '9px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: active ? 700 : 500, fontFamily: 'inherit', marginBottom: 3, lineHeight: 1.3,
  });
  const tinyBtn = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: UI.muted, padding: '2px 4px', fontFamily: 'inherit' };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: UI.bg, fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", color: UI.ink }}>
      <header style={{ height: 60, flex: '0 0 auto', background: UI.accentInk, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={store.getImage('logo-white') || store.getImage('logo') || 'jamboree/assets/logo-white.png'} width={32} height={32} alt="" style={{ display: 'block', objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.01em' }}>한국잼버리 카드뉴스 제작기</div>
            <div style={{ fontSize: 11, opacity: .6 }}>제16회 한국잼버리 · 2026 강원</div>
          </div>
        </div>
        <Toolbar onPng={onPng} onStitch={onStitch} onZip={onZip} onList={openList} onNew={newProject} status={status} busy={busy} zipCount={deck.length} />
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 좌: 패밀리 + 베리에이션 + 덱 */}
        <aside style={{ width: 264, flex: '0 0 auto', background: UI.surface, borderRight: '1px solid '+UI.line, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column' }}>
          <div>
            <div style={secLabel}>템플릿 종류</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {FAMILIES.map((f) => (
                <button key={f.key} onClick={() => setFamilyKey(f.key)} style={{
                  border: '1px solid', borderColor: f.key === familyKey ? UI.accent : UI.line,
                  background: f.key === familyKey ? UI.accent : '#fff', color: f.key === familyKey ? '#fff' : UI.ink,
                  borderRadius: 999, padding: '6px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>{f.label}</button>
              ))}
            </div>
            <div style={secLabel}>베리에이션 · {family.w}×{family.h}</div>
            {cards.map((c) => (
              <button key={c.id} onClick={() => setVariationId(c.id)} style={sideBtn(card && c.id === card.id)}>{c.label}</button>
            ))}
          </div>
        </aside>

        {/* 중앙: 프리뷰 */}
        <main ref={stageRef} style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 28 }}>
          <window.CCRegisterFieldCtx.Provider value={registerField}>
            <window.CCRegisterPhotoCtx.Provider value={registerPhoto}>
              <window.DDayTweakCtx.Provider value={tweaks}>
                <window.GContentCtx.Provider value={brand}>
                  <div key={remount + ':' + cardKey} style={{ width: family.w * scale, height: family.h * scale, position: 'relative', flex: '0 0 auto' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: family.w * scale, height: family.h * scale }}>
                      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: family.w, height: family.h }}>
                        <div ref={nativeRef} style={{ width: family.w, height: family.h, position: 'relative', background: '#fff', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', inset: 0 }}>
                            {card ? card.node : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </window.GContentCtx.Provider>
              </window.DDayTweakCtx.Provider>
            </window.CCRegisterPhotoCtx.Provider>
          </window.CCRegisterFieldCtx.Provider>
          <div style={pillHint}>텍스트 <b>더블클릭</b> 또는 오른쪽 패널에서 편집</div>
        </main>

        {/* 우: 카드 편집 + 트윅 + 브랜드 */}
        <aside style={{ width: 300, flex: '0 0 auto', background: UI.surface, borderLeft: '1px solid '+UI.line, overflowY: 'auto', padding: 18 }}>
          <div style={secLabel}>이 카드 편집 · {card ? card.label : ''}</div>

          {(coverScope || ddScope) && (
            <div style={{ marginBottom: 14 }}>
              {ddScope && !ddIsDay && (
                <label style={{ display: 'block', marginBottom: 10 }}>
                  <span style={fieldLabel}>D-숫자 (진행바·문구 자동 반영)</span>
                  <input type="number" min="0" max="999" value={store.getProp(ddScope, 'n', '')} placeholder={ddDefaultN}
                    onChange={(e) => store.setProp(ddScope, 'n', e.target.value)} style={inputStyle} />
                </label>
              )}
              {ddScope && (
                <label style={{ display: 'block', marginBottom: 10 }}>
                  <span style={fieldLabel}>키커 문구 (상단)</span>
                  <input value={store.getProp(ddScope, 'kicker', '')} placeholder={ddIsDay ? '비우면 자동' : ('COUNTDOWN · ' + (store.getProp(ddScope, 'n', '') || ddDefaultN || '') + '일 전')}
                    onChange={(e) => store.setProp(ddScope, 'kicker', e.target.value)} style={inputStyle} />
                </label>
              )}
              <span style={fieldLabel}>배경색</span>
              <Swatches value={store.getProp(coverScope || ddScope, 'bg', '')} onPick={(c) => store.setProp(coverScope || ddScope, 'bg', c)} clearable />
              {familyKey === 'dday' && !ddIsDay && (() => {
                const N = window.FEED_GFX_COUNT || 1;
                const defIdx = ((cards.findIndex((c) => card && c.id === card.id) % N) + N) % N;
                const cur = store.getProp(ddScope, 'gfx', '');
                return (
                  <label style={{ display: 'block', marginTop: 10 }}>
                    <span style={fieldLabel}>오른쪽 그래픽 ({N}종)</span>
                    <select value={cur === '' ? String(defIdx) : cur}
                      onChange={(e) => store.setProp(ddScope, 'gfx', e.target.value === String(defIdx) ? '' : e.target.value)} style={inputStyle}>
                      {(window.FEED_GFX_LABELS || []).map((l, i) => <option key={i} value={i}>{(i + 1) + ' · ' + l}</option>)}
                    </select>
                  </label>
                );
              })()}
              {coverScope && (
                <div style={{ marginTop: 10 }}>
                  <span style={fieldLabel}>카테고리 색</span>
                  <Swatches value={store.getProp(coverScope, 'catColor', '')} onPick={(c) => store.setProp(coverScope, 'catColor', c)} clearable />
                </div>
              )}
            </div>
          )}

          {familyKey === 'dday' && (
            <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid '+UI.line }}>
              <span style={fieldLabel}>배경 오브제 (매듭 에셋)</span>
              <Slider label="크기" value={Math.round((tweaks.wmScale || 1) * 100) / 100} min={0.3} max={2.4} step={0.05} unit="×" onChange={(v) => setTweak('wmScale', v)} />
              <Slider label="좌우 위치" value={tweaks.wmDX} min={-800} max={800} step={10} unit="px" onChange={(v) => setTweak('wmDX', v)} />
              <Slider label="상하 위치" value={tweaks.wmDY} min={-800} max={800} step={10} unit="px" onChange={(v) => setTweak('wmDY', v)} />
              <Slider label="회전" value={tweaks.wmRot} min={-180} max={180} step={5} unit="°" onChange={(v) => setTweak('wmRot', v)} />
              <Slider label="투명도(농도)" value={Math.round((tweaks.wmOpacity != null ? tweaks.wmOpacity : 1) * 100)} min={0} max={300} step={5} unit="%" onChange={(v) => setTweak('wmOpacity', v / 100)} />
              <span style={{ ...fieldLabel, marginTop: 10 }}>D-숫자 줄 위치</span>
              <Slider label="1행 (D-) 좌우" value={tweaks.dx1} min={-300} max={300} step={5} unit="px" onChange={(v) => setTweak('dx1', v)} />
              <Slider label="2행 (숫자) 좌우" value={tweaks.dx2} min={-300} max={300} step={5} unit="px" onChange={(v) => setTweak('dx2', v)} />
            </div>
          )}

          {alignScope && (
            <div style={{ marginBottom: 14 }}>
              <span style={fieldLabel}>텍스트 정렬</span>
              <Seg value={store.getProp(alignScope, 'align', '')} onPick={(v) => store.setProp(alignScope, 'align', v)}
                options={[['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽'], ['', '기본']]} />
            </div>
          )}

          {fields.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <span style={fieldLabel}>텍스트</span>
              {fields.map((f) => <FieldInput key={f.ekey} field={f} />)}
            </div>
          )}

          {photos.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <span style={fieldLabel}>사진 (업로드 시 플레이스홀더 교체)</span>
              {photos.map((p) => <PhotoRow key={p.slot} slot={p.slot} label={p.label} />)}
            </div>
          )}

          {/* 트윅 — 전 카드 공통 */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid '+UI.line }}>
            <div style={secLabel}>트윅 (전체 카드 공통)</div>
            <span style={fieldLabel}>본문 글자색</span>
            <div style={{ marginBottom: 10 }}><Swatches value={tweaks.ink} colors={INK_SWATCHES} onPick={(c) => setTweak('ink', c || TWEAK_DEFAULTS.ink)} /></div>
            <label style={{ display: 'block', marginBottom: 10 }}>
              <span style={fieldLabel}>본문 폰트</span>
              <select value={tweaks.fontMain} onChange={(e) => setTweak('fontMain', e.target.value)} style={inputStyle}>
                {Object.entries(FONT_MAIN).map(([k, f]) => <option key={k} value={k}>{f.l}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={fieldLabel}>하이라이트(제목) 폰트</span>
              <select value={tweaks.fontHi} onChange={(e) => setTweak('fontHi', e.target.value)} style={inputStyle}>
                {Object.entries(FONT_HI).map(([k, f]) => <option key={k} value={k}>{f.l}</option>)}
              </select>
            </label>
            <Slider label="내용 글자 크기" value={Math.round(tweaks.fz * 100) / 100} min={0.8} max={1.3} step={0.02} unit="×" onChange={(v) => setTweak('fz', v)} />
            <Slider label="자간" value={Math.round(tweaks.track * 1000) / 1000} min={-0.03} max={0.2} step={0.005} unit="em" onChange={(v) => setTweak('track', v)} />
            <Slider label="전체 여백 (배경색 유지)" value={Math.round((tweaks.pad || 0) * 100)} min={0} max={16} step={1} unit="%" onChange={(v) => setTweak('pad', v / 100)} />
            <details>
              <summary style={{ ...fieldLabel, cursor: 'pointer', marginBottom: 8 }}>D-day 여백·크기 조정</summary>
              <Slider label="상단 여백" value={tweaks.topAdj} min={-100} max={200} unit="px" onChange={(v) => setTweak('topAdj', v)} />
              <Slider label="하단 여백" value={tweaks.botAdj} min={-100} max={200} unit="px" onChange={(v) => setTweak('botAdj', v)} />
              <Slider label="숫자↔티저 간격" value={tweaks.gapAdj} min={-40} max={160} unit="px" onChange={(v) => setTweak('gapAdj', v)} />
              <Slider label="줄 간격 (D-↔숫자)" value={tweaks.lineAdj} min={-60} max={120} unit="px" onChange={(v) => setTweak('lineAdj', v)} />
              <Slider label="숫자 크기" value={tweaks.numScale} min={0.7} max={1.2} step={0.02} onChange={(v) => setTweak('numScale', v)} />
            </details>
          </div>

          {/* 브랜드 + 엠블럼 */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid '+UI.line }}>
            <div style={secLabel}>공통 브랜드 정보</div>
            <p style={{ fontSize: 12, color: UI.muted, margin: '0 0 12px', lineHeight: 1.5 }}>표지 푸터·하단 띠 등 모든 카드에 반영됩니다.</p>
            {BRAND_FIELDS.map((f) => (
              <label key={f.k} style={{ display: 'block', marginBottom: 10 }}>
                <span style={fieldLabel}>{f.label}</span>
                <input value={brand[f.k] || ''} placeholder={f.ph} onChange={(e) => setBrand((b) => ({ ...b, [f.k]: e.target.value }))} style={inputStyle} />
              </label>
            ))}
            <button onClick={() => setBrand(DEFAULT_BRAND)} style={{ marginTop: 2, border: '1px solid '+UI.line, background: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: UI.muted }}>기본값으로</button>
            <div style={{ marginTop: 16 }}>
              <div style={secLabel}>엠블럼</div>
              <PhotoRow slot="logo" label="컬러 엠블럼 — 밝은 배경용 (PNG 권장)" png />
              <PhotoRow slot="logo-white" label="흰색 엠블럼 — 어두운 배경용 (PNG 권장)" png />
              <p style={{ fontSize: 12, color: UI.muted, margin: '8px 0 10px', lineHeight: 1.5 }}>카드 배경이 어두우면 흰색 엠블럼이 자동으로 사용됩니다.</p>
              <Slider label="엠블럼 크기" value={Math.round(tweaks.logoScale * 100) / 100} min={0.6} max={1.6} step={0.02} unit="×" onChange={(v) => setTweak('logoScale', v)} />
              <Slider label="엠블럼 좌우 위치" value={tweaks.logoDX} min={-200} max={200} step={4} unit="px" onChange={(v) => setTweak('logoDX', v)} />
              <Slider label="엠블럼 상하 위치" value={tweaks.logoDY} min={-200} max={200} step={4} unit="px" onChange={(v) => setTweak('logoDY', v)} />
            </div>
          </div>
        </aside>
      </div>

      {/* 하단: 카드뉴스 구성 (가로 슬라이드 — 담기/순서/삭제) */}
      <div style={{ flex: '0 0 auto', background: UI.surface, borderTop: '1px solid '+UI.line, boxShadow: '0 -4px 16px rgba(22,32,26,.05)', padding: '10px 14px', display: 'flex', alignItems: 'stretch', gap: 12, minHeight: 86 }}>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, width: 150 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.02em', color: UI.muted }}>카드뉴스 구성 · {deck.length}장</div>
          <button onClick={deckAdd} style={{ border: '1.5px dashed ' + UI.accent, background: UI.soft, color: UI.accent, borderRadius: 999, padding: '8px 10px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ 현재 카드 담기</button>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {deck.length === 0 && <div style={{ color: UI.faint, fontSize: 12.5, alignSelf: 'center' }}>표지 → 본문 → 엔딩 순서로 카드를 담아 한 편을 구성하세요. 상단 ZIP / 한 편 PNG로 내보냅니다.</div>}
          {deck.map((it, i) => {
            const r = deckResolve(it);
            const active = card && it.f === familyKey && it.id === card.id;
            const fw = r ? r.fam.w : 1080, fh = r ? r.fam.h : 1350;
            const tW = 116, tH = Math.round(tW * fh / fw), tS = tW / fw;
            return (
              <div key={i} style={{ flex: '0 0 auto', width: tW + 16, border: '1px solid ' + (active ? UI.accent : UI.line), borderRadius: 10, background: active ? UI.soft : '#fff', padding: 7, display: 'flex', flexDirection: 'column', gap: 5, boxShadow: UI.sh1 }}>
                {/* 썸네일 미리보기 (클릭=편집) */}
                <div onClick={() => { setFamilyKey(it.f); setVariationId(it.id); }} title="이 카드 편집" style={{ position: 'relative', width: tW, height: tH, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', background: '#fff', border: '1px solid '+UI.line }}>
                  {r ? (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: fw, height: fh, transform: `scale(${tS})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                      <window.DDayTweakCtx.Provider value={tweaks}>
                        <window.GContentCtx.Provider value={brand}>{r.card.node}</window.GContentCtx.Provider>
                      </window.DDayTweakCtx.Provider>
                    </div>
                  ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 11, color: UI.danger }}>삭제된 카드</div>}
                  <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(27,33,29,.82)', borderRadius: 999, padding: '1px 7px' }}>{i + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); deckRemove(i); }} title="빼기" style={{ position: 'absolute', top: 3, right: 3, border: 'none', background: UI.danger, color: '#fff', borderRadius: 999, width: 18, height: 18, fontSize: 11, lineHeight: '18px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>✕</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button onClick={() => deckMove(i, -1)} disabled={i === 0} style={{ ...tinyBtn, opacity: i === 0 ? .3 : 1 }} title="앞으로">◀</button>
                  <span style={{ fontSize: 9.5, color: UI.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'center' }}>{r ? famOf(it.f).label : '—'}</span>
                  <button onClick={() => deckMove(i, 1)} disabled={i === deck.length - 1} style={{ ...tinyBtn, opacity: i === deck.length - 1 ? .3 : 1 }} title="뒤로">▶</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {listOpen && (
        <div onClick={() => setListOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(18,24,20,.46)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(580px,94vw)', maxHeight: '88vh', background: UI.surface, borderRadius: 16, border: '1px solid '+UI.line, boxShadow: '0 22px 60px rgba(22,32,26,.24)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid '+UI.line, background: UI.surface2 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: UI.ink }}>저장 · 불러오기</div>
              <button onClick={() => setListOpen(false)} style={{ border: '1px solid '+UI.line, background: '#fff', width: 30, height: 30, borderRadius: 999, fontSize: 18, lineHeight: 1, cursor: 'pointer', color: UI.muted }}>×</button>
            </div>

            <div style={{ overflowY: 'auto' }}>
              {/* 작성자 이름 */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid '+UI.line }}>
                <div style={{ ...fieldLabel, display: 'flex', justifyContent: 'space-between' }}><span>작성자 이름</span><span style={{ color: author.trim() ? UI.accent : '#C8821C', fontWeight: 700 }}>{author.trim() ? '● 입력됨' : '○ 미입력'}</span></div>
                <input value={author} placeholder="예: 홍길동 / 강원연맹" onChange={(e) => setAuthor(e.target.value)} style={inputStyle} />
                <p style={{ fontSize: 11.5, color: UI.muted, margin: '6px 0 0', lineHeight: 1.5 }}>이름 입력 후 저장하면, 이후 변경은 그 카드뉴스에 <b>자동 저장</b>됩니다.</p>
              </div>

              {/* 저장 액션 */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid '+UI.line }}>
                <div style={{ fontSize: 12.5, color: UI.muted, marginBottom: 8 }}>현재 편집 중: <b>{currentName ? currentName : '새 카드뉴스 (미저장)'}</b></div>
                <button disabled={busy} onClick={saveWorking} style={{ width: '100%', border: 'none', background: UI.accent, color: '#fff', borderRadius: 9, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>{currentId ? '저장 (덮어쓰기)' : '저장'}</button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={saveName} placeholder="다른 이름으로 저장 (새 사본)" onChange={(e) => setSaveName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <button disabled={busy} onClick={saveAsNew} style={{ flex: '0 0 auto', border: '1.5px solid ' + UI.accent, background: UI.soft, color: UI.accent, borderRadius: 9, padding: '0 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>새 사본</button>
                </div>
                {listMsg && <div style={{ fontSize: 12.5, color: /오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent|/오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent|/오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent|/오류|실패|않|먼저/.test(listMsg) ? UI.danger : UI.accent, fontWeight: 600, marginTop: 10 }}>{listMsg}</div>}
              </div>

              {/* 목록 */}
              <div style={{ padding: '12px 16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px' }}>
                  <span style={fieldLabel}>저장된 카드뉴스</span>
                  <button disabled={busy} onClick={newProject} style={{ border: '1px solid '+UI.line, background: '#fff', color: UI.muted, borderRadius: 8, padding: '5px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ 새로 만들기</button>
                </div>
                {savedItems === null && <div style={{ padding: 20, textAlign: 'center', color: UI.faint, fontSize: 13 }}>불러오는 중…</div>}
                {savedItems && savedItems.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: UI.faint, fontSize: 13 }}>저장된 카드뉴스가 없습니다.<br />이름 입력 후 "저장"으로 만들어 보세요.</div>}
                {savedItems && savedItems.map((it) => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 10px', borderRadius: 10, background: it.id === currentId ? UI.soft : UI.surface2, border: it.id === currentId ? '1px solid ' + UI.accent : '1px solid '+UI.line, marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#2b2630', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                      <div style={{ fontSize: 11.5, color: UI.faint, marginTop: 2 }}>{(it.author || '익명') + ' · ' + (it.updatedAt || '').slice(0, 16).replace('T', ' ')}</div>
                    </div>
                    <button disabled={busy} onClick={() => loadItem(it)} style={{ border: 'none', background: UI.accent, color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>불러오기</button>
                    <button disabled={busy} onClick={() => deleteItem(it)} style={{ border: '1px solid '+UI.line, background: '#fff', color: UI.danger, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const pillHint = {
  position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(43,38,48,.86)', color: '#fff', borderRadius: 999, padding: '7px 16px',
  fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', pointerEvents: 'none',
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
