/* =========================================================================
 * scout-finder — 관리자 (manage.html)
 * -------------------------------------------------------------------------
 * 글로벌 표준: WOSM Region → 국가(NSO) → 단위대.
 * - 국가 선택(WOSM 176개 목록) → NSO·지역·언어 자동 채움. (지방연맹/지구연합회 없음)
 * - 영문 주소 + OpenStreetMap(Nominatim) 검색으로 좌표 등록 + 마커 드래그.
 * - 핀 색 = WOSM Region 색.
 * - 서버 저장: PUT /api/units (Cloudflare KV, 관리자 비밀번호). 로컬 드래프트 병행.
 * ========================================================================= */
(function () {
  "use strict";

  var DRAFT_KEY = "scoutfinder:units";
  var TOKEN_KEY = "scoutfinder:adminToken";
  var SECTIONS = ["비버", "컵", "스카우트", "벤처", "로버"];
  var TYPES = ["지역대", "학교대"];
  var WEEKDAYS = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
  var NSOS = Array.isArray(window.SCOUT_NSOS) ? window.SCOUT_NSOS : [];
  var REGION_COLORS = window.SCOUT_REGION_COLORS || {};
  var DEFAULT_COLOR = "#622599";
  var MOBILE = "(max-width: 820px)";
  var COUNTRY_NAMES = NSOS.map(function (n) { return n.country; });
  var NSO_BY_COUNTRY = (function () { var m = {}; NSOS.forEach(function (n) { m[n.country] = n; }); return m; })();

  function baseUnits() { return Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : []; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function colorOf(u) { return REGION_COLORS[u.region] || DEFAULT_COLOR; }
  function isMobile() { return window.matchMedia(MOBILE).matches; }

  // ── state ──────────────────────────────────────────────────────────
  var units = [], map, unitLayer = L.layerGroup(), markers = [], pickIndex = null, activeIndex = null, saveTimer = null;

  // ── DOM ────────────────────────────────────────────────────────────
  var $list = document.getElementById("editor-list");
  var $empty = document.getElementById("editor-empty");
  var $status = document.getElementById("save-status");
  var $mapWrap = document.getElementById("map-wrap");
  var $hint = document.getElementById("map-hint");
  var DEFAULT_HINT = $hint.textContent;

  // ── helpers ────────────────────────────────────────────────────────
  function escHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escAttr(s) { return escHtml(s).replace(/"/g, "&quot;"); }
  function uid() { return "unit-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  function round5(n) { return Math.round(n * 1e5) / 1e5; }
  function setStatus(text, ok) { $status.textContent = text; $status.classList.toggle("ok", !!ok); }

  function saveDraft() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(units));
        var t = new Date(), hh = ("0" + t.getHours()).slice(-2), mm = ("0" + t.getMinutes()).slice(-2);
        setStatus("로컬 저장됨 " + hh + ":" + mm + " (서버 반영은 '서버에 저장')", true);
      } catch (e) { setStatus("로컬 저장 실패", false); }
    }, 300);
  }

  function applyCountry(u) {
    var rec = NSO_BY_COUNTRY[u.country];
    if (rec) { u.country_ko = rec.country_ko; u.nso = rec.nso; u.region = rec.region; u.lang = rec.lang; }
  }

  // ── icons ──────────────────────────────────────────────────────────
  function adminPin(active, color) {
    return L.divIcon({
      className: "unit-pin" + (active ? " is-active" : ""),
      html: '<div class="unit-pin-dot" style="background:' + color + '"></div>',
      iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
    });
  }

  // ── card template ──────────────────────────────────────────────────
  function selectOptions(values, current) {
    var opts = '<option value="">(선택)</option>', has = false;
    values.forEach(function (v) { var sel = v === current ? " selected" : ""; if (sel) has = true; opts += '<option value="' + escAttr(v) + '"' + sel + ">" + escHtml(v) + "</option>"; });
    if (current && !has) opts += '<option value="' + escAttr(current) + '" selected>' + escHtml(current) + " (사용자 입력)</option>";
    return opts;
  }
  function field(label, name, value, type, span) {
    return '<div class="field' + (span ? " col-span" : "") + '"><label>' + label + "</label>" +
      '<input type="' + (type || "text") + '" data-field="' + name + '" value="' + escAttr(value) + '"' +
      (name === "lat" || name === "lng" ? ' step="any"' : "") + (name === "meetingDay" ? ' list="weekday-list"' : "") + " /></div>";
  }
  function nsoInfo(u) { return escHtml((u.nso || "—") + " · " + (u.region || "—") + (u.lang ? " (" + u.lang + ")" : "")); }

  function cardHtml(u, i) {
    var secBoxes = SECTIONS.map(function (s) {
      var on = (u.sections || []).indexOf(s) !== -1;
      return '<label class="section-toggle' + (on ? " checked" : "") + '"><input type="checkbox" data-section="' + escAttr(s) + '"' + (on ? " checked" : "") + " />" + escHtml(s) + "</label>";
    }).join("");
    return (
      '<div class="editor-card" data-index="' + i + '">' +
        '<div class="editor-card-head">' +
          '<span class="editor-card-swatch" style="background:' + colorOf(u) + '"></span>' +
          '<span class="editor-card-title">' + (escHtml(u.name) || "(이름 없음)") + "</span>" +
          '<span class="editor-card-actions"><button type="button" class="icon-btn del" data-action="delete" title="삭제" aria-label="삭제">✕</button></span>' +
        "</div>" +
        '<div class="field-grid">' +
          field("이름 (영문)", "name", u.name) +
          '<div class="field"><label>종류</label><select data-field="type">' + selectOptions(TYPES, u.type) + "</select></div>" +
          '<div class="field col-span"><label>국가 (WOSM)</label><select data-field="country">' + selectOptions(COUNTRY_NAMES, u.country || "Republic of Korea") + "</select></div>" +
          '<div class="field col-span"><label>NSO · 지역 · 언어 (자동)</label><div class="readonly-line" data-nso-info>' + nsoInfo(u) + "</div></div>" +
          '<div class="field col-span"><label>주소 (영문)</label><div class="coord-row">' +
            '<input type="text" data-field="address" value="' + escAttr(u.address) + '" style="flex:1 1 auto" />' +
            '<button type="button" class="admin-btn pick-btn" data-action="geocode">OSM 검색</button>' +
          "</div></div>" +
          field("ID (영문, 고유)", "id", u.id) +
          field("모임 요일", "meetingDay", u.meetingDay) +
          field("연락처 (전화/이메일)", "contact", u.contact) +
          field("인스타그램 (URL)", "instagram", u.instagram) +
          '<div class="field col-span"><label>모집 카테고리</label><div class="sections-box">' + secBoxes + "</div></div>" +
          '<div class="field col-span"><label>좌표 (위도 / 경도) — OSM 검색 또는 지도 클릭/드래그</label><div class="coord-row">' +
            '<div class="field"><label class="sr-only">위도</label><input type="number" step="any" data-field="lat" value="' + escAttr(u.lat) + '" /></div>' +
            '<div class="field"><label class="sr-only">경도</label><input type="number" step="any" data-field="lng" value="' + escAttr(u.lng) + '" /></div>' +
            '<button type="button" class="admin-btn pick-btn" data-action="pick">지도에서 지정</button>' +
          "</div></div>" +
          '<div class="field col-span"><label>주요 활동</label><textarea data-field="note" rows="2">' + escHtml(u.note) + "</textarea></div>" +
        "</div>" +
      "</div>"
    );
  }

  // ── render ─────────────────────────────────────────────────────────
  function render() { $list.innerHTML = units.map(cardHtml).join(""); $empty.hidden = units.length > 0; rebuildMarkers(); }

  function rebuildMarkers() {
    unitLayer.clearLayers(); markers = [];
    var pts = [];
    units.forEach(function (u, i) {
      var lat = parseFloat(u.lat), lng = parseFloat(u.lng);
      if (isNaN(lat) || isNaN(lng)) { markers[i] = null; return; }
      var marker = L.marker([lat, lng], { icon: adminPin(i === activeIndex, colorOf(u)), draggable: true, title: u.name, alt: u.name });
      marker.bindPopup(escHtml(u.name) + "<br>" + escHtml(u.country) + " · " + escHtml(u.nso));
      marker.on("dragend", function () { onMarkerDrag(i, marker.getLatLng()); });
      marker.on("click", function () { setActive(i, false); });
      unitLayer.addLayer(marker); markers[i] = marker; pts.push([lat, lng]);
    });
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13 });
    else if (pts.length === 1) map.setView(pts[0], 11);
  }

  function cardEl(i) { return $list.querySelector('.editor-card[data-index="' + i + '"]'); }

  function setActive(i, pan) {
    activeIndex = i;
    $list.querySelectorAll(".editor-card").forEach(function (c) { c.classList.toggle("is-active", Number(c.getAttribute("data-index")) === i); });
    markers.forEach(function (m, idx) { if (m) m.setIcon(adminPin(idx === i, colorOf(units[idx]))); });
    var el = cardEl(i); if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (markers[i]) { if (pan) map.panTo(markers[i].getLatLng()); markers[i].openPopup(); }
  }

  function onMarkerDrag(i, latlng) {
    var lat = round5(latlng.lat), lng = round5(latlng.lng);
    units[i].lat = lat; units[i].lng = lng;
    var el = cardEl(i);
    if (el) { el.querySelector('[data-field="lat"]').value = lat; el.querySelector('[data-field="lng"]').value = lng; }
    saveDraft();
  }

  // ── editing ────────────────────────────────────────────────────────
  function onFieldInput(e) {
    var input = e.target, card = input.closest(".editor-card");
    if (!card) return;
    var i = Number(card.getAttribute("data-index")), u = units[i];

    if (input.hasAttribute("data-section")) {
      var sec = input.getAttribute("data-section");
      if (!Array.isArray(u.sections)) u.sections = [];
      var pos = u.sections.indexOf(sec);
      if (input.checked && pos === -1) u.sections.push(sec);
      else if (!input.checked && pos !== -1) u.sections.splice(pos, 1);
      u.sections = SECTIONS.filter(function (s) { return u.sections.indexOf(s) !== -1; });
      input.closest(".section-toggle").classList.toggle("checked", input.checked);
      saveDraft(); return;
    }

    var f = input.getAttribute("data-field");
    if (!f) return;

    if (f === "lat" || f === "lng") {
      var num = parseFloat(input.value); u[f] = isNaN(num) ? "" : num;
      var m = markers[i]; if (m && !isNaN(parseFloat(u.lat)) && !isNaN(parseFloat(u.lng))) m.setLatLng([parseFloat(u.lat), parseFloat(u.lng)]);
    } else {
      u[f] = input.value;
      if (f === "name") { var t = card.querySelector(".editor-card-title"); if (t) t.textContent = input.value || "(이름 없음)"; }
      if (f === "country") {
        applyCountry(u);
        var info = card.querySelector("[data-nso-info]"); if (info) info.textContent = nsoInfo(u);
        var sw = card.querySelector(".editor-card-swatch"); if (sw) sw.style.background = colorOf(u);
        if (markers[i]) markers[i].setIcon(adminPin(i === activeIndex, colorOf(u)));
      }
      if (markers[i]) markers[i].setPopupContent(escHtml(u.name) + "<br>" + escHtml(u.country) + " · " + escHtml(u.nso));
    }
    saveDraft();
  }

  function onListClick(e) {
    var btn = e.target.closest("[data-action]");
    if (btn) {
      var i = Number(btn.closest(".editor-card").getAttribute("data-index")), action = btn.getAttribute("data-action");
      if (action === "delete") return doDelete(i);
      if (action === "pick") return startPick(i);
      if (action === "geocode") return doGeocode(i, btn);
      return;
    }
    var head = e.target.closest(".editor-card-head");
    if (head) setActive(Number(head.closest(".editor-card").getAttribute("data-index")), true);
  }

  // ── OSM(Nominatim) 지오코딩 ─────────────────────────────────────────
  function doGeocode(i, btn) {
    var u = units[i];
    var q = (u.address || "").trim();
    if (!q) { setStatus("주소를 먼저 입력하세요", false); return; }
    var old = btn.textContent; btn.textContent = "검색중…"; btn.disabled = true;
    fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(q), { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (arr) {
        if (arr && arr[0]) {
          var lat = round5(parseFloat(arr[0].lat)), lng = round5(parseFloat(arr[0].lon));
          u.lat = lat; u.lng = lng;
          var el = cardEl(i);
          if (el) { el.querySelector('[data-field="lat"]').value = lat; el.querySelector('[data-field="lng"]').value = lng; }
          if (markers[i]) markers[i].setLatLng([lat, lng]); else rebuildMarkers();
          map.setView([lat, lng], 13);
          setActive(i, true);
          saveDraft();
          setStatus("OSM 좌표 적용: " + lat + ", " + lng, true);
        } else { setStatus("OSM 검색 결과 없음 — 주소를 더 구체적으로", false); }
      })
      .catch(function () { setStatus("OSM 검색 실패 (네트워크)", false); })
      .then(function () { btn.textContent = old; btn.disabled = false; });
  }

  // ── actions ────────────────────────────────────────────────────────
  function doAdd() {
    var center = map.getCenter();
    var u = { id: uid(), name: "New Scout Unit", type: "지역대", country: "Republic of Korea",
      address: "", lat: round5(center.lat), lng: round5(center.lng),
      sections: [], meetingDay: "", contact: "", instagram: "", note: "" };
    applyCountry(u);
    units.push(u); activeIndex = units.length - 1; render(); saveDraft();
    var el = cardEl(activeIndex);
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); var n = el.querySelector('[data-field="name"]'); if (n) { n.focus(); n.select(); } }
  }
  function doDelete(i) { if (!confirm('"' + (units[i].name || "이 단위대") + '"를 삭제할까요?')) return; units.splice(i, 1); if (activeIndex === i) activeIndex = null; render(); saveDraft(); }

  function startPick(i) {
    pickIndex = i; activeIndex = i; $mapWrap.classList.add("picking");
    $hint.textContent = '"' + (units[i].name || "단위대") + '" — 지도를 클릭해 위치를 지정하세요. (취소: ESC)';
    if (isMobile()) setView("map"); setActive(i, true);
  }
  function stopPick() { pickIndex = null; $mapWrap.classList.remove("picking"); $hint.textContent = DEFAULT_HINT; }
  function onMapClick(e) { if (pickIndex === null) return; var i = pickIndex; onMarkerDrag(i, e.latlng); if (markers[i]) markers[i].setLatLng(e.latlng); else rebuildMarkers(); stopPick(); }

  // ── import / export / reset ────────────────────────────────────────
  function dataJsText() {
    return "// scout-finder data\n" +
      "window.SCOUT_UNITS = " + JSON.stringify(units, null, 2) + ";\n\n" +
      "window.SCOUT_NSOS = " + JSON.stringify(NSOS) + ";\n\n" +
      "window.SCOUT_REGION_COLORS = " + JSON.stringify(REGION_COLORS, null, 2) + ";\n";
  }
  function validate() {
    var problems = [], seen = {};
    units.forEach(function (u, i) {
      var label = "#" + (i + 1) + " " + (u.name || "(이름 없음)");
      if (!u.id) problems.push(label + ": ID 없음"); else if (seen[u.id]) problems.push(label + ": ID 중복"); else seen[u.id] = true;
      if (isNaN(parseFloat(u.lat)) || isNaN(parseFloat(u.lng))) problems.push(label + ": 좌표 없음");
      if (!u.country) problems.push(label + ": 국가 없음");
    });
    return problems;
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }
  function doDownloadJs() {
    var p = validate();
    if (p.length && !confirm("문제:\n\n" + p.join("\n") + "\n\n그래도 내보낼까요?")) return;
    download("data.js", dataJsText(), "text/javascript");
  }
  function doCopyJson() {
    var text = JSON.stringify(units, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { setStatus("JSON 복사됨", true); }).catch(function () { fallbackCopy(text); });
    else fallbackCopy(text);
  }
  function fallbackCopy(text) { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); setStatus("JSON 복사됨", true); } catch (e) { setStatus("복사 실패", false); } document.body.removeChild(ta); }
  function doImport(file) {
    var reader = new FileReader();
    reader.onload = function () { try { var arr = JSON.parse(reader.result); if (!Array.isArray(arr)) throw new Error("배열 아님"); units = arr; activeIndex = null; render(); saveDraft(); setStatus("가져오기 완료 (" + units.length + ")", true); } catch (e) { alert("가져오기 실패: " + e.message); } };
    reader.readAsText(file);
  }
  function doReset() {
    if (!confirm("로컬 드래프트를 버리고 서버 데이터를 다시 불러올까요?")) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    loadFromServer(true);
  }

  // ── 서버 (Cloudflare KV) ────────────────────────────────────────────
  function getToken() {
    var t = "";
    try { t = sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) {}
    if (!t) { t = prompt("관리자 비밀번호 (ADMIN_TOKEN):") || ""; if (t) { try { sessionStorage.setItem(TOKEN_KEY, t); } catch (e) {} } }
    return t;
  }
  function loadFromServer(forceServer) {
    return fetch("/api/units", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var server = (j && Array.isArray(j.units)) ? j.units : null;
        var draft = null;
        if (!forceServer) { try { var raw = localStorage.getItem(DRAFT_KEY); if (raw) { var a = JSON.parse(raw); if (Array.isArray(a)) draft = a; } } catch (e) {} }
        if (draft) { units = draft; setStatus("로컬 드래프트 (" + units.length + ") — 서버 반영은 '서버에 저장'", false); }
        else if (server) { units = server; setStatus("서버 데이터 로드 (" + units.length + ")", true); }
        else { units = clone(baseUnits()); setStatus("샘플 데이터 (" + units.length + ")", false); }
        activeIndex = null; render();
      })
      .catch(function () { units = clone(baseUnits()); render(); setStatus("서버 연결 실패 — 샘플 사용", false); });
  }
  function saveToServer() {
    var p = validate();
    if (p.length && !confirm("문제:\n\n" + p.join("\n") + "\n\n그래도 서버에 저장할까요?")) return;
    var token = getToken();
    if (!token) return;
    setStatus("서버에 저장 중…", false);
    fetch("/api/units", { method: "PUT", headers: { "content-type": "application/json", "X-Admin-Token": token }, body: JSON.stringify({ units: units }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok) { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} setStatus("서버 저장 완료 (" + res.j.count + ") · " + (res.j.updatedAt || ""), true); }
        else if (res.status === 401) { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} setStatus("비밀번호 오류 — 다시 시도", false); }
        else setStatus("서버 저장 실패: " + (res.j.error || res.status), false);
      })
      .catch(function () { setStatus("서버 저장 실패 (네트워크)", false); });
  }

  // ── view toggle ─────────────────────────────────────────────────────
  function setView(view) {
    document.body.classList.toggle("view-map", view === "map");
    document.body.classList.toggle("view-list", view !== "map");
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === view ? "true" : "false"); });
    if (view === "map" && map) setTimeout(function () { map.invalidateSize(); }, 60);
  }

  // ── init ───────────────────────────────────────────────────────────
  function init() {
    var dl = document.createElement("datalist"); dl.id = "weekday-list";
    dl.innerHTML = WEEKDAYS.map(function (d) { return '<option value="' + d + '">'; }).join("");
    document.body.appendChild(dl);

    map = L.map("admin-map", { zoomControl: true }).setView([20, 60], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    unitLayer.addTo(map);
    map.on("click", onMapClick);

    $list.addEventListener("input", onFieldInput);
    $list.addEventListener("change", onFieldInput);
    $list.addEventListener("click", onListClick);
    document.getElementById("add-btn").addEventListener("click", doAdd);
    document.getElementById("save-server").addEventListener("click", saveToServer);
    document.getElementById("download-js").addEventListener("click", doDownloadJs);
    document.getElementById("copy-json").addEventListener("click", doCopyJson);
    document.getElementById("reset-btn-admin").addEventListener("click", doReset);
    document.getElementById("import-input").addEventListener("change", function (e) { if (e.target.files && e.target.files[0]) doImport(e.target.files[0]); e.target.value = ""; });
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-view")); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pickIndex !== null) stopPick(); });

    loadFromServer(false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
