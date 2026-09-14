/* ktrainrader24 항공기 중계 회귀 — 순수함수 단위 테스트(브라우저·네트워크 불필요).
 * 실행: node test/regress-ktrainrader24-aircraft.js
 * 비공개 요청 기체(LADD·PIA)는 중계에서 버려야 한다 — 브라우저로 보내고 숨기면 응답에 남는다. */
import { trimAircraft, fromOpenSky, BOUNDS } from '../functions/api/ktrainrader24-aircraft.js';

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
// adsb.fi 는 목록 키가 `aircraft` 다. 엣지에서 adsb.lol 이 막힐 때 이쪽으로 넘어간다(2026-09-14 실측).
chk('adsb.fi 형식(aircraft 키)도 같은 결과', trimAircraft({ now: 1789366492000, aircraft: [base] }).count, 1);

/* OpenSky 는 열 배열로 준다. 단위(m·m/s)를 readsb 단위(ft·kt)로 바꿔야 화면의 환산(ft→m, kt→km/h)이 맞는다. */
console.log('\n[OpenSky 열 배열 → readsb 모양]');
const os = fromOpenSky({ time: 1789366492, states: [
  ['71c123', 'KAL123 ', 'Republic of Korea', 1789366480, 1789366490, 126.9, 37.5, 10668, false, 246.9, 90.0, 0, null, 10800, null, false, 0],
  ['ground1', 'GND', 'x', 1789366490, 1789366490, 126.8, 37.4, null, true, 5, 10, 0, null, null, null, false, 0],
  ['nopos', 'X', 'x', null, null, null, null, null, false, null, null, null, null, null, null, false, 0],
]});
const t = trimAircraft(os);
chk('위치 있는 기체만, 지상 기체 제외', t.aircraft.map((a) => a.hex).join(','), '71c123');
chk('고도 m → ft (10,668m ≈ 35,000ft)', Math.round(t.aircraft[0].alt), 35000);
chk('속도 m/s → kt (246.9 ≈ 480kt)', Math.round(t.aircraft[0].gs), 480);
chk('위치 나이 = time − time_position', t.aircraft[0].seen, 12);
chk('now 는 밀리초', t.now, 1789366492000);
chk('기종·등록번호는 없다(빈 문자열)', t.aircraft[0].type + '|' + t.aircraft[0].reg, '|');
chk('states 가 없으면 빈 목록', trimAircraft(fromOpenSky({})).count, 0);

const fail = R.filter((p) => !p).length;
console.log(`\n${R.length - fail}/${R.length} PASS`);
process.exit(fail ? 1 : 0);
