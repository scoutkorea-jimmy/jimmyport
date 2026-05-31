/* =========================================================================
 * scout-finder — version watcher
 * -------------------------------------------------------------------------
 * 페이지 로드 시 /VERSION 을 baseline 으로 잡고, 주기적으로 다시 받아 비교.
 * 값이 바뀌면(새 배포) 우측 상단에 "새로운 버전이 올라왔습니다" 알림 + 새로고침.
 * ========================================================================= */
(function () {
  "use strict";

  var POLL_MS = 60000;     // 60초마다 확인
  var TIMEOUT_MS = 8000;
  var baseline = null;
  var shown = false;

  function fetchVersion() {
    var url = "/VERSION?_=" + Date.now();
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) { if (timer) clearTimeout(timer); return txt ? txt.trim() : null; })
      .catch(function () { if (timer) clearTimeout(timer); return null; });
  }

  function showToast() {
    if (shown) return;
    shown = true;
    var el = document.createElement("div");
    el.className = "version-toast";
    el.setAttribute("role", "alert");
    el.innerHTML =
      '<div class="version-toast-body">' +
        '<strong class="version-toast-title">A new version is available</strong>' +
        '<span class="version-toast-sub">Please refresh the page</span>' +
      "</div>" +
      '<button type="button" class="version-toast-btn">Refresh</button>';
    el.querySelector(".version-toast-btn").addEventListener("click", function () {
      location.reload();
    });
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
  }

  function check() {
    if (document.hidden) return;
    fetchVersion().then(function (v) {
      if (!v) return;
      if (baseline === null) { baseline = v; return; }
      if (v !== baseline) showToast();
    });
  }

  function init() {
    fetchVersion().then(function (v) { baseline = v; });
    setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) check();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
