/* 운영 현황(/admin) — TOTP 잠금 + 유입·라우팅·배포 상태 (v0.9.257)
 *
 * ⚠️ 인증은 기존 관리자 TOTP 를 그대로 쓴다(비밀번호를 새로 만들지 않는다).
 *    토큰은 sessionStorage 에만 둔다 — 탭을 닫으면 사라진다(공용 PC 에서 열어 두는 화면이라서).
 * ⚠️ 유입 수치는 PV 이고 개인정보를 담지 않는다. 회귀 진행은 작업자 컴퓨터에서 도므로 여기 오지 않는다.
 */
(function () {
  'use strict';

  var SS = 'scoutingapp:admin';
  var $ = function (id) { return document.getElementById(id); };
  var days = 14, data = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function token() { try { return sessionStorage.getItem(SS) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { t ? sessionStorage.setItem(SS, t) : sessionStorage.removeItem(SS); } catch (e) {} }
  function auth() { var t = token(); return t ? { Authorization: 'Bearer ' + t } : {}; }
  function nf(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function shortDay(d) { return (+d.slice(5, 7)) + '/' + (+d.slice(8, 10)); }

  /* ── 잠금 ── */
  function showGate(msg) {
    $('gate').hidden = false; $('shell').hidden = true;
    $('gate-msg').textContent = msg || '';
    setTimeout(function () { $('code').focus(); }, 30);
  }
  function showBoard() { $('gate').hidden = true; $('shell').hidden = false; load(); }

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
        if (x.s === 429) { $('gate-msg').textContent = '시도가 너무 많습니다. 잠시 뒤 다시 해 주세요.'; return; }
        if (x.s === 503) { $('gate-msg').textContent = '서버에 인증이 설정돼 있지 않습니다.'; return; }
        $('gate-msg').textContent = '코드가 맞지 않습니다.';
      })
      .catch(function () { $('gate-go').disabled = false; $('gate-msg').textContent = '네트워크 오류'; });
  });
  $('logout').addEventListener('click', function () { setToken(''); showGate('잠갔습니다.'); });
  $('reload').addEventListener('click', function () { load(); });
  $('rangeseg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-days]'); if (!b) return;
    days = +b.getAttribute('data-days');
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
    load();
  });

  /* ── 데이터 ── */
  function load() {
    $('deploybox').textContent = '불러오는 중…';
    fetch('/api/admin-stats?days=' + days, { headers: auth() })
      .then(function (r) {
        if (r.status === 401) { setToken(''); showGate('인증이 만료됐습니다. 다시 입력해 주세요.'); return null; }
        return r.json();
      })
      .then(function (j) { if (!j || !j.ok) return; data = j; renderHits(); renderDeploy(); })
      .catch(function () { $('deploybox').textContent = '불러오지 못했습니다.'; });
    renderRoutes();
  }

  function renderHits() {
    var total = data.totals.reduce(function (a, b) { return a + b; }, 0);
    var today = data.totals[data.totals.length - 1] || 0;
    var yest = data.totals[data.totals.length - 2] || 0;
    var top = data.routes[0] || { route: '—', total: 0 };
    var avg = data.totals.length ? Math.round(total / data.totals.length) : 0;
    var diff = today - yest;
    $('sumcards').innerHTML =
      card('오늘', nf(today), (diff === 0 ? '어제와 같음' : (diff > 0 ? '어제보다 +' + nf(diff) : '어제보다 ' + nf(diff)))) +
      card(days + '일 합계', nf(total), '하루 평균 ' + nf(avg)) +
      card('가장 많이 열린 화면', esc(top.route), nf(top.total) + '회') +
      card('집계 라우트', String(data.routes.length), '화이트리스트 기준');

    var max = Math.max.apply(null, data.totals.concat([1]));
    $('chart').innerHTML = data.totals.map(function (v, i) {
      var h = Math.round(v / max * 130) + 2;
      return '<div class="bar" title="' + esc(data.days[i]) + ' · ' + nf(v) + '회">' +
        '<b>' + nf(v) + '</b><i style="height:' + h + 'px"></i><span>' + esc(shortDay(data.days[i])) + '</span></div>';
    }).join('');

    var head = '<thead><tr><th>화면</th><th class="num">' + days + '일 합계</th>' +
      data.days.slice(-7).map(function (d) { return '<th class="num">' + esc(shortDay(d)) + '</th>'; }).join('') + '</tr></thead>';
    var body = data.routes.map(function (r) {
      var last = r.counts.slice(-7);
      return '<tr><td><a href="' + esc(r.route) + '" target="_blank" rel="noopener">' + esc(r.route) + '</a></td>' +
        '<td class="num"><b>' + nf(r.total) + '</b></td>' +
        last.map(function (v) { return '<td class="num">' + (v ? nf(v) : '<span class="muted">—</span>') + '</td>'; }).join('') + '</tr>';
    }).join('');
    $('hittbl').innerHTML = head + '<tbody>' + body + '</tbody>';
  }
  function card(k, v, s) {
    return '<div class="sumcard"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div><div class="s">' + esc(s) + '</div></div>';
  }

  /* ── 라우팅 현황 ── 브라우저에서 직접 열어 응답을 본다(서버 상태를 그대로 보여 준다) */
  var CHECK = ['/', '/tour', '/krjam-planning', '/krjam-fnc', '/krjam-fnc-book', '/krjam-jebo',
               '/krjam-cardnews', '/krjam-dcount', '/privacy', '/admin',
               '/api/jp-meals', '/api/jp-fnc', '/api/jp-noti', '/VERSION'];
  function renderRoutes() {
    $('routetbl').innerHTML = '<thead><tr><th>주소</th><th>상태</th><th class="num">응답</th><th>비고</th></tr></thead>' +
      '<tbody>' + CHECK.map(function (u) {
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
          // /api/jp-noti 는 무인증이면 401 이 정상이다(관리자 토큰으로는 200)
          var good = x.code >= 200 && x.code < 400;
          var expected401 = (u === '/api/jp-noti' && x.code === 401);
          tr.querySelector('.st').innerHTML = good ? '<span class="chip ok">정상</span>'
            : (expected401 ? '<span class="chip ok">보호됨</span>' : '<span class="chip bad">확인 필요</span>');
          tr.querySelector('.ms').textContent = x.code + ' · ' + x.ms + 'ms';
          tr.querySelector('.note').textContent = expected401 ? '로그인 필요(정상)' : (x.code === 0 ? '응답 없음' : '');
        });
    });
  }

  /* ── 배포 · 검증 ── */
  function renderDeploy() {
    var s = data.status;
    if (!s) { $('deploybox').innerHTML = '<p class="muted">배포 기록(status.json)이 아직 없습니다.</p>'; return; }
    var v = s.verification;
    var rows = v ? v.rounds.map(function (r) {
      return '<tr><td>' + r.round + '라운드</td><td class="num">' + nf(r.checks) + '건</td>' +
        '<td>' + (r.fails ? '<span class="chip bad">실패 ' + r.fails + '</span>' : '<span class="chip ok">통과</span>') + '</td></tr>';
    }).join('') : '';
    $('deploybox').innerHTML =
      '<dl class="dl">' +
        '<dt>라이브 버전</dt><dd class="mono">v' + esc(s.version) + '</dd>' +
        '<dt>커밋</dt><dd class="mono">' + esc(s.commit) + ' — ' + esc(s.commitSubject || '') + '</dd>' +
        '<dt>배포 시각</dt><dd>' + esc(when(s.deployedAt)) + '</dd>' +
        (v ? '<dt>검증</dt><dd>' + (v.green ? '<span class="chip ok">' + v.rounds.length + '라운드 전부 통과</span>'
                                            : '<span class="chip bad">실패 있음</span>') +
             ' <span class="muted">· ' + esc(when(v.at)) + '</span></dd>' : '') +
      '</dl>' +
      (rows ? '<div class="tblwrap" style="margin-top:12px"><table class="tbl">' +
        '<thead><tr><th>라운드</th><th class="num">검사</th><th>결과</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '');
  }
  function when(iso) {
    try {
      var d = new Date(iso);
      return (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    } catch (e) { return String(iso || ''); }
  }

  /* ── 시작 ── 저장된 토큰이 아직 살아 있으면 바로 들어간다 */
  if (token()) {
    fetch('/api/me', { headers: auth() })
      .then(function (r) { if (r.ok) showBoard(); else { setToken(''); showGate(''); } })
      .catch(function () { showGate(''); });
  } else showGate('');
})();
