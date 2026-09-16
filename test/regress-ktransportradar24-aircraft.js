/* ktransportradar24 항공기 중계 회귀 — 순수함수 단위 테스트(브라우저·네트워크 불필요).
 * 실행: node test/regress-ktransportradar24-aircraft.js
 * 비공개 요청 기체(LADD·PIA)는 중계에서 버려야 한다 — 브라우저로 보내고 숨기면 응답에 남는다.
 * 키가 필요한 원천은 쓰지 않는다(2026-09-15) — 맥미니 수집기가 키 없는 원천을 받아 수집 토큰으로 올린다. */
import * as relay from '../functions/api/ktransportradar24-aircraft.js';
import * as legacy from '../functions/api/ktrainrader24-aircraft.js';

const { trimAircraft, tokenMatches, ingestBody, freshness, BOUNDS, SOURCES, FRESH_SEC, KV_KEY } = relay;
const R = [];
const chk = (n, got, exp) => { const p = got === exp; R.push(p); console.log((p ? '  PASS ' : '  FAIL ') + n + ' — ' + got); };

const base = { hex: '71c123', flight: 'KAL123  ', t: 'B77W', r: 'HL7782', lat: 37.5, lon: 126.9, alt_baro: 35000, gs: 480, track: 90, seen_pos: 2, dbFlags: 0 };
const out = trimAircraft({
  now: 1789366492000,
  ac: [
    base,
    { ...base, hex: 'ladd01', dbFlags: 8 },
    { ...base, hex: 'pia001', dbFlags: 4 },
    { ...base, hex: 'mil001', dbFlags: 1 },
    { ...base, hex: 'grd001', alt_baro: 'ground' },
    { ...base, hex: 'old001', seen_pos: 61 },
    { ...base, hex: 'far001', lat: 30.0 },
    { ...base, hex: 'nopos1', lat: undefined },
    null,
  ],
});

console.log('[비공개·지상·낡음·범위 밖 제외]');
chk('남는 기체 = 정상 1 + 군용 표시 1', out.aircraft.map((a) => a.hex).join(','), '71c123,mil001');
chk('LADD·PIA 는 버리고 숫자만 센다', out.hidden, 2);
chk('count 는 실제 담긴 수', out.count, 2);
chk('LADD 기체 id 가 응답 어디에도 없다', JSON.stringify(out).includes('ladd01') || JSON.stringify(out).includes('pia001'), false);

console.log('\n[필드 정리]');
chk('편명 공백 제거', out.aircraft[0].flight, 'KAL123');
chk('원본 이름(t·r) → type·reg', out.aircraft[0].type + '/' + out.aircraft[0].reg, 'B77W/HL7782');
chk('필요 없는 원본 필드는 안 보낸다', 'dbFlags' in out.aircraft[0] || 'squawk' in out.aircraft[0], false);
chk('now 는 밀리초 그대로', out.now, 1789366492000);
chk('now 가 초로 오면 밀리초로', trimAircraft({ now: 1789366492, ac: [] }).now, 1789366492000);
chk('모양이 깨지면 빈 목록(던지지 않음)', trimAircraft({ ac: 'x' }).count + trimAircraft(null).count, 0);
chk('상자는 지도 KOREA_BOUNDS 와 같다', [BOUNDS.latMin, BOUNDS.latMax, BOUNDS.lonMin, BOUNDS.lonMax].join(','), '32,39.6,123.5,132');

console.log('\n[기종 이름·경로 (v0.9.319)]');
const kr = { codes: ['GMP', 'CJU'], countries: ['KR', 'KR'], names: ['Seoul', 'Jeju'] };
const enriched = trimAircraft({ now: 1789366492000, ac: [
  { ...base, desc: 'BOEING 777-300ER', route: kr },
  { ...base, hex: 'bad001', route: { codes: ['GMP'], countries: ['KR'], names: ['Seoul'] } },
  { ...base, hex: 'bad002', route: { codes: ['GMP', '<b>'], countries: ['KR', 'KR'], names: ['a', 'b'] } },
  { ...base, hex: 'bad003', route: { codes: ['GMP', 'CJU'], countries: ['KR'], names: ['a', 'b'] } },
] });
chk('기종 이름을 넘긴다', enriched.aircraft[0].desc, 'BOEING 777-300ER');
chk('검증된 경로를 넘긴다', JSON.stringify(enriched.aircraft[0].route), JSON.stringify(kr));
chk('공항 하나짜리 경로는 버린다', 'route' in enriched.aircraft[1], false);
chk('코드 모양이 틀린 경로는 버린다', 'route' in enriched.aircraft[2], false);
chk('길이가 안 맞는 경로는 버린다', 'route' in enriched.aircraft[3], false);
chk('경로가 없어도 기체는 남는다', enriched.count, 4);
chk('도시 이름은 40자로 자른다', relay.cleanRoute({ codes: ['ICN', 'LAX'], countries: ['KR', 'US'], names: ['x'.repeat(99), 'LA'] }).names[0].length, 40);
chk('adsb.fi 형식(aircraft 키)도 같은 결과', trimAircraft({ now: 1789366492000, aircraft: [base] }).count, 1);

