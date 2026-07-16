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
    // 자체 스타일(인라인) — 어떤 페이지에서든 우측 상단 토스트로 동일하게 표시
    var el = document.createElement("div");
    el.setAttribute("role", "alert");
    el.style.cssText = "position:fixed;top:18px;right:18px;z-index:2147483647;display:flex;align-items:center;gap:12px;max-width:300px;" +
      "background:#fff;color:#1b211d;border:1px solid rgba(0,0,0,.08);border-radius:14px;box-shadow:0 12px 32px rgba(20,20,30,.20);" +
      "padding:13px 15px;font-family:'Hanken Grotesk','Apple SD Gothic Neo',system-ui,sans-serif;transform:translateY(-14px);opacity:0;transition:.22s cubic-bezier(.4,0,.2,1);";
    el.innerHTML =
      '<div style="line-height:1.35;min-width:0;">' +
        '<strong style="display:block;font-size:13.5px;font-weight:700;">새 버전이 있습니다</strong>' +
        '<span style="font-size:12px;color:#697066;">새로고침 해주세요</span>' +
      "</div>" +
      '<button type="button" style="flex:none;border:none;background:#6336B5;color:#fff;font:600 12.5px \'Hanken Grotesk\',sans-serif;padding:8px 14px;border-radius:9px;cursor:pointer;">새로고침</button>';
    el.querySelector("button").addEventListener("click", function () { location.reload(); });
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.transform = "translateY(0)"; el.style.opacity = "1"; });
  }

  // 페이지에 #app-version 이 있으면 현재 버전을 찍는다. /VERSION 의 주인이 이 파일이므로
  // 각 페이지가 따로 fetch 하지 않는다(요청도, 표기 규칙도 한 군데).
  function stamp(v) {
    var el = document.getElementById("app-version");
    if (el && v) el.textContent = "v" + v;
  }

  function check() {
    if (document.hidden) return;
    fetchVersion().then(function (v) {
      if (!v) return;
      stamp(v);
      if (baseline === null) { baseline = v; return; }
      if (v !== baseline) showToast();
    });
  }

  function init() {
    fetchVersion().then(function (v) { baseline = v; stamp(v); });
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
