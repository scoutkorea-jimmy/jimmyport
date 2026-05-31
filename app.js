/* =========================================================================
 * scout-finder — app logic
 * -------------------------------------------------------------------------
 * - 검색: name / federation / district / address 부분일치
 * - 일치 항목들의 좌표 centroid 를 기준점(anchor)으로 설정
 * - haversine 으로 anchor → 전체 항목 거리 계산, 오름차순 정렬
 * - 지도 클릭 시 그 지점을 anchor 로 삼아 동일하게 재정렬 (GPS 대체)
 * - 데이터(data.js)와 완전히 분리: window.SCOUT_UNITS 만 읽습니다.
 * ========================================================================= */
(function () {
  "use strict";

  var UNITS = Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : [];

  // ── DOM ────────────────────────────────────────────────────────────
  var $form    = document.getElementById("search-form");
  var $input   = document.getElementById("search-input");
  var $list    = document.getElementById("result-list");
  var $status  = document.getElementById("status");
  var $reset   = document.getElementById("reset-btn");
  var $empty   = document.getElementById("empty-state");

  // ── state ──────────────────────────────────────────────────────────
  var map;
  var unitLayer = L.layerGroup();
  var anchorMarker = null;
  var markerInfo = {};      // id -> { marker, rank }
  var activeId = null;

  // ── geo utils ──────────────────────────────────────────────────────
  function toRad(d) { return (d * Math.PI) / 180; }

  // 두 좌표 사이 거리 (km)
  function haversine(a, b) {
    var R = 6371;
    var dLat = toRad(b.lat - a.lat);
    var dLng = toRad(b.lng - a.lng);
    var s =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  function centroid(units) {
    var lat = 0, lng = 0;
    units.forEach(function (u) { lat += u.lat; lng += u.lng; });
    return { lat: lat / units.length, lng: lng / units.length };
  }

  function fmtKm(km) { return km.toFixed(1) + "km"; }

  // ── search ─────────────────────────────────────────────────────────
  function matchUnits(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return UNITS.filter(function (u) {
      var hay = (u.name + " " + u.federation + " " + u.district + " " + u.address).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  // ── icons ──────────────────────────────────────────────────────────
  function unitIcon(rank, active) {
    return L.divIcon({
      className: "unit-pin" + (active ? " is-active" : ""),
      html: '<div class="unit-pin-dot"><span>' + rank + "</span></div>",
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -26],
    });
  }

  function anchorIcon() {
    return L.divIcon({
      className: "anchor-pin",
      html: '<div class="anchor-pin-dot">●</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14],
    });
  }

  // ── rendering ──────────────────────────────────────────────────────
  function popupHtml(u, anchor) {
    var dist = anchor
      ? '<div class="popup-line"><strong>' + fmtKm(haversine(anchor, u)) + "</strong> 거리</div>"
      : "";
    return (
      '<div class="popup-name">' + esc(u.name) + "</div>" +
      '<div class="popup-affil">' + esc(u.federation) + " · " + esc(u.district) + "</div>" +
      '<div class="popup-line">' + esc(u.address) + "</div>" +
      '<div class="popup-line">모임: ' + esc(u.meetingDay) + " · " + esc(u.contact) + "</div>" +
      dist
    );
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function cardHtml(u, rank, anchor) {
    var distBadge = anchor
      ? '<span class="card-dist">' + fmtKm(haversine(anchor, u)) + "</span>"
      : "";
    var chips = (u.sections || [])
      .map(function (s) { return '<span class="chip">' + esc(s) + "</span>"; })
      .join("");
    return (
      '<button type="button" class="result-card" data-id="' + esc(u.id) + '">' +
        '<div class="card-top">' +
          '<span class="card-rank">' + rank + "</span>" +
          '<div class="card-heading">' +
            '<p class="card-name">' + esc(u.name) + "</p>" +
            '<p class="card-affil">' + esc(u.federation) + " · " + esc(u.district) + "</p>" +
          "</div>" +
          distBadge +
        "</div>" +
        '<p class="card-addr">' + esc(u.address) + "</p>" +
        '<p class="card-meta">모임 ' + esc(u.meetingDay) + " · " + esc(u.contact) + "</p>" +
        (chips ? '<div class="chips">' + chips + "</div>" : "") +
      "</button>"
    );
  }

  // ordered: 정렬된 유닛 배열, anchor: 기준점(없으면 null)
  function render(ordered, anchor, statusText) {
    activeId = null;

    // 목록
    $list.innerHTML = ordered
      .map(function (u, i) { return "<li>" + cardHtml(u, i + 1, anchor) + "</li>"; })
      .join("");

    // 마커
    unitLayer.clearLayers();
    markerInfo = {};
    ordered.forEach(function (u, i) {
      var rank = i + 1;
      var marker = L.marker([u.lat, u.lng], {
        icon: unitIcon(rank, false),
        title: u.name,
        keyboard: true,
        alt: u.name,
      });
      marker.bindPopup(popupHtml(u, anchor));
      marker.on("click", function () { setActive(u.id, false); });
      unitLayer.addLayer(marker);
      markerInfo[u.id] = { marker: marker, rank: rank };
    });

    // 기준점 마커
    if (anchorMarker) { map.removeLayer(anchorMarker); anchorMarker = null; }
    if (anchor) {
      anchorMarker = L.marker([anchor.lat, anchor.lng], {
        icon: anchorIcon(),
        zIndexOffset: 1000,
        title: anchor.label || "기준 위치",
        alt: "기준 위치",
      });
      anchorMarker.bindPopup('<div class="popup-name">기준 위치</div>' +
        '<div class="popup-affil">' + esc(anchor.label || "") + "</div>");
      anchorMarker.addTo(map);
    }

    // 상태 + 뷰
    $status.innerHTML = statusText;
    $empty.hidden = ordered.length > 0;
    $list.hidden = ordered.length === 0;
    $reset.hidden = !anchor;

    fitView(ordered, anchor);
  }

  function fitView(ordered, anchor) {
    var pts = [];
    if (anchor) {
      pts.push([anchor.lat, anchor.lng]);
      ordered.slice(0, 5).forEach(function (u) { pts.push([u.lat, u.lng]); });
    } else {
      ordered.forEach(function (u) { pts.push([u.lat, u.lng]); });
    }
    if (pts.length === 0) return;
    if (pts.length === 1) { map.setView(pts[0], 13); return; }
    map.fitBounds(L.latLngBounds(pts), { padding: [44, 44], maxZoom: 14 });
  }

  // ── interactions ───────────────────────────────────────────────────
  function setActive(id, fly) {
    var info = markerInfo[id];
    if (!info) return;

    if (activeId && markerInfo[activeId]) {
      var prev = markerInfo[activeId];
      prev.marker.setIcon(unitIcon(prev.rank, false));
    }
    info.marker.setIcon(unitIcon(info.rank, true));
    activeId = id;

    var cards = $list.querySelectorAll(".result-card");
    cards.forEach(function (c) {
      var on = c.getAttribute("data-id") === id;
      c.classList.toggle("is-active", on);
      if (on) c.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    var u = findUnit(id);
    if (u) {
      if (fly) map.flyTo([u.lat, u.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
      info.marker.openPopup();
    }
  }

  function findUnit(id) {
    for (var i = 0; i < UNITS.length; i++) if (UNITS[i].id === id) return UNITS[i];
    return null;
  }

  // anchor 기준 전체 정렬
  function sortByAnchor(anchor) {
    return UNITS.slice().sort(function (a, b) {
      return haversine(anchor, a) - haversine(anchor, b);
    });
  }

  function doSearch(query) {
    var matched = matchUnits(query);
    if (matched.length === 0) {
      // 결과 없음: 목록 비움 + 안내, 마커는 전체 유지
      render([], null, '검색 결과 없음');
      $reset.hidden = false;
      return;
    }
    var anchor = centroid(matched);
    anchor.label = '"' + query.trim() + '" 기준';
    var ordered = sortByAnchor(anchor);
    render(ordered, anchor,
      '<span class="accent">' + esc(query.trim()) + "</span> 기준 가까운 순 " + ordered.length + "곳");
  }

  function setAnchorFromMap(latlng) {
    var anchor = { lat: latlng.lat, lng: latlng.lng, label: "지도에서 선택한 위치" };
    var ordered = sortByAnchor(anchor);
    render(ordered, anchor, '선택한 위치 기준 가까운 순 ' + ordered.length + "곳");
  }

  function showAll() {
    $input.value = "";
    render(UNITS.slice(), null, "전체 지역대 " + UNITS.length + "곳");
  }

  // ── init ───────────────────────────────────────────────────────────
  function init() {
    map = L.map("map", { zoomControl: true }).setView([36.5, 127.8], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자',
    }).addTo(map);
    unitLayer.addTo(map);

    // 카드 클릭 (이벤트 위임)
    $list.addEventListener("click", function (e) {
      var card = e.target.closest(".result-card");
      if (card) setActive(card.getAttribute("data-id"), true);
    });

    // 검색
    $form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = $input.value.trim();
      if (q) doSearch(q);
      else showAll();
    });

    // 지도 클릭 → 기준점 재설정
    map.on("click", function (e) { setAnchorFromMap(e.latlng); });

    // 전체 보기 (헤더 버튼 + 빈 상태 버튼)
    $reset.addEventListener("click", showAll);
    $empty.addEventListener("click", function (e) {
      if (e.target.closest("[data-reset]")) showAll();
    });

    showAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
