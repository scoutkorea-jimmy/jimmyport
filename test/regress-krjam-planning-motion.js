/* /krjam-planning 모션 회귀 (v0.9.243)
   운영 보드에 붙인 모션이 **동작을 방해하지 않는지**를 지킨다.
   이 화면은 하루 종일 들여다보는 도구라, 확인할 것은 "예쁜가"가 아니라 이것들이다:
     · 화면 전환·모달·토스트가 애니메이션을 갖되 끝난 뒤 transform 이 남지 않는가
       (남으면 안에 있는 position:fixed 모달의 기준이 뒤틀린다)
     · 배경이 상시로 움직이지 않는가(랜딩과 달리 여기서는 두지 않기로 했다)
     · 통신 진행 표시가 켜지고 **반드시 꺼지는가**
     · 조작 요소가 여전히 눌리는가 · 모션 줄이기에서 꺼지는가
   `/api/*` 는 전부 목업 — 운영 KV 를 건드리지 않는다.
   실행: NODE_PATH=<scratch>/node_modules node test/regress-krjam-planning-motion.js */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8887;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  // 유입 비콘(v0.9.257) — sendBeacon 은 window.fetch 목업을 타지 않으므로 서버가 받아 준다
  if (p === '/api/hit') { res.writeHead(204); return res.end(); }
  if (p === '/krjam-planning') p = '/krjam-planning.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});

