/* 운영 대시보드(/admin) — TOTP 잠금 + 회귀 실시간 · 유입 · 라우팅 · 콘텐츠 · 배포 (v0.9.258)
 *
 * 이 페이지의 존재 이유는 **회귀가 지금 어디까지 갔는지 실시간으로 보는 것**이다(사용자 지정).
 * 그래서 '개요' 맨 위가 회귀 진행이고, 5초마다 스스로 갱신한다.
 * ⚠️ 인증은 기존 관리자 TOTP. 토큰은 sessionStorage 에만(탭 닫으면 잠김 — 공용 PC 대비).
 * ⚠️ 회귀는 작업자 컴퓨터에서 돌고, scripts/push-run-status.js 가 진행을 올린다.
 *    올라오지 않으면 화면이 "연결 안 됨"이라고 말한다 — 조용히 옛 값을 보여 주지 않는다.
 */
(function () {
  'use strict';

  var SS = 'scoutingapp:admin';
  var $ = function (id) { return document.getElementById(id); };
  var days = 14;
  var stats = null, run = null, content = null, view = 'home';
  var timer = null;

  var VIEWS = [
    { id: 'home',    label: '개요',        ic: '◎', grp: '' },
    { id: 'run',     label: '회귀 · 검증',  ic: '✓', grp: '품질' },
    { id: 'deploy',  label: '배포 상태',    ic: '▲', grp: '품질' },
    { id: 'traffic', label: '유입 현황',    ic: '▤', grp: '운영' },
    { id: 'routes',  label: '라우팅 점검',  ic: '⇄', grp: '운영' },
    { id: 'content', label: '콘텐츠 현황',  ic: '▣', grp: '운영' },
    { id: 'links',   label: '서비스 바로가기', ic: '↗', grp: '운영' },
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function nf(n) { return String(n == null ? '—' : n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function token() { try { return sessionStorage.getItem(SS) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { t ? sessionStorage.setItem(SS, t) : sessionStorage.removeItem(SS); } catch (e) {} }
  function auth() { var t = token(); return t ? { Authorization: 'Bearer ' + t } : {}; }
  function shortDay(d) { return (+d.slice(5, 7)) + '/' + (+d.slice(8, 10)); }
  function when(iso) {
    try { var d = new Date(iso);
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    } catch (e) { return String(iso || ''); }
  }
  function ago(iso) {
    try { var s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
      if (s < 60) return s + '초 전';
      if (s < 3600) return Math.round(s / 60) + '분 전';
      return Math.round(s / 3600) + '시간 전';
    } catch (e) { return ''; }
  }

  /* ── 잠금 ── */
  function showGate(msg) {
    $('gate').hidden = false; $('shell').hidden = true;
    $('gate-msg').textContent = msg || '';
    if (timer) { clearInterval(timer); timer = null; }
    if (secTimer) { clearInterval(secTimer); secTimer = null; }
    setTimeout(function () { $('code').focus(); }, 30);
  }
  function showBoard() {
    $('gate').hidden = true; $('shell').hidden = false;
    buildNav(); setView(location.hash.replace('#', '') || 'home');
    loadAll();
    schedule();
  }

  $('gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = ($('code').value || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) { $('gate-msg').textContent = '6자리를 입력하세요.'; return; }
    $('gate-go').disabled = true; $('gate-msg').textContent = '확인 중…';
    fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code }) })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (x) {
        $('gate-go').disabled = false;
        if (x.j && x.j.ok && x.j.token) { setToken(x.j.token); $('code').value = ''; showBoard(); return; }
        $('gate-msg').textContent = x.s === 429 ? '시도가 너무 많습니다. 잠시 뒤 다시 해 주세요.'
          : x.s === 503 ? '서버에 인증이 설정돼 있지 않습니다.' : '코드가 맞지 않습니다.';
      })
      .catch(function () { $('gate-go').disabled = false; $('gate-msg').textContent = '네트워크 오류'; });
  });

  /* ── 내비 ── */
  function buildNav() {
    var grp = null, out = '';
    VIEWS.forEach(function (v) {
      if (v.grp !== grp) { grp = v.grp; if (grp) out += '<div class="sidegrp">' + esc(grp) + '</div>'; }
      out += '<button type="button" class="navitem" data-nav="' + v.id + '"><span class="ni-ic">' + v.ic + '</span>' + esc(v.label) + '</button>';
    });
    $('sidenav').innerHTML = out;
  }
  function setView(id) {
    if (!VIEWS.some(function (v) { return v.id === id; })) id = 'home';
    view = id;
    var v = VIEWS.filter(function (x) { return x.id === id; })[0];
    $('view-title').textContent = v.label;
    [].forEach.call(document.querySelectorAll('[data-nav]'), function (b) { b.classList.toggle('on', b.getAttribute('data-nav') === id); });
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    render();
    closeSide();
    window.scrollTo(0, 0);
  }
  function openSide() { $('side').classList.add('open'); $('sidemask').hidden = false; }
  function closeSide() { $('side').classList.remove('open'); $('sidemask').hidden = true; }

  document.addEventListener('click', function (e) {
    var n = e.target.closest('[data-nav]'); if (n) { setView(n.getAttribute('data-nav')); return; }
    var g = e.target.closest('[data-go]'); if (g) { setView(g.getAttribute('data-go')); return; }
    if (e.target.closest('#logout')) { setToken(''); showGate('잠갔습니다.'); return; }
    if (e.target.closest('#reload')) { loadAll(); return; }
    if (e.target.closest('#btn-menu')) { $('side').classList.contains('open') ? closeSide() : openSide(); return; }
    if (e.target.closest('#sidemask')) { closeSide(); return; }
    var d = e.target.closest('[data-days]');
    if (d) {
      days = +d.getAttribute('data-days');
      [].forEach.call($('rangeseg').querySelectorAll('button'), function (x) { x.classList.toggle('on', x === d); });
      loadStats();
    }
  });
  window.addEventListener('hashchange', function () { setView(location.hash.replace('#', '')); });

  /* ── 데이터 ── */
  function unauth() { setToken(''); showGate('인증이 만료됐습니다. 다시 입력해 주세요.'); }
  function loadStats() {
    return fetch('/api/admin-stats?days=' + days, { headers: auth() })
      .then(function (r) { if (r.status === 401) { unauth(); return null; } return r.json(); })
      .then(function (j) { if (j && j.ok) { stats = j; render(); } }).catch(function () {});
  }
  function loadRun() {
    return fetch('/api/run-status', { headers: auth() })
      .then(function (r) { if (r.status === 401) { unauth(); return null; } return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) return;
        var was = isLive();
        run = j; render();
        if (was !== isLive()) schedule();     // 시작/끝나면 주기를 바꾼다
      }).catch(function () {});
  }
  function loadContent() {
    return fetch('/api/admin-content', { headers: auth() })
      .then(function (r) { if (r.status === 401) { unauth(); return null; } return r.json(); })
      .then(function (j) { if (j && j.ok) { content = j; render(); } }).catch(function () {});
  }
  function loadAll() { loadRun(); loadStats(); loadContent(); }
  /* 진행 중이면 3초, 아니면 15초마다 확인한다 — 돌고 있을 때만 자주 묻는다.
     '몇 초 전'은 매초 갱신하되 화면 전체를 다시 그리지 않는다(깜빡임 방지). */
  var secTimer = null;
  function schedule() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () { loadRun(); }, isLive() ? 3000 : 15000);
    if (!secTimer) secTimer = setInterval(freshen, 1000);
  }
  function freshen() {
    [].forEach.call(document.querySelectorAll('[data-since]'), function (el) {
      el.textContent = ago(el.getAttribute('data-since'));
    });
    var st = runState();
    var lc = $('livechip');
    if (lc) { lc.textContent = st.kind === 'running' ? '● 실시간' : (st.kind === 'stale' ? '● 끊김' : '○ 대기'); lc.className = 'livechip ' + st.kind; }
  }

  /* ── 회귀 진행 ── 이 페이지의 본체 */
  function runState() {
    if (!run) return { kind: 'loading', text: '불러오는 중…' };
    if (!run.configured) return { kind: 'off', text: '연결 안 됨 — 서버에 RUN_TOKEN 이 없습니다' };
    if (!run.run) return { kind: 'none', text: '진행 중인 회귀 없음' };
    var r = run.run;
    var age = Date.now() - new Date(r.updatedAt).getTime();
    if (r.finishedAt) return { kind: r.ok ? 'done' : 'fail', text: r.ok ? '진행 중인 회귀 없음 · 마지막 실행 통과' : '진행 중인 회귀 없음 · 마지막 실행 실패' };
    if (age > (run.staleMs || 90000)) return { kind: 'stale', text: '끊김 — ' + ago(r.updatedAt) + '부터 갱신 없음' };
    return { kind: 'running', text: '진행 중' };
  }
  function isLive() { return runState().kind === 'running'; }
  function runBlock(compact) {
    var st = runState();
    var chip = { loading: '', idle: '', off: 'bad', stale: 'warn', running: 'ok', done: 'ok', fail: 'bad' }[st.kind] || '';
    if (!run || !run.run || st.kind === 'off') {
      return '<div class="card idlecard">' +
        '<div class="idlebig">' + (st.kind === 'off' ? '연결 안 됨' : '진행 중인 회귀 없음') + '</div>' +
        '<p class="muted">' + (st.kind === 'off'
          ? '서버에 RUN_TOKEN 이 설정돼 있지 않아 진행을 받을 수 없습니다.'
          : '회귀를 돌리면 여기에서 라운드가 실시간으로 채워집니다. 이 화면은 스스로 갱신하니 새로고침하지 않아도 됩니다.') +
        '</p></div>';
    }
    var r = run.run;
    var pct = r.total ? Math.round(r.done / r.total * 100) : 0;
    var rounds = '';
    for (var i = 1; i <= (r.roundTotal || 3); i++) {
      var doneRound = i <= r.rounds;
      var cur = !doneRound && i === r.rounds + 1 && !r.finishedAt;
      var perRound = Math.ceil((r.total || 0) / (r.roundTotal || 3));
      var inRound = Math.max(0, Math.min(perRound, r.done - (i - 1) * perRound));
      var rp = perRound ? Math.round(inRound / perRound * 100) : 0;
      rounds += '<div class="rnd' + (doneRound ? ' done' : (cur ? ' cur' : '')) + '">' +
        '<div class="rh"><b>' + i + '라운드</b><span>' + (doneRound ? '통과' : (cur ? inRound + '/' + perRound : '대기')) + '</span></div>' +
        '<div class="track"><i style="width:' + (doneRound ? 100 : (cur ? rp : 0)) + '%"></i></div></div>';
    }
    var idle = (st.kind === 'done' || st.kind === 'fail');
    var head = '<div class="runhead">' +
      (idle ? '<span class="idlebadge">진행 중 아님</span>' : '') +
      '<span class="chip ' + chip + '">' + esc(st.text) + '</span>' +
      '<b class="runpct">' + pct + '%</b>' +
      '<span class="muted">' + nf(r.done) + ' / ' + nf(r.total) + ' 검사' +
      (r.checks ? ' · 케이스 ' + nf(r.checks) : '') + '</span>' +
      '<span class="spacer"></span>' +
      (r.fails ? '<span class="chip bad">실패 ' + nf(r.fails) + '</span>' : '<span class="chip ok">실패 0</span>') +
      '<span class="muted"><span class="livedot' + (st.kind === 'running' ? ' on' : '') + '"></span>' +
      '<span data-since="' + esc(r.updatedAt) + '">' + esc(ago(r.updatedAt)) + '</span> 갱신</span></div>';
    var now = r.running ? '<p class="runnow">지금 도는 검사 <b class="mono">' + esc(r.running) + '</b></p>' : '';
    var list = (r.items || []).slice().reverse().slice(0, compact ? 6 : 20).map(function (x) {
      return '<tr><td>' + x.round + 'R</td><td class="mono">' + esc(x.name) + '</td>' +
        '<td class="num">' + (x.total ? nf(x.pass) + '/' + nf(x.total) : '—') + '</td>' +
        '<td>' + (x.ok ? '<span class="chip ok">통과</span>' : '<span class="chip bad">실패</span>') + '</td></tr>';
    }).join('');
    var fails = (r.failures || []).length
      ? '<h3 class="failh">실패 상세 ' + r.failures.length + '건</h3>' +
        '<div class="tblwrap"><table class="tbl"><thead><tr><th>라운드</th><th>검사 파일</th><th>실패한 케이스</th><th>왜</th></tr></thead><tbody>' +
        r.failures.map(function (f) {
          return '<tr class="failrow"><td>' + f.round + 'R</td><td class="mono">' + esc(f.file) + '</td>' +
            '<td>' + esc(f.check) + '</td><td class="detail">' + (f.detail ? esc(f.detail) : '<span class="muted">—</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
      : '';
    return '<div class="card">' + head + '<div class="rounds">' + rounds + '</div>' + now +
      '<div class="tblwrap"><table class="tbl"><thead><tr><th>라운드</th><th>검사</th><th class="num">결과</th><th>상태</th></tr></thead>' +
      '<tbody>' + list + '</tbody></table></div>' + fails + '</div>';
  }

  /* ── 화면 ── */
  function render() {
    var host = $('views'); if (!host || $('shell').hidden) return;
    var st = runState();
    $('livechip').textContent = st.kind === 'running' ? '● 실시간' : (st.kind === 'stale' ? '● 끊김' : '○ 대기');
    $('livechip').className = 'livechip ' + st.kind;
    $('rangeseg').style.display = (view === 'traffic' || view === 'home') ? '' : 'none';
    host.innerHTML =
      view === 'home' ? viewHome() :
      view === 'run' ? sec('회귀 · 검증', '작업자 컴퓨터에서 도는 회귀를 그대로 중계합니다. 5초마다 갱신됩니다.', runBlock(false)) :
      view === 'deploy' ? sec('배포 상태', '배포 시점에 기록된 값입니다.', deployBlock()) :
      view === 'traffic' ? sec('유입 현황', '각 화면이 몇 번 열렸는지(PV)입니다. 방문자 수가 아니고 개인정보는 저장하지 않습니다.', trafficBlock()) :
      view === 'routes' ? sec('라우팅 점검', '지금 이 브라우저에서 각 주소를 실제로 열어 응답을 확인합니다.', '<div class="card tblwrap"><table class="tbl" id="routetbl"></table></div>') :
      view === 'content' ? sec('콘텐츠 현황', '보드에 쌓인 자료의 개수입니다. 본문·개인정보는 가져오지 않습니다.', contentBlock()) :
      sec('서비스 바로가기', '운영 중인 화면들입니다.', linksBlock());
    if (view === 'routes') renderRoutes();
  }
  function sec(title, lead, body) {
    return '<section class="sec"><h2 class="sec-h">' + esc(title) + '</h2>' +
      (lead ? '<p class="lead">' + esc(lead) + '</p>' : '') + body + '</section>';
  }
  function viewHome() {
    return sec('회귀 진행', '이 대시보드의 본체입니다 — 5초마다 스스로 갱신합니다.', runBlock(true)) +
      sec('한눈에', '', summaryCards()) +
      sec('최근 유입', '', trafficMini());
  }
  function summaryCards() {
    var s = stats, r = run && run.run, c = content;
    var today = s ? (s.totals[s.totals.length - 1] || 0) : null;
    var ver = s && s.status ? s.status.version : null;
    var st = runState();
    return '<div class="cards">' +
      card('회귀', st.kind === 'running' ? (r && r.total ? Math.round(r.done / r.total * 100) + '%' : '진행 중') : (st.kind === 'done' ? '통과' : (st.kind === 'fail' ? '실패' : '대기')),
        r ? (nf(r.done) + '/' + nf(r.total) + ' 검사 · 실패 ' + nf(r.fails)) : '기록 없음', st.kind === 'fail' ? 'bad' : (st.kind === 'running' ? 'ok' : '')) +
      card('오늘 유입', today == null ? '—' : nf(today), '전체 화면 합계') +
      card('라이브 버전', ver ? 'v' + ver : '—', s && s.status ? when(s.status.deployedAt) + ' 배포' : '') +
      card('콘텐츠', c ? nf(c.counts.reduce(function (a, x) { return a + (x.n || 0); }, 0)) : '—',
        c ? c.counts.map(function (x) { return x.label + ' ' + nf(x.n); }).join(' · ') : '') +
      '</div>';
  }
  function card(k, v, s, tone) {
    return '<div class="sumcard' + (tone ? ' ' + tone : '') + '"><div class="k">' + esc(k) + '</div>' +
      '<div class="v">' + esc(v) + '</div><div class="s">' + esc(s || '') + '</div></div>';
  }
  function trafficMini() {
    if (!stats) return '<div class="card"><p class="muted">불러오는 중…</p></div>';
    var max = Math.max.apply(null, stats.totals.concat([1]));
    return '<div class="card"><div class="chart">' + stats.totals.map(function (v, i) {
      return '<div class="bar" title="' + esc(stats.days[i]) + ' · ' + nf(v) + '회"><b>' + nf(v) + '</b>' +
        '<i style="height:' + (Math.round(v / max * 120) + 2) + 'px"></i><span>' + esc(shortDay(stats.days[i])) + '</span></div>';
    }).join('') + '</div><p><button class="btn sm" data-go="traffic">유입 현황 자세히</button></p></div>';
  }
  function trafficBlock() {
    if (!stats) return '<div class="card"><p class="muted">불러오는 중…</p></div>';
    var total = stats.totals.reduce(function (a, b) { return a + b; }, 0);
    var today = stats.totals[stats.totals.length - 1] || 0;
    var yest = stats.totals[stats.totals.length - 2] || 0;
    var top = stats.routes[0] || { route: '—', total: 0 };
    var diff = today - yest;
    var cards = '<div class="cards">' +
      card('오늘', nf(today), diff === 0 ? '어제와 같음' : (diff > 0 ? '어제보다 +' + nf(diff) : '어제보다 ' + nf(diff))) +
      card(days + '일 합계', nf(total), '하루 평균 ' + nf(Math.round(total / stats.days.length))) +
      card('가장 많이 열린 화면', top.route, nf(top.total) + '회') +
      card('집계 라우트', String(stats.routes.length), '화이트리스트 기준') + '</div>';
    var head = '<thead><tr><th>화면</th><th class="num">' + days + '일 합계</th>' +
      stats.days.slice(-7).map(function (d) { return '<th class="num">' + esc(shortDay(d)) + '</th>'; }).join('') + '</tr></thead>';
    var body = stats.routes.map(function (r) {
      return '<tr><td><a href="' + esc(r.route) + '" target="_blank" rel="noopener">' + esc(r.route) + '</a></td>' +
        '<td class="num"><b>' + nf(r.total) + '</b></td>' +
        r.counts.slice(-7).map(function (v) { return '<td class="num">' + (v ? nf(v) : '<span class="muted">—</span>') + '</td>'; }).join('') + '</tr>';
    }).join('');
    return cards + trafficMini() + '<div class="card tblwrap"><table class="tbl">' + head + '<tbody>' + body + '</tbody></table></div>';
  }
  function contentBlock() {
    if (!content) return '<div class="card"><p class="muted">불러오는 중…</p></div>';
    var cards = '<div class="cards">' + content.counts.map(function (c) {
      return card(c.label, c.n == null ? '—' : nf(c.n), '');
    }).join('') + '</div>';
    var latest = (content.latest || []).length
      ? '<div class="card"><h3>최근 기사</h3><div class="tblwrap"><table class="tbl"><tbody>' +
        content.latest.map(function (a) {
          return '<tr><td>' + esc(a.title || '(제목 없음)') + '</td><td>' + esc(a.stage || '') + '</td><td class="num">' + esc(when(a.at)) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>'
      : '';
    return cards + latest;
  }
  function deployBlock() {
    var s = stats && stats.status;
    if (!s) return '<div class="card"><p class="muted">배포 기록(status.json)이 아직 없습니다.</p></div>';
    var v = s.verification;
    var rows = v ? v.rounds.map(function (r) {
      return '<tr><td>' + r.round + '라운드</td><td class="num">' + nf(r.checks) + '건</td>' +
        '<td>' + (r.fails ? '<span class="chip bad">실패 ' + r.fails + '</span>' : '<span class="chip ok">통과</span>') + '</td></tr>';
    }).join('') : '';
    return '<div class="card"><dl class="dl">' +
      '<dt>라이브 버전</dt><dd class="mono">v' + esc(s.version) + '</dd>' +
      '<dt>커밋</dt><dd class="mono">' + esc(s.commit) + ' — ' + esc(s.commitSubject || '') + '</dd>' +
      '<dt>배포 시각</dt><dd>' + esc(when(s.deployedAt)) + '</dd>' +
      (v ? '<dt>검증</dt><dd>' + (v.green ? '<span class="chip ok">' + v.rounds.length + '라운드 전부 통과</span>' : '<span class="chip bad">실패 있음</span>') +
        ' <span class="muted">· ' + esc(when(v.at)) + '</span></dd>' : '') +
      '</dl>' + (rows ? '<div class="tblwrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>라운드</th><th class="num">검사</th><th>결과</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '') + '</div>';
  }
  function linksBlock() {
    var L = [
      ['/', '도구 모음'], ['/tour', 'Scout Tour Assistant'], ['/tour/admin', '투어 관리자'],
      ['/krjam-planning', '홍보부 운영보드'], ['/krjam-fnc', '급식편의본부 안내'], ['/krjam-fnc-book', '급식편의본부 자료 원문'],
      ['/krjam-jebo', '공개 소식 제보'], ['/krjam-cardnews', '카드뉴스 제작기'], ['/krjam-dcount', '디데이'], ['/privacy', '개인정보 안내'],
    ];
    return '<div class="card tblwrap"><table class="tbl"><thead><tr><th>주소</th><th>이름</th><th class="num">' + days + '일 유입</th></tr></thead><tbody>' +
      L.map(function (x) {
        var hit = stats ? (stats.routes.filter(function (r) { return r.route === x[0]; })[0] || {}).total : null;
        return '<tr><td><a href="' + esc(x[0]) + '" target="_blank" rel="noopener">' + esc(x[0]) + '</a></td>' +
          '<td>' + esc(x[1]) + '</td><td class="num">' + (hit == null ? '—' : nf(hit)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ── 라우팅 점검 ── */
  var CHECK = ['/', '/tour', '/tour/admin', '/krjam-planning', '/krjam-fnc', '/krjam-fnc-book', '/krjam-jebo',
               '/krjam-cardnews', '/krjam-dcount', '/privacy', '/admin', '/status.json',
               '/api/jp-meals', '/api/jp-fnc', '/api/jp-noti', '/VERSION'];
  function renderRoutes() {
    var t = $('routetbl'); if (!t) return;
    t.innerHTML = '<thead><tr><th>주소</th><th>상태</th><th class="num">응답</th><th>비고</th></tr></thead><tbody>' +
      CHECK.map(function (u) {
        return '<tr data-u="' + esc(u) + '"><td><a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + '</a></td>' +
          '<td class="st">확인 중…</td><td class="num ms">—</td><td class="note"></td></tr>';
      }).join('') + '</tbody>';
    CHECK.forEach(function (u) {
      var t0 = performance.now();
      fetch(u, { method: 'GET', cache: 'no-store', headers: u.indexOf('/api/') === 0 ? auth() : {} })
        .then(function (r) { return { code: r.status, ms: Math.round(performance.now() - t0) }; })
        .catch(function () { return { code: 0, ms: Math.round(performance.now() - t0) }; })
        .then(function (x) {
          var tr = document.querySelector('[data-u="' + u + '"]'); if (!tr) return;
          var good = x.code >= 200 && x.code < 400;
          var prot = (x.code === 401);
          tr.querySelector('.st').innerHTML = good ? '<span class="chip ok">정상</span>'
            : (prot ? '<span class="chip ok">보호됨</span>' : '<span class="chip bad">확인 필요</span>');
          tr.querySelector('.ms').textContent = x.code + ' · ' + x.ms + 'ms';
          tr.querySelector('.note').textContent = prot ? '로그인 필요(정상)' : (x.code === 0 ? '응답 없음' : '');
        });
    });
  }

  /* ── 시작 ── */
  if (token()) {
    fetch('/api/me', { headers: auth() })
      .then(function (r) { if (r.ok) showBoard(); else { setToken(''); showGate(''); } })
      .catch(function () { showGate(''); });
  } else showGate('');

  try { window.__admin = { setView: setView, state: function () { return { run: run, stats: stats, content: content, view: view }; } }; } catch (e) {}
})();
