/* =========================================================================
 * scout-finder — public app (Bricolage + Hanken design).
 * Full-screen CARTO map + floating results panel + bottom search + comments.
 * Data: /api/units (KV) with data.js fallback. Comments: /api/comments (server,
 * GDPR consent, masked IP). Pin colour = WOSM region. 24-hour timestamps.
 * ========================================================================= */
(function () {
  "use strict";

  var REGION = {
    APR: { full: "Asia-Pacific", color: "#6A3FB5" },
    EUR: { full: "European", color: "#2F6FB0" },
    ARB: { full: "Arab", color: "#2E8B6B" },
    AFR: { full: "Africa", color: "#C26A2E" },
    IAR: { full: "Interamerican", color: "#C23E6E" },
    WSB: { full: "WOSM Bureau", color: "#4B4E8A" }
  };
  var REGION_FULL = { "Asia-Pacific": "APR", "European": "EUR", "Arab": "ARB", "Africa": "AFR", "Interamerican": "IAR", "WOSM Bureau": "WSB", "World Bureau": "WSB", "World Scout Bureau": "WSB" };
  var KIND = { unit: "Unit", office: "Office", heritage: "Heritage" };
  var ALL_SECTIONS = ["Beaver", "Cub", "Scout", "Venture", "Rover", "Leader"];
  var NSOS = Array.isArray(window.SCOUT_NSOS) ? window.SCOUT_NSOS : [];

  // ── state ──────────────────────────────────────────────────────────
  var UNITS = [], COMMENTS = [];
  var map, layer, markers = {}, labelMarkers = [];
  var RADIUS_MAX = 1000; // km; the slider's max means "no distance limit"
  var state = { query: "", region: "All", country: "All", kind: "All", selectedId: null, anchor: null, geoMsg: "", panelOpen: true, commentsFor: null, replyTo: null, descExpanded: {}, sort: "distance", grouped: true, countryOpen: false, countryQuery: "", collapsedGroups: {}, radiusKm: RADIUS_MAX };

  // Country bucket for filtering + grouping (falls back to NSO, then "WOSM Bureau" for placeless regional/world offices).
  function countryOf(u) { return u.country || u.nso || "WOSM Bureau"; }

  // "Browse" = no active search/filter/anchor. In browse mode, tree groups start collapsed
  // (compact list); when searching/filtering/anchored, groups start expanded so results show.
  function browseMode() { return !state.anchor && !state.query && state.region === "All" && state.country === "All" && state.kind === "All"; }

  // ── helpers ────────────────────────────────────────────────────────
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }
  function $(id) { return document.getElementById(id); }
  function fmtTs(ts) { try { var d = new Date(ts); var p = function (n) { return ("0" + n).slice(-2); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); } catch (e) { return ""; } }
  function regionCode(r) { return REGION[r] ? r : (REGION_FULL[r] || "APR"); }

  function fallbackCopy(t) { try { var ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); document.body.removeChild(ta); return ok; } catch (e) { return false; } }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return fallbackCopy(t); });
    return Promise.resolve(fallbackCopy(t));
  }

  function normUnit(u) {
    var region = regionCode(u.region);
    var instagram = u.instagram || "", homepage = u.homepage || "", phone = u.phone || "", email = u.email || "";
    var legacy = u.url || "";  // migrate the old single contact/url model
    if (!instagram && !homepage && legacy) {
      if (u.contact === "instagram" || /instagram\.com/i.test(legacy)) instagram = legacy; else homepage = legacy;
    }
    return {
      id: u.id, kind: u.kind || "unit", name: u.name || "", subtitle: u.subtitle || "", country: u.country || "", city: u.city || "",
      nso: u.nso || "", region: region, lang: u.lang || "", lat: +u.lat, lng: +u.lng,
      address: u.address || u.place || "", sections: Array.isArray(u.sections) ? u.sections : [],
      tags: Array.isArray(u.tags) ? u.tags : [], desc: u.desc || u.note || "",
      instagram: instagram, homepage: homepage, phone: phone, email: email, status: u.status || "published"
    };
  }
  function igUrl(v) { v = String(v || "").trim(); return /^https?:\/\//i.test(v) ? v : "https://instagram.com/" + v.replace(/^@/, ""); }
  function contactItems(u) {
    var items = [];
    if (u.instagram) items.push({ label: "Instagram", href: igUrl(u.instagram) });
    if (u.homepage) items.push({ label: "Homepage", href: /^https?:\/\//i.test(u.homepage) ? u.homepage : "https://" + u.homepage });
    if (u.phone) items.push({ label: u.phone, href: "tel:" + u.phone.replace(/[^+\d]/g, "") });
    if (u.email) items.push({ label: u.email, href: "mailto:" + u.email });
    return items;
  }

  function haversine(a, b, c, d) {
    var R = 6371, t = function (x) { return x * Math.PI / 180; }, dLat = t(c - a), dLng = t(d - b);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function sorted() {
    var q = state.query.trim().toLowerCase();
    var list = UNITS.filter(function (u) {
      if (state.kind !== "All" && u.kind !== state.kind) return false;
      if (state.region !== "All" && u.region !== state.region) return false;
      if (state.country !== "All" && countryOf(u) !== state.country) return false;
      if (q) { var hay = (u.name + " " + u.country + " " + u.city + " " + u.nso + " " + u.region + " " + (REGION[u.region] ? REGION[u.region].full : "") + " " + u.kind + " " + u.address).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
      return true;
    });
    var a = state.anchor;
    if (a) list = list.map(function (u) { return Object.assign({ _dist: haversine(a.lat, a.lng, u.lat, u.lng) }, u); });
    if (a && state.radiusKm < RADIUS_MAX) list = list.filter(function (u) { return u._dist <= state.radiusKm; });
    var by = state.sort || "distance";
    if (by === "name" || (by === "distance" && !a)) list.sort(function (x, y) { return (x.name || "").localeCompare(y.name || ""); });
    else if (by === "region") list.sort(function (x, y) { return ((x.region || "") + " " + (x.name || "")).localeCompare((y.region || "") + " " + (y.name || "")); });
    else list.sort(function (x, y) { return x._dist - y._dist; });
    return list;
  }

  function commentsFor(id) { return COMMENTS.filter(function (c) { return c.unitId === id; }); }

  // ── map / markers ──────────────────────────────────────────────────
  function pinHtml(rank, u, sel) {
    var c = REGION[u.region] ? REGION[u.region].color : "#6336B5";
    var sz = sel ? 36 : 30;
    var shape = u.kind === "office" ? "7px" : "50%";
    var ring = sel ? "box-shadow:0 0 0 5px " + c + "33,0 6px 14px rgba(30,18,55,.4);" : "box-shadow:0 4px 11px rgba(30,18,55,.35);";
    var badge = u.kind === "heritage" ? '<span style="position:absolute;top:-4px;right:-4px;width:13px;height:13px;background:#C2872E;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font:700 8px \'Hanken Grotesk\';">★</span>' : "";
    return '<div style="position:relative;display:flex;flex-direction:column;align-items:center;animation:sfpop .25s ease;">' +
      '<div style="position:relative;width:' + sz + 'px;height:' + sz + 'px;border-radius:' + shape + ';background:' + c + ';border:2.5px solid #fff;' + ring + 'display:flex;align-items:center;justify-content:center;color:#fff;font:700 ' + (sel ? 14 : 12) + 'px \'Hanken Grotesk\';">' + rank + badge + '</div>' +
      '<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #fff;margin-top:-1px;filter:drop-shadow(0 2px 1px rgba(30,18,55,.25));"></div></div>';
  }
  function anchorHtml() {
    return '<div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">' +
      '<div style="position:absolute;width:22px;height:22px;border-radius:50%;background:#2c1456;animation:sfpulse 1.8s ease-out infinite;"></div>' +
      '<div style="position:relative;width:16px;height:16px;border-radius:50%;background:#2c1456;border:3px solid #fff;box-shadow:0 3px 8px rgba(30,18,55,.5);"></div></div>';
  }
  function clusterHtml(count, color, code) {
    var sz = count >= 50 ? 56 : count >= 10 ? 50 : 44;
    var sub = code ? '<div style="font:700 9px \'Hanken Grotesk\';letter-spacing:.06em;line-height:1;opacity:.92;margin-top:1px;">' + esc(code) + '</div>' : '';
    return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:' + color + ';border:3px solid #fff;box-shadow:0 6px 16px rgba(30,18,55,.4);color:#fff;animation:sfpop .25s ease;cursor:pointer;">' +
      '<div style="font:800 ' + (count >= 100 ? 15 : 17) + 'px \'Bricolage Grotesque\';line-height:1;">' + count + '</div>' + sub + '</div>';
  }
  function popupHtml(u) {
    var r = REGION[u.region] || { color: "#6336B5" };
    var listc = (u.sections.length ? u.sections : u.tags) || [];
    var chips = listc.map(function (c) { return '<span style="display:inline-block;font:600 11px \'Hanken Grotesk\';color:#5B2EA6;background:#f3eefb;padding:3px 9px;border-radius:999px;margin:0 5px 5px 0;">' + esc(c) + '</span>'; }).join("");
    var dist = u._dist != null ? '<span style="font:700 11.5px \'Hanken Grotesk\';color:#6336B5;background:#f3eefb;padding:3px 8px;border-radius:8px;">' + u._dist.toFixed(1) + ' km</span>' : "";
    var citems = contactItems(u);
    var contact = citems.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + citems.map(function (it) { return '<a href="' + escAttr(it.href) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;font:600 12px \'Hanken Grotesk\';color:#fff;background:#6336B5;text-decoration:none;padding:7px 12px;border-radius:9px;">' + esc(it.label) + '</a>'; }).join("") + '</div>'
      : '<span style="font-size:11.5px;color:#a39bb0;">Contact the national scout org</span>';
    var loc = u.city ? esc(u.city) + ", " + esc(u.country) : esc(u.country || "");
    var addr = u.address ? '<div class="sf-copy" data-copy="' + escAttr(u.address) + '" title="Click to copy the full address" style="display:flex;align-items:flex-start;gap:7px;cursor:pointer;font-size:12px;color:#5b5366;background:#f6f3fa;border:1px solid #efeae1;border-radius:10px;padding:8px 10px;margin-bottom:10px;line-height:1.4;">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6336B5" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:1px;"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z"></path><circle cx="12" cy="10" r="2.4"></circle></svg>' +
      '<span style="flex:1;min-width:0;">' + esc(u.address) + '</span>' +
      '<span class="copy-hint" style="flex:none;font:700 10px \'Hanken Grotesk\';color:#6336B5;white-space:nowrap;">Copy</span></div>' : "";
    var pdesc = "";
    if (u.desc) {
      var plong = u.desc.length > 90, popen = !!state.descExpanded[u.id];
      var pclamp = (plong && !popen) ? "display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;" : "";
      pdesc = '<div style="font-size:12.5px;color:#42394f;line-height:1.5;margin-bottom:' + (plong ? "3px" : "10px") + ';' + pclamp + '">' + esc(u.desc) + '</div>' +
        (plong ? '<button data-popmore="' + escAttr(u.id) + '" style="border:none;background:transparent;color:#6336B5;font:600 11.5px \'Hanken Grotesk\';cursor:pointer;padding:0;margin-bottom:10px;">' + (popen ? "Show less" : "Show more") + '</button>' : "");
    }
    return '<div style="font-family:\'Hanken Grotesk\';max-width:250px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;">' +
      '<span style="display:inline-flex;align-items:center;gap:5px;font:700 10px \'Hanken Grotesk\';text-transform:uppercase;letter-spacing:.05em;color:' + r.color + ';"><span style="width:7px;height:7px;border-radius:50%;background:' + r.color + ';"></span>' + esc(u.region) + ' · ' + esc(KIND[u.kind] || "") + '</span>' + dist + '</div>' +
      '<div style="font:700 16px \'Bricolage Grotesque\';color:#1E1730;letter-spacing:-.01em;line-height:1.15;margin-bottom:' + (u.subtitle ? "1px" : "3px") + ';">' + esc(u.name) + '</div>' +
      (u.subtitle ? '<div style="font:500 12px \'Hanken Grotesk\';color:#9a93a6;line-height:1.25;margin-bottom:7px;">' + esc(u.subtitle) + '</div>' : '') +
      (loc ? '<div style="font-size:12px;color:#8a8496;margin-bottom:9px;">' + loc + '</div>' : '') +
      addr +
      pdesc +
      '<div style="margin-bottom:2px;">' + chips + '</div>' +
      '<div style="font-size:11px;color:#9a93a6;margin:8px 0 11px;padding-top:9px;border-top:1px solid #f0ebe2;">' + esc(u.nso) + '</div>' + contact +
      '<div style="display:flex;gap:7px;margin-top:11px;">' +
      '<button data-popcomments="' + escAttr(u.id) + '" style="flex:1;border:1px solid #e7e1d8;background:#fff;color:#5b5366;font:600 12px \'Hanken Grotesk\';padding:9px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6336B5" stroke-width="2.1"><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"></path></svg>' +
      'Comments (' + commentsFor(u.id).length + ')</button>' +
      '<button data-suggestedit="' + escAttr(u.id) + '" title="Suggest a correction to this place" style="flex:none;border:1px solid #e7e1d8;background:#fff;color:#5b5366;font:600 12px \'Hanken Grotesk\';padding:9px 11px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6336B5" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>' +
      'Suggest an edit</button></div></div>';
  }

  function addAnchorMarker() {
    if (state.anchor) L.marker([state.anchor.lat, state.anchor.lng], { icon: L.divIcon({ className: "", html: anchorHtml(), iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 2000, interactive: false }).addTo(layer);
  }

  // Hide permanent labels that overlap a higher-priority (selected, then rank order) label.
  function declutterLabels() {
    if (!map) return;
    var order = labelMarkers.slice().sort(function (a, b) { return (b._sfSel ? 1 : 0) - (a._sfSel ? 1 : 0); });
    var placed = [];
    for (var i = 0; i < order.length; i++) {
      var tt = order[i].getTooltip && order[i].getTooltip();
      var el = tt && (tt.getElement ? tt.getElement() : tt._container);
      if (!el) continue;
      el.style.display = "";
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      var hit = false;
      if (!order[i]._sfSel) {
        for (var j = 0; j < placed.length; j++) {
          var p = placed[j];
          if (r.left < p.r && r.right > p.l && r.top < p.b && r.bottom > p.t) { hit = true; break; }
        }
      }
      if (hit) el.style.display = "none";
      else placed.push({ l: r.left, t: r.top, r: r.right, b: r.bottom });
    }
  }

  function renderMarkers() {
    if (!map) return;
    layer.clearLayers(); markers = {}; labelMarkers = [];
    var list = sorted();
    var pts = list.filter(function (u) { return !isNaN(u.lat) && !isNaN(u.lng); });
    var z = map.getZoom();
    var level = z <= 3 ? "region" : (z <= 5 ? "country" : "unit");

    // ── aggregated bubbles (zoomed out): group by region, then by country ──
    if (level !== "unit" && pts.length > 1) {
      var groups = {};
      pts.forEach(function (u) { var k = level === "region" ? u.region : (u.country || u.nso || u.region); (groups[k] = groups[k] || []).push(u); });
      Object.keys(groups).forEach(function (k) {
        var g = groups[k];
        var lat = g.reduce(function (s, u) { return s + u.lat; }, 0) / g.length;
        var lng = g.reduce(function (s, u) { return s + u.lng; }, 0) / g.length;
        var color = REGION[g[0].region] ? REGION[g[0].region].color : "#6336B5";
        var labelTop = level === "region" ? (REGION[k] ? REGION[k].full : k) : k;
        var m = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: clusterHtml(g.length, color, level === "region" ? k : ""), iconSize: [56, 56], iconAnchor: [28, 28], popupAnchor: [0, -30] }) }).addTo(layer);
        m.bindTooltip(labelTop + " · " + g.length, { permanent: true, direction: "top", offset: [0, -30], className: "sf-label", opacity: 1 });
        labelMarkers.push(m);
        m.on("click", function () {
          if (g.length === 1) { map.flyTo([g[0].lat, g[0].lng], 7, { duration: .6 }); return; }
          var b = L.latLngBounds(g.map(function (u) { return [u.lat, u.lng]; }));
          map.flyToBounds(b.pad(0.35), { maxZoom: level === "region" ? 5 : 9, duration: .6 });
        });
      });
      addAnchorMarker();
      if (window.requestAnimationFrame) requestAnimationFrame(declutterLabels); else declutterLabels();
      return;
    }

    // ── individual ranked pins (zoomed in) ──
    list.forEach(function (u, i) {
      if (isNaN(u.lat) || isNaN(u.lng)) return;
      var sel = u.id === state.selectedId;
      var icon = L.divIcon({ className: "", html: pinHtml(i + 1, u, sel), iconSize: [40, 46], iconAnchor: [20, 44], popupAnchor: [0, -42] });
      var m = L.marker([u.lat, u.lng], { icon: icon, zIndexOffset: sel ? 1000 : 0 }).addTo(layer);
      var labelHtml = '<div style="font:700 12px \'Hanken Grotesk\';color:#1E1730;line-height:1.15;">' + esc(u.name) + '</div>' + (u.subtitle ? '<div style="font:500 10.5px \'Hanken Grotesk\';color:#9a93a6;line-height:1.15;margin-top:1px;">' + esc(u.subtitle) + '</div>' : "");
      m.bindTooltip(labelHtml, { permanent: true, direction: "top", offset: [0, -46], className: "sf-label", opacity: 1 });
      m.bindPopup(popupHtml(u), { closeButton: true, maxWidth: 280, minWidth: 248, autoPanPadding: [60, 60] });
      m.on("click", function (e) { if (e && e.originalEvent) L.DomEvent.stopPropagation(e); select(u.id, false); });
      m._sfSel = sel; labelMarkers.push(m);
      markers[u.id] = m;
    });
    addAnchorMarker();
    if (window.requestAnimationFrame) requestAnimationFrame(declutterLabels); else declutterLabels();
  }

  function select(id, pan) {
    state.selectedId = id;
    if (id && state.grouped) { var su = UNITS.find(function (x) { return x.id === id; }); if (su) { state.collapsedGroups["r:" + su.region] = false; state.collapsedGroups["c:" + su.region + "|" + countryOf(su)] = false; } }
    renderMarkers(); renderList();
    if (id) { var row = $("unit-list").querySelector('[data-open="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); if (row && row.scrollIntoView) { try { row.scrollIntoView({ block: "nearest" }); } catch (e) { row.scrollIntoView(); } } }
    var u = UNITS.find(function (x) { return x.id === id; });
    if (map && u) {
      if (pan) map.flyTo([u.lat, u.lng], Math.max(map.getZoom(), 11), { duration: .6 });
      setTimeout(function () { var m = markers[id]; if (m) m.openPopup(); }, pan ? 640 : 0);
    }
  }

  // view: "fit" = frame the nearest places (search / pinned point) · "me" = fly to the
  // point itself (geolocation, so you actually see where you are) · "none" = don't move.
  function setAnchor(lat, lng, label, view) {
    state.anchor = { lat: lat, lng: lng, label: label }; state.geoMsg = "";
    renderMarkers(); renderList(); updateCounts(); updateNearUI();
    if (!map) return;
    if (view === "none") return;
    if (view === "me") { map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: .6 }); return; }
    var near = sorted().slice(0, 5).map(function (u) { return [u.lat, u.lng]; }); near.push([lat, lng]);
    if (near.length > 1) map.fitBounds(L.latLngBounds(near).pad(0.25), { maxZoom: 11 });
    else map.flyTo([lat, lng], 11, { duration: .6 });
  }
  function doSearch() {
    var q = state.query.trim().toLowerCase();
    if (!q) return;
    var f0 = UNITS.filter(function (u) { var hay = (u.name + " " + u.country + " " + u.city + " " + u.nso + " " + u.region + " " + (REGION[u.region] ? REGION[u.region].full : "")).toLowerCase(); return hay.indexOf(q) !== -1; });
    if (f0.length) { var lat = f0.reduce(function (s, u) { return s + u.lat; }, 0) / f0.length, lng = f0.reduce(function (s, u) { return s + u.lng; }, 0) / f0.length; setAnchor(lat, lng, '"' + state.query.trim() + '"', "fit"); }
  }
  function geolocate() {
    if (!navigator.geolocation) { state.geoMsg = "Location unavailable — click the map to set your point."; updateCounts(); return; }
    state.geoMsg = "Locating you…"; updateCounts();
    navigator.geolocation.getCurrentPosition(
      function (p) { setAnchor(p.coords.latitude, p.coords.longitude, "your location", "me"); },
      function (err) { state.geoMsg = (err && err.code === 1) ? "Location permission denied — allow it in your browser, or click the map." : "Couldn't get your location — click the map to set your point."; updateCounts(); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  // ── panel rendering ────────────────────────────────────────────────
  function chipStyle(active) { return "display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:999px;font:600 12.5px 'Hanken Grotesk';border:1px solid;cursor:pointer;white-space:nowrap;transition:all .15s;" + (active ? "background:#1E1730;color:#fff;border-color:#1E1730;" : "background:#fff;color:#5b5366;border-color:#e7e1d8;"); }

  function renderChips() {
    var kinds = [{ key: "All", label: "All", dot: "#b8b2a6" }, { key: "unit", label: "Units", dot: "#6336B5" }, { key: "office", label: "Offices", dot: "#3A57B0" }, { key: "heritage", label: "Heritage", dot: "#C2872E" }];
    $("kind-chips").innerHTML = kinds.map(function (k) {
      return '<button data-kind="' + k.key + '" style="' + chipStyle(state.kind === k.key) + '"><span style="width:8px;height:8px;border-radius:50%;background:' + k.dot + ';display:inline-block;flex:none;"></span>' + k.label + '</button>';
    }).join("");
    var regions = ["All", "APR", "EUR", "ARB", "AFR", "IAR", "WSB"];
    $("region-chips").innerHTML = regions.map(function (r) {
      var full = r === "All" ? "All regions" : REGION[r].full;
      return '<button data-region="' + r + '" title="' + escAttr(full) + '" style="' + chipStyle(state.region === r) + '">' + (r === "All" ? "All regions" : r) + '</button>';
    }).join("");
  }

  // ── searchable country filter (scoped by the active kind + region) ──
  function availableCountries() {
    var seen = {};
    UNITS.forEach(function (u) {
      if (state.kind !== "All" && u.kind !== state.kind) return;
      if (state.region !== "All" && u.region !== state.region) return;
      var c = countryOf(u);
      var e = seen[c] || (seen[c] = { name: c, region: u.region, count: 0 });
      e.count++;
    });
    return Object.keys(seen).map(function (k) { return seen[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function chevDown() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><path d="m6 9 6 6 6-6"></path></svg>'; }
  function countryOptionsHtml() {
    var list = availableCountries();
    var q = (state.countryQuery || "").trim().toLowerCase();
    var matches = q ? list.filter(function (c) { return c.name.toLowerCase().indexOf(q) !== -1; }) : list;
    var total = list.reduce(function (s, c) { return s + c.count; }, 0);
    function opt(value, label, dot, count, active) {
      var dotEl = dot ? '<span style="width:8px;height:8px;border-radius:50%;background:' + dot + ';flex:none;"></span>' : '<span style="width:8px;flex:none;"></span>';
      return '<button data-pick-country="' + escAttr(value) + '" style="display:flex;align-items:center;gap:8px;width:100%;border:none;background:' + (active ? "#f3eefb" : "transparent") + ';cursor:pointer;text-align:left;padding:7px 9px;border-radius:9px;font:600 12.5px \'Hanken Grotesk\';color:' + (active ? "#5B2EA6" : "#3a3346") + ';">' +
        dotEl + '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(label) + '</span>' +
        '<span style="flex:none;font:700 10px \'Hanken Grotesk\';color:#9a93a6;background:#f1ece4;border-radius:999px;padding:1px 7px;">' + count + '</span></button>';
    }
    var html = opt("All", "All countries", "", total, state.country === "All");
    html += matches.map(function (c) { return opt(c.name, c.name, (REGION[c.region] || { color: "#6336B5" }).color, c.count, state.country === c.name); }).join("");
    if (!matches.length) html += '<div style="padding:14px 9px;text-align:center;font-size:12px;color:#a39bb0;">No countries match “' + esc(state.countryQuery) + '”.</div>';
    return html;
  }
  function renderCountryFilter() {
    var host = $("country-filter"); if (!host) return;
    var active = state.country !== "All";
    var label = active ? state.country : "All countries";
    var trig = "display:flex;align-items:center;gap:8px;width:100%;border:1px solid;cursor:pointer;padding:9px 11px;border-radius:11px;font:600 12.5px 'Hanken Grotesk';transition:all .15s;" + (active ? "background:#f3eefb;color:#5B2EA6;border-color:#d8c8f0;" : "background:#fff;color:#5b5366;border-color:#e7e1d8;");
    var globe = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"></path></svg>';
    var clear = active ? '<span data-clear-country="1" title="Clear country" style="flex:none;display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:50%;background:#6336B5;color:#fff;font:700 11px \'Hanken Grotesk\';line-height:1;">×</span>' : '';
    var trigger = '<button id="country-trigger" style="' + trig + '">' + globe +
      '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;">' + esc(label) + '</span>' + clear +
      '<span style="flex:none;color:#9a93a6;display:inline-flex;">' + chevDown() + '</span></button>';
    var dropdown = "";
    if (state.countryOpen) {
      dropdown = '<div id="country-dropdown" style="position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:50;background:#fff;border:1px solid #ece6db;border-radius:13px;box-shadow:0 16px 40px rgba(30,18,55,.2);padding:9px;">' +
        '<input id="country-search" placeholder="Search a country…" autocomplete="off" value="' + escAttr(state.countryQuery || "") + '" style="width:100%;border:1px solid #e7e1d8;border-radius:10px;padding:9px 11px;font:500 12.5px \'Hanken Grotesk\';color:#1E1730;outline:none;background:#fbfaf7;" />' +
        '<div id="country-options" class="sf-scroll" style="max-height:244px;overflow-y:auto;margin-top:8px;display:flex;flex-direction:column;gap:1px;">' + countryOptionsHtml() + '</div></div>';
    }
    host.innerHTML = trigger + dropdown;
    if (state.countryOpen) { var si = $("country-search"); if (si) { try { si.focus(); var n = si.value.length; si.setSelectionRange(n, n); } catch (e) {} } }
  }
  function pickCountry(name) {
    state.country = name; state.countryOpen = false; state.countryQuery = "";
    renderCountryFilter(); renderAll();
    if (map && name !== "All") {
      var pts = UNITS.filter(function (u) { return countryOf(u) === name && !isNaN(u.lat) && !isNaN(u.lng); });
      if (pts.length === 1) map.flyTo([pts[0].lat, pts[0].lng], Math.max(map.getZoom(), 9), { duration: .6 });
      else if (pts.length > 1) map.flyToBounds(L.latLngBounds(pts.map(function (u) { return [u.lat, u.lng]; })).pad(0.3), { maxZoom: 11, duration: .6 });
    }
  }

  // One place row — compact when unselected, expanded when selected. `rank` = 1-based badge number.
  function unitRowHtml(u, rank) {
    var sel = u.id === state.selectedId;
    var rc = REGION[u.region] || { color: "#6336B5" };
    var cs = commentsFor(u.id).length;
    var dist = u._dist != null ? '<span style="flex:none;font:700 11px \'Hanken Grotesk\';color:#6336B5;background:#f3eefb;padding:3px 7px;border-radius:7px;white-space:nowrap;">' + u._dist.toFixed(1) + ' km</span>' : "";
    var badge = "width:28px;height:28px;border-radius:" + (u.kind === "office" ? "8px" : "50%") + ";flex:none;display:flex;align-items:center;justify-content:center;background:" + rc.color + ";color:#fff;font:700 12px 'Hanken Grotesk';";
    var kindChip = "display:inline-flex;align-items:center;font:700 9px 'Hanken Grotesk';text-transform:uppercase;letter-spacing:.04em;color:#6b6577;background:#f1ece4;padding:2px 6px;border-radius:5px;";
    var regionChip = "display:inline-flex;align-items:center;font:700 9px 'Hanken Grotesk';letter-spacing:.03em;color:" + rc.color + ";background:" + rc.color + "14;padding:2px 6px;border-radius:5px;";
    var csBtn = '<button data-comments="' + escAttr(u.id) + '" title="Comments" style="display:inline-flex;align-items:center;gap:3px;border:none;background:transparent;cursor:pointer;font:600 10px \'Hanken Grotesk\';color:#9a93a6;padding:1px 5px 1px 3px;border-radius:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"></path></svg>' + cs + '</button>';
    // compact header (shared by collapsed + selected)
    var header = '<div style="display:flex;align-items:center;gap:10px;">' +
      '<div style="' + badge + '">' + rank + '</div>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font:700 13.5px \'Bricolage Grotesque\';letter-spacing:-.01em;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(u.name) + '</div>' +
      (u.subtitle ? '<div style="font:500 11px \'Hanken Grotesk\';color:#9a93a6;line-height:1.2;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(u.subtitle) + '</div>' : "") +
      '<div style="display:flex;align-items:center;gap:5px;margin-top:4px;"><span style="' + kindChip + '">' + esc(KIND[u.kind] || "") + '</span><span style="' + regionChip + '">' + esc(u.region) + '</span>' + (!sel ? csBtn : "") + '</div>' +
      '</div>' + dist + '</div>';

    if (!sel) {
      return '<div data-open="' + escAttr(u.id) + '" style="border:1px solid #efeae1;border-radius:12px;padding:9px 11px;margin-bottom:7px;cursor:pointer;background:#fff;">' + header + '</div>';
    }

    // selected → expanded details
    var place = [u.country || u.address, u.nso].filter(Boolean).join(" · ");
    var chips = (u.sections.length ? u.sections : u.tags).slice(0, 6).map(function (c) { return '<span style="font:600 11px \'Hanken Grotesk\';color:#5B2EA6;background:#f3eefb;padding:3px 9px;border-radius:999px;">' + esc(c) + '</span>'; }).join("");
    var citems = contactItems(u);
    var contact = citems.length
      ? '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:7px;">' + citems.map(function (it) { return '<a href="' + escAttr(it.href) + '" target="_blank" rel="noopener" data-stop="1" style="font:600 12px \'Hanken Grotesk\';color:#6336B5;text-decoration:none;">' + esc(it.label) + '</a>'; }).join('<span style="color:#d6cfe0;">·</span>') + '</div>'
      : '<span style="font-size:11.5px;color:#a39bb0;">Contact the national scout org</span>';
    var descBlock = (function () {
      if (!u.desc) return "";
      var long = u.desc.length > 90, open = !!state.descExpanded[u.id];
      var clamp = (long && !open) ? "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;" : "";
      var body = '<div style="font-size:12.5px;color:#4a4458;line-height:1.45;margin-bottom:' + (long ? "4px" : "9px") + ';' + clamp + '">' + esc(u.desc) + '</div>';
      var toggle = long ? '<button data-more="' + escAttr(u.id) + '" data-stop="1" style="border:none;background:transparent;color:#6336B5;font:600 11.5px \'Hanken Grotesk\';cursor:pointer;padding:0;margin-bottom:9px;">' + (open ? "Show less" : "Show more") + '</button>' : "";
      return body + toggle;
    })();
    return '<div data-open="' + escAttr(u.id) + '" style="border:1px solid #6336B5;box-shadow:0 0 0 3px #6336B51f;border-radius:14px;padding:12px;margin-bottom:9px;cursor:pointer;background:#fff;">' +
      header +
      '<div style="margin-top:11px;padding-top:11px;border-top:1px solid #f3eee5;">' +
      (place ? '<div style="font-size:12px;color:#8a8496;margin-bottom:7px;line-height:1.35;">' + esc(place) + '</div>' : "") +
      descBlock +
      (chips ? '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">' + chips + '</div>' : "") +
      '<div style="display:flex;align-items:center;gap:12px;">' + contact +
      '<div style="flex:1;"></div>' +
      '<button data-comments="' + escAttr(u.id) + '" style="border:none;background:transparent;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font:600 12px \'Hanken Grotesk\';color:#6b6577;padding:0;">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"></path></svg>' + cs + '</button>' +
      '</div>' +
      '<button data-suggestedit="' + escAttr(u.id) + '" data-stop="1" style="margin-top:10px;width:100%;border:1px dashed #d8cfe6;background:transparent;color:#6336B5;font:600 11.5px \'Hanken Grotesk\';padding:8px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;">' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>' +
      'Suggest an edit / correction</button>' +
      '</div></div>';
  }

  function groupChevron(collapsed, size) { size = size || 14; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="#9a93a6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none;transform:rotate(' + (collapsed ? 0 : 90) + 'deg);transition:transform .15s;"><path d="m9 18 6-6-6-6"></path></svg>'; }
  function countBadge(n) { return '<span style="flex:none;font:700 10px \'Hanken Grotesk\';color:#9a93a6;background:#f1ece4;border-radius:999px;padding:1px 8px;">' + n + '</span>'; }

  function renderList() {
    var f = sorted();
    if (!f.length) {
      $("unit-list").innerHTML = '<div style="text-align:center;padding:46px 20px;color:#9a93a6;"><div style="font:600 14px \'Hanken Grotesk\';margin-bottom:4px;color:#6b6577;">No places found</div><div style="font-size:12.5px;">Try a different search or reset the filters.</div></div>';
      return;
    }
    var rankOf = {};
    f.forEach(function (u, i) { rankOf[u.id] = i + 1; });

    if (!state.grouped) {
      $("unit-list").innerHTML = f.map(function (u) { return unitRowHtml(u, rankOf[u.id]); }).join("");
      return;
    }

    // grouped tree: Region › Country › place (district level)
    var anchored = !!state.anchor && (state.sort || "distance") === "distance";
    var dfltCol = browseMode(); // groups collapsed by default while just browsing
    var byRegion = {};
    f.forEach(function (u) {
      var rk = u.region, ck = countryOf(u);
      var rg = byRegion[rk] || (byRegion[rk] = { count: 0, minDist: Infinity, countries: {} });
      rg.count++; if (u._dist != null && u._dist < rg.minDist) rg.minDist = u._dist;
      var cg = rg.countries[ck] || (rg.countries[ck] = { units: [], minDist: Infinity });
      cg.units.push(u); if (u._dist != null && u._dist < cg.minDist) cg.minDist = u._dist;
    });
    var order = Object.keys(REGION);
    var regionKeys = Object.keys(byRegion).sort(function (a, b) {
      return anchored ? (byRegion[a].minDist - byRegion[b].minDist) : (order.indexOf(a) - order.indexOf(b));
    });

    var html = regionKeys.map(function (rk) {
      var rg = byRegion[rk];
      var rcolor = REGION[rk] ? REGION[rk].color : "#6336B5";
      var rfull = REGION[rk] ? REGION[rk].full : rk;
      var rId = "r:" + rk, rCol = (rId in state.collapsedGroups) ? !!state.collapsedGroups[rId] : dfltCol;
      var rHeader = '<button data-group="' + escAttr(rId) + '" style="display:flex;align-items:center;gap:8px;width:100%;border:none;background:transparent;cursor:pointer;text-align:left;padding:8px 4px 6px;">' +
        groupChevron(rCol, 15) +
        '<span style="width:10px;height:10px;border-radius:50%;background:' + rcolor + ';flex:none;"></span>' +
        '<span style="flex:1;min-width:0;font:800 12.5px \'Bricolage Grotesque\';color:#1E1730;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(rfull) + ' <span style="font:700 10px \'Hanken Grotesk\';color:' + rcolor + ';">' + rk + '</span></span>' +
        countBadge(rg.count) + '</button>';
      if (rCol) return '<div style="margin-bottom:4px;border-bottom:1px solid #f3eee5;">' + rHeader + '</div>';

      var countryKeys = Object.keys(rg.countries).sort(function (a, b) {
        return anchored ? (rg.countries[a].minDist - rg.countries[b].minDist) : a.localeCompare(b);
      });
      var body = countryKeys.map(function (ck) {
        var cg = rg.countries[ck];
        var cId = "c:" + rk + "|" + ck, cCol = (cId in state.collapsedGroups) ? !!state.collapsedGroups[cId] : dfltCol;
        var cHeader = '<button data-group="' + escAttr(cId) + '" style="display:flex;align-items:center;gap:7px;width:100%;border:none;background:transparent;cursor:pointer;text-align:left;padding:5px 4px;">' +
          groupChevron(cCol, 13) +
          '<span style="flex:1;min-width:0;font:700 11.5px \'Hanken Grotesk\';color:#5b5366;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(ck) + '</span>' +
          countBadge(cg.units.length) + '</button>';
        var units = cCol ? "" : '<div style="margin-left:7px;">' + cg.units.map(function (u) { return unitRowHtml(u, rankOf[u.id]); }).join("") + '</div>';
        return '<div style="margin-bottom:2px;">' + cHeader + units + '</div>';
      }).join("");
      return '<div style="margin-bottom:6px;padding-bottom:2px;border-bottom:1px solid #f3eee5;">' + rHeader + '<div style="margin-left:9px;">' + body + '</div></div>';
    }).join("");
    $("unit-list").innerHTML = html;
  }
  function renderSort() {
    var el = $("sort-row"); if (!el) return;
    var groupIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>';
    var groupBtn = '<button data-toggle="grouped" title="Group by Region › Country › place" style="display:inline-flex;align-items:center;gap:5px;border:1px solid;padding:4px 10px;border-radius:999px;font:600 11px \'Hanken Grotesk\';cursor:pointer;' + (state.grouped ? "background:#6336B5;color:#fff;border-color:#6336B5;" : "background:#fff;color:#5b5366;border-color:#e7e1d8;") + '">' + groupIcon + 'Grouped</button>';
    var opts = state.grouped ? [["distance", "Distance"], ["name", "Name"]] : [["distance", "Distance"], ["name", "Name"], ["region", "Region"]];
    var sort = '<span style="font:700 10px \'Hanken Grotesk\';color:#9a93a6;text-transform:uppercase;letter-spacing:.06em;margin:0 1px 0 4px;">Sort</span>' + opts.map(function (o) {
      var active = (state.sort || "distance") === o[0];
      return '<button data-sort="' + o[0] + '" style="border:1px solid;padding:4px 10px;border-radius:999px;font:600 11px \'Hanken Grotesk\';cursor:pointer;' + (active ? "background:#1E1730;color:#fff;border-color:#1E1730;" : "background:#fff;color:#5b5366;border-color:#e7e1d8;") + '">' + o[1] + '</button>';
    }).join("");
    el.innerHTML = groupBtn + sort;
  }

  function updateCounts() {
    var f = sorted();
    $("count").textContent = f.length; $("total").textContent = UNITS.length; $("reopen-count").textContent = f.length;
    $("anchor-line").textContent = state.geoMsg ? state.geoMsg : (state.anchor ? "Sorted by distance from " + state.anchor.label : "Showing all places · search or tap the map");
  }

  function renderLegend() {
    $("legend-rows").innerHTML = Object.keys(REGION).map(function (code) {
      var r = REGION[code];
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="width:11px;height:11px;border-radius:50%;background:' + r.color + ';flex:none;"></span><span style="font:700 11.5px \'Hanken Grotesk\';color:#1E1730;width:30px;">' + code + '</span><span style="font-size:11.5px;color:#8a8496;">' + r.full + '</span></div>';
    }).join("");
  }

  function renderAll() { renderChips(); renderCountryFilter(); renderSort(); renderList(); updateCounts(); renderMarkers(); renderRadius(); }

  function setPanelOpen(open) {
    state.panelOpen = open;
    $("panel").style.transform = open ? "none" : "translateX(-118%)";
    $("panel").style.opacity = open ? 1 : 0;
    $("panel-reopen").style.display = open ? "none" : "flex";
    $("searchbar").style.left = open ? "398px" : "18px";
    if (map) setTimeout(function () { map.invalidateSize(); }, 340);
  }

  function renderRadius() {
    var lbl = $("radius-label"), sl = $("radius-slider"); if (!lbl) return;
    lbl.textContent = state.radiusKm >= RADIUS_MAX ? "Any range" : "≤ " + state.radiusKm + " km";
    lbl.style.color = (state.anchor && state.radiusKm < RADIUS_MAX) ? "#6336B5" : "#6b6577";
    if (sl && +sl.value !== state.radiusKm) sl.value = state.radiusKm;
  }
  function updateNearUI() {
    var nb = $("near-btn"), has = !!state.anchor;
    nb.style.background = has ? "#6336B5" : "#fff"; nb.style.color = has ? "#fff" : "#5b5366"; nb.style.borderColor = has ? "#6336B5" : "#e7e1d8";
    $("near-label").textContent = has ? "Located" : "Near me";
    document.querySelectorAll(".q-near").forEach(function (b) {
      var on = state.kind === b.getAttribute("data-kind");
      b.style.background = on ? "#6336B5" : "#fff"; b.style.color = on ? "#fff" : "#5b5366"; b.style.borderColor = on ? "#6336B5" : "#e7e1d8";
    });
  }

  // ── comments drawer ────────────────────────────────────────────────
  function flatten(id) {
    var all = commentsFor(id), out = [];
    function walk(parent, depth) { all.filter(function (c) { return (c.parentId || null) === parent; }).forEach(function (c) { out.push(Object.assign({ depth: depth }, c)); walk(c.id, depth + 1); }); }
    walk(null, 0); return out;
  }
  function openComments(id) {
    state.commentsFor = id; state.replyTo = null;
    var u = UNITS.find(function (x) { return x.id === id; });
    $("drawer-title").textContent = u ? u.name : "";
    $("drawer").style.display = "flex"; $("drawer").style.animation = "sfslide .28s cubic-bezier(.4,0,.2,1)";
    renderThread(); updateReplyBanner();
  }
  function closeComments() { state.commentsFor = null; state.replyTo = null; $("drawer").style.display = "none"; }
  function renderThread() {
    var id = state.commentsFor; if (!id) return;
    var thread = flatten(id);
    var html = thread.map(function (c) {
      var rowStyle = "padding:11px 0;border-bottom:1px solid #f0ebe2;margin-left:" + (c.depth * 20) + "px;" + (c.depth ? "border-left:2px solid #efe7f7;padding-left:11px;" : "");
      if (c.deleted) {
        return '<div style="' + rowStyle + '">' +
          '<div style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:#a39bb0;">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>' +
          '<span style="font-style:italic;">Comment removed by an admin' + (c.deletedReason ? ' — ' + esc(c.deletedReason) : '') + '</span></div></div>';
      }
      return '<div style="' + rowStyle + '">' +
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">' +
        '<span style="font:700 12.5px \'Hanken Grotesk\';color:#1E1730;">' + esc(c.name) + '</span>' +
        '<span style="font-size:10.5px;color:#b3adbd;">' + esc(c.ipMasked || "") + '</span>' +
        '<span style="font-size:10.5px;color:#b3adbd;">·</span>' +
        '<span style="font-size:10.5px;color:#b3adbd;">' + fmtTs(c.ts) + (c.edited ? " · edited" : "") + '</span></div>' +
        '<div style="font-size:13px;color:#3a3346;line-height:1.5;margin-bottom:5px;white-space:pre-wrap;">' + esc(c.body) + '</div>' +
        '<button data-reply="' + escAttr(c.id) + '" style="border:none;background:transparent;color:#6336B5;font:600 11.5px \'Hanken Grotesk\';cursor:pointer;padding:0;">Reply</button></div>';
    }).join("");
    if (!thread.length) html = '<div style="text-align:center;padding:36px 16px;color:#a39bb0;font-size:12.5px;">No comments yet. Be the first to share your experience.</div>';
    $("thread").innerHTML = html;
  }
  function updateReplyBanner() {
    var rb = $("reply-banner");
    if (state.replyTo) {
      var c = commentsFor(state.commentsFor).find(function (x) { return x.id === state.replyTo; });
      $("reply-name").textContent = c ? "@" + c.name : "";
      rb.style.display = "flex";
    } else rb.style.display = "none";
  }
  function updatePostBtn() {
    var can = $("nick").value.trim() && $("draft").value.trim() && $("consent").checked;
    var b = $("post-btn");
    b.style.background = can ? "#6336B5" : "#ece6db"; b.style.color = can ? "#fff" : "#a39bb0"; b.style.cursor = can ? "pointer" : "not-allowed";
  }
  function postComment() {
    var id = state.commentsFor; if (!id) return;
    var name = $("nick").value.trim(), body = $("draft").value.trim();
    if (!name || !body || !$("consent").checked) return;
    var payload = { name: name, body: body, unitId: id, parentId: state.replyTo || null, consent: true };
    $("post-btn").textContent = "Posting…";
    fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        $("post-btn").textContent = "Post comment";
        if (j && j.ok && j.comment) {
          COMMENTS.unshift({ id: j.comment.id, ts: j.comment.ts, name: j.comment.name, body: j.comment.body, parentId: j.comment.parentId, unitId: id, ipMasked: j.comment.ipMasked || "" });
          try { localStorage.setItem("sf_nick", name); } catch (e) {}
          $("draft").value = ""; state.replyTo = null; updateReplyBanner(); updatePostBtn();
          renderThread(); renderList();
        } else {
          var err = (j && j.error) || "error";
          var msg = err === "blocked_keyword" ? "Your comment contains words that aren't allowed. Please revise it."
            : err === "consent_required" ? "Please tick the consent box to post."
            : err === "empty" ? "Please write something first."
            : "Could not post: " + err;
          alert(msg);
        }
      })
      .catch(function () { $("post-btn").textContent = "Post comment"; alert("Network error — comment not posted."); });
  }

  // ── report a location (public submission → admin approval) ─────────
  var COUNTRY = (function () { var m = {}; NSOS.forEach(function (n) { m[n.country] = { nso: n.nso, region: regionCode(n.region), lang: n.lang }; }); return m; })();
  var COUNTRIES = Object.keys(COUNTRY).sort();
  var rep = { kind: "unit", sections: [], country: "", nso: "", region: "APR", lang: "", lat: null, lng: null, address: "" };
  function rSeg(active) { return "flex:1;border:1px solid;padding:9px 8px;border-radius:11px;font:600 12.5px 'Hanken Grotesk';cursor:pointer;transition:all .15s;" + (active ? "background:#6336B5;color:#fff;border-color:#6336B5;" : "background:#fff;color:#6b6577;border-color:#e7e1d8;"); }
  function rChip(active) { return "border:1px solid;padding:7px 12px;border-radius:999px;font:600 12.5px 'Hanken Grotesk';cursor:pointer;transition:all .15s;" + (active ? "background:#6336B5;color:#fff;border-color:#6336B5;" : "background:#fff;color:#5b5366;border-color:#e7e1d8;"); }
  function renderRKind() { $("r-kind-seg").innerHTML = ["unit", "office", "heritage"].map(function (k) { return '<button data-rkind="' + k + '" style="' + rSeg(rep.kind === k) + '">' + KIND[k] + '</button>'; }).join(""); $("r-sections-wrap").style.display = rep.kind === "unit" ? "block" : "none"; }
  function renderRSections() { $("r-sections").innerHTML = ALL_SECTIONS.map(function (s) { return '<button data-rsec="' + s + '" style="' + rChip(rep.sections.indexOf(s) !== -1) + '">' + s + '</button>'; }).join(""); }
  function renderRCountry() { $("r-country").innerHTML = '<option value="">Select a country…</option>' + COUNTRIES.map(function (c) { return '<option value="' + escAttr(c) + '"' + (c === rep.country ? " selected" : "") + ">" + esc(c) + "</option>"; }).join(""); }
  function updateRAuto() {
    if (!rep.country) { $("r-auto").textContent = "Select a country to auto-fill NSO, region and language."; return; }
    $("r-auto").textContent = (rep.nso || "—") + " · " + (REGION[rep.region] ? REGION[rep.region].full : rep.region) + " (" + (rep.lang || "—") + ")";
  }
  // No arg → suggest a brand-new place. With a unit → "suggest a correction" to that place
  // (form is pre-filled with its current details; the approved submission updates it in place).
  function openReport(correct) {
    var c = (correct && correct.id) ? correct : null;
    rep = c
      ? { kind: c.kind || "unit", sections: Array.isArray(c.sections) ? c.sections.slice() : [], country: c.country || "", nso: c.nso || "", region: c.region || "APR", lang: c.lang || "", lat: (c.lat != null ? c.lat : null), lng: (c.lng != null ? c.lng : null), address: c.address || "", correctionId: c.id, correctionName: c.name || "" }
      : { kind: "unit", sections: [], country: "", nso: "", region: "APR", lang: "", lat: null, lng: null, address: "" };
    $("r-rname").value = ""; $("r-raff").value = "";
    $("r-name").value = c ? (c.name || "") : "";
    $("r-desc").value = c ? (c.desc || "") : "";
    $("r-instagram").value = c ? (c.instagram || "") : "";
    $("r-phone").value = c ? (c.phone || "") : "";
    $("r-email").value = c ? (c.email || "") : "";
    $("r-homepage").value = c ? (c.homepage || "") : "";
    $("r-addr").value = c ? (c.address || "") : "";
    $("r-msg").textContent = "";
    $("r-coord").textContent = (c && c.lat != null) ? ("📍 " + c.lat + ", " + c.lng + (c.address ? " — " + c.address : "")) : "No location set yet — search above (the admin can fine-tune it).";
    $("r-eyebrow").textContent = c ? "Suggest a correction" : "Suggest a place";
    $("r-title").textContent = c ? ("Fix details · " + (c.name || "")) : "Suggest a place to add";
    $("r-submit").textContent = c ? "Submit correction" : "Submit for review";
    renderRKind(); renderRSections(); renderRCountry(); updateRAuto();
    $("report-modal").style.display = "flex";
  }
  function closeReport() { $("report-modal").style.display = "none"; }
  function rFind() {
    var q = $("r-addr").value.trim(); if (!q) return;
    $("r-coord").textContent = "Searching…";
    fetch("https://nominatim.openstreetmap.org/search?format=json&accept-language=en&limit=1&q=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d[0]) { rep.lat = +(+d[0].lat).toFixed(7); rep.lng = +(+d[0].lon).toFixed(7); rep.address = d[0].display_name || q; $("r-coord").textContent = "📍 " + rep.lat + ", " + rep.lng + " — " + rep.address; } else $("r-coord").textContent = "No match found — try a different address."; })
      .catch(function () { $("r-coord").textContent = "Search unavailable — you can still submit; the admin will set the location."; });
  }
  function rSubmit() {
    var rname = $("r-rname").value.trim(), raff = $("r-raff").value.trim(), name = $("r-name").value.trim();
    if (!rname || !raff) { $("r-msg").textContent = "Please enter your name and nationality."; return; }
    if (!name) { $("r-msg").textContent = "Please enter the place name."; return; }
    var unit = {
      kind: rep.kind, name: name, country: rep.country, nso: rep.nso, region: rep.region, lang: rep.lang,
      lat: rep.lat == null ? 0 : rep.lat, lng: rep.lng == null ? 0 : rep.lng, address: rep.address || $("r-addr").value.trim(),
      sections: rep.kind === "unit" ? rep.sections : [], tags: [], desc: $("r-desc").value.trim(),
      instagram: $("r-instagram").value.trim(), phone: $("r-phone").value.trim(), email: $("r-email").value.trim(), homepage: $("r-homepage").value.trim(),
      status: "published"
    };
    if (rep.correctionId) unit.id = rep.correctionId;
    var payload = { unit: unit, reporter: { name: rname, affiliation: raff } };
    if (rep.correctionId) payload.correction = { forId: rep.correctionId, forName: rep.correctionName || "" };
    $("r-msg").style.color = "#6b6577"; $("r-msg").textContent = "Submitting…"; $("r-submit").disabled = true;
    fetch("/api/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        $("r-submit").disabled = false;
        if (res.ok && res.j.ok) { closeReport(); var rsu = $("report-success"); if (rsu) rsu.style.display = "flex"; }
        else { $("r-msg").style.color = "#b4524e"; $("r-msg").textContent = "Could not submit: " + ((res.j && res.j.error) || "error"); }
      })
      .catch(function () { $("r-submit").disabled = false; $("r-msg").style.color = "#b4524e"; $("r-msg").textContent = "Network error — please try again."; });
  }

  // ── data load ──────────────────────────────────────────────────────
  function loadUnits() {
    return fetch("/api/units", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var arr = (j && Array.isArray(j.units)) ? j.units : (Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : []);
        UNITS = arr.map(normUnit).filter(function (u) { return u.status !== "draft" && !isNaN(u.lat) && !isNaN(u.lng); });
      })
      .catch(function () { UNITS = (Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : []).map(normUnit); });
  }
  function loadComments() {
    return fetch("/api/comments", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { COMMENTS = (j && Array.isArray(j.comments)) ? j.comments : []; })
      .catch(function () { COMMENTS = []; });
  }
  // ── init ───────────────────────────────────────────────────────────
  // Smallest zoom at which the world still fills the viewport height (no grey bands top/bottom).
  function fitMinZoom() {
    if (!map) return;
    var h = (map.getSize().y) || window.innerHeight || 800;
    var mz = Math.ceil(Math.log(h / 256) / Math.LN2);
    if (!isFinite(mz)) mz = 2;
    mz = Math.max(2, mz);
    if (map.getMinZoom() !== mz) map.setMinZoom(mz);
    if (map.getZoom() < mz) map.setZoom(mz);
  }
  function initMap() {
    // Latitude is clamped (no grey above/below the world); longitude is left effectively
    // unbounded so the map loops left↔right infinitely (tiles wrap + worldCopyJump).
    map = L.map("map", { zoomControl: false, worldCopyJump: true, minZoom: 2, maxBounds: [[-85.05, -1e6], [85.05, 1e6]], maxBoundsViscosity: 1.0 }).setView([25, 12], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on("click", function (e) {
      var lat = e.latlng.lat, lng = e.latlng.lng;
      var html = '<div style="font-family:\'Hanken Grotesk\';text-align:center;min-width:178px;padding:2px 2px 0;">' +
        '<div style="font:700 13px \'Bricolage Grotesque\';color:#1E1730;margin-bottom:3px;">Search from this point?</div>' +
        '<div style="font-size:11px;color:#9a93a6;margin-bottom:10px;">Sort places by distance from<br>' + lat.toFixed(4) + ', ' + lng.toFixed(4) + '</div>' +
        '<button data-searchhere="' + lat.toFixed(6) + ',' + lng.toFixed(6) + '" style="width:100%;border:none;background:#6336B5;color:#fff;font:600 12.5px \'Hanken Grotesk\';padding:9px;border-radius:10px;cursor:pointer;">Search from here</button></div>';
      L.popup({ closeButton: true, autoPanPadding: [40, 40], className: "sf-ask" }).setLatLng(e.latlng).setContent(html).openOn(map);
    });
    map.on("zoomend", renderMarkers);
    map.on("moveend", declutterLabels);
    map.on("resize", fitMinZoom);
    renderMarkers();
    fitMinZoom();
    setTimeout(function () { map.invalidateSize(); fitMinZoom(); }, 200);
  }

  function wire() {
    $("search-input").addEventListener("input", function (e) { state.query = e.target.value; renderMarkers(); renderList(); updateCounts(); });
    $("search-input").addEventListener("keydown", function (e) { if (e.key === "Enter") doSearch(); });
    $("search-go").addEventListener("click", doSearch);
    $("near-btn").addEventListener("click", geolocate);
    if ($("radius-slider")) $("radius-slider").addEventListener("input", function (e) { state.radiusKm = +e.target.value; renderRadius(); renderMarkers(); renderList(); updateCounts(); });
    document.querySelectorAll(".q-near").forEach(function (b) { b.addEventListener("click", function () { state.kind = b.getAttribute("data-kind"); renderChips(); renderAll(); updateNearUI(); geolocate(); }); });
    $("reset").addEventListener("click", function () { state.query = ""; state.region = "All"; state.country = "All"; state.kind = "All"; state.selectedId = null; state.anchor = null; state.geoMsg = ""; state.countryOpen = false; state.countryQuery = ""; state.collapsedGroups = {}; state.radiusKm = RADIUS_MAX; $("search-input").value = ""; renderChips(); renderAll(); updateNearUI(); if (map) map.flyTo([25, 12], map.getMinZoom(), { duration: .6 }); });
    $("panel-collapse").addEventListener("click", function () { setPanelOpen(false); });
    $("panel-reopen").addEventListener("click", function () { setPanelOpen(true); });

    $("kind-chips").addEventListener("click", function (e) { var b = e.target.closest("[data-kind]"); if (!b) return; state.kind = b.getAttribute("data-kind"); renderChips(); renderAll(); updateNearUI(); });
    $("region-chips").addEventListener("click", function (e) { var b = e.target.closest("[data-region]"); if (!b) return; state.region = b.getAttribute("data-region"); state.country = "All"; state.countryQuery = ""; renderChips(); renderAll(); });
    $("sort-row").addEventListener("click", function (e) {
      var t = e.target.closest("[data-toggle]"); if (t) { state.grouped = !state.grouped; renderSort(); renderList(); return; }
      var b = e.target.closest("[data-sort]"); if (!b) return; state.sort = b.getAttribute("data-sort"); renderSort(); renderList();
    });

    // searchable country filter (stopPropagation so the outside-click handler below
    // doesn't see the post-rerender detached target and immediately close the dropdown)
    $("country-filter").addEventListener("click", function (e) {
      e.stopPropagation();
      var cc = e.target.closest("[data-clear-country]"); if (cc) { state.country = "All"; state.countryQuery = ""; state.countryOpen = false; renderCountryFilter(); renderAll(); return; }
      var pk = e.target.closest("[data-pick-country]"); if (pk) { pickCountry(pk.getAttribute("data-pick-country")); return; }
      if (e.target.closest("#country-trigger")) { state.countryOpen = !state.countryOpen; renderCountryFilter(); return; }
    });
    $("country-filter").addEventListener("input", function (e) { if (e.target.id !== "country-search") return; state.countryQuery = e.target.value; var o = $("country-options"); if (o) o.innerHTML = countryOptionsHtml(); });
    $("country-filter").addEventListener("keydown", function (e) { if (e.key === "Escape" && state.countryOpen) { state.countryOpen = false; renderCountryFilter(); } });

    $("unit-list").addEventListener("click", function (e) {
      var gb = e.target.closest("[data-group]"); if (gb) { var gk = gb.getAttribute("data-group"); var cur = (gk in state.collapsedGroups) ? !!state.collapsedGroups[gk] : browseMode(); state.collapsedGroups[gk] = !cur; renderList(); return; }
      var mb = e.target.closest("[data-more]"); if (mb) { e.stopPropagation(); var mid = mb.getAttribute("data-more"); state.descExpanded[mid] = !state.descExpanded[mid]; renderList(); return; }
      var cb = e.target.closest("[data-comments]"); if (cb) { e.stopPropagation(); openComments(cb.getAttribute("data-comments")); return; }
      var se = e.target.closest("[data-suggestedit]"); if (se) { e.stopPropagation(); var su = UNITS.find(function (x) { return x.id === se.getAttribute("data-suggestedit"); }); if (su) openReport(su); return; }
      if (e.target.closest("[data-stop]")) { e.stopPropagation(); return; }
      var card = e.target.closest("[data-open]"); if (card) { var cid = card.getAttribute("data-open"); select(cid === state.selectedId ? null : cid, true); }
    });

    $("drawer-close").addEventListener("click", closeComments);
    $("reply-cancel").addEventListener("click", function () { state.replyTo = null; updateReplyBanner(); });
    $("thread").addEventListener("click", function (e) { var b = e.target.closest("[data-reply]"); if (b) { state.replyTo = b.getAttribute("data-reply"); updateReplyBanner(); } });
    $("nick").addEventListener("input", updatePostBtn);
    $("draft").addEventListener("input", updatePostBtn);
    $("consent").addEventListener("change", updatePostBtn);
    $("post-btn").addEventListener("click", postComment);
    try { var n = localStorage.getItem("sf_nick"); if (n) $("nick").value = n; } catch (e) {}

    // report a location
    $("report-btn").addEventListener("click", function () { openReport(); });
    $("r-close").addEventListener("click", closeReport);
    $("r-cancel").addEventListener("click", closeReport);
    $("report-modal").addEventListener("click", function (e) { if (e.target === $("report-modal")) closeReport(); });
    if ($("rs-done")) $("rs-done").addEventListener("click", function () { $("report-success").style.display = "none"; });
    if ($("report-success")) $("report-success").addEventListener("click", function (e) { if (e.target === $("report-success")) $("report-success").style.display = "none"; });
    $("r-kind-seg").addEventListener("click", function (e) { var b = e.target.closest("[data-rkind]"); if (!b) return; rep.kind = b.getAttribute("data-rkind"); renderRKind(); });
    $("r-sections").addEventListener("click", function (e) { var b = e.target.closest("[data-rsec]"); if (!b) return; var s = b.getAttribute("data-rsec"); var i = rep.sections.indexOf(s); if (i === -1) rep.sections.push(s); else rep.sections.splice(i, 1); renderRSections(); });
    $("r-country").addEventListener("change", function (e) { rep.country = e.target.value; var m = COUNTRY[rep.country]; if (m) { rep.nso = m.nso; rep.region = m.region; rep.lang = m.lang; } else { rep.nso = ""; rep.lang = ""; } var dial = (window.SCOUT_DIAL || {})[rep.country], pe = $("r-phone"); if (dial && pe && !pe.value.trim()) pe.value = dial + " "; updateRAuto(); });
    $("r-find").addEventListener("click", rFind);
    $("r-addr").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); rFind(); } });
    $("r-submit").addEventListener("click", rSubmit);

    // close the country dropdown when clicking outside it
    document.addEventListener("click", function (e) {
      if (!state.countryOpen) return;
      if (e.target.closest("#country-filter")) return;
      state.countryOpen = false; renderCountryFilter();
    });

    // confirm "search from this point" (map-click popup)
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-searchhere]"); if (!b) return;
      var parts = b.getAttribute("data-searchhere").split(",");
      if (map) map.closePopup();
      select(null, false);
      setAnchor(parseFloat(parts[0]), parseFloat(parts[1]), "your pinned point", "fit");
    });

    // open the comments drawer from a place's map popup
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-popcomments]"); if (!b) return;
      openComments(b.getAttribute("data-popcomments"));
    });

    // "Suggest an edit" to a place (pre-fills the correction form)
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-suggestedit]"); if (!b) return;
      e.stopPropagation();
      var u = UNITS.find(function (x) { return x.id === b.getAttribute("data-suggestedit"); });
      if (u) openReport(u);
    });

    // toggle the clamped description inside a map popup (collapsed by default)
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-popmore]"); if (!b) return;
      e.preventDefault();
      var id = b.getAttribute("data-popmore");
      state.descExpanded[id] = !state.descExpanded[id];
      var m = markers[id], u = UNITS.find(function (x) { return x.id === id; });
      if (m && u && m.getPopup()) m.setPopupContent(popupHtml(u));
      renderList();
    });

    // click any full-address row (in a popup) to copy it
    document.addEventListener("click", function (e) {
      var c = e.target.closest("[data-copy]"); if (!c) return;
      var hint = c.querySelector(".copy-hint");
      copyText(c.getAttribute("data-copy")).then(function (ok) {
        if (!hint) return;
        var old = hint.textContent;
        hint.textContent = ok ? "Copied ✓" : "Copy failed";
        hint.style.color = ok ? "#248737" : "#b4524e";
        setTimeout(function () { hint.textContent = old; hint.style.color = "#6336B5"; }, 1400);
      });
    });
  }

  function loadVersion() {
    fetch("/VERSION", { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (v) { v = (v || "").trim(); var el = $("app-version"); if (el && v) el.textContent = "v" + v; })
      .catch(function () {});
  }

  function init() {
    renderLegend(); wire(); loadVersion();
    Promise.all([loadUnits(), loadComments()]).then(function () { renderAll(); updateNearUI(); });
    initMap();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
