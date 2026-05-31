/* =========================================================================
 * scout-finder — 관리자 (manage.html)
 * -------------------------------------------------------------------------
 * 정적 사이트(백엔드·키 없음) 제약에 맞춘 로컬 편집 도구.
 * - 단위대 추가 / 수정 / 삭제  (순서 배치는 의미가 없어 제거)
 * - 핀 색상 = 지방·특수연맹별 고유색
 * - 지도 마커 드래그 또는 "지도에서 위치 지정" 클릭으로 좌표 입력
 * - 편집본은 localStorage 저장 → 공개 사이트가 미리보기로 사용
 * - data.js 다운로드 / JSON 복사·가져오기 → 저장소 커밋·배포로 실제 반영
 * ========================================================================= */
(function () {
  "use strict";

  var DRAFT_KEY = "scoutfinder:units";
  var SECTIONS = ["비버", "컵", "스카우트", "벤처", "로버"];
  var TYPES = ["지역대", "학교대"];
  var WEEKDAYS = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
  var FEDERATIONS = Array.isArray(window.SCOUT_FEDERATIONS) ? window.SCOUT_FEDERATIONS : [];
  var FED_COLORS = window.SCOUT_FEDERATION_COLORS || {};
  var COUNTRY_COLORS = window.SCOUT_COUNTRY_COLORS || {};
  var APR_COUNTRIES = Array.isArray(window.SCOUT_APR_COUNTRIES) ? window.SCOUT_APR_COUNTRIES : [];
  var COUNTRY_NAMES = APR_COUNTRIES.map(function (c) { return c.ko; });
  var DEFAULT_COLOR = "#622599";
  var MOBILE = "(max-width: 820px)";

  function baseUnits() { return Array.isArray(window.SCOUT_UNITS) ? window.SCOUT_UNITS : []; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function colorOf(u) { return FED_COLORS[u.federation] || COUNTRY_COLORS[u.country || "대한민국"] || DEFAULT_COLOR; }
  function isMobile() { return window.matchMedia(MOBILE).matches; }

  // ── state ──────────────────────────────────────────────────────────
  var units, map, unitLayer = L.layerGroup(), markers = [], pickIndex = null, activeIndex = null, saveTimer = null;

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

  function saveDraft() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(units));
        var t = new Date(), hh = ("0" + t.getHours()).slice(-2), mm = ("0" + t.getMinutes()).slice(-2);
        setStatus("저장됨 " + hh + ":" + mm, true);
      } catch (e) { setStatus("저장 실패: 저장 공간이 가득 찼을 수 있습니다.", false); }
    }, 300);
  }

  // ── icons (번호 없는 연맹색 핀) ─────────────────────────────────────
  function adminPin(active, color) {
    return L.divIcon({
      className: "unit-pin" + (active ? " is-active" : ""),
      html: '<div class="unit-pin-dot" style="background:' + color + '"></div>',
      iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
    });
  }

  // ── card template ──────────────────────────────────────────────────
  function selectOptions(values, current) {
    var opts = '<option value="">(선택)</option>', has = false;
    values.forEach(function (v) {
      var sel = v === current ? " selected" : ""; if (sel) has = true;
      opts += '<option value="' + escAttr(v) + '"' + sel + ">" + escHtml(v) + "</option>";
    });
    if (current && !has) opts += '<option value="' + escAttr(current) + '" selected>' + escHtml(current) + " (사용자 입력)</option>";
    return opts;
  }
  function field(label, name, value, type, span) {
    return '<div class="field' + (span ? " col-span" : "") + '"><label>' + label + "</label>" +
      '<input type="' + (type || "text") + '" data-field="' + name + '" value="' + escAttr(value) + '"' +
      (name === "lat" || name === "lng" ? ' step="any"' : "") + (name === "meetingDay" ? ' list="weekday-list"' : "") + " /></div>";
  }

  function cardHtml(u, i) {
    var secBoxes = SECTIONS.map(function (s) {
      var on = (u.sections || []).indexOf(s) !== -1;
      return '<label class="section-toggle' + (on ? " checked" : "") + '"><input type="checkbox" data-section="' +
        escAttr(s) + '"' + (on ? " checked" : "") + " />" + escHtml(s) + "</label>";
    }).join("");

    return (
      '<div class="editor-card" data-index="' + i + '">' +
        '<div class="editor-card-head">' +
          '<span class="editor-card-swatch" style="background:' + colorOf(u) + '"></span>' +
          '<span class="editor-card-title">' + (escHtml(u.name) || "(이름 없음)") + "</span>" +
          '<span class="editor-card-actions">' +
            '<button type="button" class="icon-btn del" data-action="delete" title="삭제" aria-label="삭제">✕</button>' +
          "</span>" +
        "</div>" +
        '<div class="field-grid">' +
          field("이름", "name", u.name) +
          '<div class="field"><label>종류 (학교대/지역대)</label><select data-field="type">' + selectOptions(TYPES, u.type) + "</select></div>" +
          '<div class="field"><label>국가 (APR)</label><select data-field="country">' + selectOptions(COUNTRY_NAMES, u.country || "대한민국") + "</select></div>" +
          '<div class="field"><label>지방·특수연맹 (한국)</label><select data-field="federation">' + selectOptions(FEDERATIONS, u.federation) + "</select></div>" +
          field("지구연합회", "council", u.council) +
          field("동 단위 전체주소", "address", u.address, "text", true) +
          field("ID (영문, 고유)", "id", u.id) +
          field("모임 요일", "meetingDay", u.meetingDay) +
          field("연락처 (전화/이메일)", "contact", u.contact) +
          field("인스타그램 (URL)", "instagram", u.instagram) +
          '<div class="field col-span"><label>모집 카테고리</label><div class="sections-box">' + secBoxes + "</div></div>" +
          '<div class="field col-span"><label>좌표 (위도 / 경도)</label><div class="coord-row">' +
            '<div class="field"><label class="sr-only">위도</label><input type="number" step="any" data-field="lat" value="' + escAttr(u.lat) + '" /></div>' +
            '<div class="field"><label class="sr-only">경도</label><input type="number" step="any" data-field="lng" value="' + escAttr(u.lng) + '" /></div>' +
            '<button type="button" class="admin-btn pick-btn" data-action="pick">지도에서 위치 지정</button>' +
          "</div></div>" +
          '<div class="field col-span"><label>비고</label><textarea data-field="note" rows="2">' + escHtml(u.note) + "</textarea></div>" +
        "</div>" +
      "</div>"
    );
  }

  // ── render ─────────────────────────────────────────────────────────
  function render() {
    $list.innerHTML = units.map(cardHtml).join("");
    $empty.hidden = units.length > 0;
    rebuildMarkers();
  }

  function rebuildMarkers() {
    unitLayer.clearLayers(); markers = [];
    var pts = [];
    units.forEach(function (u, i) {
      var lat = parseFloat(u.lat), lng = parseFloat(u.lng);
      if (isNaN(lat) || isNaN(lng)) { markers[i] = null; return; }
      var marker = L.marker([lat, lng], { icon: adminPin(i === activeIndex, colorOf(u)), draggable: true, title: u.name, alt: u.name });
      marker.bindPopup(escHtml(u.name) + "<br>" + escHtml(u.federation) + (u.council ? " · " + escHtml(u.council) : ""));
      marker.on("dragend", function () { onMarkerDrag(i, marker.getLatLng()); });
      marker.on("click", function () { setActive(i, false); });
      unitLayer.addLayer(marker); markers[i] = marker; pts.push([lat, lng]);
    });
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13 });
    else if (pts.length === 1) map.setView(pts[0], 12);
  }

  function cardEl(i) { return $list.querySelector('.editor-card[data-index="' + i + '"]'); }

  function setActive(i, pan) {
    activeIndex = i;
    $list.querySelectorAll(".editor-card").forEach(function (c) {
      c.classList.toggle("is-active", Number(c.getAttribute("data-index")) === i);
    });
    markers.forEach(function (m, idx) { if (m) m.setIcon(adminPin(idx === i, colorOf(units[idx]))); });
    var el = cardEl(i); if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (markers[i]) { if (pan) map.panTo(markers[i].getLatLng()); markers[i].openPopup(); }
  }

  function onMarkerDrag(i, latlng) {
    var lat = round5(latlng.lat), lng = round5(latlng.lng);
    units[i].lat = lat; units[i].lng = lng;
    var el = cardEl(i);
    if (el) { el.querySelector('[data-field="lat"]').value = lat; el.querySelector('[data-field="lng"]').value = lng; }
    saveDraft();
  }

  // ── editing events ─────────────────────────────────────────────────
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
      saveDraft(); return;
    }

    var fieldName = input.getAttribute("data-field");
    if (!fieldName) return;

    if (fieldName === "lat" || fieldName === "lng") {
      var num = parseFloat(input.value);
      u[fieldName] = isNaN(num) ? "" : num;
      var m = markers[i];
      if (m && !isNaN(parseFloat(u.lat)) && !isNaN(parseFloat(u.lng))) m.setLatLng([parseFloat(u.lat), parseFloat(u.lng)]);
    } else {
      u[fieldName] = input.value;
      if (fieldName === "name") {
        var title = card.querySelector(".editor-card-title");
        if (title) title.textContent = input.value || "(이름 없음)";
      }
      if (fieldName === "name" || fieldName === "federation" || fieldName === "council") {
        if (markers[i]) markers[i].setPopupContent(escHtml(u.name) + "<br>" + escHtml(u.federation) + (u.council ? " · " + escHtml(u.council) : ""));
      }
      if (fieldName === "federation" || fieldName === "country") {
        var sw = card.querySelector(".editor-card-swatch"); if (sw) sw.style.background = colorOf(u);
        if (markers[i]) markers[i].setIcon(adminPin(i === activeIndex, colorOf(u)));
      }
    }
    saveDraft();
  }

  function onListClick(e) {
    var btn = e.target.closest("[data-action]");
    if (btn) {
      var i = Number(btn.closest(".editor-card").getAttribute("data-index"));
      var action = btn.getAttribute("data-action");
      if (action === "delete") return doDelete(i);
      if (action === "pick") return startPick(i);
      return;
    }
    var head = e.target.closest(".editor-card-head");
    if (head) setActive(Number(head.closest(".editor-card").getAttribute("data-index")), true);
  }

  // ── actions ────────────────────────────────────────────────────────
  function doAdd() {
    var center = map.getCenter();
    units.push({ id: uid(), name: "새 단위대", type: "지역대", country: "대한민국", federation: "", council: "", address: "",
      lat: round5(center.lat), lng: round5(center.lng), sections: [], meetingDay: "", contact: "", instagram: "", note: "" });
    activeIndex = units.length - 1;
    render(); saveDraft();
    var el = cardEl(activeIndex);
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" });
      var n = el.querySelector('[data-field="name"]'); if (n) { n.focus(); n.select(); } }
  }
  function doDelete(i) {
    if (!confirm('"' + (units[i].name || "이 단위대") + '"를 삭제할까요?')) return;
    units.splice(i, 1); if (activeIndex === i) activeIndex = null; render(); saveDraft();
  }

  function startPick(i) {
    pickIndex = i; activeIndex = i;
    $mapWrap.classList.add("picking");
    $hint.textContent = '"' + (units[i].name || "단위대") + '" — 지도를 클릭해 위치를 지정하세요. (취소: ESC)';
    if (isMobile()) setView("map");
    setActive(i, true);
  }
  function stopPick() { pickIndex = null; $mapWrap.classList.remove("picking"); $hint.textContent = DEFAULT_HINT; }
  function onMapClick(e) {
    if (pickIndex === null) return;
    var i = pickIndex;
    onMarkerDrag(i, e.latlng);
    if (markers[i]) markers[i].setLatLng(e.latlng); else rebuildMarkers();
    stopPick();
  }

  // ── import / export / reset ────────────────────────────────────────
  function dataJsText() {
    return "// ⬇️ 실제 데이터로 교체\n" +
      "// scout-finder 데이터. 스키마: { id, name, type, federation, council, address, lat, lng, sections[], meetingDay, contact, note }\n\n" +
      "window.SCOUT_UNITS = " + JSON.stringify(units, null, 2) + ";\n\n" +
      "window.SCOUT_FEDERATIONS = " + JSON.stringify(FEDERATIONS, null, 2) + ";\n\n" +
      "window.SCOUT_FEDERATION_COLORS = " + JSON.stringify(FED_COLORS, null, 2) + ";\n\n" +
      "window.SCOUT_APR_COUNTRIES = " + JSON.stringify(APR_COUNTRIES, null, 2) + ";\n\n" +
      "window.SCOUT_COUNTRY_COLORS = " + JSON.stringify(COUNTRY_COLORS, null, 2) + ";\n";
  }
  function validate() {
    var problems = [], seen = {};
    units.forEach(function (u, i) {
      var label = "#" + (i + 1) + " " + (u.name || "(이름 없음)");
      if (!u.id) problems.push(label + ": ID 없음");
      else if (seen[u.id]) problems.push(label + ": ID 중복(" + u.id + ")");
      else seen[u.id] = true;
      if (isNaN(parseFloat(u.lat)) || isNaN(parseFloat(u.lng))) problems.push(label + ": 좌표 없음");
    });
    return problems;
  }
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }
  function doDownloadJs() {
    var problems = validate();
    if (problems.length && !confirm("다음 문제가 있습니다:\n\n" + problems.join("\n") + "\n\n그래도 내보낼까요?")) return;
    download("data.js", dataJsText(), "text/javascript");
  }
  function doCopyJson() {
    var text = JSON.stringify(units, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setStatus("JSON 복사됨", true); }).catch(function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); setStatus("JSON 복사됨", true); }
    catch (e) { setStatus("복사 실패 — 콘솔 확인", false); console.log(text); }
    document.body.removeChild(ta);
  }
  function doImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error("배열이 아닙니다");
        units = arr; activeIndex = null; render(); saveDraft();
        setStatus("가져오기 완료 (" + units.length + "곳)", true);
      } catch (e) { alert("가져오기 실패: 올바른 JSON 배열이 아닙니다.\n" + e.message); }
    };
    reader.readAsText(file);
  }
  function doReset() {
    if (!confirm("로컬 편집본을 버리고 사이트에 배포된 샘플 데이터로 되돌릴까요?")) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* noop */ }
    units = clone(baseUnits()); activeIndex = null; render(); setStatus("샘플로 초기화됨", true);
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

  // ── init ───────────────────────────────────────────────────────────
  function init() {
    var draft = null;
    try { var raw = localStorage.getItem(DRAFT_KEY); if (raw) { var a = JSON.parse(raw); if (Array.isArray(a)) draft = a; } } catch (e) { /* noop */ }
    units = draft ? draft : clone(baseUnits());
    setStatus(draft ? "편집본 불러옴 (" + units.length + "곳)" : "샘플 데이터 (" + units.length + "곳)", !!draft);

    var dl = document.createElement("datalist"); dl.id = "weekday-list";
    dl.innerHTML = WEEKDAYS.map(function (d) { return '<option value="' + d + '">'; }).join("");
    document.body.appendChild(dl);

    map = L.map("admin-map", { zoomControl: true }).setView([36.5, 127.8], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자',
    }).addTo(map);
    unitLayer.addTo(map);
    map.on("click", onMapClick);

    render();

    $list.addEventListener("input", onFieldInput);
    $list.addEventListener("change", onFieldInput);
    $list.addEventListener("click", onListClick);
    document.getElementById("add-btn").addEventListener("click", doAdd);
    document.getElementById("download-js").addEventListener("click", doDownloadJs);
    document.getElementById("copy-json").addEventListener("click", doCopyJson);
    document.getElementById("reset-btn-admin").addEventListener("click", doReset);
    document.getElementById("import-input").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) doImport(e.target.files[0]); e.target.value = "";
    });
    document.querySelectorAll(".view-toggle-btn").forEach(function (b) {
      b.addEventListener("click", function () { setView(b.getAttribute("data-view")); });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pickIndex !== null) stopPick(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
