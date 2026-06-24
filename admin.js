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
    WSB: { full: "WOSM Bureau", color: "#4B4E8A" }
  };
  var REGION_FULL = { "Asia-Pacific": "APR", "European": "EUR", "Arab": "ARB", "Africa": "AFR", "Interamerican": "IAR", "WOSM Bureau": "WSB", "World Bureau": "WSB", "World Scout Bureau": "WSB" };
  var KIND = { unit: "Unit", office: "Office", heritage: "Heritage", camp: "Camp Sites & Activity Centres", regevent: "Regional Event Venue", globevent: "Global Event Venue" };
  var ALL_SECTIONS = ["Beaver", "Cub", "Scout", "Venture", "Rover", "Leader"];
  // legacy: "Camp Sites & Activity Centres" used to be a free-form tag — now promoted to its own place type.
  function isCampTag(t) { return /camp\s*site|activity\s*cent(re|er)/i.test(String(t || "")); }
  function promoteCamp(kind, tags) { tags = Array.isArray(tags) ? tags : []; if (kind !== "camp" && tags.some(isCampTag)) return { kind: "camp", tags: tags.filter(function (t) { return !isCampTag(t); }) }; return { kind: kind, tags: tags }; }
  // events held at a place: [{ scope: "regional"|"global", name, year }]
  function normEvents(a) { return Array.isArray(a) ? a.map(function (e) { return { scope: (e && e.scope === "global") ? "global" : "regional", name: String((e && e.name) || ""), year: String((e && e.year) || "") }; }) : []; }

  var NSOS = Array.isArray(window.SCOUT_NSOS) ? window.SCOUT_NSOS : [];
  function regionCode(r) { return REGION[r] ? r : (REGION_FULL[r] || "APR"); }
  var COUNTRY = {}; NSOS.forEach(function (n) { COUNTRY[n.country] = { nso: n.nso, region: regionCode(n.region), lang: n.lang }; });
  COUNTRY["WOSM Bureau"] = { nso: "WOSM Bureau", region: "WSB", lang: "en" };  // global HQ, no single country
  var COUNTRIES = Object.keys(COUNTRY).sort();
  var DIAL = window.SCOUT_DIAL || {};

  // ── state ──────────────────────────────────────────────────────────
  var units = [], comments = [], map, marker = null, saveTimer = null, savedTimer = null;
  var state = { selectedId: null, query: "", kindFilter: "All", tagDraft: "", addrQuery: "", collapsed: {}, countryOpen: false, countryQuery: "", tagOpen: false, editingComment: null, nameHelp: false };
  // every distinct category/tag already used across places (for tag search/autocomplete)
  function allTags() { var set = {}; units.forEach(function (u) { (u.tags || []).forEach(function (t) { if (t) set[t] = 1; }); }); return Object.keys(set).sort(); }

  // ── helpers ────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }
  function sel() { return units.find(function (u) { return u.id === state.selectedId; }); }
  function toast(msg, type) {
    var t = $("toast");
    var col = type === "success" ? "#1c7a36" : type === "error" ? "#b4362f" : "#1E1730";
    t.textContent = (type === "success" ? "✓ " : type === "error" ? "⚠ " : "") + msg;
    t.style.background = col;
    t.style.display = "block";
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "toastpop .26s cubic-bezier(.2,.9,.3,1.2)";
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.style.display = "none"; }, type === "success" ? 2800 : 2200);
  }
  function fmtTs(ts) { try { var d = new Date(ts); var p = function (n) { return ("0" + n).slice(-2); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); } catch (e) { return ""; } }

  function normUnit(u) {
    var instagram = u.instagram || "", homepage = u.homepage || "", phone = u.phone || "", email = u.email || "";
    var legacy = u.url || "";  // migrate the old single contact/url model
    if (!instagram && !homepage && legacy) {
      if (u.contact === "instagram" || /instagram\.com/i.test(legacy)) instagram = legacy; else homepage = legacy;
    }
    var pc = promoteCamp(u.kind || "unit", u.tags);
    return {
      id: u.id, kind: pc.kind, name: u.name || "", subtitle: u.subtitle || "", country: u.country || "",
      nso: u.nso || "", region: regionCode(u.region), lang: u.lang || "",
      lat: +u.lat || 0, lng: +u.lng || 0, address: u.address || u.place || "",
      sections: Array.isArray(u.sections) ? u.sections : [], tags: pc.tags, events: normEvents(u.events),
      desc: u.desc || u.note || "", instagram: instagram, homepage: homepage, phone: phone, email: email,
      status: u.status || "published"
    };
  }

  // ── server ─────────────────────────────────────────────────────────
  function touch() { setSaved(false); clearTimeout(saveTimer); saveTimer = setTimeout(save, 700); }
  function setSaved(ok) { $("saved-label").textContent = ok ? "All changes saved" : "Saving…"; }
  function save(manual) {
    clearTimeout(saveTimer);
    if (!Auth.valid()) { setSaved(false); $("saved-label").textContent = "Sign in to publish"; if (manual) toast("Sign in to save", "error"); Auth.requireReauth(); return; }
    if (manual) setSaved(false);
    fetch("/api/units", { method: "PUT", headers: Object.assign({ "content-type": "application/json" }, Auth.headers()), body: JSON.stringify({ units: units }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok) { setSaved(true); if (manual) toast("Saved — changes are live", "success"); }
        else if (res.status === 401) { $("saved-label").textContent = "Session expired — sign in again"; if (manual) toast("Session expired — sign in again", "error"); Auth.requireReauth(); }
        else { $("saved-label").textContent = "Save failed: " + (res.j.error || res.status); if (manual) toast("Save failed: " + (res.j.error || res.status), "error"); }
      })
      .catch(function () { $("saved-label").textContent = "Save failed (network)"; if (manual) toast("Save failed (network)", "error"); });
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
    $("rail-filters").innerHTML = ["All", "unit", "office", "heritage", "camp", "regevent", "globevent"].map(function (k) {
      var short = { camp: "Camp", regevent: "Reg. Event", globevent: "Global Event" };
      return '<button data-filter="' + k + '" style="' + filt(state.kindFilter === k) + '">' + (k === "All" ? "All" : (short[k] || KIND[k])) + '</button>';
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

  // Collapsible form card. Header click toggles state.collapsed[key]; all cards start open.
  function card(key, title, body) {
    var col = !!state.collapsed[key];
    var chev = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(' + (col ? "-90deg" : "0deg") + ');transition:transform .15s;color:#b3adbd;flex:none;"><path d="m6 9 6 6 6-6"></path></svg>';
    return '<div style="' + CARD + '">' +
      '<div data-collapse="' + key + '" style="' + SEC + 'margin-bottom:' + (col ? "0" : "14px") + ';display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;user-select:none;">' +
      '<span>' + title + '</span>' + chev + '</div>' +
      '<div data-body="' + key + '"' + (col ? ' style="display:none;"' : '') + '>' + body + '</div></div>';
  }
  function evRows(s) {
    if (!s.events.length) return '<div style="font-size:12px;color:#a39bb0;margin-bottom:8px;">No events recorded yet.</div>';
    return s.events.map(function (e, i) {
      var scopeSeg = [["regional", "Regional Event"], ["global", "Global Event"]].map(function (p) { return '<button data-act="evscope" data-idx="' + i + '" data-val="' + p[0] + '" style="' + seg((e.scope || "regional") === p[0]) + '">' + p[1] + '</button>'; }).join("");
      return '<div style="border:1px solid #ece6db;border-radius:11px;padding:9px;margin-bottom:8px;">' +
        '<div style="display:flex;gap:6px;margin-bottom:7px;align-items:center;">' +
        '<div style="display:flex;gap:5px;flex:1;">' + scopeSeg + '</div>' +
        '<button data-act="evdel" data-idx="' + i + '" title="Remove" style="border:none;background:#f6eeee;color:#b4524e;width:28px;height:28px;border-radius:8px;cursor:pointer;flex:none;font-size:15px;line-height:1;">&times;</button>' +
        '</div>' +
        '<div style="display:flex;gap:6px;">' +
        '<input class="f-ev sf-fld" data-idx="' + i + '" data-field="name" value="' + escAttr(e.name) + '" placeholder="Event name" style="flex:1;" />' +
        '<input class="f-ev sf-fld" data-idx="' + i + '" data-field="year" value="' + escAttr(e.year) + '" placeholder="Year" inputmode="numeric" maxlength="4" style="width:78px;" />' +
        '</div></div>';
    }).join("");
  }

  function renderForm() {
    var s = sel();
    if (!s) { $("form").innerHTML = ""; $("form").style.display = "none"; $("form-empty").style.display = "flex"; updateCap(); return; }
    $("form").style.display = "block"; $("form-empty").style.display = "none";
    var rc = REGION[s.region] || { full: "", color: "#6336B5" };
    var isUnit = s.kind === "unit";
    var autoLine = (s.nso || "—") + " · " + (rc.full || s.region) + " (" + (s.lang || "—") + ")";
    var subline = KIND[s.kind] + " · " + (s.country || "No country") + " · " + s.region;

    var kindSeg = ["unit", "office", "heritage", "camp", "regevent", "globevent"].map(function (k) { return '<button data-act="kind" data-val="' + k + '" style="' + seg(s.kind === k) + '">' + KIND[k] + '</button>'; }).join("");
    var regionOpts = Object.keys(REGION).map(function (code) { return '<option value="' + code + '"' + (code === s.region ? " selected" : "") + ">" + code + " · " + esc(REGION[code].full) + "</option>"; }).join("");
    var sectionChips = ALL_SECTIONS.map(function (x) { return '<button data-act="sec" data-val="' + x + '" style="' + chip(s.sections.indexOf(x) !== -1) + '">' + x + '</button>'; }).join("");
    var tagChips = s.tags.map(function (t) { return '<span style="display:inline-flex;align-items:center;gap:5px;background:#f3eefb;color:#5B2EA6;font:600 12px \'Hanken Grotesk\';padding:5px 7px 5px 10px;border-radius:999px;">' + '<button data-act="tagedit" data-val="' + escAttr(t) + '" title="Click to edit this category" style="border:none;background:transparent;color:#5B2EA6;font:600 12px \'Hanken Grotesk\';cursor:pointer;padding:0;">' + esc(t) + '</button>' + '<button data-act="tagdel" data-val="' + escAttr(t) + '" title="Remove" style="border:none;background:#e4d8f5;width:17px;height:17px;border-radius:50%;cursor:pointer;color:#5B2EA6;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;">×</button></span>'; }).join("");
    var statusSeg = [["published", "Live"], ["draft", "Draft"]].map(function (p) { return '<button data-act="status" data-val="' + p[0] + '" style="' + seg(s.status === p[0]) + '">' + p[1] + '</button>'; }).join("");

    $("form").innerHTML = '<div style="max-width:620px;margin:0 auto;padding:24px 28px 60px;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:22px;">' +
      '<div><div style="font:700 21px \'Bricolage Grotesque\';letter-spacing:-.015em;line-height:1.1;">' + esc(s.name || "Untitled") + '</div><div style="font-size:12.5px;color:#8a8496;margin-top:4px;">' + esc(subline) + '</div></div>' +
      '<div style="display:flex;gap:8px;flex:none;">' +
      '<button data-act="save" style="border:none;background:#6336B5;color:#fff;font:600 12px \'Hanken Grotesk\';padding:8px 16px;border-radius:10px;cursor:pointer;">Save</button>' +
      '<button data-act="del" style="border:1px solid #ecd9d9;background:#fff;color:#b4524e;font:600 12px \'Hanken Grotesk\';padding:8px 12px;border-radius:10px;cursor:pointer;">Delete</button>' +
      '</div></div>' +

      card("basics", "Basics",
        '<label style="' + LBL + 'display:flex;align-items:center;gap:6px;">Name <button data-act="namehelp" title="Naming rule" style="border:none;background:#ece6db;color:#6b6577;width:16px;height:16px;border-radius:50%;cursor:pointer;font:700 10px \'Hanken Grotesk\';line-height:1;padding:0;flex:none;">?</button></label>' +
        (state.nameHelp ? '<div style="margin-bottom:8px;background:#f6f3fa;border:1px solid #ece6db;border-radius:10px;padding:9px 11px;font:500 12px \'Hanken Grotesk\';color:#6b6577;line-height:1.5;">이름 규칙(내부용): 가장 최근에 이 장소에서 열린 행사명을 장소 이름으로 사용합니다. 이름은 자유롭게 바꿔도 됩니다.</div>' : "") +
        '<input id="f-name" value="' + escAttr(s.name) + '" class="sf-fld" placeholder="e.g. Yeoksam Scout Unit" />' +
        '<label style="' + LBL + '">Subtitle <span style="color:#b3adbd;font-weight:500;">(shown smaller / grey on the map)</span></label><input id="f-subtitle" value="' + escAttr(s.subtitle) + '" class="sf-fld" placeholder="e.g. Gangnam · since 1971" />' +
        '<label style="' + LBL + '">Place type</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' + kindSeg + '</div>' +
        '<label style="' + LBL + '">Visibility</label><div style="display:flex;gap:6px;">' + statusSeg + '</div>') +

      card("affiliation", "Affiliation",
        '<label style="' + LBL + '">Country</label>' +
        '<div id="f-country-combo" style="position:relative;">' +
        '<input id="f-country-input" class="sf-fld" autocomplete="off" placeholder="Search a country…" value="' + escAttr(s.country || "") + '" style="cursor:text;" />' +
        '<div id="f-country-menu" style="display:none;position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:50;background:#fff;border:1px solid #e7e1d8;border-radius:11px;box-shadow:0 12px 30px rgba(30,18,55,.18);max-height:248px;overflow-y:auto;"></div>' +
        '</div>' +
        '<label style="' + LBL + '">Region</label>' +
        '<select id="f-region" class="sf-fld" style="appearance:none;cursor:pointer;">' + regionOpts + '</select>' +
        '<label style="' + LBL + '">NSO · Language <span style="color:#b3adbd;font-weight:500;">(auto from country)</span></label>' +
        '<div style="background:#f5f2ec;border:1px solid #ece6db;border-radius:11px;padding:11px 13px;font:500 13px \'Hanken Grotesk\';color:#6b6577;">' + esc(autoLine) + '</div>') +

      card("profile", "Profile",
        '<label style="' + LBL + '">Short introduction</label><textarea id="f-desc" class="sf-fld" style="resize:vertical;min-height:74px;line-height:1.5;" placeholder="A sentence or two about this place and its activities.">' + esc(s.desc) + '</textarea>' +
        (isUnit
          ? '<label style="' + LBL + '">Sections (recruiting)</label><div style="display:flex;flex-wrap:wrap;gap:6px;">' + sectionChips + '</div>'
          : '<label style="' + LBL + '">Categories <span style="color:#b3adbd;font-weight:500;">— click a chip to rename it</span></label><div style="display:flex;flex-wrap:wrap;gap:7px;align-items:center;">' + (tagChips || '<span style="font-size:12px;color:#a39bb0;">No categories yet.</span>') + '</div>' +
            '<div id="f-tag-combo" style="position:relative;margin-top:9px;">' +
            '<div style="display:flex;gap:7px;"><input id="f-tagdraft" value="' + escAttr(state.tagDraft) + '" class="sf-fld" autocomplete="off" placeholder="Search existing categories or type a new one, then Enter" style="flex:1;" /><button data-act="tagadd" style="' + BTN_SOFT + '">Add</button></div>' +
            '<div id="f-tag-menu" style="display:none;position:absolute;left:0;right:62px;top:calc(100% + 4px);z-index:50;background:#fff;border:1px solid #e7e1d8;border-radius:11px;box-shadow:0 12px 30px rgba(30,18,55,.18);max-height:200px;overflow-y:auto;"></div>' +
            '</div>'
        )) +

      card("events", 'Events held here <span style="color:#b3adbd;font-weight:500;font-size:11.5px;">— Regional / Global · name · year</span>',
        evRows(s) + '<button data-act="evadd" style="' + BTN_SOFT + '">+ Add event</button>') +

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

      card("comments", 'Comments' + (commentsForUnit(s.id).length ? ' <span style="background:#f1ece4;color:#6b6577;font:700 10px \'Hanken Grotesk\';padding:1px 7px;border-radius:999px;vertical-align:middle;">' + commentsForUnit(s.id).length + '</span>' : ''), commentsCardBody(s)) +
      '</div>';
    updateCap();
  }

  // ── per-place comment management (edit / delete-with-reason / tombstone) ──
  function commentsForUnit(id) { return comments.filter(function (c) { return c.unitId === id; }); }
  function commentsCardBody(s) {
    var list = commentsForUnit(s.id);
    if (!list.length) return '<div style="font-size:12.5px;color:#a39bb0;">No comments on this place yet.</div>';
    return list.map(function (c) {
      var head = '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;flex-wrap:wrap;">' +
        '<span style="font:700 12.5px \'Hanken Grotesk\';color:#1E1730;">' + esc(c.name || "Anonymous") + '</span>' +
        '<span style="font-size:10.5px;color:#b3adbd;">' + esc(c.ip || c.ipMasked || "") + '</span>' +
        '<span style="font-size:10.5px;color:#b3adbd;">· ' + fmtTs(c.ts) + (c.edited ? " · edited" : "") + '</span>' +
        (c.parentId ? '<span style="font-size:10px;color:#b3adbd;background:#f5f2ec;border-radius:6px;padding:1px 6px;">reply</span>' : '') + '</div>';
      if (state.editingComment === c.id) {
        return '<div style="border:1px solid #d8cfe6;border-radius:11px;padding:11px;margin-bottom:9px;background:#faf8fd;">' + head +
          '<textarea id="cedit-' + escAttr(c.id) + '" class="sf-fld" style="min-height:64px;resize:vertical;line-height:1.5;">' + esc(c.body) + '</textarea>' +
          '<div style="display:flex;gap:7px;margin-top:8px;justify-content:flex-end;">' +
          '<button data-act="ceditcancel" style="border:1px solid #e7e1d8;background:#fff;color:#6b6577;font:600 12px \'Hanken Grotesk\';padding:7px 13px;border-radius:9px;cursor:pointer;">Cancel</button>' +
          '<button data-act="ceditsave" data-val="' + escAttr(c.id) + '" style="border:none;background:#6336B5;color:#fff;font:600 12px \'Hanken Grotesk\';padding:7px 14px;border-radius:9px;cursor:pointer;">Save</button></div></div>';
      }
      if (c.deleted) {
        return '<div style="border:1px solid #f0ebe2;border-radius:11px;padding:11px;margin-bottom:9px;background:#faf8f4;">' + head +
          '<div style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:#a39bb0;font-style:italic;">🗑 삭제되었습니다' + (c.deletedReason ? ' — ' + esc(c.deletedReason) : '') + '</div>' +
          '<div style="margin-top:8px;"><button data-act="crestore" data-val="' + escAttr(c.id) + '" style="border:1px solid #e7e1d8;background:#fff;color:#6b6577;font:600 11.5px \'Hanken Grotesk\';padding:6px 11px;border-radius:9px;cursor:pointer;">Restore</button></div></div>';
      }
      return '<div style="border:1px solid #efeae1;border-radius:11px;padding:11px;margin-bottom:9px;">' + head +
        '<div style="font-size:13px;color:#3a3346;line-height:1.5;white-space:pre-wrap;margin-bottom:8px;">' + esc(c.body) + '</div>' +
        '<div style="display:flex;gap:7px;justify-content:flex-end;">' +
        '<button data-act="cedit" data-val="' + escAttr(c.id) + '" style="border:1px solid #e7e1d8;background:#fff;color:#6b6577;font:600 11.5px \'Hanken Grotesk\';padding:6px 12px;border-radius:9px;cursor:pointer;">Edit</button>' +
        '<button data-act="cdelete" data-val="' + escAttr(c.id) + '" style="border:1px solid #ecd9d9;background:#fff;color:#b4524e;font:600 11.5px \'Hanken Grotesk\';padding:6px 12px;border-radius:9px;cursor:pointer;">Delete</button></div></div>';
    }).join("");
  }
  function fetchComments() {
    return fetch("/api/comments", { headers: Auth.headers(), cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && Array.isArray(j.comments)) comments = j.comments; })
      .catch(function () {});
  }
  function patchComment(id, payload) {
    return fetch("/api/comments", { method: "PATCH", headers: Object.assign({ "content-type": "application/json" }, Auth.headers()), body: JSON.stringify(Object.assign({ id: id }, payload)) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); });
  }
  function saveCommentEdit(id) {
    var el = $("cedit-" + id); if (!el) return;
    var v = el.value.trim(); if (!v) { toast("Comment can't be empty", "error"); return; }
    patchComment(id, { action: "edit", body: v }).then(function (res) {
      if (res.ok && res.j.ok) { state.editingComment = null; fetchComments().then(function () { renderForm(); }); toast("Comment updated", "success"); }
      else if (res.status === 401) { toast("Session expired — sign in again", "error"); Auth.requireReauth(); }
      else toast("Edit failed", "error");
    }).catch(function () { toast("Network error", "error"); });
  }
  function deleteComment(id) {
    var reason = window.prompt("삭제 사유를 입력하세요 (Deletion reason — shown publicly):", "");
    if (reason === null) return;
    patchComment(id, { action: "delete", reason: reason }).then(function (res) {
      if (res.ok && res.j.ok) { fetchComments().then(function () { renderForm(); }); toast("Comment deleted", "success"); }
      else if (res.status === 401) { toast("Session expired — sign in again", "error"); Auth.requireReauth(); }
      else toast("Delete failed", "error");
    }).catch(function () { toast("Network error", "error"); });
  }
  function restoreComment(id) {
    var el = comments.find(function (c) { return c.id === id; });
    var prior = window.prompt("Restore this comment — enter the corrected text:", (el && el.body) || "");
    if (prior === null || !prior.trim()) return;
    patchComment(id, { action: "edit", body: prior.trim() }).then(function (res) {
      if (res.ok && res.j.ok) { fetchComments().then(function () { renderForm(); }); toast("Comment restored", "success"); }
      else toast("Restore failed", "error");
    }).catch(function () { toast("Network error", "error"); });
  }

  function set(patch) { var s = sel(); if (!s) return; Object.assign(s, patch); touch(); }

  // ── actions ────────────────────────────────────────────────────────
  function selectUnit(id) { state.selectedId = id; state.addrQuery = ""; state.editingComment = null; renderRail(); renderForm(); syncMarker(true); }
  function addUnit() {
    var id = "unit-" + Date.now().toString(36);
    var nu = { id: id, kind: "unit", name: "New scout place", subtitle: "", country: "", nso: "", region: "APR", lang: "", lat: 20, lng: 0, address: "", sections: [], tags: [], events: [], desc: "", instagram: "", homepage: "", phone: "", email: "", status: "draft" };
    units.unshift(nu); state.selectedId = id; state.query = ""; state.kindFilter = "All"; state.addrQuery = "";
    $("rail-search").value = ""; renderFilters(); renderRail(); renderForm(); syncMarker(true); touch();
  }
  function delUnit() {
    if (!confirm("Delete this place?")) return;
    units = units.filter(function (u) { return u.id !== state.selectedId; });
    state.selectedId = units[0] ? units[0].id : null;
    renderRail(); renderForm(); syncMarker(true); touch(); toast("Place deleted");
  }
  function addTag() { addTagValue(state.tagDraft); }
  function addTagValue(t) { var s = sel(); t = (t || "").trim(); if (!s || !t) return; if (s.tags.indexOf(t) === -1) s.tags.push(t); state.tagDraft = ""; state.tagOpen = false; touch(); renderForm(); }
  function editTag(t) { var s = sel(); if (!s) return; s.tags = s.tags.filter(function (x) { return x !== t; }); state.tagDraft = t; state.tagOpen = false; touch(); renderForm(); setTimeout(function () { var el = $("f-tagdraft"); if (el) { el.focus(); el.select(); } }, 0); }

  // ── searchable country / category combos ───────────────────────────
  function pickCountry(c) {
    var m = COUNTRY[c], s = sel();
    var patch = m ? { country: c, nso: m.nso, region: m.region, lang: m.lang } : { country: c };
    if (s && DIAL[c] && !(s.phone || "").trim()) patch.phone = DIAL[c] + " ";  // auto-fill dialing code
    set(patch);
    state.countryOpen = false; state.countryQuery = "";
    renderRail(); renderForm(); syncMarker(false);
  }
  function renderCountryMenu() {
    var menu = $("f-country-menu"); if (!menu) return;
    var q = (state.countryQuery || "").trim().toLowerCase();
    var list = COUNTRIES.filter(function (c) { return !q || c.toLowerCase().indexOf(q) !== -1; });
    menu.innerHTML = list.length
      ? list.slice(0, 80).map(function (c) { return '<div data-act="countrypick" data-val="' + escAttr(c) + '" style="padding:9px 12px;cursor:pointer;font:500 13px \'Hanken Grotesk\';color:#1E1730;display:flex;align-items:center;gap:8px;border-bottom:1px solid #f4f0e9;"><span style="font-size:11px;color:#9a93a6;flex:none;min-width:36px;">' + esc(DIAL[c] || "") + '</span><span style="flex:1;">' + esc(c) + '</span></div>'; }).join("")
      : '<div style="padding:10px 12px;font-size:12.5px;color:#a39bb0;">No matching country</div>';
    menu.style.display = state.countryOpen ? "block" : "none";
  }
  function renderTagMenu() {
    var menu = $("f-tag-menu"), s = sel(); if (!menu || !s) return;
    var q = (state.tagDraft || "").trim().toLowerCase();
    var avail = allTags().filter(function (t) { return s.tags.indexOf(t) === -1 && (!q || t.toLowerCase().indexOf(q) !== -1); });
    if (!avail.length || !state.tagOpen) { menu.style.display = "none"; return; }
    menu.innerHTML = avail.slice(0, 40).map(function (t) { return '<div data-act="tagpick" data-val="' + escAttr(t) + '" style="padding:8px 12px;cursor:pointer;font:500 12.5px \'Hanken Grotesk\';color:#1E1730;border-bottom:1px solid #f4f0e9;">' + esc(t) + '</div>'; }).join("");
    menu.style.display = "block";
  }
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
    if (!pendingItems.length) { $("pending-list").innerHTML = '<div style="text-align:center;padding:40px;color:#a39bb0;font-size:13px;">No pending suggestions.</div>'; return; }
    $("pending-list").innerHTML = pendingItems.map(function (p) {
      var u = p.unit || {}, rep = p.reporter || {};
      var code = regionCode(u.region), rc = REGION[code] || { color: "#9a93a6" };
      var locLine = u.address ? ("📍 " + esc(u.address) + (u.lat ? " (" + (+u.lat).toFixed(3) + ", " + (+u.lng).toFixed(3) + ")" : "")) : (u.lat ? ("📍 " + (+u.lat).toFixed(3) + ", " + (+u.lng).toFixed(3)) : "");
      var corr = p.correction && p.correction.forId
        ? '<div style="display:inline-flex;align-items:center;gap:5px;font:700 10.5px \'Hanken Grotesk\';color:#5B2EA6;background:#f3eefb;border:1px solid #e4d9f5;border-radius:999px;padding:3px 9px;margin-bottom:8px;">✎ Correction to: ' + esc(p.correction.forName || u.name || "an existing place") + '</div>'
        : "";
      return '<div style="border:1px solid ' + (corr ? "#dccff0" : "#ece6db") + ';border-radius:14px;padding:16px;margin-bottom:12px;">' +
        corr +
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
          toast(action === "approve" ? "Approved & published" : "Suggestion rejected", action === "approve" ? "success" : undefined);
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
      var r = e.target.closest("[data-reject]"); if (r) { if (confirm("Reject and discard this suggestion?")) patchPending(r.getAttribute("data-reject"), "reject"); }
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
      else if (act === "namehelp") { state.nameHelp = !state.nameHelp; renderForm(); }
      else if (act === "evscope") { var se = sel(), ie = +b.getAttribute("data-idx"); if (se && se.events[ie]) { se.events[ie].scope = val; touch(); renderForm(); } }
      else if (act === "evadd") { var sa = sel(); if (sa) { sa.events.push({ scope: "regional", name: "", year: "" }); touch(); renderForm(); } }
      else if (act === "evdel") { var sd = sel(), id2 = +b.getAttribute("data-idx"); if (sd) { sd.events.splice(id2, 1); touch(); renderForm(); } }
      else if (act === "kind") { set({ kind: val }); renderRail(); renderForm(); syncMarker(false); }
      else if (act === "status") { set({ status: val }); renderRail(); renderForm(); }
      else if (act === "sec") { var s = sel(); var has = s.sections.indexOf(val) !== -1; s.sections = has ? s.sections.filter(function (x) { return x !== val; }) : s.sections.concat([val]); touch(); renderForm(); }
      else if (act === "tagdel") { var s2 = sel(); s2.tags = s2.tags.filter(function (x) { return x !== val; }); touch(); renderForm(); }
      else if (act === "tagadd") { addTag(); }
      else if (act === "tagedit") { editTag(val); }
      else if (act === "tagpick") { addTagValue(val); }
      else if (act === "countrypick") { pickCountry(val); }
      else if (act === "cedit") { state.editingComment = val; renderForm(); }
      else if (act === "ceditcancel") { state.editingComment = null; renderForm(); }
      else if (act === "ceditsave") { saveCommentEdit(val); }
      else if (act === "cdelete") { deleteComment(val); }
      else if (act === "crestore") { restoreComment(val); }
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
      else if (id === "f-tagdraft") { state.tagDraft = v; state.tagOpen = true; renderTagMenu(); }
      else if (id === "f-country-input") { state.countryQuery = v; state.countryOpen = true; renderCountryMenu(); }
      else if (id === "f-addr") { state.addrQuery = v; }
      else if (e.target.classList && e.target.classList.contains("f-ev")) { var sv = sel(), iv = +e.target.getAttribute("data-idx"), fv = e.target.getAttribute("data-field"); if (sv && sv.events[iv]) { sv.events[iv][fv] = v; touch(); } }
    });
    $("form").addEventListener("focusin", function (e) {
      if (e.target.id === "f-country-input") { state.countryOpen = true; state.countryQuery = ""; renderCountryMenu(); }
      else if (e.target.id === "f-tagdraft") { state.tagOpen = true; renderTagMenu(); }
    });
    $("form").addEventListener("keydown", function (e) {
      if (e.target.id === "f-tagdraft" && e.key === "Enter") { e.preventDefault(); addTag(); }
      if (e.target.id === "f-addr" && e.key === "Enter") { e.preventDefault(); find(); }
      if ((e.target.id === "f-lat" || e.target.id === "f-lng") && e.key === "Enter") { e.preventDefault(); commitLatLng(); }
      if (e.target.id === "f-country-input") {
        if (e.key === "Enter") { e.preventDefault(); var q = (state.countryQuery || "").trim().toLowerCase(); var hit = COUNTRIES.filter(function (c) { return c.toLowerCase().indexOf(q) !== -1; }); if (hit.length) pickCountry(hit[0]); }
        else if (e.key === "Escape") { state.countryOpen = false; var cm = $("f-country-menu"); if (cm) cm.style.display = "none"; }
      }
    });
    // close the combos when clicking outside them (reset the country input to the saved value)
    document.addEventListener("click", function (e) {
      if (state.countryOpen && !e.target.closest("#f-country-combo")) { state.countryOpen = false; var ci = $("f-country-input"), cm = $("f-country-menu"), s = sel(); if (ci && s) ci.value = s.country || ""; if (cm) cm.style.display = "none"; }
      if (state.tagOpen && !e.target.closest("#f-tag-combo")) { state.tagOpen = false; var tm = $("f-tag-menu"); if (tm) tm.style.display = "none"; }
    });
    $("form").addEventListener("change", function (e) {
      if (e.target.id === "f-lat" || e.target.id === "f-lng") { commitLatLng(); }
      else if (e.target.id === "f-region") { set({ region: e.target.value }); renderRail(); renderForm(); syncMarker(false); }
    });

    loadUnits().then(function () { renderFilters(); renderRail(); renderForm(); syncMarker(true); setTimeout(function () { map.invalidateSize(); }, 200); fetchPending(); fetchComments().then(function () { renderForm(); }); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", Auth.start);
  else Auth.start();
})();
