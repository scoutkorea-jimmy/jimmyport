/* krjam-dcount — D-COUNT 카드 신청 시스템 (전체).
 *  뷰: 신청 캘린더(슬롯) · 신청 폼(+커스터마이즈 미리보기 +5종 동의) · 신청번호/비번 발급 · 조회/수정/철회 · 관리자(TOTP).
 *  카드 = DCountCard(D-가로). 저장 = /api/krjam-dcount (KV). 마감 버퍼 없음.
 *  ⚠️ Babel standalone 공유 스코프 → IIFE 필수. */
(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const API = '/api/krjam-dcount';
  const ADMIN_KEY = 'krjam-dcount:admin';
  const P = window.PAL;

  const SS_COLOR = { '신청가능': 'var(--st-ready)', '검토중': 'var(--st-draft)', '확정': 'var(--accent)', '마감': 'var(--faint)' };
  const ST_COLOR = { '제출됨': 'var(--st-draft)', '수정요청': '#C0492F', '승인': 'var(--st-ready)', '반려': 'var(--danger)', '철회': 'var(--faint)' };
  const SWATCHES = [P.purple, P.midnight, P.ocean, P.forest, P.red, P.orange, P.river, P.leaf, P.pink, '#ffffff'];
  const CONSENTS = [
    { k: 'privacy', t: '개인정보 수집·이용 (필수)', d: '신청자명·연락처·소속대·접속 IP를 카드 검토·게시·통지 목적으로 수집하며, 행사 종료 후 3개월(~2026-11-09)까지 보관 후 삭제합니다.' },
    { k: 'portrait', t: '초상권 / 사진 게시 (필수)', d: '카드에 인물 사진을 포함하는 경우, 해당 인물의 게시·활용에 동의합니다.' },
    { k: 'thirdparty', t: '제3자 초상 확인 (필수)', d: '사진 속 타인이 있는 경우, 그 사람의 게시 동의를 신청자가 직접 받았음을 확인합니다.' },
    { k: 'license', t: '콘텐츠 사용권 (필수)', d: '제출한 카드를 제16회 한국잼버리/한국스카우트연맹이 게시·홍보에 활용할 수 있도록 사용권을 부여합니다.' },
    { k: 'age14', t: '만 14세 이상 확인 (필수)', d: '신청자는 만 14세 이상입니다. (14세 미만은 신청 대상이 아닙니다.)' },
  ];

  async function jget(url, headers) { const r = await fetch(url, { headers: headers || {} }); return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) }; }
  async function jsend(method, body, headers) {
    const r = await fetch(API, { method, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}), body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) };
  }
  function adminToken() { try { const s = JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null'); return (s && s.token && s.exp > Date.now()) ? s.token : null; } catch (_) { return null; } }
  function setAdmin(s) { try { if (s) localStorage.setItem(ADMIN_KEY, JSON.stringify(s)); else localStorage.removeItem(ADMIN_KEY); } catch (_) {} }
  function bearer() { const t = adminToken(); return t ? { Authorization: 'Bearer ' + t } : {}; }
  function copy(txt) { try { navigator.clipboard.writeText(txt); } catch (_) {} }

  /* 1480×1047 카드를 컨테이너 폭에 맞춰 축소 렌더 */
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

  function SsTag({ s }) { return <span className="dc-ss" style={{ background: SS_COLOR[s] || 'var(--faint)' }}>{s}</span>; }
  function StTag({ s }) { return <span className="dc-tag" style={{ background: ST_COLOR[s] || 'var(--faint)' }}>{s}</span>; }

  /* ── 카드 커스터마이즈 컨트롤 (신청/수정 공용) ── */
  function Customizer({ form, set }) {
    const sceneLabels = window.DCOUNT_SCENE_LABELS || [];
    return (
      <div>
        <div className="dc-field">
          <label>카드 문구 (한 줄)</label>
          <input className="dc-input" value={form.teaser} maxLength={120} onChange={(e) => set('teaser', e.target.value)} placeholder="예: 세계가 강원으로 향합니다" />
        </div>
        <div className="dc-field">
          <label>상단 문구 (선택 · 비우면 자동)</label>
          <input className="dc-input" value={form.kicker} maxLength={60} onChange={(e) => set('kicker', e.target.value)} placeholder="예: COUNTDOWN · D-30" />
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
          <label>오른쪽 오브제 (캠프 풍경)</label>
          <select className="dc-input" value={form.sceneIdx} onChange={(e) => set('sceneIdx', e.target.value)}>
            <option value="">기본 (자동)</option>
            {sceneLabels.map((l, i) => <option key={i} value={i}>{i + 1}. {l}</option>)}
          </select>
        </div>
      </div>
    );
  }

  function blankForm(slot) {
    return { name: '', contact: '', org: '', teaser: '', kicker: '', bgColor: '', inkColor: '', sceneIdx: '',
      _d: slot ? slot.dNumber : 30 };
  }

  /* ── 신청 폼 (모달) ── */
  function ApplyModal({ slot, onClose, onDone }) {
    const [form, setForm] = useState(() => blankForm(slot));
    const [consents, setConsents] = useState({});
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const set = (k, v) => setForm((f) => Object.assign({}, f, { [k]: v }));
    const allConsent = CONSENTS.every((c) => consents[c.k]);
    const canSubmit = form.name.trim() && form.contact.trim() && allConsent && !busy;

    async function submit() {
      if (!form.name.trim() || !form.contact.trim()) { setErr('신청자명과 연락처는 필수입니다.'); return; }
      if (!allConsent) { setErr('필수 동의 항목에 모두 동의해야 신청할 수 있습니다.'); return; }
      setBusy(true); setErr('');
      const { ok, j } = await jsend('POST', {
        action: 'apply', targetDate: slot.targetDate,
        name: form.name, contact: form.contact, org: form.org,
        teaser: form.teaser, kicker: form.kicker, bgColor: form.bgColor, inkColor: form.inkColor, sceneIdx: form.sceneIdx,
        consents: { privacy: true, portrait: true, thirdparty: true, license: true, age14: true },
      });
      setBusy(false);
      if (ok && j.ok) onDone(j);
      else setErr(j.error === 'already_taken' ? '방금 다른 신청이 이 날짜를 선점했습니다. 다른 날짜를 선택해주세요.'
        : j.error === 'consent_required' ? '필수 동의가 필요합니다.'
          : j.error === 'missing_fields' ? '신청자명·연락처를 입력하세요.'
            : j.error === 'slot_closed' || j.error === 'slot_passed' ? '이 슬롯은 마감되었습니다.'
              : '신청 처리 중 오류가 발생했습니다.');
    }

    return (
      <div className="dc-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dc-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{slot.dNumber}</span>
            <b style={{ fontSize: 16 }}>{slot.targetDate} 카드 신청</b>
            <span style={{ flex: 1 }} />
            <button className="dc-btn ghost" style={{ padding: '6px 10px' }} onClick={onClose}>닫기</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
            <ScaledCard dNumber={slot.dNumber} isDay={false} teaser={form.teaser || '카드 문구를 입력하세요'} kicker={form.kicker}
              bgColor={form.bgColor} inkColor={form.inkColor} sceneIdx={form.sceneIdx} />

            <div>
              <div className="dc-row">
                <div className="dc-field"><label>신청자명 *</label><input className="dc-input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
                <div className="dc-field"><label>연락처 * (상태 통지용)</label><input className="dc-input" value={form.contact} onChange={(e) => set('contact', e.target.value)} placeholder="휴대전화 또는 이메일" /></div>
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
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="dc-btn primary" disabled={!canSubmit} onClick={submit} style={{ flex: 1 }}>{busy ? '신청 중…' : '신청 제출 (날짜 선점)'}</button>
              </div>
              <p className="dc-note" style={{ marginTop: 8 }}>제출 즉시 이 날짜가 잠기고, <b>신청번호와 비밀번호</b>가 발급됩니다. 비밀번호는 다시 볼 수 없으니 꼭 보관하세요. 관리자 검토 후 승인/반려됩니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ResultModal({ result, onClose }) {
    return (
      <div className="dc-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dc-modal" style={{ width: 'min(460px,100%)', textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)', marginBottom: 6 }}>신청 완료 ✓</div>
          <p className="dc-note">D-{result.dNumber} ({result.targetDate}) 날짜가 선점되었습니다. 아래 정보를 꼭 보관하세요 — <b>비밀번호는 다시 표시되지 않습니다.</b></p>
          <div style={{ margin: '16px 0 6px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>신청번호</div>
            <div className="dc-mono">{result.applicationNo}</div>
          </div>
          <div style={{ margin: '12px 0 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>비밀번호 (조회·수정용)</div>
            <div className="dc-mono">{result.password}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="dc-btn" onClick={() => copy(result.applicationNo + ' / ' + result.password)}>복사</button>
            <button className="dc-btn primary" onClick={onClose}>확인</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── 캘린더 ── */
  function Calendar({ slots, onApply, loading }) {
    if (loading) return <div className="dc-card"><p className="dc-note">불러오는 중…</p></div>;
    if (!slots || !slots.length) return (
      <div className="dc-card"><p className="dc-note">아직 신청 가능한 날짜가 없습니다. 관리자가 슬롯을 시딩하면 D-40 ~ D-5 카드 신청이 열립니다.</p></div>
    );
    return (
      <div className="dc-card">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, fontSize: 12, color: 'var(--muted)' }}>
          {['신청가능', '검토중', '확정', '마감'].map((s) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 9, height: 9, borderRadius: '50%', background: SS_COLOR[s] }} />{s}</span>
          ))}
        </div>
        <div className="dc-cal">
          {slots.map((s) => {
            const open = s.slotStatus === '신청가능';
            return (
              <div key={s.targetDate} className={'dc-slot' + (open ? '' : ' dim')} onClick={() => open && onApply(s)}>
                <div className="dn">D-{s.dNumber}</div>
                <div className="dt">{s.targetDate.slice(5).replace('-', '.')}</div>
                <SsTag s={s.slotStatus} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── 조회 / 수정 / 철회 ── */
  function Lookup() {
    const [no, setNo] = useState('');
    const [pw, setPw] = useState('');
    const [app, setApp] = useState(null);
    const [form, setForm] = useState(null);
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);

    async function lookup() {
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'lookup', applicationNo: no.trim(), password: pw });
      setBusy(false);
      if (ok && j.ok) { setApp(j.application); setForm(Object.assign({}, j.application)); }
      else { setApp(null); setMsg(j.error === 'bad_password' ? '신청번호 또는 비밀번호가 올바르지 않습니다.' : j.error === 'not_found' ? '신청을 찾을 수 없습니다.' : '조회 중 오류'); }
    }
    async function save() {
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'edit', applicationNo: no.trim(), password: pw, name: form.name, contact: form.contact, org: form.org, teaser: form.teaser, kicker: form.kicker, bgColor: form.bgColor, inkColor: form.inkColor, sceneIdx: form.sceneIdx });
      setBusy(false);
      if (ok && j.ok) { setApp(j.application); setMsg('수정되었습니다.'); } else setMsg(j.error === 'not_editable' ? '검토중 상태에서만 수정할 수 있습니다.' : '수정 중 오류');
    }
    async function withdraw() {
      if (!window.confirm('신청을 철회하면 이 날짜 선점이 해제됩니다. 진행할까요?')) return;
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'withdraw', applicationNo: no.trim(), password: pw });
      setBusy(false);
      if (ok && j.ok) { setApp(null); setForm(null); setMsg('철회되었습니다.'); } else setMsg('철회 중 오류');
    }
    const setF = (k, v) => setForm((f) => Object.assign({}, f, { [k]: v }));

    return (
      <div className="dc-card">
        <div className="dc-row" style={{ alignItems: 'flex-end' }}>
          <div className="dc-field"><label>신청번호</label><input className="dc-input" value={no} onChange={(e) => setNo(e.target.value)} placeholder="DC-XXXXXX" /></div>
          <div className="dc-field"><label>비밀번호</label><input className="dc-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div className="dc-field" style={{ flex: '0 0 auto' }}><button className="dc-btn primary" disabled={busy || !no.trim() || !pw} onClick={lookup}>조회</button></div>
        </div>
        {msg && <div className={/오류|않|없/.test(msg) ? 'dc-err' : 'dc-ok'}>{msg}</div>}

        {app && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{app.dNumber}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{app.targetDate}</span>
              <StTag s={app.status} />
            </div>
            {app.rejectReason && <p className="dc-note" style={{ color: 'var(--danger)', marginBottom: 12 }}><b>사유:</b> {app.rejectReason}</p>}
            <ScaledCard dNumber={app.dNumber} isDay={false} teaser={(form || app).teaser} kicker={(form || app).kicker} bgColor={(form || app).bgColor} inkColor={(form || app).inkColor} sceneIdx={(form || app).sceneIdx} />

            {app.editable ? (
              <div style={{ marginTop: 16 }}>
                <p className="dc-note" style={{ marginBottom: 10 }}>검토중 상태입니다. 아래에서 수정할 수 있습니다.</p>
                <div className="dc-row">
                  <div className="dc-field"><label>신청자명</label><input className="dc-input" value={form.name} onChange={(e) => setF('name', e.target.value)} /></div>
                  <div className="dc-field"><label>연락처</label><input className="dc-input" value={form.contact} onChange={(e) => setF('contact', e.target.value)} /></div>
                  <div className="dc-field"><label>소속대</label><input className="dc-input" value={form.org} onChange={(e) => setF('org', e.target.value)} /></div>
                </div>
                <Customizer form={form} set={setF} />
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="dc-btn primary" disabled={busy} onClick={save}>수정 저장</button>
                  <button className="dc-btn danger" disabled={busy} onClick={withdraw}>신청 철회</button>
                </div>
              </div>
            ) : (
              <p className="dc-note" style={{ marginTop: 14 }}>{app.status} 상태에서는 수정할 수 없습니다.{app.status === '제출됨' ? '' : ''}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── 관리자 ── */
  function Admin() {
    const [authed, setAuthed] = useState(() => !!adminToken());
    const [code, setCode] = useState('');
    const [data, setData] = useState(null);
    const [filter, setFilter] = useState('all');
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
      const { ok, status, j } = await jget(API + '?admin=1', bearer());
      if (status === 401) { setAdmin(null); setAuthed(false); setMsg('세션이 만료되었습니다. 코드를 다시 입력하세요.'); return; }
      if (ok) setData(j);
    }, []);
    useEffect(() => { if (authed) load(); }, [authed, load]);

    async function login() {
      const c = code.replace(/\D/g, ''); if (c.length !== 6) { setMsg('6자리 코드를 입력하세요.'); return; }
      setBusy(true); setMsg('');
      const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: c }) });
      const j = await r.json().catch(() => ({})); setBusy(false);
      if (r.ok && j.ok && j.token) { setAdmin({ token: j.token, exp: j.exp || (Date.now() + 12 * 3600 * 1000) }); setCode(''); setAuthed(true); }
      else setMsg(r.status === 429 ? '시도가 너무 많습니다.' : '인증 코드가 올바르지 않습니다.');
    }
    async function patch(body, confirmMsg) {
      if (confirmMsg && !window.confirm(confirmMsg)) return;
      setBusy(true);
      const { status, ok, j } = await jsend('PATCH', body, bearer());
      setBusy(false);
      if (status === 401) { setAdmin(null); setAuthed(false); setMsg('세션 만료'); return; }
      if (ok && j.ok) load(); else setMsg('처리 실패');
    }
    function act(app, action) {
      let reason = '';
      if (action === 'reject' || action === 'changes') { reason = window.prompt(action === 'reject' ? '반려 사유' : '수정요청 사유'); if (reason == null) return; }
      patch({ action, applicationNo: app.applicationNo, rejectReason: reason });
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
    const shown = apps.filter((a) => filter === 'all' || a.status === filter);
    const counts = apps.reduce((m, a) => { m[a.status] = (m[a.status] || 0) + 1; return m; }, {});

    return (
      <div>
        <div className="dc-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <b style={{ fontSize: 14 }}>슬롯 관리</b>
            <button className="dc-btn" disabled={busy} onClick={() => patch({ action: 'seed' }, '슬롯 D-40 ~ D-5 (36개)를 시딩할까요? 기존 슬롯은 유지됩니다.')}>슬롯 시딩 (D-40~D-5)</button>
            <span style={{ flex: 1 }} />
            <button className="dc-btn ghost" disabled={busy} onClick={load}>새로고침</button>
            <button className="dc-btn ghost" onClick={() => { setAdmin(null); setAuthed(false); }}>로그아웃</button>
          </div>
          {slots.length ? (
            <div className="dc-cal">
              {slots.map((s) => (
                <div key={s.targetDate} className="dc-slot" style={{ cursor: 'default' }}>
                  <div className="dn">D-{s.dNumber}</div>
                  <div className="dt">{s.targetDate.slice(5).replace('-', '.')}</div>
                  <button className="dc-btn ghost" style={{ padding: '3px 9px', fontSize: 11.5, color: s.isOpen ? 'var(--st-ready)' : 'var(--faint)' }}
                    disabled={busy} onClick={() => patch({ action: 'slot', dNumber: s.dNumber, isOpen: !s.isOpen })}>{s.isOpen ? '열림' : '닫힘'}</button>
                </div>
              ))}
            </div>
          ) : <p className="dc-note">시딩된 슬롯이 없습니다.</p>}
        </div>

        <div className="dc-card">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {['all', '제출됨', '수정요청', '승인', '반려', '철회'].map((f) => (
              <button key={f} className="dc-btn ghost" style={{ padding: '6px 12px', fontSize: 12.5, background: filter === f ? 'var(--accent-soft)' : 'none', color: filter === f ? 'var(--accent-ink)' : 'var(--muted)', borderColor: filter === f ? 'var(--accent)' : 'var(--line)' }} onClick={() => setFilter(f)}>
                {f === 'all' ? '전체' : f}{f !== 'all' && counts[f] ? ' ' + counts[f] : ''}
              </button>
            ))}
          </div>
          {msg && <div className="dc-err">{msg}</div>}
          {!shown.length && <p className="dc-note">신청이 없습니다.</p>}
          {shown.map((a) => (
            <div key={a.applicationNo} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{a.dNumber}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{a.targetDate}</span>
                <StTag s={a.status} />
                <code style={{ fontSize: 12, color: 'var(--muted)' }}>{a.applicationNo}</code>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--faint)' }}>{(a.createdAt || '').slice(0, 16).replace('T', ' ')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, alignItems: 'start' }}>
                <ScaledCard dNumber={a.dNumber} isDay={false} teaser={a.teaser} kicker={a.kicker} bgColor={a.bgColor} inkColor={a.inkColor} sceneIdx={a.sceneIdx} />
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                  <div><b>{a.name || '—'}</b> · {a.org || '—'}</div>
                  <div style={{ color: 'var(--muted)' }}>{a.contact || '—'}</div>
                  <div style={{ color: 'var(--faint)', fontSize: 12 }}>IP {a.ip || '—'}</div>
                  {a.rejectReason && <div style={{ color: 'var(--danger)', marginTop: 4 }}>사유: {a.rejectReason}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    <button className="dc-btn primary" style={{ padding: '7px 12px', fontSize: 12.5 }} disabled={busy || a.status === '승인'} onClick={() => act(a, 'approve')}>승인</button>
                    <button className="dc-btn" style={{ padding: '7px 12px', fontSize: 12.5 }} disabled={busy} onClick={() => act(a, 'changes')}>수정요청</button>
                    <button className="dc-btn danger" style={{ padding: '7px 12px', fontSize: 12.5 }} disabled={busy} onClick={() => act(a, 'reject')}>반려</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── 앱 셸 ── */
  function App() {
    const [view, setView] = useState('cal');
    const [slots, setSlots] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applySlot, setApplySlot] = useState(null);
    const [result, setResult] = useState(null);

    const load = useCallback(async () => { setLoading(true); const { j } = await jget(API); setSlots(j.slots || []); setLoading(false); }, []);
    useEffect(() => { load(); }, [load]);

    const tabs = [['cal', '신청 캘린더'], ['lookup', '신청 조회'], ['admin', '관리자']];
    return (
      <div className="dc-wrap">
        <div className="syncbar">
          <span className="orgtag">제16회 한국잼버리 · D-COUNT</span>
          <span style={{ flex: 1 }} />
          <span className="st">일자별 D-COUNT 카드 신청</span>
        </div>

        <header style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '22px 0 18px' }}>
          <img src="/jamboree/assets/logo.png" width="68" height="68" alt="엠블럼" style={{ borderRadius: '50%', background: '#fff', padding: 4, border: '1px solid var(--line-2)', boxShadow: 'var(--sh-1)' }} />
          <div>
            <p style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700, margin: '0 0 4px' }}>제16회 한국잼버리 PR팀</p>
            <h1 style={{ font: "700 23px/1.1 'Bricolage Grotesque','Hanken Grotesk',sans-serif", letterSpacing: '-.02em', margin: 0 }}>D-COUNT 카드 신청</h1>
            <p className="dc-note" style={{ marginTop: 6 }}>날짜(D-40~D-5)를 골라 카드를 신청하면 <b>하루 한 팀</b>이 선점합니다. 관리자 검토 후 승인되면 게시됩니다.</p>
          </div>
        </header>

        <div className="dc-nav">
          {tabs.map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}
        </div>

        <div style={{ marginTop: 16 }}>
          {view === 'cal' && <Calendar slots={slots} loading={loading} onApply={(s) => setApplySlot(s)} />}
          {view === 'lookup' && <Lookup />}
          {view === 'admin' && <Admin />}
        </div>

        {applySlot && <ApplyModal slot={applySlot} onClose={() => setApplySlot(null)} onDone={(j) => { setApplySlot(null); setResult(j); load(); }} />}
        {result && <ResultModal result={result} onClose={() => setResult(null)} />}
      </div>
    );
  }

  const boot = document.getElementById('__boot');
  if (boot) boot.remove();
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
