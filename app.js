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
    WSB: { full: "World Bureau", color: "#4B4E8A" }
  };
  var REGION_FULL = { "Asia-Pacific": "APR", "European": "EUR", "Arab": "ARB", "Africa": "AFR", "Interamerican": "IAR", "World Bureau": "WSB", "World Scout Bureau": "WSB" };
  var KIND = { unit: "Unit", office: "Office", heritage: "Heritage" };
  var ALL_SECTIONS = ["Beaver", "Cub", "Scout", "Venture", "Rover", "Leader"];
  var NSOS = Array.isArray(window.SCOUT_NSOS) ? window.SCOUT_NSOS : [];

  // ── state ──────────────────────────────────────────────────────────
  var UNITS = [], COMMENTS = [];
  var map, layer, markers = {};
  var state = { query: "", region: "All", kind: "All", selectedId: null, anchor: null, geoMsg: "", panelOpen: true, commentsFor: null, replyTo: null };

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
    var url = u.url || u.homepage || "";
    var contact = u.contact;
    if (!contact) contact = url ? (/instagram/i.test(url) ? "instagram" : "homepage") : "none";
    return {
      id: u.id, kind: u.kind || "unit", name: u.name || "", country: u.country || "", city: u.city || "",
      nso: u.nso || "", region: region, lang: u.lang || "", lat: +u.lat, lng: +u.lng,
      address: u.address || u.place || "", sections: Array.isArray(u.sections) ? u.sections : [],
      tags: Array.isArray(u.tags) ? u.tags : [], desc: u.desc || u.note || "",
      contact: contact, url: url, status: u.status || "published"
    };
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
      if (q) { var hay = (u.name + " " + u.country + " " + u.city + " " + u.nso + " " + u.region + " " + (REGION[u.region] ? REGION[u.region].full : "") + " " + u.kind + " " + u.address).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
      return true;
    });
    var a = state.anchor;
    if (a) list = list.map(function (u) { return Object.assign({ _dist: haversine(a.lat, a.lng, u.lat, u.lng) }, u); }).sort(function (x, y) { return x._dist - y._dist; });
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
    var contact = u.contact && u.contact !== "none" ? '<a href="' + escAttr(u.url) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;font:600 12.5px \'Hanken Grotesk\';color:#fff;background:#6336B5;text-decoration:none;padding:8px 13px;border-radius:10px;">' + (u.contact === "instagram" ? "Instagram" : "Homepage") + ' →</a>' : '<span style="font-size:11.5px;color:#a39bb0;">Contact the national scout org</span>';
    var loc = u.city ? esc(u.city) + ", " + esc(u.country) : esc(u.country || "");
    var addr = u.address ? '<div class="sf-copy" data-copy="' + escAttr(u.address) + '" title="Click to copy the full address" style="display:flex;align-items:flex-start;gap:7px;cursor:pointer;font-size:12px;color:#5b5366;background:#f6f3fa;border:1px solid #efeae1;border-radius:10px;padding:8px 10px;margin-bottom:10px;line-height:1.4;">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6336B5" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:1px;"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z"></path><circle cx="12" cy="10" r="2.4"></circle></svg>' +
      '<span style="flex:1;min-width:0;">' + esc(u.address) + '</span>' +
      '<span class="copy-hint" style="flex:none;font:700 10px \'Hanken Grotesk\';color:#6336B5;white-space:nowrap;">Copy</span></div>' : "";
    return '<div style="font-family:\'Hanken Grotesk\';max-width:250px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;">' +
      '<span style="display:inline-flex;align-items:center;gap:5px;font:700 10px \'Hanken Grotesk\';text-transform:uppercase;letter-spacing:.05em;color:' + r.color + ';"><span style="width:7px;height:7px;border-radius:50%;background:' + r.color + ';"></span>' + esc(u.region) + ' · ' + esc(KIND[u.kind] || "") + '</span>' + dist + '</div>' +
      '<div style="font:700 16px \'Bricolage Grotesque\';color:#1E1730;letter-spacing:-.01em;line-height:1.15;margin-bottom:3px;">' + esc(u.name) + '</div>' +
      (loc ? '<div style="font-size:12px;color:#8a8496;margin-bottom:9px;">' + loc + '</div>' : '') +
      addr +
      (u.desc ? '<div style="font-size:12.5px;color:#42394f;line-height:1.5;margin-bottom:10px;">' + esc(u.desc) + '</div>' : "") +
      '<div style="margin-bottom:2px;">' + chips + '</div>' +
      '<div style="font-size:11px;color:#9a93a6;margin:8px 0 11px;padding-top:9px;border-top:1px solid #f0ebe2;">' + esc(u.nso) + '</div>' + contact + '</div>';
  }

  function addAnchorMarker() {
    if (state.anchor) L.marker([state.anchor.lat, state.anchor.lng], { icon: L.divIcon({ className: "", html: anchorHtml(), iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 2000, interactive: false }).addTo(layer);
  }

  function renderMarkers() {
    if (!map) return;
    layer.clearLayers(); markers = {};
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
        m.on("click", function () {
          if (g.length === 1) { map.flyTo([g[0].lat, g[0].lng], 7, { duration: .6 }); return; }
          var b = L.latLngBounds(g.map(function (u) { return [u.lat, u.lng]; }));
          map.flyToBounds(b.pad(0.35), { maxZoom: level === "region" ? 5 : 9, duration: .6 });
        });
      });
      addAnchorMarker();
      return;
    }

    // ── individual ranked pins (zoomed in) ──
    list.forEach(function (u, i) {
      if (isNaN(u.lat) || isNaN(u.lng)) return;
      var sel = u.id === state.selectedId;
      var icon = L.divIcon({ className: "", html: pinHtml(i + 1, u, sel), iconSize: [40, 46], iconAnchor: [20, 44], popupAnchor: [0, -42] });
      var m = L.marker([u.lat, u.lng], { icon: icon, zIndexOffset: sel ? 1000 : 0 }).addTo(layer);
      m.bindTooltip(u.name, { permanent: true, direction: "top", offset: [0, -46], className: "sf-label", opacity: 1 });
      m.bindPopup(popupHtml(u), { closeButton: true, maxWidth: 280, minWidth: 248, autoPanPadding: [60, 60] });
      m.on("click", function (e) { if (e && e.originalEvent) L.DomEvent.stopPropagation(e); select(u.id, false); });
      markers[u.id] = m;
    });
    addAnchorMarker();
  }

  function select(id, pan) {
    state.selectedId = id; renderMarkers(); renderList();
    var u = UNITS.find(function (x) { return x.id === id; });
    if (map && u) {
      if (pan) map.flyTo([u.lat, u.lng], Math.max(map.getZoom(), 11), { duration: .6 });
      setTimeout(function () { var m = markers[id]; if (m) m.openPopup(); }, pan ? 640 : 0);
    }
  }

  function setAnchor(lat, lng, label, fly) {
    state.anchor = { lat: lat, lng: lng, label: label }; state.geoMsg = "";
    renderMarkers(); renderList(); updateCounts(); updateNearUI();
    if (map) {
      var near = sorted().slice(0, 5).map(function (u) { return [u.lat, u.lng]; }); near.push([lat, lng]);
      if (near.length > 1) map.fitBounds(L.latLngBounds(near).pad(0.25), { maxZoom: 11 });
      else if (fly) map.flyTo([lat, lng], 11, { duration: .6 });
    }
  }
  function doSearch() {
    var q = state.query.trim().toLowerCase();
    if (!q) return;
    var f0 = UNITS.filter(function (u) { var hay = (u.name + " " + u.country + " " + u.city + " " + u.nso + " " + u.region + " " + (REGION[u.region] ? REGION[u.region].full : "")).toLowerCase(); return hay.indexOf(q) !== -1; });
    if (f0.length) { var lat = f0.reduce(function (s, u) { return s + u.lat; }, 0) / f0.length, lng = f0.reduce(function (s, u) { return s + u.lng; }, 0) / f0.length; setAnchor(lat, lng, '"' + state.query.trim() + '"', true); }
  }
  function geolocate() {
    if (!navigator.geolocation) { state.geoMsg = "Location unavailable — click the map to set your point."; updateCounts(); return; }
    navigator.geolocation.getCurrentPosition(
      function (p) { setAnchor(p.coords.latitude, p.coords.longitude, "your location", true); },
      function () { state.geoMsg = "Location blocked — click the map to set your point."; updateCounts(); },
      { timeout: 8000, maximumAge: 60000 }
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

  function renderList() {
    var f = sorted();
    var cardBase = "border:1px solid;border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;transition:all .15s;background:#fff;";
    var html = f.map(function (u, i) {
      var sel = u.id === state.selectedId;
      var rc = REGION[u.region] || { color: "#6336B5" };
      var cs = commentsFor(u.id).length;
      var place = [u.country || u.address, u.nso].filter(Boolean).join(" · ");
      var chips = (u.sections.length ? u.sections : u.tags).slice(0, 6).map(function (c) { return '<span style="font:600 11px \'Hanken Grotesk\';color:#5B2EA6;background:#f3eefb;padding:3px 9px;border-radius:999px;">' + esc(c) + '</span>'; }).join("");
      var dist = u._dist != null ? '<span style="flex:none;font:700 11.5px \'Hanken Grotesk\';color:#6336B5;background:#f3eefb;padding:3px 8px;border-radius:8px;white-space:nowrap;">' + u._dist.toFixed(1) + ' km</span>' : "";
      var contact = u.contact && u.contact !== "none" ? '<a href="' + escAttr(u.url) + '" target="_blank" rel="noopener" data-stop="1" style="font:600 12px \'Hanken Grotesk\';color:#6336B5;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">' + (u.contact === "instagram" ? "Instagram" : "Homepage") + ' →</a>' : '<span style="font-size:11.5px;color:#a39bb0;">Contact the national scout org</span>';
      var badge = "width:30px;height:30px;border-radius:" + (u.kind === "office" ? "8px" : "50%") + ";flex:none;display:flex;align-items:center;justify-content:center;background:" + rc.color + ";color:#fff;font:700 13px 'Hanken Grotesk';";
      var kindChip = "display:inline-flex;align-items:center;font:700 9.5px 'Hanken Grotesk';text-transform:uppercase;letter-spacing:.05em;color:#6b6577;background:#f1ece4;padding:3px 7px;border-radius:6px;";
      var regionChip = "display:inline-flex;align-items:center;font:700 9.5px 'Hanken Grotesk';letter-spacing:.04em;color:" + rc.color + ";background:" + rc.color + "14;padding:3px 7px;border-radius:6px;";
      var cardStyle = cardBase + (sel ? "border-color:#6336B5;box-shadow:0 0 0 3px #6336B51f;" : "border-color:#efeae1;");
      return '<div data-open="' + escAttr(u.id) + '" style="' + cardStyle + '">' +
        '<div style="display:flex;gap:12px;">' +
        '<div style="' + badge + '">' + (i + 1) + '</div>' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px;">' +
        '<span style="font:700 14.5px \'Bricolage Grotesque\';letter-spacing:-.01em;line-height:1.15;">' + esc(u.name) + '</span>' + dist + '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:7px;">' +
        '<span style="' + kindChip + '">' + esc(KIND[u.kind] || "") + '</span><span style="' + regionChip + '">' + esc(u.region) + '</span></div>' +
        '<div style="font-size:12px;color:#8a8496;margin-bottom:6px;line-height:1.35;">' + esc(place) + '</div>' +
        (u.desc ? '<div style="font-size:12.5px;color:#4a4458;line-height:1.45;margin-bottom:9px;">' + esc(u.desc) + '</div>' : "") +
        (chips ? '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">' + chips + '</div>' : "") +
        '<div style="display:flex;align-items:center;gap:12px;padding-top:9px;border-top:1px solid #f3eee5;">' + contact +
        '<div style="flex:1;"></div>' +
        '<button data-comments="' + escAttr(u.id) + '" style="border:none;background:transparent;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font:600 12px \'Hanken Grotesk\';color:#6b6577;padding:0;">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"></path></svg>' + cs + '</button>' +
        '</div></div></div></div>';
    }).join("");
    if (!f.length) html = '<div style="text-align:center;padding:46px 20px;color:#9a93a6;"><div style="font:600 14px \'Hanken Grotesk\';margin-bottom:4px;color:#6b6577;">No places found</div><div style="font-size:12.5px;">Try a different search or reset the filters.</div></div>';
    $("unit-list").innerHTML = html;
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

  function renderAll() { renderChips(); renderList(); updateCounts(); renderMarkers(); }

  function setPanelOpen(open) {
    state.panelOpen = open;
    $("panel").style.transform = open ? "none" : "translateX(-118%)";
    $("panel").style.opacity = open ? 1 : 0;
    $("panel-reopen").style.display = open ? "none" : "flex";
    $("searchbar").style.left = open ? "398px" : "18px";
    if (map) setTimeout(function () { map.invalidateSize(); }, 340);
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
      return '<div style="' + rowStyle + '">' +
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">' +
        '<span style="font:700 12.5px \'Hanken Grotesk\';color:#1E1730;">' + esc(c.name) + '</span>' +
        '<span style="font-size:10.5px;color:#b3adbd;">' + esc(c.ipMasked || "") + '</span>' +
        '<span style="font-size:10.5px;color:#b3adbd;">·</span>' +
        '<span style="font-size:10.5px;color:#b3adbd;">' + fmtTs(c.ts) + '</span></div>' +
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
        } else alert("Could not post: " + ((j && j.error) || "error"));
      })
      .catch(function () { $("post-btn").textContent = "Post comment"; alert("Network error — comment not posted."); });
  }

  // ── report a location (public submission → admin approval) ─────────
  var COUNTRY = (function () { var m = {}; NSOS.forEach(function (n) { m[n.country] = { nso: n.nso, region: regionCode(n.region), lang: n.lang }; }); return m; })();
  var COUNTRIES = Object.keys(COUNTRY).sort();
  var rep = { kind: "unit", contact: "none", sections: [], country: "", nso: "", region: "APR", lang: "", lat: null, lng: null, address: "" };
  function rSeg(active) { return "flex:1;border:1px solid;padding:9px 8px;border-radius:11px;font:600 12.5px 'Hanken Grotesk';cursor:pointer;transition:all .15s;" + (active ? "background:#6336B5;color:#fff;border-color:#6336B5;" : "background:#fff;color:#6b6577;border-color:#e7e1d8;"); }
  function rChip(active) { return "border:1px solid;padding:7px 12px;border-radius:999px;font:600 12.5px 'Hanken Grotesk';cursor:pointer;transition:all .15s;" + (active ? "background:#6336B5;color:#fff;border-color:#6336B5;" : "background:#fff;color:#5b5366;border-color:#e7e1d8;"); }
  function renderRKind() { $("r-kind-seg").innerHTML = ["unit", "office", "heritage"].map(function (k) { return '<button data-rkind="' + k + '" style="' + rSeg(rep.kind === k) + '">' + KIND[k] + '</button>'; }).join(""); $("r-sections-wrap").style.display = rep.kind === "unit" ? "block" : "none"; }
  function renderRContact() { $("r-contact-seg").innerHTML = [["none", "None"], ["instagram", "Instagram"], ["homepage", "Homepage"]].map(function (p) { return '<button data-rcontact="' + p[0] + '" style="' + rSeg(rep.contact === p[0]) + '">' + p[1] + '</button>'; }).join(""); $("r-url-wrap").style.display = rep.contact === "none" ? "none" : "block"; }
  function renderRSections() { $("r-sections").innerHTML = ALL_SECTIONS.map(function (s) { return '<button data-rsec="' + s + '" style="' + rChip(rep.sections.indexOf(s) !== -1) + '">' + s + '</button>'; }).join(""); }
  function renderRCountry() { $("r-country").innerHTML = '<option value="">Select a country…</option>' + COUNTRIES.map(function (c) { return '<option value="' + escAttr(c) + '"' + (c === rep.country ? " selected" : "") + ">" + esc(c) + "</option>"; }).join(""); }
  function updateRAuto() {
    if (!rep.country) { $("r-auto").textContent = "Select a country to auto-fill NSO, region and language."; return; }
    $("r-auto").textContent = (rep.nso || "—") + " · " + (REGION[rep.region] ? REGION[rep.region].full : rep.region) + " (" + (rep.lang || "—") + ")";
  }
  function openReport() {
    rep = { kind: "unit", contact: "none", sections: [], country: "", nso: "", region: "APR", lang: "", lat: null, lng: null, address: "" };
    ["r-rname", "r-raff", "r-name", "r-desc", "r-url", "r-addr"].forEach(function (id) { $(id).value = ""; });
    $("r-msg").textContent = ""; $("r-coord").textContent = "No location set yet — search above (the admin can fine-tune it).";
    renderRKind(); renderRContact(); renderRSections(); renderRCountry(); updateRAuto();
    $("report-modal").style.display = "flex";
  }
  function closeReport() { $("report-modal").style.display = "none"; }
  function rFind() {
    var q = $("r-addr").value.trim(); if (!q) return;
    $("r-coord").textContent = "Searching…";
    fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d[0]) { rep.lat = +(+d[0].lat).toFixed(5); rep.lng = +(+d[0].lon).toFixed(5); rep.address = d[0].display_name || q; $("r-coord").textContent = "📍 " + rep.lat + ", " + rep.lng + " — " + rep.address; } else $("r-coord").textContent = "No match found — try a different address."; })
      .catch(function () { $("r-coord").textContent = "Search unavailable — you can still submit; the admin will set the location."; });
  }
  function rSubmit() {
    var rname = $("r-rname").value.trim(), raff = $("r-raff").value.trim(), name = $("r-name").value.trim();
    if (!rname || !raff) { $("r-msg").textContent = "Please enter your name and affiliation."; return; }
    if (!name) { $("r-msg").textContent = "Please enter the place name."; return; }
    var unit = {
      kind: rep.kind, name: name, country: rep.country, nso: rep.nso, region: rep.region, lang: rep.lang,
      lat: rep.lat == null ? 0 : rep.lat, lng: rep.lng == null ? 0 : rep.lng, address: rep.address || $("r-addr").value.trim(),
      sections: rep.kind === "unit" ? rep.sections : [], tags: [], desc: $("r-desc").value.trim(),
      contact: rep.contact, url: rep.contact === "none" ? "" : $("r-url").value.trim(), status: "published"
    };
    var payload = { unit: unit, reporter: { name: rname, affiliation: raff } };
    $("r-msg").style.color = "#6b6577"; $("r-msg").textContent = "Submitting…"; $("r-submit").disabled = true;
    fetch("/api/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        $("r-submit").disabled = false;
        if (res.ok && res.j.ok) { $("r-msg").style.color = "#248737"; $("r-msg").textContent = "Thank you! Your report was submitted for admin review."; setTimeout(closeReport, 1400); }
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
    map = L.map("map", { zoomControl: false, worldCopyJump: true, minZoom: 2, maxBounds: [[-85.05, -180], [85.05, 180]], maxBoundsViscosity: 1.0 }).setView([25, 12], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on("click", function (e) { select(null, false); setAnchor(e.latlng.lat, e.latlng.lng, "your pinned point", false); });
    map.on("zoomend", renderMarkers);
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
    document.querySelectorAll(".q-near").forEach(function (b) { b.addEventListener("click", function () { state.kind = b.getAttribute("data-kind"); renderChips(); renderAll(); updateNearUI(); geolocate(); }); });
    $("reset").addEventListener("click", function () { state.query = ""; state.region = "All"; state.kind = "All"; state.selectedId = null; state.anchor = null; state.geoMsg = ""; $("search-input").value = ""; renderChips(); renderAll(); updateNearUI(); if (map) map.flyTo([25, 12], map.getMinZoom(), { duration: .6 }); });
    $("panel-collapse").addEventListener("click", function () { setPanelOpen(false); });
    $("panel-reopen").addEventListener("click", function () { setPanelOpen(true); });

    $("kind-chips").addEventListener("click", function (e) { var b = e.target.closest("[data-kind]"); if (!b) return; state.kind = b.getAttribute("data-kind"); renderChips(); renderAll(); updateNearUI(); });
    $("region-chips").addEventListener("click", function (e) { var b = e.target.closest("[data-region]"); if (!b) return; state.region = b.getAttribute("data-region"); renderChips(); renderAll(); });

    $("unit-list").addEventListener("click", function (e) {
      if (e.target.closest("[data-stop]")) { e.stopPropagation(); return; }
      var cb = e.target.closest("[data-comments]"); if (cb) { e.stopPropagation(); openComments(cb.getAttribute("data-comments")); return; }
      var card = e.target.closest("[data-open]"); if (card) select(card.getAttribute("data-open"), true);
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
    $("report-btn").addEventListener("click", openReport);
    $("r-close").addEventListener("click", closeReport);
    $("r-cancel").addEventListener("click", closeReport);
    $("report-modal").addEventListener("click", function (e) { if (e.target === $("report-modal")) closeReport(); });
    $("r-kind-seg").addEventListener("click", function (e) { var b = e.target.closest("[data-rkind]"); if (!b) return; rep.kind = b.getAttribute("data-rkind"); renderRKind(); });
    $("r-contact-seg").addEventListener("click", function (e) { var b = e.target.closest("[data-rcontact]"); if (!b) return; rep.contact = b.getAttribute("data-rcontact"); renderRContact(); });
    $("r-sections").addEventListener("click", function (e) { var b = e.target.closest("[data-rsec]"); if (!b) return; var s = b.getAttribute("data-rsec"); var i = rep.sections.indexOf(s); if (i === -1) rep.sections.push(s); else rep.sections.splice(i, 1); renderRSections(); });
    $("r-country").addEventListener("change", function (e) { rep.country = e.target.value; var m = COUNTRY[rep.country]; if (m) { rep.nso = m.nso; rep.region = m.region; rep.lang = m.lang; } else { rep.nso = ""; rep.lang = ""; } updateRAuto(); });
    $("r-find").addEventListener("click", rFind);
    $("r-addr").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); rFind(); } });
    $("r-submit").addEventListener("click", rSubmit);

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