const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 로그인 세션 + /api 목업 (regress-krjam-planning-nav.js 와 같은 방식)
const SEED = function () {
  localStorage.setItem('jamboree-plan:session', JSON.stringify({ token: 'T', name: '박지민', username: 'jimmy', role: 'admin', type: '홍보부', tabs: [], exp: Date.now() + 9e6 }));
  localStorage.setItem('jamboree-plan:view', 'dashboard');
  window.__puts = 0;
  const rf = window.fetch;
  window.fetch = (u, o) => {
    u = String(u);
    const J = (d) => Promise.resolve(new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } }));
    // 저장(PUT)은 일부러 늦게 답한다 — 진행 표시가 켜졌다 꺼지는 것을 볼 수 있어야 한다
    if (u.startsWith('/api/jamboree-plan') && o && o.method === 'PUT') {
      window.__puts++;
      return new Promise((res) => setTimeout(() => res(new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } })), 700));
    }
    if (u.startsWith('/api/me')) return J({ ok: true });
    if (u.startsWith('/api/jp-news')) return J({ ok: true, articles: [] });
    if (u.startsWith('/api/jp-assets')) return J({ ok: true, assets: [] });
    if (u.startsWith('/api/jp-tips')) return J({ ok: true, tips: [] });
    if (u.startsWith('/api/krjam-dcount')) return J({ ok: true, slots: [], approved: [] });
    if (u.startsWith('/api/jamboree-plan')) return J({ ok: true, slots: {}, types: [], events: [], ttcats: [], offtimes: {},
      marketing: [], contacts: [], divisions: [], protocol: [], mappos: {}, shoots: [], timetable: [],
      roster: [{ id: 'r1', name: '김기자', role: '취재', team: 't1' }] });
    if (u.startsWith('/api/')) return J({ ok: true });
    return rf(u, o);
  };
};

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = []; const base = `http://localhost:${PORT}`;

  console.log('\n[PC 1440 — 부팅]');
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 1000 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.evaluateOnNewDocument(SEED);
  await p.goto(`${base}/krjam-planning`, { waitUntil: 'networkidle2' });
  await wait(700);

  chk('보드가 떴다', await p.evaluate(() => !!document.querySelector('.wrap>section') && !!document.getElementById('side')));
  chk('진행 표시 요소 존재', await p.evaluate(() => !!document.getElementById('netbar')));
  chk('처음엔 통신 표시 꺼짐', await p.evaluate(() =>
    !document.documentElement.classList.contains('net-busy')));

  // ── 상시 움직이는 배경이 없어야 한다(랜딩과 다른 지점) ──
  console.log('\n[배경 — 상시 모션 없음]');
  chk('무한 반복 애니메이션은 통신 표시뿐', await p.evaluate(() => {
    const inf = [];
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.animationName !== 'none' && cs.animationIterationCount === 'infinite'
        && cs.animationPlayState === 'running' && cs.display !== 'none') inf.push(el.className || el.tagName);
    });
    return inf.filter((c) => !/netbar|smdot/.test(String(c))).length === 0;
  }));
  chk('오로라·불티 같은 배경 레이어 없음', await p.evaluate(() =>
    !document.querySelector('.aurora, .embers, .blob')));

  // ── 화면 전환 ──
  console.log('\n[화면 전환]');
  chk('섹션에 전환 애니메이션이 걸려 있음', await p.evaluate(() => {
    const s = document.querySelector('.wrap>section:not([style*="none"])');
    return getComputedStyle(s).animationName === 'jpViewIn';
  }));
  await p.evaluate(() => setView('calendar')); await wait(70);
  const mid = await p.evaluate(() => {
    const s = document.getElementById('calendar');
    return { op: +getComputedStyle(s).opacity, tf: getComputedStyle(s).transform };
  });
  await wait(500);
  chk('전환 중에는 페이드가 걸리고', mid.op > 0 && mid.op < 1, 'opacity ' + mid.op.toFixed(2));
  // ⚠️ 섹션 전환에 transform 을 쓰면 마지막 프레임의 5e-06px 잔여 이동이 rect 높이를
  //    39.999999996 으로 만들어 "조작 요소 40px 이상" 검사를 흔든다(v0.9.244 실제 사고).
  chk('전환 중에도 transform 을 쓰지 않음', mid.tf === 'none', mid.tf.slice(0, 24));
  chk('끝나면 opacity 1', await p.evaluate(() =>
    getComputedStyle(document.getElementById('calendar')).opacity === '1'));
  chk('전환 후 내용이 보임', await p.evaluate(() => {
    const s = document.getElementById('calendar');
    return getComputedStyle(s).opacity === '1' && s.getBoundingClientRect().height > 100;
  }));

  // ── 좌측 메뉴 표시 ──
  console.log('\n[메뉴]');
  chk('현재 화면에 막대 표시', await p.evaluate(() => {
    const on = document.querySelector('.side-item.on');
    if (!on) return false;
    const t = getComputedStyle(on, '::after').transform;
    return t !== 'none';                                   // scaleY(1) 이 적용된 상태
  }));

  // ── 통신 진행 표시 ── 저장이 도는 동안 켜지고, 끝나면 꺼져야 한다
  console.log('\n[저장 진행 표시]');
  await p.evaluate(() => { if (window.netBusy) netBusy(1); });
  await wait(320);                                  // opacity 전환(.2s)이 끝난 뒤에 본다
  chk('통신 중 표시 켜짐', await p.evaluate(() => {
    const on = document.documentElement.classList.contains('net-busy');
    return on && getComputedStyle(document.getElementById('netbar')).opacity === '1';
  }));
  await p.evaluate(() => netBusy(-1)); await wait(300);
  chk('끝나면 꺼짐', await p.evaluate(() =>
    !document.documentElement.classList.contains('net-busy')));
  chk('카운터가 음수로 내려가지 않음', await p.evaluate(() => {
    netBusy(-1); netBusy(-1); netBusy(1);
    const on = document.documentElement.classList.contains('net-busy');
    netBusy(-1);
    return on && !document.documentElement.classList.contains('net-busy');
  }));

  // 실제 저장 경로에서도 켜졌다 꺼지는가 (PUT 은 목업이 700ms 뒤 응답)
  await p.evaluate(() => { if (window.sendDomainPut) sendDomainPut(function () { return { slots: {} }; }, '저장됨'); });
  await wait(200);
  const busyDuring = await p.evaluate(() => document.documentElement.classList.contains('net-busy'));
  await wait(1200);
  const busyAfter = await p.evaluate(() => document.documentElement.classList.contains('net-busy'));
  chk('실제 저장 중 표시가 켜졌다가', busyDuring);
  chk('저장이 끝나면 반드시 꺼진다', !busyAfter);

  // ── 모달 ──
  console.log('\n[모달]');
  await p.evaluate(() => {
    const sc = document.getElementById('ev-scrim'); if (sc) sc.classList.add('show');
  });
  await wait(90);
  chk('모달 등장 애니메이션', await p.evaluate(() => {
    const sc = document.getElementById('ev-scrim');
    const inner = sc.querySelector('.modal') || sc.firstElementChild;
    return getComputedStyle(sc).animationName === 'jpFade'
      && getComputedStyle(inner).animationName === 'jpModalIn';
  }));
  await wait(400);
  chk('모달이 제자리에 안착', await p.evaluate(() => {
    const inner = document.getElementById('ev-scrim').querySelector('.modal');
    return getComputedStyle(inner).transform === 'none';
  }));
  await p.evaluate(() => document.getElementById('ev-scrim').classList.remove('show'));

  // ── 조작 요소 ──
  console.log('\n[조작 요소]');
  chk('버튼에 전환 효과가 있고 높이는 그대로', await p.evaluate(() => {
    // 화면에 실제로 보이는 버튼만 본다(모달 안 버튼은 높이 0 이다)
    const btn = [...document.querySelectorAll('.btn')].find((e) => e.getBoundingClientRect().height > 0);
    if (!btn) return true;
    const cs = getComputedStyle(btn);
    return cs.transitionDuration !== '0s' && btn.getBoundingClientRect().height >= 40;
  }));
  chk('터치 타깃 40px 유지(모션이 크기를 건드리지 않음)', await p.evaluate(() =>
    [...document.querySelectorAll('.side-item')].every((e) => e.getBoundingClientRect().height >= 36)));

  // ── 모바일 접근성 스윕 ── 기존 회귀는 PC 1440 에서만 쟀다(v0.9.247 에 발견한 공백)
  console.log('\n[모바일 390 — 폰트·터치 타깃]');
  const mb = await b.newPage();
  await mb.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  mb.on('pageerror', (e) => errors.push(e.message));
  mb.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await mb.evaluateOnNewDocument(SEED);
  await mb.goto(`${base}/krjam-planning`, { waitUntil: 'networkidle2' });
  await wait(700);
  const mSweep = await mb.evaluate(() => {
    const small = [], tap = [];
    const MINI = ['ttg-del', 'ttg-cov', 'fedx', 'smpop-x', 'news-slot-x', 'press-attx', 'cadd'];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.1) return;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
      if (own && parseFloat(cs.fontSize) < 13) small.push(parseFloat(cs.fontSize) + 'px ' + (el.className || el.tagName));
      if ((el.tagName === 'BUTTON' || el.classList.contains('btn')) && !MINI.some((m) => el.classList.contains(m))
        && r.height < 40) tap.push(Math.round(r.height) + 'px ' + (el.className || el.tagName));
    });
    return { small: [...new Set(small)].slice(0, 4), tap: [...new Set(tap)].slice(0, 4) };
  });
  chk('모바일 본문·라벨 13px 이상', mSweep.small.length === 0, mSweep.small.join(' | '));
  chk('모바일 조작 요소 40px 이상', mSweep.tap.length === 0, mSweep.tap.join(' | '));

  // ── 모션 줄이기 ──
  console.log('\n[모션 줄이기]');
  const rm = await b.newPage(); await rm.setViewport({ width: 1440, height: 1000 });
  rm.on('pageerror', (e) => errors.push(e.message));
  rm.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rm.evaluateOnNewDocument(SEED);
  await rm.goto(`${base}/krjam-planning`, { waitUntil: 'networkidle2' });
  await wait(600);
  chk('화면 전환 애니메이션 꺼짐', await rm.evaluate(() =>
    getComputedStyle(document.querySelector('.wrap>section:not([style*="none"])')).animationName === 'none'));
  chk('그래도 내용은 그대로 보임', await rm.evaluate(() => {
    const s = document.querySelector('.wrap>section:not([style*="none"])');
    return getComputedStyle(s).opacity === '1' && document.querySelectorAll('.side-item').length > 5;
  }));

  /* ── 진행바가 클릭할 때마다 흔들리지 않는가 (v0.9.287) ────────────────────
     사용자: "클릭하면 진행바 같은게 살짝 틀어진다."
     라벨('콘텐츠 완료 3/47 (6%) · 진행 시작 5 · 회의 9건')은 카드를 누를 때마다 숫자가 바뀐다.
     9→10 처럼 자릿수가 늘면 좁은 화면에서 1줄→2줄로 접히고, 행이 커지면서
     align-items:center 가 바를 다시 가운데로 옮겨 **바가 10px 남짓 아래로 밀렸다**(실측).
     ⚠️ 눈으로는 "살짝"이라 놓치기 쉽다 → 라벨을 짧은 것/긴 것으로 바꿔 가며 **좌표를 직접 잰다**. */
  console.log('\n[진행바 — 라벨이 길어져도 움직이지 않는다]');
  const SHORT_L = '콘텐츠 완료 3/47 (6%) · 진행 시작 5 · 회의 9건';
  const LONG_L = '콘텐츠 완료 128/147 (100%) · 진행 시작 128 · 회의 128건';
  const pb = await b.newPage();
  pb.on('pageerror', (e) => errors.push(e.message));
  for (const w of [1440, 1024, 768, 680, 600, 430, 390, 360]) {
    await pb.setViewport({ width: w, height: 900 });
    await pb.goto(`${base}/krjam-planning`, { waitUntil: 'networkidle2' });
    await wait(300);
    const d = await pb.evaluate((S, L) => {
      const bar = document.querySelector('.progress .pbar');
      const txt = document.getElementById('ptext');
      const row = document.querySelector('.progress');
      if (!bar || !txt || !row) return null;
      const snap = (t) => { txt.textContent = t; const r = bar.getBoundingClientRect();
        return { top: r.top, left: r.left, rowH: row.getBoundingClientRect().height }; };
      const a = snap(S), z = snap(L);
      return { top: Math.abs(z.top - a.top), left: Math.abs(z.left - a.left), rowH: Math.abs(z.rowH - a.rowH) };
    }, SHORT_L, LONG_L);
    chk(`${w}px — 라벨이 길어져도 진행바가 제자리`, !!d && d.top < 0.5 && d.left < 0.5 && d.rowH < 0.5,
      d ? `top Δ${d.top.toFixed(1)} left Δ${d.left.toFixed(1)} 행높이 Δ${d.rowH.toFixed(1)}` : 'no element');
  }

  console.log('\n[콘솔]');
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close(); server.close();
  const pass = R.filter((r) => r.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
