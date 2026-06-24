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
    { k: 'license', t: '콘텐츠 사용권 (필수)', d: '제출한 카드·사진을 제16회 한국잼버리/한국스카우트연맹이 게시·홍보 및 잼버리 화보집 제작에 활용할 수 있도록 사용권을 부여합니다.' },
    { k: 'age14', t: '만 14세 이상 확인 (필수)', d: '신청자는 만 14세 이상입니다. (14세 미만은 신청 대상이 아닙니다.)' },
  ];
  const phoneOk = (s) => /^01\d{8,9}$/.test(String(s || '').replace(/\D/g, ''));
  const hyphenPhone = (v) => { const d = String(v || '').replace(/\D/g, '').slice(0, 11); if (d.length <= 3) return d; if (d.length <= 7) return d.slice(0, 3) + '-' + d.slice(3); return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7); };
  const EMBLEMS = [['', '자동'], ['/jamboree/assets/logo.png', '컬러'], ['/jamboree/assets/logo-white.png', '흰색'], ['/jamboree/assets/logo-asset.png', '매듭']];
  async function uploadImage(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error('각 이미지는 5MB 이하만 가능합니다.');
    const r = await fetch('/api/image', { method: 'POST', headers: { 'content-type': file.type }, body: file });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(j.error === 'too_large' ? '5MB를 초과했습니다.' : j.error === 'unsupported_type' ? '이미지 파일만 가능합니다.' : '업로드 실패');
    return j.url;
  }

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
    if (loading && !slots) return <div className="dc-card"><p className="dc-note">불러오는 중…</p></div>;
    const sl = (slots || []).slice().sort((a, z) => z.dNumber - a.dNumber);   // D-40 → D-5
    const groups = [];
    sl.forEach((s) => { const gi = Math.floor((40 - s.dNumber) / 5); (groups[gi] = groups[gi] || []).push(s); });   // 5일 단위
    return (
      <div className="dc-card">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, fontSize: 12, color: 'var(--muted)' }}>
          {['신청가능', '검토중', '확정', '닫힘'].map((s) => <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 9, height: 9, borderRadius: '50%', background: SS_COLOR[s] }} />{s}</span>)}
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
                      <span className="dc-ss2" style={{ background: SS_COLOR[s.slotStatus] || 'var(--faint)' }}>{s.slotStatus}</span>
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
      else setErr(j.error === 'rate_limited' ? '신청이 너무 잦습니다. 잠시 후 다시 시도하세요.'
        : j.error === 'already_taken' ? '방금 이 날짜가 선점되었습니다. 다른 날짜를 선택하세요.'
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
            <b style={{ fontSize: 16 }}>{slot.targetDate} 디데이 카드</b><span style={{ flex: 1 }} />
            <button className="dc-btn ghost" style={{ padding: '6px 10px' }} onClick={onClose}>닫기</button>
          </div>
          <div style={{ display: 'grid', gap: 18 }}>
            <ScaledCard dNumber={slot.dNumber} isDay={false} teaser={form.teaser || '카드 문구를 입력하세요'} bgColor={form.bgColor} inkColor={form.inkColor} sceneIdx={form.sceneIdx} />
            <div>
              <div className="dc-row">
                <div className="dc-field"><label>신청자 이름 * (= 신청번호)</label><input className="dc-input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
                <div className="dc-field"><label>휴대전화 * (끝 4자리 = 비밀번호)</label><input className="dc-input" value={form.contact} onChange={(e) => set('contact', hyphenPhone(e.target.value))} placeholder="010-1234-5678" inputMode="numeric" maxLength={13} style={form.contact && !phoneOk(form.contact) ? { borderColor: 'var(--danger)' } : null} /></div>
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

  /* ── 승인 후 사진 공유(최대 3장·각 5MB) ── */
  function PhotoUploader({ no, pw, app, onUpdate }) {
    const [photos, setPhotos] = useState(app.photos || []);
    const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
    async function save(next) {
      setBusy(true); setErr('');
      const { ok, j } = await jsend('POST', { action: 'photos', applicationNo: no, password: pw, photos: next });
      setBusy(false);
      if (ok && j.ok) { setPhotos(j.application.photos || []); if (onUpdate) onUpdate(j.application); }
      else setErr(j.error === 'not_approved' ? '승인된 신청만 사진을 올릴 수 있습니다.' : j.error === 'rate_limited' ? '잠시 후 다시 시도하세요.' : '저장 실패');
    }
    async function onFiles(e) {
      const files = Array.from(e.target.files || []); e.target.value = '';
      if (!files.length) return;
      if (photos.length + files.length > 3) { setErr('사진은 최대 3장까지입니다.'); return; }
      setBusy(true); setErr('');
      try { const urls = []; for (const f of files) urls.push(await uploadImage(f)); await save(photos.concat(urls)); }
      catch (ex) { setErr(ex.message || '업로드 실패'); setBusy(false); }
    }
    return (
      <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>사진 공유 (최대 3장 · 각 5MB)</div>
        <div className="dc-photos">
          {photos.map((u, i) => (<div key={i} className="dc-photo"><img src={u} alt="" /><button className="rm" disabled={busy} onClick={() => save(photos.filter((_, k) => k !== i))}>×</button></div>))}
          {photos.length < 3 && <label className="dc-photo-add">{busy ? '업로드 중…' : '＋ 사진 추가'}<input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFiles} /></label>}
        </div>
        {err && <div className="dc-err">{err}</div>}
        <p className="dc-note" style={{ marginTop: 8, color: 'var(--danger)' }}>⚠️ 승인 완료 후 <b>7일 이내</b>에 사진이 공유되지 않으면 <b>별도의 고지 없이 취소</b>될 수 있습니다.</p>
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
      else { setApp(null); setMsg(j.error === 'rate_limited' ? '시도가 너무 많습니다. 잠시 후 다시 시도하세요.' : j.error === 'bad_credentials' ? '이름 또는 비밀번호(전화 끝 4자리)가 올바르지 않습니다.' : '조회 중 오류'); }
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
            {app.status === '승인' && <p className="dc-note" style={{ marginTop: 8, color: 'var(--accent)' }}>✓ 승인됐어요! <b>사진 올리기</b> 탭에서 카드를 A4로 출력하고, 촬영한 사진을 올려주세요.</p>}

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

  /* ── 사진 올리기 (승인 후 신청정보로 로그인 → A4 출력·사진 업로드) ── */
  function PhotoView() {
    const [no, setNo] = useState(''); const [pw, setPw] = useState('');
    const [app, setApp] = useState(null); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
    async function login() {
      setBusy(true); setMsg('');
      const { ok, j } = await jsend('POST', { action: 'lookup', applicationNo: no.trim(), password: pw });
      setBusy(false);
      if (ok && j.ok) setApp(j.application);
      else { setApp(null); setMsg(j.error === 'rate_limited' ? '시도가 너무 많습니다. 잠시 후 다시 시도하세요.' : '이름 또는 비밀번호(전화 끝 4자리)가 올바르지 않습니다.'); }
    }
    function reset() { setApp(null); setNo(''); setPw(''); setMsg(''); }
    return (
      <div className="dc-card">
        {!app ? (
          <div>
            <p className="dc-note" style={{ marginBottom: 12 }}><b>승인된 신청</b>만 사진을 올릴 수 있어요. 신청할 때 쓴 <b>이름</b>과 <b>휴대전화 끝 4자리</b>로 로그인하세요.</p>
            <div className="dc-field"><label>이름 (신청번호)</label><input className="dc-input" value={no} onChange={(e) => setNo(e.target.value)} placeholder="홍길동" /></div>
            <div className="dc-field"><label>휴대전화 끝 4자리 (비밀번호)</label><input className="dc-input" inputMode="numeric" maxLength={4} value={pw} onChange={(e) => setPw(e.target.value.replace(/\D/g, ''))} placeholder="1234" onKeyDown={(e) => { if (e.key === 'Enter') login(); }} /></div>
            <button className="dc-btn primary" style={{ width: '100%' }} disabled={busy || !no.trim() || pw.length < 4} onClick={login}>로그인</button>
            {msg && <div className="dc-err">{msg}</div>}
          </div>
        ) : app.status === '승인' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="dc-tag" style={{ background: 'var(--accent)' }}>D-{app.dNumber}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{app.targetDate}</span><StTag s={app.status} />
              <span style={{ flex: 1 }} />
              <button className="dc-btn ghost" style={{ padding: '6px 10px' }} onClick={reset}>다른 신청</button>
            </div>
            <ScaledCard dNumber={app.dNumber} isDay={false} teaser={app.teaser} bgColor={app.bgColor} inkColor={app.inkColor} sceneIdx={app.sceneIdx} />
            <button className="dc-btn primary" style={{ width: '100%', marginTop: 10 }} onClick={() => exportA4(cardProps(app), fileFor(app))}>A4 출력</button>
            <p className="dc-note" style={{ marginTop: 8 }}>위 <b>A4 출력</b>으로 카드를 인쇄해 현장에서 사진을 촬영한 뒤, 아래에 올려주세요!</p>
            <PhotoUploader no={no.trim()} pw={pw} app={app} onUpdate={setApp} />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <StTag s={app.status} />
            <p className="dc-note" style={{ marginTop: 10 }}>
              {(app.status === '제출됨' || app.status === '수정요청') ? '아직 홍보부 확인(승인) 전이에요. 승인되면 이 화면에서 사진을 올릴 수 있어요.'
                : app.status === '반려' ? ('반려된 신청입니다.' + (app.rejectReason ? (' 사유: ' + app.rejectReason) : ''))
                  : '철회된 신청입니다.'}
            </p>
            <button className="dc-btn ghost" style={{ marginTop: 8 }} onClick={reset}>다시</button>
          </div>
        )}
      </div>
    );
  }

  /* ── 마스터 스타일 편집(관리자) ── */
  const STYLE_DEFAULT = { pad: 0, topAdj: 0, botAdj: 0, lead: 0, gap: 0, numScale: 1, logo: '' };
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

  /* ── 관리자 ── */
  function Admin({ master, setMaster }) {
    const [authed, setAuthed] = useState(() => !!adminToken());
    const [code, setCode] = useState(''); const [data, setData] = useState(null);
    const [filter, setFilter] = useState('대기'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
    const [idleLeft, setIdleLeft] = useState(600);

    const load = useCallback(async () => {
      const { ok, status, j } = await jget(API + '?admin=1', bearer());
      if (status === 401) { setAdmin(null); setAuthed(false); setMsg('세션 만료 — 코드를 다시 입력하세요.'); return; }
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
          <span style={{ fontSize: 12, fontWeight: 600, color: idleLeft < 60 ? 'var(--danger)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }} title="유휴 자동 로그아웃까지 남은 시간">⏱ {Math.floor(idleLeft / 60)}:{pad2(idleLeft % 60)}</span>
          <button className="dc-btn ghost" disabled={busy} onClick={load}>새로고침</button>
          <button className="dc-btn ghost" onClick={() => { setAdmin(null); setAuthed(false); }}>로그아웃</button>
        </div>

        <MasterStyle master={master} busy={busy} setBusy={setBusy} onSaved={(ms) => setMaster(ms)} />

        <details className="dc-sec">
          <summary>슬롯 관리 (날짜 클릭 = 열림/닫힘 · 시딩 불필요·자동 생성)</summary>
          <div className="dc-secbody"><div className="dc-months">{monthsOf(slots).map((ym) => <MonthGrid key={ym} ym={ym} byDate={byDate} mode="admin" today={today} busy={busy} onToggle={(s) => patch({ action: 'slot', dNumber: s.dNumber, isOpen: !s.isOpen })} />)}</div></div>
        </details>

        <details className="dc-sec">
          <summary>변경 로그 ({((data && data.log) || []).length})</summary>
          <div className="dc-secbody">
            <button className="dc-btn danger" style={{ marginBottom: 10 }} disabled={busy} onClick={() => { if (window.confirm('로그를 초기화할까요?\n(초기화했다는 기록은 반드시 남습니다.)')) patch({ action: 'clearlog' }); }}>로그 초기화</button>
            <div className="dc-logbox">
              {((data && data.log) || []).map((l, i) => (
                <div key={i} className="dc-logrow"><span className="t">{(l.ts || '').slice(5, 16).replace('T', ' ')}</span><span>{l.action}{l.count ? ' (' + l.count + ')' : ''}</span><span style={{ marginLeft: 'auto', color: 'var(--faint)' }}>{l.ip || ''}</span></div>
              ))}
              {!((data && data.log) || []).length && <div style={{ padding: 12, color: 'var(--muted)', fontSize: 12 }}>기록 없음</div>}
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
      </div>
    );
  }

  /* ── 앱 셸 (해시 세부라우팅: #/lookup · #/admin) ── */
  const VIEWS = ['cal', 'lookup', 'photo', 'admin'];
  const viewFromHash = () => { try { const h = (location.hash || '').replace(/^#\/?/, ''); return VIEWS.indexOf(h) >= 0 ? h : 'cal'; } catch (_) { return 'cal'; } };
  function App() {
    const [view, setViewState] = useState(viewFromHash);
    const setView = useCallback((v) => { setViewState(v); try { location.hash = v === 'cal' ? '' : ('#/' + v); } catch (_) {} }, []);
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
    useEffect(() => { const onH = () => setViewState(viewFromHash()); window.addEventListener('hashchange', onH); return () => window.removeEventListener('hashchange', onH); }, []);

    const tabs = [['cal', '디데이 달력'], ['lookup', '신청 조회'], ['photo', '사진 올리기']];
    return (
      <window.DCMasterCtx.Provider value={master}>
        <div className="dc-wrap">
          <div className="syncbar"><span className="orgtag">제16회 한국잼버리 · 디데이 프로젝트</span><span style={{ flex: 1 }} /><button onClick={() => setView('admin')} style={{ border: 'none', background: 'none', color: 'var(--faint)', font: 'inherit', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}>관리자</button></div>
          <header style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '22px 0 16px' }}>
            <img src="/jamboree/assets/logo.png" width="68" height="68" alt="엠블럼" style={{ flex: '0 0 auto', width: 68, height: 68, borderRadius: '50%', background: '#fff', padding: 4, border: '1px solid var(--line-2)', boxShadow: 'var(--sh-1)', boxSizing: 'border-box' }} />
            <div>
              <p style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700, margin: '0 0 4px' }}>제16회 한국잼버리 기획조정본부 홍보부</p>
              <h1 style={{ font: "700 23px/1.1 'Bricolage Grotesque','Hanken Grotesk',sans-serif", letterSpacing: '-.02em', margin: 0 }}>디데이 프로젝트</h1>
              <p className="dc-note" style={{ marginTop: 6 }}>스카우트 가족이 <b>함께 준비하는 잼버리</b> — 날짜를 골라 디데이 카드를 신청하고, 홍보부를 통해 신청이 정상 확인되면 <b>A4로 출력해 사진을 촬영</b>한 뒤 그 사진을 올려주세요!</p>
            </div>
          </header>
          <div style={{ display: 'flex', gap: 6, margin: '0 0 12px', fontSize: 11.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
            {['① 날짜 신청', '② 홍보부 확인(승인)', '③ A4 출력·사진 촬영', '④ 사진 올리기'].map((s, i) => <span key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--pill)', padding: '4px 10px' }}>{s}</span>)}
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: '10px 14px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 8 }}>
            🛡 비속어·상업적 홍보·정치적 내용 등 <b>잼버리 정신에 어긋나는 내용</b>이 담기면 <b style={{ color: 'var(--danger)' }}>반려</b>될 수 있어요.
          </div>
          <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--r-2)', padding: '10px 14px', fontSize: 12.5, color: 'var(--accent-ink)', lineHeight: 1.55 }}>
            ⚡ 더 빠른 확정을 원하면 <b>한국스카우트연맹 <a href="tel:0263352000" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>02-6335-2000</a></b> 으로 문의주세요. 빠르게 도와드릴게요.
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
