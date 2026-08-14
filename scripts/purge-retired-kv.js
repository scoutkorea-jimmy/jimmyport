#!/usr/bin/env node
/* 종료 서비스(2026-08-14)의 운영 KV 키 일괄 삭제 — 사용자 확정: **2026년 말 실행**
 *
 * 대상: 카드뉴스 제작기 · 디데이 프로젝트 · 급식편의본부
 *
 * ⚠️ 이 스크립트는 **파괴적**이다. 저장소 규칙(CLAUDE.md)상 운영 KV 파괴적 쓰기는 금지이고,
 *    이건 사용자가 명시적으로 지시한 **단 하나의 예외**다. 그래서 안전장치를 셋 넣었다:
 *
 *    ① **기본은 미리보기(dry-run)** — 실제로 지우려면 `--confirm` 을 붙여야 한다.
 *    ② **로컬 백업 대조** — 지울 키마다 로컬 백업 파일이 있어야 하고, 사진은 실제 이미지
 *       파일이 있어야 한다. 하나라도 없으면 **아무것도 지우지 않고 멈춘다.**
 *       (백업 없이 지우면 되찾을 방법이 없다 — 사진은 저장소에 없던 자료다.)
 *    ③ **허용 목록 밖은 손대지 않는다** — 특히 `jp:` 로 시작하는 키는 대부분 **홍보부(운영 중)**
 *       자료다. `jp:fnc*` 만 급식본부 것이고 `jp:meals`·`jp:roster` 등은 지금도 쓰인다.
 *       접두사만 보고 지우면 운영 중인 보드를 통째로 날린다.
 *
 * 쓰는 법:
 *   node scripts/purge-retired-kv.js "<백업폴더>"              # 미리보기 (아무것도 안 지움)
 *   node scripts/purge-retired-kv.js "<백업폴더>" --confirm    # 실제 삭제
 *
 *   <백업폴더> 기본값: ~/Desktop/Legacy/서버백업-KV-20260814
 *
 * 지우지 않는 것:
 *   - `hit:/krjam-*` 유입 기록 → `expirationTtl` 90일이라 **저절로 사라진다**(hit.js).
 *   - `img:` 중 디데이가 참조하지 않는 것 → **소식 제보·홍보부 사진**이다. 같은 네임스페이스를
 *     쓰므로 접두사로 지우면 운영 중인 자료가 날아간다. 백업의 사진 목록에 있는 id 만 지운다.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const NS = '5b8071435ace47f9a8eccb8ade1b946e';   // SCOUT_KV (wrangler.toml)
const CONFIRM = process.argv.includes('--confirm');
const BACKUP = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0]
  || path.join(os.homedir(), 'Desktop/Legacy/서버백업-KV-20260814');
const ARCHIVE = path.join(path.dirname(BACKUP), 'KRJAM16-종료서비스-아카이브-20260814');

const wrangler = (args) => execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
const safe = (n) => n.replace(/[/\\:]/g, '__');
const die = (msg) => { console.error('\n중단: ' + msg + '\n(아무것도 지우지 않았습니다.)'); process.exit(1); };

/* ── 지울 키를 고른다 ─────────────────────────────────────────────── */
function classify(key) {
  if (key.startsWith('dcount')) return 'dcount';
  if (key.startsWith('jamboree')) return 'cardnews';      // jamboree / jamboree:index / jamboree:item:*
  if (key.startsWith('jp:fnc') || key.startsWith('fncauth')) return 'fnc';
  return null;                                            // 그 외는 전부 운영 중 — 손대지 않는다
}

console.log(`백업 폴더: ${BACKUP}`);
if (!fs.existsSync(BACKUP)) die('백업 폴더가 없습니다. 백업 없이는 지울 수 없습니다.');

console.log('KV 키 목록을 읽는 중…');
const allKeys = JSON.parse(wrangler(['kv', 'key', 'list', `--namespace-id=${NS}`, '--remote'])).map((k) => k.name);
console.log(`  전체 ${allKeys.length}개`);

const targets = allKeys.map((k) => [k, classify(k)]).filter(([, g]) => g);

