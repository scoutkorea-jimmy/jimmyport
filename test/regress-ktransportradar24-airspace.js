/* ktransportradar24 항공정보도 중계 회귀 — 순수함수와 흉내 캐시·fetch 로 처리 흐름까지(네트워크 불필요).
 * 실행: node test/regress-ktransportradar24-airspace.js          (jimmyport — functions/api/ 아래 중계)
 *       node relay/test/regress-ktransportradar24-airspace.js    (K-TrainRader24 — relay/ 아래 중계)
 *
 * 표본은 2026-09-16 V-World 실응답 모양이다:
 *   성공 → 200 image/png (256x256 RGBA · 5,716~12,887 바이트)
 *   실패 → **200 인데 본문이 XML** (ServiceExceptionReport: INCORRECT_KEY · INVALID_KEY · PARAM_REQUIRED)
 * 그래서 이 중계는 상태코드가 아니라 **content-type 으로** 성패를 가른다 — 그 판정을 여기서 지킨다.
 *
 * 인증키는 응답·오류 어디에도 나가면 안 된다 — 흉내 키로 확인한다.
 */
import { existsSync } from 'node:fs';

const candidates = ['../functions/api/ktransportradar24-airspace.js', '../ktransportradar24-airspace.js'].map((p) => new URL(p, import.meta.url));
const found = candidates.find((u) => existsSync(u));
if (!found) { console.log('  FAIL 중계 파일을 찾지 못함'); process.exit(1); }
const relay = await import(found.href);

const {
  parseQuery, sourceUrl, cacheKeyFor, handleGet,
  LAYERS, MAX_LAYERS, MAX_SIDE, BOUNDS_3857, TTL_OK, TTL_FAIL, DOMAIN, VWORLD_WMS,
} = relay;

const R = [];
const chk = (n, got, exp) => { const p = got === exp; R.push(p); console.log((p ? '  PASS ' : '  FAIL ') + n + ' — ' + String(got).slice(0, 120)); };

const KEY = 'TEST-KEY-0000-NEVER-REAL';
const ORIGIN = 'https://scoutingapp.net';
const GOOD = 'SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=lt_c_aisprhc&STYLES=&CRS=EPSG:3857'
  + '&BBOX=14100000,4500000,14200000,4600000&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true';
const q = (s) => parseQuery(ORIGIN + '/api/ktransportradar24-airspace?' + s);

console.log('[입력 검증]');
chk('제대로 된 요청은 통과', q(GOOD).error, undefined);
chk('통과한 요청은 도면 이름을 그대로 싣는다', q(GOOD).layers, 'lt_c_aisprhc');
chk('넷을 한 요청에 합쳐 받는다', q(GOOD.replace('LAYERS=lt_c_aisprhc', 'LAYERS=' + LAYERS.join(','))).layers, LAYERS.join(','));
chk('목록에 없는 도면은 거절', /받지 않는 도면/.test(q(GOOD.replace('lt_c_aisprhc', 'lt_c_landinfobasemap')).error ?? ''), true);
chk('도면이 없으면 거절', /LAYERS 가 없습니다/.test(q(GOOD.replace('LAYERS=lt_c_aisprhc&', '')).error ?? ''), true);
chk('도면 다섯은 거절(원천이 넷까지 받는다)', /1~4개/.test(q(GOOD.replace('LAYERS=lt_c_aisprhc', 'LAYERS=' + LAYERS.concat(['lt_c_aisprhc']).join(','))).error ?? ''), true);
chk('4326 은 거절(축 순서가 뒤집힌다)', /EPSG:3857/.test(q(GOOD.replace('EPSG:3857', 'EPSG:4326')).error ?? ''), true);
chk('BBOX 가 숫자 넷이 아니면 거절', /숫자 넷/.test(q(GOOD.replace('BBOX=14100000,4500000,14200000,4600000', 'BBOX=1,2,3')).error ?? ''), true);
chk('최소가 최대보다 크면 거절', /최소가 최대/.test(q(GOOD.replace('BBOX=14100000,4500000,14200000,4600000', 'BBOX=14200000,4600000,14100000,4500000')).error ?? ''), true);
chk('한국 밖 BBOX 는 거절', /한국 밖/.test(q(GOOD.replace('BBOX=14100000,4500000,14200000,4600000', 'BBOX=0,0,100000,100000')).error ?? ''), true);
chk('타일 크기 상한을 넘으면 거절', /1~512/.test(q(GOOD.replace('WIDTH=256', 'WIDTH=4096')).error ?? ''), true);
chk('크기가 정수가 아니면 거절', /정수가 아닙니다/.test(q(GOOD.replace('WIDTH=256', 'WIDTH=25.5')).error ?? ''), true);
chk('png 말고는 거절', /image\/png/.test(q(GOOD.replace('FORMAT=image/png', 'FORMAT=image/jpeg')).error ?? ''), true);
chk('GetCapabilities 같은 다른 요청은 거절', /GetMap/.test(q(GOOD.replace('REQUEST=GetMap', 'REQUEST=GetCapabilities')).error ?? ''), true);
/*
 * WMS 규격은 파라미터 **이름**만 대소문자를 안 가린다 — **값**은 가린다(`REQUEST=GetMap` 은 그 철자여야 한다).
 * 처음엔 쿼리를 통째로 소문자로 만들어 쟀다가 여기서 걸렸다: 그 표본은 값까지 바꾸므로 규격 밖이었고,
 * 구현이 아니라 표본이 틀린 것이었다. 이름만 낮춰서 잰다.
 */
