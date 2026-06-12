/* 한국잼버리 카드뉴스 제작기 — 제작기 셸 (DesignCanvas/쇼케이스 App 대체)
 * 좌: 패밀리/베리에이션 선택 · 중앙: 네이티브 스케일 라이브 프리뷰(인라인 편집)
 * 우: 전역 브랜드 폼 · 상단: PNG 다운로드 / 서버 저장 / 불러오기 (KV) */

const { useState, useRef, useEffect, useLayoutEffect, useCallback } = React;
const P = window.PAL;

const FAMILIES = [
  { key: 'cover',    label: '표지',      sec: () => window.SEC_COVER,      w: 1080, h: 1080, editable: false },
  { key: 'tpl',      label: '콘텐츠',    sec: () => window.SEC_TEMPLATES,  w: 1080, h: 1080, editable: true  },
  { key: 'news',     label: '소식형',    sec: () => window.SEC_NEWS,       w: 1080, h: 1350, editable: true  },
  { key: 'dday',     label: 'D-피드',    sec: () => window.SEC_DDAY,       w: 1080, h: 1350, editable: false },
  { key: 'ddayTall', label: 'D-스토리',  sec: () => window.SEC_DDAY_TALL,  w: 1080, h: 1920, editable: false },
  { key: 'ddayWide', label: 'D-가로',    sec: () => window.SEC_DDAY_WIDE,  w: 1480, h: 1047, editable: false },
];

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
const EDIT_PREFIX = 'cc-edit:';

/* 현재 localStorage 안의 모든 인라인 편집(cc-edit:*) 수집 */
function collectEditKeys() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(EDIT_PREFIX) === 0) out[k.slice(EDIT_PREFIX.length)] = localStorage.getItem(k);
    }
  } catch (_) {}
  return out;
}
function hydrateEditKeys(editKeys) {
  if (!editKeys) return;
  try { Object.entries(editKeys).forEach(([k, v]) => localStorage.setItem(EDIT_PREFIX + k, v)); } catch (_) {}
}

