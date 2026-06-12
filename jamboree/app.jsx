/* 한국잼버리 카드뉴스 제작기 — 제작기 셸 (Phase 2)
 * 좌: 패밀리/베리에이션 · 중앙: 라이브 프리뷰(더블클릭 인라인편집)
 * 우: ① 이 카드 편집(자동 텍스트 폼 + 색/ D숫자 + 사진 업로드) ② 공통 브랜드 + 엠블럼
 * 상단: PNG · 덱 일괄 PNG · 서버 저장/불러오기(KV) */

(function () { // module scope - Babel standalone runs scripts in shared global scope
const { useState, useRef, useEffect, useLayoutEffect, useCallback, useReducer } = React;
const P = window.PAL;

const FAMILIES = [
  { key: 'cover',    label: '표지',      sec: () => window.SEC_COVER,      w: 1080, h: 1080 },
  { key: 'tpl',      label: '콘텐츠',    sec: () => window.SEC_TEMPLATES,  w: 1080, h: 1080 },
  { key: 'news',     label: '소식형',    sec: () => window.SEC_NEWS,       w: 1080, h: 1350 },
  { key: 'dday',     label: 'D-피드',    sec: () => window.SEC_DDAY,       w: 1080, h: 1350 },
  { key: 'ddayTall', label: 'D-스토리',  sec: () => window.SEC_DDAY_TALL,  w: 1080, h: 1920 },
  { key: 'ddayWide', label: 'D-가로',    sec: () => window.SEC_DDAY_WIDE,  w: 1480, h: 1047 },
];
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

const TOKEN_KEY = 'jamboree:token';
const SWATCHES = [P.purple, P.midnight, P.ocean, P.forest, P.red, P.orange, P.pink, P.river, P.leaf];

const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid rgba(0,0,0,.14)', borderRadius: 8, padding: '8px 10px', fontSize: 13.5, fontFamily: 'inherit', color: '#2b2630' };
const fieldLabel = { display: 'block', fontSize: 12, fontWeight: 600, color: '#5a5364', marginBottom: 4 };
const secLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#9a93a3', textTransform: 'uppercase', margin: '4px 0 8px' };

/* ── 색 스와치 ── */
function Swatches({ value, onPick, clearable }) {
  const v = (value || '').toLowerCase();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
      {SWATCHES.map((c) => (
        <button key={c} type="button" title={c} onClick={() => onPick(c)}
          style={{ width: 26, height: 26, borderRadius: 6, background: c, cursor: 'pointer', padding: 0,
            border: v === c.toLowerCase() ? '3px solid #2b2630' : '1px solid rgba(0,0,0,.18)' }} />
      ))}
      {clearable && (
        <button type="button" onClick={() => onPick('')}
          style={{ height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,.18)', background: '#fff', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', color: '#5a5364', fontFamily: 'inherit' }}>기본</button>
      )}
    </div>
  );
}

/* 업로드 이미지 다운스케일 → dataURL (사진=JPEG, 엠블럼=PNG 투명 유지) */
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

/* 사진/엠블럼 한 줄 — 썸네일 + 업로드/변경/삭제 */
function PhotoRow({ slot, label, png }) {
  const store = useCCStore();
  const inputRef = useRef(null);
  const cur = store.getImage(slot);
  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      try { store.setImage(slot, await imageFileToDataUrl(f, png ? { mime: 'image/png', maxDim: 1024 } : {})); }
      catch (_) {}
    }
    e.target.value = '';
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 44, height: 44, flex: '0 0 auto', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cur ? '#fff' : 'repeating-linear-gradient(45deg,#efeaf3 0 8px,#f7f4fa 8px 16px)' }}>
        {cur ? <img src={cur} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 16, color: '#b3acbd' }}>◳</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#5a5364', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <button type="button" onClick={() => inputRef.current && inputRef.current.click()} style={{ border: 'none', background: 'none', padding: 0, color: P.purple, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{cur ? '변경' : '업로드'}</button>
          {cur && <button type="button" onClick={() => store.setImage(slot, null)} style={{ border: 'none', background: 'none', padding: 0, color: '#b04a4a', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
    </div>
  );
}

/* 자동 텍스트 폼 한 줄 — 스토어 구독(인라인 편집과 양방향 동기화) */
function FieldInput({ field }) {
  const store = useCCStore();
  const v = store.getText(field.ekey);
  const long = (field.def || '').length > 22;
  const common = { value: v != null ? v : (field.def || ''), placeholder: field.def || '', onChange: (e) => store.setText(field.ekey, e.target.value), style: { ...inputStyle, ...(long ? { resize: 'vertical', minHeight: 56, lineHeight: 1.4 } : null) } };
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={fieldLabel}>{(field.label || '항목').slice(0, 22)}</span>
      {long ? <textarea rows={2} {...common} /> : <input {...common} />}
    </label>
  );
}