console.log('\n[키 없는 무료 원천만]');
chk('원천은 adsb.lol · adsb.fi 뿐', SOURCES.map((s) => s.name).join(','), 'adsb.lol,adsb.fi');
chk('원천 주소에 키·토큰이 없다', SOURCES.some((s) => /key|token|opensky/i.test(s.url)), false);
chk('OpenSky 변환기가 사라졌다', 'fromOpenSky' in relay, false);
chk('예전 주소는 같은 GET 을 그대로 준다(열려 있던 옛 화면)', legacy.onRequestGet === relay.onRequestGet, true);
chk('예전 주소로는 올릴 수 없다', 'onRequestPost' in legacy, false);

console.log('\n[수집 토큰]');
const secret = 'a'.repeat(64);
chk('맞는 토큰', tokenMatches('Bearer ' + secret, secret), true);
chk('틀린 토큰', tokenMatches('Bearer ' + 'b'.repeat(64), secret), false);
chk('길이만 다른 토큰', tokenMatches('Bearer ' + secret + 'a', secret), false);
chk('Bearer 없이', tokenMatches(secret, secret), false);
chk('헤더 없음', tokenMatches(null, secret), false);
chk('서버에 토큰 설정이 없으면 아무도 못 올린다', tokenMatches('Bearer undefined', undefined) || tokenMatches('Bearer ', ''), false);
chk('짧은 토큰 설정은 거절(설정 실수 방지)', tokenMatches('Bearer abc', 'abc'), false);

console.log('\n[올린 몸통 → 저장본]');
const now = 1789366500000;
const stored = ingestBody({ source: 'adsb.lol', now: 1789366492000, ac: [base, { ...base, hex: 'ladd01', dbFlags: 8 }] }, now);
chk('LADD 는 저장본에도 없다', JSON.stringify(stored).includes('ladd01'), false);
chk('받은 시각은 서버 시계', stored.receivedAt, now);
chk('원천 이름 보존', stored.source, 'adsb.lol');
chk('이상한 원천 이름은 unknown', ingestBody({ source: '<script>', ac: [] }, now).source, 'unknown');
chk('미래 시각은 믿지 않는다', ingestBody({ source: 'adsb.lol', now: now + 3600000, ac: [] }, now).now, now);
chk('ac 목록이 없으면 null', ingestBody({ source: 'adsb.lol' }, now), null);
chk('KV 키 이름', KV_KEY, 'ktransportradar24:aircraft:v1');

console.log('\n[저장본 신선도 — 수집기가 멎었는지]');
chk('방금 받은 것은 쓴다', freshness(stored, now + 10000).fresh, true);
chk(`${FRESH_SEC}초까지는 쓴다`, freshness(stored, now + FRESH_SEC * 1000).fresh, true);
chk('그보다 낡으면 안 쓴다', freshness(stored, now + (FRESH_SEC + 1) * 1000).fresh, false);
chk('나이를 초로 말한다', freshness(stored, now + 125000).age, 125);
chk('저장본 없음 → 나이 null', freshness(null, now).age, null);
chk('모양이 깨진 저장본은 안 쓴다', freshness({ receivedAt: now, aircraft: 'x' }, now).fresh, false);

console.log('\n[공항 좌표 — 남은 길 (v0.9.322)]');
const withCoords = relay.cleanRoute({ ...kr, coords: [37.558311, 126.790611, 33.51113, 126.49306] });
chk('공항 좌표를 소수 셋째 자리로 넘긴다', JSON.stringify(withCoords.coords), '[37.558,126.791,33.511,126.493]');
chk('좌표 길이가 공항 수와 안 맞으면 좌표만 뺀다', 'coords' in relay.cleanRoute({ ...kr, coords: [37.5, 126.8] }), false);
chk('좌표 범위 밖이면 좌표만 뺀다(경로는 남는다)', JSON.stringify(relay.cleanRoute({ ...kr, coords: [37.5, 126.8, 95, 126] })), JSON.stringify(kr));
chk('좌표에 문자열이 섞이면 좌표만 뺀다', 'coords' in relay.cleanRoute({ ...kr, coords: [37.5, '126.8', 33.5, 126.4] }), false);

