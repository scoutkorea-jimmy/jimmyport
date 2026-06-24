/* krjam-dcount — Stage 1: D-가로 모듈(DCountCard) 라이브 미리보기.
 * 페이지 크롬은 krjam-planning 그린 톤. 카드 출력은 WOSM 팔레트(DCountCard).
 * 다음 단계: 슬롯 캘린더 · 신청 폼(+5종 동의) · 신청번호/비번 발급 · 조회/수정 · 관리자.
 * ⚠️ Babel standalone 공유 스코프 → IIFE 필수. */
(function () {
  const { useState, useEffect, useRef, useCallback } = React;

  function Stage({ dNumber, isDay, teaser }) {
    const wrapRef = useRef(null);
    const [scale, setScale] = useState(0.45);
    useEffect(() => {
      function recalc() {
        const el = wrapRef.current; if (!el) return;
        const avail = el.clientWidth;
        setScale(Math.min(1, avail / window.DCOUNT_WIDE.w));
      }
      recalc();
      window.addEventListener('resize', recalc);
      const t = setTimeout(recalc, 60);
      return () => { window.removeEventListener('resize', recalc); clearTimeout(t); };
    }, []);
    const W = window.DCOUNT_WIDE.w, H = window.DCOUNT_WIDE.h;
    return (
      <div ref={wrapRef} style={{ width: '100%' }}>
        <div style={{ width: W * scale, height: H * scale, maxWidth: '100%', margin: '0 auto', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--sh-2)', border: '1px solid var(--line)' }}>
          <div style={{ width: W, height: H, position: 'relative', transform: 'scale(' + scale + ')', transformOrigin: 'top left' }}>
            <window.DCountCard dNumber={dNumber} isDay={isDay} teaser={teaser} />
          </div>
        </div>
      </div>
    );
  }

  function App() {
    const [d, setD] = useState(40);
    const [isDay, setIsDay] = useState(false);
    const [teaser, setTeaser] = useState('세계가 강원으로 향합니다');

    const label = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2)', margin: '0 0 6px' };
    const inputCss = { width: '100%', border: '1px solid var(--line)', borderRadius: 'var(--r-1)', padding: '10px 12px', font: 'inherit', fontSize: 14, background: 'var(--surface)', color: 'var(--ink)' };

    return (
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 22px 60px' }}>
        <div className="syncbar">
          <span className="orgtag">제16회 한국잼버리 · D-COUNT</span>
          <span style={{ flex: 1 }} />
          <span className="st">D-가로 카드 미리보기</span>
        </div>

        <header style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '24px 0 20px', borderBottom: '1px solid var(--line)', marginBottom: 22 }}>
          <img src="/jamboree/assets/logo.png" width="74" height="74" alt="제16회 한국잼버리 엠블럼"
            style={{ borderRadius: '50%', background: '#fff', padding: 4, border: '1px solid var(--line-2)', boxShadow: 'var(--sh-1)' }} />
          <div>
            <p style={{ fontSize: 11.5, letterSpacing: '.02em', color: 'var(--accent)', fontWeight: 700, margin: '0 0 5px' }}>제16회 한국잼버리 PR팀</p>
            <h1 style={{ font: "700 24px/1.1 'Bricolage Grotesque','Hanken Grotesk',sans-serif", letterSpacing: '-.02em', margin: 0, color: 'var(--ink)' }}>D-COUNT 카드 신청</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '7px 0 0', lineHeight: 1.5 }}>
              일자별 D-COUNT 카드를 신청·게시하는 시스템입니다. 아래는 카드뉴스 <b>D-가로</b> 모듈을 그대로 가져온 미리보기예요.<br />
              <span style={{ color: 'var(--st-draft)' }}>신청 캘린더 · 폼(동의) · 관리자 승인은 다음 단계로 준비 중입니다.</span>
            </p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', padding: '18px 20px', boxShadow: 'var(--sh-1)' }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 220px' }}>
                <label style={label}>D-{isDay ? 'DAY' : d} · 카운트다운 ({isDay ? '개영 당일' : 'D-5 ~ D-40'})</label>
                <input type="range" min="5" max="40" value={d} disabled={isDay}
                  onChange={(e) => setD(parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer', paddingBottom: 4 }}>
                <input type="checkbox" checked={isDay} onChange={(e) => setIsDay(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                개영 당일 (D-DAY)
              </label>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={label}>카드 문구 (티저)</label>
              <input value={teaser} onChange={(e) => setTeaser(e.target.value)} placeholder="예: 세계가 강원으로 향합니다" style={inputCss} />
            </div>
          </div>

          <Stage dNumber={d} isDay={isDay} teaser={teaser} />
        </div>
      </div>
    );
  }

  const boot = document.getElementById('__boot');
  if (boot) boot.remove();
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
