/* ktransportradar24 시내버스 중계 회귀 — 순수함수와 흉내 캐시·KV·fetch 로 처리 흐름까지(네트워크 불필요).
 * 실행: node test/regress-ktransportradar24-bus.js          (jimmyport — functions/api/ 아래 중계)
 *       node relay/test/regress-ktransportradar24-bus.js    (K-TrainRader24 — relay/ 아래 중계)
 * 표본은 2026-09-15 TAGO 실응답 모양이다(숫자 99·body "", 문자열 좌표, 좌표 없는 계룡 34070, 게이트웨이 12·30).
 * 인증키는 응답·오류 어디에도 나가면 안 된다 — 흉내 키로 확인한다. */
import { existsSync } from 'node:fs';

const candidates = ['../functions/api/ktransportradar24-bus.js', '../ktransportradar24-bus.js'].map((p) => new URL(p, import.meta.url));
const found = candidates.find((u) => existsSync(u));
if (!found) { console.log('  FAIL 중계 파일을 찾지 못함'); process.exit(1); }
const relay = await import(found.href);

const {
  parseQuery, basisOf, readEnvelope, trimVehicles, trimStops, cacheKeys, fallbackPayload, kstDate, budgetKey,
  readRemainingHeader, budgetDecision, planBudgetWrite, keyForQuery, tagoUrl, redact, handleGet, _resetBudgetMemo,
  CITY_CODES, EXCLUDED, ROUTE_ID, BUDGET_FLOOR, BUDGET_ERROR, TTL_POS, TTL_STALE, TTL_STOPS, TTL_FAIL, OPS,
} = relay;

const R = [];
const chk = (n, got, exp) => { const p = got === exp; R.push(p); console.log((p ? '  PASS ' : '  FAIL ') + n + ' — ' + String(got).slice(0, 120)); };

