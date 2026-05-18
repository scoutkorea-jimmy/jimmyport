// jimmypark.net — version watcher.
//
// Reads /VERSION + /ADMIN_VERSION on load, locks them in as the baseline for
// this page lifecycle, then polls every 60s. If the live file differs from
// what was loaded, mount a full-screen modal that asks the user to refresh —
// useful right after a GitHub Pages auto-deploy lands while a tab is still
// open on the old build.
//
// Footer hook: keeps `.site-build-version` / `.admin-build-version` in sync
// with the live files and shows a small "최신 (HH:MM 확인)" status pill so
// the operator can verify a deploy without reaching for DevTools.

(function () {
  'use strict';

  var POLL_INTERVAL_MS = 60000;
  var FOCUS_DEBOUNCE_MS = 5000;
  var FETCH_TIMEOUT_MS = 8000;

  var baseline = { site: null, admin: null };
  var lastChecked = 0;
  var pollTimer = null;
  var modalShown = false;

  function now() { return Date.now(); }

  function fetchText(url) {
    return new Promise(function (resolve, reject) {
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS) : null;
      var opts = { cache: 'no-store' };
      if (controller) opts.signal = controller.signal;
      var sep = url.indexOf('?') >= 0 ? '&' : '?';
      fetch(url + sep + '_=' + now(), opts)
        .then(function (r) {
          if (timer) clearTimeout(timer);
          if (!r || !r.ok) { reject(new Error('HTTP ' + (r && r.status))); return; }
          return r.text();
        })
        .then(function (txt) { if (typeof txt === 'string') resolve(txt.trim()); })
        .catch(function (err) { if (timer) clearTimeout(timer); reject(err); });
    });
  }

  function readVersions() {
    return Promise.all([
      fetchText('/VERSION').catch(function () { return null; }),
      fetchText('/ADMIN_VERSION').catch(function () { return null; })
    ]).then(function (arr) {
      return { site: arr[0], admin: arr[1] };
    });
  }

  function fmtTime() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function applyToFooter(v) {
    var s = document.querySelector('.site-build-version');
    var a = document.querySelector('.admin-build-version');
    if (s && v.site)  s.textContent = 'V' + v.site;
    if (a && v.admin) a.textContent = 'V' + v.admin;
    var footer = document.querySelector('[data-version-status]');
    if (footer) footer.setAttribute('data-version-status', 'live');
    var statusEl = document.querySelector('.footer-build-status');
    if (statusEl) statusEl.textContent = '· 최신 (' + fmtTime() + ' 확인)';
  }

  function setFooterStatus(text, state) {
    var footer = document.querySelector('[data-version-status]');
    if (footer) footer.setAttribute('data-version-status', state || 'checking');
    var statusEl = document.querySelector('.footer-build-status');
    if (statusEl) statusEl.textContent = text || '';
  }

  function isDifferent(cur) {
    if (!baseline.site || !baseline.admin) return false;
    if (!cur.site || !cur.admin) return false;
    return baseline.site !== cur.site || baseline.admin !== cur.admin;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showUpdateModal(cur) {
    if (modalShown) return;
    modalShown = true;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

    var overlay = document.createElement('div');
    overlay.className = 'gw-version-update-modal';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'gw-vum-title');
    overlay.innerHTML =
      '<div class="gw-vum-card" tabindex="-1">' +
        '<div class="gw-vum-badge" aria-hidden="true">⟳</div>' +
        '<h2 class="gw-vum-title" id="gw-vum-title">새 버전이 배포되었습니다</h2>' +
        '<p class="gw-vum-body">최신 콘텐츠를 보시려면 새로고침해주세요.</p>' +
        '<div class="gw-vum-versions">' +
          '<div class="gw-vum-version-row">' +
            '<span class="gw-vum-version-label">현재 보고 계신 버전</span>' +
            '<span class="gw-vum-version-value">Site V' + escapeHtml(baseline.site || '?') + ' · Admin V' + escapeHtml(baseline.admin || '?') + '</span>' +
          '</div>' +
          '<div class="gw-vum-version-row gw-vum-version-row-new">' +
            '<span class="gw-vum-version-label">새 버전</span>' +
            '<span class="gw-vum-version-value">Site V' + escapeHtml(cur.site || '?') + ' · Admin V' + escapeHtml(cur.admin || '?') + '</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="gw-vum-btn" id="gw-vum-reload">지금 새로고침</button>' +
        '<p class="gw-vum-note">이 창은 새 버전 반영을 확인할 때까지 닫히지 않습니다.</p>' +
      '</div>';

    document.body.appendChild(overlay);
    if (document.documentElement) document.documentElement.classList.add('gw-version-locked');

    var btn = document.getElementById('gw-vum-reload');
    function doReload() {
      try { btn.disabled = true; btn.textContent = '새로고침 중…'; } catch (_) {}
      window.location.reload();
    }
    if (btn) {
      btn.addEventListener('click', doReload);
      try { btn.focus(); } catch (_) {}
    }
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doReload(); }
    });
  }

  function tick(force) {
    if (!force && document.hidden) return;
    if (!force && (now() - lastChecked) < FOCUS_DEBOUNCE_MS) return;
    lastChecked = now();
    readVersions().then(function (v) {
      if (!v.site && !v.admin) return;
      applyToFooter(v);
      if (isDifferent(v)) showUpdateModal(v);
    }).catch(function () {});
  }

  function init() {
    setFooterStatus('· 버전 확인 중…', 'checking');
    readVersions().then(function (v) {
      if (!v.site && !v.admin) {
        setFooterStatus('· 버전 확인 실패', 'error');
        return;
      }
      baseline = { site: v.site, admin: v.admin };
      applyToFooter(v);
      pollTimer = window.setInterval(function () { tick(false); }, POLL_INTERVAL_MS);
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) tick(false);
      });
      window.addEventListener('focus', function () { tick(false); });
    }).catch(function () {
      setFooterStatus('· 버전 확인 실패', 'error');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
