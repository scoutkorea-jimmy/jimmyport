/* =========================================================================
 * scout-finder — Admin (admin.html, TOTP sign-in, Bricolage + Hanken design).
 * Left rail (search + kind filter + list) · center form · right draggable map.
 * Auth: TOTP-only (6-digit Google Authenticator code → /api/login → session token).
 * Auto-saves to /api/units (KV) with an Authorization: Bearer <session_token> header.
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
  function regionCode(r) { return REGION[r] ? r : (REGION_FULL[r] || "APR"); }
  var COUNTRY = {}; NSOS.forEach(function (n) { COUNTRY[n.country] = { nso: n.nso, region: regionCode(n.region), lang: n.lang }; });
  var COUNTRIES = Object.keys(COUNTRY).sort();

  // ── state ──────────────────────────────────────────────────────────
  var units = [], map, marker = null, saveTimer = null, savedTimer = null;
  var state = { selectedId: null, query: "", kindFilter: "All", tagDraft: "", addrQuery: "", collapsed: { profile: true } };

  // ── helpers ────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }
  function sel() { return units.find(function (u) { return u.id === state.selectedId; }); }
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.style.display = "block"; clearTimeout(toast._t); toast._t = setTimeout(function () { t.style.display = "none"; }, 1800); }
  function fmtTs(ts) { try { var d = new Date(ts); var p = function (n) { return ("0" + n).slice(-2); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); } catch (e) { return ""; } }

  function normUnit(u) {
    var instagram = u.instagram || "", homepage = u.homepage || "", phone = u.phone || "", email = u.email || "";
    var legacy = u.url || "";  // migrate the old single contact/url model
    if (!instagram && !homepage && legacy) {
      if (u.contact === "instagram" || /instagram\.com/i.test(legacy)) instagram = legacy; else homepage = legacy;
    }
    return {
      id: u.id, kind: u.kind || "unit", name: u.name || "", subtitle: u.subtitle || "", country: u.country || "",
      nso: u.nso || "", region: regionCode(u.region), lang: u.lang || "",
      lat: +u.lat || 0, lng: +u.lng || 0, address: u.address || u.place || "",
      sections: Array.isArray(u.sections) ? u.sections : [], tags: Array.isArray(u.tags) ? u.tags : [],
      desc: u.desc || u.note || "", instagram: instagram, homepage: homepage, phone: phone, email: email,
      status: u.status || "published"
    };
  }

  // ── server ─────────────────────────────────────────────────────────
  function touch() { setSaved(false); clearTimeout(saveTimer); saveTimer = setTimeout(save, 700); }
  function setSaved(ok) { $("saved-label").textContent = ok ? "All changes saved" : "Saving…"; }
  function save(manual) {
    clearTimeout(saveTimer);
    if (!Auth.valid()) { setSaved(false); $("saved-label").textContent = "Sign in to publish"; if (manual) toast("Sign in to save"); Auth.requireReauth(); return; }
    if (manual) setSaved(false);
    fetch("/api/units", { method: "PUT", headers: Object.assign({ "content-type": "application/json" }, Auth.headers()), body: JSON.stringify({ units: units }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok) { setSaved(true); if (manual) toast("Saved"); }
        else if (res.status === 401) { $("saved-label").textContent = "Session expired — sign in again"; if (manual) toast("Session expired — sign in again"); Auth.requireReauth(); }
        else { $("saved-label").textContent = "Save failed: " + (res.j.error || res.status); if (manual) toast("Save failed: " + (res.j.error || res.status)); }
      })
      .catch(function () { $("saved-label").textContent = "Save failed (network)"; if (manual) toast("Save failed (network)"); });
  }
  function saveNow() { save(true); }
  function loadUnits() {
    return fetch("/api/units", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var arr = (j && Array.isArray(j.units)) ? j.units : (Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : []);
        units = arr.map(normUnit);
        state.selectedId = units[0] ? units[0].id : null;
        setSaved(true);
      })
      .catch(function () { units = []; setSaved(true); });
  }

  // ── map ────────────────────────────────────────────────────────────
  function markerHtml(color, kind) {
    var shape = kind === "office" ? "7px" : "50%";
    var badge = kind === "heritage" ? '<span style="position:absolute;top:-4px;right:-4px;width:13px;height:13px;background:#C2872E;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font:700 8px sans-serif;">★</span>' : "";
    return '<div style="position:relative;display:flex;flex-direction:column;align-items:center;"><div style="position:relative;width:30px;height:30px;border-radius:' + shape + ';background:' + color + ';border:2.5px solid #fff;box-shadow:0 4px 11px rgba(30,18,55,.4);">' + badge + '</div><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #fff;margin-top:-1px;"></div></div>';
  }
  function syncMarker(recenter) {
    if (!map) return;
    var s = sel();
    if (!s) { if (marker) { map.removeLayer(marker); marker = null; } return; }
    var color = REGION[s.region] ? REGION[s.region].color : "#6336B5";
    var icon = L.divIcon({ className: "", html: markerHtml(color, s.kind), iconSize: [40, 46], iconAnchor: [20, 44] });
    if (!marker) {
      marker = L.marker([s.lat, s.lng], { icon: icon, draggable: true }).addTo(map);
      marker.on("dragend", function () { var ll = marker.getLatLng(); setCoords(ll.lat, ll.lng, false); reverse(ll.lat, ll.lng); });
    } else { marker.setIcon(icon); marker.setLatLng([s.lat, s.lng]); }
    if (recenter) map.setView([s.lat, s.lng], Math.max(map.getZoom(), 11), { animate: true });
  }
  function setCoords(lat, lng, moveMarker) {
    lat = +(+lat).toFixed(7); lng = +(+lng).toFixed(7);
    var s = sel(); if (!s) return; s.lat = lat; s.lng = lng; touch();
    if (marker && moveMarker) marker.setLatLng([lat, lng]);
    var fl = $("f-lat"), fn = $("f-lng"); if (fl) fl.value = lat; if (fn) fn.value = lng;
    updateCap();
  }
  // While typing in the lat/lng fields: update the model + marker live, but do NOT
  // rewrite the inputs (so partial values like "37." or "-" survive).
  function onLatLngInput() {
    var s = sel(); if (!s) return;
    var fl = $("f-lat"), fn = $("f-lng");
    var la = parseFloat(fl ? fl.value : ""), ln = parseFloat(fn ? fn.value : "");
    if (isFinite(la)) s.lat = la;
    if (isFinite(ln)) s.lng = ln;
    if (marker && (isFinite(la) || isFinite(ln))) marker.setLatLng([s.lat, s.lng]);
    updateCap(); touch();
  }
  // On blur/Enter: clamp to valid ranges, round, and re-format the fields.
  function commitLatLng() {
    var s = sel(); if (!s) return;
    var la = +(+s.lat).toFixed(7), ln = +(+s.lng).toFixed(7);
    if (!isFinite(la)) la = 0; if (!isFinite(ln)) ln = 0;
    la = Math.max(-90, Math.min(90, la)); ln = Math.max(-180, Math.min(180, ln));
    s.lat = la; s.lng = ln;
    var fl = $("f-lat"), fn = $("f-lng"); if (fl) fl.value = la; if (fn) fn.value = ln;
    if (marker) marker.setLatLng([la, ln]);
    updateCap(); touch();
  }
  function find() {
    var s = sel(), q = state.addrQuery.trim(); if (!q || !s) return;
    fetch("https://nominatim.openstreetmap.org/search?format=json&accept-language=en&limit=1&q=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d[0]) { setCoords(d[0].lat, d[0].lon, true); s.address = d[0].display_name; var fa = $("f-address"); if (fa) fa.value = s.address; updateCap(); syncMarker(true); touch(); toast("Location set"); } else toast("No match — click the map instead"); })
      .catch(function () { toast("Search unavailable — click the map to set the point"); });
  }
  function reverse(lat, lng) {
    fetch("https://nominatim.openstreetmap.org/reverse?format=json&accept-language=en&lat=" + lat + "&lon=" + lng)
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.display_name) { var s = sel(); if (s) { s.address = d.display_name; var fa = $("f-address"); if (fa) fa.value = s.address; updateCap(); touch(); } } })
      .catch(function () {});
  }
  function updateCap() {
    var s = sel(), cap = $("map-cap"); if (!s) { cap.style.display = "none"; return; }
    cap.style.display = "flex";
    $("cap-dot").style.background = REGION[s.region] ? REGION[s.region].color : "#6336B5";
    $("cap-name").textContent = s.name || "Untitled";
    $("cap-addr").textContent = s.address ? s.address : (s.lat.toFixed(7) + ", " + s.lng.toFixed(7));
  }

  // ── rail ───────────────────────────────────────────────────────────
  function filt(active) { return "flex:1;border:none;padding:6px 4px;border-radius:8px;font:600 11.5px 'Hanken Grotesk';cursor:pointer;transition:all .15s;" + (active ? "background:#1E1730;color:#fff;" : "background:#f1ece4;color:#8a8496;"); }
  function renderFilters() {
    $("rail-filters").innerHTML = ["All", "unit", "office", "heritage"].map(function (k) {
      return '<button data-filter="' + k + '" style="' + filt(state.kindFilter === k) + '">' + (k === "All" ? "All" : KIND[k]) + '</button>';
    }).join("");
  }
  function railList() {
    var q = state.query.trim().toLowerCase();
    return units.filter(function (u) {
      if (state.kindFilter !== "All" && u.kind !== state.kindFilter) return false;
      if (q && (u.name + " " + u.country + " " + u.nso).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  function renderRail() {
    var list = railList();
    $("rail-list").innerHTML = list.map(function (u) {
      var isSel = u.id === state.selectedId;
      var rc = REGION[u.region] || { color: "#9a93a6" };
      var rowStyle = "display:flex;gap:10px;padding:11px 11px;border-radius:12px;cursor:pointer;margin-bottom:3px;transition:background .12s;align-items:flex-start;" + (isSel ? "background:#f1ecf9;" : "background:transparent;");
      var statusStyle = "flex:none;font:700 9.5px 'Hanken Grotesk';text-transform:uppercase;letter-spacing:.04em;padding:3px 7px;border-radius:6px;margin-top:2px;" + (u.status === "draft" ? "background:#fbf0dd;color:#b5832e;" : "background:#e6f3ec;color:#2e8b57;");
      return '<div data-select="' + escAttr(u.id) + '" style="' + rowStyle + '">' +
        '<span style="width:10px;height:10px;border-radius:' + (u.kind === "office" ? "3px" : "50%") + ';background:' + rc.color + ';flex:none;margin-top:4px;"></span>' +
        '<div style="flex:1;min-width:0;"><div style="font:700 13px \'Hanken Grotesk\';line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(u.name || "Untitled") + '</div>' +
        '<div style="font-size:11px;color:#8a8496;margin-top:2px;">' + esc(KIND[u.kind] + " · " + u.region + (u.country ? " · " + u.country : "")) + '</div></div>' +
        '<span style="' + statusStyle + '">' + (u.status === "draft" ? "Draft" : "Live") + '</span></div>';
    }).join("");
    $("rail-count").textContent = list.length;
  }

  // ── form ───────────────────────────────────────────────────────────
  function seg(active) { return "flex:1;border:1px solid;padding:9px 8px;border-radius:11px;font:600 12.5px 'Hanken Grotesk';cursor:pointer;transition:all .15s;" + (active ? "background:#6336B5;color:#fff;border-color:#6336B5;" : "background:#fff;color:#6b6577;border-color:#e7e1d8;"); }
  function chip(active) { return "border:1px solid;padding:7px 12px;border-radius:999px;font:600 12.5px 'Hanken Grotesk';cursor:pointer;transition:all .15s;" + (active ? "background:#6336B5;color:#fff;border-color:#6336B5;" : "background:#fff;color:#5b5366;border-color:#e7e1d8;"); }
  var CARD = "background:#fff;border:1px solid #ece6db;border-radius:16px;padding:18px;margin-bottom:16px;box-shadow:0 2px 8px rgba(30,18,55,.04);";
  var SEC = "font:700 10.5px 'Hanken Grotesk';text-transform:uppercase;letter-spacing:.07em;color:#9a93a6;margin-bottom:14px;";
  var LBL = "display:block;font:600 12px 'Hanken Grotesk';color:#6b6577;margin:14px 0 7px;";
  var BTN_SOFT = "border:none;background:#f1ecf9;color:#5B2EA6;font:600 12.5px 'Hanken Grotesk';padding:9px 14px;border-radius:11px;cursor:pointer;white-space:nowrap;";

  // Collapsible form card. Header click toggles state.collapsed[key]; Profile starts collapsed.
  function card(key, title, body) {
    var col = !!state.collapsed[key];
    var chev = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(' + (col ? "-90deg" : "0deg") + ');transition:transform .15s;color:#b3adbd;flex:none;"><path d="m6 9 6 6 6-6"></path></svg>';
    return '<div style="' + CARD + '">' +
      '<div data-collapse="' + key + '" style="' + SEC + 'margin-bottom:' + (col ? "0" : "14px") + ';display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;user-select:none;">' +
      '<span>' + title + '</span>' + chev + '</div>' +
      '<div data-body="' + key + '"' + (col ? ' style="display:none;"' : '') + '>' + body + '</div></div>';
  }

  function renderForm() {
    var s = sel();
    if (!s) { $("form").innerHTML = ""; $("form").style.display = "none"; $("form-empty").style.display = "flex"; updateCap(); return; }
    $("form").style.display = "block"; $("form-empty").style.display = "none";
    var rc = REGION[s.region] || { full: "", color: "#6336B5" };
    var isUnit = s.kind === "unit";
    var autoLine = (s.nso || "—") + " · " + (rc.full || s.region) + " (" + (s.lang || "—") + ")";
    var subline = KIND[s.kind] + " · " + (s.country || "No country") + " · " + s.region;

    var kindSeg = ["unit", "office", "heritage"].map(function (k) { return '<button data-act="kind" data-val="' + k + '" style="' + seg(s.kind === k) + '">' + KIND[k] + '</button>'; }).join("");
    var countryOpts = '<option value="">Select a country…</option>' + COUNTRIES.map(function (c) { return '<option value="' + escAttr(c) + '"' + (c === s.country ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("");
    var regionOpts = Object.keys(REGION).map(function (code) { return '<option value="' + code + '"' + (code === s.region ? " selected" : "") + ">" + code + " · " + esc(REGION[code].full) + "</option>"; }).join("");
    var sectionChips = ALL_SECTIONS.map(function (x) { return '<button data-act="sec" data-val="' + x + '" style="' + chip(s.sections.indexOf(x) !== -1) + '">' + x + '</button>'; }).join("");
    var tagChips = s.tags.map(function (t) { return '<span style="display:inline-flex;align-items:center;gap:6px;background:#f3eefb;color:#5B2EA6;font:600 12px \'Hanken Grotesk\';padding:6px 8px 6px 11px;border-radius:999px;">' + esc(t) + '<button data-act="tagdel" data-val="' + escAttr(t) + '" style="border:none;background:#e4d8f5;width:17px;height:17px;border-radius:50%;cursor:pointer;color:#5B2EA6;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;">×</button></span>'; }).join("");
    var statusSeg = [["published", "Live"], ["draft", "Draft"]].map(function (p) { return '<button data-act="status" data-val="' + p[0] + '" style="' + seg(s.status === p[0]) + '">' + p[1] + '</button>'; }).join("");

    $("form").innerHTML = '<div style="max-width:620px;margin:0 auto;padding:24px 28px 60px;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:22px;">' +
      '<div><div style="font:700 21px \'Bricolage Grotesque\';letter-spacing:-.015em;line-height:1.1;">' + esc(s.name || "Untitled") + '</div><div style="font-size:12.5px;color:#8a8496;margin-top:4px;">' + esc(subline) + '</div></div>' +
      '<div style="display:flex;gap:8px;flex:none;">' +
      '<button data-act="save" style="border:none;background:#6336B5;color:#fff;font:600 12px \'Hanken Grotesk\';padding:8px 16px;border-radius:10px;cursor:pointer;">Save</button>' +
      '<button data-act="del" style="border:1px solid #ecd9d9;background:#fff;color:#b4524e;font:600 12px \'Hanken Grotesk\';padding:8px 12px;border-radius:10px;cursor:pointer;">Delete</button>' +
      '</div></div>' +

      card("basics", "Basics",
        '<label style="' + LBL + '">Name</label><input id="f-name" value="' + escAttr(s.name) + '" class="sf-fld" placeholder="e.g. Yeoksam Scout Unit" />' +
        '<label style="' + LBL + '">Subtitle <span style="color:#b3adbd;font-weight:500;">(shown smaller / grey on the map)</span></label><input id="f-subtitle" value="' + escAttr(s.subtitle) + '" class="sf-fld" placeholder="e.g. Gangnam · since 1971" />' +
        '<label style="' + LBL + '">Place type</label><div style="display:flex;gap:6px;">' + kindSeg + '</div>' +
        '<label style="' + LBL + '">Visibility</label><div style="display:flex;gap:6px;">' + statusSeg + '</div>') +

      card("affiliation", "Affiliation",
        '<label style="' + LBL + '">Country</label>' +
        '<select id="f-country" class="sf-fld" style="appearance:none;cursor:pointer;">' + countryOpts + '</select>' +
        '<label style="' + LBL + '">Region</label>' +
        '<select id="f-region" class="sf-fld" style="appearance:none;cursor:pointer;">' + regionOpts + '</select>' +
        '<label style="' + LBL + '">NSO · Language <span style="color:#b3adbd;font-weight:500;">(auto from country)</span></label>' +
        '<div style="background:#f5f2ec;border:1px solid #ece6db;border-radius:11px;padding:11px 13px;font:500 13px \'Hanken Grotesk\';color:#6b6577;">' + esc(autoLine) + '</div>') +

      card("profile", "Profile",
        '<label style="' + LBL + '">Short introduction</label><textarea id="f-desc" class="sf-fld" style="resize:vertical;min-height:74px;line-height:1.5;" placeholder="A sentence or two about this place and its activities.">' + esc(s.desc) + '</textarea>' +
        (isUnit
          ? '<label style="' + LBL + '">Sections (recruiting)</label><div style="display:flex;flex-wrap:wrap;gap:6px;">' + sectionChips + '</div>'
          : '<label style="' + LBL + '">Categories</label><div style="display:flex;flex-wrap:wrap;gap:7px;align-items:center;">' + tagChips + '</div>' +
            '<div style="display:flex;gap:7px;margin-top:9px;"><input id="f-tagdraft" value="' + escAttr(state.tagDraft) + '" class="sf-fld" placeholder="Add a category (e.g. Training centre) and press Enter" style="flex:1;" /><button data-act="tagadd" style="' + BTN_SOFT + '">Add</button></div>'
        )) +

      card("contact", 'Contact <span style="color:#b3adbd;font-weight:500;font-size:11.5px;">— all optional, leave blank if none</span>',
        '<label style="' + LBL + '">Instagram</label><input id="f-instagram" value="' + escAttr(s.instagram) + '" class="sf-fld" placeholder="https://instagram.com/… or @handle" />' +
        '<label style="' + LBL + '">Phone</label><input id="f-phone" value="' + escAttr(s.phone) + '" class="sf-fld" placeholder="e.g. +82 2 1234 5678" />' +
        '<label style="' + LBL + '">Email</label><input id="f-email" value="' + escAttr(s.email) + '" class="sf-fld" placeholder="e.g. info@example.org" />' +
        '<label style="' + LBL + '">Homepage</label><input id="f-homepage" value="' + escAttr(s.homepage) + '" class="sf-fld" placeholder="https://" />') +

      card("location", "Location",
        '<label style="' + LBL + '">Address or place search</label><div style="display:flex;gap:7px;"><input id="f-addr" value="' + escAttr(state.addrQuery) + '" class="sf-fld" placeholder="Search an address or place" style="flex:1;" /><button data-act="find" style="' + BTN_SOFT + '">Find &amp; set</button></div>' +
        '<label style="' + LBL + '">Full address</label><input id="f-address" value="' + escAttr(s.address) + '" class="sf-fld" placeholder="Street, city, country" />' +
        '<div style="display:flex;gap:8px;margin-top:12px;align-items:flex-end;">' +
        '<div style="flex:1;min-width:0;"><label style="' + LBL + '">Latitude</label><input id="f-lat" value="' + escAttr(s.lat) + '" class="sf-fld" inputmode="decimal" /></div>' +
        '<div style="flex:1;min-width:0;"><label style="' + LBL + '">Longitude</label><input id="f-lng" value="' + escAttr(s.lng) + '" class="sf-fld" inputmode="decimal" /></div>' +
        '<button data-act="showcoord" title="Apply coordinates and show on the map" style="' + BTN_SOFT + 'padding:11px 16px;flex:none;">Show on map</button>' +
        '</div>' +
        '<div style="margin-top:10px;font-size:11.5px;color:#9a93a6;">Type coordinates and press “Show on map”, drag the pin, or click the map.</div>') +
      '</div>';
    updateCap();
  }

  function set(patch) { var s = sel(); if (!s) return; Object.assign(s, patch); touch(); }

  // ── actions ────────────────────────────────────────────────────────
  function selectUnit(id) { state.selectedId = id; state.addrQuery = ""; renderRail(); renderForm(); syncMarker(true); }
  function addUnit() {
    var id = "unit-" + Date.now().toString(36);
    var nu = { id: id, kind: "unit", name: "New scout place", subtitle: "", country: "", nso: "", region: "APR", lang: "", lat: 20, lng: 0, address: "", sections: [], tags: [], desc: "", instagram: "", homepage: "", phone: "", email: "", status: "draft" };
    units.unshift(nu); state.selectedId = id; state.query = ""; state.kindFilter = "All"; state.addrQuery = "";
    $("rail-search").value = ""; renderFilters(); renderRail(); renderForm(); syncMarker(true); touch();
  }
  function delUnit() {
    if (!confirm("Delete this place?")) return;
    units = units.filter(function (u) { return u.id !== state.selectedId; });
    state.selectedId = units[0] ? units[0].id : null;
    renderRail(); renderForm(); syncMarker(true); touch(); toast("Place deleted");
  }
  function addTag() { var t = state.tagDraft.trim(), s = sel(); if (!t || !s) return; if (s.tags.indexOf(t) === -1) s.tags.push(t); state.tagDraft = ""; renderForm(); touch(); }
  function doCopy() { try { navigator.clipboard.writeText(JSON.stringify({ units: units }, null, 2)); toast("JSON copied to clipboard"); } catch (e) { toast("Copy failed"); } }
  function doDownload() {
    try { var blob = new Blob(["window.SCOUT_UNITS = " + JSON.stringify(units, null, 2) + ";\n"], { type: "text/javascript" }); var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "data.js"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); toast("Downloaded data.js"); } catch (e) {}
  }
  function doImport() {
    try {
      var p = JSON.parse($("import-text").value); var arr = Array.isArray(p) ? p : p.units; if (!Array.isArray(arr)) throw 0;
      units = arr.map(normUnit); state.selectedId = units[0] ? units[0].id : null;
      $("import-modal").style.display = "none"; renderRail(); renderForm(); syncMarker(true); touch(); toast("Imported " + units.length + " places");
    } catch (e) { toast("Invalid JSON"); }
  }

  // ── pending location reports (submissions → approve/reject) ────────
  var pendingItems = [];
  function updatePendingCount() { var c = $("pending-count"); if (!c) return; if (pendingItems.length) { c.textContent = pendingItems.length; c.style.display = "inline-block"; } else c.style.display = "none"; }
  function fetchPending() {
    if (!Auth.valid()) return;
    fetch("/api/submissions", { headers: Auth.headers() }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      pendingItems = (j && Array.isArray(j.pending)) ? j.pending : [];
      updatePendingCount();
      if ($("pending-modal").style.display === "flex") renderPending();
    }).catch(function () {});
  }
  function renderPending() {
    if (!pendingItems.length) { $("pending-list").innerHTML = '<div style="text-align:center;padding:40px;color:#a39bb0;font-size:13px;">No pending reports.</div>'; return; }
    $("pending-list").innerHTML = pendingItems.map(function (p) {
      var u = p.unit || {}, rep = p.reporter || {};
      var code = regionCode(u.region), rc = REGION[code] || { color: "#9a93a6" };
      var locLine = u.address ? ("📍 " + esc(u.address) + (u.lat ? " (" + (+u.lat).toFixed(3) + ", " + (+u.lng).toFixed(3) + ")" : "")) : (u.lat ? ("📍 " + (+u.lat).toFixed(3) + ", " + (+u.lng).toFixed(3)) : "");
      return '<div style="border:1px solid #ece6db;border-radius:14px;padding:16px;margin-bottom:12px;">' +
        '<div style="display:flex;align-items:flex-start;gap:10px;">' +
        '<span style="width:11px;height:11px;border-radius:' + (u.kind === "office" ? "3px" : "50%") + ';background:' + rc.color + ';flex:none;margin-top:5px;"></span>' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font:700 15px \'Bricolage Grotesque\';">' + esc(u.name || "Untitled") + '</div>' +
        '<div style="font-size:12px;color:#8a8496;margin-top:3px;">' + esc((KIND[u.kind] || "") + " · " + code + (u.country ? " · " + u.country : "")) + '</div>' +
        (u.desc ? '<div style="font-size:12.5px;color:#4a4458;margin-top:8px;line-height:1.5;">' + esc(u.desc) + '</div>' : "") +
        (locLine ? '<div style="font-size:11.5px;color:#9a93a6;margin-top:6px;">' + locLine + '</div>' : "") +
        (function () {
          var p = [];
          if (u.instagram) p.push('<a href="' + escAttr(u.instagram) + '" target="_blank" rel="noopener" style="color:#6336B5;">Instagram</a>');
          if (u.homepage) p.push('<a href="' + escAttr(u.homepage) + '" target="_blank" rel="noopener" style="color:#6336B5;">Homepage</a>');
          if (u.phone) p.push(esc(u.phone));
          if (u.email) p.push('<a href="mailto:' + escAttr(u.email) + '" style="color:#6336B5;">' + esc(u.email) + '</a>');
          if (!p.length && u.url && u.contact !== "none") p.push('<a href="' + escAttr(u.url) + '" target="_blank" rel="noopener" style="color:#6336B5;">' + esc(u.url) + '</a>');
          return p.length ? '<div style="font-size:11.5px;margin-top:6px;">' + p.join(" · ") + '</div>' : "";
        })() +
        '</div></div>' +
        '<div style="margin-top:12px;padding-top:11px;border-top:1px solid #f0ebe2;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
        '<span style="font-size:11.5px;color:#8a8496;"><strong style="color:#1E1730;">' + esc(rep.name || "—") + '</strong> · ' + esc(rep.affiliation || "—") + '</span>' +
        '<span style="font-size:10.5px;color:#b3adbd;">' + esc(p.ip || "") + ' · ' + fmtTs(p.ts) + '</span>' +
        '<div style="flex:1;"></div>' +
        '<button data-reject="' + escAttr(p.id) + '" style="border:1px solid #ecd9d9;background:#fff;color:#b4524e;font:600 12px \'Hanken Grotesk\';padding:7px 13px;border-radius:9px;cursor:pointer;">Reject</button>' +
        '<button data-approve="' + escAttr(p.id) + '" style="border:none;background:#248737;color:#fff;font:600 12px \'Hanken Grotesk\';padding:7px 15px;border-radius:9px;cursor:pointer;">Approve</button>' +
        '</div></div>';
    }).join("");
  }
  function patchPending(id, action) {
    if (!Auth.valid()) { Auth.requireReauth(); return; }
    fetch("/api/submissions", { method: "PATCH", headers: Object.assign({ "content-type": "application/json" }, Auth.headers()), body: JSON.stringify({ id: id, action: action }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.ok) {
          toast(action === "approve" ? "Approved & published" : "Report rejected");
          pendingItems = pendingItems.filter(function (p) { return p.id !== id; });
          updatePendingCount(); renderPending();
          if (action === "approve") { var keep = state.selectedId; loadUnits().then(function () { if (keep && units.some(function (u) { return u.id === keep; })) state.selectedId = keep; renderRail(); renderForm(); syncMarker(true); }); }
        } else if (res.status === 401) { Auth.requireReauth(); }
        else toast("Failed: " + (res.j.error || res.status));
      })
      .catch(function () { toast("Network error"); });
  }

  // ── comment keyword filter (admin) ─────────────────────────────────
  function openFilter() {
    if (!Auth.valid()) { Auth.requireReauth(); return; }
    $("filter-modal").style.display = "flex";
    $("filter-msg").textContent = "Loading…"; $("filter-text").value = ""; $("filter-defaults").textContent = "";
    fetch("/api/comment-filter", { headers: Auth.headers() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) { $("filter-msg").textContent = "Could not load the filter."; return; }
        $("filter-text").value = (j.words || []).join("\n");
        $("filter-defaults").textContent = (j.defaults || []).join(",  ");
        $("filter-msg").textContent = "";
      })
      .catch(function () { $("filter-msg").textContent = "Network error."; });
  }
  function saveFilter() {
    if (!Auth.valid()) { Auth.requireReauth(); return; }
    var words = $("filter-text").value.split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean);
    $("filter-msg").textContent = "Saving…";
    fetch("/api/comment-filter", { method: "PUT", headers: Object.assign({ "content-type": "application/json" }, Auth.headers()), body: JSON.stringify({ words: words }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.ok) { $("filter-msg").textContent = "Saved — " + res.j.count + " custom word(s)."; toast("Comment filter saved"); setTimeout(function () { $("filter-modal").style.display = "none"; }, 800); }
        else if (res.status === 401) { Auth.requireReauth(); }
        else $("filter-msg").textContent = "Save failed: " + (res.j.error || res.status);
      })
      .catch(function () { $("filter-msg").textContent = "Network error."; });
  }

  // ── TOTP sign-in gate ──────────────────────────────────────────────
  var Auth = (function () {
    var token = "", expMs = 0, inited = false, idleTimer = null, idleWired = false;
    var LS = "scoutfinder:admin-session";
    var IDLE_MS = 30 * 60 * 1000; // sign out after 30 min of inactivity
    function gate(msg) { var m = $("auth-msg"); if (m) m.textContent = msg || ""; }
    function valid() { return !!token && Date.now() < expMs - 5000; }
    function headers() { return token ? { "Authorization": "Bearer " + token } : {}; }
    function save() { try { localStorage.setItem(LS, JSON.stringify({ token: token, exp: expMs })); } catch (e) {} }
    function clearLS() { try { localStorage.removeItem(LS); } catch (e) {} }
    // 30-minute idle timeout — any click/keypress/action resets the countdown.
    function resetIdle() { if (!token) return; if (idleTimer) clearTimeout(idleTimer); idleTimer = setTimeout(function () { if (token) { token = ""; expMs = 0; clearLS(); showGate("Signed out after 30 minutes of inactivity."); } }, IDLE_MS); }
    function startIdle() {
      resetIdle();
      if (idleWired) return; idleWired = true;
      ["pointerdown", "keydown", "input", "change", "wheel", "touchstart"].forEach(function (ev) { document.addEventListener(ev, resetIdle, true); });
    }
    function stopIdle() { if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } }
    function showGate(msg) { stopIdle(); document.body.classList.remove("authed"); gate(msg || ""); var i = $("otp-input"); if (i) { i.value = ""; try { i.focus(); } catch (e) {} } }
    function requireReauth() { token = ""; expMs = 0; clearLS(); showGate("Session expired — enter a new code."); }
    function onAuthed() { var w = $("admin-who"); if (w) w.textContent = "Admin"; document.body.classList.add("authed"); gate(""); startIdle(); if (!inited) { inited = true; init(); } }
    function submit(code) {
      code = String(code || "").replace(/\D/g, "");
      if (code.length !== 6) { gate("Enter the 6-digit code."); return; }
      gate("Verifying…");
      fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code }) })
        .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }, function () { return { s: r.status, j: {} }; }); })
        .then(function (res) {
          if (res.s === 200 && res.j && res.j.ok) { token = res.j.token; expMs = res.j.exp || (Date.now() + 12 * 3600 * 1000); save(); onAuthed(); }
          else if (res.s === 429) { gate("Too many attempts. Wait a few minutes, then try again."); }
          else if (res.s === 503) { gate("Server is missing TOTP_SECRET. Set it in Cloudflare Pages env."); }
          else { token = ""; expMs = 0; var i = $("otp-input"); if (i) { i.value = ""; try { i.focus(); } catch (e) {} } gate("Invalid code. Check your authenticator app and try again."); }
        })
        .catch(function () { gate("Network error. Try again."); });
    }
    function start() {
      try { var raw = localStorage.getItem(LS); if (raw) { var o = JSON.parse(raw); if (o && o.token && o.exp && Date.now() < o.exp - 5000) { token = o.token; expMs = o.exp; } } } catch (e) {}
      var form = $("otp-form");
      if (form) form.addEventListener("submit", function (e) { e.preventDefault(); submit($("otp-input").value); });
      if (valid()) {
        fetch("/api/me", { headers: headers() }).then(function (r) {
          if (r.ok) onAuthed(); else { token = ""; expMs = 0; clearLS(); showGate(); }
        }).catch(function () { onAuthed(); }); // network hiccup: trust local session until a real call 401s
      } else { showGate(); }
    }
    function signOut() { token = ""; expMs = 0; clearLS(); showGate("Signed out."); }
    return { start: start, valid: valid, headers: headers, requireReauth: requireReauth, signOut: signOut };
  })();

  // ── draggable splitter (form ↔ map column widths) ──────────────────
  function initSplitter() {
    var mapCol = $("map-col"), splitter = $("col-splitter");
    if (!mapCol || !splitter) return;
    var LS = "scoutfinder:admin-mapw";
    function clampW(w) {
      var row = mapCol.parentElement, rail = document.querySelector(".sf-admin-rail");
      var total = row ? row.clientWidth : window.innerWidth;
      var railW = rail ? rail.offsetWidth : 0;
      var maxW = Math.max(360, total - railW - 320); // leave room for the rail + a min form width
      return Math.max(320, Math.min(w, maxW));
    }
    try { var saved = parseInt(localStorage.getItem(LS), 10); if (saved) mapCol.style.width = clampW(saved) + "px"; } catch (e) {}
    var dragging = false;
    function onMove(e) {
      if (!dragging) return;
      var cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      var rect = mapCol.parentElement.getBoundingClientRect();
      mapCol.style.width = clampW(rect.right - cx) + "px";
      if (map) map.invalidateSize();
    }
    function onUp() {
      if (!dragging) return;
      dragging = false; document.body.style.cursor = ""; document.body.style.userSelect = "";
      try { localStorage.setItem(LS, parseInt(mapCol.style.width, 10)); } catch (e) {}
      if (map) map.invalidateSize();
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp);
    }
    splitter.addEventListener("pointerdown", function (e) {
      dragging = true; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
      e.preventDefault();
    });
    window.addEventListener("resize", function () { if (mapCol.style.width) mapCol.style.width = clampW(parseInt(mapCol.style.width, 10)) + "px"; if (map) map.invalidateSize(); });
  }

  // ── init (after sign-in) ───────────────────────────────────────────
  function init() {
    map = L.map("admin-map", { zoomControl: false }).setView([20, 0], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.on("click", function (e) { setCoords(e.latlng.lat, e.latlng.lng, true); reverse(e.latlng.lat, e.latlng.lng); });

    initSplitter();

    // toolbar
    $("add-btn").addEventListener("click", addUnit);
    $("copy-btn").addEventListener("click", doCopy);
    $("download-btn").addEventListener("click", doDownload);
    $("filter-btn").addEventListener("click", openFilter);
    $("filter-close").addEventListener("click", function () { $("filter-modal").style.display = "none"; });
    $("filter-cancel").addEventListener("click", function () { $("filter-modal").style.display = "none"; });
    $("filter-modal").addEventListener("click", function (e) { if (e.target === $("filter-modal")) $("filter-modal").style.display = "none"; });
    $("filter-save").addEventListener("click", saveFilter);
    $("import-btn").addEventListener("click", function () { $("import-text").value = ""; $("import-modal").style.display = "flex"; });
    $("import-cancel").addEventListener("click", function () { $("import-modal").style.display = "none"; });
    $("import-load").addEventListener("click", doImport);
    $("signout-btn").addEventListener("click", function () { Auth.signOut(); });
    $("pending-btn").addEventListener("click", function () { $("pending-modal").style.display = "flex"; renderPending(); fetchPending(); });
    $("pending-close").addEventListener("click", function () { $("pending-modal").style.display = "none"; });
    $("pending-modal").addEventListener("click", function (e) { if (e.target === $("pending-modal")) $("pending-modal").style.display = "none"; });
    $("pending-list").addEventListener("click", function (e) {
      var a = e.target.closest("[data-approve]"); if (a) { patchPending(a.getAttribute("data-approve"), "approve"); return; }
      var r = e.target.closest("[data-reject]"); if (r) { if (confirm("Reject and discard this report?")) patchPending(r.getAttribute("data-reject"), "reject"); }
    });

    // rail
    $("rail-search").addEventListener("input", function (e) { state.query = e.target.value; renderRail(); });
    $("rail-filters").addEventListener("click", function (e) { var b = e.target.closest("[data-filter]"); if (!b) return; state.kindFilter = b.getAttribute("data-filter"); renderFilters(); renderRail(); });
    $("rail-list").addEventListener("click", function (e) { var b = e.target.closest("[data-select]"); if (b) selectUnit(b.getAttribute("data-select")); });

    // form (delegated)
    $("form").addEventListener("click", function (e) {
      var col = e.target.closest("[data-collapse]");
      if (col) {
        var key = col.getAttribute("data-collapse"); state.collapsed[key] = !state.collapsed[key];
        var isCol = state.collapsed[key], body = $("form").querySelector('[data-body="' + key + '"]');
        if (body) body.style.display = isCol ? "none" : "";
        col.style.marginBottom = isCol ? "0" : "14px";
        var svg = col.querySelector("svg"); if (svg) svg.style.transform = "rotate(" + (isCol ? "-90deg" : "0deg") + ")";
        return;
      }
      var b = e.target.closest("[data-act]"); if (!b) return;
      var act = b.getAttribute("data-act"), val = b.getAttribute("data-val");
      if (act === "save") { saveNow(); }
      else if (act === "showcoord") { commitLatLng(); syncMarker(true); toast("Showing location on the map"); }
      else if (act === "kind") { set({ kind: val }); renderRail(); renderForm(); syncMarker(false); }
      else if (act === "status") { set({ status: val }); renderRail(); renderForm(); }
      else if (act === "sec") { var s = sel(); var has = s.sections.indexOf(val) !== -1; s.sections = has ? s.sections.filter(function (x) { return x !== val; }) : s.sections.concat([val]); touch(); renderForm(); }
      else if (act === "tagdel") { var s2 = sel(); s2.tags = s2.tags.filter(function (x) { return x !== val; }); touch(); renderForm(); }
      else if (act === "tagadd") { addTag(); }
      else if (act === "find") { find(); }
      else if (act === "del") { delUnit(); }
    });
    $("form").addEventListener("input", function (e) {
      var id = e.target.id, v = e.target.value;
      if (id === "f-name") { set({ name: v }); renderRail(); updateCap(); }
      else if (id === "f-subtitle") { set({ subtitle: v }); }
      else if (id === "f-desc") { set({ desc: v }); }
      else if (id === "f-instagram") { set({ instagram: v }); }
      else if (id === "f-phone") { set({ phone: v }); }
      else if (id === "f-email") { set({ email: v }); }
      else if (id === "f-homepage") { set({ homepage: v }); }
      else if (id === "f-address") { set({ address: v }); updateCap(); }
      else if (id === "f-lat" || id === "f-lng") { onLatLngInput(); }
      else if (id === "f-tagdraft") { state.tagDraft = v; }
      else if (id === "f-addr") { state.addrQuery = v; }
    });
    $("form").addEventListener("keydown", function (e) { if (e.target.id === "f-tagdraft" && e.key === "Enter") { e.preventDefault(); addTag(); } if (e.target.id === "f-addr" && e.key === "Enter") { e.preventDefault(); find(); } if ((e.target.id === "f-lat" || e.target.id === "f-lng") && e.key === "Enter") { e.preventDefault(); commitLatLng(); } });
    $("form").addEventListener("change", function (e) {
      if (e.target.id === "f-country") { var c = e.target.value, m = COUNTRY[c]; set(m ? { country: c, nso: m.nso, region: m.region, lang: m.lang } : { country: c }); renderRail(); renderForm(); syncMarker(false); }
      else if (e.target.id === "f-lat" || e.target.id === "f-lng") { commitLatLng(); }
      else if (e.target.id === "f-region") { set({ region: e.target.value }); renderRail(); renderForm(); syncMarker(false); }
    });

    loadUnits().then(function () { renderFilters(); renderRail(); renderForm(); syncMarker(true); setTimeout(function () { map.invalidateSize(); }, 200); fetchPending(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", Auth.start);
  else Auth.start();
})();
