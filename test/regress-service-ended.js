/* 서비스 종료(2026-08-14) 회귀 — 카드뉴스 제작기 · 디데이 프로젝트 · 급식편의본부
 *
 * 왜 이 스위트가 따로 있나:
 *  ① **덜 지우면** 죽은 링크가 남는다 — 랜딩·홍보부에서 종료 서비스로 가는 길이 남으면
 *     참가자는 404 를 본다. 눈으로는 절대 다 못 찾는다(6군데였다).
 *  ② **더 지우면** 살아 있는 화면이 깨진다 — `jamboree/` 는 카드뉴스 전용이 아니라
 *     **엠블럼·OG 이미지를 랜딩·홍보부·제보가 함께 쓰는 폴더**다. 통째로 지우면
 *     아이콘이 전부 사라지는데 **화면은 뜨기 때문에 회귀 없이는 안 보인다.**
 *  ③ 인쇄물·QR 로 뿌려진 주소라 종료 안내 화면이 **반드시** 떠야 한다.
 *
 * 실행: NODE_PATH=<scratch>/node_modules node test/regress-service-ended.js  (puppeteer-core 필요) */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8897;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  if (p === '/service-ended') p = '/service-ended.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const has = (f) => fs.existsSync(path.join(ROOT, f));

/* 종료한 서비스가 저장소에 남긴 것 — 하나라도 되살아나면 '반쯤 종료' 상태가 된다 */
const GONE_FILES = [
  'krjam-cardnews.html', 'krjam-dcount.html', 'krjam-fnc.html', 'krjam-fnc-book.html',
  'krjam-dcount', 'krjam-fnc', 'jamboree/app.jsx', 'jamboree/store.js', 'jamboree/fonts',
  'functions/api/jamboree.js', 'functions/api/krjam-dcount.js',
  'functions/api/jp-fnc.js', 'functions/api/jp-fnc-auth.js', 'functions/api/jp-fnc-org.js',
  'functions/api/jp-fnc-staff.js', 'functions/api/jp-fnc-content.js',
];
/* 종료했어도 **남아 있어야** 하는 것 — 살아 있는 화면이 쓰는 공유 자산 */
const KEPT_FILES = ['jamboree/assets/logo.png', 'jamboree/assets/og-planning.png', 'countdown.js', 'functions/api/jp-meals.js', 'functions/api/image.js'];
/* 문의처 — 종료한 서비스는 이 주소 하나로만 연락이 닿는다.
   ⚠️ 주소를 바꿀 때 한 곳만 고치면 **죽은 주소가 남는다**. 여기와 개인정보 처리방침을 함께 잰다. */
const CONTACT = 'scoutkorea@kakao.com';
const CONTACT_FILES = ['service-ended.html', 'privacy.html'];

