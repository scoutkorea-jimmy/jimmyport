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

  const SS_COLOR = { '신청가능': 'var(--st-ready)', '검토중': 'var(--st-draft)', '확정': 'var(--accent)', '닫힘': 'var(--faint)' };
  const ST_COLOR = { '제출됨': 'var(--st-draft)', '수정요청': '#C0492F', '승인': 'var(--st-ready)', '반려': 'var(--danger)', '철회': 'var(--faint)' };
  const SWATCHES = [P.purple, P.midnight, P.ocean, P.forest, P.red, P.orange, P.river, P.leaf, P.pink, '#ffffff'];
  const CONSENTS = [
    { k: 'privacy', t: '개인정보 수집·이용 (필수)', d: '신청자명·휴대전화·소속대·접속 IP를 카드 검토·게시·통지 목적으로 수집하며, 행사 종료 후 3개월(~2026-11-09)까지 보관 후 삭제합니다.' },
    { k: 'portrait', t: '초상권 / 사진 게시 (필수)', d: '카드에 인물 사진을 포함하는 경우, 해당 인물의 게시·활용에 동의합니다.' },
    { k: 'thirdparty', t: '제3자 초상 확인 (필수)', d: '사진 속 타인이 있는 경우, 그 사람의 게시 동의를 신청자가 직접 받았음을 확인합니다.' },
    { k: 'license', t: '콘텐츠 사용권 (필수)', d: '제출한 카드를 제16회 한국잼버리/한국스카우트연맹이 게시·홍보에 활용할 수 있도록 사용권을 부여합니다.' },
    { k: 'age14', t: '만 14세 이상 확인 (필수)', d: '신청자는 만 14세 이상입니다. (14세 미만은 신청 대상이 아닙니다.)' },
  ];
  const phoneOk = (s) => /^01\d{8,9}$/.test(String(s || '').replace(/\D/g, ''));

  async function jget(url, headers) { const r = await fetch(url, { headers: headers || {} }); return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) }; }
  async function jsend(method, body, headers) {
    const r = await fetch(API, { method, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}), body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) };
  }
  function adminToken() { try { const s = JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null'); return (s && s.token && s.exp > Date.now()) ? s.token : null; } catch (_) { return null; } }
  function setAdmin(s) { try { if (s) localStorage.setItem(ADMIN_KEY, JSON.stringify(s)); else localStorage.removeItem(ADMIN_KEY); } catch (_) {} }
  function bearer() { const t = adminToken(); return t ? { Authorization: 'Bearer ' + t } : {}; }
  function copy(t) { try { navigator.clipboard.writeText(t); } catch (_) {} }
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

  /* ── A4(가로) PNG 출력 — 승인된 카드 ── */
  async function exportA4(props, filename) {
    if (!window.htmlToImage) { alert('출력 라이브러리 로드 실패 — 새로고침 후 다시 시도하세요.'); return; }
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
    } catch (e) { alert('출력 실패: ' + (e && e.message)); }
    root.unmount(); host.remove();
  }
  const cardProps = (a) => ({ dNumber: a.dNumber, isDay: false, teaser: a.teaser, bgColor: a.bgColor, inkColor: a.inkColor, sceneIdx: a.sceneIdx });
  const fileFor = (a) => 'D-' + a.dNumber + '_' + (a.name || 'card') + '.png';

  /* 1480×1047 카드를 컨테이너 폭에 맞춰 축소 */
  function ScaledCard(props) {
    const ref = useRef(null);
    const [scale, setScale] = useState(0.4);
    useEffect(() => {
      function rc() { const el = ref.current; if (!el) return; setScale(Math.min(1, el.clientWidth / window.DCOUNT_WIDE.w)); }
      rc(); window.addEventListener('resize', rc); const t = setTimeout(rc, 60);
      return () => { window.removeEventListener('resize', rc); clearTimeout(t); };
    }, []);
    const W = window.DCOUNT_WIDE.w, H = window.DCOUNT_WIDE.h;
    return (
      <div ref={ref} style={{ width: '100%' }}>
        <div style={{ width: W * scale, height: H * scale, maxWidth: '100%', margin: '0 auto', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
          <div style={{ width: W, height: H, position: 'relative', transform: 'scale(' + scale + ')', transformOrigin: 'top left' }}>
            <window.DCountCard {...props} />
          </div>
        </div>
      </div>
    );
  }
  const SsTag = ({ s }) => <span className="dc-ss" style={{ background: SS_COLOR[s] || 'var(--faint)' }}>{s}</span>;
  const StTag = ({ s }) => <span className="dc-tag" style={{ background: ST_COLOR[s] || 'var(--faint)' }}>{s}</span>;

  /* ── 달력(월 그리드, 일요일 시작) ── */
  function MonthGrid({ ym, byDate, mode, onApply, onToggle, today, busy }) {
    const y = parseInt(ym.slice(0, 4), 10), m = parseInt(ym.slice(5, 7), 10);
    const first = new Date(y, m - 1, 1).getDay();
    const days = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    const dows = ['일', '월', '화', '수', '목', '금', '토'];
    return (
      <div className="dc-month">
        <div className="dc-mtitle">{y}년 {m}월</div>
        <div className="dc-dow">{dows.map((w, i) => <span key={i} className={i === 0 ? 'sun' : ''}>{w}</span>)}</div>
        <div className="dc-days">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="dc-day empty" />;
            const ds = y + '-' + pad2(m) + '-' + pad2(d);
            const slot = byDate[ds];
            const tcl = ds === today ? ' today' : '';
            if (!slot) return <div key={i} className={'dc-day' + tcl}><span className="dnum">{d}</span></div>;
            if (mode === 'admin') return (
              <div key={i} className={'dc-day slot' + tcl + (slot.isOpen ? ' open' : ' dimmed')}>
                <span className="dnum">{d}</span><div className="dd">D-{slot.dNumber}</div>
                <button className="dc-ss" style={{ border: 'none', cursor: 'pointer', background: slot.isOpen ? 'var(--st-ready)' : 'var(--faint)' }} disabled={busy} onClick={() => onToggle(slot)}>{slot.isOpen ? '열림' : '닫힘'}</button>
              </div>
            );
            const open = slot.slotStatus === '신청가능';
            return (
              <div key={i} className={'dc-day slot' + tcl + (open ? ' open' : ' dimmed')} onClick={() => open && onApply(slot)}>
                <span className="dnum">{d}</span><div className="dd">D-{slot.dNumber}</div>
                <SsTag s={slot.slotStatus} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  function monthsOf(slots) { const set = {}; slots.forEach((s) => { set[s.targetDate.slice(0, 7)] = 1; }); return Object.keys(set).sort(); }

  function Calendar({ slots, today, loading, onApply }) {
    if (loading && !slots) return <div className="dc-card"><p className="dc-note">불러오는 중…</p></div>;
    const sl = slots || [];
    const byDate = {}; sl.forEach((s) => { byDate[s.targetDate] = s; });
    return (
      <div className="dc-card">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, fontSize: 12, color: 'var(--muted)' }}>
          {['신청가능', '검토중', '확정', '닫힘'].map((s) => <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 9, height: 9, borderRadius: '50%', background: SS_COLOR[s] }} />{s}</span>)}
          <span style={{ marginLeft: 'auto', color: 'var(--faint)' }}>실시간 갱신</span>
        </div>
        <div className="dc-months">{monthsOf(sl).map((ym) => <MonthGrid key={ym} ym={ym} byDate={byDate} mode="apply" onApply={onApply} today={today} />)}</div>
      </div>
    );
  }

  /* ── 카드 커스터마이저(신청·수정 공용): 문구(2줄)·배경색·글씨색·오른쪽 오브제 ── */
  function Customizer({ form, set }) {
    const labels = window.DCOUNT_SCENE_LABELS || [];
    return (
      <div>
        <div className="dc-field">
          <label>카드 문구 (두 줄까지)</label>
          <textarea className="dc-input" rows={2} value={form.teaser} maxLength={160} onChange={(e) => set('teaser', e.target.value)} placeholder={'예: 세계가 강원으로\n향합니다'} style={{ resize: 'vertical', lineHeight: 1.5 }} />
        </div>
        <div className="dc-row">
          <div className="dc-field">
            <label>배경색</label>
            <div className="dc-swatches">
              {SWATCHES.map((c) => <button key={c} type="button" className="dc-sw" style={{ background: c, outline: form.bgColor === c ? '2px solid var(--accent)' : 'none' }} onClick={() => set('bgColor', c)} title={c} />)}
              <input type="color" value={form.bgColor || '#622599'} onChange={(e) => set('bgColor', e.target.value)} style={{ width: 30, height: 28, padding: 0, border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer' }} />
              <button type="button" className="dc-btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => set('bgColor', '')}>기본</button>
            </div>
          </div>
          <div className="dc-field">
            <label>글씨색</label>
            <div className="dc-swatches">
              {['#ffffff', P.midnight, P.purple, P.orange, P.leaf].map((c) => <button key={c} type="button" className="dc-sw" style={{ background: c, outline: form.inkColor === c ? '2px solid var(--accent)' : 'none' }} onClick={() => set('inkColor', c)} title={c} />)}
              <input type="color" value={form.inkColor || '#ffffff'} onChange={(e) => set('inkColor', e.target.value)} style={{ width: 30, height: 28, padding: 0, border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer' }} />
              <button type="button" className="dc-btn ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => set('inkColor', '')}>기본</button>
            </div>
          </div>
        </div>
        <div className="dc-field">
          <label>오른쪽 오브제 (색은 배경에 자동 매칭)</label>
          <select className="dc-input" value={form.sceneIdx} onChange={(e) => set('sceneIdx', e.target.value)}>
            <option value="">기본 (자동)</option>
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
      if (!form.name.trim()) { setErr('신청자 이름은 필수입니다.'); return; }
      if (!phoneOk(form.contact)) { setErr('휴대전화 번호를 정확히 입력하세요 (예: 010-1234-5678).'); return; }
      if (!allConsent) { setErr('필수 동의 항목에 모두 동의해야 합니다.'); return; }
      setBusy(true); setErr('');
      const { ok, j } = await jsend('POST', { action: 'apply', targetDate: slot.targetDate, name: form.name, contact: form.contact, org: form.org, teaser: form.teaser, bgColor: form.bgColor, inkColor: form.inkColor, sceneIdx: form.sceneIdx, consents: { privacy: true, portrait: true, thirdparty: true, license: true, age14: true } });
      setBusy(false);
      if (ok && j.ok) onDone(j);
      else setErr(j.error === 'already_taken' ? '방금 이 날짜가 선점되었습니다. 다른 날짜를 선택하세요.'
        : j.error === 'name_taken' ? '이미 같은 이름으로 신청된 건이 있습니다. (신청 조회에서 확인/철회하세요)'
          : j.error === 'bad_phone' ? '휴대전화 번호 형식을 확인하세요.'
            : j.error === 'name_required' ? '이름을 입력하세요.'
              : j.error === 'slot_closed' ? '이 슬롯은 닫혀 있습니다.'
                : '신청 처리 중 오류가 발생했습니다.');
    }

    return (
      <div className="dc-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dc-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{slot.dNumber}</span>
            <b style={{ fontSize: 16 }}>{slot.targetDate} 카드 신청</b><span style={{ flex: 1 }} />
            <button className="dc-btn ghost" style={{ padding: '6px 10px' }} onClick={onClose}>닫기</button>
          </div>
          <div style={{ display: 'grid', gap: 18 }}>
            <ScaledCard dNumber={slot.dNumber} isDay={false} teaser={form.teaser || '카드 문구를 입력하세요'} bgColor={form.bgColor} inkColor={form.inkColor} sceneIdx={form.sceneIdx} />
            <div>
              <div className="dc-row">
                <div className="dc-field"><label>신청자 이름 * (= 신청번호)</label><input className="dc-input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
                <div className="dc-field"><label>휴대전화 * (끝 4자리 = 비밀번호)</label><input className="dc-input" value={form.contact} onChange={(e) => set('contact', e.target.value)} placeholder="010-1234-5678" inputMode="tel" style={form.contact && !phoneOk(form.contact) ? { borderColor: 'var(--danger)' } : null} /></div>
                <div className="dc-field"><label>소속대</label><input className="dc-input" value={form.org} onChange={(e) => set('org', e.target.value)} /></div>
              </div>
              <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0 14px' }} />
              <Customizer form={form} set={set} />
              <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0 6px' }} />
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', margin: '8px 0 4px' }}>동의 (전 항목 필수)</div>
              {CONSENTS.map((c) => (
                <label key={c.k} className="dc-consent">
                  <input type="checkbox" checked={!!consents[c.k]} onChange={(e) => setConsents((p) => Object.assign({}, p, { [c.k]: e.target.checked }))} />
                  <span><b>{c.t}</b> — {c.d}</span>
                </label>
              ))}
              <div className="dc-err">{err}</div>
              <button className="dc-btn primary" disabled={!canSubmit} onClick={submit} style={{ width: '100%', marginTop: 8 }}>{busy ? '신청 중…' : '신청 제출 (날짜 선점)'}</button>
              <p className="dc-note" style={{ marginTop: 8 }}>제출 즉시 이 날짜가 선점되고, <b>신청번호(이름)·비밀번호(휴대전화 끝 4자리)</b>로 조회·수정할 수 있습니다. 관리자 검토 후 승인되면 A4로 출력할 수 있어요.</p>
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
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)', marginBottom: 6 }}>신청 완료 ✓</div>
          <p className="dc-note">D-{result.dNumber} ({result.targetDate}) 선점 완료. 조회·수정 시 아래 정보를 사용하세요.</p>
          <div style={{ margin: '16px 0 6px' }}><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>신청번호 (이름)</div><div className="dc-mono">{result.applicationNo}</div></div>
          <div style={{ margin: '12px 0 16px' }}><div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>비밀번호 (휴대전화 끝 4자리)</div><div className="dc-mono">{result.password}</div></div>
          <button className="dc-btn primary" onClick={onClose} style={{ minWidth: 120 }}>확인</button>
        </div>
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
      else { setApp(null); setMsg(j.error === 'bad_password' ? '이름 또는 비밀번호(전화 끝 4자리)가 올바르지 않습니다.' : j.error === 'not_found' ? '신청을 찾을 수 없습니다.' : '조회 중 오류'); }
    }
    async function save() {
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'edit', applicationNo: no.trim(), password: pw, org: form.org, teaser: form.teaser, bgColor: form.bgColor, inkColor: form.inkColor, sceneIdx: form.sceneIdx });
      setBusy(false);
      if (ok && j.ok) { setApp(j.application); setMsg('수정되었습니다.'); } else setMsg(j.error === 'not_editable' ? '검토중일 때만 수정할 수 있습니다.' : '수정 중 오류');
    }
    async function withdraw() {
      if (!window.confirm('철회하면 이 날짜 선점이 해제됩니다. 진행할까요?')) return;
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'withdraw', applicationNo: no.trim(), password: pw });
      setBusy(false);
      if (ok && j.ok) { setApp(null); setForm(null); setMsg('철회되었습니다.'); } else setMsg('철회 중 오류');
    }

    return (
      <div className="dc-card">
        <div className="dc-row" style={{ alignItems: 'flex-end' }}>
          <div className="dc-field"><label>신청번호 (이름)</label><input className="dc-input" value={no} onChange={(e) => setNo(e.target.value)} placeholder="홍길동" /></div>
          <div className="dc-field"><label>비밀번호 (휴대전화 끝 4자리)</label><input className="dc-input" inputMode="numeric" maxLength={4} value={pw} onChange={(e) => setPw(e.target.value.replace(/\D/g, ''))} placeholder="1234" /></div>
          <div className="dc-field" style={{ flex: '0 0 auto' }}><button className="dc-btn primary" disabled={busy || !no.trim() || pw.length < 4} onClick={lookup}>조회</button></div>
        </div>
        {msg && <div className={/오류|않|없/.test(msg) ? 'dc-err' : 'dc-ok'}>{msg}</div>}

        {app && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{app.dNumber}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{app.targetDate}</span><StTag s={app.status} />
              <span style={{ flex: 1 }} />
              {app.status === '승인' && <button className="dc-btn primary" style={{ padding: '8px 14px' }} onClick={() => exportA4(cardProps(app), fileFor(app))}>A4 PNG 출력</button>}
            </div>
            {app.rejectReason && <p className="dc-note" style={{ color: 'var(--danger)', marginBottom: 12 }}><b>사유:</b> {app.rejectReason}</p>}
            <ScaledCard dNumber={app.dNumber} isDay={false} teaser={(form || app).teaser} bgColor={(form || app).bgColor} inkColor={(form || app).inkColor} sceneIdx={(form || app).sceneIdx} />
            {app.status === '승인' && <p className="dc-note" style={{ marginTop: 8, color: 'var(--accent)' }}>✓ 승인된 카드입니다. 위 <b>A4 PNG 출력</b> 버튼으로 A4(가로) 이미지를 내려받으세요.</p>}

            {app.editable && (
              <div style={{ marginTop: 16 }}>
                <p className="dc-note" style={{ marginBottom: 10 }}>검토중입니다 — 카드 내용을 수정할 수 있습니다. (이름·전화는 변경 불가)</p>
                <div className="dc-field"><label>소속대</label><input className="dc-input" value={form.org} onChange={(e) => setF('org', e.target.value)} /></div>
                <Customizer form={form} set={setF} />
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="dc-btn primary" disabled={busy} onClick={save}>수정 저장</button>
                  <button className="dc-btn danger" disabled={busy} onClick={withdraw}>신청 철회</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── 마스터 스타일 편집(관리자) ── */
  const SLIDERS = [
    { k: 'pad', label: '전체 여백', min: 0, max: 16, step: 1, unit: '%' },
    { k: 'topAdj', label: '위 여백', min: -80, max: 160, step: 4, unit: 'px' },
    { k: 'botAdj', label: '아래 여백', min: -80, max: 160, step: 4, unit: 'px' },
    { k: 'gap', label: '문구 간격', min: -30, max: 100, step: 2, unit: 'px' },
    { k: 'numScale', label: '숫자 크기', min: 0.7, max: 1.3, step: 0.02, unit: '×' },
  ];
  function MasterStyle({ master, onSaved, busy, setBusy }) {
    const [d, setD] = useState(() => Object.assign({ pad: 0, topAdj: 0, botAdj: 0, gap: 0, numScale: 1 }, master || {}));
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
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button className="dc-btn primary" disabled={busy} onClick={save}>저장 (전체 적용)</button>
                <button className="dc-btn ghost" onClick={() => setD({ pad: 0, topAdj: 0, botAdj: 0, gap: 0, numScale: 1 })}>초기화</button>
                {msg && <span className={/실패/.test(msg) ? 'dc-err' : 'dc-ok'} style={{ alignSelf: 'center' }}>{msg}</span>}
              </div>
            </div>
            <window.DCMasterCtx.Provider value={d}>
              <div style={{ gridColumn: '1/-1' }}><ScaledCard dNumber={30} isDay={false} teaser={'미리보기\nD-COUNT'} /></div>
            </window.DCMasterCtx.Provider>
          </div>
        </div>
      </details>
    );
  }

  /* ── 관리자 ── */
  function Admin({ master, setMaster }) {
    const [authed, setAuthed] = useState(() => !!adminToken());
    const [code, setCode] = useState(''); const [data, setData] = useState(null);
    const [filter, setFilter] = useState('대기'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
      const { ok, status, j } = await jget(API + '?admin=1', bearer());
      if (status === 401) { setAdmin(null); setAuthed(false); setMsg('세션 만료 — 코드를 다시 입력하세요.'); return; }
      if (ok) { setData(j); if (j.masterStyle) setMaster(j.masterStyle); }
    }, [setMaster]);
    useEffect(() => { if (authed) load(); }, [authed, load]);

    async function login() {
      const c = code.replace(/\D/g, ''); if (c.length !== 6) { setMsg('6자리 코드를 입력하세요.'); return; }
      setBusy(true); setMsg('');
      const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: c }) });
      const j = await r.json().catch(() => ({})); setBusy(false);
      if (r.ok && j.ok && j.token) { setAdmin({ token: j.token, exp: j.exp || (Date.now() + 12 * 3600 * 1000) }); setCode(''); setAuthed(true); }
      else setMsg(r.status === 429 ? '시도가 너무 많습니다.' : '인증 코드가 올바르지 않습니다.');
    }
    async function patch(body) {
      setBusy(true);
      const { status, ok, j } = await jsend('PATCH', body, bearer());
      setBusy(false);
      if (status === 401) { setAdmin(null); setAuthed(false); setMsg('세션 만료'); return; }
      if (ok && j.ok) load(); else setMsg('처리 실패');
    }
    function act(a, action) {
      let reason = '';
      if (action === 'reject' || action === 'changes') { reason = window.prompt(action === 'reject' ? '반려 사유' : '수정요청 사유') || ''; if (reason === '' && !window.confirm('사유 없이 진행할까요?')) return; }
      patch({ action, applicationNo: a.applicationNo, rejectReason: reason });
    }

    if (!authed) return (
      <div className="dc-card" style={{ maxWidth: 360, margin: '20px auto', textAlign: 'center' }}>
        <p className="dc-note" style={{ marginBottom: 12 }}>관리자 인증 앱의 6자리 코드를 입력하세요.</p>
        <input className="dc-input" inputMode="numeric" maxLength={6} value={code} placeholder="000000" style={{ textAlign: 'center', letterSpacing: '.3em', marginBottom: 10 }}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') login(); }} />
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
    const FILTERS = [['대기', '검토 대기'], ['승인', '승인'], ['반려', '반려'], ['철회', '철회'], ['all', '전체']];
    const match = (a) => filter === 'all' ? true : filter === '대기' ? (a.status === '제출됨' || a.status === '수정요청') : a.status === filter;
    const order = { '제출됨': 0, '수정요청': 1, '승인': 2, '반려': 3, '철회': 4 };
    const shown = apps.filter(match).sort((x, y) => (order[x.status] - order[y.status]) || ((y.createdAt || '') > (x.createdAt || '') ? 1 : -1));

    return (
      <div>
        <div className="dc-card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="dc-stats">
            <div className="dc-stat"><b style={{ color: todoCount ? 'var(--st-draft)' : 'var(--ink)' }}>{todoCount}</b><span>검토 대기</span></div>
            <div className="dc-stat"><b style={{ color: 'var(--st-ready)' }}>{counts['승인'] || 0}</b><span>승인</span></div>
            <div className="dc-stat"><b>{apps.length}</b><span>전체</span></div>
          </div>
          <span style={{ flex: 1 }} />
          <button className="dc-btn ghost" disabled={busy} onClick={load}>새로고침</button>
          <button className="dc-btn ghost" onClick={() => { setAdmin(null); setAuthed(false); }}>로그아웃</button>
        </div>

        <MasterStyle master={master} busy={busy} setBusy={setBusy} onSaved={(ms) => setMaster(ms)} />

        <details className="dc-sec">
          <summary>슬롯 관리 (날짜 클릭 = 열림/닫힘 · 시딩 불필요·자동 생성)</summary>
          <div className="dc-secbody"><div className="dc-months">{monthsOf(slots).map((ym) => <MonthGrid key={ym} ym={ym} byDate={byDate} mode="admin" today={today} busy={busy} onToggle={(s) => patch({ action: 'slot', dNumber: s.dNumber, isOpen: !s.isOpen })} />)}</div></div>
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
      </div>
    );
  }

  /* ── 앱 셸 ── */
  function App() {
    const [view, setView] = useState('cal');
    const [slots, setSlots] = useState(null);
    const [today, setToday] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applySlot, setApplySlot] = useState(null);
    const [result, setResult] = useState(null);
    const [master, setMasterState] = useState({});
    const setMaster = useCallback((ms) => { MASTER = ms || {}; setMasterState(ms || {}); }, []);

    const load = useCallback(async () => { const { j } = await jget(API); setSlots(j.slots || []); setToday(j.today || null); if (j.masterStyle) setMaster(j.masterStyle); setLoading(false); }, [setMaster]);
    useEffect(() => { load(); }, [load]);
    // 실시간: 캘린더 보고 있을 때 15초마다 갱신
    useEffect(() => {
      if (view !== 'cal') return;
      const id = setInterval(load, 15000);
      const onVis = () => { if (!document.hidden) load(); };
      document.addEventListener('visibilitychange', onVis);
      return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
    }, [view, load]);

    const tabs = [['cal', '신청 캘린더'], ['lookup', '신청 조회'], ['admin', '관리자']];
    return (
      <window.DCMasterCtx.Provider value={master}>
        <div className="dc-wrap">
          <div className="syncbar"><span className="orgtag">제16회 한국잼버리 · D-COUNT</span><span style={{ flex: 1 }} /><span className="st">일자별 D-COUNT 카드 신청</span></div>
          <header style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '22px 0 18px' }}>
            <img src="/jamboree/assets/logo.png" width="68" height="68" alt="엠블럼" style={{ borderRadius: '50%', background: '#fff', padding: 4, border: '1px solid var(--line-2)', boxShadow: 'var(--sh-1)' }} />
            <div>
              <p style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700, margin: '0 0 4px' }}>제16회 한국잼버리 PR팀</p>
              <h1 style={{ font: "700 23px/1.1 'Bricolage Grotesque','Hanken Grotesk',sans-serif", letterSpacing: '-.02em', margin: 0 }}>D-COUNT 카드 신청</h1>
              <p className="dc-note" style={{ marginTop: 6 }}>달력에서 날짜(D-40~D-5)를 골라 카드를 신청하면 <b>하루 한 팀</b>이 선점합니다. 관리자 승인 후 A4로 출력할 수 있어요.</p>
            </div>
          </header>
          <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--r-2)', padding: '10px 14px', fontSize: 12.5, color: 'var(--accent-ink)', lineHeight: 1.55 }}>
            ⚡ 더 빠른 확정을 원하시면 <b>한국스카우트연맹 <a href="tel:0263352000" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>02-6335-2000</a></b> 으로 문의주세요. 빠르게 확인해 드립니다.
          </div>
          <div className="dc-nav">{tabs.map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</div>
          <div style={{ marginTop: 16 }}>
            {view === 'cal' && <Calendar slots={slots} today={today} loading={loading} onApply={(s) => setApplySlot(s)} />}
            {view === 'lookup' && <Lookup />}
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
