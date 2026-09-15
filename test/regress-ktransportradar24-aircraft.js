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

const fail = R.filter((p) => !p).length;
console.log(`\n${R.length - fail}/${R.length} PASS`);
process.exit(fail ? 1 : 0);
