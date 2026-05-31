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
    ph: "Search a country, NSO, or unit (e.g. Korea, Japan, Fiji)",
    hint: "Or click the map to set your reference point.",
    go: "Search", list: "List", map: "Map", showAll: "Show all",
    emptyTitle: "No results.", emptySub: "Try another keyword, or click the map to set a location.",
    legend: function (n) { return "Region colors (" + n + ")"; },
    admin: "Admin", dlJson: "Download data (JSON)", dlJs: "Download data.js", note: "Running on sample data",
    statusAll: function (n) { return "All units · " + n; },
    statusMap: function (n) { return "Nearest to selected point · " + n; },
    statusNone: "No results", refMap: "Selected location",
    activities: "About", recruiting: "Recruiting",
    homepage: "Homepage (Instagram)", homepageDefault: "Contact the national scout organization",
  };

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
  var legendControl = null;

  // ── state ──────────────────────────────────────────────────────────
  var UNITS = Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : [];
  var map, unitLayer = L.layerGroup(), anchorMarker = null, markerInfo = {}, activeId = null;
  var lastState = { kind: "all", ordered: [], anchor: null, q: "" };
  var openCmtId = null, cmtCache = {};
  var NICK_KEY = "scoutfinder:nick";
  var PAGE = 10;
  // editor (home inline editing)
  var NSOS = window.SCOUT_NSOS || [];
  var TOKEN_KEY = "scoutfinder:adminToken";
  var editMode = false, saveTimer = null;
  var SECS = ["Beaver", "Cub", "Scout", "Venture", "Rover"];
  function round5(n) { return Math.round(n * 1e5) / 1e5; }
  function applyCountry(u) { for (var k = 0; k < NSOS.length; k++) { if (NSOS[k].country === u.country) { u.country_ko = NSOS[k].country_ko; u.nso = NSOS[k].nso; u.region = NSOS[k].region; u.lang = NSOS[k].lang; return; } } }

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
  function hasHome(u) { return u.homepage && String(u.homepage).trim(); }

  // ── search ─────────────────────────────────────────────────────────
  function matchUnits(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return UNITS.filter(function (u) {
      return [u.name, u.type, u.country, u.country_ko, u.nso, u.region].join(" ").toLowerCase().indexOf(q) !== -1;
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
  function chipsHtml(u) { return (u.sections || []).map(function (s) { return '<span class="chip">' + esc(s) + "</span>"; }).join(""); }

  function homepageHtml(u, link) {
    if (hasHome(u)) {
      if (link) return '<a class="popup-ig" href="' + escAttr(u.homepage) + '" target="_blank" rel="noopener">' + esc(T.homepage) + "</a>";
      return esc(T.homepage);
    }
    return esc(T.homepageDefault);
  }

  function popupHtml(u, anchor) {
    var dist = anchor ? '<div class="popup-line"><strong>' + fmtKm(haversine(anchor, u)) + "</strong></div>" : "";
    var photo = u.photo ? '<img class="popup-photo" src="' + escAttr(u.photo) + '" alt="" loading="lazy" />' : "";
    var act = u.note ? '<div class="popup-line">' + esc(u.note) + "</div>" : "";
    var rec = (u.sections && u.sections.length) ? '<div class="popup-line"><b>' + esc(T.recruiting) + ":</b> " + u.sections.map(esc).join(", ") + "</div>" : "";
    return (
      '<div class="popup-name">' + esc(u.name) + (u.type ? ' <span class="popup-type">' + esc(u.type) + "</span>" : "") + "</div>" +
      '<div class="popup-affil">' + esc(u.country) + (u.region ? " · " + esc(u.region) : "") + "</div>" +
      '<div class="popup-line">' + esc(u.nso) + "</div>" + photo + act + rec +
      '<div class="popup-line">' + homepageHtml(u, true) + "</div>" + dist +
      '<button class="popup-cmt" data-cmt="' + escAttr(u.id) + '"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-4 4z"></path></svg>Comments</button>' +
      '<div class="cmt-panel" data-panel-for="' + escAttr(u.id) + '" hidden></div>'
    );
  }

  function cardHtml(u, rank, anchor) {
    var color = colorOf(u);
    var distBadge = anchor ? '<span class="card-dist">' + fmtKm(haversine(anchor, u)) + "</span>" : "";
    var chips = chipsHtml(u);
    var about = u.note ? '<p class="card-about">' + esc(u.note) + "</p>" : "";
    var photo = u.photo ? '<img class="card-photo" src="' + escAttr(u.photo) + '" alt="" loading="lazy" />' : "";
    var region = u.region ? ' <span class="card-region" style="background:' + color + ";color:" + textOn(color) + '">' + esc(u.region) + "</span>" : "";
    return (
      '<div class="result-card" data-id="' + escAttr(u.id) + '" role="button" tabindex="0">' +
        '<div class="card-top">' +
          '<span class="card-rank" style="background:' + color + ";color:" + textOn(color) + '">' + rank + "</span>" +
          '<div class="card-heading">' +
            '<p class="card-name">' + esc(u.name) + (u.type ? ' <span class="card-type">' + esc(u.type) + "</span>" : "") + "</p>" +
            '<p class="card-affil">' + esc(u.country) + region + "</p>" +
          "</div>" + distBadge +
        "</div>" +
        '<p class="card-meta">' + esc(u.nso) + "</p>" + about + photo +
        (chips ? '<div class="chips">' + chips + "</div>" : "") +
        '<p class="card-meta">' + homepageHtml(u, false) + "</p>" +
      "</div>" +
      '<div class="card-tools"><button type="button" class="card-tool-btn card-edit-btn" data-edit="' + escAttr(u.id) + '">✎ Edit</button></div>' +
      '<div class="edit-panel" data-edit-for="' + escAttr(u.id) + '" hidden></div>'
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
      marker.bindPopup(popupHtml(u, anchor), { maxWidth: 360, minWidth: 300, maxHeight: 520, autoPanPadding: [24, 24], className: "unit-popup" });
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
    if (u) {
      if (isMobile()) setView("map");
      setTimeout(function () {
        try { map.invalidateSize(); if (fly) map.flyTo([u.lat, u.lng], Math.max(map.getZoom(), 12), { duration: 0.5 }); info.marker.openPopup(); } catch (e) {}
      }, isMobile() ? 90 : 0);
    }
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
    if (legendControl) { map.removeControl(legendControl); legendControl = null; }
    if (!items.length) return;
    legendControl = L.control({ position: "bottomright" });
    legendControl.onAdd = function () {
      var div = L.DomUtil.create("div", "map-legend");
      div.innerHTML = '<div class="map-legend-title">Region</div>' +
        items.map(function (it) { return '<div class="legend-item"><span class="legend-swatch" style="background:' + it.color + '"></span><span class="legend-name">' + esc(it.label) + "</span></div>"; }).join("");
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    legendControl.addTo(map);
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

  // ── comments (Reddit-style, inline expanding panel per unit) ────────
  function fmtTime(ts) { try { return new Date(ts).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return ts; } }
  function panelFor(id) { return document.querySelector('.leaflet-popup-content .cmt-panel[data-panel-for="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); }
  function updatePopup(id) { var info = markerInfo[id]; if (info && info.marker && info.marker.getPopup && info.marker.getPopup()) info.marker.getPopup().update(); }

  function formHtml(parentId, reply) {
    var nk = ""; try { nk = localStorage.getItem(NICK_KEY) || ""; } catch (e) {}
    return '<form class="cmt-form' + (reply ? " reply" : "") + '" data-parent="' + escAttr(parentId || "") + '">' +
      '<input type="text" class="cmt-nick" maxlength="40" placeholder="Nickname" value="' + escAttr(nk) + '" />' +
      '<textarea class="cmt-body" maxlength="1000" placeholder="' + (reply ? "Write a reply…" : "Write a comment (you can add a photo below)…") + '"></textarea>' +
      '<div class="cmt-file-row"><label class="cmt-file-btn">Add photo<input type="file" class="cmt-img-file" accept="image/*" /></label><span class="cmt-img-status"></span></div>' +
      '<label class="cmt-consent"><input type="checkbox" class="cmt-agree" /> <span>I agree that my nickname and IP address are stored for moderation (GDPR).</span></label>' +
      '<div class="cmt-form-row"><button type="submit" class="cmt-submit">' + (reply ? "Reply" : "Post") + '</button><span class="cmt-error"></span></div>' +
      "</form>";
  }
  function commentNode(c, byParent) {
    var kids = (byParent[c.id] || []).map(function (k) { return commentNode(k, byParent); }).join("");
    var img = c.imageUrl ? '<a href="' + escAttr(c.imageUrl) + '" target="_blank" rel="noopener"><img class="cmt-img" src="' + escAttr(c.imageUrl) + '" alt="attached photo" loading="lazy" /></a>' : "";
    return '<div class="cmt" data-cid="' + escAttr(c.id) + '">' +
      '<div class="cmt-meta"><span class="cmt-name">' + esc(c.name) + "</span>" +
        ' <span class="cmt-ip">' + esc(c.ipMasked || "") + "</span>" +
        ' <span class="cmt-time">' + esc(fmtTime(c.ts)) + "</span></div>" +
      (c.body ? '<div class="cmt-text">' + esc(c.body) + "</div>" : "") + img +
      '<div class="cmt-actions"><button type="button" class="cmt-reply-btn" data-reply="' + escAttr(c.id) + '">Reply</button></div>' +
      (kids ? '<div class="cmt-children">' + kids + "</div>" : "") + "</div>";
  }
  function renderPanel(id) {
    var panel = panelFor(id); if (!panel) return;
    var cache = cmtCache[id];
    if (!cache) { panel.innerHTML = '<p class="cmt-loading">Loading…</p>'; return; }
    var roots = cache.roots, shown = Math.min(cache.shown, roots.length);
    var head = '<div class="cmt-panel-head"><strong>' + roots.length + ' comment' + (roots.length === 1 ? "" : "s") + "</strong></div>";
    var thread = roots.length
      ? roots.slice(0, shown).map(function (c) { return commentNode(c, cache.byParent); }).join("")
      : '<p class="cmt-empty">No comments yet. Be the first!</p>';
    var more = shown < roots.length ? '<button type="button" class="cmt-more" data-more="' + escAttr(id) + '">Load more (' + (roots.length - shown) + ")</button>" : "";
    panel.innerHTML = head + '<div class="cmt-thread">' + thread + "</div>" + more + formHtml("", false);
  }
  function loadComments(id) {
    fetch("/api/comments", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { comments: [] }; })
      .then(function (j) {
        var all = (j.comments || []).filter(function (c) { return c.unitId === id; });
        var byParent = {};
        all.forEach(function (c) { var k = c.parentId || "_root"; (byParent[k] = byParent[k] || []).push(c); });
        Object.keys(byParent).forEach(function (k) { byParent[k].sort(function (a, b) { return a.ts < b.ts ? -1 : 1; }); });
        cmtCache[id] = { roots: byParent._root || [], byParent: byParent, shown: PAGE };
        if (openCmtId === id) renderPanel(id);
      })
      .catch(function () { var p = panelFor(id); if (p) p.innerHTML = '<p class="cmt-empty">Failed to load comments.</p>'; });
  }
  function openPanel(id) {
    openCmtId = id;
    var panel = panelFor(id); if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = '<p class="cmt-loading">Loading…</p>';
    if (cmtCache[id]) renderPanel(id); else loadComments(id);
  }
  function collapsePanel() { if (openCmtId) { var p = panelFor(openCmtId); if (p) { p.hidden = true; p.innerHTML = ""; updatePopup(openCmtId); } openCmtId = null; } }
  function togglePanel(id) { var p = panelFor(id); if (p && !p.hidden) collapsePanel(); else openPanel(id); }

  function uploadImage(file, statusEl, cb) {
    if (!file) { cb(""); return; }
    if (file.size > 2 * 1024 * 1024) { statusEl.textContent = "Image too large (max 2MB)"; cb(""); return; }
    statusEl.textContent = "Uploading…";
    fetch("/api/image", { method: "POST", headers: { "content-type": file.type }, body: file })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.url) { statusEl.textContent = "Photo attached ✓"; cb(j.url); } else { statusEl.textContent = "Upload failed"; cb(""); } })
      .catch(function () { statusEl.textContent = "Upload failed (network)"; cb(""); });
  }

  function onPanelClick(e) {
    var more = e.target.closest("[data-more]");
    if (more) { var id = more.getAttribute("data-more"); if (cmtCache[id]) { cmtCache[id].shown += PAGE; renderPanel(id); } return; }
    var rb = e.target.closest("[data-reply]");
    if (rb) {
      var panel = rb.closest(".cmt-panel");
      var ex = panel.querySelector(".cmt-form.reply"); if (ex) ex.remove();
      var holder = document.createElement("div"); holder.innerHTML = formHtml(rb.getAttribute("data-reply"), true);
      var f = holder.firstChild; rb.closest(".cmt").appendChild(f); f.querySelector("textarea").focus();
    }
  }
  function onPanelChange(e) {
    var file = e.target.closest(".cmt-img-file");
    if (!file) return;
    var form = file.closest(".cmt-form"); var status = form.querySelector(".cmt-img-status");
    uploadImage(file.files && file.files[0], status, function (url) { form.dataset.imageUrl = url || ""; });
  }
  function onPanelSubmit(e) {
    var form = e.target.closest(".cmt-form"); if (!form) return;
    e.preventDefault();
    if (!openCmtId) return;
    var nick = (form.querySelector(".cmt-nick").value || "").trim();
    var body = (form.querySelector(".cmt-body").value || "").trim();
    var agree = form.querySelector(".cmt-agree").checked;
    var err = form.querySelector(".cmt-error");
    var imageUrl = form.dataset.imageUrl || "";
    var parentId = form.getAttribute("data-parent") || null;
    err.textContent = "";
    if (!body && !imageUrl) { err.textContent = "Write something or attach a photo."; return; }
    if (!agree) { err.textContent = "Please agree to the privacy notice."; return; }
    try { if (nick) localStorage.setItem(NICK_KEY, nick); } catch (e2) {}
    var btn = form.querySelector(".cmt-submit"); btn.disabled = true;
    fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: nick || "Anonymous", body: body, unitId: openCmtId, parentId: parentId, imageUrl: imageUrl, consent: true }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) { btn.disabled = false; if (res.ok) loadComments(openCmtId); else err.textContent = "Failed: " + (res.j.error || ""); })
      .catch(function () { btn.disabled = false; err.textContent = "Network error."; });
  }

  // ── editor (home inline editing) ────────────────────────────────────
  function getToken(force) {
    var t = ""; try { t = sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) {}
    if (!t || force) { t = prompt("Admin password:") || ""; if (t) { try { sessionStorage.setItem(TOKEN_KEY, t); } catch (e) {} } }
    return t;
  }
  function setSaveStatus(txt, ok) { var el = document.getElementById("save-status"); if (el) { el.textContent = txt; el.classList.toggle("ok", !!ok); } }
  function scheduleSave() { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(function () { saveServer(false); }, 900); }
  function saveServer() {
    var token = getToken(false);
    if (!token) { setSaveStatus("Enter admin password to save", false); return; }
    setSaveStatus("Saving…", false);
    fetch("/api/units", { method: "PUT", headers: { "content-type": "application/json", "X-Admin-Token": token }, body: JSON.stringify({ units: UNITS }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok) { var t = new Date(); setSaveStatus("Saved ✓ " + ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2), true); }
        else if (res.status === 401) { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} setSaveStatus("Wrong password", false); }
        else setSaveStatus("Save failed", false);
      })
      .catch(function () { setSaveStatus("Save failed (network)", false); });
  }
  function reflectEditUI() { var eb = document.getElementById("edit-toggle"); if (eb) { eb.classList.toggle("active", editMode); eb.setAttribute("aria-pressed", editMode ? "true" : "false"); eb.title = editMode ? "Exit admin mode" : "Admin tools"; } }
  function toggleEditMode() {
    if (!editMode) { if (!getToken(false)) { setSaveStatus("Password required", false); return; } editMode = true; document.body.classList.add("edit-mode"); }
    else { editMode = false; document.body.classList.remove("edit-mode"); $list.querySelectorAll(".edit-panel").forEach(function (p) { p.hidden = true; p.innerHTML = ""; }); }
    reflectEditUI();
  }
  function unitIndex(id) { for (var i = 0; i < UNITS.length; i++) if (UNITS[i].id === id) return i; return -1; }
  function editPanelFor(id) { return $list.querySelector('.edit-panel[data-edit-for="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); }
  function editCoordText(u) { var a = parseFloat(u.lat), b = parseFloat(u.lng); if (isNaN(a) || isNaN(b)) return "Not set — search an address"; return "📍 " + a + ", " + b + (u.place ? " — " + u.place : ""); }
  function countryOptions(cur) { var o = '<option value="">(select country)</option>'; for (var i = 0; i < NSOS.length; i++) { var c = NSOS[i].country; o += '<option value="' + escAttr(c) + '"' + (c === cur ? " selected" : "") + ">" + esc(c) + "</option>"; } return o; }
  function editFormHtml(u) {
    var secs = SECS.map(function (s) { var on = (u.sections || []).indexOf(s) !== -1; return '<label class="section-toggle' + (on ? " checked" : "") + '"><input type="checkbox" data-esec="' + s + '"' + (on ? " checked" : "") + " />" + s + "</label>"; }).join("");
    var photo = u.photo ? '<img class="edit-photo-prev" src="' + escAttr(u.photo) + '" alt="" />' : "";
    return '<div class="edit-form">' +
      '<label class="ef-l">Name<input type="text" data-ef="name" value="' + escAttr(u.name) + '" /></label>' +
      '<label class="ef-l">Type<select data-ef="type"><option' + (u.type === "Community unit" ? " selected" : "") + ">Community unit</option><option" + (u.type === "School unit" ? " selected" : "") + ">School unit</option></select></label>" +
      '<label class="ef-l">Country<select data-ef="country">' + countryOptions(u.country) + "</select></label>" +
      '<div class="readonly-line" data-enso>' + esc((u.nso || "—") + " · " + (u.region || "—")) + "</div>" +
      '<label class="ef-l">About (description)<textarea data-ef="note" rows="2">' + esc(u.note) + "</textarea></label>" +
      '<label class="ef-l">Homepage (Instagram)<input type="text" data-ef="homepage" value="' + escAttr(u.homepage) + '" placeholder="https://instagram.com/..." /></label>' +
      '<div class="ef-l">Photo<div class="cmt-file-row"><label class="cmt-file-btn">Upload photo<input type="file" data-ephoto accept="image/*" /></label><span class="ef-photo-status"></span></div>' + photo + "</div>" +
      '<div class="ef-l">Location<div class="coord-row"><input type="text" data-eaddr placeholder="Search address / place" value="' + escAttr(u.place || "") + '" style="flex:1 1 auto" /><button type="button" class="admin-btn" data-eaddr-btn>Find</button></div><div class="readonly-line" data-ecoord>' + editCoordText(u) + "</div></div>" +
      '<div class="ef-l">Recruiting<div class="sections-box">' + secs + "</div></div>" +
      '<div class="ef-row"><button type="button" class="cmt-submit" data-edone>Done</button><button type="button" class="ef-del" data-edel>Delete</button></div>' +
      "</div>";
  }
  function openEdit(id) {
    if (!editMode) { if (!getToken(false)) { setSaveStatus("Password required", false); return; } editMode = true; document.body.classList.add("edit-mode"); reflectEditUI(); }
    var i = unitIndex(id); if (i < 0) return;
    $list.querySelectorAll(".edit-panel").forEach(function (p) { if (p.getAttribute("data-edit-for") !== id) { p.hidden = true; p.innerHTML = ""; } });
    var panel = editPanelFor(id); if (!panel) return;
    if (!panel.hidden) { panel.hidden = true; panel.innerHTML = ""; return; }
    panel.innerHTML = editFormHtml(UNITS[i]); panel.hidden = false;
    setTimeout(function () { panel.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 30);
  }
  function onEditInput(e) {
    var f = e.target.closest("[data-ef]"); if (!f) return;
    var panel = e.target.closest(".edit-panel"); if (!panel) return;
    var i = unitIndex(panel.getAttribute("data-edit-for")); if (i < 0) return;
    var field = f.getAttribute("data-ef"); UNITS[i][field] = f.value;
    if (field === "country") { applyCountry(UNITS[i]); var info = panel.querySelector("[data-enso]"); if (info) info.textContent = (UNITS[i].nso || "—") + " · " + (UNITS[i].region || "—"); }
    scheduleSave();
  }
  function onEditChange(e) {
    var sec = e.target.closest("[data-esec]");
    if (sec) {
      var p1 = sec.closest(".edit-panel"); var i1 = unitIndex(p1.getAttribute("data-edit-for")); if (i1 < 0) return;
      var s = sec.getAttribute("data-esec"); if (!Array.isArray(UNITS[i1].sections)) UNITS[i1].sections = [];
      var pos = UNITS[i1].sections.indexOf(s);
      if (sec.checked && pos === -1) UNITS[i1].sections.push(s); else if (!sec.checked && pos !== -1) UNITS[i1].sections.splice(pos, 1);
      UNITS[i1].sections = SECS.filter(function (x) { return UNITS[i1].sections.indexOf(x) !== -1; });
      sec.closest(".section-toggle").classList.toggle("checked", sec.checked); scheduleSave(); return;
    }
    var ph = e.target.closest("[data-ephoto]");
    if (ph) {
      var p2 = ph.closest(".edit-panel"); var i2 = unitIndex(p2.getAttribute("data-edit-for")); if (i2 < 0) return;
      var status = p2.querySelector(".ef-photo-status"); var file = ph.files && ph.files[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024) { status.textContent = "Too large (2MB)"; return; }
      status.textContent = "Uploading…";
      fetch("/api/image", { method: "POST", headers: { "content-type": file.type }, body: file })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.url) { UNITS[i2].photo = j.url; status.textContent = "Uploaded ✓"; var prev = p2.querySelector(".edit-photo-prev"); if (prev) prev.src = j.url; else { var img = document.createElement("img"); img.className = "edit-photo-prev"; img.src = j.url; status.parentNode.parentNode.appendChild(img); } scheduleSave(); } else status.textContent = "Upload failed"; })
        .catch(function () { status.textContent = "Upload failed"; });
    }
  }
  function editGeocode(i, panel) {
    var input = panel.querySelector("[data-eaddr]"); var q = input ? input.value.trim() : "";
    if (!q) { setSaveStatus("Enter an address to search", false); return; }
    fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=en&limit=1&q=" + encodeURIComponent(q), { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (arr) {
        if (arr && arr[0]) {
          UNITS[i].lat = round5(parseFloat(arr[0].lat)); UNITS[i].lng = round5(parseFloat(arr[0].lon)); UNITS[i].place = arr[0].display_name || q;
          var co = panel.querySelector("[data-ecoord]"); if (co) co.textContent = editCoordText(UNITS[i]);
          var info = markerInfo[UNITS[i].id]; if (info && info.marker) info.marker.setLatLng([UNITS[i].lat, UNITS[i].lng]);
          if (!isMobile()) { try { map.flyTo([UNITS[i].lat, UNITS[i].lng], 13); } catch (e) {} }
          setSaveStatus("Location set", true); scheduleSave();
        } else setSaveStatus("No place found", false);
      })
      .catch(function () { setSaveStatus("Search failed", false); });
  }
  function onEditClick(e) {
    var panel = e.target.closest(".edit-panel"); if (!panel) return;
    var id = panel.getAttribute("data-edit-for"); var i = unitIndex(id); if (i < 0) return;
    if (e.target.closest("[data-eaddr-btn]")) { editGeocode(i, panel); return; }
    if (e.target.closest("[data-edone]")) { panel.hidden = true; panel.innerHTML = ""; relayout(); return; }
    if (e.target.closest("[data-edel]")) { if (confirm("Delete this unit?")) { UNITS.splice(i, 1); scheduleSave(); showAll(); } return; }
  }
  function addUnit() {
    if (!getToken(false)) { setSaveStatus("Password required", false); return; }
    if (!editMode) { editMode = true; document.body.classList.add("edit-mode"); reflectEditUI(); }
    var c = map.getCenter();
    var u = { id: "unit-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), name: "New Scout Unit", type: "Community unit", country: "Republic of Korea", lat: round5(c.lat), lng: round5(c.lng), place: "", sections: [], homepage: "", note: "", photo: "" };
    applyCountry(u); UNITS.push(u); scheduleSave(); showAll(); openEdit(u.id);
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

    // 좌측 목록: 클릭 → 지도에 정보(팝업). 편집 버튼만 별도. (댓글은 지도 팝업 안에서)
    $list.addEventListener("click", function (e) {
      if (e.target.closest(".edit-panel")) return;
      var eb = e.target.closest("[data-edit]"); if (eb) { openEdit(eb.getAttribute("data-edit")); return; }
      var card = e.target.closest(".result-card"); if (card) setActive(card.getAttribute("data-id"), true);
    });
    $list.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("result-card")) { e.preventDefault(); setActive(e.target.getAttribute("data-id"), true); }
    });
    $list.addEventListener("click", onEditClick);
    $list.addEventListener("change", onEditChange);
    $list.addEventListener("input", onEditInput);
    // 댓글은 지도 팝업 내부 → document 위임
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cmt]"); if (b) { togglePanel(b.getAttribute("data-cmt")); return; }
      onPanelClick(e);
    });
    document.addEventListener("change", onPanelChange);
    document.addEventListener("submit", onPanelSubmit);

    var eb = document.getElementById("edit-toggle"); if (eb) eb.addEventListener("click", toggleEditMode);
    var sb = document.getElementById("save-btn"); if (sb) sb.addEventListener("click", function () { saveServer(true); });
    var ab = document.getElementById("add-btn-home"); if (ab) ab.addEventListener("click", addUnit);
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
