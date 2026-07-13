/* krjam-dcount — D-COUNT 카드 신청 시스템 (전체).
 *  달력형(월 그리드·일요일 시작·실시간) · 신청 폼(휴대폰 강제·문구 2줄·상단문구 자동) ·
 *  신청번호=이름/비번=전화 끝 4자리 · 조회/수정/철회 · 승인 시 A4 출력 · 관리자(통계·마스터스타일·슬롯).
 *  카드 = DCountCard(D-가로 = A4 가로). 저장 = /api/krjam-dcount (KV). 마감 없음.
 *  ⚠️ Babel standalone 공유 스코프 → IIFE 필수. */
(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const API = '/api/krjam-dcount';
  const ADMIN_KEY = 'krjam-dcount:admin';
  const P = window.PAL;
  let MASTER = {};   // 현재 마스터 스타일(출력용 동기 참조)

  /* ── i18n (국문/영문) — 데이터 키는 한국어 유지, 표시 라벨만 영문 ── */
  let LANG = (function () {
    try {
      const u = new URLSearchParams(location.search).get('lang'); if (u === 'en' || u === 'ko') return u;
      const s = localStorage.getItem('dcount:lang'); if (s === 'en' || s === 'ko') return s;
      return (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
    } catch (_) { return 'ko'; }
  })();
  try { document.documentElement.lang = LANG; window.__dcLang = LANG; } catch (_) {}
  const L = (ko, en) => (LANG === 'en' ? en : ko);
  const SS_LABEL = (s) => L(s, { '신청가능': 'Available', '검토중': 'In review', '확정': 'Confirmed', '닫힘': 'Closed' }[s] || s);
  const ST_LABEL = (s) => L(s, { '제출됨': 'Submitted', '수정요청': 'Changes requested', '승인': 'Approved', '반려': 'Rejected', '철회': 'Withdrawn' }[s] || s);

  const SS_COLOR = { '신청가능': 'var(--st-ready)', '검토중': 'var(--st-draft)', '확정': 'var(--accent)', '닫힘': 'var(--faint)' };
  const ST_COLOR = { '제출됨': 'var(--st-draft)', '수정요청': '#C0492F', '승인': 'var(--st-ready)', '반려': 'var(--danger)', '철회': 'var(--faint)' };
  const SWATCHES = [P.purple, P.midnight, P.ocean, P.forest, P.red, P.orange, P.river, P.leaf, P.pink, '#ffffff'];
  const CONSENTS = [
    { k: 'privacy', t: '개인정보 수집·이용 (필수)', d: '신청자명·휴대전화·소속대·접속 IP를 카드 검토·게시·통지 목적으로 수집하며, 행사 종료 후 3개월(~2026-11-09)까지 보관 후 삭제합니다.',
      te: 'Collection & use of personal data (required)', de: 'Your name, mobile number, unit and IP address are collected to review, publish and notify about your card, and are deleted within 3 months after the event (by 2026-11-09).' },
    { k: 'portrait', t: '초상권 / 사진 게시 (필수)', d: '카드에 인물 사진을 포함하는 경우, 해당 인물의 게시·활용에 동의합니다.',
      te: 'Portrait rights / photo publishing (required)', de: 'If your card includes photos of people, you agree to those people being published and used.' },
    { k: 'thirdparty', t: '제3자 초상 확인 (필수)', d: '사진 속 타인이 있는 경우, 그 사람의 게시 동의를 신청자가 직접 받았음을 확인합니다.',
      te: 'Third-party portrait confirmation (required)', de: 'If other people appear in your photos, you confirm you have obtained their consent to be published.' },
    { k: 'license', t: '콘텐츠 사용권 (필수)', d: '제출한 카드·사진을 제16회 한국잼버리/한국스카우트연맹이 게시·홍보 및 잼버리 화보집 제작에 활용할 수 있도록 사용권을 부여합니다.',
      te: 'Content licence (required)', de: 'You grant the 16th Korea National Jamboree / Korea Scout Association a licence to publish, promote and include your card and photos in the Jamboree photo book.' },
    { k: 'age14', t: '만 14세 이상 확인 (필수)', d: '신청자는 만 14세 이상입니다. (14세 미만은 신청 대상이 아닙니다.)',
      te: 'Age 14+ confirmation (required)', de: 'The applicant is aged 14 or older. (Under-14s are not eligible to apply.)' },
  ];
  const phoneOk = (s) => /^01\d{8,9}$/.test(String(s || '').replace(/\D/g, ''));
  const hyphenPhone = (v) => { const d = String(v || '').replace(/\D/g, '').slice(0, 11); if (d.length <= 3) return d; if (d.length <= 7) return d.slice(0, 3) + '-' + d.slice(3); return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7); };
  const EMBLEMS = [['', '자동'], ['/jamboree/assets/logo.png', '컬러'], ['/jamboree/assets/logo-white.png', '흰색'], ['/jamboree/assets/logo-asset.png', '매듭']];
  async function uploadImage(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error(L('각 이미지는 5MB 이하만 가능합니다.', 'Each image must be 5MB or smaller.'));
    const r = await fetch('/api/image', { method: 'POST', headers: { 'content-type': file.type }, body: file });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(j.error === 'too_large' ? L('5MB를 초과했습니다.', 'Exceeds 5MB.') : j.error === 'unsupported_type' ? L('이미지 파일만 가능합니다.', 'Image files only.') : L('업로드 실패', 'Upload failed'));
    return j.url;
  }

  async function jget(url, headers) { const r = await fetch(url, { headers: headers || {} }); return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) }; }
  async function jsend(method, body, headers) {
    const r = await fetch(API, { method, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}), body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) };
  }
  // 관리자 인증 = 공유 비밀번호(scout1922). 서버는 헤더 X-CC-Pass 로 검증(TOTP 세션도 병행 허용).
  function adminToken() { try { const s = JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null'); return (s && s.pass && s.exp > Date.now()) ? s.pass : null; } catch (_) { return null; } }
  function setAdmin(s) { try { if (s) localStorage.setItem(ADMIN_KEY, JSON.stringify(s)); else localStorage.removeItem(ADMIN_KEY); } catch (_) {} }
  function bearer() { const p = adminToken(); return p ? { 'X-CC-Pass': p } : {}; }
  function copy(t) { try { navigator.clipboard.writeText(t); } catch (_) {} }
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

  /* ── A4(가로) PNG 출력 — 승인된 카드 ── */
  async function exportA4(props, filename) {
    if (!window.htmlToImage) { alert(L('출력 라이브러리 로드 실패 — 새로고침 후 다시 시도하세요.', 'Failed to load the export library — please refresh and try again.')); return; }
    const W = window.DCOUNT_WIDE.w, H = window.DCOUNT_WIDE.h;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + W + 'px;height:' + H + 'px;';
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);
    root.render(
      React.createElement(window.DCMasterCtx.Provider, { value: MASTER },
        React.createElement('div', { style: { width: W, height: H, position: 'relative' } },
          React.createElement(window.DCountCard, props)))
    );
    await new Promise((r) => setTimeout(r, 450));
    try { await document.fonts.ready; } catch (_) {}
    try {
      const url = await window.htmlToImage.toPng(host.firstChild, { width: W, height: H, pixelRatio: 2, cacheBust: true });
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    } catch (e) { alert(L('출력 실패: ', 'Export failed: ') + (e && e.message)); }
    root.unmount(); host.remove();
  }
  const cardProps = (a) => ({ dNumber: a.dNumber, isDay: false, teaser: a.teaser, bgColor: a.bgColor, inkColor: a.inkColor, sceneIdx: a.sceneIdx });
  const fileFor = (a) => 'D-' + a.dNumber + '_' + (a.name || 'card') + '.png';

  /* 1480×1047 카드를 컨테이너 폭에 맞춰 축소 */
  function ScaledCard(props) {
    const ref = useRef(null);
    const [w, setW] = useState(0);
    useEffect(() => {
      const el = ref.current; if (!el) return;
      const upd = () => setW(el.clientWidth || 0);
      upd();
      let ro; try { ro = new ResizeObserver(upd); ro.observe(el); } catch (_) { window.addEventListener('resize', upd); }
      const t = setTimeout(upd, 80);
      return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', upd); clearTimeout(t); };
    }, []);
    const W = window.DCOUNT_WIDE.w, H = window.DCOUNT_WIDE.h;
    const scale = w ? w / W : 0;
    return (
      <div ref={ref} style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: W + ' / ' + H, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)', background: '#e9ece5' }}>
          {scale > 0 && <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, transform: 'scale(' + scale + ')', transformOrigin: 'top left' }}><window.DCountCard {...props} /></div>}
        </div>
      </div>
    );
  }
  const SsTag = ({ s }) => <span className="dc-ss" style={{ background: SS_COLOR[s] || 'var(--faint)' }}>{SS_LABEL(s)}</span>;
  const StTag = ({ s }) => <span className="dc-tag" style={{ background: ST_COLOR[s] || 'var(--faint)' }}>{ST_LABEL(s)}</span>;

  /* ── 달력(월 그리드, 일요일 시작) ── */
  function MonthGrid({ ym, byDate, appByDate, mode, onApply, onToggle, onPick, today, busy }) {
    const y = parseInt(ym.slice(0, 4), 10), m = parseInt(ym.slice(5, 7), 10);
    const first = new Date(y, m - 1, 1).getDay();
    const days = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    const dows = L(['일', '월', '화', '수', '목', '금', '토'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    const EN_MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return (
      <div className="dc-month">
        <div className="dc-mtitle">{L(y + '년 ' + m + '월', EN_MON[m - 1] + ' ' + y)}</div>
        <div className="dc-dow">{dows.map((w, i) => <span key={i} className={i === 0 ? 'sun' : ''}>{w}</span>)}</div>
        <div className="dc-days">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="dc-day empty" />;
            const ds = y + '-' + pad2(m) + '-' + pad2(d);
            const slot = byDate[ds];
            const tcl = ds === today ? ' today' : '';
            if (mode === 'approved') {
              const app = appByDate && appByDate[ds];
              if (app) return (
                <div key={i} className={'dc-day slot approved' + tcl} onClick={() => onPick && onPick(app)} title={'D-' + app.dNumber + ' · ' + (app.name || '') + ' · 승인 확정'}>
                  <span className="dnum">{d}</span><div className="dd">D-{app.dNumber}</div>
                  <div className="dc-appname">{app.name || '—'}</div>
                </div>
              );
              if (slot) return <div key={i} className={'dc-day slot dimmed' + tcl}><span className="dnum">{d}</span><div className="dd">D-{slot.dNumber}</div></div>;
              return <div key={i} className={'dc-day' + tcl}><span className="dnum">{d}</span></div>;
            }
            if (!slot) return <div key={i} className={'dc-day' + tcl}><span className="dnum">{d}</span></div>;
            if (mode === 'admin') return (
              <div key={i} className={'dc-day slot' + tcl + (slot.isOpen ? ' open' : ' dimmed')}>
                <span className="dnum">{d}</span><div className="dd">D-{slot.dNumber}</div>
                <button className="dc-toggle" style={{ color: slot.isOpen ? 'var(--st-ready)' : 'var(--faint)' }} disabled={busy} onClick={() => onToggle(slot)}>{slot.isOpen ? '열림' : '닫힘'}</button>
              </div>
            );
            const open = slot.slotStatus === '신청가능';
            return (
              <div key={i} className={'dc-day slot' + tcl + (open ? ' open' : ' dimmed')} onClick={() => open && onApply(slot)} title={'D-' + slot.dNumber + ' · ' + slot.slotStatus}>
                <span className="dnum">{d}</span><div className="dd">D-{slot.dNumber}</div>
                <i className="sdot" style={{ background: SS_COLOR[slot.slotStatus] || 'var(--faint)' }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  function monthsOf(slots) { const set = {}; slots.forEach((s) => { set[s.targetDate.slice(0, 7)] = 1; }); return Object.keys(set).sort(); }

  const fmtMd = (ds) => { const p = ds.split('-'); return parseInt(p[1], 10) + '/' + parseInt(p[2], 10); };
  function Calendar({ slots, loading, onApply }) {
    if (loading && !slots) return <div className="dc-card"><p className="dc-note">{L('불러오는 중…', 'Loading…')}</p></div>;
    const sl = (slots || []).slice().sort((a, z) => z.dNumber - a.dNumber);   // D-40 → D-5
    const groups = [];
    sl.forEach((s) => { const gi = Math.floor((40 - s.dNumber) / 5); (groups[gi] = groups[gi] || []).push(s); });   // 5일 단위
    return (
      <div className="dc-card">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, fontSize: 12, color: 'var(--muted)' }}>
          {['신청가능', '검토중', '확정', '닫힘'].map((s) => <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 9, height: 9, borderRadius: '50%', background: SS_COLOR[s] }} />{SS_LABEL(s)}</span>)}
        </div>
        {groups.map((g, gi) => {
          if (!g || !g.length) return null;
          return (
            <div key={gi} className="dc-grp">
              <div className="dc-grp-row">
                {g.map((s) => {
                  const open = s.slotStatus === '신청가능';
                  return (
                    <div key={s.targetDate} className={'dc-slot2' + (open ? ' open' : ' dim')} onClick={() => open && onApply(s)} title={s.targetDate + ' · ' + s.slotStatus}>
                      <div className="d2-dn">D-{s.dNumber}</div>
                      <div className="d2-dt">{fmtMd(s.targetDate)}</div>
                      <span className="dc-ss2" style={{ background: SS_COLOR[s.slotStatus] || 'var(--faint)' }}>{SS_LABEL(s.slotStatus)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── 카드 커스터마이저(신청·수정 공용): 문구(2줄)·배경색·글씨색·오른쪽 오브제 ── */
  function Customizer({ form, set }) {
    const labels = window.DCOUNT_SCENE_LABELS || [];
    return (
      <div>
        <div className="dc-field">
          <label>{L('카드 문구 (두 줄까지)', 'Card message (up to two lines)')}</label>
          <textarea className="dc-input" rows={2} value={form.teaser} maxLength={160} onChange={(e) => set('teaser', e.target.value)} placeholder={L('예: 세계가 강원으로\n향합니다', 'e.g. The world is heading\nto Gangwon')} style={{ resize: 'vertical', lineHeight: 1.5 }} />
        </div>
        <div className="dc-row">
          <div className="dc-field">
            <label>{L('배경색', 'Background colour')}</label>
            <div className="dc-swatches">
              {SWATCHES.map((c) => <button key={c} type="button" className="dc-sw" style={{ background: c, outline: form.bgColor === c ? '2px solid var(--accent)' : 'none' }} onClick={() => set('bgColor', c)} title={c} />)}
              <input type="color" value={form.bgColor || '#622599'} onChange={(e) => set('bgColor', e.target.value)} style={{ width: 30, height: 28, padding: 0, border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer' }} />
              <button type="button" className="dc-btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => set('bgColor', '')}>{L('기본', 'Default')}</button>
            </div>
          </div>
          <div className="dc-field">
            <label>{L('글씨색', 'Text colour')}</label>
            <div className="dc-swatches">
              {['#ffffff', P.midnight, P.purple, P.orange, P.leaf].map((c) => <button key={c} type="button" className="dc-sw" style={{ background: c, outline: form.inkColor === c ? '2px solid var(--accent)' : 'none' }} onClick={() => set('inkColor', c)} title={c} />)}
              <input type="color" value={form.inkColor || '#ffffff'} onChange={(e) => set('inkColor', e.target.value)} style={{ width: 30, height: 28, padding: 0, border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer' }} />
              <button type="button" className="dc-btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => set('inkColor', '')}>{L('기본', 'Default')}</button>
            </div>
          </div>
        </div>
        <div className="dc-field">
          <label>{L('오른쪽 오브제 (색은 배경에 자동 매칭)', 'Right-side motif (colour auto-matches the background)')}</label>
          <select className="dc-input" value={form.sceneIdx} onChange={(e) => set('sceneIdx', e.target.value)}>
            <option value="">{L('기본 (자동)', 'Default (auto)')}</option>
            {labels.map((l, i) => <option key={i} value={i}>{i + 1}. {l}</option>)}
          </select>
        </div>
      </div>
    );
  }

  /* ── 신청 폼(모달) ── */
  function ApplyModal({ slot, onClose, onDone }) {
    const [form, setForm] = useState({ name: '', contact: '', org: '', teaser: '', bgColor: '', inkColor: '', sceneIdx: '' });
    const [consents, setConsents] = useState({});
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const set = (k, v) => setForm((f) => Object.assign({}, f, { [k]: v }));
    const allConsent = CONSENTS.every((c) => consents[c.k]);
    const canSubmit = form.name.trim() && phoneOk(form.contact) && allConsent && !busy;

    async function submit() {
      if (!form.name.trim()) { setErr(L('신청자 이름은 필수입니다.', 'Applicant name is required.')); return; }
      if (!phoneOk(form.contact)) { setErr(L('휴대전화 번호를 정확히 입력하세요 (예: 010-1234-5678).', 'Enter a valid mobile number (e.g. 010-1234-5678).')); return; }
      if (!allConsent) { setErr(L('필수 동의 항목에 모두 동의해야 합니다.', 'You must agree to all required consent items.')); return; }
      setBusy(true); setErr('');
      const { ok, j } = await jsend('POST', { action: 'apply', targetDate: slot.targetDate, name: form.name, contact: form.contact, org: form.org, teaser: form.teaser, bgColor: form.bgColor, inkColor: form.inkColor, sceneIdx: form.sceneIdx, consents: { privacy: true, portrait: true, thirdparty: true, license: true, age14: true } });
      setBusy(false);
      if (ok && j.ok) onDone(j);
      else setErr(j.error === 'rate_limited' ? L('신청이 너무 잦습니다. 잠시 후 다시 시도하세요.', 'Too many requests. Please try again shortly.')
        : j.error === 'already_taken' ? L('방금 이 날짜가 선점되었습니다. 다른 날짜를 선택하세요.', 'This date was just taken. Please choose another date.')
        : j.error === 'name_taken' ? L('이미 같은 이름으로 신청된 건이 있습니다. (신청 조회에서 확인/철회하세요)', 'There is already an application under this name. (Check or withdraw it in “Check application”.)')
          : j.error === 'bad_phone' ? L('휴대전화 번호 형식을 확인하세요.', 'Please check the mobile number format.')
            : j.error === 'name_required' ? L('이름을 입력하세요.', 'Please enter a name.')
              : j.error === 'slot_closed' ? L('이 슬롯은 닫혀 있습니다.', 'This slot is closed.')
                : L('신청 처리 중 오류가 발생했습니다.', 'An error occurred while submitting your application.'));
    }

    return (
      <div className="dc-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dc-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{slot.dNumber}</span>
            <b style={{ fontSize: 16 }}>{L(slot.targetDate + ' 디데이 카드', 'D-day card · ' + slot.targetDate)}</b><span style={{ flex: 1 }} />
            <button className="dc-btn ghost" style={{ padding: '6px 10px' }} onClick={onClose}>{L('닫기', 'Close')}</button>
          </div>
          <div style={{ display: 'grid', gap: 18 }}>
            <ScaledCard dNumber={slot.dNumber} isDay={false} teaser={form.teaser || L('카드 문구를 입력하세요', 'Enter your card message')} bgColor={form.bgColor} inkColor={form.inkColor} sceneIdx={form.sceneIdx} />
            <div>
              <div className="dc-row">
                <div className="dc-field"><label>{L('신청자 이름 *', 'Applicant name *')}</label><input className="dc-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={L('홍길동', 'e.g. Jane Smith')} /></div>
                <div className="dc-field"><label>{L('휴대전화 * (끝 4자리 = 비밀번호)', 'Mobile * (last 4 digits = password)')}</label><input className="dc-input" value={form.contact} onChange={(e) => set('contact', hyphenPhone(e.target.value))} placeholder="010-1234-5678" inputMode="numeric" maxLength={13} style={form.contact && !phoneOk(form.contact) ? { borderColor: 'var(--danger)' } : null} /></div>
                <div className="dc-field"><label>{L('소속대', 'Scout unit')}</label><input className="dc-input" value={form.org} onChange={(e) => set('org', e.target.value)} /></div>
              </div>
              <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0 14px' }} />
              <Customizer form={form} set={set} />
              <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0 6px' }} />
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', margin: '8px 0 4px' }}>{L('동의 (전 항목 필수)', 'Consent (all items required)')}</div>
              {CONSENTS.map((c) => (
                <label key={c.k} className="dc-consent">
                  <input type="checkbox" checked={!!consents[c.k]} onChange={(e) => setConsents((p) => Object.assign({}, p, { [c.k]: e.target.checked }))} />
                  <span><b>{L(c.t, c.te)}</b> — {L(c.d, c.de)}</span>
                </label>
              ))}
              <div className="dc-err">{err}</div>
              <button className="dc-btn primary" disabled={!canSubmit} onClick={submit} style={{ width: '100%', marginTop: 8 }}>{busy ? L('신청 중…', 'Submitting…') : L('신청 제출 (날짜 선점)', 'Submit application (reserve date)')}</button>
              <p className="dc-note" style={{ marginTop: 8 }}>{L('제출 즉시 이 날짜가 선점되고, ', 'This date is reserved as soon as you submit, and ')}<b>{L('신청자 이름·비밀번호(휴대전화 끝 4자리)', 'your name and password (last 4 digits of your mobile)')}</b>{L('로 조회·수정할 수 있어요. 홍보부에서 ', ' let you check and edit it. The Media team ')}<b>{L('매일 오후 12시·오후 6시경 일괄 승인', 'approves in batches around 12:00 and 18:00 KST daily')}</b>{L('하며, 승인되면 사진을 올릴 수 있어요.', '. Once approved, you can upload photos.')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ResultModal({ result, onClose }) {
    return (
      <div className="dc-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dc-modal" style={{ width: 'min(440px,100%)', textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)', marginBottom: 6 }}>{L('신청 완료 ✓', 'Application complete ✓')}</div>
          <p className="dc-note">{L('D-' + result.dNumber + ' (' + result.targetDate + ') 선점 완료! 조회·사진 업로드 시 아래 정보를 사용하세요.', 'D-' + result.dNumber + ' (' + result.targetDate + ') reserved! Use the details below to check your application and upload photos.')}</p>
          <div style={{ margin: '16px 0 6px' }}><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{L('신청자 이름', 'Applicant name')}</div><div className="dc-mono">{result.applicationNo}</div></div>
          <div style={{ margin: '12px 0 14px' }}><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{L('비밀번호 (휴대전화 끝 4자리)', 'Password (last 4 digits of mobile)')}</div><div className="dc-mono">{result.password}</div></div>
          <div style={{ background: 'var(--accent-soft)', borderRadius: 'var(--r-2)', padding: '11px 13px', fontSize: 12.5, color: 'var(--accent-ink)', lineHeight: 1.55, textAlign: 'left', margin: '0 0 14px' }}>
            {L('홍보부에서 ', 'The Media team ')}<b>{L('매일 오후 12시·오후 6시경에 일괄 검토·승인', 'reviews and approves in batches around 12:00 and 18:00 KST daily')}</b>{L('합니다. 신청 시점에 따라 다음 승인 시간에 처리돼요. 급하면 ', '. Your application is handled at the next approval window. If urgent, contact the ', )}<b>{L('한국스카우트연맹 ', 'Korea Scout Association ')}<a href="tel:0263352000" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>02-6335-2000</a></b>{L(' 으로 연락주세요.', '.')}
          </div>
          <button className="dc-btn primary" onClick={onClose} style={{ minWidth: 120 }}>{L('확인', 'OK')}</button>
        </div>
      </div>
    );
  }

  /* ── 승인 후 사진 공유(최대 3장·각 5MB) ── */
  function PhotoUploader({ no, pw, app, onUpdate }) {
    const [photos, setPhotos] = useState(app.photos || []);
    const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
    async function save(next) {
      setBusy(true); setErr('');
      const { ok, j } = await jsend('POST', { action: 'photos', applicationNo: no, password: pw, photos: next });
      setBusy(false);
      if (ok && j.ok) { setPhotos(j.application.photos || []); if (onUpdate) onUpdate(j.application); }
      else setErr(j.error === 'not_approved' ? L('승인된 신청만 사진을 올릴 수 있습니다.', 'Only approved applications can upload photos.') : j.error === 'rate_limited' ? L('잠시 후 다시 시도하세요.', 'Please try again shortly.') : L('저장 실패', 'Save failed'));
    }
    async function onFiles(e) {
      const files = Array.from(e.target.files || []); e.target.value = '';
      if (!files.length) return;
      if (photos.length + files.length > 3) { setErr(L('사진은 최대 3장까지입니다.', 'Up to 3 photos only.')); return; }
      setBusy(true); setErr('');
      try { const urls = []; for (const f of files) urls.push(await uploadImage(f)); await save(photos.concat(urls)); }
      catch (ex) { setErr(ex.message || L('업로드 실패', 'Upload failed')); setBusy(false); }
    }
    return (
      <div style={{ marginTop: 16, border: '2px solid var(--accent)', borderRadius: 'var(--r-2)', background: 'var(--accent-soft)', padding: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent-ink)', marginBottom: 4 }}>{L('📷 D-day 카운트 사진 업로드하기', '📷 Upload your D-day countdown photos')}</div>
        <div style={{ fontSize: 12, color: 'var(--accent-ink)', opacity: .85, marginBottom: 10 }}>{L('A4로 출력한 카드와 함께 촬영한 사진을 올려주세요. (최대 3장 · 각 5MB)', 'Upload photos taken with your A4-printed card. (Up to 3 · 5MB each)')}</div>
        <div className="dc-photos">
          {photos.map((u, i) => (<div key={i} className="dc-photo"><img src={u} alt="" /><button className="rm" disabled={busy} onClick={() => save(photos.filter((_, k) => k !== i))}>×</button></div>))}
          {photos.length < 3 && <label className="dc-photo-add">{busy ? L('업로드 중…', 'Uploading…') : L('＋ 사진 추가', '＋ Add photo')}<input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFiles} /></label>}
        </div>
        {err && <div className="dc-err">{err}</div>}
        <p className="dc-note" style={{ marginTop: 8, color: 'var(--danger)' }}>{L('⚠️ 승인 완료 후 ', '⚠️ If photos are not shared within ')}<b>{L('7일 이내', '7 days')}</b>{L('에 사진이 공유되지 않으면 ', ' of approval, the application ')}<b>{L('별도의 고지 없이 취소', 'may be cancelled without further notice')}</b>{L('될 수 있습니다.', '.')}</p>
      </div>
    );
  }

  /* ── 조회/수정/철회 ── */
  function Lookup() {
    const [no, setNo] = useState(''); const [pw, setPw] = useState('');
    const [app, setApp] = useState(null); const [form, setForm] = useState(null);
    const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
    const setF = (k, v) => setForm((f) => Object.assign({}, f, { [k]: v }));

    async function lookup() {
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'lookup', applicationNo: no.trim(), password: pw });
      setBusy(false);
      if (ok && j.ok) { setApp(j.application); setForm(Object.assign({}, j.application)); }
      else { setApp(null); setMsg(j.error === 'rate_limited' ? L('시도가 너무 많습니다. 잠시 후 다시 시도하세요.', 'Too many attempts. Please try again shortly.') : j.error === 'bad_credentials' ? L('이름 또는 비밀번호(전화 끝 4자리)가 올바르지 않습니다.', 'Name or password (last 4 digits of mobile) is incorrect.') : L('조회 중 오류', 'Lookup error')); }
    }
    async function save() {
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'edit', applicationNo: no.trim(), password: pw, org: form.org, teaser: form.teaser, bgColor: form.bgColor, inkColor: form.inkColor, sceneIdx: form.sceneIdx });
      setBusy(false);
      if (ok && j.ok) { setApp(j.application); setMsg(L('수정되었습니다.', 'Saved.')); } else setMsg(j.error === 'not_editable' ? L('검토중일 때만 수정할 수 있습니다.', 'You can only edit while the application is in review.') : L('수정 중 오류', 'Edit error'));
    }
    async function withdraw() {
      if (!window.confirm(L('철회하면 이 날짜 선점이 해제됩니다. 진행할까요?', 'Withdrawing will release this date. Continue?'))) return;
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'withdraw', applicationNo: no.trim(), password: pw });
      setBusy(false);
      if (ok && j.ok) { setApp(null); setForm(null); setMsg(L('철회되었습니다.', 'Withdrawn.')); } else setMsg(L('철회 중 오류', 'Withdrawal error'));
    }

    return (
      <div className="dc-card">
        <div className="dc-row" style={{ alignItems: 'flex-end' }}>
          <div className="dc-field"><label>{L('신청자 이름', 'Applicant name')}</label><input className="dc-input" value={no} onChange={(e) => setNo(e.target.value)} placeholder={L('홍길동', 'e.g. Jane Smith')} /></div>
          <div className="dc-field"><label>{L('비밀번호 (휴대전화 끝 4자리)', 'Password (last 4 digits of mobile)')}</label><input className="dc-input" inputMode="numeric" maxLength={4} value={pw} onChange={(e) => setPw(e.target.value.replace(/\D/g, ''))} placeholder="1234" /></div>
          <div className="dc-field" style={{ flex: '0 0 auto' }}><button className="dc-btn primary" disabled={busy || !no.trim() || pw.length < 4} onClick={lookup}>{L('조회', 'Look up')}</button></div>
        </div>
        {msg && <div className={/되었습니다|Saved|Withdrawn/.test(msg) ? 'dc-ok' : 'dc-err'}>{msg}</div>}

        {app && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{app.dNumber}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{app.targetDate}</span><StTag s={app.status} />
              <span style={{ flex: 1 }} />
              {app.status === '승인' && <button className="dc-btn primary" style={{ padding: '8px 14px' }} onClick={() => exportA4(cardProps(app), fileFor(app))}>{L('A4 PNG 출력', 'Export A4 PNG')}</button>}
            </div>
            {app.rejectReason && <p className="dc-note" style={{ color: 'var(--danger)', marginBottom: 12 }}><b>{L('사유:', 'Reason:')}</b> {app.rejectReason}</p>}
            <ScaledCard dNumber={app.dNumber} isDay={false} teaser={(form || app).teaser} bgColor={(form || app).bgColor} inkColor={(form || app).inkColor} sceneIdx={(form || app).sceneIdx} />
            {app.status === '승인' && <p className="dc-note" style={{ marginTop: 8, color: 'var(--accent)' }}>{L('✓ 승인됐어요! ', '✓ Approved! ')}<b>{L('사진 올리기', 'Upload photos')}</b>{L(' 탭에서 카드를 A4로 출력하고, 촬영한 사진을 올려주세요.', ' tab: export the card as A4, then upload your photos.')}</p>}

            {app.editable && (
              <div style={{ marginTop: 16 }}>
                <p className="dc-note" style={{ marginBottom: 10 }}>{L('검토중입니다 — 카드 내용을 수정할 수 있습니다. (이름·전화는 변경 불가)', 'In review — you can edit the card content. (Name and phone cannot be changed.)')}</p>
                <div className="dc-field"><label>{L('소속대', 'Scout unit')}</label><input className="dc-input" value={form.org} onChange={(e) => setF('org', e.target.value)} /></div>
                <Customizer form={form} set={setF} />
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="dc-btn primary" disabled={busy} onClick={save}>{L('수정 저장', 'Save changes')}</button>
                  <button className="dc-btn danger" disabled={busy} onClick={withdraw}>{L('신청 철회', 'Withdraw')}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── 사진 올리기 (승인 후 신청정보로 로그인 → A4 출력·사진 업로드) ── */
  function PhotoView() {
    const [no, setNo] = useState(''); const [pw, setPw] = useState('');
    const [app, setApp] = useState(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
    async function login() {
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'lookup', applicationNo: no.trim(), password: pw });
      setBusy(false);
      if (ok && j.ok) setApp(j.application);
      else { setApp(null); setMsg(j.error === 'rate_limited' ? L('시도가 너무 많습니다. 잠시 후 다시 시도하세요.', 'Too many attempts. Please try again shortly.') : L('이름 또는 비밀번호(전화 끝 4자리)가 올바르지 않습니다.', 'Name or password (last 4 digits of mobile) is incorrect.')); }
    }
    function reset() { setApp(null); setNo(''); setPw(''); setMsg(''); }
    return (
      <div className="dc-card">
        {!app ? (
          <div>
            <p className="dc-note" style={{ marginBottom: 12 }}><b>{L('승인된 신청', 'Only approved applications')}</b>{L('만 사진을 올릴 수 있어요. 신청할 때 쓴 ', ' can upload photos. Sign in with the ')}<b>{L('이름', 'name')}</b>{L('과 ', ' and ')}<b>{L('휴대전화 끝 4자리', 'last 4 digits of the mobile')}</b>{L('로 로그인하세요.', ' you used when applying.')}</p>
            <div className="dc-field"><label>{L('신청자 이름', 'Applicant name')}</label><input className="dc-input" value={no} onChange={(e) => setNo(e.target.value)} placeholder={L('홍길동', 'e.g. Jane Smith')} /></div>
            <div className="dc-field"><label>{L('휴대전화 끝 4자리 (비밀번호)', 'Last 4 digits of mobile (password)')}</label><input className="dc-input" inputMode="numeric" maxLength={4} value={pw} onChange={(e) => setPw(e.target.value.replace(/\D/g, ''))} placeholder="1234" onKeyDown={(e) => { if (e.key === 'Enter') login(); }} /></div>
            <button className="dc-btn primary" style={{ width: '100%' }} disabled={busy || !no.trim() || pw.length < 4} onClick={login}>{L('로그인', 'Sign in')}</button>
            {msg && <div className="dc-err">{msg}</div>}
          </div>
        ) : app.status === '승인' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{app.dNumber}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{app.targetDate}</span><StTag s={app.status} />
              <span style={{ flex: 1 }} />
              <button className="dc-btn ghost" style={{ padding: '6px 10px' }} onClick={reset}>{L('다른 신청', 'Another application')}</button>
            </div>
            <ScaledCard dNumber={app.dNumber} isDay={false} teaser={app.teaser} bgColor={app.bgColor} inkColor={app.inkColor} sceneIdx={app.sceneIdx} />
            <button className="dc-btn primary" style={{ width: '100%', marginTop: 10 }} onClick={() => exportA4(cardProps(app), fileFor(app))}>{L('A4 출력', 'Export A4')}</button>
            <p className="dc-note" style={{ marginTop: 8 }}>{L('위 ', 'Use ')}<b>{L('A4 출력', 'Export A4')}</b>{L('으로 카드를 인쇄해 현장에서 사진을 촬영한 뒤, 아래에 올려주세요!', ' above to print your card, take photos on site, then upload them below!')}</p>
            <PhotoUploader no={no.trim()} pw={pw} app={app} onUpdate={setApp} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <StTag s={app.status} />
            <p className="dc-note" style={{ marginTop: 10 }}>
              {(app.status === '제출됨' || app.status === '수정요청') ? L('아직 승인 전이에요. 홍보부에서 매일 오후 12시·오후 6시경 일괄 승인하며, 승인되면 이 화면에서 사진을 올릴 수 있어요.', 'Not yet approved. The Media team approves in batches around 12:00 and 18:00 KST daily; once approved, you can upload photos here.')
                : app.status === '반려' ? (L('반려된 신청입니다.', 'This application was rejected.') + (app.rejectReason ? (L(' 사유: ', ' Reason: ') + app.rejectReason) : ''))
                  : L('철회된 신청입니다.', 'This application was withdrawn.')}
            </p>
            <button className="dc-btn ghost" style={{ marginTop: 8 }} onClick={reset}>{L('다시', 'Retry')}</button>
          </div>
        )}
      </div>
    );
  }

  /* ── 마스터 스타일 편집(관리자) ── */
  const DEFAULT_NOTICE = '비속어·상업적 홍보·정치적 내용 등 잼버리 정신에 어긋나는 내용이 담기면 반려될 수 있어요. 승인은 매일 오후 12시·오후 6시경 일괄 진행돼요.';
  const STYLE_DEFAULT = { pad: 0, topAdj: 0, botAdj: 0, lead: 0, gap: 0, numScale: 1, logo: '', notice: '' };
  const REJECT_REASONS = ['비속어·부적절한 표현', '상업적 홍보', '정치적 내용', '저작권·초상권 우려', '잼버리 정신에 부합하지 않음', '중복·오신청', '카드 문구 미흡'];
  const APPROVERS = ['박지민', '이종근', '현진석', '그 외'];
  const SLIDERS = [
    { k: 'pad', label: '전체 여백', min: 0, max: 16, step: 1, unit: '%' },
    { k: 'topAdj', label: '위 여백', min: -80, max: 160, step: 4, unit: 'px' },
    { k: 'botAdj', label: '아래 여백', min: -80, max: 160, step: 4, unit: 'px' },
    { k: 'lead', label: 'D-↔숫자 간격', min: -40, max: 120, step: 2, unit: 'px' },
    { k: 'gap', label: '숫자↔문구 간격', min: -30, max: 100, step: 2, unit: 'px' },
    { k: 'numScale', label: '숫자 크기', min: 0.7, max: 1.3, step: 0.02, unit: '×' },
  ];
  function MasterStyle({ master, onSaved, busy, setBusy }) {
    const [d, setD] = useState(() => Object.assign({}, STYLE_DEFAULT, master || {}));
    const [msg, setMsg] = useState('');
    const set = (k, v) => setD((p) => Object.assign({}, p, { [k]: v }));
    async function save() {
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('PATCH', { action: 'style', style: d }, bearer());
      setBusy(false);
      if (ok && j.ok) { onSaved(j.masterStyle); setMsg('저장됨 ✓'); } else setMsg('저장 실패');
    }
    return (
      <details className="dc-sec">
        <summary>마스터 스타일 (모든 카드 공통 여백·크기)</summary>
        <div className="dc-secbody">
          <div style={{ display: 'grid', gap: 18, alignItems: 'start' }}>
            <div>
              {SLIDERS.map((s) => (
                <div key={s.k} className="dc-slider">
                  <label>{s.label}</label>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={d[s.k]} onChange={(e) => set(s.k, parseFloat(e.target.value))} />
                  <span className="val">{d[s.k]}{s.unit}</span>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>우측 상단 엠블럼</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EMBLEMS.map(([v, l]) => (
                    <button key={v || 'auto'} type="button" onClick={() => set('logo', v)} style={{ border: d.logo === v ? '2px solid var(--accent)' : '1px solid var(--line)', borderRadius: 8, padding: 6, background: 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 58 }}>
                      {v ? <img src={v} alt="" style={{ width: 32, height: 32, objectFit: 'contain', background: v.indexOf('white') >= 0 ? '#3b4a3f' : '#fff', borderRadius: 4 }} /> : <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)' }}>자동</span>}
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{l}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>상단 안내 문구 (신청 페이지)</div>
                <textarea className="dc-input" rows={2} value={d.notice || ''} maxLength={300} onChange={(e) => set('notice', e.target.value)} placeholder={DEFAULT_NOTICE} style={{ resize: 'vertical', lineHeight: 1.5 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="dc-btn primary" disabled={busy} onClick={save}>저장 (전체 적용)</button>
                <button className="dc-btn ghost" onClick={() => setD(Object.assign({}, STYLE_DEFAULT))}>초기화</button>
                {msg && <span className={/실패/.test(msg) ? 'dc-err' : 'dc-ok'} style={{ alignSelf: 'center' }}>{msg}</span>}
              </div>
            </div>
            <window.DCMasterCtx.Provider value={d}>
              <div style={{ gridColumn: '1/-1' }}><ScaledCard dNumber={30} isDay={false} teaser={'미리보기\n디데이'} /></div>
            </window.DCMasterCtx.Provider>
          </div>
        </div>
      </details>
    );
  }

  /* ── 반려 다이얼로그(사유 체크 + 기타) ── */
  function RejectDialog({ app, onClose, onConfirm }) {
    const [sel, setSel] = useState({}); const [etcOn, setEtcOn] = useState(false); const [etc, setEtc] = useState('');
    const reasons = REJECT_REASONS.filter((r) => sel[r]); if (etcOn && etc.trim()) reasons.push(etc.trim());
    return (
      <div className="dc-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dc-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span className="dc-tag" style={{ background: 'var(--danger)' }}>반려</span>
            <b>D-{app.dNumber} · {app.name || '—'}</b><span style={{ flex: 1 }} />
            <button className="dc-btn ghost" style={{ padding: '6px 10px' }} onClick={onClose}>닫기</button>
          </div>
          <p className="dc-note" style={{ marginBottom: 8 }}>반려 사유를 선택하세요. (복수 선택 가능 · 신청자에게 안내됩니다)</p>
          {REJECT_REASONS.map((r) => (
            <label key={r} className="dc-consent"><input type="checkbox" checked={!!sel[r]} onChange={(e) => setSel((p) => Object.assign({}, p, { [r]: e.target.checked }))} /><span>{r}</span></label>
          ))}
          <label className="dc-consent"><input type="checkbox" checked={etcOn} onChange={(e) => setEtcOn(e.target.checked)} /><span>기타 사유</span></label>
          {etcOn && <textarea className="dc-input" rows={2} value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="기타 반려 사유를 입력하세요" style={{ marginTop: 6 }} />}
          <button className="dc-btn danger" style={{ width: '100%', marginTop: 12 }} disabled={!reasons.length} onClick={() => onConfirm(reasons.join(', '))}>반려 처리</button>
        </div>
      </div>
    );
  }

  /* ── 승인자 선택 다이얼로그 (박지민/이종근/현진석/그 외 → 본인 이름) ── */
  function ApproveDialog({ app, onClose, onConfirm }) {
    const [who, setWho] = useState(''); const [etc, setEtc] = useState('');
    const name = who === '그 외' ? etc.trim() : who;
    return (
      <div className="dc-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dc-modal" style={{ width: 'min(420px,100%)' }} onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span className="dc-tag" style={{ background: 'var(--st-ready)' }}>승인</span>
            <b>D-{app.dNumber} · {app.name || '—'}</b><span style={{ flex: 1 }} />
            <button className="dc-btn ghost" style={{ padding: '6px 10px' }} onClick={onClose}>닫기</button>
          </div>
          <p className="dc-note" style={{ marginBottom: 8 }}>누가 승인하나요? <b>(관리자 페이지에서만 표시)</b></p>
          {APPROVERS.map((o) => (
            <label key={o} className="dc-consent"><input type="radio" name="dc-approver" checked={who === o} onChange={() => setWho(o)} /><span>{o}</span></label>
          ))}
          {who === '그 외' && <input className="dc-input" value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="본인 이름 입력" style={{ marginTop: 6 }} />}
          <button className="dc-btn primary" style={{ width: '100%', marginTop: 12 }} disabled={!name} onClick={() => onConfirm(name)}>승인 처리</button>
        </div>
      </div>
    );
  }

  /* ── 관리자 ── */
  function Admin({ master, setMaster }) {
    const [authed, setAuthed] = useState(() => !!adminToken());
    const [pw, setPw] = useState(''); const [data, setData] = useState(null);
    const [filter, setFilter] = useState('대기'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
    const [idleLeft, setIdleLeft] = useState(600);
    const [rejectFor, setRejectFor] = useState(null);
    const [approveFor, setApproveFor] = useState(null);

    const load = useCallback(async () => {
      const { ok, status, j } = await jget(API + '?admin=1', bearer());
      if (status === 401) { setAdmin(null); setAuthed(false); setMsg('세션 만료 — 비밀번호를 다시 입력하세요.'); return; }
      if (ok) { setData(j); if (j.masterStyle) setMaster(j.masterStyle); }
    }, [setMaster]);
    useEffect(() => { if (authed) load(); }, [authed, load]);
    // 관리자 10분 유휴 자동 로그아웃 (+ 남은 시간 카운트다운)
    useEffect(() => {
      if (!authed) return;
      let expire = Date.now() + 10 * 60 * 1000;
      const reset = () => { expire = Date.now() + 10 * 60 * 1000; };
      const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
      evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
      const tick = setInterval(() => {
        const left = Math.max(0, Math.round((expire - Date.now()) / 1000));
        setIdleLeft(left);
        if (left <= 0) { setAdmin(null); setAuthed(false); setMsg('10분 동안 활동이 없어 자동 로그아웃되었습니다.'); }
      }, 1000);
      return () => { clearInterval(tick); evs.forEach((e) => window.removeEventListener(e, reset)); };
    }, [authed]);

    async function login() {
      const p = pw.trim(); if (!p) { setMsg('비밀번호를 입력하세요.'); return; }
      setBusy(true); setMsg('');
      // 비밀번호 검증 = 관리자 GET(?admin=1) 호출로 확인
      const { status } = await jget(API + '?admin=1', { 'X-CC-Pass': p });
      setBusy(false);
      if (status !== 401) { setAdmin({ pass: p, exp: Date.now() + 12 * 3600 * 1000 }); setPw(''); setAuthed(true); }
      else setMsg('비밀번호가 올바르지 않습니다.');
    }
    async function patch(body) {
      setBusy(true);
      const { status, ok, j } = await jsend('PATCH', body, bearer());
      setBusy(false);
      if (status === 401) { setAdmin(null); setAuthed(false); setMsg('세션 만료'); return; }
      if (ok && j.ok) load(); else setMsg('처리 실패');
    }
    function act(a, action) {
      if (action === 'approve') { setApproveFor(a); return; }   // 승인은 모달(승인자 선택)
      if (action === 'reject') { setRejectFor(a); return; }   // 반려는 모달(사유 체크)
      if (action === 'changes') { const reason = window.prompt('수정요청 사유') || ''; patch({ action: 'changes', applicationNo: a.applicationNo, rejectReason: reason }); return; }
      patch({ action, applicationNo: a.applicationNo });
    }

    if (!authed) return (
      <div className="dc-card" style={{ maxWidth: 360, margin: '20px auto', textAlign: 'center' }}>
        <p className="dc-note" style={{ marginBottom: 12 }}>관리자 비밀번호를 입력하세요.</p>
        <input className="dc-input" type="password" value={pw} placeholder="비밀번호" style={{ textAlign: 'center', marginBottom: 10 }}
          onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') login(); }} />
        <button className="dc-btn primary" style={{ width: '100%' }} disabled={busy} onClick={login}>관리자 입장</button>
        {msg && <div className="dc-err">{msg}</div>}
      </div>
    );

    const apps = (data && data.applications) || [];
    const slots = (data && data.slots) || [];
    const today = data && data.today;
    const byDate = {}; slots.forEach((s) => { byDate[s.targetDate] = s; });
    const counts = apps.reduce((m, a) => { m[a.status] = (m[a.status] || 0) + 1; return m; }, {});
    const todoCount = (counts['제출됨'] || 0) + (counts['수정요청'] || 0);
    const approvedByDate = {}; apps.forEach((a) => { if (a.status === '승인') approvedByDate[a.targetDate] = a; });
    const approvedCount = counts['승인'] || 0;
    const FILTERS = [['대기', '검토 대기'], ['승인', '승인'], ['반려', '반려'], ['철회', '철회'], ['all', '전체']];
    const match = (a) => filter === 'all' ? true : filter === '대기' ? (a.status === '제출됨' || a.status === '수정요청') : a.status === filter;
    const order = { '제출됨': 0, '수정요청': 1, '승인': 2, '반려': 3, '철회': 4 };
    const shown = apps.filter(match).sort((x, y) => (order[x.status] - order[y.status]) || ((y.createdAt || '') > (x.createdAt || '') ? 1 : -1));

    return (
      <div>
        <div className="dc-card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 14 }}>대시보드</b>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: idleLeft < 60 ? '#fff' : 'var(--accent-ink)', background: idleLeft < 60 ? 'var(--danger)' : 'var(--accent-soft)', borderRadius: 'var(--pill)', padding: '4px 11px', fontVariantNumeric: 'tabular-nums' }} title="10분 유휴 시 자동 로그아웃">⏱ {Math.floor(idleLeft / 60)}:{pad2(idleLeft % 60)}</span>
            <button className="dc-btn ghost" disabled={busy} onClick={load}>새로고침</button>
            <button className="dc-btn ghost" onClick={() => { setAdmin(null); setAuthed(false); }}>로그아웃</button>
          </div>
          <div className="dc-stats">
            <div className="dc-stat"><b>{(data && data.visits) || 0}</b><span>방문자</span></div>
            {[['대기', '검토 대기', todoCount, 'var(--st-draft)'], ['승인', '승인', counts['승인'] || 0, 'var(--st-ready)'], ['반려', '반려', counts['반려'] || 0, 'var(--danger)'], ['철회', '철회', counts['철회'] || 0, 'var(--faint)'], ['all', '전체', apps.length, 'var(--ink)']].map(([k, l, n, c]) => (
              <button key={k} className={'dc-stat' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}><b style={{ color: c }}>{n}</b><span>{l}</span></button>
            ))}
          </div>
        </div>

        <details className="dc-sec" open>
          <summary>✓ 승인 완료 캘린더 ({approvedCount}건 · 날짜별 확정 카드)</summary>
          <div className="dc-secbody">
            {approvedCount ? (
              <>
                <p className="dc-note" style={{ margin: '0 0 12px', fontSize: 11.5 }}>승인 확정된 신청을 <b>날짜(D-day) 캘린더</b>로 봅니다. 초록 칸 = 확정된 날짜(신청자 이름 표시). 칸을 클릭하면 아래 목록이 <b>승인</b>만 보이도록 걸러집니다.</p>
                <div className="dc-months">{monthsOf(slots).map((ym) => <MonthGrid key={ym} ym={ym} byDate={byDate} appByDate={approvedByDate} mode="approved" today={today} onPick={() => setFilter('승인')} />)}</div>
              </>
            ) : <p className="dc-note" style={{ margin: 0 }}>아직 승인 완료된 신청이 없습니다.</p>}
          </div>
        </details>

        <MasterStyle master={master} busy={busy} setBusy={setBusy} onSaved={(ms) => setMaster(ms)} />

        <details className="dc-sec">
          <summary>슬롯 관리 (날짜 클릭 = 열림/닫힘 · 시딩 불필요·자동 생성)</summary>
          <div className="dc-secbody"><div className="dc-months">{monthsOf(slots).map((ym) => <MonthGrid key={ym} ym={ym} byDate={byDate} mode="admin" today={today} busy={busy} onToggle={(s) => patch({ action: 'slot', dNumber: s.dNumber, isOpen: !s.isOpen })} />)}</div></div>
        </details>

        <details className="dc-sec">
          <summary>신청·승인·반려 기록 ({((data && data.dclog) || []).length})</summary>
          <div className="dc-secbody">
            <p className="dc-note" style={{ margin: '0 0 8px', fontSize: 11.5 }}>신청·승인·반려·철회 전 기록입니다. 지금은 테스트 중이라 초기화할 수 있어요(라이브 후엔 보존). 초기화해도 ‘초기화했다’는 기록은 남아요.</p>
            <button className="dc-btn danger" style={{ marginBottom: 10 }} disabled={busy} onClick={() => { if (window.confirm('기록을 초기화할까요?\n(초기화했다는 기록은 반드시 남습니다.)')) patch({ action: 'clearlog' }); }}>기록 초기화</button>
            <div className="dc-logbox">
              {((data && data.dclog) || []).map((l, i) => (
                <div key={i} className="dc-logrow"><span className="t">{(l.ts || '').slice(5, 16).replace('T', ' ')}</span><span><b style={{ color: ST_COLOR[l.action] || 'var(--ink-2)' }}>{l.action}</b>{l.name ? (' · ' + l.name) : ''}{l.dNumber ? (' · D-' + l.dNumber) : ''}{l.by ? (' · 승인자 ' + l.by) : ''}{l.reason ? (' — ' + l.reason) : ''}{(l.count != null && !l.name) ? (' (' + l.count + ')') : ''}</span><span style={{ marginLeft: 'auto', color: 'var(--faint)' }}>{l.ip || ''}</span></div>
              ))}
              {!((data && data.dclog) || []).length && <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>기록 없음</div>}
            </div>
          </div>
        </details>

        <div className="dc-card">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {FILTERS.map(([k, l]) => (
              <button key={k} className="dc-btn ghost" style={{ padding: '6px 12px', fontSize: 12.5, background: filter === k ? 'var(--accent-soft)' : 'none', color: filter === k ? 'var(--accent-ink)' : 'var(--muted)', borderColor: filter === k ? 'var(--accent)' : 'var(--line)' }} onClick={() => setFilter(k)}>{l}{k === '대기' && todoCount ? ' ' + todoCount : ''}</button>
            ))}
          </div>
          {msg && <div className="dc-err">{msg}</div>}
          {!shown.length && <p className="dc-note">해당 신청이 없습니다.</p>}
          <div className="dc-applist">
            {shown.map((a) => (
              <div key={a.applicationNo} className={'dc-app' + ((a.status === '제출됨' || a.status === '수정요청') ? ' todo' : '')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{a.dNumber}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{a.targetDate}</span><StTag s={a.status} />
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: 'var(--faint)' }}>{(a.createdAt || '').slice(0, 16).replace('T', ' ')}</span>
                </div>
                <div style={{ display: 'grid', gap: 12, alignItems: 'start' }}>
                  <ScaledCard dNumber={a.dNumber} isDay={false} teaser={a.teaser} bgColor={a.bgColor} inkColor={a.inkColor} sceneIdx={a.sceneIdx} />
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                    <div><b>{a.name || '—'}</b>{a.org ? ' · ' + a.org : ''}</div>
                    <div style={{ color: 'var(--muted)' }}>{a.contact || '—'}</div>
                    <div style={{ color: 'var(--faint)', fontSize: 12 }}>IP {a.ip || '—'}</div>
                    {a.status === '승인' && a.approvedBy && <div style={{ color: 'var(--st-ready)', fontWeight: 600, marginTop: 2 }}>승인자: {a.approvedBy}</div>}
                    {a.photos && a.photos.length > 0 && <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>{a.photos.map((u, i) => <a key={i} href={u} target="_blank" rel="noopener"><img src={u} alt="" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} /></a>)}</div>}
                    {a.rejectReason && <div style={{ color: 'var(--danger)', marginTop: 4 }}>사유: {a.rejectReason}</div>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      <button className="dc-btn primary" style={{ padding: '7px 12px', fontSize: 12.5 }} disabled={busy || a.status === '승인'} onClick={() => act(a, 'approve')}>승인</button>
                      <button className="dc-btn" style={{ padding: '7px 12px', fontSize: 12.5 }} disabled={busy} onClick={() => act(a, 'changes')}>수정요청</button>
                      <button className="dc-btn danger" style={{ padding: '7px 12px', fontSize: 12.5 }} disabled={busy} onClick={() => act(a, 'reject')}>반려</button>
                      {a.status === '승인' && <button className="dc-btn" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={() => exportA4(cardProps(a), fileFor(a))}>A4 출력</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {approveFor && <ApproveDialog app={approveFor} onClose={() => setApproveFor(null)} onConfirm={(by) => { patch({ action: 'approve', applicationNo: approveFor.applicationNo, by }); setApproveFor(null); }} />}
        {rejectFor && <RejectDialog app={rejectFor} onClose={() => setRejectFor(null)} onConfirm={(reason) => { patch({ action: 'reject', applicationNo: rejectFor.applicationNo, rejectReason: reason }); setRejectFor(null); }} />}
      </div>
    );
  }

  /* ── 앱 셸 (해시 세부라우팅: #/lookup · #/admin) ── */
  const VIEWS = ['cal', 'lookup', 'photo', 'admin'];
  const viewFromHash = () => { try { const h = (location.hash || '').replace(/^#\/?/, ''); return VIEWS.indexOf(h) >= 0 ? h : 'cal'; } catch (_) { return 'cal'; } };
  function App() {
    const [view, setViewState] = useState(viewFromHash);
    const setView = useCallback((v) => { setViewState(v); try { location.hash = v === 'cal' ? '' : ('#/' + v); } catch (_) {} }, []);
    const [lang, setLangState] = useState(LANG);
    const setLang = useCallback((v) => { LANG = v; window.__dcLang = v; try { localStorage.setItem('dcount:lang', v); document.documentElement.lang = v; } catch (_) {} setLangState(v); }, []);
    const [slots, setSlots] = useState(null);
    const [today, setToday] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applySlot, setApplySlot] = useState(null);
    const [result, setResult] = useState(null);
    const [master, setMasterState] = useState({});
    const setMaster = useCallback((ms) => { MASTER = ms || {}; setMasterState(ms || {}); }, []);

    const load = useCallback(async () => { const { j } = await jget(API); setSlots(j.slots || []); setToday(j.today || null); if (j.masterStyle) setMaster(j.masterStyle); setLoading(false); }, [setMaster]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { try { const k = 'dcount:visited', d = new Date().toISOString().slice(0, 10); if (localStorage.getItem(k) !== d) { localStorage.setItem(k, d); jsend('POST', { action: 'visit' }); } } catch (_) {} }, []);
    // 실시간: 캘린더 보고 있을 때 15초마다 갱신
    useEffect(() => {
      if (view !== 'cal') return;
      const id = setInterval(load, 15000);
      const onVis = () => { if (!document.hidden) load(); };
      document.addEventListener('visibilitychange', onVis);
      return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
    }, [view, load]);
    useEffect(() => { const onH = () => setViewState(viewFromHash()); window.addEventListener('hashchange', onH); return () => window.removeEventListener('hashchange', onH); }, []);

    const tabs = [['cal', L('디데이 달력', 'D-day calendar')], ['lookup', L('신청 조회', 'Check application')], ['photo', L('사진 올리기', 'Upload photos')]];
    const langBtn = (v, label) => <button onClick={() => setLang(v)} style={{ border: 'none', background: lang === v ? 'var(--accent)' : 'transparent', color: lang === v ? '#fff' : 'var(--muted)', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 'var(--pill)', padding: '5px 13px', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{label}</button>;
    return (
      <window.DCMasterCtx.Provider value={master}>
        <div className="dc-wrap">
          <div className="syncbar">
            <span className="orgtag">{L('제16회 한국잼버리 · 디데이 프로젝트', '16th Korea National Jamboree · D-day Project')}</span><span style={{ flex: 1 }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, border: '1px solid var(--line)', borderRadius: 'var(--pill)', padding: 2, background: 'var(--surface)', marginRight: 12 }} aria-label="Language">{langBtn('ko', '한국어')}{langBtn('en', 'EN')}</div>
            <button onClick={() => setView('admin')} style={{ border: 'none', background: 'none', color: 'var(--faint)', font: 'inherit', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}>{L('관리자', 'Admin')}</button>
          </div>
          <header style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '22px 0 16px' }}>
            <img src="/jamboree/assets/logo.png" width="68" height="68" alt="emblem" style={{ flex: '0 0 auto', width: 68, height: 68, borderRadius: '50%', background: '#fff', padding: 4, border: '1px solid var(--line-2)', boxShadow: 'var(--sh-1)', boxSizing: 'border-box' }} />
            <div>
              <p style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700, margin: '0 0 4px' }}>{L('제16회 한국잼버리 기획조정본부 홍보부', '16th Korea National Jamboree · Media Team')}</p>
              <h1 style={{ font: "700 23px/1.1 'Bricolage Grotesque','Hanken Grotesk',sans-serif", letterSpacing: '-.02em', margin: 0 }}>{L('디데이 프로젝트', 'D-day Project')}</h1>
              <p className="dc-note" style={{ marginTop: 6 }}>{L('스카우트 가족이 ', 'The whole Scout family ')}<b>{L('함께 준비하는 잼버리', 'preparing the Jamboree together')}</b>{L(' — 날짜를 골라 디데이 카드를 신청하고, 홍보부를 통해 신청이 정상 확인되면 ', ' — pick a date to apply for a D-day card, and once the Media team confirms it, ')}<b>{L('A4로 출력해 사진을 촬영', 'print it on A4 and take a photo')}</b>{L('한 뒤 그 사진을 올려주세요!', ', then upload that photo!')}</p>
            </div>
          </header>
          <div style={{ display: 'flex', gap: 6, margin: '0 0 12px', fontSize: 11.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
            {L(['① 날짜 신청', '② 홍보부 확인(승인)', '③ A4 출력·사진 촬영', '④ 사진 올리기'], ['① Apply for a date', '② Media team approval', '③ Print A4 & photograph', '④ Upload photos']).map((s, i) => <span key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--pill)', padding: '4px 10px' }}>{s}</span>)}
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: '10px 14px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
            🛡 {(master && master.notice) || L(DEFAULT_NOTICE, 'Cards with profanity, commercial promotion or political content — anything against the spirit of the Jamboree — may be rejected. Approvals run in batches around 12:00 and 18:00 KST daily.')}
          </div>
          <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--r-2)', padding: '10px 14px', fontSize: 12.5, color: 'var(--accent-ink)', lineHeight: 1.55 }}>
            {L('⚡ 더 빠른 확정을 원하면 ', '⚡ For faster confirmation, contact the ')}<b>{L('한국스카우트연맹 ', 'Korea Scout Association ')}<a href="tel:0263352000" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>02-6335-2000</a></b>{L(' 으로 문의주세요. 빠르게 도와드릴게요.', '. We are happy to help.')}
          </div>
          <div className="dc-nav">{tabs.map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</div>
          <div style={{ marginTop: 16 }}>
            {view === 'cal' && <Calendar slots={slots} today={today} loading={loading} onApply={(s) => setApplySlot(s)} />}
            {view === 'lookup' && <Lookup />}
            {view === 'photo' && <PhotoView />}
            {view === 'admin' && <Admin master={master} setMaster={setMaster} />}
          </div>
          {applySlot && <ApplyModal slot={applySlot} onClose={() => setApplySlot(null)} onDone={(j) => { setApplySlot(null); setResult(j); load(); }} />}
          {result && <ResultModal result={result} onClose={() => setResult(null)} />}
        </div>
      </window.DCMasterCtx.Provider>
    );
  }

  const boot = document.getElementById('__boot'); if (boot) boot.remove();
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