/* 종료 안내가 이름을 갈아 끼우는 키 → 화면에 떠야 하는 말 */
const CASES = [
  ['cardnews', '카드뉴스 제작기'],
  ['dcount', '디데이 프로젝트'],
  ['fnc', '급식편의본부 안내'],
];

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const base = `http://localhost:${PORT}`;
  const errors = [];

  console.log('\n[저장소 — 지운 것 / 남긴 것]');
  {
    const left = GONE_FILES.filter(has);
    chk('종료한 서비스 파일이 전부 사라졌다', left.length === 0, left.join(', '));
    const lost = KEPT_FILES.filter((f) => !has(f));
    chk('살아 있는 화면이 쓰는 공유 자산은 그대로다', lost.length === 0, lost.join(', '));
  }

  console.log('\n[지운 것이 실제로 404 가 되는가]');
  {
    /* 🔴 v0.9.295 배포 후 실측: 지운 자산·API 가 **404 가 아니라 랜딩 HTML 200** 이었다.
       Cloudflare Pages 는 `404.html` 이 없으면 **못 찾은 경로에 index.html 을 200 으로** 준다
       (`/nonexistent-xyz` 도 같았다 = 이번 삭제 탓이 아닌 원래 동작).
       그대로 두면 '지웠는데 지워지지 않은 것처럼' 보이고, 옛 클라이언트가 JSON 대신 HTML 을 받는다.
       ⚠️ 이 사이트는 경로 기반 클라이언트 라우팅을 쓰지 않으므로(해시만) 404.html 이 안전하다. */
    chk('404.html 이 있다(Pages catch-all 을 끈다)', has('404.html'));
    const f404 = has('404.html') ? rd('404.html') : '';
    chk('404 화면이 도구 모음으로 돌아가는 길을 준다', /href="\/"/.test(f404));
    chk('404 화면도 공유 엠블럼을 쓴다(경로 살아 있음 확인)', /jamboree\/assets\/logo\.png/.test(f404));
  }

  console.log('\n[살아 있는 화면 — 죽은 링크가 남지 않았다]');
  {
    // ⚠️ 홍보부 app.js 의 콘텐츠 유형 'dcount'(D-count 카드뉴스 종류)는 서비스와 무관하다.
    //    그래서 문자열이 아니라 **주소와 API 경로**로만 잰다.
    const DEAD = ['/krjam-cardnews', '/krjam-dcount', '/krjam-fnc', '/krjam-fnc-book', '/api/krjam-dcount', '/api/jamboree', '/api/jp-fnc'];
    const FILES = ['index.html', 'krjam-planning.html', 'krjam-jebo.html', 'jamboree-plan/app.js', 'jamboree-plan/styles.css', 'admin/admin.js'];
    const bad = [];
    FILES.forEach((f) => {
      const src = rd(f);
      DEAD.forEach((d) => {
        // 주석에 남긴 이력('… /krjam-fnc 가 v0.9.271 에 …')은 링크가 아니다 →
        // 실제로 이동·호출에 쓰이는 형태(따옴표로 감싼 주소)만 본다.
        if (new RegExp('["\'`]' + d.replace(/\//g, '\\/') + '[\'"`?]').test(src)) bad.push(f + ' → ' + d);
      });
    });
    chk('랜딩·홍보부·제보·운영현황에 종료 서비스로 가는 길이 없다', bad.length === 0, bad.join(' | '));
    chk('유입 집계 화이트리스트에서도 빠졌다',
      !/krjam-cardnews|krjam-dcount|krjam-fnc/.test(rd('functions/api/hit.js').split('export const ROUTES')[1].split(']')[0]));
  }

  console.log('\n[문의처]');
  {
    const stale = [];
    CONTACT_FILES.forEach((f) => {
      const src = rd(f);
      // 지금 주소가 아닌 메일 주소가 남아 있으면 죽은 연락처다
      (src.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || []).forEach((m) => {
        if (m.toLowerCase() !== CONTACT) stale.push(f + ' → ' + m);
      });
    });
    chk('종료 안내·개인정보 처리방침에 옛 문의처가 남아 있지 않다', stale.length === 0, [...new Set(stale)].join(' | '));
    chk('종료 안내의 문의 버튼이 현재 주소로 간다',
      new RegExp('href="mailto:' + CONTACT + '"').test(rd('service-ended.html')));
  }

  console.log('\n[_redirects — 뿌려진 주소가 안내 화면으로 간다]');
  {
    const rdr = rd('_redirects');
    const want = ['/krjam-cardnews', '/krjam-dcount', '/krjam-fnc', '/krjam-fnc-book', '/jamboree'];
    const miss = want.filter((w) => !new RegExp('^' + w.replace(/\//g, '\\/') + '\\s+\\/service-ended\\?s=\\w+\\s+302\\s*$', 'm').test(rdr));
    chk('종료 주소 5종이 /service-ended 로 302 된다', miss.length === 0, miss.join(', '));
    // 301 은 브라우저가 영구 캐시한다 — 되살릴 때 이용자 브라우저가 안 돌아온다.
    chk('301(영구)이 아니라 302 다', !/\/service-ended\?s=\w+\s+301/.test(rdr));
  }

  console.log('\n[종료 안내 화면]');
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  for (const [key, label] of CASES) {
    await p.goto(`${base}/service-ended?s=${key}`, { waitUntil: 'networkidle2' }); await wait(120);
    const got = await p.evaluate(() => ({
      svc: document.getElementById('svc').textContent.trim(),
      desc: document.getElementById('desc').textContent.trim(),
      note: document.getElementById('datanote').textContent.trim(),
      title: document.title,
      home: !!document.querySelector('a.btn.primary[href="/"]'),
    }));
    chk(`?s=${key} → '${label}' 로 바뀐다`, got.svc === label, got.svc);
    chk(`?s=${key} → 설명·안내가 그 서비스 말로 바뀐다`, got.desc.length > 20 && got.note.length > 20 && got.title.indexOf(label) === 0);
    chk(`?s=${key} → 도구 모음으로 돌아가는 길이 있다`, got.home);
  }
  // 디데이는 참가자 사진이 걸린 서비스다 — '보관하고 있다'는 말이 반드시 있어야 한다.
  await p.goto(`${base}/service-ended?s=dcount`, { waitUntil: 'networkidle2' }); await wait(80);
  chk('디데이 안내는 사진·신청정보 보관을 알린다', await p.evaluate(() => {
    const t = document.getElementById('datanote').textContent;
    return /사진/.test(t) && /보관/.test(t);
  }));

  // 키가 없거나 모르는 키여도 화면은 성립해야 한다(직접 /service-ended 를 치는 사람이 있다)
  for (const q of ['', '?s=nope']) {
    await p.goto(`${base}/service-ended${q}`, { waitUntil: 'networkidle2' }); await wait(80);
    const ok = await p.evaluate(() => {
      const s = document.getElementById('svc').textContent.trim();
      return s.length > 0 && document.getElementById('desc').textContent.trim().length > 20;
    });
    chk(`키 없이${q ? '(모르는 키)' : ''} 열어도 기본 문구가 성립한다`, ok);
  }

  console.log('\n[종료 안내 화면 — 접근성 실측]');
  await p.goto(`${base}/service-ended?s=dcount`, { waitUntil: 'networkidle2' }); await wait(150);
  {
    const sweep = await p.evaluate(() => {
      const small = [], tap = [];
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.1) return;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
        if (own && parseFloat(cs.fontSize) < 13) small.push(parseFloat(cs.fontSize) + 'px ' + (el.className || el.tagName));
        if ((el.tagName === 'BUTTON' || el.tagName === 'A') && r.height < 40) tap.push(Math.round(r.height) + 'px ' + (el.className || el.tagName));
      });
      return { small: [...new Set(small)].slice(0, 5), tap: [...new Set(tap)].slice(0, 5) };
    });
    chk('본문·라벨 전부 13px 이상', sweep.small.length === 0, sweep.small.join(' | '));
    chk('조작 요소 전부 40px 이상', sweep.tap.length === 0, sweep.tap.join(' | '));
  }
  chk('가로 스크롤 없음(PC)', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await wait(200);
  chk('가로 스크롤 없음(모바일 390)', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  chk('모바일에서도 버튼이 카드 밖으로 안 나간다', await p.evaluate(() => {
    const card = document.querySelector('.card').getBoundingClientRect();
    return [...document.querySelectorAll('.btn')].every((x) => {
      const r = x.getBoundingClientRect();
      return r.left >= card.left - 1 && r.right <= card.right + 1;
    });
  }));
  chk('엠블럼이 실제로 그려진다(공유 자산 경로가 살아 있다)', await p.evaluate(() => {
    const i = document.querySelector('img.emblem');
    return !!i && i.complete && i.naturalWidth > 0;
  }));
  chk('콘솔 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));

  await p.close(); await b.close(); server.close();
  const pass = R.filter((x) => x.p).length;
  console.log(`\n결과: ${pass}/${R.length} 통과`);
  process.exit(pass === R.length ? 0 : 1);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