const lowerNames = GOOD.split('&').map((kv) => { const i = kv.indexOf('='); return kv.slice(0, i).toLowerCase() + kv.slice(i); }).join('&');
chk('이름이 소문자여도 읽는다', q(lowerNames).error, undefined);
chk('값은 대소문자를 가린다 — getmap 은 규격 밖', q(GOOD.replace('REQUEST=GetMap', 'REQUEST=getmap')).error !== undefined, true);

console.log('\n[원천 주소]');
const src = sourceUrl(q(GOOD), KEY);
chk('원천은 V-World WMS', src.startsWith(VWORLD_WMS), true);
chk('버전 1.3.0 을 못박는다', new URL(src).searchParams.get('VERSION'), '1.3.0');
chk('DOMAIN 을 붙인다(없으면 정상 키도 INCORRECT_KEY 다)', new URL(src).searchParams.get('DOMAIN'), DOMAIN);
chk('키를 붙인다', new URL(src).searchParams.get('KEY'), KEY);
chk('좌표계는 3857 고정', new URL(src).searchParams.get('CRS'), 'EPSG:3857');

console.log('\n[캐시 열쇠]');
const ck = cacheKeyFor(ORIGIN, q(GOOD));
chk('캐시 열쇠에 키가 들어가지 않는다', ck.url.includes(KEY), false);
chk('캐시 열쇠에 DOMAIN 이 들어가지 않는다', ck.url.includes('scoutingapp.net/api'), true);
chk('그림을 정하는 값이 같으면 같은 열쇠', cacheKeyFor(ORIGIN, q(GOOD)).url, ck.url);
chk('BBOX 가 다르면 다른 열쇠', cacheKeyFor(ORIGIN, q(GOOD.replace('4500000', '4510000'))).url === ck.url, false);
chk('도면이 다르면 다른 열쇠', cacheKeyFor(ORIGIN, q(GOOD.replace('lt_c_aisprhc', 'lt_c_aisctrc'))).url === ck.url, false);

console.log('\n[처리 흐름]');
const mockCache = () => {
  const m = new Map();
  return { m, async match(req) { const r = m.get(req.url); return r ? r.clone() : undefined; }, async put(req, res) { m.set(req.url, res.clone()); } };
};
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngFetch = (calls) => async (url) => { calls.push(String(url)); return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } }); };
// V-World 실패는 200 에 XML 이다 — 상태코드만 보면 성공으로 읽힌다.
const XML = '<?xml version="1.0" encoding="UTF-8" ?><ServiceExceptionReport version="1.3.0">'
  + '<ServiceException code="INCORRECT_KEY">인증키 정보가 올바르지 않습니다.</ServiceException></ServiceExceptionReport>';
