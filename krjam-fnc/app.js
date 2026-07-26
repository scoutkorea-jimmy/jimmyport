/* ─────────────────────────────────────────────────────────────
   /krjam-fnc — 제16회 한국잼버리 급식편의본부 오리엔테이션 플립북
   The 16th KNJ Food Service & Convenience Division

   원본 PDF(34쪽, 960x540pt)를 pdftoppm 으로 1920x1080 WebP 렌더한
   정적 이미지를 넘겨 보는 뷰어. 의존성 없음(Vanilla), 빌드 단계 없음.

   구성
     - 페이지 넘김: 3D rotateY(책장 넘김) + 키보드/스와이프/휠/스크러버
     - 목차: 썸네일 그리드(패널/하단시트)
     - 확대: 더블클릭·핀치·휠(ctrl) + 드래그 팬
     - 전체화면 · PDF 원본 내려받기 · 딥링크(#p12)
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── 자료 정의 ───────────────────────────────────────────
     쪽 제목은 각 슬라이드의 실제 머리말/내용을 보고 붙였다.
     ⚠️ 원본 34쪽 중 **IST 업무배정표 3쪽(8/3~8/5 · 8/6~8/7 · 8/8~8/9)은 본부 요청으로 전량 삭제**
        (v0.9.235 에서 1쪽, v0.9.236 에서 나머지 2쪽) → 현재 31쪽.
        이미지·썸네일·내려받기 PDF 모두 동일하게 빠져 있다. 되살리려면 원본 PDF 에서 다시 렌더할 것. */
  var TOTAL = 31;
  var TITLES = [
    '표지 — 운영요원(IST) 오리엔테이션',
    '식순',
    '행사 개요',
    '잼버리 일정표',
    '급식편의본부 조직도',
    '급식편의본부 운영 개요',
    '배치도 — 잼버리 식당 · JHQ-F&C',
    '급식편의지원부 업무 — 입퇴영 · 체계 · 위기사항',
    '참가자 식자재 보급 (1개소 11식)',
    '신선도 유지 체계 (Cold-Chain)',
    '식자재 박스 위기상황 대처방안',
    '운영요원 · 컵스카우트 참관단 (2개소 15식)',
    '식사 제공 안내 — 조식 · 중식(간편식) · 석식',
    '식당 운영 — 1식당 · 2식당 · 3식당',
    '잼버리식당 식권 종류 (패스트트랙 포함)',
    '급식편의운영 · 급식시설운영 업무',
    '팀 체계 운영 · 주요업무',
    'IST 운영 관리 계획 · 식음료안전대책',
    '편의시설 운영 — 북카페 · CU · 이디야커피차',
    '소모임 장소 제공 (미니 라운지)',
    '안전보호 교육 안내 (Safe from Harm)',
    '입영 안내 — 8/3(월) 14:00',
    '입영 안내 — 잼버리장 도착 절차',
    '입영 안내도 — GATE 5',
    '입영 안내 — 본부 · 운영요원 숙영지',
    '퇴영 안내 — 8/9(일) 11:00',
    '운영요원 지급품',
    '숙박 안내 — 잼버리텐트',
    '운영요원 체크리스트',
    '급식편의본부 주요 업무추진 일정',
    '맺음말 — 급식편의본부 JPT'
  ];
  // 목차 챕터: [시작쪽, 제목] — 자료의 부서/주제 전환 지점 기준
  var CHAPTERS = [
    [1,  '행사 · 본부 개요'],
    [8,  '급식편의지원부'],
    [9,  '식자재보급운영부'],
    [12, '잼버리식당 · 식사 제공'],
    [16, '편의시설운영부'],
    [21, '안전교육 · 입퇴영 안내'],
    [27, '운영요원 안내'],
    [30, '업무추진 일정 · 마무리']
  ];

  var pageURL  = function (n) { return '/krjam-fnc/pages/p' + pad(n) + '.webp'; };
  var thumbURL = function (n) { return '/krjam-fnc/thumbs/t' + pad(n) + '.webp'; };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function title(n) { return TITLES[n - 1] || (n + '쪽'); }

  /* ── DOM ─────────────────────────────────────────────────── */
  var $ = function (id) { return document.getElementById(id); };
  var shell = $('shell'), stage = $('stage'), book = $('book');
  var leafTop = $('leafTop'), leafUnder = $('leafUnder');
  var flip = $('leafFlip'), flipFace = $('flipFace'), flipShade = $('flipShade');
  var zoomWrap = $('zoomWrap');
  var btnPrev = $('btnPrev'), btnNext = $('btnNext');
  var pgNum = $('pgNum'), pgTot = $('pgTot'), pgTitle = $('pgTitle'), scrub = $('scrub');
  var toc = $('toc'), tocMask = $('tocMask'), tocGrid = $('tocGrid');
  var btnToc = $('btnToc'), btnTocClose = $('btnTocClose'), btnFs = $('btnFs'), btnRot = $('btnRot');
  var zoomBadge = $('zoomBadge'), zoomPct = $('zoomPct'), btnZoomReset = $('btnZoomReset');
  var boot = $('boot');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 상태 ────────────────────────────────────────────────── */
  var page = 1;
  var turning = false;
  var zoom = { s: 1, tx: 0, ty: 0 };
  var MAXZOOM = 4, DBLZOOM = 2.4;

  /* ── 페이지 표시 ─────────────────────────────────────────── */
  function render() {
    leafTop.src = pageURL(page);
    leafTop.alt = page + '쪽 — ' + title(page);
    pgNum.textContent = page;
    pgTitle.textContent = title(page);
    if (scrub.value !== String(page)) scrub.value = page;
    btnPrev.disabled = (page <= 1);
    btnNext.disabled = (page >= TOTAL);
    markToc();
    setHash(page);
    preloadAround(page);
  }

  function setHash(n) {
    var h = '#p' + n;
    if (location.hash !== h) {
      try { history.replaceState(null, '', location.pathname + location.search + h); }
      catch (e) { /* file:// 등에서 무시 */ }
    }
  }

  var preloaded = {};
  function preload(n) {
    if (n < 1 || n > TOTAL || preloaded[n]) return;
    preloaded[n] = true;
    var im = new Image();
    im.src = pageURL(n);
  }
  function preloadAround(n) { preload(n + 1); preload(n + 2); preload(n - 1); }

  /* ── 페이지 넘김 ─────────────────────────────────────────── */
  function goTo(n, animate) {
    n = Math.max(1, Math.min(TOTAL, n | 0));
    if (scrollMode) {                       // 이어보기: 해당 쪽으로 스크롤
      if (n !== page) { page = n; render(); }
      scrollToPage(n, !!animate);
      return;
    }
    if (n === page || turning) return;
    if (!animate || reduceMotion) { page = n; resetZoom(false); render(); return; }
    turn(n);
  }
  var next = function () { goTo(page + 1, true); };
  var prev = function () { goTo(page - 1, true); };

  var ANGLE = -95;   // 90도를 넘기면 backface-visibility 로 사라진다(뒷면 반전 방지)
  var DUR = 480;

  function turn(to) {
    var from = page, forward = to > from;
    turning = true;
    resetZoom(false);

    // 목적지 이미지를 먼저 확보해 넘김 도중 빈 화면이 뜨지 않게 한다.
    ready(pageURL(to), function () {
      leafUnder.src = pageURL(forward ? to : from);
      leafUnder.hidden = false;
      flipFace.src = pageURL(forward ? from : to);
      flip.hidden = false;
      flip.classList.remove('anim');
      setFlip(forward ? 0 : ANGLE, forward ? 0 : 0.9);
      zoomWrap.style.visibility = 'hidden';

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          flip.classList.add('anim');
          setFlip(forward ? ANGLE : 0, forward ? 0.9 : 0);
          window.setTimeout(finish, DUR + 40);
        });
      });

      function finish() {
        page = to;
        render();
        zoomWrap.style.visibility = '';
        flip.classList.remove('anim');
        flip.hidden = true;
        leafUnder.hidden = true;
        turning = false;
      }
    });
  }

  function setFlip(deg, shade) {
    flip.style.transform = 'rotateY(' + deg + 'deg)';
    flipShade.style.opacity = shade;
  }

  // 이미지 디코드 대기(최대 400ms). 캐시된 경우 즉시 통과.
  // 곧바로 못 그리는 경우에만 상단 진행바를 띄운다 — 캐시된 대부분의 넘김에서는
  // 깜빡이지 않도록 120ms 늦춰서 켠다.
  function ready(src, cb) {
    var im = new Image();
    var done = false;
    var late = window.setTimeout(function () { showLoad(true); }, 120);
    var go = function () {
      if (done) return;
      done = true;
      window.clearTimeout(late);
      showLoad(false);
      cb();
    };
    im.onload = go;
    im.onerror = go;
    im.src = src;
    if (im.complete) go(); else window.setTimeout(go, 400);
  }
  var topload = $('topload');
  function showLoad(on) { if (topload) topload.classList.toggle('on', !!on); }

  /* ── 이어보기(세로 스크롤) — 터치 기기 전용 ───────────────
     모바일에서는 한 장씩 넘기는 것보다 문서처럼 죽 내려 읽는 편이 빠르다.
     31쪽을 세로로 쌓고, 화면 한가운데에 걸린 쪽을 '현재 쪽'으로 잡아
     하단 표시·스크러버·목차 강조·해시를 그대로 연동한다.
     확대는 커스텀 로직 대신 브라우저 기본 핀치줌에 맡긴다. */
  var feed = $('feed'), btnMode = $('btnMode');
  var isTouch = window.matchMedia('(pointer: coarse)').matches
    || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  var MODE_KEY = 'krjam-fnc:mode';
  var scrollMode = false, feedBuilt = false, feedRaf = 0;

  function buildFeed() {
    if (feedBuilt) return;
    var frag = document.createDocumentFragment();
    for (var i = 1; i <= TOTAL; i++) {
      var d = document.createElement('div');
      d.className = 'fpage';
      d.dataset.p = i;
      d.className += ' loading';
      d.innerHTML =
        '<img src="' + pageURL(i) + '" alt="' + i + '쪽 — ' + esc(title(i)) + '"' +
        ' loading="lazy" width="1920" height="1080" draggable="false">' +
        '<div class="fcap"><span class="n">' + i + '</span>' + esc(title(i)) + '</div>';
      frag.appendChild(d);
    }
    feed.appendChild(frag);
    // 아직 안 내려온 쪽은 스켈레톤이 흐르게 두고, 도착하면 그 자리에서 걷는다.
    [].forEach.call(feed.querySelectorAll('.fpage'), function (el) {
      var im = el.querySelector('img');
      var done = function () { el.classList.remove('loading'); el.classList.add('ready'); };
      if (im.complete && im.naturalWidth) done();
      else { im.addEventListener('load', done); im.addEventListener('error', done); }
    });
    feedBuilt = true;
  }

  // 스크롤 → '현재 쪽' 판정.
  // 화면 중앙 기준으로 하면 목차에서 20쪽을 눌렀을 때(20쪽이 화면 맨 위) 곧바로
  // 21·22쪽이 현재 쪽으로 잡힌다. 문서 뷰어처럼 **위쪽에 걸린 쪽**을 현재 쪽으로 본다.
  function updateFromFeed() {
    if (!scrollMode || !feedBuilt) return;
    // 기준선은 화면 비율이 아니라 '상단에서 조금 아래'로 잡는다. 세로 화면에는
    // 한 번에 3쪽 가까이 보이므로 비율(예: 35%)로 잡으면 맨 위 쪽을 건너뛴다.
    var r = feed.getBoundingClientRect();
    var anchor = r.top + Math.min(64, r.height * 0.25);
    var els = feed.children, best = 0;
    for (var i = 0; i < els.length; i++) {
      if (els[i].getBoundingClientRect().bottom > anchor) { best = parseInt(els[i].dataset.p, 10); break; }
    }
    if (!best) best = TOTAL;
    if (best !== page) { page = best; render(); }
  }
  feed.addEventListener('scroll', function () {
    if (feedRaf) return;
    feedRaf = requestAnimationFrame(function () { feedRaf = 0; updateFromFeed(); });
  }, { passive: true });

  // offsetTop 은 offsetParent 가 무엇이냐에 따라 기준이 달라진다(실제로 어긋났다).
  // 스크롤 컨테이너 기준 좌표는 rect 차이로 구하는 편이 안전하다.
  function feedTopOf(el) {
    return feed.scrollTop + el.getBoundingClientRect().top - feed.getBoundingClientRect().top - 10;
  }
  function scrollToPage(n, smooth) {
    if (!feedBuilt) return;
    var el = feed.querySelector('.fpage[data-p="' + n + '"]');
    if (!el) return;
    var top = Math.max(0, feedTopOf(el));
    if (feed.scrollTo) feed.scrollTo({ top: top, behavior: smooth ? 'smooth' : 'auto' });
    else feed.scrollTop = top;
  }

  function setMode(scroll, remember) {
    scrollMode = !!scroll && isTouch;
    if (scrollMode) buildFeed();
    document.body.classList.toggle('scrollmode', scrollMode);
    feed.hidden = !scrollMode;
    stage.hidden = scrollMode;
    btnMode.setAttribute('aria-pressed', scrollMode ? 'true' : 'false');
    btnMode.title = scrollMode ? '한 장씩 넘겨보기' : '죽 이어보기';
    btnMode.setAttribute('aria-label', btnMode.title);
    if (scrollMode) { resetZoom(false); setRot(false); scrollToPage(page, false); }
    else { render(); }
    if (remember !== false) { try { localStorage.setItem(MODE_KEY, scrollMode ? 'scroll' : 'flip'); } catch (e) {} }
  }
  btnMode.addEventListener('click', function () { setMode(!scrollMode); });

  /* ── 가로 보기(세로 화면 전용) ───────────────────────────
     좁은 세로 화면에서 16:9 슬라이드는 화면 폭의 56%밖에 못 쓴다.
     90도 돌려 화면을 채우면 약 2배 크게 읽힌다. 이 상태에서는 좌표계가
     돌아가 확대/팬 계산이 어긋나므로 확대는 끄고 넘김만 남긴다. */
  var rotated = false;
  var mqRot = window.matchMedia('(max-width:700px) and (orientation:portrait)');

  function setRot(on) {
    rotated = !!on && mqRot.matches;
    stage.classList.toggle('rot', rotated);
    btnRot.setAttribute('aria-pressed', rotated ? 'true' : 'false');
    btnRot.title = rotated ? '원래대로 보기' : '가로로 크게 보기';
    btnRot.setAttribute('aria-label', btnRot.title);
    if (rotated) resetZoom(false);
  }
  if (mqRot.addEventListener) mqRot.addEventListener('change', function () { if (!mqRot.matches) setRot(false); });
  else if (mqRot.addListener) mqRot.addListener(function () { if (!mqRot.matches) setRot(false); });

  /* ── 확대 / 이동 ─────────────────────────────────────────── */
  function applyZoom(settle) {
    var s = zoom.s;
    if (s <= 1.001) { zoom.s = 1; zoom.tx = 0; zoom.ty = 0; }
    else clampPan();
    zoomWrap.classList.toggle('settling', !!settle);
    zoomWrap.style.transform = 'translate(' + zoom.tx + 'px,' + zoom.ty + 'px) scale(' + zoom.s + ')';
    var on = zoom.s > 1.001;
    stage.classList.toggle('zoomed', on);
    zoomBadge.hidden = !on;
    zoomPct.textContent = Math.round(zoom.s * 100) + '%';
    if (settle) window.setTimeout(function () { zoomWrap.classList.remove('settling'); }, 240);
  }

  function clampPan() {
    var r = book.getBoundingClientRect();
    var minX = r.width - r.width * zoom.s, minY = r.height - r.height * zoom.s;
    zoom.tx = Math.min(0, Math.max(minX, zoom.tx));
    zoom.ty = Math.min(0, Math.max(minY, zoom.ty));
  }

  function resetZoom(settle) {
    zoom.s = 1; zoom.tx = 0; zoom.ty = 0;
    applyZoom(settle);
  }

  // (px,py) = book 기준 좌표. 그 지점을 고정한 채 배율만 바꾼다.
  function zoomAt(px, py, ns, settle) {
    ns = Math.max(1, Math.min(MAXZOOM, ns));
    var cx = (px - zoom.tx) / zoom.s, cy = (py - zoom.ty) / zoom.s;
    zoom.s = ns;
    zoom.tx = px - cx * ns;
    zoom.ty = py - cy * ns;
    applyZoom(settle);
  }

  function bookPoint(ev) {
    var r = book.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  /* ── 포인터: 스와이프 / 팬 / 핀치 ────────────────────────── */
  var pts = {};              // 활성 포인터
  var drag = null;           // 단일 포인터 상태
  var pinch = null;          // 두 손가락 상태

  stage.addEventListener('pointerdown', function (ev) {
    if (ev.button && ev.button !== 0) return;
    if (ev.target.closest('.nav, .zoombadge')) return;
    pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    try { stage.setPointerCapture(ev.pointerId); } catch (e) {}

    var ids = Object.keys(pts);
    if (ids.length === 2 && !rotated) {
      var a = pts[ids[0]], b = pts[ids[1]];
      pinch = {
        d: dist(a, b),
        s: zoom.s,
        mid: midBook(a, b)
      };
      drag = null;
    } else if (ids.length === 1) {
      drag = { x: ev.clientX, y: ev.clientY, tx: zoom.tx, ty: zoom.ty, t: Date.now(), moved: false };
    }
  });

  stage.addEventListener('pointermove', function (ev) {
    if (!pts[ev.pointerId]) return;
    pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var ids = Object.keys(pts);

    if (pinch && ids.length >= 2) {
      var a = pts[ids[0]], b = pts[ids[1]];
      var ns = pinch.s * (dist(a, b) / (pinch.d || 1));
      zoomAt(pinch.mid.x, pinch.mid.y, ns, false);
      return;
    }
    if (!drag) return;
    var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) drag.moved = true;

    if (zoom.s > 1.001) {          // 확대 상태 → 팬
      zoom.tx = drag.tx + dx; zoom.ty = drag.ty + dy;
      applyZoom(false);
    }
  });

  function endPointer(ev) {
    if (!pts[ev.pointerId]) return;
    var last = pts[ev.pointerId];
    delete pts[ev.pointerId];
    try { stage.releasePointerCapture(ev.pointerId); } catch (e) {}

    if (pinch) {                                  // 핀치 종료
      if (Object.keys(pts).length < 2) { pinch = null; applyZoom(true); }
      drag = null;
      return;
    }
    if (!drag) return;

    var dx = last.x - drag.x, dy = last.y - drag.y, dt = Date.now() - drag.t;
    var d = drag; drag = null;

    if (zoom.s > 1.001) { applyZoom(true); return; }
    if (!d.moved) return;                          // 탭 → 더블탭 처리로
    // 가로 스와이프 → 페이지 넘김
    if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 900) {
      if (dx < 0) next(); else prev();
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function midBook(a, b) {
    var r = book.getBoundingClientRect();
    return { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
  }

  /* 더블클릭 / 더블탭 확대 */
  var lastTap = 0;
  stage.addEventListener('dblclick', function (ev) {
    if (ev.target.closest('.nav, .zoombadge')) return;
    toggleZoomAt(ev);
  });
  stage.addEventListener('pointerup', function (ev) {
    if (ev.pointerType === 'mouse') return;
    if (ev.target.closest('.nav, .zoombadge')) return;
    var now = Date.now();
    if (now - lastTap < 300) { toggleZoomAt(ev); lastTap = 0; }
    else lastTap = now;
  });
  function toggleZoomAt(ev) {
    if (rotated) return;                       // 회전 상태에서는 좌표계가 어긋난다
    var p = bookPoint(ev);
    if (zoom.s > 1.001) resetZoom(true);
    else zoomAt(p.x, p.y, DBLZOOM, true);
  }

  /* 휠: ctrl/⌘ → 확대, 확대중 → 팬, 그 외 → 페이지 넘김 */
  var wheelAcc = 0, wheelLock = 0;
  stage.addEventListener('wheel', function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && !rotated) {
      ev.preventDefault();
      var p = bookPoint(ev);
      zoomAt(p.x, p.y, zoom.s * (ev.deltaY < 0 ? 1.12 : 1 / 1.12), false);
      return;
    }
    if (zoom.s > 1.001) {
      ev.preventDefault();
      zoom.tx -= ev.deltaX; zoom.ty -= ev.deltaY;
      applyZoom(false);
      return;
    }
    var now = Date.now();
    if (now < wheelLock) return;
    wheelAcc += (Math.abs(ev.deltaY) > Math.abs(ev.deltaX) ? ev.deltaY : ev.deltaX);
    if (Math.abs(wheelAcc) > 42) {
      ev.preventDefault();
      if (wheelAcc > 0) next(); else prev();
      wheelAcc = 0; wheelLock = now + 620;
    }
  }, { passive: false });

  /* ── 목차 ────────────────────────────────────────────────
     넓은 화면: 좌측 상시 사이드바(레이아웃 일부 — 접으면 뷰어가 넓어진다).
     좁은 화면: 좌측 드로어 + 배경 마스크. 열림 상태는 기기별로 기억한다. */
  var TOC_KEY = 'krjam-fnc:toc';
  var mqWide = window.matchMedia('(min-width:1024px)');

  function buildToc() {
    var frag = document.createDocumentFragment();
    var sec = null, next = 0;
    for (var i = 1; i <= TOTAL; i++) {
      if (next < CHAPTERS.length && CHAPTERS[next][0] === i) {
        sec = document.createElement('div');
        sec.className = 'tocsec';
        sec.innerHTML = '<div class="tocsec-h">' + esc(CHAPTERS[next][1]) + '</div>';
        frag.appendChild(sec);
        next++;
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tocitem';
      b.dataset.p = i;
      b.innerHTML =
        '<img src="' + thumbURL(i) + '" alt="" loading="lazy" width="320" height="180">' +
        '<span class="cap"><span class="n">' + i + '</span><span class="t">' + esc(title(i)) + '</span></span>';
      (sec || frag).appendChild(b);
    }
    tocGrid.appendChild(frag);
    tocGrid.addEventListener('click', function (ev) {
      var it = ev.target.closest('.tocitem');
      if (!it) return;
      goTo(parseInt(it.dataset.p, 10), true);
      if (!mqWide.matches) closeToc();     // 드로어일 때만 닫는다
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function markToc() {
    var on = tocGrid.querySelector('.tocitem.on');
    if (on) on.classList.remove('on');
    var cur = tocGrid.querySelector('.tocitem[data-p="' + page + '"]');
    if (!cur) return;
    cur.classList.add('on');
    if (!toc.hidden) cur.scrollIntoView({ block: 'nearest' });
  }
  function setToc(open, remember) {
    toc.hidden = !open;
    tocMask.hidden = !open;
    btnToc.setAttribute('aria-expanded', open ? 'true' : 'false');
    // 기억은 넓은 화면에서만. 드로어(좁은 화면)의 여닫음까지 저장하면
    // 다음 방문 때 드로어가 열린 채로 떠서 뷰어를 덮는다.
    if (remember !== false && mqWide.matches) { try { localStorage.setItem(TOC_KEY, open ? '1' : '0'); } catch (e) {} }
    if (open) {
      var cur = tocGrid.querySelector('.tocitem[data-p="' + page + '"]');
      if (cur) cur.scrollIntoView({ block: 'center' });
    }
  }
  function openToc() { setToc(true); }
  function closeToc() { setToc(false); }
  function toggleToc() { setToc(toc.hidden); }

  // 넓은 화면: 기본 열림(사용자가 접어뒀으면 그대로). 좁은 화면: 항상 닫힘으로 시작.
  function initToc() {
    if (!mqWide.matches) { setToc(false, false); return; }
    var saved = null;
    try { saved = localStorage.getItem(TOC_KEY); } catch (e) {}
    setToc(saved !== '0', false);
  }
  // 데스크톱 ↔ 모바일 폭을 오갈 때 저장값이 아니라 그 화면의 기본값으로 되돌린다
  // (좁은 화면에서 드로어가 열린 채로 남아 뷰어를 가리는 것을 막는다).
  if (mqWide.addEventListener) mqWide.addEventListener('change', function () { setToc(mqWide.matches, false); });
  else if (mqWide.addListener) mqWide.addListener(function () { setToc(mqWide.matches, false); });

  /* ── 전체화면 ────────────────────────────────────────────── */
  function toggleFs() {
    if (document.fullscreenElement) {
      (document.exitFullscreen || function () {}).call(document);
    } else if (shell.requestFullscreen) {
      shell.requestFullscreen().catch(function () {});
    } else if (shell.webkitRequestFullscreen) {
      shell.webkitRequestFullscreen();
    }
  }

  /* ── 이벤트 배선 ─────────────────────────────────────────── */
  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);
  btnToc.addEventListener('click', toggleToc);
  btnTocClose.addEventListener('click', closeToc);
  tocMask.addEventListener('click', closeToc);
  btnFs.addEventListener('click', toggleFs);
  btnRot.addEventListener('click', function () { setRot(!rotated); });
  btnZoomReset.addEventListener('click', function () { resetZoom(true); });

  scrub.addEventListener('input', function () { goTo(parseInt(scrub.value, 10), false); });

  document.addEventListener('keydown', function (ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var k = ev.key;
    // Esc: 드로어(좁은 화면)만 닫는다 — 넓은 화면의 상시 사이드바는 건드리지 않는다.
    if (k === 'Escape') {
      if (!toc.hidden && !mqWide.matches) { closeToc(); ev.preventDefault(); }
      else if (zoom.s > 1.001) { resetZoom(true); ev.preventDefault(); }
      return;
    }
    if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) && k !== 'ArrowLeft' && k !== 'ArrowRight') return;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { next(); ev.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { prev(); ev.preventDefault(); }
    else if (k === 'Home') { goTo(1, true); ev.preventDefault(); }
    else if (k === 'End') { goTo(TOTAL, true); ev.preventDefault(); }
    else if (k === 't' || k === 'T' || k === 'ㅅ') { toggleToc(); ev.preventDefault(); }
    else if (k === 'f' || k === 'F' || k === 'ㄹ') { toggleFs(); ev.preventDefault(); }
    else if ((k === '+' || k === '=') && !rotated) { zoomAt(book.clientWidth / 2, book.clientHeight / 2, zoom.s * 1.35, true); ev.preventDefault(); }
    else if ((k === '-' || k === '_') && !rotated) { zoomAt(book.clientWidth / 2, book.clientHeight / 2, zoom.s / 1.35, true); ev.preventDefault(); }
    else if (k === '0') { resetZoom(true); ev.preventDefault(); }
  });

  window.addEventListener('hashchange', function () {
    var n = fromHash();
    if (n && n !== page) goTo(n, true);
  });
  window.addEventListener('resize', function () { if (zoom.s > 1.001) applyZoom(false); });

  function fromHash() {
    var m = /^#p(\d{1,2})$/.exec(location.hash || '');
    if (!m) return 0;
    var n = parseInt(m[1], 10);
    return (n >= 1 && n <= TOTAL) ? n : 0;
  }

  /* ── 시작 ────────────────────────────────────────────────── */
  pgTot.textContent = TOTAL;
  scrub.max = TOTAL;
  $('tocCount').textContent = TOTAL + '쪽';
  buildToc();
  initToc();
  page = fromHash() || 1;
  render();

  // 터치 기기는 기본이 '이어보기'(사용자가 한 장씩 보기를 고른 적이 있으면 그것을 따른다)
  if (isTouch) document.body.classList.add('touchdev');
  var savedMode = null;
  try { savedMode = localStorage.getItem(MODE_KEY); } catch (e) {}
  setMode(isTouch && savedMode !== 'flip', false);

  /* ── 부팅 진행 표시 ──────────────────────────────────────
     실제로 기다리는 것(글꼴 · 첫 장 이미지)에 맞춰 단계를 올린다.
     그 사이에도 막대가 멈춰 보이지 않게 90% 까지 천천히 기어간다. */
  var bootFill = $('bootFill'), bootNote = $('bootNote');
  var bootPct = 0, bootCreep = 0;
  function bootTo(pct, note) {
    bootPct = Math.max(bootPct, pct);
    if (bootFill) bootFill.style.width = bootPct.toFixed(1) + '%';
    if (note && bootNote) bootNote.textContent = note;
  }
  function hideBoot() {
    if (!boot || boot.classList.contains('gone')) return;
    window.clearInterval(bootCreep);
    bootTo(100, '거의 다 됐어요');
    boot.classList.add('gone');
    window.setTimeout(function () { if (boot && boot.parentNode) boot.parentNode.removeChild(boot); }, 340);
  }

  bootTo(22, '자료를 불러오는 중…');
  bootCreep = window.setInterval(function () {
    if (bootPct < 90) bootTo(bootPct + (90 - bootPct) * 0.09);
  }, 260);
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(function () { bootTo(55); });
  }
  if (leafTop.complete && leafTop.naturalWidth) hideBoot();
  else {
    leafTop.addEventListener('load', hideBoot);
    leafTop.addEventListener('error', hideBoot);
  }
  window.setTimeout(hideBoot, 4000);              // 이미지가 끝내 안 와도 화면은 연다
})();