function Toolbar({ onPng, onSave, onLoad, status, busy }) {
  const btn = (extra) => ({
    border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700,
    cursor: busy ? 'default' : 'pointer', opacity: busy ? .6 : 1, fontFamily: 'inherit', ...extra,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', minWidth: 90, textAlign: 'right' }}>{status}</span>
      <button disabled={busy} onClick={onLoad} style={btn({ background: 'rgba(255,255,255,.14)', color: '#fff' })}>불러오기</button>
      <button disabled={busy} onClick={onSave} style={btn({ background: 'rgba(255,255,255,.14)', color: '#fff' })}>서버 저장</button>
      <button disabled={busy} onClick={onPng} style={btn({ background: P.leaf, color: P.midnight })}>PNG 다운로드</button>
    </div>
  );
}

function App() {
  const [familyKey, setFamilyKey] = useState('cover');
  const [variationId, setVariationId] = useState(null);
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [remount, setRemount] = useState(0);       // 불러오기 후 프리뷰 강제 재마운트
  const [box, setBox] = useState({ w: 0, h: 0 });

  const family = FAMILIES.find((f) => f.key === familyKey);
  const cards = family.sec() || [];
  const card = cards.find((c) => c.id === variationId) || cards[0];

  const stageRef = useRef(null);   // 가용영역 측정
  const nativeRef = useRef(null);  // 캡처 대상(네이티브 px)

  // 가용영역에 맞춰 scale
  useLayoutEffect(() => {
    const el = stageRef.current; if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = box.w && box.h ? Math.min(box.w / family.w, box.h / family.h, 1) : 0.3;

  // 패밀리 변경 시 베리에이션 초기화
  useEffect(() => { setVariationId(cards[0] ? cards[0].id : null); /* eslint-disable-next-line */ }, [familyKey]);

  const flash = (msg) => { setStatus(msg); window.clearTimeout(flash._t); flash._t = window.setTimeout(() => setStatus(''), 3500); };

  const getToken = () => {
    let t = '';
    try { t = localStorage.getItem(TOKEN_KEY) || ''; } catch (_) {}
    if (!t) {
      t = window.prompt('관리자 토큰 (X-Admin-Token)') || '';
      if (t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (_) {} }
    }
    return t;
  };

  const onSave = useCallback(async () => {
    const token = getToken(); if (!token) return;
    setBusy(true); flash('저장 중…');
    try {
      const state = { editKeys: collectEditKeys(), brand };
      const res = await fetch('/api/jamboree', {
        method: 'PUT', headers: { 'content-type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ state }),
      });
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
      hydrateEditKeys(data.state.editKeys);
      if (data.state.brand) setBrand({ ...DEFAULT_BRAND, ...data.state.brand });
      setRemount((n) => n + 1);
      flash('불러옴 ✓');
    } catch (e) { flash('불러오기 실패'); } finally { setBusy(false); }
  }, []);

  const onPng = useCallback(async () => {
    const node = nativeRef.current; if (!node || !window.htmlToImage) { flash('준비 안 됨'); return; }
    setBusy(true); flash('PNG 생성 중…');
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const dataUrl = await window.htmlToImage.toPng(node, {
        width: family.w, height: family.h, pixelRatio: 1, cacheBust: true, backgroundColor: '#ffffff',
      });
      const a = document.createElement('a');
      a.download = `jamboree_${family.key}_${card ? card.id : 'card'}.png`;
      a.href = dataUrl; a.click();
      flash('다운로드 ✓');
    } catch (e) { console.error(e); flash('PNG 실패'); } finally { setBusy(false); }
  }, [family, card]);

  const sideBtn = (active) => ({
    display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
    background: active ? P.purple : 'transparent', color: active ? '#fff' : '#2b2630',
    padding: '9px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: active ? 700 : 500,
    fontFamily: 'inherit', marginBottom: 2, lineHeight: 1.3,
  });

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f3eef0', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", color: '#2b2630' }}>
      {/* 헤더 */}
      <header style={{ height: 60, flex: '0 0 auto', background: P.midnight, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="jamboree/assets/logo.svg" width={32} height={32} alt="" style={{ display: 'block' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.01em' }}>한국잼버리 카드뉴스 제작기</div>
            <div style={{ fontSize: 11, opacity: .6 }}>제16회 한국잼버리 · 2026 강원</div>
          </div>
        </div>
        <Toolbar onPng={onPng} onSave={onSave} onLoad={onLoad} status={status} busy={busy} />
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 좌: 패밀리 + 베리에이션 */}
        <aside style={{ width: 248, flex: '0 0 auto', background: '#fff', borderRight: '1px solid rgba(0,0,0,.08)', overflowY: 'auto', padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#9a93a3', textTransform: 'uppercase', margin: '4px 4px 8px' }}>템플릿 종류</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {FAMILIES.map((f) => (
              <button key={f.key} onClick={() => setFamilyKey(f.key)} style={{
                border: '1px solid', borderColor: f.key === familyKey ? P.purple : 'rgba(0,0,0,.12)',
                background: f.key === familyKey ? P.purple : '#fff', color: f.key === familyKey ? '#fff' : '#2b2630',
                borderRadius: 999, padding: '6px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{f.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#9a93a3', textTransform: 'uppercase', margin: '4px 4px 8px' }}>베리에이션 · {family.w}×{family.h}</div>
          {cards.map((c) => (
            <button key={c.id} onClick={() => setVariationId(c.id)} style={sideBtn(card && c.id === card.id)}>{c.label}</button>
          ))}
        </aside>

        {/* 중앙: 프리뷰 */}
        <main ref={stageRef} style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 28 }}>
          <window.GContentCtx.Provider value={brand}>
            <div key={remount + ':' + familyKey + ':' + (card ? card.id : '')}
              style={{ width: family.w * scale, height: family.h * scale, position: 'relative', flex: '0 0 auto' }}>
              {/* 캡처 대상: 네이티브 px, transform은 부모(scaler)에만 */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: family.w * scale, height: family.h * scale }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: family.w, height: family.h }}>
                  <div ref={nativeRef} style={{ width: family.w, height: family.h, position: 'relative', background: '#fff', overflow: 'hidden' }}>
                    {card ? card.node : null}
                  </div>
                </div>
              </div>
            </div>
          </window.GContentCtx.Provider>
          {family.editable
            ? <div style={pillHint}>본문 텍스트를 <b>더블클릭</b>해 편집하세요</div>
            : <div style={pillHint}>표지·D-day는 프리셋 — 텍스트 폼편집은 다음 단계</div>}
        </main>

        {/* 우: 브랜드 폼 */}
        <aside style={{ width: 280, flex: '0 0 auto', background: '#fff', borderLeft: '1px solid rgba(0,0,0,.08)', overflowY: 'auto', padding: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#9a93a3', textTransform: 'uppercase', marginBottom: 4 }}>공통 브랜드 정보</div>
          <p style={{ fontSize: 12, color: '#8b8492', margin: '0 0 14px', lineHeight: 1.5 }}>표지 푸터·하단 띠 등 모든 카드에 반영됩니다.</p>
          {BRAND_FIELDS.map((f) => (
            <label key={f.k} style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#5a5364', marginBottom: 4 }}>{f.label}</span>
              <input value={brand[f.k] || ''} placeholder={f.ph}
                onChange={(e) => setBrand((b) => ({ ...b, [f.k]: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid rgba(0,0,0,.14)', borderRadius: 8, padding: '8px 10px', fontSize: 13.5, fontFamily: 'inherit', color: '#2b2630' }} />
            </label>
          ))}
          <button onClick={() => setBrand(DEFAULT_BRAND)} style={{ marginTop: 4, border: '1px solid rgba(0,0,0,.14)', background: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#5a5364' }}>기본값으로</button>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,.08)', fontSize: 12, color: '#8b8492', lineHeight: 1.6 }}>
            로고는 <code>jamboree/assets/logo.svg</code> 의 플레이스홀더입니다. 실제 제16회 한국잼버리 엠블럼으로 교체하세요.
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
