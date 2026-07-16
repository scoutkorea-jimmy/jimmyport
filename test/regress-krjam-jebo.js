/* 제보 페이지 전면 재작성 검증 — 동작(계약·검증·i18n)이 그대로인지 + 새 구조가 의도대로인지 */
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8861;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/krjam-jebo') p = '/krjam-jebo.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const R = []; const chk = (n, p, d) => { R.push({ n, p }); console.log((p ? '  PASS ' : '  FAIL ') + n + (d ? ' — ' + d : '')); };

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await b.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.evaluateOnNewDocument(() => {
    localStorage.removeItem('jebo:lang');
    window.__posted = null;
    const rf = window.fetch;
    window.fetch = (u, o) => { u = String(u);
      const J = (d) => Promise.resolve(new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } }));
      if (u.startsWith('/api/jp-tips')) { window.__posted = JSON.parse(o.body); return J({ ok: true, tip: {} }); }
      if (u.startsWith('/api/image')) return J({ ok: true, url: '/api/image?id=' + Math.random().toString(36).slice(2) });
      return rf(u, o); };
  });
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`http://localhost:${PORT}/krjam-jebo`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 400));

  console.log('\n[구조 — 첫 화면에서 할 일이 보이는가]');
  const s = await page.evaluate(() => {
    const hero = document.querySelector('.hero h1').getBoundingClientRect();
    const firstField = document.getElementById('f-text').getBoundingClientRect();
    return { sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      heroTop: Math.round(hero.top), fieldTop: Math.round(firstField.top),
      optHidden: document.getElementById('sec-opt').hidden,
      barFixed: getComputedStyle(document.querySelector('.bar')).position,
      hdrH: Math.round(document.querySelector('.hdr').getBoundingClientRect().height),
      fieldH: Math.round(document.getElementById('f-name').getBoundingClientRect().height),
      btnH: Math.round(document.getElementById('submit').getBoundingClientRect().height),
      inFs: getComputedStyle(document.getElementById('f-name')).fontSize };
  });
  chk('390px 가로 넘침 없음', s.sw <= s.iw, 'scrollW=' + s.sw);
  chk('폼이 첫 화면 안 (이전 333px → 지금)', s.fieldTop < 500, '첫 입력 y=' + s.fieldTop);
  chk('헤더 컴팩트 — 이전엔 언어바만 78px + 프리앰블 333px', s.hdrH <= 64, s.hdrH + 'px');
  chk('선택 항목은 접혀 있음', s.optHidden === true);
  chk('CTA 하단 고정(모바일)', s.barFixed === 'fixed', s.barFixed);
  chk('입력 높이 ≥ 48px 터치 타깃', s.fieldH >= 48, s.fieldH + 'px');
  chk('버튼 높이 ≥ 56px', s.btnH >= 56, s.btnH + 'px');
  chk('입력 글자 16px (iOS 확대 방지)', parseFloat(s.inFs) >= 16, s.inFs);

  console.log('\n[검증 — 화면 순서대로 · 필드 옆에]');
  await page.click('#submit'); await new Promise((r) => setTimeout(r, 250));
  let v = await page.evaluate(() => ({ bad: document.querySelectorAll('.f.bad').length, which: (document.querySelector('.f.bad') || {}).id, msg: (document.getElementById('e-text') || {}).textContent }));
  chk('빈 폼 제출 → 소식부터 지적', v.which === 'f-text-w' && /넣어주세요/.test(v.msg || ''), v.which + ' / ' + v.msg);
  await page.type('#f-text', '개영식 리허설 현장이 멋집니다');
  v = await page.evaluate(() => document.querySelectorAll('.f.bad').length);
  chk('입력하면 오류 표시 즉시 사라짐', v === 0);
  await page.click('#submit'); await new Promise((r) => setTimeout(r, 250));
  v = await page.evaluate(() => ({ which: (document.querySelector('.f.bad') || {}).id }));
  chk('다음은 이름', v.which === 'f-name-w', v.which);
  await page.type('#f-name', '김보람');
  await page.click('#submit'); await new Promise((r) => setTimeout(r, 250));
  v = await page.evaluate(() => ({ which: (document.querySelector('.f.bad') || {}).id }));
  chk('다음은 전화번호', v.which === 'f-phone-w', v.which);
  await page.type('#f-phone', '010-2222-3333');
  await page.click('#submit'); await new Promise((r) => setTimeout(r, 250));
  v = await page.evaluate(() => ({ agree: document.getElementById('sec-agree').classList.contains('bad'), err: document.getElementById('err').textContent }));
  chk('다음은 동의 (섹션 강조 + 하단 문구)', v.agree && /동의/.test(v.err), v.err);

  console.log('\n[제출 — API 계약 그대로]');
  await page.click('#c-consent'); await page.click('#c-participant');
  await page.click('#submit'); await new Promise((r) => setTimeout(r, 500));
  const p1 = await page.evaluate(() => window.__posted);
  chk('POST 바디 키 동일', p1 && ['reporterName', 'phone', 'org', 'zone', 'date', 'time', 'text', 'photos', 'consent', 'participant'].every((k) => k in p1), Object.keys(p1 || {}).join(','));
  chk('값 정상', p1.reporterName === '김보람' && p1.phone === '010-2222-3333' && /개영식/.test(p1.text) && p1.consent === true && p1.participant === true);
  chk('완료 화면 전환', await page.evaluate(() => document.getElementById('done').style.display !== 'none' && document.getElementById('form').style.display === 'none'));

  console.log('\n[선택 항목 · 희망 일시]');
  await page.click('#again'); await new Promise((r) => setTimeout(r, 250));
  chk('새 제보 → 폼 복귀 · 선택 다시 접힘', await page.evaluate(() => document.getElementById('form').style.display === '' && document.getElementById('sec-opt').hidden === true));
  await page.click('#more'); await new Promise((r) => setTimeout(r, 200));
  const opened = await page.evaluate(() => ({ hidden: document.getElementById('sec-opt').hidden, aria: document.getElementById('more').getAttribute('aria-expanded'), zones: document.querySelectorAll('#f-zone option').length }));
  chk('더 알려주기 → 펼침 (aria 반영)', opened.hidden === false && opened.aria === 'true');
  chk('구역 30개 (선택 안 함 + 29)', opened.zones === 30, opened.zones + '개');
  await page.evaluate(() => { document.getElementById('f-text').value = 'x'; document.getElementById('f-name').value = '김'; document.getElementById('f-phone').value = '010';
    document.getElementById('f-org').value = '평화숲분단'; document.getElementById('f-zone').value = 'food';
    document.getElementById('f-date').value = '2026-08-05'; document.getElementById('f-hh').value = '9'; document.getElementById('f-mm').value = '5';
    document.getElementById('c-consent').checked = true; document.getElementById('c-participant').checked = true; });
  await page.click('#submit'); await new Promise((r) => setTimeout(r, 400));
  const p2 = await page.evaluate(() => window.__posted);
  chk('희망 일시 zero-pad (9,5 → 09:05)', p2.date === '2026-08-05' && p2.time === '09:05', p2.date + ' ' + p2.time);
  chk('소속·구역 전달', p2.org === '평화숲분단' && p2.zone === 'food');

  console.log('\n[i18n]');
  await page.click('#again'); await new Promise((r) => setTimeout(r, 200));
  await page.click('#lang-en'); await new Promise((r) => setTimeout(r, 250));
  const en = await page.evaluate(() => ({ lang: document.documentElement.lang, h: document.querySelector('.hero h1').textContent, sec: document.getElementById('t-h-news').textContent,
    ph: document.getElementById('f-name').placeholder, zone: document.querySelector('#f-zone option:nth-child(2)').textContent, btn: document.getElementById('submit').textContent }));
  chk('EN 전환 — 제목·섹션·버튼', en.lang === 'en' && /Share your/.test(en.h) && /What is your news/.test(en.sec) && /Send report/.test(en.btn), en.h.replace(/\s+/g, ' '));
  chk('EN 구역 라벨 · placeholder', /JHQ HQ/.test(en.zone) && /Your name/.test(en.ph), en.zone);
  // 오류 문구도 언어 따라가는지
  await page.click('#submit'); await new Promise((r) => setTimeout(r, 200));
  const enErr = await page.evaluate(() => document.getElementById('e-text').textContent);
  chk('EN 오류 문구', /photo or a message/.test(enErr), enErr);
  await page.click('#lang-ko'); await new Promise((r) => setTimeout(r, 200));
  const koErr = await page.evaluate(() => document.getElementById('e-text').textContent);
  chk('언어 바꾸면 떠 있던 오류도 번역', /넣어주세요/.test(koErr), koErr);

  console.log('\n[데스크톱]');
  await page.setViewport({ width: 1280, height: 900 }); await new Promise((r) => setTimeout(r, 350));
  const d = await page.evaluate(() => ({ bar: getComputedStyle(document.querySelector('.bar')).position, sw: document.documentElement.scrollWidth, iw: window.innerWidth,
    h1: getComputedStyle(document.querySelector('.hero h1')).fontSize }));
  chk('데스크톱 CTA 는 흐름 안으로', d.bar === 'static', d.bar);
  chk('데스크톱 넘침 없음', d.sw <= d.iw);
  chk('데스크톱 제목 확대', parseFloat(d.h1) >= 30, d.h1);

  console.log('\n[콘솔]');
  chk('에러 0', errors.length === 0, errors.slice(0, 2).join(' | ') || 'clean');

  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => { document.getElementById('again').click(); }); await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: '/tmp/jebo-new-mob.png' });
  await page.setViewport({ width: 1280, height: 1000 }); await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: '/tmp/jebo-new-desk.png' });

  await b.close(); server.close();
  const f = R.filter((x) => !x.p);
  console.log('\n=== ' + (R.length - f.length) + '/' + R.length + ' PASS ===');
  if (f.length) console.log('FAILED: ' + f.map((x) => x.n).join(' | '));
  process.exit(f.length ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); server.close(); process.exit(2); });
