/* =========================================================================
 * scout-finder — Admin (manage.html, English-only)
 * -------------------------------------------------------------------------
 * Global standard: WOSM Region -> Country (NSO) -> Unit.
 * - Pick a country (WOSM 176 list) -> NSO / region / language auto-fill.
 * - No street address. Set coordinates by searching the MAP to a place,
 *   then clicking the map ("Set on map") or dragging the marker.
 * - ID is auto-assigned. Pin color = WOSM region.
 * - Changes auto-save to the Cloudflare server (PUT /api/units, admin password).
 * ========================================================================= */
(function () {
  "use strict";

  var TOKEN_KEY = "scoutfinder:adminToken";
  var DRAFT_KEY = "scoutfinder:units";
  var SECTIONS = ["Beaver", "Cub", "Scout", "Venture", "Rover"];
  var TYPES = ["Community unit", "School unit"];
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
  function applyCountry(u) { var r = NSO_BY_COUNTRY[u.country]; if (r) { u.country_ko = r.country_ko; u.nso = r.nso; u.region = r.region; u.lang = r.lang; } }

  // ── icons ──────────────────────────────────────────────────────────
  function adminPin(active, color) {
    return L.divIcon({ className: "unit-pin" + (active ? " is-active" : ""), html: '<div class="unit-pin-dot" style="background:' + color + '"></div>', iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
  }

  // ── card template ──────────────────────────────────────────────────
  function selectOptions(values, current) {
    var opts = '<option value="">(select)</option>', has = false;
    values.forEach(function (v) { var sel = v === current ? " selected" : ""; if (sel) has = true; opts += '<option value="' + escAttr(v) + '"' + sel + ">" + escHtml(v) + "</option>"; });
    if (current && !has) opts += '<option value="' + escAttr(current) + '" selected>' + escHtml(current) + "</option>";
    return opts;
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
          '<span class="editor-card-title">' + (escHtml(u.name) || "(no name)") + "</span>" +
          '<span class="editor-card-actions"><button type="button" class="icon-btn del" data-action="delete" title="Delete" aria-label="Delete">✕</button></span>' +
        "</div>" +
        '<div class="field-grid">' +
          '<div class="field"><label>Name</label><input type="text" data-field="name" value="' + escAttr(u.name) + '" /></div>' +
          '<div class="field"><label>Type</label><select data-field="type">' + selectOptions(TYPES, u.type) + "</select></div>" +
          '<div class="field col-span"><label>Country (WOSM)</label><select data-field="country">' + selectOptions(COUNTRY_NAMES, u.country || "Republic of Korea") + "</select></div>" +
          '<div class="field col-span"><label>NSO · Region · Language (auto)</label><div class="readonly-line" data-nso-info>' + nsoInfo(u) + "</div></div>" +
          '<div class="field col-span"><label>Homepage (Instagram)</label><input type="text" data-field="homepage" value="' + escAttr(u.homepage) + '" placeholder="https://instagram.com/..." /></div>' +
          '<div class="field col-span"><label>Recruiting categories</label><div class="sections-box">' + secBoxes + "</div></div>" +
          '<div class="field col-span"><label>Location — search the map, then "Set on map" or drag the marker</label><div class="coord-row">' +
            '<div class="field"><label class="sr-only">Latitude</label><input type="number" step="any" data-field="lat" value="' + escAttr(u.lat) + '" /></div>' +
            '<div class="field"><label class="sr-only">Longitude</label><input type="number" step="any" data-field="lng" value="' + escAttr(u.lng) + '" /></div>' +
            '<button type="button" class="admin-btn pick-btn" data-action="pick">Set on map</button>' +
          "</div></div>" +
          '<div class="field col-span"><label>Main activities</label><textarea data-field="note" rows="2">' + escHtml(u.note) + "</textarea></div>" +
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
    scheduleSave();
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
      scheduleSave(); return;
    }

    var f = input.getAttribute("data-field");
    if (!f) return;
    if (f === "lat" || f === "lng") {
      var num = parseFloat(input.value); u[f] = isNaN(num) ? "" : num;
      var m = markers[i]; if (m && !isNaN(parseFloat(u.lat)) && !isNaN(parseFloat(u.lng))) m.setLatLng([parseFloat(u.lat), parseFloat(u.lng)]);
    } else {
      u[f] = input.value;
      if (f === "name") { var t = card.querySelector(".editor-card-title"); if (t) t.textContent = input.value || "(no name)"; }
      if (f === "country") {
        applyCountry(u);
        var info = card.querySelector("[data-nso-info]"); if (info) info.textContent = nsoInfo(u);
        var sw = card.querySelector(".editor-card-swatch"); if (sw) sw.style.background = colorOf(u);
        if (markers[i]) markers[i].setIcon(adminPin(i === activeIndex, colorOf(u)));
      }
      if (markers[i]) markers[i].setPopupContent(escHtml(u.name) + "<br>" + escHtml(u.country) + " · " + escHtml(u.nso));
    }
    scheduleSave();
  }

  function onListClick(e) {
    var btn = e.target.closest("[data-action]");
    if (btn) {
      var i = Number(btn.closest(".editor-card").getAttribute("data-index")), action = btn.getAttribute("data-action");
      if (action === "delete") return doDelete(i);
      if (action === "pick") return startPick(i);
      return;
    }
    var head = e.target.closest(".editor-card-head");
    if (head) setActive(Number(head.closest(".editor-card").getAttribute("data-index")), true);
  }

  // ── map address search (pan only) ───────────────────────────────────
  function searchMap(q) {
    q = (q || "").trim(); if (!q) return;
    setStatus("Searching map…", false);
    fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(q), { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (arr) {
        if (arr && arr[0]) { map.setView([parseFloat(arr[0].lat), parseFloat(arr[0].lon)], 13); setStatus("Map moved to: " + (arr[0].display_name || q), true); }
        else setStatus("No place found — try a more specific query", false);
      })
      .catch(function () { setStatus("Map search failed (network)", false); });
  }

  // ── actions ────────────────────────────────────────────────────────
  function doAdd() {
    var c = map.getCenter();
    var u = { id: uid(), name: "New Scout Unit", type: "Community unit", country: "Republic of Korea", lat: round5(c.lat), lng: round5(c.lng), sections: [], homepage: "", note: "" };
    applyCountry(u);
    units.push(u); activeIndex = units.length - 1; render(); scheduleSave();
    var el = cardEl(activeIndex);
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); var n = el.querySelector('[data-field="name"]'); if (n) { n.focus(); n.select(); } }
  }
  function doDelete(i) { if (!confirm('Delete "' + (units[i].name || "this unit") + '"?')) return; units.splice(i, 1); if (activeIndex === i) activeIndex = null; render(); scheduleSave(); }

  function startPick(i) {
    pickIndex = i; activeIndex = i; $mapWrap.classList.add("picking");
    $hint.textContent = '"' + (units[i].name || "unit") + '" — click the map to set the location. (Esc to cancel)';
    if (isMobile()) setView("map"); setActive(i, true);
  }
  function stopPick() { pickIndex = null; $mapWrap.classList.remove("picking"); $hint.textContent = DEFAULT_HINT; }
  function onMapClick(e) { if (pickIndex === null) return; var i = pickIndex; onMarkerDrag(i, e.latlng); if (markers[i]) markers[i].setLatLng(e.latlng); else rebuildMarkers(); stopPick(); }

  // ── export / import / reload ────────────────────────────────────────
  function dataJsText() {
    return "// scout-finder data\n" +
      "window.SCOUT_UNITS = " + JSON.stringify(units, null, 2) + ";\n\n" +
      "window.SCOUT_NSOS = " + JSON.stringify(NSOS) + ";\n\n" +
      "window.SCOUT_REGION_COLORS = " + JSON.stringify(REGION_COLORS, null, 2) + ";\n";
  }
  function validate() {
    var problems = [], seen = {};
    units.forEach(function (u, i) {
      var label = "#" + (i + 1) + " " + (u.name || "(no name)");
      if (!u.id) problems.push(label + ": missing ID"); else if (seen[u.id]) problems.push(label + ": duplicate ID"); else seen[u.id] = true;
      if (isNaN(parseFloat(u.lat)) || isNaN(parseFloat(u.lng))) problems.push(label + ": missing coordinates");
      if (!u.country) problems.push(label + ": missing country");
    });
    return problems;
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }
  function doDownloadJs() { download("data.js", dataJsText(), "text/javascript"); }
  function doCopyJson() {
    var text = JSON.stringify(units, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { setStatus("JSON copied", true); }).catch(function () { fallbackCopy(text); });
    else fallbackCopy(text);
  }
  function fallbackCopy(text) { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); setStatus("JSON copied", true); } catch (e) { setStatus("Copy failed", false); } document.body.removeChild(ta); }
  function doImport(file) {
    var reader = new FileReader();
    reader.onload = function () { try { var arr = JSON.parse(reader.result); if (!Array.isArray(arr)) throw new Error("not an array"); units = arr; activeIndex = null; render(); scheduleSave(); setStatus("Imported (" + units.length + ")", true); } catch (e) { alert("Import failed: " + e.message); } };
    reader.readAsText(file);
  }
  function doReload() {
    if (!confirm("Discard local changes and reload from the server?")) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    loadFromServer(true);
  }

  // ── server (Cloudflare KV) — auto save ──────────────────────────────
  function getToken(force) {
    var t = "";
    try { t = sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) {}
    if (!t || force) { t = prompt("Admin password (ADMIN_TOKEN):") || ""; if (t) { try { sessionStorage.setItem(TOKEN_KEY, t); } catch (e) {} } }
    return t;
  }
  function scheduleSave() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(units)); } catch (e) {}
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToServer, 900);
  }
  function saveToServer() {
    var token = getToken(false);
    if (!token) { setStatus("Saved locally — enter admin password to publish", false); return; }
    setStatus("Saving to server…", false);
    fetch("/api/units", { method: "PUT", headers: { "content-type": "application/json", "X-Admin-Token": token }, body: JSON.stringify({ units: units }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok) { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} var t = new Date(); setStatus("Saved to server ✓ " + ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2) + " (" + res.j.count + ")", true); }
        else if (res.status === 401) { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} setStatus("Wrong password — edit again to retry", false); }
        else setStatus("Server save failed: " + (res.j.error || res.status), false);
      })
      .catch(function () { setStatus("Server save failed (network) — kept locally", false); });
  }
  function loadFromServer(forceServer) {
    return fetch("/api/units", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var server = (j && Array.isArray(j.units)) ? j.units : null;
        var draft = null;
        if (!forceServer) { try { var raw = localStorage.getItem(DRAFT_KEY); if (raw) { var a = JSON.parse(raw); if (Array.isArray(a)) draft = a; } } catch (e) {} }
        if (draft) { units = draft; setStatus("Unsaved local changes (" + units.length + ")", false); }
        else if (server) { units = server; setStatus("Loaded from server (" + units.length + ")", true); }
        else { units = clone(baseUnits()); setStatus("Sample data (" + units.length + ")", false); }
        activeIndex = null; render();
      })
      .catch(function () { units = clone(baseUnits()); render(); setStatus("Server unreachable — using sample", false); });
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
    map = L.map("admin-map", { zoomControl: true }).setView([20, 60], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    unitLayer.addTo(map);
    map.on("click", onMapClick);

    $list.addEventListener("input", onFieldInput);
    $list.addEventListener("change", onFieldInput);
    $list.addEventListener("click", onListClick);
    document.getElementById("add-btn").addEventListener("click", doAdd);
    document.getElementById("download-js").addEventListener("click", doDownloadJs);
    document.getElementById("copy-json").addEventListener("click", doCopyJson);
    document.getElementById("reset-btn-admin").addEventListener("click", doReload);
    document.getElementById("import-input").addEventListener("change", function (e) { if (e.target.files && e.target.files[0]) doImport(e.target.files[0]); e.target.value = ""; });
    document.getElementById("map-search-form").addEventListener("submit", function (e) { e.preventDefault(); searchMap(document.getElementById("map-search").value); });
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-view")); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pickIndex !== null) stopPick(); });

    loadFromServer(false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
