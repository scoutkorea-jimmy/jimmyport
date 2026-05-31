/* =========================================================================
 * scout-finder — app logic (public)
 * -------------------------------------------------------------------------
 * - 검색: name / type / federation / council / address 부분일치
 * - 일치 항목들의 좌표 centroid 를 기준점(anchor)으로 설정
 * - haversine 으로 anchor → 전체 항목 거리 계산, 오름차순 정렬
 * - 지도 클릭 시 그 지점을 anchor 로 삼아 동일하게 재정렬 (GPS 대체)
 * - 핀 색상 = 지방·특수연맹별 고유색 (window.SCOUT_FEDERATION_COLORS)
 * - 관리자 편집본(localStorage)이 있으면 그것으로 미리보기
 * ========================================================================= */
(function () {
  "use strict";

  var DRAFT_KEY = "scoutfinder:units";
  var FED_COLORS = window.SCOUT_FEDERATION_COLORS || {};
  var DEFAULT_COLOR = "#622599";
  var MOBILE = "(max-width: 820px)";

  function loadUnits() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return { units: arr, draft: true }; }
    } catch (e) { /* noop */ }
    return { units: Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : [], draft: false };
  }
  var loaded = loadUnits();
  var UNITS = loaded.units;

  // ── DOM ────────────────────────────────────────────────────────────
  var $form   = document.getElementById("search-form");
  var $input  = document.getElementById("search-input");
  var $list   = document.getElementById("result-list");
  var $status = document.getElementById("status");
  var $reset  = document.getElementById("reset-btn");
  var $empty  = document.getElementById("empty-state");
  var $badge  = document.querySelector(".badge");
  var $dlJson = document.getElementById("download-json");
  var $dlJs   = document.getElementById("download-js");
  var $results = document.querySelector(".results");

  // ── state ──────────────────────────────────────────────────────────
  var map, unitLayer = L.layerGroup(), anchorMarker = null, markerInfo = {}, activeId = null;

  // ── utils ──────────────────────────────────────────────────────────
  function toRad(d) { return (d * Math.PI) / 180; }
  function haversine(a, b) {
    var R = 6371, dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
  function centroid(units) {
    var lat = 0, lng = 0;
    units.forEach(function (u) { lat += u.lat; lng += u.lng; });
    return { lat: lat / units.length, lng: lng / units.length };
  }
  function fmtKm(km) { return km.toFixed(1) + "km"; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function colorOf(u) { return FED_COLORS[u.federation] || DEFAULT_COLOR; }
  function textOn(hex) {
    var c = String(hex).replace("#", "");
    if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join("");
    var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#221b2b" : "#ffffff";
  }
  function isMobile() { return window.matchMedia(MOBILE).matches; }

  // ── search ─────────────────────────────────────────────────────────
  function matchUnits(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return UNITS.filter(function (u) {
      return [u.name, u.type, u.federation, u.council, u.address].join(" ").toLowerCase().indexOf(q) !== -1;
    });
  }

  // ── icons ──────────────────────────────────────────────────────────
  function unitIcon(rank, active, color) {
    return L.divIcon({
      className: "unit-pin" + (active ? " is-active" : ""),
      html: '<div class="unit-pin-dot" style="background:' + color + '"><span style="color:' +
            textOn(color) + '">' + rank + "</span></div>",
      iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
    });
  }
  function anchorIcon() {
    return L.divIcon({ className: "anchor-pin", html: '<div class="anchor-pin-dot"></div>',
      iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
  }

  // ── rendering ──────────────────────────────────────────────────────
  function affil(u) { return esc(u.federation) + (u.council ? " · " + esc(u.council) : ""); }

  function popupHtml(u, anchor) {
    var dist = anchor ? '<div class="popup-line"><strong>' + fmtKm(haversine(anchor, u)) + "</strong> 거리</div>" : "";
    return (
      '<div class="popup-name">' + esc(u.name) + (u.type ? ' <span class="popup-type">' + esc(u.type) + "</span>" : "") + "</div>" +
      '<div class="popup-affil">' + affil(u) + "</div>" +
      '<div class="popup-line">' + esc(u.address) + "</div>" +
      '<div class="popup-line">모임: ' + esc(u.meetingDay) + " · " + esc(u.contact) + "</div>" + dist
    );
  }

  function cardHtml(u, rank, anchor) {
    var distBadge = anchor ? '<span class="card-dist">' + fmtKm(haversine(anchor, u)) + "</span>" : "";
    var chips = (u.sections || []).map(function (s) { return '<span class="chip">' + esc(s) + "</span>"; }).join("");
    return (
      '<button type="button" class="result-card" data-id="' + esc(u.id) + '">' +
        '<div class="card-top">' +
          '<span class="card-rank" style="background:' + colorOf(u) + ';color:' + textOn(colorOf(u)) + '">' + rank + "</span>" +
          '<div class="card-heading">' +
            '<p class="card-name">' + esc(u.name) + (u.type ? ' <span class="card-type">' + esc(u.type) + "</span>" : "") + "</p>" +
            '<p class="card-affil">' + affil(u) + "</p>" +
          "</div>" + distBadge +
        "</div>" +
        '<p class="card-addr">' + esc(u.address) + "</p>" +
        '<p class="card-meta">모임 ' + esc(u.meetingDay) + " · " + esc(u.contact) + "</p>" +
        (chips ? '<div class="chips">' + chips + "</div>" : "") +
      "</button>"
    );
  }

  function render(ordered, anchor, statusText) {
    activeId = null;
    $list.innerHTML = ordered.map(function (u, i) { return "<li>" + cardHtml(u, i + 1, anchor) + "</li>"; }).join("");

    unitLayer.clearLayers();
    markerInfo = {};
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
      anchorMarker = L.marker([anchor.lat, anchor.lng], { icon: anchorIcon(), zIndexOffset: 1000, title: anchor.label || "기준 위치", alt: "기준 위치" });
      anchorMarker.bindPopup('<div class="popup-name">기준 위치</div><div class="popup-affil">' + esc(anchor.label || "") + "</div>");
      anchorMarker.addTo(map);
    }

    $status.innerHTML = statusText;
    $empty.hidden = ordered.length > 0;
    $list.hidden = ordered.length === 0;
    $reset.hidden = !anchor;
    fitView(ordered, anchor);
  }

  function fitView(ordered, anchor) {
    var pts = [];
    if (anchor) { pts.push([anchor.lat, anchor.lng]); ordered.slice(0, 5).forEach(function (u) { pts.push([u.lat, u.lng]); }); }
    else ordered.forEach(function (u) { pts.push([u.lat, u.lng]); });
    if (pts.length === 0) return;
    if (pts.length === 1) { map.setView(pts[0], 13); return; }
    map.fitBounds(L.latLngBounds(pts), { padding: [44, 44], maxZoom: 14 });
  }

  // ── interactions ───────────────────────────────────────────────────
  function setActive(id, fly) {
    var info = markerInfo[id];
    if (!info) return;
    if (activeId && markerInfo[activeId]) {
      var p = markerInfo[activeId];
      p.marker.setIcon(unitIcon(p.rank, false, p.color));
    }
    info.marker.setIcon(unitIcon(info.rank, true, info.color));
    activeId = id;

    $list.querySelectorAll(".result-card").forEach(function (c) {
      var on = c.getAttribute("data-id") === id;
      c.classList.toggle("is-active", on);
      if (on) c.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    var u = findUnit(id);
    if (u) {
      if (isMobile()) setView("map");
      if (fly) map.flyTo([u.lat, u.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
      info.marker.openPopup();
    }
  }
  function findUnit(id) { for (var i = 0; i < UNITS.length; i++) if (UNITS[i].id === id) return UNITS[i]; return null; }
  function sortByAnchor(anchor) { return UNITS.slice().sort(function (a, b) { return haversine(anchor, a) - haversine(anchor, b); }); }

  function doSearch(query) {
    var matched = matchUnits(query);
    if (matched.length === 0) { render([], null, "검색 결과 없음"); $reset.hidden = false; return; }
    var anchor = centroid(matched);
    anchor.label = '"' + query.trim() + '" 기준';
    var ordered = sortByAnchor(anchor);
    render(ordered, anchor, '<span class="accent">' + esc(query.trim()) + "</span> 기준 가까운 순 " + ordered.length + "곳");
  }
  function setAnchorFromMap(latlng) {
    var anchor = { lat: latlng.lat, lng: latlng.lng, label: "지도에서 선택한 위치" };
    render(sortByAnchor(anchor), anchor, "선택한 위치 기준 가까운 순 " + UNITS.length + "곳");
  }
  function showAll() { $input.value = ""; render(UNITS.slice(), null, "전체 단위대 " + UNITS.length + "곳"); }

  // ── legend ─────────────────────────────────────────────────────────
  function buildLegend() {
    var present = [];
    var seen = {};
    UNITS.forEach(function (u) { if (!seen[u.federation]) { seen[u.federation] = true; present.push(u.federation); } });
    if (!present.length || !$results) return;
    var det = document.createElement("details");
    det.className = "legend";
    det.innerHTML = "<summary>연맹 색상 (" + present.length + ")</summary>" +
      '<ul class="legend-list">' + present.map(function (f) {
        return '<li class="legend-item"><span class="legend-swatch" style="background:' +
          (FED_COLORS[f] || DEFAULT_COLOR) + '"></span><span class="legend-name">' + esc(f) + "</span></li>";
      }).join("") + "</ul>";
    $results.appendChild(det);
  }

  // ── view toggle (모바일) ────────────────────────────────────────────
  function setView(view) {
    document.body.classList.toggle("view-map", view === "map");
    document.body.classList.toggle("view-list", view !== "map");
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-view") === view ? "true" : "false");
    });
    if (view === "map" && map) setTimeout(function () { map.invalidateSize(); }, 60);
  }

  // ── downloads ──────────────────────────────────────────────────────
  function triggerDownload(filename, text, mime) {
    var blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }
  function dataJsText(units) {
    return "// ⬇️ 실제 데이터로 교체\n" +
      "// scout-finder 데이터. 스키마: { id, name, type, federation, council, address, lat, lng, sections[], meetingDay, contact, note }\n\n" +
      "window.SCOUT_UNITS = " + JSON.stringify(units, null, 2) + ";\n\n" +
      "window.SCOUT_FEDERATIONS = " + JSON.stringify(window.SCOUT_FEDERATIONS || [], null, 2) + ";\n\n" +
      "window.SCOUT_FEDERATION_COLORS = " + JSON.stringify(FED_COLORS, null, 2) + ";\n";
  }

  // ── init ───────────────────────────────────────────────────────────
  function init() {
    if ($badge && loaded.draft) { $badge.textContent = "편집본 미리보기"; $badge.title = "관리자에서 편집한 로컬 데이터로 표시 중입니다 (커밋 전)."; }

    map = L.map("map", { zoomControl: true }).setView([36.5, 127.8], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자',
    }).addTo(map);
    unitLayer.addTo(map);

    $list.addEventListener("click", function (e) {
      var card = e.target.closest(".result-card");
      if (card) setActive(card.getAttribute("data-id"), true);
    });
    $form.addEventListener("submit", function (e) { e.preventDefault(); var q = $input.value.trim(); if (q) doSearch(q); else showAll(); });
    map.on("click", function (e) { setAnchorFromMap(e.latlng); });
    $reset.addEventListener("click", showAll);
    $empty.addEventListener("click", function (e) { if (e.target.closest("[data-reset]")) showAll(); });
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) {
      b.addEventListener("click", function () { setView(b.getAttribute("data-view")); });
    });
    if ($dlJson) $dlJson.addEventListener("click", function () { triggerDownload("scout-units.json", JSON.stringify(UNITS, null, 2), "application/json"); });
    if ($dlJs) $dlJs.addEventListener("click", function () { triggerDownload("data.js", dataJsText(UNITS), "text/javascript"); });

    buildLegend();
    showAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
