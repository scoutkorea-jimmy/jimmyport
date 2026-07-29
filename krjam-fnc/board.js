/* 급식편의본부 운영 안내 보드 (v0.9.253)
 *
 * 31쪽짜리 OT 자료를 "넘겨 보는 PDF" 에서 "현장에서 찾아 쓰는 화면"으로 바꿨다.
 * 내용은 원본 자료에서 그대로 옮겼고, 각 섹션에는 원문 몇 쪽인지 링크를 달아 두었다
 * (플립북은 /krjam-fnc-book 에 그대로 살아 있다 — 자료 원본을 확인해야 할 때가 반드시 온다).
 *
 * ⚠️ 식사 메뉴는 이 파일에 적지 않는다. 홍보부 운영보드(/krjam-planning)가 쓰는 것과
 *    **같은 KV(jp:meals)** 를 /api/jp-meals 로 읽는다. 두 곳에 메뉴를 따로 적으면 반드시 어긋난다.
 * ⚠️ 빌드 단계 없음(프로젝트 규칙) — 바닐라 JS 한 파일.
 */
(function () {
  'use strict';

  var VER = '0.9.253';
  var BOOK = '/krjam-fnc-book';

  /* ── 원본 자료 (PDF 31쪽에서 옮김) ───────────────────────────── */
  var EVENT = {
    inDate: '2026-08-03T14:00:00+09:00',
    openDate: '2026-08-05T20:00:00+09:00',
    outDate: '2026-08-09T11:00:00+09:00',
  };

  var ORG = {
    head: '심호웅',
    depts: [
      { name: '급식편의지원부', chief: '유학준',
        teams: [{ name: '급식편의지원팀', lead: '', members: ['임지민'] }] },
      { name: '식자재보급운영부', chief: '김은철',
        teams: [{ name: '식자재보급운영팀', lead: '주명림',
          members: ['장문수', '임운택', '이홍우', '박성민', '박미화', '정명빈', '한상규'] }] },
      { name: '잼버리식당운영부', chief: '안재용',
        teams: [{ name: '잼버리식당운영팀', lead: '이훈혁',
          members: ['김경구', '김만수', '김소은', '김영찬', '백종명', '변주환', '이상열', '이성혁', '이병숙', '황보은별', '안정효', '변희중'] }] },
      { name: '편의시설운영부', chief: '김영희',
        teams: [{ name: '급식편의운영팀', lead: '전은경', members: ['충원예정'] },
                { name: '급식시설운영팀', lead: '조대중', members: ['김시람', '아이린(Irene)', '리사(Risa)'] }] },
    ],
  };

  // 잼버리식당 식사 시간(운영요원·컵스카우트 참관단 기준) — '지금 운영 중'을 여기서 계산한다
  var MEAL_TIMES = [
    { key: 'b', name: '조식', from: '07:00', to: '09:00', who: '잼버리 식당 배식 · 8/6 이후 운영요원은 간편식 동시 수령' },
    { key: 'l', name: '중식', from: '12:00', to: '14:00', who: '8/6 이후 컵스카우트 참관단만 · 운영요원은 간편식(조식 때 픽업)' },
    { key: 'd', name: '석식', from: '17:00', to: '20:00', who: '잼버리 식당 배식' },
  ];
  var SUPPLY_TIMES = [
    { name: '조식·중식 식자재', from: '06:00', to: '07:00' },
    { name: '석식 식자재', from: '16:00', to: '17:00' },
  ];

  var SCHEDULE = [
    { d: '2026-08-03', label: '8/3 (월)', items: ['입영 14:00', '본부 세팅', '잼버리 식당 준비 · 운영 시작 (JPT·IST·CMT)', '1차 시범운영', 'F&C Div 현장 OT 19:00'] },
    { d: '2026-08-04', label: '8/4 (화)', items: ['잼버리식당 2차 시범운영 (조식)', '북카페 세팅', '식자재보급소 간편식 장소 세팅', '전체회의', '편의시설 구축(CU·이디야커피) 및 운영 시작'] },
    { d: '2026-08-05', label: '8/5 (수)', items: ['컵스카우트 1기 입영', '북카페 시범 운영', '편의시설 시범 운영', '식자재보급 시뮬레이션 (석식 제공 준비)', '잼버리식당 정식운영', '개영식 참석'] },
    { d: '2026-08-06', label: '8/6 (목)', items: ['식자재 보급 정식 운영 (지원 필요)', '잼버리식당 간편식 장소 세팅 및 관리', '북카페 정식 오픈', 'K-pop 콘서트 이슈 대비'] },
    { d: '2026-08-07', label: '8/7 (금)', items: ['컵스카우트 1기 퇴영 (간편식)', '컵스카우트 2기 입영 (잼버리식당)', 'Big Dinner'] },
    { d: '2026-08-08', label: '8/8 (토)', items: ['오전 정상 운영', '북카페 정리', '폐영식 이슈 대비', '편의시설 정리'] },
    { d: '2026-08-09', label: '8/9 (일)', items: ['컵스카우트 2기 퇴영 (간편식)', '식자재 보급 후 정리', '잼버리 식당 조식 제공 후 정리', '본부 정리', '퇴영 11:00'] },
  ];

  /* 담당 배정 대상 — 서버 화이트리스트(functions/api/jp-fnc.js DUTY_KEYS)와 같은 키를 쓴다.
     ⚠️ 키를 바꾸면 서버도 같이 바꿔야 한다. 안 그러면 저장은 되는 듯 보이고 값만 사라진다. */
  // 담당 배정 = 조직 로스터(ORG)의 단일 원본. 서버(jp-fnc-org)에서 불러와 ORG 를 덮어쓴다.
  var orgLoaded = false, orgMeta = { updatedAt: null, by: '' }, orgEdit = false, orgFail = false;
  // 되돌리기 — 덮어쓰기 직전 상태 목록(관리자만). 보호를 다 걸어도 사람은 실수하므로 돌아갈 길을 화면에 둔다.
  var orgSnaps = null, orgSnapOpen = false;

  /* 배정은 홍보부 보드 세션이 있으면 할 수 있다 — 같은 도메인이라 그 세션을 그대로 쓴다.
     (로그인 화면을 하나 더 만들면 비밀번호가 하나 더 생긴다.) */
  function session() {
    try {
      var s = JSON.parse(localStorage.getItem('jamboree-plan:session') || 'null');
      if (s && s.token && s.exp && s.exp > Date.now()) return s;
    } catch (e) {}
    return null;
  }
  function canAssign() { return !!fncSession(); }   // 담당 배정 편집도 급식 관리자 로그인 시에만
  function authHeader() { var s = session(); return s ? { Authorization: 'Bearer ' + s.token } : {}; }

  /* 급식 관리자 세션 — foodservice/20260803 (/api/jp-fnc-auth). 홍보부 세션과 별개.
     로그인하면 운영요원 전화 전체 열람 · 내용/텍스트 편집 · 식사 메뉴 편집이 열린다. */
  function fncSession() {
    try { var s = JSON.parse(localStorage.getItem('krjam-fnc:admin') || 'null');
      if (s && s.token && s.exp && s.exp > Date.now()) return s; } catch (e) {}
    return null;
  }
  function isAdmin() { return !!fncSession(); }   // 급식 관리자만 — 전화 열람·편집 게이트
  // 쓰기용 토큰 — 급식 관리자 우선, 없으면 홍보부 세션(식사 메뉴 양방향 편집용)
  function writeHeader() { var f = fncSession(); if (f) return { Authorization: 'Bearer ' + f.token }; var s = session(); return s ? { Authorization: 'Bearer ' + s.token } : {}; }
  function renderAdminBtn() {
    var b = $('fnc-admin-btn'); if (!b) return;
    if (fncSession()) { b.textContent = '로그아웃'; b.classList.add('on'); b.setAttribute('aria-label', '로그아웃'); }
    else { b.textContent = '로그인'; b.classList.remove('on'); b.setAttribute('aria-label', '로그인'); }
  }
  function openLogin() { var m = $('fnc-login'); if (!m) return; m.hidden = false; $('fl-err').hidden = true; $('fl-id').value = ''; $('fl-pw').value = ''; setTimeout(function () { var el = $('fl-id'); if (el) el.focus(); }, 30); }
  function closeLogin() { var m = $('fnc-login'); if (m) m.hidden = true; }
  function loginErr(msg) { var e = $('fl-err'); if (e) { e.textContent = msg; e.hidden = false; } }
  function submitLogin() {
    var id = ($('fl-id').value || '').trim(), pw = $('fl-pw').value || '';
    fetch('/api/jp-fnc-auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: id, pw: pw }) })
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (j) {
        if (j && j.ok && j.token) {
          // 30분 타임아웃 — 서버 토큰이 더 길어도 클라에서 30분 뒤 만료시킨다(공용 PC 대비).
          try { localStorage.setItem('krjam-fnc:admin', JSON.stringify({ token: j.token, exp: Date.now() + 1800000, name: '급식 관리자' })); } catch (e) {}
          closeLogin(); renderAdminBtn(); setView(cur || 'home', false); toast('로그인되었습니다 (30분 후 자동 로그아웃)');
        } else { loginErr('아이디 또는 비밀번호가 올바르지 않습니다.'); }
      }).catch(function () { loginErr('로그인 중 오류가 발생했습니다.'); });
  }
  function logoutAdmin() { try { localStorage.removeItem('krjam-fnc:admin'); } catch (e) {} renderAdminBtn(); setView(cur || 'home', false); toast('로그아웃되었습니다'); }

  /* ── 화면 정의 ─────────────────────────────────────────────── */
  // short: 모바일 하단 탭 라벨. 긴 이름은 두 줄로 접혀 탭이 흔들린다.
  var VIEWS = [
    { id: 'home',    ic: 'home',    label: '대시보드',    short: '홈',     grp: '' },
    { id: 'food',    ic: 'food',    label: '급식 현황',   short: '급식',   grp: '현장에서 바로' },
    { id: 'menu',    ic: 'menu',    label: '식단표',      short: '식단',   grp: '현장에서 바로' },
    { id: 'fac',     ic: 'fac',     label: '편의시설',    short: '편의',   grp: '현장에서 바로' },
    { id: 'duty',    ic: 'duty',    label: '담당 배정',   short: '담당',   grp: '운영' },
    { id: 'staff',   ic: 'staff',   label: '근무 편성',   short: '근무',   grp: '운영' },
    { id: 'org',     ic: 'org',     label: '본부 조직',   short: '조직',   grp: '운영' },
    { id: 'sched',   ic: 'sched',   label: '운영 일정',   short: '일정',   grp: '운영' },
    { id: 'inout',   ic: 'inout',   label: '입영 · 퇴영', short: '입퇴영', grp: '준비' },
    { id: 'ist',     ic: 'ist',     label: '요원 길잡이', short: '길잡이', grp: '준비' },
    { id: 'gallery', ic: 'gallery', label: '도표 모음',   short: '도표',   grp: '자료' },
    { id: 'book',    ic: 'book',    label: '자료 원문',   short: '원문',   grp: '자료' },
  ];
  var TABS = ['home', 'food', 'menu', 'duty', 'ist'];

  /* ── 아이콘 (Lucide/Feather 계열 인라인 SVG · 이모지 대신 톤 통일) ──
     상단바 아이콘과 같은 stroke 스타일을 쓴다(currentColor · 둥근 끝). */
  var ICONS = {
    home:    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    food:    '<path d="M3 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7"/>',
    menu:    '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    fac:     '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    duty:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    staff:   '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    org:     '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/>',
    sched:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    inout:   '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    ist:     '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    gallery: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    book:    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'
  };
  function svgIcon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ── 원문 도표 ──────────────────────────────────────────────
     조직도·배치도·흐름도·식권·일정표는 글로 옮기면 오히려 못 읽는다. 원문 그림을 그 자리에 놓고
     누르면 크게 본다(썸네일 → 원본 순으로 불러 화면이 먼저 뜬다). */
  var FIGS = {
    '2':  '식순',
    '4':  '잼버리 일정표 (참가자 하루 흐름)',
    '5':  '급식편의본부 조직도',
    '7':  '배치도 — 잼버리 식당(D동 1층) · JHQ-F&C',
    '9':  '참가자 식자재 보급 — 대상 · 운영시간 · 원칙',
    '10': '신선도 유지 체계 (Cold-Chain)',
    '11': '식자재 박스 위기상황 대처',
    '12': '운영요원 · 컵스카우트 참관단 식사 (2개소 15식)',
    '13': '식사 제공 안내 · 간편식 참고 사진',
    '14': '식당 운영 (1·2·3식당)',
    '15': '잼버리식당 이용 식권 4종',
    '19': '편의시설 운영 — 북카페 · CU · 커피차',
    '20': '소모임 장소 (미니 라운지)',
    '21': '안전보호 교육 (Safe from Harm)',
    '22': '입영 안내 — 이동방법 · 도착 후 확인',
    '23': '잼버리장 도착 절차 (단체버스 · 개인이동)',
    '24': '입영 안내도 — GATE 5',
    '25': '본부 · 운영요원 숙영지 위치',
    '26': '퇴영 안내',
    '27': '운영요원 지급품',
    '28': '숙박 — 잼버리텐트',
    '30': '급식편의본부 주요 업무추진 일정',
  };
  function pageURL(n) { return '/krjam-fnc/pages/p' + (n < 10 ? '0' : '') + n + '.webp'; }
  function thumbURL(n) { return '/krjam-fnc/thumbs/t' + (n < 10 ? '0' : '') + n + '.webp'; }
  function fig(n, cap) {
    cap = cap || FIGS[String(n)] || (n + '쪽');
    return '<figure class="fig"><button type="button" class="figbtn" data-fig="' + n + '" aria-label="' + esc(cap) + ' 크게 보기">' +
      '<img src="' + thumbURL(n) + '" alt="' + esc(cap) + '" loading="lazy" decoding="async">' +
      '<span class="figzoom">크게 보기</span></button>' +
      '<figcaption>' + esc(cap) + ' <span class="muted">· 원문 ' + n + '쪽</span></figcaption></figure>';
  }
  function figs(list) { return '<div class="figrow">' + list.map(function (n) { return fig(n); }).join('') + '</div>'; }

  var lbPage = null;
  function openLb(n) {
    lbPage = n;
    var el = $('lightbox');
    el.hidden = false;
    el.innerHTML = '<div class="lb-in" role="dialog" aria-modal="true" aria-label="' + esc(FIGS[String(n)] || (n + '쪽')) + '">' +
      '<div class="lb-h"><b>' + esc(FIGS[String(n)] || (n + '쪽')) + '</b><span class="muted">원문 ' + n + '쪽</span>' +
      '<span class="spacer"></span>' +
      '<a class="btn sm ghost" href="' + BOOK + '#p' + n + '" target="_blank" rel="noopener">원문에서 열기</a>' +
      '<button class="btn sm" id="lb-x">닫기</button></div>' +
      '<div class="lb-img"><img src="' + pageURL(n) + '" alt="' + esc(FIGS[String(n)] || '') + '"></div>' +
      '<div class="lb-f"><button class="btn sm ghost" id="lb-prev">← 이전 쪽</button>' +
      '<button class="btn sm ghost" id="lb-next">다음 쪽 →</button></div></div>';
    document.body.style.overflow = 'hidden';
  }
  function closeLb() { const el = $('lightbox'); el.hidden = true; el.innerHTML = ''; lbPage = null; document.body.style.overflow = ''; }
  function stepLb(d) {
    var keys = Object.keys(FIGS).map(Number).sort(function (a, b) { return a - b; });
    var i = keys.indexOf(lbPage);
    if (i < 0) return;
    openLb(keys[(i + d + keys.length) % keys.length]);
  }

  /* ── 유틸 ──────────────────────────────────────────────────── */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function srcLink(p, label) {
    return '<a class="src" href="' + BOOK + '#p' + p + '" target="_blank" rel="noopener">원문 ' + (label || (p + '쪽')) + ' →</a>';
  }
  var toastT = null;
  function toast(msg) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function minutesOf(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function nowMinutes(d) { return d.getHours() * 60 + d.getMinutes(); }

  /* ── 상단바 날씨 (Open-Meteo · 강원 고성, 홍보부 보드와 같은 방식) ── */
  var WX_LAT = 38.286, WX_LON = 128.520, wxData = null, wxAt = 0, wxLoading = false;
  var WMO = { 0: ['☀️', '맑음'], 1: ['🌤️', '대체로 맑음'], 2: ['⛅', '구름 조금'], 3: ['☁️', '흐림'], 45: ['🌫️', '안개'], 48: ['🌫️', '안개'], 51: ['🌦️', '이슬비'], 53: ['🌦️', '이슬비'], 55: ['🌦️', '이슬비'], 61: ['🌧️', '비'], 63: ['🌧️', '비'], 65: ['🌧️', '강한 비'], 71: ['🌨️', '눈'], 73: ['🌨️', '눈'], 75: ['❄️', '강한 눈'], 80: ['🌦️', '소나기'], 81: ['🌦️', '소나기'], 82: ['⛈️', '강한 소나기'], 95: ['⛈️', '뇌우'], 96: ['⛈️', '뇌우'], 99: ['⛈️', '강한 뇌우'] };
  function wxInfo(c) { return WMO[c] || ['🌡️', '—']; }
  function loadWeather(force) {
    if (!force && wxData && (Date.now() - wxAt < 1800000)) { renderWeather(); return; }
    if (wxLoading) return; wxLoading = true; renderWeather();
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + WX_LAT + '&longitude=' + WX_LON +
      '&timezone=Asia%2FSeoul&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1';
    fetch(url).then(function (r) { return r.json(); }).then(function (j) { wxData = j; wxAt = Date.now(); wxLoading = false; renderWeather(); })
      .catch(function () { wxLoading = false; renderWeather(); });
  }
  function renderWeather() {
    var el = $('fnc-wx'); if (!el) return;
    if (!wxData) { el.innerHTML = wxLoading ? '<span class="wx-load">날씨…</span>' : ''; return; }
    var cur = wxData.current || {}, d = wxData.daily || {}, ci = wxInfo(cur.weather_code);
    var hi = (d.temperature_2m_max || [])[0], lo = (d.temperature_2m_min || [])[0], pop = (d.precipitation_probability_max || [])[0];
    el.innerHTML = '<span class="wx-ic">' + ci[0] + '</span><b class="wx-t">' + (cur.temperature_2m != null ? Math.round(cur.temperature_2m) + '°' : '—') + '</b>' +
      '<span class="wx-d">' + ci[1] + '</span>' +
      (hi != null ? '<span class="wx-hl">↑' + Math.round(hi) + '° ↓' + Math.round(lo) + '°</span>' : '') +
      (pop != null ? '<span class="wx-pop">💧' + pop + '%</span>' : '') +
      '<span class="wx-loc">강원 고성</span>';
  }

  /* ── 핵심 안내 문구 인라인 편집 (v0.9.274) ──────────────────────
     원문 코드를 다 고치지 않고, 렌더된 안내 카드 문구에 '뷰+원문 해시' 안정 키를 붙여 override 를 덮어씌운다.
     관리자면 그 문구를 그 자리에서 고치고(contenteditable) 저장한다. 라이브 동적 영역(#mealnow 등)은 제외. */
  var contentOv = {};
  function loadContent() { return fetch('/api/jp-fnc-content').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.ok) contentOv = j.overrides || {}; return j; }).catch(function () { return null; }); }
  function hashStr(s) { var h = 5381, i = s.length; while (i) h = (h * 33) ^ s.charCodeAt(--i); return (h >>> 0).toString(36); }
  var CONTENT_SKIP = '#mealnow,#dutynow,#hero,#todaybox,#menubox,#staffbox,#dutybox,#days,#mealtable,.searchres,.staffchip,.mcell';
  function applyContent(root) {
    if (!root) return;
    var admin = isAdmin();
    var els = root.querySelectorAll('.card p, .card h3, .card h4, .card li, .sec-h');
    [].forEach.call(els, function (el) {
      if (el.closest(CONTENT_SKIP)) return;
      if (el.querySelector('a,button,input,select,.src')) return;   // 링크·컨트롤 포함 요소는 제외(단순 문구만)
      var orig = (el.textContent || '').trim(); if (!orig) return;
      if (!el.getAttribute('data-ek')) el.setAttribute('data-ek', 'c' + hashStr(cur + '|' + orig));
      var key = el.getAttribute('data-ek');
      // 저장이 실패했을 때 돌아갈 원문(override 가 없던 문구는 이 값으로 되돌린다)
      if (!el.getAttribute('data-orig')) el.setAttribute('data-orig', contentOv[key] != null ? contentOv[key] : orig);
      if (contentOv[key] != null) el.textContent = contentOv[key];
      if (admin) {
        el.setAttribute('contenteditable', 'true'); el.classList.add('tx-edit');
        if (!el.__txHooked) { el.__txHooked = 1; el.addEventListener('blur', function () { saveContentText(this); }); }
      }
    });
  }
  function saveContentText(el) {
    var key = el.getAttribute('data-ek'); if (!key) return;
    var val = (el.textContent || '').trim();
    if (contentOv[key] === val || (contentOv[key] == null && !val)) return;   // 변경 없음
    /* ⚠️ 화면을 먼저 바꾸되(빠른 반응), 저장이 실패하면 **반드시 되돌린다**.
       안 그러면 화면에는 새 문구가, 서버에는 옛 문구가 남아 사용자가 저장된 줄 안다. */
    var prevVal = contentOv[key], hadPrev = Object.prototype.hasOwnProperty.call(contentOv, key);
    var revert = function () {
      if (hadPrev) contentOv[key] = prevVal; else delete contentOv[key];
      try { el.textContent = hadPrev ? prevVal : (el.getAttribute('data-orig') || el.textContent); } catch (e) {}
    };
    contentOv[key] = val;
    fetch('/api/jp-fnc-content', { method: 'PUT', headers: Object.assign({ 'content-type': 'application/json' }, staffHeader()), body: JSON.stringify({ key: key, value: val }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.ok) { contentOv = j.overrides || contentOv; toast('문구 저장됨'); }
        else { revert(); toast('저장 실패 — 관리자 로그인을 확인하세요. 문구를 되돌렸습니다'); }
      })
      .catch(function () { revert(); toast('저장 실패 — 네트워크를 확인해 주세요. 문구를 되돌렸습니다'); });
  }

  /* ── 섹션 렌더러 ───────────────────────────────────────────── */
  function viewHome() {
    return '' +
      '<div class="cover">' +
        '<img class="cov-logo" src="/jamboree/assets/logo.png" alt="" width="56" height="56">' +
        '<div class="cov-tx"><b>급식편의본부 운영 안내</b>' +
          '<em>The 16th KNJ Food Service &amp; Convenience Division · 운영요원(IST)</em></div>' +
      '</div>' +
      '<div class="hero" id="hero"></div>' +
      '<section class="sec">' +
        '<h2 class="sec-h">지금 근무 · 오늘 식사</h2>' +
        '<div class="card" id="dutynow"></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">지금 식사 운영' + srcLink(12) + '</h2>' +
        '<div class="card" id="mealnow"></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">오늘 본부 일정</h2>' +
        '<div class="card" id="todaybox"></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">먼저 확인할 것</h2>' +
        '<div class="grid g3">' +
          '<div class="card"><h3>입영</h3><p><b>8/3(월) 14:00</b> · 도착 후 <b>Safe from Harm 이수 확인 → 소속 본부 확인 → 지급품 수령</b>.</p>' +
            '<p class="muted">지급품은 소속 본부에서 배부합니다. 도착하면 <b>JHQ-FnC</b> 로 오세요.</p>' +
            '<button class="btn sm" data-go="inout">입영 안내 보기</button></div>' +
          '<div class="card"><h3>식권</h3><p><span class="hi">식권 미지참 시 식당 입장 불가</span>입니다. 패스트트랙은 운영요원 식권과 <b>함께</b> 제출하고, <b>식사 시작 후 30분간만</b> 운영합니다.</p>' +
            '<button class="btn sm" data-go="food">식권 4종 보기</button></div>' +
          '<div class="card"><h3>숙박</h3><p>2인 1텐트. <span class="hi">숙영지에 전기 시설이 없습니다</span> — 개인 랜턴·보조배터리는 필수입니다. 개인 텐트 지참을 권장합니다.</p>' +
            '<button class="btn sm" data-go="ist">운영요원 안내 보기</button></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">자주 찾는 도표</h2>' +
        figs([5, 7, 15, 30]) +
        '<p><button class="btn sm" data-go="gallery">도표 전체 보기</button></p>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">행사 개요' + srcLink(3) + '</h2>' +
        '<div class="card">' +
          '<dl class="dl">' +
            '<dt>기간</dt><dd>2026년 8월 5일(수) ~ 9일(일) 4박5일 · <b>IST 8월 3일(월) ~ 9일(일)</b></dd>' +
            '<dt>컵스카우트 참관단</dt><dd>1기 8월 5일(수)~7일(금) · 2기 8월 7일(금)~9일(일)</dd>' +
            '<dt>주제</dt><dd>평화를 잇다, 지구를 살리다, 미래를 개척하다 <span class="muted">Peace and Planet, Ready for Future</span></dd>' +
            '<dt>본부 위치</dt><dd>급식편의본부 <b>JHQ-F&amp;C</b> (IST라운지·북카페 · 커피차 · 편의점) · 잼버리 식당 <b>D동 1층</b></dd>' +
          '</dl>' +
        '</div>' +
      '</section>';
  }

  function viewOrg() {
    var rows = ORG.depts.map(function (d) {
      var teams = d.teams.map(function (t) {
        var mem = t.members && t.members.length ? '<div class="mem">' + t.members.map(esc).join(' · ') + '</div>' : '';
        return '<div class="team"><b>' + esc(t.name) + '</b>' + (t.lead ? ' <span class="who">팀장 ' + esc(t.lead) + '</span>' : '') + mem + '</div>';
      }).join('');
      return '<div class="orgbox"><b>' + esc(d.name) + '</b><span class="who">부장 ' + esc(d.chief) + '</span>' + teams + '</div>';
    }).join('');
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">조직도' + srcLink(5) + '</h2>' +
        '<div class="card"><div class="org">' +
          '<div class="head">본부장 ' + esc(ORG.head) + '</div>' +
          '<div class="row">' + rows + '</div>' +
        '</div></div>' +
        figs([5]) +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">본부 운영 개요' + srcLink(6) + '</h2>' +
        '<div class="grid g3">' +
          '<div class="card"><h3>참가자 식자재박스 보급</h3><p>유닛(패트롤) 단위 수령 — <span class="hi">대표자 4인 이상</span>이 식자재박스 보관소를 직접 방문해 받습니다.</p></div>' +
          '<div class="card"><h3>잼버리 식당 운영</h3><p><span class="hi">시간 분리 운영</span> — 각 본부 및 컵스카우트 참관단이 지정된 시간에 식사합니다.</p><p class="muted">패스트트랙: 긴급 임무 수행 운영요원을 위한 신속 배식 체계.</p></div>' +
          '<div class="card"><h3>편의시설 · 북카페</h3><p>편의운영: 운영요원 관리, 잼버리 북카페 운영.</p><p>편의시설: 편의점(CU), 이디야커피차, <span class="hi">휴대폰 충전소 관리</span>.</p></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">부서별 업무' + srcLink(8) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>급식편의지원부</h3>' +
            '<h4>운영요원 지원</h4><ul><li>입·퇴영 절차</li><li>IST 사전 교육 안내</li></ul>' +
            '<h4>본부 체계 구축</h4><ul><li>JHQ-F&amp;C 업무 지원</li><li>편의운영팀과 업무 협업</li><li>각종 회의 및 행정 업무 지원</li></ul>' +
            '<h4>위기사항</h4><ul><li>비상상황 대응 지원 체계 구축 및 상황 보고</li><li>위기상황 관리 지원 및 상황 공유 체계 운영</li></ul>' +
            '<p class="muted">식자재보급소 · 잼버리 식당 · 편의시설운영부 관리 운영 지원</p></div>' +
          '<div class="card"><h3>편의시설운영부</h3>' +
            '<h4>급식편의운영</h4><ul><li>부서별 운영요원 배정 · 교육 · 소통</li><li>부서별 요청 시 운영요원 지원</li><li>단체 카톡방 관리</li><li>위기사항 대비 보고체계 · <b>식중독 발생 시 대응</b></li></ul>' +
            '<h4>급식시설운영</h4><ul><li>식자재 보급소 · 잼버리 식당 시설 관리 지원</li><li>편의점 · 커피차 · 북카페 관리</li></ul>' +
            '<h4>팀 체계' + '</h4><ul><li>IST 개인 역량을 고려해 업무 배정</li><li>배려와 소통으로 효율적 활동을 중재</li><li>IST 관리(비상연락망 포함) · 부서 간 업무 조정 · 급식 편의 민원 접수와 결과 확인</li></ul></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">IST 운영 관리 · 식음료 안전대책' + srcLink(18) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>IST 운영 관리 계획</h3><ul>' +
            '<li>급식편의본부 운영요원 총괄 운영 관리</li><li><b>입퇴영 관리 및 지급품 지급·관리</b></li>' +
            '<li>운영요원 리스트 관리</li><li>사전 교육 및 오리엔테이션</li><li>부별 IST 소통 채널 관리</li><li>상황 보고 및 기록 관리</li></ul></div>' +
          '<div class="card"><h3>식음료 안전대책</h3><ul>' +
            '<li>식중독 예방을 위해 <b>개인 컵 또는 텀블러</b> 사용</li>' +
            '<li>식품 알레르기 유발 성분 상세 표기</li>' +
            '<li>식중독 · 노로바이러스 예방 지도 · 교육 · 홍보</li>' +
            '<li>조리종사자 위생교육 실시</li>' +
            '<li>검수 · 조리 · 배식 전 과정 위생관리 철저</li></ul></div>' +
        '</div>' +
      '</section>';
  }

  function viewFood() {
    var tickets = [
      ['운영요원', '운영요원 대상 식권 (Meal Card)'],
      ['패스트 트랙', '운영요원 식권 지참 / 동시 제출 · 긴급 임무 수행자가 대기 없이 식사 · <b>식사 운영 시작 후 30분간만</b>'],
      ['컵스카우트 참관단', '참관단 및 인솔지도자 대상 · 효율적 운영을 위해 <b>식당 이용 대장</b>으로 대체'],
      ['일반식권', '지원 인력 등이 필요에 따라 사전 구매하는 범용 식권'],
    ].map(function (t) { return '<tr><th>' + t[0] + '</th><td>' + t[1] + '</td></tr>'; }).join('');

    return '' +
      // 요약 먼저(스캔) — 원문 수치 그대로
      '<div class="summary">' +
        '<div class="stat"><div class="k">참가자 식자재</div><div class="v">1개소 <small>· 11식</small></div><div class="sub">8/5 석식 ~ 8/9 조식</div></div>' +
        '<div class="stat"><div class="k">잼버리 식당</div><div class="v">2개소 <small>· 15식</small></div><div class="sub">최대 250명 동시 식사</div></div>' +
        '<div class="stat"><div class="k">참가자 인원</div><div class="v">1,098<small>명</small></div><div class="sub">대원 941 + 지도자 157</div></div>' +
        '<div class="stat"><div class="k">운영요원 · 참관단</div><div class="v">608 / 583<small>명</small></div><div class="sub">운영요원 608 · 컵스카우트 583</div></div>' +
      '</div>' +
      // 섹션 인덱스 — 한 페이지 밀도 완화(해시 안 바꾸고 스크롤)
      '<nav class="toc" aria-label="섹션 바로가기">' +
        '<a href="#fd-s1" data-scroll="fd-s1">참가자 식자재</a>' +
        '<a href="#fd-s2" data-scroll="fd-s2">운영요원·참관단</a>' +
        '<a href="#fd-s3" data-scroll="fd-s3">식사 시간</a>' +
        '<a href="#fd-s4" data-scroll="fd-s4">식당 운영</a>' +
        '<a href="#fd-s5" data-scroll="fd-s5">식권 4종</a>' +
        '<a href="#fd-s6" data-scroll="fd-s6">신선도·위기</a>' +
        '<a href="#fd-s7" data-scroll="fd-s7">원문 도표</a>' +
      '</nav>' +
      '<section class="sec" id="fd-s1">' +
        '<h2 class="sec-h"><span class="secnum">01</span>참가자 식자재 보급 <span class="chip info">1개소 11식</span>' + srcLink(9) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3><span class="dot"></span>대상 · 기간</h3><dl class="dl">' +
            '<dt>기간</dt><dd>8. 5.(수) 석식 ~ 8. 9.(일) 조식</dd>' +
            '<dt>장소</dt><dd>잼버리장 내 식자재 보급소</dd>' +
            '<dt>대상</dt><dd>7개 분단 · 대원 <b>941</b>명 + 지도자 <b>157</b>명 <span class="muted">(변경 가능)</span></dd>' +
            '<dt>운영시간</dt><dd>조식·중식 <b>06:00~07:00</b> · 석식 <b>16:00~17:00</b></dd>' +
          '</dl></div>' +
          '<div class="card"><h3><span class="dot"></span>기본 운영 원칙</h3><ul class="plist">' +
            '<li><b>단일 메뉴 보급</b> — 일자별 확정 메뉴 1종을 전 참가자에게 일괄 보급</li>' +
            '<li><b>유닛 단위 수령</b> — 패트롤 대표 1~2인이 보급소에서 수량 확인 후 수령</li>' +
            '<li><b>박스 반납 후 수령</b> — 전일 보급 용기 반납 확인 후 당일 인도</li>' +
            '<li><b>자율 취사</b> — 식자재 박스와 조리계획서로 유닛별 자율 조리</li></ul></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec" id="fd-s2">' +
        '<h2 class="sec-h"><span class="secnum">02</span>운영요원 · 컵스카우트 참관단 <span class="chip info">2개소 15식</span>' + srcLink(12) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3><span class="dot"></span>운영요원 <span class="muted" style="font-weight:700;font-size:var(--fs-1)">7일간</span></h3><dl class="dl">' +
            '<dt>기간</dt><dd>8. 3.(월) 석식 ~ 8. 9.(일) 조식</dd>' +
            '<dt>인원</dt><dd>JPT·IST <b>494</b>명 + CMT <b>114</b>명 <span class="muted">(변경 가능)</span></dd>' +
            '<dt>장소</dt><dd>D동 1·2·3식당 <span class="muted">(3식당 중식 보급)</span></dd>' +
            '<dt>수용</dt><dd>1·2식당 최대 <b>250명</b> 동시</dd>' +
          '</dl><div class="note"><span class="i">!</span><span><b>8/6~8일 중식</b>은 간편식 제공 — 식당 이용 불가</span></div></div>' +
          '<div class="card"><h3><span class="dot"></span>컵스카우트 참관단 <span class="muted" style="font-weight:700;font-size:var(--fs-1)">5일간</span></h3><dl class="dl">' +
            '<dt>기간</dt><dd>8. 5.(수) 석식 ~ 8. 9.(일) 조식</dd>' +
            '<dt>1기</dt><dd>8.5(수)~8.7(금) · 대원 257 + 지도자 42 = <b>299명</b></dd>' +
            '<dt>2기</dt><dd>8.7(금)~8.9(일) · 대원 246 + 지도자 38 = <b>284명</b></dd>' +
          '</dl><div class="people"><span class="pbadge"><span class="lab">1기</span><span class="n">299</span></span><span class="pbadge"><span class="lab">2기</span><span class="n">284</span></span><span class="pbadge"><span class="lab">합계</span><span class="n">583</span></span></div></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec" id="fd-s3">' +
        '<h2 class="sec-h"><span class="secnum">03</span>식사 시간 · 제공 방식' + srcLink(13) + '</h2>' +
        '<div class="card" id="mealtable"></div>' +
        '<div class="note info" style="margin-top:12px"><span class="i">i</span><span><b>식사 제공 시작은 8/3(월) 석식부터</b>입니다. 8/3 입영일 조식·중식은 개별 해결 후 입영해 주세요.</span></div>' +
      '</section>' +
      '<section class="sec" id="fd-s4">' +
        '<h2 class="sec-h"><span class="secnum">04</span>식당 운영' + srcLink(14) + '</h2>' +
        '<div class="grid g3">' +
          '<div class="card"><h3><span class="dot"></span>1식당 <span class="muted" style="font-weight:700;font-size:var(--fs-1)">본 식당</span></h3><p style="font-size:var(--fs-4);font-weight:800;margin:0 0 6px">최대 200명</p><p class="muted">컵스카우트 참관단·운영요원·지원요원 · 상황에 따라 탄력 운영</p></div>' +
          '<div class="card"><h3><span class="dot"></span>2식당 <span class="muted" style="font-weight:700;font-size:var(--fs-1)">세미나 2</span></h3><p style="font-size:var(--fs-4);font-weight:800;margin:0 0 6px">최대 50명</p><p class="muted">패스트트랙 또는 운영요원 특별식</p></div>' +
          '<div class="card"><h3><span class="dot"></span>3식당 <span class="muted" style="font-weight:700;font-size:var(--fs-1)">세미나 1</span></h3><p style="font-size:var(--fs-4);font-weight:800;margin:0 0 6px">중식 보급·보관</p><p class="muted">중식 전용 보급 지점</p></div>' +
        '</div>' +
        '<div class="note"><span class="i">!</span><span><b>식권 미지참 시 입장 불가</b> · 시간 분리 운영 — 각 본부·참관단이 지정 시간에 식사</span></div>' +
      '</section>' +
      '<section class="sec" id="fd-s5">' +
        '<h2 class="sec-h"><span class="secnum">05</span>식권 4종' + srcLink(15) + '</h2>' +
        '<div class="tblwrap"><table class="tbl"><tbody>' + tickets + '</tbody></table></div>' +
      '</section>' +
      '<section class="sec" id="fd-s6">' +
        '<h2 class="sec-h"><span class="secnum">06</span>신선도 유지 · 위기 대처' + srcLink(10) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3><span class="dot"></span>신선도 유지 (Cold-Chain)</h3><ul class="plist">' +
            '<li>전 차량 냉장 탑차 운송 및 <b>지급 완료 시까지 현장 대기</b></li>' +
            '<li>현장 보관: 몽골텐트 내 파레트 적재로 지면 열기 차단·직사광선 보호</li></ul></div>' +
          '<div class="card"><h3><span class="dot"></span>식자재 박스 위기 대처</h3>' +
            '<div class="tblwrap"><table class="tbl"><thead><tr><th>위기상황</th><th>대처방안</th></tr></thead><tbody>' +
            '<tr><td>식자재박스 파손·손상</td><td>대체품 또는 현장 교환</td></tr>' +
            '<tr><td>긴급 대피 시</td><td>간편식 긴급 제공 (운영사 협의)</td></tr>' +
            '<tr><td>식중독 발생 시</td><td>편의시설운영부 공유 및 상황실 신고</td></tr>' +
            '</tbody></table></div></div>' +
        '</div>' +
        figs([10, 11]) +
      '</section>' +
      '<section class="sec" id="fd-s7">' +
        '<h2 class="sec-h"><span class="secnum">07</span>원문 도표</h2>' + figs([9, 12, 14, 15]) +
      '</section>';
  }

  function viewMenu() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">식사 메뉴</h2>' +
        '<p class="lead">급식본부에서 관리하는 <b>식사 메뉴</b>입니다. 입력한 내용은 <b>홍보부 보드에도 함께 공유</b>되니, 저장 전 한 번 더 확인해 주세요.</p>' +
        '<div class="card" id="menubox">불러오는 중…</div>' +
      '</section>';
  }

  function viewFac() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">편의시설 운영' + srcLink(19) + '</h2>' +
        '<div class="grid g3">' +
          '<div class="card"><h3>잼버리 시공사 북카페</h3><dl class="dl">' +
            '<dt>대상</dt><dd>전원</dd><dt>운영시간</dt><dd><b>09:00 ~ 21:00</b></dd></dl>' +
            '<p class="muted">※ 식사시간 전후 1시간 운영 중단</p>' +
            '<p class="muted">8월 4일 오전 시공사 큐레이션 및 공간 배치 협업</p></div>' +
          '<div class="card"><h3>편의점 (CU)</h3><dl class="dl">' +
            '<dt>대상</dt><dd>전원</dd><dt>운영시간</dt><dd>2026. 8. 4.(화)부터 <b>09:00 ~ 21:00</b></dd></dl>' +
            '<p class="muted">편의 사정에 따라 브레이크 타임 운영 — 급식편의시설팀 협의 필요</p></div>' +
          '<div class="card"><h3>이디야 커피차</h3><dl class="dl">' +
            '<dt>대상</dt><dd>전원</dd><dt>운영시간</dt><dd>2026. 8. 4.(화)부터 <b>09:00 ~ 21:00</b></dd></dl>' +
            '<p class="muted">컵스카우트 참관단 이용은 기조·안전·컵본부 등과 협의 중</p></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">운영요원 역할 · 기본 원칙' + srcLink(19) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>주요 역할</h3><p>안내 · 시설 관리 · 물품 지원 · 질서 유지</p></div>' +
          '<div class="card"><h3>기본 원칙</h3><ul><li>휴식 공간으로 운영</li><li><b>주류 반입 금지</b> 및 주의사항 사전 공지</li></ul></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">소모임 장소 (미니 라운지)' + srcLink(20) + '</h2>' +
        '<div class="card"><dl class="dl">' +
          '<dt>대상</dt><dd>운영요원(IST) 및 지도자</dd>' +
          '<dt>운영일자</dt><dd>2026. 8. 4. · 8. 6. · 8. 7.</dd>' +
          '<dt>운영시간</dt><dd><b>18:00 ~ 19:30</b> / <b>19:30 ~ 21:00</b> <span class="muted">(각 1시간 30분)</span></dd>' +
          '<dt>이용 원칙</dt><dd>사전 예약 및 신청을 받아 운영 · 사용 후 정리·정돈 필수</dd>' +
        '</dl></div>' +
        figs([19, 20]) +
      '</section>';
  }

  function viewInout() {
    var bus = ['현장 도착', '하차 안내 확인', '명단 확인', 'Safe from Harm 이수 확인', '소속 본부 확인', '본부별 지급품 수령', '숙영지·근무지 이동'];
    var own = ['현장 도착', '명단 확인', 'Safe from Harm 이수 확인', '주차 안내 확인', '소속 본부 확인', '본부별 지급품 수령', '숙영지·근무지 이동'];
    var flow = function (steps) {
      return '<div class="flow">' + steps.map(function (s, i) {
        var key = /Safe from Harm|소속 본부|지급품/.test(s) ? ' key' : '';
        return (i ? '<span class="ar">→</span>' : '') + '<span class="st' + key + '">' + esc(s) + '</span>';
      }).join('') + '</div>';
    };
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">입영 안내' + srcLink(22) + '</h2>' +
        '<div class="card"><p style="font-size:var(--fs-4);font-weight:800;margin:0 0 6px">2026. 08. 03.(월) 14:00</p>' +
          '<p>도착 후 바로 <b>등록 및 Safe from Harm 이수 확인</b> 절차를 진행합니다.</p></div>' +
        '<div class="grid g3" style="margin-top:12px">' +
          '<div class="card"><h3>이동방법 1 — 개별 이동</h3><p>개인 차량 또는 대중교통 이용 후 현장 안내에 따라 접수</p></div>' +
          '<div class="card"><h3>이동방법 2 — 단체버스</h3><p>연맹 출발 단체버스 <b>13:00 예정</b><br><span class="muted">세부 시간은 변경 가능</span></p></div>' +
          '<div class="card"><h3>도착 후 확인</h3><p>Safe from Harm 이수 확인<br>급식편의본부에서 지급품 수령</p></div>' +
        '</div>' +
        '<div class="card" style="margin-top:12px">' +
          '<p>지급품은 <b>소속 본부</b>에서 배부합니다. 도착 시 급식편의본부 <b>JHQ-FnC</b> 로 오세요.</p>' +
          '<p class="muted">입영일정이 4일 또는 5일이신 경우 단톡방에 <b>부서 · 성명 · 입영일자</b>를 남겨 주시기 바랍니다.</p>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">잼버리장 도착 절차' + srcLink(23) + '</h2>' +
        figs([23]) +
        '<div class="card"><h3>단체버스</h3>' + flow(bus) + '</div>' +
        '<div class="card" style="margin-top:12px"><h3>개인 이동</h3>' + flow(own) + '</div>' +
        '<div class="card" style="margin-top:12px"><p>입영 절차의 핵심은 <span class="hi">이수 확인 → 소속 본부 확인 → 지급품 수령</span> 입니다.</p>' +
          '<p class="muted">Safe from Harm 이수 여부가 확인되지 않으면 현장 등록과 배치 확인이 지연될 수 있습니다.</p></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">배치도' + srcLink(7) + '</h2>' +
        '<div class="card"><p>잼버리 식당 <b>D동 1층</b> · 급식편의본부 <b>JHQ-F&amp;C</b>(약 40m × 45m) — IST라운지(북카페) · 커피차 · 편의점</p>' +
        '</div>' + figs([7, 24, 25]) +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">퇴영 안내' + srcLink(26) + '</h2>' +
        '<div class="card"><p style="font-size:var(--fs-4);font-weight:800;margin:0 0 6px">8/9(일) 11:00</p>' +
          '<p>소속 본부별 정리 및 퇴영 확인 후 이동합니다.</p></div>' +
        '<div class="grid g3" style="margin-top:12px">' +
          '<div class="card"><h3>이동방법 1 — 개별 이동</h3><p>개인 차량 또는 대중교통을 이용하여 개별 퇴영</p></div>' +
          '<div class="card"><h3>이동방법 2 — 단체버스</h3><p>8/9(일) <b>11:00 출발 예정</b> / 여의도 도착</p></div>' +
          '<div class="card"><h3>퇴영 전 확인</h3><p>담당 구역 정리 완료<br>개인 짐 · 분실물 확인</p></div>' +
        '</div>' +
        '<div class="card" style="margin-top:12px"><p>공용물품 반납 및 인원 확인 후 퇴영합니다. 반드시 소속 본부 안내에 따라 이동해 주세요.</p>' +
          '<p class="muted">퇴영 일정이 8일 오후 또는 9일 아침이신 경우 편의운영부에 꼭 알려 주시기 바랍니다.</p></div>' +
        figs([22, 26]) +
      '</section>';
  }

  function viewIst() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">지급품' + srcLink(27) + '</h2>' +
        '<div class="split">' +
          '<div class="card"><ul class="ticks">' +
            '<li>항건(네커치프)</li><li>티셔츠</li><li>공식 패치 / 운영요원 패치 2종</li><li>ID 팔찌</li>' +
            '<li>기념품 — 삼성 JBL 포터블 BT 스피커 1개 <span class="muted">(색상 랜덤)</span></li></ul></div>' +
          fig(27) +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">숙박 — 잼버리텐트' + srcLink(28) + '</h2>' +
        '<div class="split">' +
          '<div class="card"><h3>배정</h3><ul class="ticks">' +
            '<li>숙박은 텐트 · <b>2인 1텐트</b> 배정</li><li>세부 배정은 현장 및 소속 본부 안내에 따름</li>' +
            '<li>개인 침낭 · 세면도구 · 상비용품 등은 본인이 준비</li><li>깔개는 지급</li></ul>' +
            '<div class="warnbox"><b>꼭 챙기세요</b>' +
              '<ul class="ticks"><li><b>숙영지에 전기 시설이 없습니다</b> — 개인 랜턴 · 보조배터리 필수</li>' +
              '<li>개인 텐트 지참 권장 — 지급 텐트는 WSJ 에서 쓴 것이라 상태가 좋지 않습니다</li>' +
              '<li>텐트 내 귀중품 보관 주의 · 지정된 숙영구역 이탈 금지</li></ul></div></div>' +
          fig(28) +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">안전보호 교육 (Safe from Harm)' + srcLink(21) + '</h2>' +
        '<div class="callout danger"><b>필수</b> 모든 운영요원은 <b>Safe from Harm 온라인 사전교육 및 현장 안전보호교육</b>을 이수해야 합니다. ' +
          '이수 여부가 확인되지 않으면 현장 등록과 배치가 지연됩니다.</div>' +
        '<div class="grid g3">' +
          '<div class="card"><h3>기본 운영방향</h3><ul class="ticks"><li>잼버리에 참가하는 모든 성인(지원요원 포함)은 사전 교육 필수</li><li>신고 프로세스로 신속·정확한 대응 체계 확립</li></ul></div>' +
          '<div class="card"><h3>온라인 사전교육</h3><ul class="ticks"><li>오픈일시 2026년 7월 14일</li><li>교육링크 문자메시지 발송 완료</li><li>대상 운영요원 · 대지도자 · 지원요원 · 용역요원 · 일일방문객</li></ul></div>' +
          '<div class="card"><h3>신고 프로세스</h3><ul class="ticks"><li>온라인 — 전용 QR 및 링크</li><li>전화 — 핫라인 번호 안내 예정</li><li>방문 — Safe from Harm 오피스</li></ul></div>' +
        '</div>' +
        figs([21]) +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">근무 기준</h2>' +
        '<div class="grid g3">' +
          '<div class="card"><h3>근무 시간</h3><p class="big">08:30 ~ 22:00</p><p class="muted">기본 근무 · 현장 상황에 따라 조정</p></div>' +
          '<div class="card"><h3>항상</h3><p>ID 착용 · 연락 가능 상태 유지</p><p class="muted">위험상황은 즉시 보고합니다.</p></div>' +
          '<div class="card"><h3>현장 우선</h3><p>본부별 <b>최종 공지와 당일 전달사항</b>을 우선 적용합니다.</p></div>' +
        '</div>' +
      '</section>';
  }

  function viewGallery() {
    var keys = Object.keys(FIGS).map(Number).sort(function (a, b) { return a - b; });
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">도표 모음' +
          '<a class="src" href="' + BOOK + '" target="_blank" rel="noopener">31쪽 전체 원문 →</a></h2>' +
        '<p class="lead">자료의 조직도 · 배치도 · 흐름도 · 식권 · 일정표를 한자리에 모았습니다. 누르면 크게 볼 수 있습니다.</p>' +
        '<div class="figgrid">' + keys.map(function (n) { return fig(n); }).join('') + '</div>' +
      '</section>';
  }

  function viewSched() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">급식편의본부 주요 업무추진 일정' + srcLink(30) + '</h2>' +
        '<div class="days" id="days"></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">잼버리 일정표' + srcLink(4) + '</h2>' +
        '<div class="card"><p>참가자 하루 흐름 — 기상·체조·세면(06:00) → 아침식사(07:00) → 조회(08:00) → 과정활동 → 점심식사(12:00) → 과정활동 → 저녁식사(17:00) → 저녁 프로그램(20:00) → 반집회 · 정리 및 취침(22:00)</p>' +
          '<p class="muted">8/5 입영 및 설영 · 개영식 / 8/6 K-POP 콘서트 / 8/7 교류활동(대별) / 8/8 폐영식 / 8/9 철영 및 퇴영</p>' +
          '<a class="btn sm" href="' + BOOK + '#p4" target="_blank" rel="noopener">일정표 원문 보기</a></div>' +
      '</section>';
  }

  function viewBook() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">자료 원문 (31쪽)</h2>' +
        '<p class="lead">오리엔테이션 자료 원본입니다. 이 화면 안에서 넘겨 보거나, 새 창으로 크게 볼 수 있습니다.</p>' +
        '<p><a class="btn sm solid" href="' + BOOK + '" target="_blank" rel="noopener">새 창으로 열기</a> ' +
          '<a class="btn sm" href="/krjam-fnc/assets/KNJ16-FnC-Orientation.pdf" download="제16회 한국잼버리 급식편의본부 오리엔테이션.pdf">PDF 내려받기</a></p>' +
        '<div class="bookwrap"><iframe id="bookframe" src="' + BOOK + '" title="급식편의본부 오리엔테이션 자료 원문" loading="lazy"></iframe></div>' +
      '</section>';
  }

  function viewDuty() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">담당 배정' + srcLink(5, '조직도') + '</h2>' +
        '<p class="lead">급식편의본부 조직과 담당 인원입니다. 본부장·부장·팀장·팀원을 한눈에 보고, <b>급식 관리자로 로그인</b>하면 부서·팀 이름과 인원까지 바꿀 수 있습니다. 여기 인원이 <b>운영요원 근무</b> 등 다른 화면에도 그대로 쓰입니다.</p>' +
        '<div id="dutybox">불러오는 중…</div>' +
      '</section>';
  }
  var RENDER = { home: viewHome, org: viewOrg, food: viewFood, menu: viewMenu, fac: viewFac,
                 inout: viewInout, ist: viewIst, duty: viewDuty, staff: viewStaff, sched: viewSched,
                 gallery: viewGallery, book: viewBook };

  /* ── 살아 있는 부분 ────────────────────────────────────────── */
  function renderHero() {
    var box = $('hero'); if (!box) return;
    var now = new Date();
    var items = [
      { l: '입영', d: new Date(EVENT.inDate), s: '8/3(월) 14:00' },
      { l: '개영식', d: new Date(EVENT.openDate), s: '8/5(수) 20:00' },
      { l: '퇴영', d: new Date(EVENT.outDate), s: '8/9(일) 11:00' },
    ];
    box.innerHTML = items.map(function (it) {
      var ms = it.d - now, past = ms <= 0;
      var v;
      if (past) v = '지났음';
      else {
        var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
            m = Math.floor(s % 3600 / 60), ss = s % 60;
        v = d > 0 ? ('D-' + d + ' ' + pad2(h) + ':' + pad2(m) + ':' + pad2(ss))
                  : (pad2(h) + ':' + pad2(m) + ':' + pad2(ss));
      }
      var soon = !past && (it.d - now) < 86400000;
      return '<div class="dcard' + (past ? ' past' : (soon ? ' now' : '')) + '">' +
        '<div class="dl1">' + esc(it.l) + '까지</div><div class="dv">' + esc(v) + '</div><div class="dl2">' + esc(it.s) + '</div></div>';
    }).join('');
  }

  function mealStatus(now) {
    var mins = nowMinutes(now);
    return MEAL_TIMES.map(function (m) {
      var a = minutesOf(m.from), b = minutesOf(m.to);
      var state = mins < a ? 'before' : (mins >= b ? 'after' : 'now');
      return { m: m, state: state };
    });
  }
  function renderMealNow() {
    var box = $('mealnow'); if (!box) return;
    var now = new Date(), rows = mealStatus(now);
    var open = rows.filter(function (r) { return r.state === 'now'; })[0];
    var head = open
      ? '<p><span class="chip ok">지금 ' + esc(open.m.name) + ' 운영 중</span> <b>' + esc(open.m.from) + ' ~ ' + esc(open.m.to) + '</b></p>'
      : '<p><span class="chip">지금은 식사 시간이 아닙니다</span></p>';
    box.innerHTML = head + rows.map(function (r) {
      var chip = r.state === 'now' ? '<span class="chip ok">운영 중</span>'
        : r.state === 'before' ? '<span class="chip info">예정</span>' : '<span class="chip">종료</span>';
      return '<div class="meal"><span class="mn">' + esc(r.m.name) + '</span>' +
        '<span class="mt">' + esc(r.m.from) + ' ~ ' + esc(r.m.to) + '</span>' +
        '<span class="mw">' + esc(r.m.who) + '</span><span class="ms">' + chip + '</span></div>';
    }).join('');
  }
  function renderMealTable() {
    var box = $('mealtable'); if (!box) return;
    var now = new Date(), rows = mealStatus(now);
    box.innerHTML =
      '<h3>잼버리 식당 (운영요원 · 컵스카우트 참관단)</h3>' +
      rows.map(function (r) {
        var chip = r.state === 'now' ? '<span class="chip ok">운영 중</span>'
          : r.state === 'before' ? '<span class="chip info">예정</span>' : '<span class="chip">종료</span>';
        return '<div class="meal"><span class="mn">' + esc(r.m.name) + '</span>' +
          '<span class="mt">' + esc(r.m.from) + ' ~ ' + esc(r.m.to) + '</span>' +
          '<span class="mw">' + esc(r.m.who) + '</span><span class="ms">' + chip + '</span></div>';
      }).join('') +
      '<h4>참가자 식자재 보급소</h4>' +
      SUPPLY_TIMES.map(function (s) {
        return '<div class="meal"><span class="mn">' + esc(s.name.split(' ')[0]) + '</span>' +
          '<span class="mt">' + esc(s.from) + ' ~ ' + esc(s.to) + '</span>' +
          '<span class="mw">' + esc(s.name) + '</span></div>';
      }).join('');
  }

  function renderToday() {
    var box = $('todaybox'); if (!box) return;
    var today = new Date();
    var key = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
    var day = SCHEDULE.filter(function (d) { return d.d === key; })[0];
    if (!day) {
      box.innerHTML = '<p class="muted">오늘(' + esc(key) + ')은 본부 운영 기간(8/3~8/9)이 아닙니다. 전체 일정은 <b>업무 일정</b>에서 볼 수 있습니다.</p>' +
        '<button class="btn sm" data-go="sched">업무 일정 보기</button>';
      return;
    }
    box.innerHTML = '<h3>' + esc(day.label) + '</h3><ul>' + day.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
  }

  function renderDays() {
    var box = $('days'); if (!box) return;
    var today = new Date();
    var key = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
    box.innerHTML = SCHEDULE.map(function (d) {
      return '<div class="day' + (d.d === key ? ' today' : '') + '"><div class="dh">' + esc(d.label) + (d.d === key ? ' · 오늘' : '') + '</div>' +
        '<ul>' + d.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }

  /* ── 운영요원 · 쉬프트 (v0.9.272) ──────────────────────────────
     운영요원: 이름(필수)·전화(선택). 전화 전체는 관리자만(비관리자엔 끝 4자리).
     쉬프트: 오전 05–10 · 오후 11–15 · 저녁 16–21, 날짜 8/2~8/9. 대시보드에 현재 근무자 + 오늘 메뉴. */
  var STAFF_SHIFTS = [['am', '오전', '05:00', '10:00'], ['pm', '오후', '11:00', '15:00'], ['eve', '저녁', '16:00', '21:00']];
  var STAFF_DAYS = ['2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09'];
  var staffData = null;
  function staffHeader() { var f = fncSession(); return f ? { Authorization: 'Bearer ' + f.token } : {}; }   // 관리자면 전체번호 수신
  var staffVer = '';        // 불러온 시점의 버전 — 저장할 때 그대로 보내 충돌을 잡는다
  /* ⚠️ 지금 들고 있는 명단이 **관리자 응답**인지(전화 전체) 마스킹 응답인지(끝 4자리).
     비관리자 응답을 들고 저장하면 전원의 번호가 끝 4자리로 잘린다 — 저장 전에 반드시 확인한다.
     (서버도 같은 사고를 되돌리지만, 애초에 보내지 않는 게 맞다.) */
  var staffAdminData = false;
  function loadStaff() {
    return fetch('/api/jp-fnc-staff', { headers: staffHeader() }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.ok) { staffData = { staff: j.staff || [], shifts: j.shifts || {} }; staffVer = j.updatedAt || ''; staffAdminData = !!j.admin; }
        return j;
      })
      .catch(function () { return null; });
  }
  /* ⚠️ 인원·쉬프트는 통째로 저장된다. 불러오지 못한 상태에서 저장하면 남의 데이터를 지운다 →
     불러오기 전에는 저장하지 않는다. 그 사이 다른 관리자가 저장했으면 서버가 409 로 막고
     최신본을 돌려준다 — 화면을 최신으로 바꾸고 사용자에게 알린다(조용히 덮어쓰지 않는다). */
  function saveStaff(confirmShrink) {
    if (!staffData) { toast('명단을 아직 불러오지 못했습니다 — 새로고침 후 다시 시도해 주세요'); return Promise.resolve(); }
    var body = {
      staff: (staffData.staff || []).map(function (s) { return { id: s.id, name: s.name, phone: s.phone != null ? s.phone : '' }; }),
      shifts: staffData.shifts || {},
      baseVer: staffVer,
      confirmEmpty: true,   // staff 는 이제 '선택적 전화 레지스트리'라 빈 값도 정상(인원 원본은 조직표). 잠금·스냅샷으로 보호.
      confirmShrink: confirmShrink === true,   // 절반 미만으로 줄면 서버가 한 번 막는다 — 확인 후에만 통과
    };
    return fetch('/api/jp-fnc-staff', { method: 'PUT', headers: Object.assign({ 'content-type': 'application/json' }, staffHeader()), body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (x) {
        var j = x.j;
        if (x.s === 409 && j && j.error === 'conflict') {
          staffData = { staff: j.staff || [], shifts: j.shifts || {} }; staffVer = j.updatedAt || '';
          renderStaffView(); renderDutyNow();
          toast('다른 관리자가 먼저 저장했습니다 — 최신 명단을 불러왔습니다. 확인 후 다시 저장해 주세요');
          return;
        }
        if (x.s === 409 && j && j.error === 'empty_guard') { toast(j.message || '빈 목록은 저장하지 않았습니다'); return; }
        /* 부분 전멸 — 저장하지 않고 사람에게 묻는다. 실수면 여기서 멈추고, 의도한 정리면 한 번 더 확인해 통과. */
        if (x.s === 409 && j && j.error === 'shrink_guard') {
          var ok = window.confirm('연락처가 ' + j.had + '건에서 ' + j.now + '건으로 줄어듭니다.\n의도한 정리가 맞습니까?\n\n(실수라면 취소하세요 — 지금 취소하면 아무것도 지워지지 않습니다.)');
          if (ok) return saveStaff(true);
          loadStaff().then(renderStaffView);   // 화면을 서버 값으로 되돌린다
          toast('저장하지 않았습니다');
          return;
        }
        if (j && j.ok) {
          staffData = { staff: j.staff || [], shifts: j.shifts || {} }; staffVer = j.updatedAt || '';
          renderStaffView(); renderDutyNow(); toast('저장됨');
          return;
        }
        toast('저장 실패 — 관리자 로그인을 확인하세요');
        loadStaff().then(function () { renderStaffView(); });   // 화면이 저장된 척하지 않게 서버 값으로 되돌린다
      })
      .catch(function () {
        toast('저장 실패 — 네트워크를 확인해 주세요');
        loadStaff().then(function () { renderStaffView(); });
      });
  }
  function currentShift(now) { var m = nowMinutes(now); for (var i = 0; i < STAFF_SHIFTS.length; i++) { var s = STAFF_SHIFTS[i]; if (m >= minutesOf(s[2]) && m < minutesOf(s[3])) return s; } return null; }
  // 이름→전화 레지스트리(전화는 근무 화면에서 별도 관리 · 이름은 조직 로스터에서). 비관리자는 phone4(끝4).
  function phoneMap() { var m = {}; ((staffData && staffData.staff) || []).forEach(function (s) { if (s && s.name) m[s.name] = (s.phone != null) ? s.phone : (s.phone4 || ''); }); return m; }
  // 근무 후보 = 조직 로스터 인원(충원예정 제외) — 담당 배정과 같은 단일 원본을 쓴다.
  function rosterNames() { return peopleList().filter(function (n) { return n && n !== '충원예정'; }); }
  function staffLabel(name) { var ph = phoneMap()[name] || ''; return name + (ph ? ' (' + ph + ')' : ''); }
  // 대시보드 실시간 근무자 + 오늘 메뉴
  function renderDutyNow() {
    var box = $('dutynow'); if (!box) return;
    var now = new Date(), sh = currentShift(now);
    var today = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
    var onNow = [];
    if (sh && staffData) onNow = (((staffData.shifts[today] || {})[sh[0]]) || []).slice();
    var mt = menuData ? ((menuData.staff || {})[today] || {}) : null;
    var menuHtml = (mt && (mt.b || mt.l || mt.d))
      ? [['b', '조식'], ['l', '중식'], ['d', '석식']].map(function (x) { return mt[x[0]] ? '<div class="dn-meal"><span>' + x[1] + '</span>' + esc(mt[x[0]]) + '</div>' : ''; }).join('')
      : '<span class="muted">오늘 등록된 메뉴가 없습니다</span>';
    box.innerHTML =
      '<div class="dutynow-shift">' + (sh ? ('<span class="chip ok">' + sh[1] + '팀 근무 중</span> <b>' + sh[2] + ' ~ ' + sh[3] + '</b>') : '<span class="chip">지금은 지정 근무 시간이 아닙니다</span>') + '</div>' +
      '<div class="dutynow-people">' + (onNow.length ? onNow.map(function (n) { return '<span class="staffchip">' + esc(staffLabel(n)) + '</span>'; }).join('') : '<span class="muted">' + (staffData ? '배정된 근무자가 없습니다' : '운영요원 정보를 불러오는 중…') + '</span>') + '</div>' +
      '<div class="dutynow-menu"><b>오늘 식사(운영요원)</b>' + menuHtml + '</div>';
  }
  function viewStaff() { return '<section class="sec"><h2 class="sec-h">운영요원 · 쉬프트 배정</h2><div id="staffbox"><div class="card"><p class="muted">불러오는 중…</p></div></div></section>'; }
  function renderStaffView() {
    var box = $('staffbox'); if (!box) return;
    if (!staffData) { box.innerHTML = '<div class="card"><p class="muted">운영요원 정보를 불러오지 못했습니다.</p><button class="btn sm" id="staff-retry">다시 불러오기</button></div>'; return; }
    var admin = isAdmin(), pm = phoneMap(), names = rosterNames();
    var roster;
    if (!names.length) {
      roster = '<span class="muted">담당 배정(조직표)에 인원이 없습니다.</span>';
    } else if (admin) {
      roster = names.map(function (n) { return '<div class="staffrow"><span class="nm">' + esc(n) + '</span><input class="dfield sm phone-in" data-phone="' + esc(n) + '" inputmode="numeric" autocomplete="off" placeholder="전화 (선택)" value="' + esc(pm[n] || '') + '"></div>'; }).join('');
    } else {
      roster = names.map(function (n) { return '<span class="staffchip">' + esc(n) + (pm[n] ? ' <span class="muted">(' + esc(pm[n]) + ')</span>' : '') + '</span>'; }).join('');
    }
    var phoneSave = admin ? '<div class="staff-add"><button type="button" class="btn sm solid" id="staff-phones-save">연락처 저장</button><span class="muted" style="font-size:var(--fs-1)">이름은 <b>담당 배정</b>(조직표)에서 관리됩니다</span></div>' : '';
    var cal = '<div class="tblwrap"><table class="tbl shifttbl"><thead><tr><th>날짜</th>' +
      STAFF_SHIFTS.map(function (s) { return '<th>' + s[1] + '팀<span class="sh-t">' + s[2] + '~' + s[3] + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      STAFF_DAYS.map(function (d) {
        var dd = (+d.slice(5, 7)) + '/' + (+d.slice(8, 10));
        return '<tr><th>' + dd + '</th>' + STAFF_SHIFTS.map(function (sh) {
          var arr = ((staffData.shifts[d] || {})[sh[0]]) || [];
          var chips = arr.map(function (n) { return '<span class="staffchip sm">' + esc(n) + (admin ? '<button class="chip-x" data-unassign="' + d + '|' + sh[0] + '|' + esc(n) + '" aria-label="빼기">✕</button>' : '') + '</span>'; }).join('');
          var picker = '';
          if (admin) picker = '<div class="shift-assign"><input class="shift-search" data-search="' + d + '|' + sh[0] + '" placeholder="이름 검색 +" autocomplete="off" aria-label="근무자 검색해 배정" /><div class="shift-cands" data-cands="' + d + '|' + sh[0] + '"></div></div>';
          return '<td>' + (chips || (admin ? '' : '<span class="muted">—</span>')) + picker + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
    box.innerHTML =
      // 1) 쉬프트 배정 (위)
      '<div class="card">' +
        '<h3>쉬프트 배정 <span class="muted" style="font-weight:400;font-size:var(--fs-1)">— 오전 05–10 · 오후 11–15 · 저녁 16–21</span></h3>' + cal +
        (admin ? '' : '<p class="muted" style="margin-top:10px">배정 편집은 로그인 후 가능합니다.</p>') +
      '</div>' +
      // 2) 운영요원 정보 (아래) — 이름은 담당 배정(조직표)이 원본, 전화만 여기서
      '<div class="card" style="margin-top:14px">' +
        '<h3>운영요원 정보' + (admin ? ' <span class="muted" style="font-weight:400;font-size:var(--fs-1)">— 이름은 담당 배정에서, 전화는 여기서</span>' : ' <span class="muted" style="font-weight:400;font-size:var(--fs-1)">— 전화 전체는 관리자만 (평소 끝 4자리)</span>') + '</h3>' +
        '<div class="staff-roster' + (admin ? ' editing' : '') + '">' + roster + '</div>' + phoneSave +
      '</div>';
  }
  // 전화 레지스트리 저장(이름→전화, 빈 값은 제외). 이름은 조직표가 원본이라 여기서 추가/삭제하지 않는다.
  function savePhones() {
    if (!staffData) return;
    /* ⚠️ 마스킹된 명단(끝 4자리)을 들고 저장하면 **전원의 번호가 4자리로 잘린다**.
       화면 입력칸은 phoneMap() 값으로 채워지는데, 비관리자 응답이면 그게 끝 4자리다.
       재조회가 아직 안 끝났거나 실패한 상태에서 누르면 그대로 저장돼 원본이 사라진다 → 막는다. */
    if (!staffAdminData) {
      toast('연락처를 아직 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요');
      loadStaff().then(renderStaffView);
      return;
    }
    var reg = [];
    [].forEach.call(document.querySelectorAll('[data-phone]'), function (el) {
      var name = el.getAttribute('data-phone'), ph = (el.value || '').replace(/[^0-9]/g, '');
      if (ph) reg.push({ id: name, name: name, phone: ph });
    });
    staffData.staff = reg; saveStaff();
  }
  function assignShift(d, k, name) { if (!staffData.shifts[d]) staffData.shifts[d] = {}; var a = staffData.shifts[d][k] = staffData.shifts[d][k] || []; if (a.indexOf(name) < 0) a.push(name); saveStaff(); }
  // 검색하면 후보(조직 로스터 이름)가 칩으로 바로 뜨고, 칩을 누르면 배정된다(드롭다운 아님).
  function fillShiftCands(input) {
    var parts = input.getAttribute('data-search').split('|'), d = parts[0], k = parts[1];
    var cont = input.parentNode.querySelector('.shift-cands'); if (!cont) return;
    var q = (input.value || '').trim().toLowerCase();
    if (!q) { cont.innerHTML = ''; return; }
    var assigned = ((staffData.shifts[d] || {})[k]) || [];
    var matches = rosterNames().filter(function (n) { return assigned.indexOf(n) < 0 && n.toLowerCase().indexOf(q) >= 0; }).slice(0, 8);
    cont.innerHTML = matches.length ? matches.map(function (n) { return '<button type="button" class="staffchip cand" data-cand="' + d + '|' + k + '|' + esc(n) + '">＋ ' + esc(n) + '</button>'; }).join('') : '<span class="muted" style="font-size:var(--fs-1)">일치하는 운영요원 없음</span>';
  }
  function unassignShift(d, k, name) { var a = (staffData.shifts[d] || {})[k]; if (a) { var i = a.indexOf(name); if (i >= 0) a.splice(i, 1); } saveStaff(); }

  /* 식사 메뉴 — 홍보부 보드와 같은 자료(/api/jp-meals) */
  var MENU_DAYS = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09'];
  var MENU_GROUPS = [['crew_n', '대원 일반식'], ['crew_s', '대원 특별식'], ['staff', '운영요원']];
  var menuData = null, menuGroup = 'staff';
  function loadMenu() {
    return fetch('/api/jp-meals').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.ok) { menuData = j.meals || {}; } return j; })
      .catch(function () { return null; });
  }
  // 급식 관리자 또는 홍보부 세션이면 메뉴를 인라인 편집할 수 있다(양방향, 같은 jp:meals).
  function canEditMenu() { return !!fncSession(); }   // 편집은 급식 관리자 로그인 시에만(로그아웃 시 불가)
  var MEAL_ROWS = [['b', '조식'], ['l', '중식'], ['d', '석식']];
  function renderMenu() {
    var box = $('menubox'); if (!box) return;
    if (!menuData) {
      box.innerHTML = '<p class="muted">메뉴를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>' +
        '<button class="btn sm" id="menu-retry">다시 불러오기</button>';
      return;
    }
    var seg = MENU_GROUPS.map(function (g) {
      return '<button type="button" class="btn sm' + (menuGroup === g[0] ? ' solid' : ' ghost') + '" data-mg="' + g[0] + '">' + esc(g[1]) + '</button>';
    }).join(' ');
    var days = menuData[menuGroup] || {};
    var any = MENU_DAYS.some(function (d) { var r = days[d] || {}; return (r.b || r.l || r.d); });
    var edit = canEditMenu();
    // 급식보드 한정: 행=조식/중식/석식, 열=날짜 (가시성 확대)
    var head = '<tr><th>구분</th>' + MENU_DAYS.map(function (d) {
      return '<th>' + (+d.slice(5, 7)) + '/' + (+d.slice(8, 10)) + '</th>';
    }).join('') + '</tr>';
    var body = MEAL_ROWS.map(function (mk) {
      return '<tr><th>' + mk[1] + '</th>' + MENU_DAYS.map(function (d) {
        var v = (days[d] || {})[mk[0]] || '';
        if (edit) return '<td class="mcell" contenteditable data-date="' + d + '" data-meal="' + mk[0] + '" title="눌러서 수정 · Enter로 확정">' + esc(v) + '</td>';
        return '<td>' + (esc(v) || '<span class="muted">—</span>') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    box.innerHTML = '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' + seg +
      (edit ? '<span class="chip info" style="margin-left:auto">관리자 · 셀을 눌러 수정 (홍보부에도 공유되니 확인)</span>' : '') + '</div>' +
      (any ? '' : '<p class="muted">아직 등록된 메뉴가 없습니다. ' + (edit ? '아래 표의 칸을 눌러 입력하면' : '급식 관리자가 입력하면') + ' 홍보부 보드에도 함께 공유됩니다.</p>') +
      '<div class="tblwrap"><table class="tbl menutbl' + (edit ? ' editable' : '') + '"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      (menuGroup === 'staff' ? '<p class="muted" style="margin-top:10px">조식 고정메뉴: 그린샐러드&amp;드레싱 · 식빵&amp;모닝빵&amp;딸기잼 · 우유(흰·딸기·초코) / 중식·석식: 제철과일 제공</p>' : '');
    if (edit) {
      box.querySelectorAll('.mcell').forEach(function (td) {
        td.addEventListener('blur', function () { saveMenuCell(this); });
        td.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); this.blur(); } });
      });
    }
  }
  function saveMenuCell(td) {
    var date = td.getAttribute('data-date'), meal = td.getAttribute('data-meal');
    var value = (td.textContent || '').trim();
    var prev = (((menuData[menuGroup] || {})[date] || {})[meal]) || '';
    if (value === prev) return;   // 변경 없으면 저장 안 함
    var grp = menuGroup;
    fetch('/api/jp-meals', { method: 'PUT', headers: Object.assign({ 'content-type': 'application/json' }, writeHeader()), body: JSON.stringify({ group: grp, date: date, meal: meal, value: value }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.ok) { menuData = j.meals || menuData; toast('메뉴 저장됨'); }
        else { toast('저장 실패 — 관리자 로그인을 확인하세요'); renderMenu(); }
      }).catch(function () { toast('저장 실패'); renderMenu(); });
  }

  /* ── 담당 배정 ─────────────────────────────────────────────── */
  function peopleList() {
    var out = [];
    ORG.depts.forEach(function (d) {
      if (d.chief) out.push(d.chief);
      (d.teams || []).forEach(function (t) {
        if (t.lead) out.push(t.lead);
        (t.members || []).forEach(function (m) { if (m && m !== '충원예정') out.push(m); });
      });
    });
    out.unshift(ORG.head);
    var seen = {}, uniq = [];
    out.forEach(function (n) { if (!seen[n]) { seen[n] = 1; uniq.push(n); } });
    return uniq;
  }
  function loadOrg() {
    return fetch('/api/jp-fnc-org').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.ok) {
          if (j.org && j.org.depts && j.org.depts.length) ORG = j.org;   // 서버 값이 있으면 시드 대신 그것을 쓴다
          orgMeta = { updatedAt: j.updatedAt || null, by: j.by || '' };
          orgLoaded = true; orgFail = false;
        } else { orgFail = true; }
        return j;
      })
      .catch(function () { orgFail = true; return null; });
  }
  function orgPeopleCount() {
    return peopleList().filter(function (n) { return n && n !== '충원예정'; }).length;
  }
  function renderDuty() {
    var box = $('dutybox'); if (!box) return;
    if (orgFail && !orgLoaded) {
      box.innerHTML = '<div class="card"><p class="muted">조직표를 불러오지 못했습니다.</p>' +
        '<button class="btn sm" id="duty-retry">다시 불러오기</button></div>';
      return;
    }
    var can = canAssign();
    var rows = '';
    ORG.depts.forEach(function (d, di) {
      var teams = (d.teams && d.teams.length) ? d.teams : [{ name: '', lead: '', members: [] }];
      teams.forEach(function (t, ti) {
        rows += '<tr>';
        if (ti === 0) {
          if (orgEdit) {
            rows += '<td rowspan="' + teams.length + '" class="org-dept"><input class="dfield" maxlength="60" data-org="d~' + di + '~name" value="' + esc(d.name) + '" placeholder="부서명">' +
              '<input class="dfield sm" maxlength="60" data-org="d~' + di + '~chief" value="' + esc(d.chief || '') + '" placeholder="부장"></td>';
          } else {
            rows += '<td rowspan="' + teams.length + '" class="org-dept"><b>' + esc(d.name) + '</b>' + (d.chief ? '<span class="who">부장 ' + esc(d.chief) + '</span>' : '') + '</td>';
          }
        }
        if (orgEdit) {
          rows += '<td class="org-team"><input class="dfield" maxlength="60" data-org="t~' + di + '~' + ti + '~name" value="' + esc(t.name) + '" placeholder="팀명">' +
            '<input class="dfield sm" maxlength="60" data-org="t~' + di + '~' + ti + '~lead" value="' + esc(t.lead || '') + '" placeholder="팀장"></td>' +
            '<td><textarea class="dfield ta" rows="3" data-org="m~' + di + '~' + ti + '" placeholder="팀원 (쉼표 또는 줄바꿈으로 구분)">' + esc((t.members || []).join(', ')) + '</textarea></td>';
        } else {
          var mem = (t.members || []).map(function (m) { return m === '충원예정' ? '<span class="muted">충원예정</span>' : esc(m); }).join(' · ');
          rows += '<td class="org-team"><b>' + esc(t.name) + '</b>' + (t.lead ? '<span class="who">팀장 ' + esc(t.lead) + '</span>' : '') + '</td>' +
            '<td>' + (mem || '<span class="muted">—</span>') + '</td>';
        }
        rows += '</tr>';
      });
    });
    var headline = orgEdit
      ? '<span class="chip">본부장 <input class="dfield sm inline" maxlength="60" data-org="head" value="' + esc(ORG.head || '') + '" placeholder="본부장" style="width:8em;margin-left:6px"></span>'
      : '<span class="chip ok">본부장 ' + esc(ORG.head) + '</span><span class="chip">인원 ' + orgPeopleCount() + '명</span>';
    var tools = can
      ? (orgEdit
          ? '<button class="btn sm solid" id="duty-save">저장</button> <button class="btn sm ghost" id="duty-cancel">취소</button>'
          : '<button class="btn sm" id="duty-edit">조직 편집</button> <button class="btn sm ghost" id="duty-undo" aria-expanded="' + (orgSnapOpen ? 'true' : 'false') + '">되돌리기</button>')
      : '<span class="muted" style="font-size:var(--fs-1)">부서·팀·인원은 관리자만 편집할 수 있습니다. </span><button type="button" class="btn sm" data-open-login>급식 관리자로 로그인</button>';
    box.innerHTML = '<div class="card">' +
      '<div class="dutybar">' + headline +
        (orgMeta.updatedAt ? '<span class="muted" style="font-size:var(--fs-1)">마지막 수정 ' + esc(fmtWhen(orgMeta.updatedAt)) + (orgMeta.by ? ' · ' + esc(orgMeta.by) : '') + '</span>' : '') +
        '<span class="spacer"></span>' + tools + '</div>' +
      '<div class="tblwrap"><table class="tbl dutytbl orgtbl"><thead><tr><th>부서 · 부장</th><th>팀 · 팀장</th><th>팀원</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></div>' + orgSnapPanel();
  }
  function fmtWhen(iso) {
    try { var d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
    catch (e) { return ''; }
  }
  // 편집 화면의 입력들을 모아 ORG 구조를 다시 만든다(인덱스 기준 — 편집 중 구조는 그대로라 안전).
  function collectOrg() {
    var head = ORG.head, depts = ORG.depts.map(function (d) {
      return { name: d.name, chief: d.chief || '', teams: (d.teams && d.teams.length ? d.teams : []).map(function (t) { return { name: t.name, lead: t.lead || '', members: (t.members || []).slice() }; }) };
    });
    var he = document.querySelector('[data-org="head"]'); if (he) head = he.value;
    [].forEach.call(document.querySelectorAll('[data-org]'), function (el) {
      var p = el.getAttribute('data-org').split('~');
      if (p[0] === 'd') { if (depts[p[1]]) depts[p[1]][p[2]] = el.value; }
      else if (p[0] === 't') { if (depts[p[1]] && depts[p[1]].teams[p[2]]) depts[p[1]].teams[p[2]][p[3]] = el.value; }
      else if (p[0] === 'm') { if (depts[p[1]] && depts[p[1]].teams[p[2]]) depts[p[1]].teams[p[2]].members = String(el.value || '').split(/[,\n]/).map(function (s) { return s.trim(); }).filter(Boolean); }
    });
    return { head: head, depts: depts };
  }
  /* ── 조직표 되돌리기 ────────────────────────────────────────
     서버는 덮어쓰기 직전 상태를 최근 10개(30일) 보관한다. 목록에서 한 시점을 고르면 그 상태로
     복구하고, **복구 직전 상태도 다시 스냅샷으로 남는다** — 되돌리기를 되돌릴 수 있어야 한다. */
  function toggleOrgSnaps() {
    orgSnapOpen = !orgSnapOpen;
    if (!orgSnapOpen) { renderDuty(); return; }
    fetch('/api/jp-fnc-org?snapshots=1', { headers: staffHeader() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { orgSnaps = (j && j.ok) ? (j.snapshots || []) : []; renderDuty(); })
      .catch(function () { orgSnaps = []; renderDuty(); });
  }
  function restoreOrg(at) {
    if (!window.confirm('이 시점의 조직표로 되돌립니다.\n지금 내용은 다시 되돌릴 수 있게 보관됩니다.\n\n진행할까요?')) return;
    fetch('/api/jp-fnc-org', { method: 'PUT', headers: Object.assign({ 'content-type': 'application/json' }, staffHeader()),
      body: JSON.stringify({ restore: at }) })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (res) {
        if (res.j && res.j.ok) {
          ORG = res.j.org; orgMeta = { updatedAt: res.j.updatedAt, by: res.j.by };
          orgSnapOpen = false; orgSnaps = null; orgEdit = false;
          renderDuty(); if (staffData) renderStaffView();
          toast('조직표를 되돌렸습니다');
          return;
        }
        toast(res.s === 401 ? '관리자 세션이 만료됐습니다' : '되돌리지 못했습니다');
      })
      .catch(function () { toast('네트워크 오류'); });
  }
  function orgSnapPanel() {
    if (!orgSnapOpen) return '';
    if (orgSnaps === null) return '<div class="card" style="margin-top:12px"><p class="muted">불러오는 중…</p></div>';
    if (!orgSnaps.length) {
      return '<div class="card" style="margin-top:12px"><p class="muted">보관된 이전 상태가 없습니다. ' +
        '조직표를 저장하면 그 직전 상태가 여기에 최대 10개(30일) 쌓입니다.</p></div>';
    }
    return '<div class="card" style="margin-top:12px"><h3>이전 상태로 되돌리기</h3>' +
      '<p class="muted" style="font-size:var(--fs-1)">저장 직전 상태를 최근 10개까지 보관합니다. 되돌려도 지금 내용은 다시 보관되니 안전합니다.</p>' +
      '<div class="snaplist">' + orgSnaps.map(function (s) {
        return '<div class="snaprow"><span class="nm">' + esc(fmtWhen(s.at)) + '</span>' +
          '<span class="muted">인원 ' + (s.count || 0) + '명' + (s.by ? ' · ' + esc(s.by) : '') + '</span>' +
          '<button type="button" class="btn sm" data-restore="' + esc(s.at) + '">이 시점으로</button></div>';
      }).join('') + '</div></div>';
  }
  function saveDuty(confirmShrink) {
    if (!orgLoaded && orgFail) { toast('조직표를 아직 불러오지 못했습니다. 새로고침해 주세요.'); return; }
    var next = collectOrg();
    var btn = $('duty-save'); if (btn) { btn.disabled = true; btn.textContent = '저장 중…'; }
    var reset = function () { if (btn) { btn.disabled = false; btn.textContent = '저장'; } };
    fetch('/api/jp-fnc-org', { method: 'PUT', headers: Object.assign({ 'content-type': 'application/json' }, staffHeader()),
      body: JSON.stringify({ org: next, baseVer: (orgMeta && orgMeta.updatedAt) || '', confirmShrink: confirmShrink === true }) })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (res) {
        if (res.s === 401) { toast('관리자 세션이 만료됐습니다. 다시 로그인해 주세요.'); reset(); return; }
        if (res.s === 409 && res.j && res.j.error === 'conflict') {
          if (res.j.org) ORG = res.j.org; orgMeta = { updatedAt: res.j.updatedAt, by: res.j.by };
          orgEdit = false; renderDuty(); reset();
          toast((res.j.by ? res.j.by + '님이' : '다른 사람이') + ' 먼저 저장했습니다. 최신 조직표를 불러왔습니다 — 다시 확인해 주세요.');
          return;
        }
        if (res.s === 409 && res.j && res.j.error === 'empty_guard') { reset(); toast(res.j.message || '빈 조직표는 저장하지 않았습니다.'); return; }
        /* 부분 전멸 — 부서가 남아 있어도 팀·팀원이 대량으로 사라지는 저장은 여기서 멈춘다.
           서버는 아직 아무것도 지우지 않았다. 사람이 확인해야 통과한다. */
        if (res.s === 409 && res.j && res.j.error === 'shrink_guard') {
          reset();
          if (window.confirm('조직표 인원이 ' + res.j.had + '명에서 ' + res.j.now + '명으로 줄어듭니다.\n의도한 정리가 맞습니까?\n\n[취소] 하면 아무것도 바뀌지 않습니다.')) { saveDuty(true); return; }
          orgEdit = false; loadOrg().then(renderDuty);
          toast('저장하지 않았습니다');
          return;
        }
        if (res.j && res.j.ok) {
          if (res.j.org) ORG = res.j.org; orgMeta = { updatedAt: res.j.updatedAt, by: res.j.by };
          orgEdit = false; renderDuty();
          if (staffData) renderStaffView();   // 인원이 바뀌면 운영요원 근무 후보도 갱신
          toast('조직표를 저장했습니다');
          return;
        }
        reset(); toast('저장하지 못했습니다.');
      })
      .catch(function () { toast('네트워크 오류'); reset(); });
  }

  /* ── 검색 ──────────────────────────────────────────────────── */
  var INDEX = null;
  function buildIndex() {
    if (INDEX) return INDEX;
    INDEX = [];
    VIEWS.forEach(function (v) {
      var host = document.createElement('div');
      host.innerHTML = RENDER[v.id]();
      host.querySelectorAll('.sec').forEach(function (sec) {
        var h = sec.querySelector('.sec-h');
        var title = h ? h.textContent.replace(/원문.*$/, '').trim() : v.label;
        var text = (sec.textContent || '').replace(/\s+/g, ' ').trim();
        INDEX.push({ view: v.id, viewLabel: v.label, title: title, text: text });
      });
    });
    return INDEX;
  }
  function runSearch(q) {
    var box = $('searchres'); if (!box) return;
    q = (q || '').trim();
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    var hits = buildIndex().filter(function (r) {
      return (r.title + ' ' + r.text).toLowerCase().indexOf(q.toLowerCase()) >= 0;
    }).slice(0, 12);
    box.hidden = false;
    if (!hits.length) { box.innerHTML = '<div class="card"><p class="muted">「' + esc(q) + '」에 해당하는 내용이 없습니다.</p></div>'; return; }
    box.innerHTML = hits.map(function (r) {
      var i = r.text.toLowerCase().indexOf(q.toLowerCase());
      var from = Math.max(0, i - 30), snip = r.text.slice(from, from + 110);
      var marked = esc(snip).replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), function (m) { return '<mark>' + m + '</mark>'; });
      return '<button type="button" class="sr" data-go="' + esc(r.view) + '">' +
        '<b>' + esc(r.title) + '</b><span>' + esc(r.viewLabel) + ' · …' + marked + '…</span></button>';
    }).join('');
  }

  /* ── 화면 전환 ─────────────────────────────────────────────── */
  var cur = null;
  function setView(id, push) {
    if (!RENDER[id]) id = 'home';
    cur = id;
    var host = $('views');
    host.innerHTML = '<div class="view on" id="view-' + id + '">' + RENDER[id]() + '</div>';
    $('view-title').textContent = (VIEWS.filter(function (v) { return v.id === id; })[0] || {}).label || '';
    document.title = ((VIEWS.filter(function (v) { return v.id === id; })[0] || {}).label || '') + ' — 급식편의본부 · 제16회 한국잼버리';
    [].forEach.call(document.querySelectorAll('[data-nav]'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-nav') === id);
    });
    if (id === 'home') { renderHero(); renderMealNow(); renderToday(); renderDutyNow(); if (!staffData) loadStaff().then(renderDutyNow); }
    if (id === 'food') renderMealTable();
    if (id === 'sched') renderDays();
    if (id === 'menu') { renderMenu(); if (!menuData) loadMenu().then(renderMenu); }
    if (id === 'duty') { renderDuty(); if (!orgLoaded) loadOrg().then(renderDuty); }
    if (id === 'staff') { renderStaffView(); if (!orgLoaded) loadOrg().then(renderStaffView); loadStaff().then(renderStaffView); }
    applyContent($('view-' + id));   // 핵심 안내 문구 override 적용(+관리자면 인라인 편집)
    if (push !== false && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    closeSide();
    window.scrollTo(0, 0);
  }

  function openSide() { $('side').classList.add('open'); $('sidemask').hidden = false; $('btn-menu').setAttribute('aria-expanded', 'true'); }
  function closeSide() { $('side').classList.remove('open'); $('sidemask').hidden = true; $('btn-menu').setAttribute('aria-expanded', 'false'); }

  /* ── 초기화 ────────────────────────────────────────────────── */
  function buildNav() {
    var grp = null, out = '';
    VIEWS.forEach(function (v) {
      if (v.grp !== grp) { grp = v.grp; if (grp) out += '<div class="sidegrp">' + esc(grp) + '</div>'; }
      out += '<button type="button" class="navitem" data-nav="' + v.id + '"><span class="ni-ic">' + svgIcon(v.ic) + '</span>' + esc(v.label) + '</button>';
    });
    $('sidenav').innerHTML = out;
    $('tabbar').innerHTML = TABS.map(function (id) {
      var v = VIEWS.filter(function (x) { return x.id === id; })[0];
      return '<button type="button" class="tabbtn" data-nav="' + id + '" aria-label="' + esc(v.label) + '"><span>' + svgIcon(v.ic) + '</span>' + esc(v.short || v.label) + '</button>';
    }).join('');
  }

  var lastAdmin = null;
  function tick() {
    // 30분 만료 등으로 관리자 상태가 바뀌면 버튼·화면을 다시 그려 편집 권한을 회수한다.
    var a = !!fncSession();
    if (lastAdmin !== null && a !== lastAdmin) { renderAdminBtn(); setView(cur || 'home', false); if (!a) toast('세션이 만료되어 로그아웃되었습니다'); }
    lastAdmin = a;
    if (cur === 'home') { renderHero(); renderMealNow(); renderDutyNow(); }
    if (cur === 'food') renderMealTable();
    var n = new Date();
    var t = $('topnow'); if (t) t.textContent = pad2(n.getHours()) + ':' + pad2(n.getMinutes());
  }

  function init() {
    buildNav();
    renderAdminBtn();
    document.addEventListener('click', function (e) {
      if (e.target.closest('#fnc-admin-btn')) { if (fncSession()) { if (confirm('로그아웃할까요?')) logoutAdmin(); } else openLogin(); return; }
      if (e.target.closest('[data-open-login]')) { openLogin(); return; }
      var sc = e.target.closest('[data-scroll]'); if (sc) { e.preventDefault(); var st = document.getElementById(sc.getAttribute('data-scroll')); if (st) st.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (e.target.closest('#fl-cancel')) { closeLogin(); return; }
      if (e.target.closest('#fl-go')) { submitLogin(); return; }
      if (e.target.id === 'fnc-login') { closeLogin(); return; }
      var nav = e.target.closest('[data-nav]'); if (nav) { setView(nav.getAttribute('data-nav')); return; }
      var go = e.target.closest('[data-go]'); if (go) { setView(go.getAttribute('data-go')); $('search').value = ''; runSearch(''); $('search-x').hidden = true; return; }
      var mg = e.target.closest('[data-mg]'); if (mg) { menuGroup = mg.getAttribute('data-mg'); renderMenu(); return; }
      if (e.target.closest('#menu-retry')) { loadMenu().then(renderMenu); return; }
      if (e.target.closest('#duty-retry')) { loadOrg().then(renderDuty); return; }
      if (e.target.closest('#staff-retry')) { loadStaff().then(renderStaffView); return; }
      if (e.target.closest('#staff-phones-save')) { savePhones(); return; }
      var un = e.target.closest('[data-unassign]'); if (un) { var pp = un.getAttribute('data-unassign').split('|'); unassignShift(pp[0], pp[1], pp[2]); return; }
      var cand = e.target.closest('[data-cand]'); if (cand) { var cp = cand.getAttribute('data-cand').split('|'); assignShift(cp[0], cp[1], cp[2]); return; }
      if (e.target.closest('#duty-edit')) { orgEdit = true; renderDuty(); return; }
      if (e.target.closest('#duty-cancel')) { orgEdit = false; loadOrg().then(renderDuty); return; }
      if (e.target.closest('#duty-save')) { saveDuty(); return; }
      if (e.target.closest('#duty-undo')) { toggleOrgSnaps(); return; }
      var rs = e.target.closest('[data-restore]'); if (rs) { restoreOrg(rs.getAttribute('data-restore')); return; }
      var f = e.target.closest('[data-fig]'); if (f) { openLb(+f.getAttribute('data-fig')); return; }
      if (e.target.closest('#lb-x')) { closeLb(); return; }
      if (e.target.closest('#lb-prev')) { stepLb(-1); return; }
      if (e.target.closest('#lb-next')) { stepLb(1); return; }
      if (e.target.id === 'lightbox') { closeLb(); return; }
      if (e.target.closest('#btn-menu')) { $('side').classList.contains('open') ? closeSide() : openSide(); return; }
      if (e.target.closest('#sidemask')) { closeSide(); return; }
      if (e.target.closest('#search-x')) { $('search').value = ''; runSearch(''); $('search-x').hidden = true; $('search').focus(); return; }
    });
    $('search').addEventListener('input', function () {
      $('search-x').hidden = !this.value;
      runSearch(this.value);
    });
    window.addEventListener('hashchange', function () { setView((location.hash || '').replace('#', ''), false); });
    ['fl-id', 'fl-pw'].forEach(function (id) { var el = $(id); if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submitLogin(); } }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('fnc-login').hidden) { closeLogin(); return; }
      if (e.key === 'Escape' && lbPage !== null) { closeLb(); return; }
      if (lbPage !== null && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { stepLb(e.key === 'ArrowLeft' ? -1 : 1); return; }
      if (e.key === 'Escape') { closeSide(); if ($('search').value) { $('search').value = ''; runSearch(''); $('search-x').hidden = true; } }
      if (e.key === '/' && document.activeElement !== $('search')) { e.preventDefault(); $('search').focus(); }
    });
    setView((location.hash || '').replace('#', '') || 'home', false);
    tick(); setInterval(tick, 1000);
    document.addEventListener('input', function (e) {
      var ss = e.target.closest('[data-search]'); if (ss) fillShiftCands(ss);
    });
    loadMenu().then(function () { if (cur === 'menu') renderMenu(); });
    loadOrg().then(function () { if (cur === 'duty') renderDuty(); });
    loadStaff().then(function () { if (cur === 'home') renderDutyNow(); if (cur === 'staff') renderStaffView(); });
    loadWeather();
    loadContent().then(function () { applyContent($('view-' + cur)); });
    try { window.__fncBoard = { setView: setView, VIEWS: VIEWS, ver: VER, isAdmin: isAdmin, fncSession: fncSession, renderAdminBtn: renderAdminBtn, loadStaff: loadStaff, currentShift: currentShift,
      loadOrg: loadOrg, peopleList: peopleList, getOrg: function () { return ORG; },
      // 회귀가 '다른 사람이 먼저 저장한 상황'을 만들 수 있게 열어 둔다(화면에서는 쓰지 않는다)
      setOrgVer: function (v) { orgMeta = { updatedAt: v, by: (orgMeta && orgMeta.by) || '' }; } }; } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