const T0 = Date.UTC(2026, 8, 15, 12, 0, 0); // 2026-09-15 21:00 KST
const ok = (item, total) => JSON.stringify({ response: { header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' }, body: { items: item === '' ? '' : { item }, numOfRows: 300, pageNo: 1, totalCount: total } } });
const S99 = '{"response":{"header":{"resultCode":99,"resultMsg":"가용한 세션이 존재하지 않습니다. (30\\/30)"},"body":""}}';
const DJ = [
  { gpslati: 36.405801, gpslong: 127.303479, nodeid: 'DJB8001186', nodenm: '국방과학연구소입구', nodeord: 4, routenm: 101, routetp: '간선버스', vehicleno: '대전75자9503' },
  { gpslati: '36.365366', gpslong: 127.334705, nodeid: 'DJB8005928', nodenm: '온천2동주민센터', nodeord: 17, routenm: 101, routetp: '간선버스', vehicleno: '대전75자9520' },
];

console.log('[입력 검증]');
const q = (s) => parseQuery('https://scoutingapp.net/api/ktransportradar24-bus?' + s);
chk('도시 코드가 숫자가 아니면 거절', q('city=abc&route=DJB30300036').ok, false);
chk('한 자리 도시 코드 거절', q('city=1&route=DJB30300036').ok, false);
chk('서울(11)은 시내버스가 없어 모르는 도시', q('city=11&route=DJB30300036').error, '모르는 도시 코드 11');
chk('계룡 34070 은 이유와 함께 거절', /대전/.test(q('city=34070&route=GRB69690112').error) && q('city=34070&route=GRB69690112').ok === false, true);
chk('노선 ID 공백 거절', q('city=25&route=DJB%20303').ok, false);
chk('노선 ID 스크립트 거절', q('city=25&route=%3Cscript%3E').ok, false);
chk('노선 ID 소문자 거절', q('city=25&route=djb30300036').ok, false);
chk('노선 ID 없으면 거절', q('city=25').ok, false);
chk('오류 문장에 받은 노선 값을 되비치지 않는다', q('city=25&route=%3Cscript%3E').error.includes('<script>'), false);
chk('정상 입력', JSON.stringify(q('city=25&route=DJB30300036')), JSON.stringify({ ok: true, city: 25, route: 'DJB30300036', stops: false }));
chk('stops=1 은 정류소 요청', q('city=25&route=DJB30300036&stops=1').stops, true);
chk('구미 하이픈 ID(GMB0-110) 통과', q('city=37050&route=GMB0-110').ok, true);
chk('광주 짧은 ID(KJB10) 통과', q('city=24&route=KJB10').ok, true);
chk('도시 목록 136곳(계룡·양양 0노선 제외)', CITY_CODES.length, 136);
chk('목록에 34070 없음', CITY_CODES.includes(34070), false);
chk('제외 표에 34070', typeof EXCLUDED[34070], 'string');
chk('노선 ID 뒷부분 12자까지(실측 최장 10자)', ROUTE_ID.test('DJB' + '1'.repeat(12)), true);
chk('노선 ID 뒷부분 13자 거절', ROUTE_ID.test('DJB' + '1'.repeat(13)), false);
chk('구미 한글 ID(GMB수점10) 거절', q('city=37050&route=' + encodeURIComponent('GMB수점10')).ok, false);

console.log('\n[위치 근거]');
chk('수원 31010 → stop', basisOf(31010), 'stop');
chk('양평 31380 → stop', basisOf(31380), 'stop');
chk('대전 25 → gps', basisOf(25), 'gps');
chk('제주 39 → gps', basisOf(39), 'gps');
chk('창원 38010 → gps', basisOf(38010), 'gps');
chk('춘천 32010 → gps', basisOf(32010), 'gps');

console.log('\n[응답 모양]');
chk('99 는 숫자·body "" 로 와도 코드 99', readEnvelope(S99).code, '99');
chk('items "" 는 성공 0건', JSON.stringify(readEnvelope(ok('', 0))), JSON.stringify({ code: '0', message: '', items: [], totalCount: 0 }));
chk('item 객체 하나 → 1행', readEnvelope(ok(DJ[0], 1)).items.length, 1);
chk('item 배열 → 2행', readEnvelope(ok(DJ, 2)).items.length, 2);
chk('게이트웨이 12', readEnvelope('{"OpenAPI_ServiceResponse":{"cmmMsgHeader":{"errMsg":"NO_OPENAPI_SERVICE_ERROR","returnAuthMsg":"해당 오픈API 서비스가 없거나 폐기됨","returnReasonCode":"12"}}}').code, '12');
chk('게이트웨이 30', readEnvelope('{"OpenAPI_ServiceResponse":{"cmmMsgHeader":{"errMsg":"SERVICE_KEY_IS_NOT_REGISTERED_ERROR","returnAuthMsg":"등록되지 않은 서비스키","returnReasonCode":"30"}}}').code, '30');
chk('XML 게이트웨이 22', readEnvelope('<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>LIMITED</returnAuthMsg><returnReasonCode>22</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>').code, '22');
chk('최상위 header 01', readEnvelope('{"header":{"resultCode":"01"}}').code, '1');
chk('03 은 0건 성공', readEnvelope('{"response":{"header":{"resultCode":"03"}}}').code, '0');
chk('성공인데 body 없음 → FORMAT', readEnvelope('{"response":{"header":{"resultCode":"00"}}}').code, 'FORMAT');
chk('HTML → FORMAT', readEnvelope('<html>502</html>').code, 'FORMAT');
chk('빈 본문 → FORMAT', readEnvelope('').code, 'FORMAT');

const tv = trimVehicles([
  ...DJ,
  { ...DJ[0] },
  { nodeid: 'GRB8005986', nodenm: '여성정책개발원.동월마을', nodeord: 21, routenm: 48, routetp: '광역버스', vehicleno: '충남78자1022' },
  { gpslati: 37.60495, gpslong: 126.86839, nodeord: 18, routenm: 1000, routetp: '직행좌석버스', vehicleno: '경기73아1417' },
  { ...DJ[1], vehicleno: 'FAR1', gpslati: 30.0 },
  null,
]);
chk('문자열 좌표를 수로', tv.vehicles[1].lat, 36.365366);
chk('같은 번호판은 한 번', tv.vehicles.filter((v) => v.no === '대전75자9503').length, 1);
chk('좌표 없는 계룡형·상자 밖·null 은 버리고 센다', tv.dropped, 3);
chk('정류소명 없는 고양형 행은 node null 로 남는다', tv.vehicles.find((v) => v.no === '경기73아1417').node, null);
chk('차량 필드는 no·lat·lon·node·ord 뿐', Object.keys(tv.vehicles[0]).join(','), 'no,lat,lon,node,ord');
const ts = trimStops([
  { gpslati: 36.412582, gpslong: 127.29774, nodeid: 'DJB8002169', nodenm: '안산산성', nodeno: 43760, nodeord: 2, routeid: 'DJB30300036', updowncd: 1 },
  { gpslati: 36.41467, gpslong: '127.2985', nodeid: 'DJB8002170', nodenm: '안산동', nodeno: 43790, nodeord: 1, routeid: 'DJB30300036', updowncd: 0 },
  { gpslati: 35.127033, gpslong: 126.78461, nodeid: 'KJB327', nodenm: '도산동', nodeno: 5005, nodeord: 3, routeid: 'KJB10' },
  { nodeid: 'X', nodeord: 4 },
]);
chk('정류소는 순서대로', ts.stops.map((s) => s.ord).join(','), '1,2,3');
chk('updowncd 0·1 그대로, 없으면 null', ts.stops.map((s) => s.up).join(','), '0,1,');
chk('문자열 경도를 수로', ts.stops[0].lon, 127.2985);
chk('좌표 없는 정류소는 버림', ts.dropped, 1);

console.log('\n[캐시 키]');
const k1 = cacheKeys('https://scoutingapp.net/api/ktransportradar24-bus?city=25&route=DJB30300036&junk=1', 25, 'DJB30300036');
const k2 = cacheKeys('https://scoutingapp.net/api/ktransportradar24-bus?route=DJB30300036&city=25', 25, 'DJB30300036');
chk('위치 키', k1.fresh, 'https://scoutingapp.net/api/ktransportradar24-bus?v=1&kind=pos&city=25&route=DJB30300036');
chk('낡은 사본 키는 따로', k1.stale, 'https://scoutingapp.net/api/ktransportradar24-bus?v=1&kind=pos-stale&city=25&route=DJB30300036');
chk('정류소 키는 따로', k1.stops.includes('kind=stops'), true);
chk('덧붙인 쿼리·순서로 캐시를 비껴가지 못한다', k1.fresh === k2.fresh && k1.stale === k2.stale, true);
chk('도시가 다르면 키가 다르다', cacheKeys('https://x.net/', 34010, 'DJB30300036').fresh === cacheKeys('https://x.net/', 25, 'DJB30300036').fresh, false);

console.log('\n[일일 한도]');
chk('999 → 멈춤', budgetDecision(999).blocked, true);
chk(`${BUDGET_FLOOR} → 계속`, budgetDecision(BUDGET_FLOOR).blocked, false);
chk('모름(null) → 계속', budgetDecision(null).blocked, false);
chk('KV 키 모양', budgetKey('getRouteAcctoBusLcList', '20260915'), 'ktransportradar24:bus:remaining:getRouteAcctoBusLcList:20260915');
chk('KST 날짜 — UTC 15:00 은 다음날', kstDate(Date.UTC(2026, 8, 15, 15, 0, 0)), '20260916');
chk('KST 날짜 — UTC 14:59 는 그날', kstDate(Date.UTC(2026, 8, 15, 14, 59, 0)), '20260915');
chk('헤더 읽기', readRemainingHeader(new Headers({ 'X-RateLimit-Remaining': '9978' })), 9978);
chk('헤더 없음 → null', readRemainingHeader(new Headers()), null);
chk('헤더 이상 → null', readRemainingHeader(new Headers({ 'x-ratelimit-remaining': 'abc' })), null);
const empty = { min: null, storedMin: null, wroteAt: 0 };
chk('첫 값은 쓴다', planBudgetWrite(empty, 9000, T0).write, true);
chk('1분 안에 더 작아져도 안 쓴다', planBudgetWrite({ min: 9000, storedMin: 9000, wroteAt: T0 }, 8990, T0 + 30000).write, false);
chk('1분 지나 더 작아지면 쓴다', planBudgetWrite({ min: 9000, storedMin: 9000, wroteAt: T0 }, 8990, T0 + 60000).write, true);
chk('더 커진 값은 안 쓰고 최솟값을 지킨다', JSON.stringify(planBudgetWrite({ min: 8000, storedMin: 8000, wroteAt: T0 }, 9000, T0 + 120000)), JSON.stringify({ min: 8000, write: false }));
chk('1분 안이라도 한도 밑으로 막 내려가면 바로 쓴다', planBudgetWrite({ min: 1005, storedMin: 1005, wroteAt: T0 }, 999, T0 + 1000).write, true);
chk('이미 밑이면 1분 규칙대로', planBudgetWrite({ min: 900, storedMin: 900, wroteAt: T0 }, 899, T0 + 1000).write, false);

console.log('\n[낡은 사본]');
const good = { ok: true, city: 25, route: 'DJB30300036', basis: 'gps', receivedAt: T0, vehicles: [{ no: 'a', lat: 36, lon: 127, node: null, ord: 1 }] };
const fb = fallbackPayload(good, ['tago: 99'], T0 + 45000, '버스 위치를 받지 못했습니다');
chk('10분 안 성공본 → stale:true', fb.stale === true && fb.ok === true && fb.vehicles.length === 1, true);
chk('낡은 나이(초)', fb.staleAge, 45);
chk('오류 이유를 같이 싣는다', fb.errors[0], 'tago: 99');
chk('10분 넘은 사본은 안 쓴다', fallbackPayload(good, [], T0 + (TTL_STALE + 1) * 1000, 'x').ok, false);
chk('사본 없음 → ok:false 와 문장', fallbackPayload(null, ['e'], T0, BUDGET_ERROR).error, BUDGET_ERROR);
chk('실패본은 사본으로 안 쓴다', fallbackPayload({ ok: false, error: 'x', receivedAt: T0 }, [], T0, 'y').ok, false);

console.log('\n[키 다루기]');
const KEY = 'SECRETKEY0123%2Babc%2Fdef%3D%3D';
chk('인코딩본은 그대로', keyForQuery(KEY), KEY);
chk('원본은 한 번만 인코딩', keyForQuery('abc+def/ghi=='), 'abc%2Bdef%2Fghi%3D%3D');
chk('URL 에 키가 한 번 그대로(이중 인코딩 없음)', tagoUrl(OPS.positions, KEY, { cityCode: 25, routeId: 'GMB0-110' }), `https://apis.data.go.kr/1613000/BusLcInfoInqireService/getRouteAcctoBusLcList?serviceKey=${KEY}&_type=json&cityCode=25&routeId=GMB0-110`);
chk('redact 는 인코딩본·원본을 모두 지운다', redact(`a ${KEY} b ${decodeURIComponent(KEY)}`, KEY), 'a <KEY> b <KEY>');

console.log('\n[처리 흐름 — 흉내 캐시·KV·fetch]');
function world() {
  let now = T0;
  const store = new Map();
  const cache = {
    async match(k) {
      const e = store.get(String(k));
      if (!e || now >= e.expires) return undefined;
      return new Response(e.body, { status: e.status, headers: e.headers });
    },
    async put(k, res) {
      const cc = res.headers.get('cache-control') || '';
      const m = /max-age=(\d+)/.exec(cc);
      store.set(String(k), { body: await res.text(), status: res.status, headers: Object.fromEntries(res.headers), expires: now + (m ? Number(m[1]) : 0) * 1000 });
    },
  };
  const kv = new Map();
  const kvWrites = [];
  const SCOUT_KV = {
    async get(k, t) { const v = kv.get(k); return v === undefined ? null : t === 'json' ? JSON.parse(v) : v; },
    async put(k, v, o) { kv.set(k, v); kvWrites.push({ k, v, o }); },
  };
  const calls = [];
  let responder = () => ({ body: ok(DJ, 2), remaining: 9000 });
  const fetchImpl = async (url) => {
    calls.push(String(url));
    const r = responder(String(url));
    if (r.throw) throw new TypeError('fetch failed ' + url);
    return new Response(r.body, { status: r.status || 200, headers: r.remaining === undefined ? {} : { 'x-ratelimit-remaining': String(r.remaining) } });
  };
  const pending = [];
  const run = async (qs, env = { DATA_GO_KR_SERVICE_KEY: KEY, SCOUT_KV }) => {
    const res = await handleGet({ request: new Request('https://scoutingapp.net/api/ktransportradar24-bus?' + qs), env, waitUntil: (p) => pending.push(p) }, { cache, fetch: fetchImpl, now: () => now });
    await Promise.all(pending.splice(0));
    const text = await res.text();
    return { status: res.status, cc: res.headers.get('cache-control'), text, body: JSON.parse(text) };
  };
  return { run, calls, kv, kvWrites, store, SCOUT_KV, tick: (ms) => { now += ms; }, respond: (fn) => { responder = fn; } };
}

_resetBudgetMemo();
let w = world();
let r = await w.run('city=25&route=DJB30300036');
chk('성공 → ok', r.body.ok, true);
chk('basis gps', r.body.basis, 'gps');
chk('차량 2대', r.body.vehicles.length, 2);
chk('30초 캐시', r.cc, `public, max-age=${TTL_POS}`);
chk('원천 1회', w.calls.length, 1);
chk('URL 에 인코딩본 키가 그대로', w.calls[0].includes(`serviceKey=${KEY}&`) && !w.calls[0].includes('%252B'), true);
chk('KV 에 오늘 남은 한도 1회 기록', w.kvWrites.length === 1 && JSON.parse(w.kvWrites[0].v).min === 9000 && w.kvWrites[0].k.endsWith(':getRouteAcctoBusLcList:20260915'), true);
chk('KV 기록은 이틀 뒤 사라짐', w.kvWrites[0].o.expirationTtl, 172800);
r = await w.run('city=25&route=DJB30300036&junk=' + Math.random());
chk('30초 안 다시 → 캐시(원천 호출 그대로 1회)', w.calls.length, 1);
chk('낡은 사본 키도 채워짐', [...w.store.keys()].some((k) => k.includes('kind=pos-stale')), true);

w.tick(31000);
w.respond(() => ({ body: S99, remaining: 8999 }));
r = await w.run('city=25&route=DJB30300036');
chk('99 → 직전 성공본을 stale:true 로', r.body.stale === true && r.body.ok === true && r.body.vehicles.length === 2, true);
chk('99 이유를 싣는다', r.body.errors.some((e) => e.includes('99')), true);
chk('낡은 응답은 10초만', r.cc, `public, max-age=${TTL_FAIL}`);
const staleEntry = [...w.store.entries()].find(([k]) => k.includes('kind=pos-stale'))[1];
chk('99 는 낡은 사본 키에 들어가지 않는다', JSON.parse(staleEntry.body).ok === true && !staleEntry.body.includes('세션'), true);
chk('1분 안이라 KV 는 더 쓰지 않는다', w.kvWrites.length, 1);

w.tick(11000);
w.respond(() => ({ body: ok(DJ.slice(0, 1), 1), remaining: 8990 }));
r = await w.run('city=25&route=DJB30300036');
chk('10초 뒤 다시 성공 → 새 값', r.body.vehicles.length === 1 && !('stale' in r.body), true);

w.tick(60000);
w.respond(() => ({ body: ok(DJ, 2), remaining: 8000 }));
r = await w.run('city=25&route=DJB30300036');
chk('1분 지나면 KV 에 더 작은 값 기록', w.kvWrites.length === 2 && JSON.parse(w.kvWrites[1].v).min === 8000, true);

_resetBudgetMemo();
w = world();
w.kv.set(budgetKey('getRouteAcctoBusLcList', '20260915'), JSON.stringify({ min: 900, at: T0 }));
r = await w.run('city=31100&route=GGB219000013');
chk('한도 밑 → 원천을 부르지 않는다', w.calls.length, 0);
chk('한도 문장', r.body.error, BUDGET_ERROR);
chk('ok:false 이고 200', r.body.ok === false && r.status === 200, true);
chk('이유를 errors 에', r.body.errors.some((e) => e.includes('900')), true);

_resetBudgetMemo();
w = world();
r = await w.run('city=31100&route=GGB219000013');
chk('경기 basis stop', r.body.basis, 'stop');
_resetBudgetMemo();
w.kv.set(budgetKey('getRouteAcctoBusLcList', '20260915'), JSON.stringify({ min: 500, at: T0 }));
w.tick(31000);
r = await w.run('city=31100&route=GGB219000013');
chk('한도 밑이어도 사본이 있으면 stale:true 로 먼저 준다', r.body.stale === true && r.body.basis === 'stop' && w.calls.length === 1, true);
chk('그때도 한도 이유를 싣는다', r.body.errors.some((e) => e.startsWith('budget:')), true);

_resetBudgetMemo();
w = world();
r = await w.run('city=25&route=DJB30300036', {});
chk('키가 없으면 원천을 부르지 않고 ok:false', w.calls.length === 0 && r.body.ok === false && r.body.errors[0].startsWith('config:'), true);

_resetBudgetMemo();
w = world();
w.respond((url) => ({ body: ok([
  { gpslati: 36.412582, gpslong: 127.29774, nodeid: 'DJB8002169', nodenm: '안산산성', nodeord: 2, routeid: 'DJB30300036', updowncd: 0 },
  { gpslati: 36.41467, gpslong: 127.2985, nodeid: 'DJB8002170', nodenm: '안산동', nodeord: 1, routeid: 'DJB30300036', updowncd: 0 },
], 2), remaining: 9500 }));
r = await w.run('city=25&route=DJB30300036&stops=1');
chk('정류소 → 순서대로', r.body.stops.map((s) => s.ord).join(','), '1,2');
chk('정류소 7일 캐시', r.cc, `public, max-age=${TTL_STOPS}`);
chk('정류소 오퍼레이션을 부른다', w.calls[0].includes('/BusRouteInfoInqireService/getRouteAcctoThrghSttnList?'), true);
chk('정류소 한도는 따로 기록', w.kvWrites[0].k.includes(':getRouteAcctoThrghSttnList:'), true);
r = await w.run('city=25&route=DJB30300036&stops=1');
chk('정류소 다시 → 캐시', w.calls.length, 1);

console.log('\n[키가 새지 않는다]');
_resetBudgetMemo();
w = world();
w.respond(() => ({ throw: true }));
r = await w.run('city=25&route=DJB30300036');
chk('fetch 오류(원문에 URL) → 응답에 키 없음', r.text.includes('SECRETKEY') || r.text.includes('serviceKey'), false);
chk('네트워크 오류 이름만', r.body.errors.join('|'), 'tago: NETWORK TypeError');
w.tick(20000);
w.respond(() => ({ body: `{"response":{"header":{"resultCode":"31","resultMsg":"echo ${KEY}"}}}`, remaining: 9000 }));
r = await w.run('city=25&route=DJB30300036');
chk('원천이 키를 되돌려도 응답에서 지운다', r.text.includes('SECRETKEY'), false);
w.tick(20000);
w.respond(() => ({ body: '{"OpenAPI_ServiceResponse":{"cmmMsgHeader":{"returnAuthMsg":"등록되지 않은 서비스키","returnReasonCode":"30"}}}', status: 403 }));
_resetBudgetMemo();
r = await w.run('city=25&route=DJB30300036');
chk('403 본문의 게이트웨이 30 을 읽는다', r.body.errors.some((e) => e.includes('30 인증키 미등록')), true);
chk('모든 응답 어디에도 키가 없다', [...w.store.values()].some((e) => e.body.includes('SECRETKEY')), false);
chk('400 입력 오류에도 키 없음', (await w.run('city=abc')).text.includes('SECRETKEY'), false);

const fail = R.filter((p) => !p).length;
console.log(`\n${R.length - fail}/${R.length} PASS`);
process.exit(fail ? 1 : 0);
