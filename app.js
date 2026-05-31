/* =========================================================================
 * scout-finder — app logic (public)
 * -------------------------------------------------------------------------
 * - 영어 기본 + 한/영 토글 (외국인 우선). LANG = localStorage["scoutfinder:lang"].
 * - 검색: name/type/federation/council/country/address 부분일치 → centroid anchor
 * - haversine 거리 오름차순 정렬. 지도 클릭 시 그 좌표로 재정렬.
 * - 핀 색: 연맹색(한국) > 국가색 > 기본색.
 * ========================================================================= */
(function () {
  "use strict";

  var DRAFT_KEY = "scoutfinder:units";
  var LANG_KEY = "scoutfinder:lang";
  var FED_COLORS = window.SCOUT_FEDERATION_COLORS || {};
  var COUNTRY_COLORS = window.SCOUT_COUNTRY_COLORS || {};
  var APR = window.SCOUT_APR_COUNTRIES || [];
  var DEFAULT_COLOR = "#622599";
  var MOBILE = "(max-width: 820px)";

  var LANG = "en"; // 홈페이지는 영어 전용 (한국어/토글 없음)

  // ── i18n ───────────────────────────────────────────────────────────
  var I18N = {
    en: {
      title: "Find Scout Units Near You", badge: "Sample data", preview: "Edit preview",
      ph: "Search a region (e.g. Suwon, Gangnam, Seoul)",
      hint: "Or click the map to set your reference point.",
      go: "Search", list: "List", map: "Map", showAll: "Show all",
      emptyTitle: "No results.", emptySub: "Try another region, or click the map to set a location.",
      legend: function (n) { return "Pin colors (" + n + ")"; },
      admin: "Admin", dlJson: "Download data (JSON)", dlJs: "Download data.js", note: "Running on sample data",
      statusAll: function (n) { return "All units · " + n; },
      statusNear: function (q, n) { return 'Nearest to "' + q + '" · ' + n; },
      statusMap: function (n) { return "Nearest to selected point · " + n; },
      statusNone: "No results", refMap: "Selected location",
      meets: "Meets", activities: "Main activities", recruiting: "Recruiting",
      contactDefault: "Contact the federation", instagram: "Instagram",
      type: { "지역대": "Community unit", "학교대": "School unit" },
      section: { "비버": "Beaver", "컵": "Cub", "스카우트": "Scout", "벤처": "Venture", "로버": "Rover" },
      day: { "월요일": "Monday", "화요일": "Tuesday", "수요일": "Wednesday", "목요일": "Thursday", "금요일": "Friday", "토요일": "Saturday", "일요일": "Sunday" },
    },
    ko: {
      title: "내 주변 스카우트 단위대 찾기", badge: "샘플 데이터", preview: "편집본 미리보기",
      ph: "지역을 검색하세요 (예: 수원, 강남구, 영통동)",
      hint: "또는 지도를 클릭해 기준 위치를 정하세요.",
      go: "검색", list: "목록", map: "지도", showAll: "전체 보기",
      emptyTitle: "검색 결과가 없습니다.", emptySub: "다른 지역명으로 검색하거나, 지도를 클릭해 위치를 정해보세요.",
      legend: function (n) { return "핀 색상 (" + n + ")"; },
      admin: "관리자", dlJson: "데이터 다운로드 (JSON)", dlJs: "data.js 다운로드", note: "샘플 데이터로 동작 중",
      statusAll: function (n) { return "전체 단위대 " + n + "곳"; },
      statusNear: function (q, n) { return '"' + q + '" 기준 가까운 순 ' + n + "곳"; },
      statusMap: function (n) { return "선택한 위치 기준 가까운 순 " + n + "곳"; },
      statusNone: "검색 결과 없음", refMap: "지도에서 선택한 위치",
      meets: "모임", activities: "주요 활동", recruiting: "모집 카테고리",
      contactDefault: "지방연맹 문의", instagram: "인스타그램",
      type: { "지역대": "지역대", "학교대": "학교대" },
      section: { "비버": "비버", "컵": "컵", "스카우트": "스카우트", "벤처": "벤처", "로버": "로버" },
      day: { "월요일": "월요일", "화요일": "화요일", "수요일": "수요일", "목요일": "목요일", "금요일": "금요일", "토요일": "토요일", "일요일": "일요일" },
    },
  };
  function L() { return I18N[LANG]; }
  function tr(map, v) { return (map && map[v]) || v || ""; }

  // ── data ───────────────────────────────────────────────────────────
  function loadUnits() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) return { units: arr, draft: true }; }
    } catch (e) {}
    return { units: Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : [], draft: false };
  }
  var loaded = loadUnits();
  var UNITS = loaded.units;
  var COUNTRY_EN = (function () { var m = {}; APR.forEach(function (c) { m[c.ko] = c.en; }); return m; })();

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
  function colorOf(u) { return FED_COLORS[u.federation] || COUNTRY_COLORS[u.country || "대한민국"] || DEFAULT_COLOR; }
  function textOn(hex) {
    var c = String(hex).replace("#", "");
    if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join("");
    var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#221b2b" : "#ffffff";
  }
  function isMobile() { return window.matchMedia(MOBILE).matches; }

  function countryName(u) {
    var ko = u.country || "대한민국";
    if (LANG === "en") return u.country_en || COUNTRY_EN[ko] || ko;
    return ko;
  }
  function orgLine(u) {
    // 외국인 대상: 국가 · 지방연맹(있을 경우)까지만. 지구연합회(council)는 표기하지 않음.
    return [countryName(u), u.federation].filter(Boolean).map(esc).join(" · ");
  }
  function contactText(u) { return (u.contact && String(u.contact).trim()) ? u.contact : L().contactDefault; }

  // ── search ─────────────────────────────────────────────────────────
  function matchUnits(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return UNITS.filter(function (u) {
      return [u.name, u.type, u.federation, u.council, u.country, u.country_en, COUNTRY_EN[u.country], u.address]
        .join(" ").toLowerCase().indexOf(q) !== -1;
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
  function chipsHtml(u) {
    return (u.sections || []).map(function (s) { return '<span class="chip">' + esc(tr(L().section, s)) + "</span>"; }).join("");
  }

  function popupHtml(u, anchor) {
    var t = L();
    var dist = anchor ? '<div class="popup-line"><strong>' + fmtKm(haversine(anchor, u)) + "</strong></div>" : "";
    var act = u.note ? '<div class="popup-line"><b>' + esc(t.activities) + ":</b> " + esc(u.note) + "</div>" : "";
    var rec = (u.sections && u.sections.length) ? '<div class="popup-line"><b>' + esc(t.recruiting) + ":</b> " + u.sections.map(function (s) { return esc(tr(t.section, s)); }).join(", ") + "</div>" : "";
    var ig = u.instagram ? ' · <a class="popup-ig" href="' + escAttr(u.instagram) + '" target="_blank" rel="noopener">' + esc(t.instagram) + "</a>" : "";
    return (
      '<div class="popup-name">' + esc(u.name) + (u.type ? ' <span class="popup-type">' + esc(tr(t.type, u.type)) + "</span>" : "") + "</div>" +
      '<div class="popup-affil">' + orgLine(u) + "</div>" +
      '<div class="popup-line">' + esc(u.address) + "</div>" + act + rec +
      '<div class="popup-line">' + esc(t.meets) + " " + esc(tr(t.day, u.meetingDay)) + " · " + esc(contactText(u)) + ig + "</div>" + dist
    );
  }

  function cardHtml(u, rank, anchor) {
    var t = L();
    var color = colorOf(u);
    var distBadge = anchor ? '<span class="card-dist">' + fmtKm(haversine(anchor, u)) + "</span>" : "";
    var chips = chipsHtml(u);
    var act = u.note ? '<p class="card-meta"><span class="card-field-label">' + esc(t.activities) + ":</span> " + esc(u.note) + "</p>" : "";
    var ig = u.instagram ? " · " + esc(t.instagram) : "";
    return (
      '<button type="button" class="result-card" data-id="' + escAttr(u.id) + '">' +
        '<div class="card-top">' +
          '<span class="card-rank" style="background:' + color + ";color:" + textOn(color) + '">' + rank + "</span>" +
          '<div class="card-heading">' +
            '<p class="card-name">' + esc(u.name) + (u.type ? ' <span class="card-type">' + esc(tr(t.type, u.type)) + "</span>" : "") + "</p>" +
            '<p class="card-affil">' + orgLine(u) + "</p>" +
          "</div>" + distBadge +
        "</div>" +
        '<p class="card-addr">' + esc(u.address) + "</p>" + act +
        (chips ? '<div class="chips">' + chips + "</div>" : "") +
        '<p class="card-meta">' + esc(t.meets) + " " + esc(tr(t.day, u.meetingDay)) + " · " + esc(contactText(u)) + ig + "</p>" +
      "</button>"
    );
  }

  function statusText(kind, q, n) {
    var t = L();
    if (kind === "none") return t.statusNone;
    if (kind === "search") return '<span class="accent">' + esc(q) + "</span> · " + n;
    if (kind === "map") return t.statusMap(n);
    return t.statusAll(n);
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
    $empty.hidden = ordered.length > 0 || kind === "all" || kind === "search" || kind === "map";
    if (kind === "none") $empty.hidden = false;
    $list.hidden = ordered.length === 0;
    $reset.hidden = !(anchor || kind === "none");
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

  function relayout() { render(lastState.kind, lastState.ordered, lastState.anchor, lastState.q); }

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
  function setAnchorFromMap(latlng) {
    var anchor = { lat: latlng.lat, lng: latlng.lng, label: L().refMap };
    render("map", sortByAnchor(anchor), anchor, "");
  }
  function showAll() { $input.value = ""; render("all", UNITS.slice(), null, ""); }

  // ── legend ─────────────────────────────────────────────────────────
  function buildLegend() {
    var seen = {}, items = [];
    UNITS.forEach(function (u) {
      var isFed = !!FED_COLORS[u.federation];
      var key = isFed ? u.federation : (u.country || "대한민국");
      if (seen[key]) return; seen[key] = true;
      var label = isFed ? u.federation : countryName(u);
      items.push({ color: colorOf(u), label: label });
    });
    if (!items.length || !$results) return;
    if ($legend) $legend.remove();
    var det = document.createElement("details");
    det.className = "legend";
    det.innerHTML = "<summary>" + esc(L().legend(items.length)) + "</summary><ul class='legend-list'>" +
      items.map(function (it) { return '<li class="legend-item"><span class="legend-swatch" style="background:' + it.color + '"></span><span class="legend-name">' + esc(it.label) + "</span></li>"; }).join("") + "</ul>";
    $results.appendChild(det);
    $legend = det;
  }

  // ── view toggle (모바일) ────────────────────────────────────────────
  function setView(view) {
    document.body.classList.toggle("view-map", view === "map");
    document.body.classList.toggle("view-list", view !== "map");
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === view ? "true" : "false"); });
    if (view === "map" && map) setTimeout(function () { map.invalidateSize(); }, 60);
  }

  // ── language ───────────────────────────────────────────────────────
  function applyStaticI18n() {
    var t = L();
    document.documentElement.lang = LANG;
    var byId = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    byId("site-title", t.title);
    if ($badge) $badge.textContent = loaded.draft ? t.preview : t.badge;
    $input.setAttribute("placeholder", t.ph);
    byId("search-hint", t.hint);
    var go = document.querySelector(".search-go"); if (go) go.textContent = t.go;
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) { b.textContent = b.getAttribute("data-view") === "map" ? t.map : t.list; });
    $reset.textContent = t.showAll;
    document.querySelectorAll("[data-reset]").forEach(function (b) { b.textContent = t.showAll; });
    var et = document.querySelector(".empty-title"); if (et) et.textContent = t.emptyTitle;
    var es = document.querySelector(".empty-sub"); if (es) es.textContent = t.emptySub;
    byId("footer-admin", t.admin);
    if ($dlJson) $dlJson.textContent = t.dlJson;
    if ($dlJs) $dlJs.textContent = t.dlJs;
    byId("footer-note", t.note);
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
      "// 스키마: { id, name, type, country, country_en, federation, council, address, lat, lng, sections[], meetingDay, contact, instagram, note }\n\n" +
      "window.SCOUT_UNITS = " + JSON.stringify(units, null, 2) + ";\n\n" +
      "window.SCOUT_FEDERATIONS = " + JSON.stringify(window.SCOUT_FEDERATIONS || [], null, 2) + ";\n\n" +
      "window.SCOUT_FEDERATION_COLORS = " + JSON.stringify(FED_COLORS, null, 2) + ";\n\n" +
      "window.SCOUT_APR_COUNTRIES = " + JSON.stringify(APR, null, 2) + ";\n\n" +
      "window.SCOUT_COUNTRY_COLORS = " + JSON.stringify(COUNTRY_COLORS, null, 2) + ";\n";
  }

  // ── init ───────────────────────────────────────────────────────────
  function init() {
    map = L.map("map", { zoomControl: true }).setView([20, 120], 4); // APR 전체가 보이도록
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
    if ($dlJs) $dlJs.addEventListener("click", function () { triggerDownload("data.js", dataJsText(UNITS), "text/javascript"); });

    applyStaticI18n();
    buildLegend();
    showAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