/* 사진 id — **백업의 사진 목록에 있는 것만**. 접두사로 지우면 제보 사진까지 날아간다. */
const photoIndex = path.join(ARCHIVE, '02-디데이프로젝트/라이브데이터/사진-목록.json');
if (!fs.existsSync(photoIndex)) die(`사진 목록을 찾을 수 없습니다: ${photoIndex}`);
const photos = JSON.parse(fs.readFileSync(photoIndex, 'utf8'));
const photoIds = photos.map((p) => p.sourceUrl.split('?id=')[1]).filter(Boolean);

/* ── 안전장치 ② 백업 대조 ─────────────────────────────────────────── */
const missing = [];
for (const [k, g] of targets) {
  const base = path.join(BACKUP, g, safe(k));
  if (!fs.existsSync(base + '.json') && !fs.existsSync(base + '.txt')) missing.push('키 백업 없음: ' + k);
}
for (const p of photos) {
  const f = path.join(ARCHIVE, '02-디데이프로젝트/라이브데이터/사진', p.file);
  if (!fs.existsSync(f)) missing.push('사진 파일 없음: ' + p.file);
  else if (fs.statSync(f).size !== p.bytes) missing.push(`사진 크기 불일치: ${p.file} (${fs.statSync(f).size} ≠ ${p.bytes})`);
}
/* 라이브에 있는 사진 id 가 백업에 없다면, 백업 뒤에 새로 올라온 것이다 — 지우면 안 된다. */
const liveImg = allKeys.filter((k) => k.startsWith('img:')).map((k) => k.slice(4));
const dcountImgNotBacked = photoIds.filter((id) => !liveImg.includes(id));
if (dcountImgNotBacked.length) console.log(`  (참고) 백업에는 있으나 라이브에 없는 사진 ${dcountImgNotBacked.length}건 — 이미 지워진 것)`);

if (missing.length) {
  missing.slice(0, 20).forEach((m) => console.error('  ✗ ' + m));
  die(`백업이 불완전합니다 (${missing.length}건).`);
}
console.log('  ✓ 백업 대조 통과 — 지울 키·사진이 전부 로컬에 있습니다.');

/* ── 계획 ─────────────────────────────────────────────────────────── */
const imgKeys = photoIds.filter((id) => liveImg.includes(id)).map((id) => 'img:' + id);
const plan = [...targets.map(([k]) => k), ...imgKeys];
const byGroup = { dcount: 0, cardnews: 0, fnc: 0, 사진: imgKeys.length };
targets.forEach(([, g]) => { byGroup[g]++; });

console.log('\n지울 것:');
Object.entries(byGroup).forEach(([g, n]) => console.log(`  ${g.padEnd(10)} ${n}개`));
console.log(`  ${'합계'.padEnd(10)} ${plan.length}개`);
console.log('\n지우지 않는 것:');
console.log(`  jp:* (홍보부 운영 중)   ${allKeys.filter((k) => k.startsWith('jp:') && !k.startsWith('jp:fnc')).length}개`);
console.log(`  img:* (제보·홍보부 사진) ${liveImg.length - imgKeys.length}개`);
console.log(`  hit:/krjam-* 유입 기록   → 90일 TTL 로 자동 소멸(건드리지 않음)`);

if (!CONFIRM) {
  console.log('\n── 미리보기입니다. 아무것도 지우지 않았습니다. ──');
  console.log('실제로 지우려면 뒤에 --confirm 을 붙이세요.');
  process.exit(0);
}

/* ── 실행 ─────────────────────────────────────────────────────────── */
console.log('\n삭제를 시작합니다…');
let done = 0; const failed = [];
for (const k of plan) {
  try { wrangler(['kv', 'key', 'delete', k, `--namespace-id=${NS}`, '--remote', '--force']); done++; }
  catch (e) { failed.push(k); }
  if (done % 20 === 0) console.log(`  ${done}/${plan.length}`);
}
console.log(`\n삭제 완료 ${done}/${plan.length}` + (failed.length ? ` · 실패 ${failed.length}: ${failed.slice(0, 5).join(', ')}` : ''));
console.log('⚠️ rules/operations-log.md 에 실행 사실을 기록하세요(날짜·건수·실행자).');
