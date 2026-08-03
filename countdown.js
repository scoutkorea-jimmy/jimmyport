/* 제16회 한국잼버리 개영식 카운트다운 — 전 페이지 공용 (v0.9.294)
 *
 * 사용자 확정(2026-08-04):
 *   · 행사의 **공식 시작은 개영식 2026-08-05 20:00** — 카운트다운은 이걸 기준으로 한다.
 *   · 개영식이 지난 뒤부터는 `D-DAY · 개영!` 문구를 유지한다.
 *   · **2026-08-09 12:00 이후에는 카운트다운이 필요 없다** → 영역을 통째로 숨긴다.
 *
 * 왜 공용 모듈인가 — 같은 계산이 네 화면(랜딩·홍보부·급식본부·소식제보)에 필요하다.
 * 네 군데에 복사해 두면 개영 시각이 바뀔 때 세 곳만 고치는 사고가 난다(CLAUDE.md 코드 규칙:
 * 스파게티 복제 금지 · 신규는 별도 모듈로). 여기 한 곳만 고치면 전부 따라온다.
 *
 * ⚠️ **시각을 읽는 코드는 인자로 받게 만든다.** `state(now)` 는 시계를 보지 않는다 —
 *    안에서 `new Date()` 를 부르면 회귀가 실제 시각에 끌려가, 날짜가 지나는 순간
 *    스위트가 통째로 빨개진다(v0.9.292 `잼버리 기간 밖…` · v0.9.293 급식보드 카운트다운 실제 사고).
 *    화면에 그릴 때만 `mount()` 가 `new Date()` 를 넣어 준다.
 *
 * ⚠️ **기준 시각은 KST 고정 오프셋(+09:00)으로 못 박는다.** `new Date(2026,7,5,20,0,0)` 처럼
 *    쓰면 **브라우저 타임존 기준**이라, 해외에서 보는 사람에게는 엉뚱한 시각을 센다
 *    (제보 화면은 영문도 지원한다 = 해외 참가자가 본다). 행사는 한국에서 열리므로 KST 가 정본이다.
 */
(function (root) {
  'use strict';

  var OPEN_ISO = '2026-08-05T20:00:00+09:00';   // 개영식 = 공식 시작
  var END_ISO  = '2026-08-09T12:00:00+09:00';   // 이 시각 이후로는 카운트다운을 보여 주지 않는다
  var OPEN_DT = new Date(OPEN_ISO);
  var END_DT = new Date(END_ISO);

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* 지금이 어느 구간인지와 표시값. **시계를 읽지 않는다 — now 를 받는다.**
   * 반환: { phase, days, hh, mm, ss, text, visible }
   *   phase 'before' = 개영 전(D-n HH:MM:SS) · 'during' = 개영~종료(D-DAY) · 'over' = 종료(숨김) */
  function state(now) {
    var t = now instanceof Date ? now : new Date(now);
    if (t >= END_DT) return { phase: 'over', visible: false, days: 0, hh: 0, mm: 0, ss: 0, text: '' };
    if (t >= OPEN_DT) return { phase: 'during', visible: true, days: 0, hh: 0, mm: 0, ss: 0, text: 'D-DAY · 개영!' };
    var ms = OPEN_DT - t;
    var s = Math.floor(ms / 1000);
    var days = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600),
        mm = Math.floor(s % 3600 / 60), ss = s % 60;
    return { phase: 'before', visible: true, days: days, hh: hh, mm: mm, ss: ss,
             text: hms(days, hh, mm, ss) };
  }

  /* ⚠️ 하루 미만이면 `D-0` 을 붙이지 않는다 — `D-0 00:00:01` 은 고장 난 것처럼 보인다.
     옆에 '개영식까지' 라벨이 붙으므로 시:분:초만으로 뜻이 통한다(급식보드가 쓰던 방식). */
  function hms(days, hh, mm, ss) {
    var t = pad2(hh) + ':' + pad2(mm) + ':' + pad2(ss);
    return days > 0 ? ('D-' + days + ' ' + t) : t;
  }

  /* 영문 표시 — 제보 화면이 ko/en 을 함께 쓴다. 숫자는 같고 문구만 다르다. */
  function textEn(st) {
    if (!st || !st.visible) return '';
    if (st.phase === 'during') return 'D-DAY · Opening!';
    return hms(st.days, st.hh, st.mm, st.ss);
  }

  /* 카운트다운 값을 el 에 1초마다 써 준다. 종료 구간이면 **박스를 통째로 숨기고 타이머를 멈춘다**
   * (자리만 비워 두면 빈 칸이 남는다 — 사용자 확정: 완전히 숨김).
   *  opts.box   값을 감싼 바깥 요소(숨길 대상). 없으면 el 자신을 숨긴다.
   *  opts.lang  'en' 이면 영문 문구.
   *  opts.onHide 숨길 때 한 번 불린다(다른 요소를 같이 정리해야 할 때).
   * 반환: stop() — 화면을 갈아엎을 때 타이머를 정리하라고 돌려준다. */
  function mount(el, opts) {
    opts = opts || {};
    if (!el) return function () {};
    var box = opts.box || el;
    var timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function tick() {
      var st = state(new Date());
      if (!st.visible) {
        box.hidden = true;
        try { box.style.display = 'none'; } catch (e) {}   // hidden 을 덮는 CSS 가 있어도 확실히 숨긴다
        if (typeof opts.onHide === 'function') opts.onHide();
        stop();
        return;
      }
      el.textContent = (opts.lang === 'en') ? textEn(st) : st.text;
    }
    tick();
    if (timer === null && !box.hidden) timer = setInterval(tick, 1000);
    return stop;
  }

  root.KJCountdown = {
    OPEN_ISO: OPEN_ISO, END_ISO: END_ISO, OPEN_DT: OPEN_DT, END_DT: END_DT,
    state: state, textEn: textEn, mount: mount,
  };
})(typeof window !== 'undefined' ? window : this);