const xmlFetch = (calls) => async (url) => { calls.push(String(url)); return new Response(XML, { status: 200, headers: { 'content-type': 'application/xml;charset=UTF-8' } }); };

const run = async (deps, env, query) => {
  const pending = [];
  const context = {
    request: new Request(ORIGIN + '/api/ktransportradar24-airspace?' + (query ?? GOOD)),
    env: env ?? { VWORLD_API_KEY: KEY },
    waitUntil: (p) => pending.push(p),
  };
  const res = await handleGet(context, deps);
  await Promise.all(pending);
  return res;
};

{
  const calls = [];
  const cache = mockCache();
  const res = await run({ cache, fetch: pngFetch(calls) });
  chk('성공하면 png 를 준다', res.headers.get('content-type'), 'image/png');
  chk('성공은 200', res.status, 200);
  chk('성공은 오래 담아 둔다', res.headers.get('cache-control'), 'public, max-age=' + TTL_OK);
  chk('원천을 한 번 불렀다', calls.length, 1);
  chk('응답 어디에도 키가 없다', JSON.stringify([...res.headers]).includes(KEY), false);
  chk('응답 본문에도 키가 없다', (await res.text()).includes(KEY), false);

  const again = await run({ cache, fetch: pngFetch(calls) });
  chk('같은 타일은 캐시가 준다 — 원천을 다시 안 부른다', calls.length, 1);
  chk('캐시가 준 것도 png', again.headers.get('content-type'), 'image/png');
}

{
  const calls = [];
  const res = await run({ cache: mockCache(), fetch: xmlFetch(calls) });
  chk('원천이 200 에 XML 을 줘도 성공으로 읽지 않는다', res.status, 502);
  chk('실패는 짧게만 담는다', res.headers.get('cache-control'), 'public, max-age=' + TTL_FAIL);
  chk('실패 본문에 키가 없다', (await res.text()).includes(KEY), false);
}

{
  const res = await run({ cache: mockCache(), fetch: pngFetch([]) }, {});
  chk('시크릿이 없으면 502 와 까닭', res.status, 502);
  chk('까닭에 키 이름만 있고 값은 없다', (await res.text()).includes('VWORLD_API_KEY'), true);
}

{
  // fetch 오류 원문은 URL(=키)을 담을 수 있다. 이름만 나가야 한다.
  const boom = async () => { const e = new TypeError('fetch failed ' + VWORLD_WMS + '?KEY=' + KEY); throw e; };
  const res = await run({ cache: mockCache(), fetch: boom });
  chk('원천 오류는 502', res.status, 502);
  const body = await res.text();
  chk('오류 본문에 키가 없다', body.includes(KEY), false);
  chk('오류 이름은 남긴다', body.includes('TypeError'), true);
}

{
  const calls = [];
  const res = await run({ cache: mockCache(), fetch: pngFetch(calls) }, undefined, GOOD.replace('EPSG:3857', 'EPSG:4326'));
  chk('입력이 규칙 밖이면 원천을 부르지 않는다', calls.length, 0);
  chk('입력 오류는 400', res.status, 400);
}

console.log('\n[목록이 화면과 같아야 한다]');
chk('도면 넷', LAYERS.length, 4);
chk('web/src/legend.ts 의 AIRSPACE_LAYERS 와 같은 이름·차례', LAYERS.join(','), 'lt_c_aisprhc,lt_c_aisctrc,lt_c_aisadzc,lt_c_aisfirc');
chk('요청당 도면 상한은 원천 문서값', MAX_LAYERS, 4);
chk('타일 한 변 상한', MAX_SIDE, 512);
chk('한국 둘레가 3857 값으로 들어 있다', BOUNDS_3857.xMin < 14_100_000 && BOUNDS_3857.xMax > 14_200_000, true);

const pass = R.filter(Boolean).length;
console.log('\n' + pass + '/' + R.length + (pass === R.length ? ' PASS' : ' — 실패 ' + (R.length - pass) + '건'));
process.exit(pass === R.length ? 0 : 1);
