/* =========================================================================
 * scout-finder — app logic (public, English-only)
 * -------------------------------------------------------------------------
 * - 글로벌 표준: WOSM Region → 국가(NSO) → 단위대. (지방연맹/지구연합회 없음)
 * - 데이터는 서버(/api/units, Cloudflare KV)에서 로드, 없으면 data.js 폴백.
 * - 검색 → 일치 centroid anchor → haversine 오름차순. 지도 클릭 재정렬.
 * - 핀 색 = WOSM Region 색(SCOUT_REGION_COLORS).
 * ========================================================================= */
(function () {
  "use strict";

  var REGION_COLORS = window.SCOUT_REGION_COLORS || {};
  var DEFAULT_COLOR = "#622599";
  var MOBILE = "(max-width: 820px)";

  var T = {
    title: "Find Scout Units Near You", badge: "Sample data",
    ph: "Search a region, country, or NSO (e.g. Suwon, Japan, Fiji)",
    hint: "Or click the map to set your reference point.",
    go: "Search", list: "List", map: "Map", showAll: "Show all",
    emptyTitle: "No results.", emptySub: "Try another keyword, or click the map to set a location.",
    legend: function (n) { return "Region colors (" + n + ")"; },
    admin: "Admin", dlJson: "Download data (JSON)", dlJs: "Download data.js", note: "Running on sample data",
    statusAll: function (n) { return "All units · " + n; },
    statusMap: function (n) { return "Nearest to selected point · " + n; },
    statusNone: "No results", refMap: "Selected location",
    meets: "Meets", activities: "Main activities", recruiting: "Recruiting",
    contactDefault: "Contact the national scout organization", instagram: "Instagram",
    type: { "지역대": "Community unit", "학교대": "School unit" },
    section: { "비버": "Beaver", "컵": "Cub", "스카우트": "Scout", "벤처": "Venture", "로버": "Rover" },
    day: { "월요일": "Monday", "화요일": "Tuesday", "수요일": "Wednesday", "목요일": "Thursday", "금요일": "Friday", "토요일": "Saturday", "일요일": "Sunday" },
  };
  function tr(map, v) { return (map && map[v]) || v || ""; }

  // ── DOM ────────────────────────────────────────────────────────────
  var $form = document.getElementById("search-form");
  var $input = document.getElementById("search-input");
  var $list = document.getElementById("result-list");
  var $status = document.getElementById("status");
  var $reset = document.getElementById("reset-btn");
  var $empty = document.getElementById("empty-state");
  var $badge = document.getElementById("site-badge");
  var $dlJson = document.getElementById("download-json");
  var $dlJs = document.getElementById("download-js");
  var $results = document.querySelector(".results");
  var $legend = null;

  // ── state ──────────────────────────────────────────────────────────
  var UNITS = Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : [];
  var map, unitLayer = L.layerGroup(), anchorMarker = null, markerInfo = {}, activeId = null;
  var lastState = { kind: "all", ordered: [], anchor: null, q: "" };

  // ── utils ──────────────────────────────────────────────────────────
  function toRad(d) { return (d * Math.PI) / 180; }
  function haversine(a, b) {
    var R = 6371, dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
  function centroid(u) { var lat = 0, lng = 0; u.forEach(function (x) { lat += x.lat; lng += x.lng; }); return { lat: lat / u.length, lng: lng / u.length }; }
  function fmtKm(km) { return km.toFixed(1) + "km"; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }
  function colorOf(u) { return REGION_COLORS[u.region] || DEFAULT_COLOR; }
  function textOn(hex) {
    var c = String(hex).replace("#", "");
    if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join("");
    var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#221b2b" : "#ffffff";
  }
  function isMobile() { return window.matchMedia(MOBILE).matches; }
  function contactText(u) { return (u.contact && String(u.contact).trim()) ? u.contact : T.contactDefault; }

  // ── search ─────────────────────────────────────────────────────────
  function matchUnits(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return UNITS.filter(function (u) {
      return [u.name, u.type, u.country, u.country_ko, u.nso, u.region, u.address].join(" ").toLowerCase().indexOf(q) !== -1;
    });
  }

  // ── icons ──────────────────────────────────────────────────────────
  function unitIcon(rank, active, color) {
    return L.divIcon({
      className: "unit-pin" + (active ? " is-active" : ""),
      html: '<div class="unit-pin-dot" style="background:' + color + '"><span style="color:' + textOn(color) + '">' + rank + "</span></div>",
      iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
    });
  }
  function anchorIcon() {
    return L.divIcon({ className: "anchor-pin", html: '<div class="anchor-pin-dot"></div>', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
  }

  // ── rendering ──────────────────────────────────────────────────────
  function chipsHtml(u) { return (u.sections || []).map(function (s) { return '<span class="chip">' + esc(tr(T.section, s)) + "</span>"; }).join(""); }

  function popupHtml(u, anchor) {
    var dist = anchor ? '<div class="popup-line"><strong>' + fmtKm(haversine(anchor, u)) + "</strong></div>" : "";
    var act = u.note ? '<div class="popup-line"><b>' + esc(T.activities) + ":</b> " + esc(u.note) + "</div>" : "";
    var rec = (u.sections && u.sections.length) ? '<div class="popup-line"><b>' + esc(T.recruiting) + ":</b> " + u.sections.map(function (s) { return esc(tr(T.section, s)); }).join(", ") + "</div>" : "";
    var ig = u.instagram ? ' · <a class="popup-ig" href="' + escAttr(u.instagram) + '" target="_blank" rel="noopener">' + esc(T.instagram) + "</a>" : "";
    return (
      '<div class="popup-name">' + esc(u.name) + (u.type ? ' <span class="popup-type">' + esc(tr(T.type, u.type)) + "</span>" : "") + "</div>" +
      '<div class="popup-affil">' + esc(u.country) + "</div>" +
      '<div class="popup-line">' + esc(u.nso) + (u.region ? " · " + esc(u.region) : "") + "</div>" +
      '<div class="popup-line">' + esc(u.address) + "</div>" + act + rec +
      '<div class="popup-line">' + esc(T.meets) + " " + esc(tr(T.day, u.meetingDay)) + " · " + esc(contactText(u)) + ig + "</div>" + dist
    );
  }

  function cardHtml(u, rank, anchor) {
    var color = colorOf(u);
    var distBadge = anchor ? '<span class="card-dist">' + fmtKm(haversine(anchor, u)) + "</span>" : "";
    var chips = chipsHtml(u);
    var act = u.note ? '<p class="card-meta"><span class="card-field-label">' + esc(T.activities) + ":</span> " + esc(u.note) + "</p>" : "";
    var ig = u.instagram ? " · " + esc(T.instagram) : "";
    var region = u.region ? ' <span class="card-region" style="background:' + color + ";color:" + textOn(color) + '">' + esc(u.region) + "</span>" : "";
    return (
      '<button type="button" class="result-card" data-id="' + escAttr(u.id) + '">' +
        '<div class="card-top">' +
          '<span class="card-rank" style="background:' + color + ";color:" + textOn(color) + '">' + rank + "</span>" +
          '<div class="card-heading">' +
            '<p class="card-name">' + esc(u.name) + (u.type ? ' <span class="card-type">' + esc(tr(T.type, u.type)) + "</span>" : "") + "</p>" +
            '<p class="card-affil">' + esc(u.country) + region + "</p>" +
          "</div>" + distBadge +
        "</div>" +
        '<p class="card-meta">' + esc(u.nso) + "</p>" +
        '<p class="card-addr">' + esc(u.address) + "</p>" + act +
        (chips ? '<div class="chips">' + chips + "</div>" : "") +
        '<p class="card-meta">' + esc(T.meets) + " " + esc(tr(T.day, u.meetingDay)) + " · " + esc(contactText(u)) + ig + "</p>" +
      "</button>"
    );
  }

  function statusText(kind, q, n) {
    if (kind === "none") return T.statusNone;
    if (kind === "search") return '<span class="accent">' + esc(q) + "</span> · " + n;
    if (kind === "map") return T.statusMap(n);
    return T.statusAll(n);
  }

  function render(kind, ordered, anchor, q) {
    lastState = { kind: kind, ordered: ordered, anchor: anchor, q: q || "" };
    activeId = null;
    $list.innerHTML = ordered.map(function (u, i) { return "<li>" + cardHtml(u, i + 1, anchor) + "</li>"; }).join("");

    unitLayer.clearLayers(); markerInfo = {};
    ordered.forEach(function (u, i) {
      var rank = i + 1, color = colorOf(u);
      var marker = L.marker([u.lat, u.lng], { icon: unitIcon(rank, false, color), title: u.name, keyboard: true, alt: u.name });
      marker.bindPopup(popupHtml(u, anchor));
      marker.on("click", function () { setActive(u.id, false); });
      unitLayer.addLayer(marker);
      markerInfo[u.id] = { marker: marker, rank: rank, color: color };
    });

    if (anchorMarker) { map.removeLayer(anchorMarker); anchorMarker = null; }
    if (anchor) {
      anchorMarker = L.marker([anchor.lat, anchor.lng], { icon: anchorIcon(), zIndexOffset: 1000, title: anchor.label || "", alt: "" });
      anchorMarker.bindPopup('<div class="popup-name">' + esc(anchor.label || "") + "</div>");
      anchorMarker.addTo(map);
    }

    $status.innerHTML = statusText(kind, q, ordered.length);
    $empty.hidden = !(kind === "none");
    $list.hidden = ordered.length === 0;
    $reset.hidden = !(anchor || kind === "none");
    fitView(ordered, anchor);
  }

  function fitView(ordered, anchor) {
    var pts = [];
    if (anchor) { pts.push([anchor.lat, anchor.lng]); ordered.slice(0, 5).forEach(function (u) { pts.push([u.lat, u.lng]); }); }
    else ordered.forEach(function (u) { pts.push([u.lat, u.lng]); });
    if (pts.length === 0) return;
    if (pts.length === 1) { map.setView(pts[0], 12); return; }
    map.fitBounds(L.latLngBounds(pts), { padding: [44, 44], maxZoom: 13 });
  }

  // ── interactions ───────────────────────────────────────────────────
  function setActive(id, fly) {
    var info = markerInfo[id];
    if (!info) return;
    if (activeId && markerInfo[activeId]) { var p = markerInfo[activeId]; p.marker.setIcon(unitIcon(p.rank, false, p.color)); }
    info.marker.setIcon(unitIcon(info.rank, true, info.color));
    activeId = id;
    $list.querySelectorAll(".result-card").forEach(function (c) {
      var on = c.getAttribute("data-id") === id;
      c.classList.toggle("is-active", on);
      if (on) c.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    var u = findUnit(id);
    if (u) { if (isMobile()) setView("map"); if (fly) map.flyTo([u.lat, u.lng], Math.max(map.getZoom(), 12), { duration: 0.6 }); info.marker.openPopup(); }
  }
  function findUnit(id) { for (var i = 0; i < UNITS.length; i++) if (UNITS[i].id === id) return UNITS[i]; return null; }
  function sortByAnchor(anchor) { return UNITS.slice().sort(function (a, b) { return haversine(anchor, a) - haversine(anchor, b); }); }

  function doSearch(query) {
    var matched = matchUnits(query);
    if (matched.length === 0) { render("none", [], null, query.trim()); return; }
    var anchor = centroid(matched); anchor.label = '"' + query.trim() + '"';
    render("search", sortByAnchor(anchor), anchor, query.trim());
  }
  function setAnchorFromMap(latlng) { var anchor = { lat: latlng.lat, lng: latlng.lng, label: T.refMap }; render("map", sortByAnchor(anchor), anchor, ""); }
  function showAll() { $input.value = ""; render("all", UNITS.slice(), null, ""); }

  // ── legend (region) ─────────────────────────────────────────────────
  function buildLegend() {
    var seen = {}, items = [];
    UNITS.forEach(function (u) { if (u.region && !seen[u.region]) { seen[u.region] = true; items.push({ color: colorOf(u), label: u.region }); } });
    if ($legend) { $legend.remove(); $legend = null; }
    if (!items.length || !$results) return;
    var det = document.createElement("details");
    det.className = "legend";
    det.innerHTML = "<summary>" + esc(T.legend(items.length)) + "</summary><ul class='legend-list'>" +
      items.map(function (it) { return '<li class="legend-item"><span class="legend-swatch" style="background:' + it.color + '"></span><span class="legend-name">' + esc(it.label) + "</span></li>"; }).join("") + "</ul>";
    $results.appendChild(det);
    $legend = det;
  }

  // ── view toggle ─────────────────────────────────────────────────────
  function setView(view) {
    document.body.classList.toggle("view-map", view === "map");
    document.body.classList.toggle("view-list", view !== "map");
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === view ? "true" : "false"); });
    if (view === "map" && map) setTimeout(function () { map.invalidateSize(); }, 60);
  }

  // ── downloads ──────────────────────────────────────────────────────
  function triggerDownload(filename, text, mime) {
    var blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }
  function dataJsText() {
    return "// scout-finder data\n" +
      "window.SCOUT_UNITS = " + JSON.stringify(UNITS, null, 2) + ";\n\n" +
      "window.SCOUT_NSOS = " + JSON.stringify(window.SCOUT_NSOS || []) + ";\n\n" +
      "window.SCOUT_REGION_COLORS = " + JSON.stringify(REGION_COLORS, null, 2) + ";\n";
  }

  function applyStatic() {
    document.documentElement.lang = "en";
    var byId = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    byId("site-title", T.title);
    if ($badge) $badge.textContent = T.badge;
    $input.setAttribute("placeholder", T.ph);
    byId("search-hint", T.hint);
    var go = document.querySelector(".search-go"); if (go) go.textContent = T.go;
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) { b.textContent = b.getAttribute("data-view") === "map" ? T.map : T.list; });
    $reset.textContent = T.showAll;
    document.querySelectorAll("[data-reset]").forEach(function (b) { b.textContent = T.showAll; });
    var et = document.querySelector(".empty-title"); if (et) et.textContent = T.emptyTitle;
    var es = document.querySelector(".empty-sub"); if (es) es.textContent = T.emptySub;
    byId("footer-admin", T.admin);
    if ($dlJson) $dlJson.textContent = T.dlJson;
    if ($dlJs) $dlJs.textContent = T.dlJs;
    byId("footer-note", T.note);
  }

  // ── 서버 로드 (Cloudflare KV) → 폴백 data.js ────────────────────────
  function loadFromServer() {
    return fetch("/api/units", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && Array.isArray(j.units) && j.units.length) UNITS = j.units; })
      .catch(function () { /* 폴백: data.js */ });
  }

  // ── init ───────────────────────────────────────────────────────────
  function init() {
    map = L.map("map", { zoomControl: true }).setView([20, 60], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    unitLayer.addTo(map);

    $list.addEventListener("click", function (e) { var card = e.target.closest(".result-card"); if (card) setActive(card.getAttribute("data-id"), true); });
    $form.addEventListener("submit", function (e) { e.preventDefault(); var q = $input.value.trim(); if (q) doSearch(q); else showAll(); });
    map.on("click", function (e) { setAnchorFromMap(e.latlng); });
    $reset.addEventListener("click", showAll);
    $empty.addEventListener("click", function (e) { if (e.target.closest("[data-reset]")) showAll(); });
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-view")); }); });
    if ($dlJson) $dlJson.addEventListener("click", function () { triggerDownload("scout-units.json", JSON.stringify(UNITS, null, 2), "application/json"); });
    if ($dlJs) $dlJs.addEventListener("click", function () { triggerDownload("data.js", dataJsText(), "text/javascript"); });

    applyStatic();
    loadFromServer().then(function () { buildLegend(); showAll(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