function Toolbar({ onPng, onDeck, onSave, onLoad, status, busy, deckCount }) {
  const btn = (extra) => ({ border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? .6 : 1, fontFamily: 'inherit', ...extra });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,.78)', minWidth: 96, textAlign: 'right' }}>{status}</span>
      <button disabled={busy} onClick={onLoad} style={btn({ background: 'rgba(255,255,255,.14)', color: '#fff' })}>불러오기</button>
      <button disabled={busy} onClick={onSave} style={btn({ background: 'rgba(255,255,255,.14)', color: '#fff' })}>서버 저장</button>
      <button disabled={busy} onClick={onDeck} style={btn({ background: 'rgba(255,255,255,.14)', color: '#fff' })}>덱 PNG ({deckCount})</button>
      <button disabled={busy} onClick={onPng} style={btn({ background: P.leaf, color: P.midnight })}>PNG 다운로드</button>
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

  const family = FAMILIES.find((f) => f.key === familyKey);
  const cards = family.sec() || [];
  const card = cards.find((c) => c.id === variationId) || cards[0];
  const cardKey = familyKey + '|' + (card ? card.id : '');

  /* ── 카드별 폼 자동등록 (Editable/Placeholder가 자기 자신을 등록) ── */
  const reg = useRef({ field: new Map(), photo: new Map() });
  const [, bump] = useReducer((x) => x + 1, 0);
  const registerField = useCallback((ekey, label, def) => {
    const k = cardKey + ' ' + ekey;
    if (reg.current.field.has(k)) return;
    reg.current.field.set(k, { cardKey, ekey, label, def }); bump();
  }, [cardKey]);
  const registerPhoto = useCallback((slot, label) => {
    const k = cardKey + ' ' + slot;
    if (reg.current.photo.has(k)) return;
    reg.current.photo.set(k, { cardKey, slot, label }); bump();
  }, [cardKey]);
  const fields = Array.from(reg.current.field.values()).filter((f) => f.cardKey === cardKey);
  const photos = Array.from(reg.current.photo.values()).filter((p) => p.cardKey === cardKey);

  const coverScope = familyKey === 'cover' && card ? 'cover-' + card.id : null;
  const ddScope = DD_FMT[familyKey] && card ? DD_FMT[familyKey] + '-' + card.id : null;
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

  const getToken = () => {
    let t = '';
    try { t = localStorage.getItem(TOKEN_KEY) || ''; } catch (_) {}
    if (!t) { t = window.prompt('관리자 토큰 (X-Admin-Token)') || ''; if (t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (_) {} } }
    return t;
  };

  const onSave = useCallback(async () => {
    const token = getToken(); if (!token) return;
    setBusy(true); flash('저장 중…');
    try {
      const state = Object.assign(window.CCStore.collect(), { brand });
      const res = await fetch('/api/jamboree', { method: 'PUT', headers: { 'content-type': 'application/json', 'X-Admin-Token': token }, body: JSON.stringify({ state }) });
      if (res.status === 401) { try { localStorage.removeItem(TOKEN_KEY); } catch (_) {} flash('토큰 오류'); return; }
      if (!res.ok) { flash('저장 실패'); return; }
      flash('저장됨 ✓');
    } catch (e) { flash('네트워크 오류'); } finally { setBusy(false); }
  }, [brand]);

  const onLoad = useCallback(async () => {
    setBusy(true); flash('불러오는 중…');
    try {
      const res = await fetch('/api/jamboree');
      const data = await res.json();
      if (!data || !data.state) { flash('저장본 없음'); return; }
      window.CCStore.hydrate(data.state);
      if (data.state.brand) setBrand(Object.assign({}, DEFAULT_BRAND, data.state.brand));
      setRemount((n) => n + 1);
      flash('불러옴 ✓');
    } catch (e) { flash('불러오기 실패'); } finally { setBusy(false); }
  }, []);

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
    } catch (e) { console.error(e); flash('PNG 실패'); } finally { setBusy(false); }
  }, [family, card]);

  /* ── 덱 일괄 export: 오프스크린 네이티브 렌더 → PNG 순차 다운로드 ── */
  const deckRef = useRef(null);
  const ensureDeck = () => {
    if (deckRef.current) return deckRef.current;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-99999px;top:0;z-index:-1;pointer-events:none;';
    document.body.appendChild(host);
    deckRef.current = { host, root: ReactDOM.createRoot(host) };
    return deckRef.current;
  };
  const onDeck = useCallback(async () => {
    if (!window.htmlToImage || !cards.length) { flash('준비 안 됨'); return; }
    setBusy(true);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const { host, root } = ensureDeck();
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        flash(`덱 ${i + 1}/${cards.length}`);
        await new Promise((res) => {
          root.render(
            <div style={{ position: 'relative', width: family.w, height: family.h, background: '#fff', overflow: 'hidden' }}>
              <window.GContentCtx.Provider value={brand}>{c.node}</window.GContentCtx.Provider>
            </div>
          );
          requestAnimationFrame(() => requestAnimationFrame(res));
        });
        const target = host.firstElementChild;
        const dataUrl = await window.htmlToImage.toPng(target, { width: family.w, height: family.h, pixelRatio: 1, cacheBust: true, backgroundColor: '#ffffff' });
        const a = document.createElement('a'); a.download = `jamboree_${family.key}_${c.id}.png`; a.href = dataUrl; a.click();
        await new Promise((r) => setTimeout(r, 350));
      }
      root.render(null);
      flash('덱 완료 ✓');
    } catch (e) { console.error(e); flash('덱 실패'); } finally { setBusy(false); }
  }, [cards, family, brand]);

  const sideBtn = (active) => ({
    display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
    background: active ? P.purple : 'transparent', color: active ? '#fff' : '#2b2630',
    padding: '9px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: active ? 700 : 500, fontFamily: 'inherit', marginBottom: 2, lineHeight: 1.3,
  });

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f3eef0', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", color: '#2b2630' }}>
      <header style={{ height: 60, flex: '0 0 auto', background: P.midnight, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={store.getImage('logo') || 'jamboree/assets/logo.svg'} width={32} height={32} alt="" style={{ display: 'block', objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.01em' }}>한국잼버리 카드뉴스 제작기</div>
            <div style={{ fontSize: 11, opacity: .6 }}>제16회 한국잼버리 · 2026 강원</div>
          </div>
        </div>
        <Toolbar onPng={onPng} onDeck={onDeck} onSave={onSave} onLoad={onLoad} status={status} busy={busy} deckCount={cards.length} />
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 좌: 패밀리 + 베리에이션 */}
        <aside style={{ width: 248, flex: '0 0 auto', background: '#fff', borderRight: '1px solid rgba(0,0,0,.08)', overflowY: 'auto', padding: 14 }}>
          <div style={secLabel}>템플릿 종류</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {FAMILIES.map((f) => (
              <button key={f.key} onClick={() => setFamilyKey(f.key)} style={{
                border: '1px solid', borderColor: f.key === familyKey ? P.purple : 'rgba(0,0,0,.12)',
                background: f.key === familyKey ? P.purple : '#fff', color: f.key === familyKey ? '#fff' : '#2b2630',
                borderRadius: 999, padding: '6px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{f.label}</button>
            ))}
          </div>
          <div style={secLabel}>베리에이션 · {family.w}×{family.h}</div>
          {cards.map((c) => (
            <button key={c.id} onClick={() => setVariationId(c.id)} style={sideBtn(card && c.id === card.id)}>{c.label}</button>
          ))}
        </aside>

        {/* 중앙: 프리뷰 */}
        <main ref={stageRef} style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 28 }}>
          <window.CCRegisterFieldCtx.Provider value={registerField}>
            <window.CCRegisterPhotoCtx.Provider value={registerPhoto}>
              <window.GContentCtx.Provider value={brand}>
                <div key={remount + ':' + cardKey} style={{ width: family.w * scale, height: family.h * scale, position: 'relative', flex: '0 0 auto' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: family.w * scale, height: family.h * scale }}>
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: family.w, height: family.h }}>
                      <div ref={nativeRef} style={{ width: family.w, height: family.h, position: 'relative', background: '#fff', overflow: 'hidden' }}>
                        {card ? card.node : null}
                      </div>
                    </div>
                  </div>
                </div>
              </window.GContentCtx.Provider>
            </window.CCRegisterPhotoCtx.Provider>
          </window.CCRegisterFieldCtx.Provider>
          <div style={pillHint}>텍스트 <b>더블클릭</b> 또는 오른쪽 패널에서 편집</div>
        </main>

        {/* 우: 카드 편집 + 브랜드 */}
        <aside style={{ width: 300, flex: '0 0 auto', background: '#fff', borderLeft: '1px solid rgba(0,0,0,.08)', overflowY: 'auto', padding: 18 }}>
          <div style={secLabel}>이 카드 편집 · {card ? card.label : ''}</div>

          {(coverScope || ddScope) && (
            <div style={{ marginBottom: 14 }}>
              {ddScope && !ddIsDay && (
                <label style={{ display: 'block', marginBottom: 10 }}>
                  <span style={fieldLabel}>D-숫자 (진행바 자동 반영)</span>
                  <input type="number" min="0" max="999" value={store.getProp(ddScope, 'n', '')} placeholder={ddDefaultN}
                    onChange={(e) => store.setProp(ddScope, 'n', e.target.value)} style={inputStyle} />
                </label>
              )}
              <span style={fieldLabel}>배경색</span>
              <Swatches value={store.getProp(coverScope || ddScope, 'bg', '')} onPick={(c) => store.setProp(coverScope || ddScope, 'bg', c)} clearable />
              {coverScope && (
                <div style={{ marginTop: 10 }}>
                  <span style={fieldLabel}>카테고리 색</span>
                  <Swatches value={store.getProp(coverScope, 'catColor', '')} onPick={(c) => store.setProp(coverScope, 'catColor', c)} clearable />
                </div>
              )}
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
          {fields.length === 0 && photos.length === 0 && !coverScope && !ddScope && (
            <p style={{ fontSize: 12.5, color: '#8b8492', lineHeight: 1.5, margin: '0 0 14px' }}>이 카드에는 편집 항목이 없습니다.</p>
          )}

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,.08)' }}>
            <div style={secLabel}>공통 브랜드 정보</div>
            <p style={{ fontSize: 12, color: '#8b8492', margin: '0 0 12px', lineHeight: 1.5 }}>표지 푸터·하단 띠 등 모든 카드에 반영됩니다.</p>
            {BRAND_FIELDS.map((f) => (
              <label key={f.k} style={{ display: 'block', marginBottom: 10 }}>
                <span style={fieldLabel}>{f.label}</span>
                <input value={brand[f.k] || ''} placeholder={f.ph} onChange={(e) => setBrand((b) => ({ ...b, [f.k]: e.target.value }))} style={inputStyle} />
              </label>
            ))}
            <button onClick={() => setBrand(DEFAULT_BRAND)} style={{ marginTop: 2, border: '1px solid rgba(0,0,0,.14)', background: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#5a5364' }}>기본값으로</button>

            <div style={{ marginTop: 18 }}>
              <div style={secLabel}>엠블럼</div>
              <PhotoRow slot="logo" label="제16회 한국잼버리 엠블럼 (PNG 권장)" png />
            </div>
          </div>
        </aside>
      </div>
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