console.log('\n[항적 (v0.9.322) — 비공개 기체 항적이 새지 않는다]');
const { cleanTrails, trailBody, TRAILS_KV_KEY, TRAIL_MAX_POINTS, TRAIL_FRESH_SEC, HEX } = relay;
const kept = trimAircraft({ now, ac: [base, { ...base, hex: 'ladd01', dbFlags: 8 }, { ...base, hex: 'grd001', alt_baro: 'ground' }] }).aircraft;
const trails = cleanTrails({
  '71C123': [37.11111, 126.22222, 37.2, 126.3, 'x', 1, 37.3, 126.4],
  ladd01: [37.1, 126.2, 37.2, 126.3],
  grd001: [37.1, 126.2, 37.2, 126.3],
  zzz999: [37.1, 126.2, 37.2, 126.3],
}, kept);
chk('정리된 목록에 남은 기체 항적만 싣는다', Object.keys(trails).join(','), '71c123');
chk('LADD 항적은 저장본에 없다', JSON.stringify(trails).includes('ladd01'), false);
chk('점은 소수 셋째 자리, 대문자 hex 는 소문자로', JSON.stringify(trails['71c123'].slice(0, 2)), '[37.111,126.222]');
// 2026-09-16: 수집기가 [lat,lon,alt] 셋씩 올린다. 옛 둘씩도 계속 받아야 재설치 전에 항적이 비지 않는다.
const trails3 = cleanTrails({ '71C123': [37.1111, 126.2222, 33000, 37.2, 126.3, 34000] }, [{ hex: '71c123' }], 3);
chk('셋씩 올리면 고도까지 싣는다', JSON.stringify(trails3['71c123']), '[37.111,126.222,33000,37.2,126.3,34000]');
const trailsNoAlt = cleanTrails({ '71C123': [37.1111, 126.2222, -1, 37.2, 126.3, -1] }, [{ hex: '71c123' }], 3);
chk('고도를 모르는 점은 -1 로 남는다', JSON.stringify(trailsNoAlt['71c123']), '[37.111,126.222,-1,37.2,126.3,-1]');
chk('모양이 틀린 점은 그 점만 버린다', trails['71c123'].length, 6);
const long = Array.from({ length: (TRAIL_MAX_POINTS + 30) * 2 }, (_, i) => (i % 2 ? 126 + i / 1e4 : 37 + i / 1e4));
chk(`기체마다 최근 ${TRAIL_MAX_POINTS}점까지(오래된 점부터 버린다)`, cleanTrails({ '71c123': long }, kept)['71c123'].length, TRAIL_MAX_POINTS * 2);
chk('최근 점이 남는다', cleanTrails({ '71c123': long }, kept)['71c123'].at(-1), Math.round(long.at(-1) * 1e3) / 1e3);
chk('점 하나뿐인 항적은 싣지 않는다', 'x' in cleanTrails({ '71c123': [37, 126] }, kept) || Object.keys(cleanTrails({ '71c123': [37, 126] }, kept)).length, 0);
chk('항적 모양이 아니면 null', cleanTrails([1, 2], kept), null);
chk('항적 KV 키는 목록과 따로', TRAILS_KV_KEY !== KV_KEY && TRAILS_KV_KEY, 'ktransportradar24:aircraft-trails:v1');
chk('hex 모양 — 비ICAO ~ 허용', HEX.test('~abc12') && HEX.test('71c123') && !HEX.test('71c12') && !HEX.test('../../x'), true);
const tStored = { receivedAt: now, trails };
chk('?trail= 저장본에 있으면 준다', trailBody(tStored, '71c123', now + 5000).path.length, 6);
chk('없는 기체는 ok:false', trailBody(tStored, 'abcdef', now).ok, false);
chk(`${TRAIL_FRESH_SEC}초 넘게 낡은 항적은 안 준다(지금 기체에 옛 선을 잇지 않는다)`, trailBody(tStored, '71c123', now + (TRAIL_FRESH_SEC + 1) * 1000).ok, false);
chk('모양이 틀린 hex 는 ok:false', trailBody(tStored, '<script>', now).ok, false);
chk('저장본이 없으면 ok:false', trailBody(null, '71c123', now).ok, false);

const fail = R.filter((p) => !p).length;
console.log(`\n${R.length - fail}/${R.length} PASS`);
process.exit(fail ? 1 : 0);
