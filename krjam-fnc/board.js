/* 급식편의본부 운영 안내 보드 (v0.9.253)
 *
 * 31쪽짜리 OT 자료를 "넘겨 보는 PDF" 에서 "현장에서 찾아 쓰는 화면"으로 바꿨다.
 * 내용은 원본 자료에서 그대로 옮겼고, 각 섹션에는 원문 몇 쪽인지 링크를 달아 두었다
 * (플립북은 /krjam-fnc-book 에 그대로 살아 있다 — 자료 원본을 확인해야 할 때가 반드시 온다).
 *
 * ⚠️ 식사 메뉴는 이 파일에 적지 않는다. 홍보부 운영보드(/krjam-planning)가 쓰는 것과
 *    **같은 KV(jp:meals)** 를 /api/jp-meals 로 읽는다. 두 곳에 메뉴를 따로 적으면 반드시 어긋난다.
 * ⚠️ 빌드 단계 없음(프로젝트 규칙) — 바닐라 JS 한 파일.
 */
(function () {
  'use strict';

  var VER = '0.9.253';
  var LS_CK = 'krjam-fnc:check';
  var BOOK = '/krjam-fnc-book';

  /* ── 원본 자료 (PDF 31쪽에서 옮김) ───────────────────────────── */
  var EVENT = {
    inDate: '2026-08-03T14:00:00+09:00',
    openDate: '2026-08-05T20:00:00+09:00',
    outDate: '2026-08-09T11:00:00+09:00',
  };

  var ORG = {
    head: '심호웅',
    depts: [
      { name: '급식편의지원부', chief: '유학준',
        teams: [{ name: '급식편의지원팀', lead: '', members: ['임지민'] }] },
      { name: '식자재보급운영부', chief: '김은철',
        teams: [{ name: '식자재보급운영팀', lead: '주명림',
          members: ['장문수', '임운택', '이홍우', '박성민', '박미화', '정명빈', '한상규'] }] },
      { name: '잼버리식당운영부', chief: '안재용',
        teams: [{ name: '잼버리식당운영팀', lead: '이훈혁',
          members: ['김경구', '김만수', '김소은', '김영찬', '백종명', '변주환', '이상열', '이성혁', '이병숙', '황보은별', '안정효', '변희중'] }] },
      { name: '편의시설운영부', chief: '김영희',
        teams: [{ name: '급식편의운영팀', lead: '전은경', members: ['충원예정'] },
                { name: '급식시설운영팀', lead: '조대중', members: ['김시람', '아이린(Irene)', '리사(Risa)'] }] },
    ],
  };

  // 잼버리식당 식사 시간(운영요원·컵스카우트 참관단 기준) — '지금 운영 중'을 여기서 계산한다
  var MEAL_TIMES = [
    { key: 'b', name: '조식', from: '07:00', to: '09:00', who: '잼버리 식당 배식 · 8/6 이후 운영요원은 간편식 동시 수령' },
    { key: 'l', name: '중식', from: '12:00', to: '14:00', who: '8/6 이후 컵스카우트 참관단만 · 운영요원은 간편식(조식 때 픽업)' },
    { key: 'd', name: '석식', from: '17:00', to: '20:00', who: '잼버리 식당 배식' },
  ];
  var SUPPLY_TIMES = [
    { name: '조식·중식 식자재', from: '06:00', to: '07:00' },
    { name: '석식 식자재', from: '16:00', to: '17:00' },
  ];

  var CHECKS = [
    { g: '사전 준비', items: ['Safe from Harm 온라인 교육 이수', '소속 본부 · 담당 업무 확인', '개인 준비물 · 복장 준비',
                             '개인 텐트 · 침낭 · 세면도구 준비', '랜턴 · 보조배터리 준비 (숙영지에 전기 없음)'] },
    { g: '입영일 (8/3)', items: ['8/3 14:00 입영', '이동방법 최종 확인 (개별 / 단체버스 13:00)', 'Safe from Harm 이수 확인',
                                 '본부별 지급품 수령 (JHQ-FnC)'] },
    { g: '근무 중', items: ['08:30~22:00 기본 근무', 'ID 착용 및 연락 가능 상태 유지', '위험상황 즉시 보고', '식권 지참 (미지참 시 식당 입장 불가)'] },
    { g: '퇴영일 (8/9)', items: ['8/8~9 뒷정리 참여', '대여물품 반납 확인', '담당 구역 정리 · 개인 짐 확인', '퇴영 안내에 따라 이동'] },
  ];

  var SCHEDULE = [
    { d: '2026-08-03', label: '8/3 (월)', items: ['입영 14:00', '본부 세팅', '잼버리 식당 준비 · 운영 시작 (JPT·IST·CMT)', '1차 시범운영', 'F&C Div 현장 OT 19:00'] },
    { d: '2026-08-04', label: '8/4 (화)', items: ['잼버리식당 2차 시범운영 (조식)', '북카페 세팅', '식자재보급소 간편식 장소 세팅', '전체회의', '편의시설 구축(CU·이디야커피) 및 운영 시작'] },
    { d: '2026-08-05', label: '8/5 (수)', items: ['컵스카우트 1기 입영', '북카페 시범 운영', '편의시설 시범 운영', '식자재보급 시뮬레이션 (석식 제공 준비)', '잼버리식당 정식운영', '개영식 참석'] },
    { d: '2026-08-06', label: '8/6 (목)', items: ['식자재 보급 정식 운영 (지원 필요)', '잼버리식당 간편식 장소 세팅 및 관리', '북카페 정식 오픈', 'K-pop 콘서트 이슈 대비'] },
    { d: '2026-08-07', label: '8/7 (금)', items: ['컵스카우트 1기 퇴영 (간편식)', '컵스카우트 2기 입영 (잼버리식당)', 'Big Dinner'] },
    { d: '2026-08-08', label: '8/8 (토)', items: ['오전 정상 운영', '북카페 정리', '폐영식 이슈 대비', '편의시설 정리'] },
    { d: '2026-08-09', label: '8/9 (일)', items: ['컵스카우트 2기 퇴영 (간편식)', '식자재 보급 후 정리', '잼버리 식당 조식 제공 후 정리', '본부 정리', '퇴영 11:00'] },
  ];

  /* 담당 배정 대상 — 서버 화이트리스트(functions/api/jp-fnc.js DUTY_KEYS)와 같은 키를 쓴다.
     ⚠️ 키를 바꾸면 서버도 같이 바꿔야 한다. 안 그러면 저장은 되는 듯 보이고 값만 사라진다. */
  var DUTIES = [
    ['supply',   '식자재 보급소',        '유닛 단위 보급 · 반납 확인 · 재고'],
    ['hall1',    '1식당 (본 식당)',      '최대 200명 · 배식 · 질서'],
    ['hall2',    '2식당 (세미나 2)',     '패스트트랙 · 운영요원 특별식'],
    ['hall3',    '3식당 (세미나 1)',     '중식 보급 및 보관'],
    ['bookcafe', '북카페 (IST라운지)',   '09:00~21:00 · 식사시간 전후 1시간 중단'],
    ['cu',       '편의점 (CU)',          '09:00~21:00 · 브레이크 타임 협의'],
    ['coffee',   '이디야 커피차',        '09:00~21:00'],
    ['lounge',   '소모임 (미니 라운지)', '8/4·6·7 18:00~19:30 / 19:30~21:00'],
    ['inout',    '입 · 퇴영 지원',       '명단 · SfH 이수 확인 · 지급품'],
    ['safety',   '상황 보고 · 안전',     '비상 연락 · 식중독 대응 · 상황실 신고'],
  ];
  var duties = null, dutyMeta = { updatedAt: null, by: '' }, dutyEdit = false;

  /* 배정은 홍보부 보드 세션이 있으면 할 수 있다 — 같은 도메인이라 그 세션을 그대로 쓴다.
     (로그인 화면을 하나 더 만들면 비밀번호가 하나 더 생긴다.) */
  function session() {
    try {
      var s = JSON.parse(localStorage.getItem('jamboree-plan:session') || 'null');
      if (s && s.token && s.exp && s.exp > Date.now()) return s;
    } catch (e) {}
    return null;
  }
  function canAssign() { return !!session(); }
  function authHeader() { var s = session(); return s ? { Authorization: 'Bearer ' + s.token } : {}; }

  /* ── 화면 정의 ─────────────────────────────────────────────── */
  // short: 모바일 하단 탭 라벨. 긴 이름은 두 줄로 접혀 탭이 흔들린다.
  var VIEWS = [
    { id: 'home',    ic: '◎', label: '대시보드',  short: '홈',     grp: '' },
    { id: 'org',     ic: '▣', label: '본부 · 조직', short: '조직',   grp: '본부' },
    { id: 'food',    ic: '🍽', label: '급식 운영',  short: '급식',   grp: '본부' },
    { id: 'menu',    ic: '☰', label: '식사 메뉴',  short: '메뉴',   grp: '본부' },
    { id: 'fac',     ic: '☕', label: '편의시설',   short: '편의',   grp: '본부' },
    { id: 'inout',   ic: '⇄', label: '입영 · 퇴영', short: '입퇴영', grp: '운영요원' },
    { id: 'ist',     ic: '✓', label: '운영요원 안내', short: '요원',   grp: '운영요원' },
    { id: 'duty',    ic: '👤', label: '담당 배정',   short: '담당',   grp: '운영요원' },
    { id: 'sched',   ic: '▤', label: '업무 일정',   short: '일정',   grp: '운영요원' },
    { id: 'book',    ic: '📖', label: '자료 원문',   short: '원문',   grp: '자료' },
  ];
  var TABS = ['home', 'food', 'menu', 'duty', 'ist'];

  /* ── 유틸 ──────────────────────────────────────────────────── */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function srcLink(p, label) {
    return '<a class="src" href="' + BOOK + '#p' + p + '" target="_blank" rel="noopener">원문 ' + (label || (p + '쪽')) + ' →</a>';
  }
  var toastT = null;
  function toast(msg) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function minutesOf(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function nowMinutes(d) { return d.getHours() * 60 + d.getMinutes(); }

  /* ── 섹션 렌더러 ───────────────────────────────────────────── */
  function viewHome() {
    return '' +
      '<div class="hero" id="hero"></div>' +
      '<section class="sec">' +
        '<h2 class="sec-h">지금 식사 운영' + srcLink(12) + '</h2>' +
        '<div class="card" id="mealnow"></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">오늘 본부 일정</h2>' +
        '<div class="card" id="todaybox"></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">먼저 확인할 것</h2>' +
        '<div class="grid g3">' +
          '<div class="card"><h3>입영</h3><p><b>8/3(월) 14:00</b> · 도착 후 <b>Safe from Harm 이수 확인 → 소속 본부 확인 → 지급품 수령</b>.</p>' +
            '<p class="muted">지급품은 소속 본부에서 배부합니다. 도착하면 <b>JHQ-FnC</b> 로 오세요.</p>' +
            '<button class="btn sm" data-go="inout">입영 안내 보기</button></div>' +
          '<div class="card"><h3>식권</h3><p><span class="hi">식권 미지참 시 식당 입장 불가</span>입니다. 패스트트랙은 운영요원 식권과 <b>함께</b> 제출하고, <b>식사 시작 후 30분간만</b> 운영합니다.</p>' +
            '<button class="btn sm" data-go="food">식권 4종 보기</button></div>' +
          '<div class="card"><h3>숙박</h3><p>2인 1텐트. <span class="hi">숙영지에 전기 시설이 없습니다</span> — 개인 랜턴·보조배터리는 필수입니다. 개인 텐트 지참을 권장합니다.</p>' +
            '<button class="btn sm" data-go="ist">운영요원 안내 보기</button></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">행사 개요' + srcLink(3) + '</h2>' +
        '<div class="card">' +
          '<dl class="dl">' +
            '<dt>기간</dt><dd>2026년 8월 5일(수) ~ 9일(일) 4박5일 · <b>IST 8월 3일(월) ~ 9일(일)</b></dd>' +
            '<dt>컵스카우트 참관단</dt><dd>1기 8월 5일(수)~7일(금) · 2기 8월 7일(금)~9일(일)</dd>' +
            '<dt>주제</dt><dd>평화를 잇다, 지구를 살리다, 미래를 개척하다 <span class="muted">Peace and Planet, Ready for Future</span></dd>' +
            '<dt>본부 위치</dt><dd>급식편의본부 <b>JHQ-F&amp;C</b> (IST라운지·북카페 · 커피차 · 편의점) · 잼버리 식당 <b>D동 1층</b></dd>' +
          '</dl>' +
        '</div>' +
      '</section>';
  }

  function viewOrg() {
    var rows = ORG.depts.map(function (d) {
      var teams = d.teams.map(function (t) {
        var mem = t.members && t.members.length ? '<div class="mem">' + t.members.map(esc).join(' · ') + '</div>' : '';
        return '<div class="team"><b>' + esc(t.name) + '</b>' + (t.lead ? ' <span class="who">팀장 ' + esc(t.lead) + '</span>' : '') + mem + '</div>';
      }).join('');
      return '<div class="orgbox"><b>' + esc(d.name) + '</b><span class="who">부장 ' + esc(d.chief) + '</span>' + teams + '</div>';
    }).join('');
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">조직도' + srcLink(5) + '</h2>' +
        '<div class="card"><div class="org">' +
          '<div class="head">본부장 ' + esc(ORG.head) + '</div>' +
          '<div class="row">' + rows + '</div>' +
        '</div></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">본부 운영 개요' + srcLink(6) + '</h2>' +
        '<div class="grid g3">' +
          '<div class="card"><h3>참가자 식자재박스 보급</h3><p>유닛(패트롤) 단위 수령 — <span class="hi">대표자 4인 이상</span>이 식자재박스 보관소를 직접 방문해 받습니다.</p></div>' +
          '<div class="card"><h3>잼버리 식당 운영</h3><p><span class="hi">시간 분리 운영</span> — 각 본부 및 컵스카우트 참관단이 지정된 시간에 식사합니다.</p><p class="muted">패스트트랙: 긴급 임무 수행 운영요원을 위한 신속 배식 체계.</p></div>' +
          '<div class="card"><h3>편의시설 · 북카페</h3><p>편의운영: 운영요원 관리, 잼버리 북카페 운영.</p><p>편의시설: 편의점(CU), 이디야커피차, <span class="hi">휴대폰 충전소 관리</span>.</p></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">부서별 업무' + srcLink(8) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>급식편의지원부</h3>' +
            '<h4>운영요원 지원</h4><ul><li>입·퇴영 절차</li><li>IST 사전 교육 안내</li></ul>' +
            '<h4>본부 체계 구축</h4><ul><li>JHQ-F&amp;C 업무 지원</li><li>편의운영팀과 업무 협업</li><li>각종 회의 및 행정 업무 지원</li></ul>' +
            '<h4>위기사항</h4><ul><li>비상상황 대응 지원 체계 구축 및 상황 보고</li><li>위기상황 관리 지원 및 상황 공유 체계 운영</li></ul>' +
            '<p class="muted">식자재보급소 · 잼버리 식당 · 편의시설운영부 관리 운영 지원</p></div>' +
          '<div class="card"><h3>편의시설운영부</h3>' +
            '<h4>급식편의운영</h4><ul><li>부서별 운영요원 배정 · 교육 · 소통</li><li>부서별 요청 시 운영요원 지원</li><li>단체 카톡방 관리</li><li>위기사항 대비 보고체계 · <b>식중독 발생 시 대응</b></li></ul>' +
            '<h4>급식시설운영</h4><ul><li>식자재 보급소 · 잼버리 식당 시설 관리 지원</li><li>편의점 · 커피차 · 북카페 관리</li></ul>' +
            '<h4>팀 체계' + '</h4><ul><li>IST 개인 역량을 고려해 업무 배정</li><li>배려와 소통으로 효율적 활동을 중재</li><li>IST 관리(비상연락망 포함) · 부서 간 업무 조정 · 급식 편의 민원 접수와 결과 확인</li></ul></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">IST 운영 관리 · 식음료 안전대책' + srcLink(18) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>IST 운영 관리 계획</h3><ul>' +
            '<li>급식편의본부 운영요원 총괄 운영 관리</li><li><b>입퇴영 관리 및 지급품 지급·관리</b></li>' +
            '<li>운영요원 리스트 관리</li><li>사전 교육 및 오리엔테이션</li><li>부별 IST 소통 채널 관리</li><li>상황 보고 및 기록 관리</li></ul></div>' +
          '<div class="card"><h3>식음료 안전대책</h3><ul>' +
            '<li>식중독 예방을 위해 <b>개인 컵 또는 텀블러</b> 사용</li>' +
            '<li>식품 알레르기 유발 성분 상세 표기</li>' +
            '<li>식중독 · 노로바이러스 예방 지도 · 교육 · 홍보</li>' +
            '<li>조리종사자 위생교육 실시</li>' +
            '<li>검수 · 조리 · 배식 전 과정 위생관리 철저</li></ul></div>' +
        '</div>' +
      '</section>';
  }

  function viewFood() {
    var tickets = [
      ['운영요원', '운영요원 대상 식권 (Meal Card)'],
      ['패스트 트랙', '운영요원 식권 지참 / 동시 제출 · 긴급 임무 수행자가 대기 없이 식사 · <b>식사 운영 시작 후 30분간만</b>'],
      ['컵스카우트 참관단', '참관단 및 인솔지도자 대상 · 효율적 운영을 위해 <b>식당 이용 대장</b>으로 대체'],
      ['일반식권', '지원 인력 등이 필요에 따라 사전 구매하는 범용 식권'],
    ].map(function (t) { return '<tr><th>' + t[0] + '</th><td>' + t[1] + '</td></tr>'; }).join('');

    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">참가자 식자재 보급 <span class="chip info">1개소 11식</span>' + srcLink(9) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>대상 · 기간</h3><dl class="dl">' +
            '<dt>기간</dt><dd>8. 5.(수) 석식 ~ 8. 9.(일) 조식</dd>' +
            '<dt>장소</dt><dd>잼버리장 내 식자재 보급소</dd>' +
            '<dt>대상</dt><dd>7개 분단 · 대원 941명 + 지도자 157명 <span class="muted">(인원 변경 가능)</span></dd>' +
            '<dt>운영시간</dt><dd>조식·중식 <b>06:00~07:00</b> · 석식 <b>16:00~17:00</b></dd>' +
          '</dl></div>' +
          '<div class="card"><h3>기본 운영 원칙</h3><ul>' +
            '<li><b>단일 메뉴 보급</b> — 일자별 확정된 메뉴 1종을 전 참가자에게 일괄 보급</li>' +
            '<li><b>유닛 단위 수령</b> — 패트롤별 대표자 1~2인이 보급소를 방문해 수량 확인 후 수령</li>' +
            '<li><b>사용된 식자재 박스 반납 후 수령</b> — 전일 보급 용기 반납 확인 후 당일 인도</li>' +
            '<li><b>자율 취사</b> — 제공된 식자재 박스와 조리계획서를 기반으로 유닛별 자율 조리</li></ul></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">운영요원 · 컵스카우트 참관단 <span class="chip info">2개소 15식</span>' + srcLink(12) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>운영요원 (7일간)</h3><ul>' +
            '<li>8. 3.(월) 석식 ~ 8. 9.(일) 조식</li>' +
            '<li><span class="hi">8/6~8일 중식은 간편식 제공 (식당 이용 불가)</span></li>' +
            '<li>JPT·IST 494명 + CMT 114명 <span class="muted">(변경 가능)</span></li>' +
            '<li>장소: 잼버리장 <b>D동</b> 1식당 · 2식당 · 3식당(중식 보급)</li>' +
            '<li>1·2식당 최대 250명 동시 식사</li></ul></div>' +
          '<div class="card"><h3>컵스카우트 참관단 (5일간)</h3><ul>' +
            '<li>8. 5.(월) 석식 ~ 8. 9.(일) 조식</li>' +
            '<li>1기 8.5(수)~8.7(금) — 대원 257명 + 지도자 42명 (299명)</li>' +
            '<li>2기 8.7(금)~8.9(일) — 대원 246명 + 지도자 38명 (284명)</li></ul></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">식사 시간 · 제공 방식' + srcLink(13) + '</h2>' +
        '<div class="card" id="mealtable"></div>' +
        '<div class="card" style="margin-top:12px"><p><b>식사 제공 시작은 8/3(월) 석식부터</b>입니다. 8/3 입영일 조식·중식은 개별 해결 후 입영해 주세요.</p></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">식당 운영' + srcLink(14) + '</h2>' +
        '<div class="grid g3">' +
          '<div class="card"><h3>1식당 (본 식당)</h3><p>최대 <b>200명</b></p><p class="muted">컵스카우트 참관단, 운영요원 및 지원요원 · 배식 인원 상황에 따라 탄력적 운영</p></div>' +
          '<div class="card"><h3>2식당 (세미나 2)</h3><p>최대 <b>50명</b></p><p class="muted">패스트트랙 이용 또는 운영요원(특별식)</p></div>' +
          '<div class="card"><h3>3식당 (세미나 1)</h3><p><b>중식 보급 및 보관</b></p></div>' +
        '</div>' +
        '<div class="card" style="margin-top:12px"><p><span class="hi">※ 식권 미지참 시 입장 불가</span> · 시간 분리 운영 — 각 본부 및 컵스카우트 참관단이 지정된 시간에 식사합니다.</p></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">식권 4종' + srcLink(15) + '</h2>' +
        '<div class="tblwrap"><table class="tbl"><tbody>' + tickets + '</tbody></table></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">신선도 유지 · 위기 대처' + srcLink(10) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>신선도 유지 체계 (Cold-Chain)</h3><ul>' +
            '<li>전 차량 냉장 탑차 운송 및 <b>지급 완료 시까지 현장 대기</b></li>' +
            '<li>현장 보관: 몽골텐트 내 파레트 적재로 지면 열기 차단 및 직사광선 보호</li></ul></div>' +
          '<div class="card"><h3>식자재 박스 위기상황 대처</h3>' +
            '<div class="tblwrap"><table class="tbl"><thead><tr><th>위기상황</th><th>대처방안</th></tr></thead><tbody>' +
            '<tr><td>식자재박스 파손 및 식자재 손상</td><td>대체품 또는 식자재박스 현장 교환</td></tr>' +
            '<tr><td>긴급 대피사항 시</td><td>간편식 긴급 제공 (운영사 협의)</td></tr>' +
            '<tr><td>식중독 발생 시</td><td>편의시설운영부 공유 및 상황실 신고 (관계기관 협조 요청 등)</td></tr>' +
            '</tbody></table></div></div>' +
        '</div>' +
      '</section>';
  }

  function viewMenu() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">식사 메뉴' +
          '<a class="src" href="/krjam-planning" target="_blank" rel="noopener">홍보부 보드에서 수정 →</a>' +
        '</h2>' +
        '<p class="lead">홍보부 운영보드의 <b>식사 메뉴</b>와 <b>같은 자료</b>를 보여 줍니다. 메뉴를 고치면 양쪽에 함께 반영됩니다.</p>' +
        '<div class="card" id="menubox">불러오는 중…</div>' +
      '</section>';
  }

  function viewFac() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">편의시설 운영' + srcLink(19) + '</h2>' +
        '<div class="grid g3">' +
          '<div class="card"><h3>잼버리 시공사 북카페</h3><dl class="dl">' +
            '<dt>대상</dt><dd>전원</dd><dt>운영시간</dt><dd><b>09:00 ~ 21:00</b></dd></dl>' +
            '<p class="muted">※ 식사시간 전후 1시간 운영 중단</p>' +
            '<p class="muted">8월 4일 오전 시공사 큐레이션 및 공간 배치 협업</p></div>' +
          '<div class="card"><h3>편의점 (CU)</h3><dl class="dl">' +
            '<dt>대상</dt><dd>전원</dd><dt>운영시간</dt><dd>2026. 8. 4.(화)부터 <b>09:00 ~ 21:00</b></dd></dl>' +
            '<p class="muted">편의 사정에 따라 브레이크 타임 운영 — 급식편의시설팀 협의 필요</p></div>' +
          '<div class="card"><h3>이디야 커피차</h3><dl class="dl">' +
            '<dt>대상</dt><dd>전원</dd><dt>운영시간</dt><dd>2026. 8. 4.(화)부터 <b>09:00 ~ 21:00</b></dd></dl>' +
            '<p class="muted">컵스카우트 참관단 이용은 기조·안전·컵본부 등과 협의 중</p></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">운영요원 역할 · 기본 원칙' + srcLink(19) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>주요 역할</h3><p>안내 · 시설 관리 · 물품 지원 · 질서 유지</p></div>' +
          '<div class="card"><h3>기본 원칙</h3><ul><li>휴식 공간으로 운영</li><li><b>주류 반입 금지</b> 및 주의사항 사전 공지</li></ul></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">소모임 장소 (미니 라운지)' + srcLink(20) + '</h2>' +
        '<div class="card"><dl class="dl">' +
          '<dt>대상</dt><dd>운영요원(IST) 및 지도자</dd>' +
          '<dt>운영일자</dt><dd>2026. 8. 4. · 8. 6. · 8. 7.</dd>' +
          '<dt>운영시간</dt><dd><b>18:00 ~ 19:30</b> / <b>19:30 ~ 21:00</b> <span class="muted">(각 1시간 30분)</span></dd>' +
          '<dt>이용 원칙</dt><dd>사전 예약 및 신청을 받아 운영 · 사용 후 정리·정돈 필수</dd>' +
        '</dl></div>' +
      '</section>';
  }

  function viewInout() {
    var bus = ['현장 도착', '하차 안내 확인', '명단 확인', 'Safe from Harm 이수 확인', '소속 본부 확인', '본부별 지급품 수령', '숙영지·근무지 이동'];
    var own = ['현장 도착', '명단 확인', 'Safe from Harm 이수 확인', '주차 안내 확인', '소속 본부 확인', '본부별 지급품 수령', '숙영지·근무지 이동'];
    var flow = function (steps) {
      return '<div class="flow">' + steps.map(function (s, i) {
        var key = /Safe from Harm|소속 본부|지급품/.test(s) ? ' key' : '';
        return (i ? '<span class="ar">→</span>' : '') + '<span class="st' + key + '">' + esc(s) + '</span>';
      }).join('') + '</div>';
    };
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">입영 안내' + srcLink(22) + '</h2>' +
        '<div class="card"><p style="font-size:var(--fs-4);font-weight:800;margin:0 0 6px">2026. 08. 03.(월) 14:00</p>' +
          '<p>도착 후 바로 <b>등록 및 Safe from Harm 이수 확인</b> 절차를 진행합니다.</p></div>' +
        '<div class="grid g3" style="margin-top:12px">' +
          '<div class="card"><h3>이동방법 1 — 개별 이동</h3><p>개인 차량 또는 대중교통 이용 후 현장 안내에 따라 접수</p></div>' +
          '<div class="card"><h3>이동방법 2 — 단체버스</h3><p>연맹 출발 단체버스 <b>13:00 예정</b><br><span class="muted">세부 시간은 변경 가능</span></p></div>' +
          '<div class="card"><h3>도착 후 확인</h3><p>Safe from Harm 이수 확인<br>급식편의본부에서 지급품 수령</p></div>' +
        '</div>' +
        '<div class="card" style="margin-top:12px">' +
          '<p>지급품은 <b>소속 본부</b>에서 배부합니다. 도착 시 급식편의본부 <b>JHQ-FnC</b> 로 오세요.</p>' +
          '<p class="muted">입영일정이 4일 또는 5일이신 경우 단톡방에 <b>부서 · 성명 · 입영일자</b>를 남겨 주시기 바랍니다.</p>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">잼버리장 도착 절차' + srcLink(23) + '</h2>' +
        '<div class="card"><h3>단체버스</h3>' + flow(bus) + '</div>' +
        '<div class="card" style="margin-top:12px"><h3>개인 이동</h3>' + flow(own) + '</div>' +
        '<div class="card" style="margin-top:12px"><p>입영 절차의 핵심은 <span class="hi">이수 확인 → 소속 본부 확인 → 지급품 수령</span> 입니다.</p>' +
          '<p class="muted">Safe from Harm 이수 여부가 확인되지 않으면 현장 등록과 배치 확인이 지연될 수 있습니다.</p></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">배치도' + srcLink(7) + '</h2>' +
        '<div class="card"><p>잼버리 식당 <b>D동 1층</b> · 급식편의본부 <b>JHQ-F&amp;C</b>(약 40m × 45m) — IST라운지(북카페) · 커피차 · 편의점</p>' +
          '<a class="btn sm" href="' + BOOK + '#p7" target="_blank" rel="noopener">배치도 원문 보기</a> ' +
          '<a class="btn sm" href="' + BOOK + '#p25" target="_blank" rel="noopener">숙영지 위치 보기</a></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">퇴영 안내' + srcLink(26) + '</h2>' +
        '<div class="card"><p style="font-size:var(--fs-4);font-weight:800;margin:0 0 6px">8/9(일) 11:00</p>' +
          '<p>소속 본부별 정리 및 퇴영 확인 후 이동합니다.</p></div>' +
        '<div class="grid g3" style="margin-top:12px">' +
          '<div class="card"><h3>이동방법 1 — 개별 이동</h3><p>개인 차량 또는 대중교통을 이용하여 개별 퇴영</p></div>' +
          '<div class="card"><h3>이동방법 2 — 단체버스</h3><p>8/9(일) <b>11:00 출발 예정</b> / 여의도 도착</p></div>' +
          '<div class="card"><h3>퇴영 전 확인</h3><p>담당 구역 정리 완료<br>개인 짐 · 분실물 확인</p></div>' +
        '</div>' +
        '<div class="card" style="margin-top:12px"><p>공용물품 반납 및 인원 확인 후 퇴영합니다. 반드시 소속 본부 안내에 따라 이동해 주세요.</p>' +
          '<p class="muted">퇴영 일정이 8일 오후 또는 9일 아침이신 경우 편의운영부에 꼭 알려 주시기 바랍니다.</p></div>' +
      '</section>';
  }

  function viewIst() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">운영요원 체크리스트' + srcLink(29) + '</h2>' +
        '<p class="lead">체크한 내용은 이 기기에 저장됩니다. 현장에서는 <b>본부별 최종 공지와 당일 전달사항을 우선</b> 적용합니다.</p>' +
        '<div class="ckbar"><div class="track"><i class="fill" id="ck-fill"></i></div><span class="pct" id="ck-pct">0%</span>' +
          '<button class="btn sm ghost" id="ck-reset">초기화</button></div>' +
        '<div class="grid g4" id="ckbox"></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">지급품' + srcLink(27) + '</h2>' +
        '<div class="card"><ul>' +
          '<li>항건(네커치프)</li><li>티셔츠</li><li>공식 패치 / 운영요원 패치 2종</li><li>ID 팔찌</li>' +
          '<li>기념품: 삼성 JBL 포터블 BT 스피커 1개 <span class="muted">(색상 랜덤)</span></li></ul></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">숙박 — 잼버리텐트' + srcLink(28) + '</h2>' +
        '<div class="grid g2">' +
          '<div class="card"><h3>배정</h3><ul>' +
            '<li>숙박은 텐트 · <b>2인 1텐트</b> 배정</li><li>세부 배정은 현장 및 소속 본부 안내에 따름</li>' +
            '<li>개인 침낭 · 세면도구 · 상비용품 등은 본인이 준비</li></ul></div>' +
          '<div class="card"><h3>꼭 챙길 것</h3><ul>' +
            '<li><span class="hi">숙영지에 전기 시설이 없습니다</span> — 개인 랜턴 및 보조배터리 필수 지참</li>' +
            '<li>개인 텐트 지참 권장 — 지급 텐트는 WSJ 에서 사용한 텐트라 상태가 좋지 않습니다 <span class="muted">(텐트가 없는 운영요원만 지급 · 깔개는 지급)</span></li>' +
            '<li>생활 기준: 텐트 내 귀중품 보관 주의 · 지정된 숙영구역 이탈 금지</li></ul></div>' +
        '</div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">안전보호 교육 (Safe from Harm)' + srcLink(21) + '</h2>' +
        '<div class="card"><p><span class="chip danger">필수</span> 모든 운영요원은 <b>Safe from Harm 온라인 사전교육 및 현장 안전보호교육</b>을 이수해야 합니다.</p></div>' +
        '<div class="grid g3" style="margin-top:12px">' +
          '<div class="card"><h3>기본 운영방향</h3><ul><li>잼버리에 참가하는 모든 성인(지원요원 포함)은 사전 교육 필수</li><li>신고 프로세스 운영을 통한 신속·정확한 대응 체계 확립</li></ul></div>' +
          '<div class="card"><h3>온라인 사전교육</h3><ul><li>오픈일시: 2026년 7월 14일</li><li>교육링크: 문자메시지 발송 완료</li><li>대상: 운영요원 · 대지도자 · 지원요원 · 용역요원 · 일일방문객</li></ul></div>' +
          '<div class="card"><h3>신고 프로세스</h3><ul><li>온라인 신고: 전용 QR 및 링크</li><li>전화 신고: 핫라인 번호 안내 예정</li><li>방문 신고: Safe from Harm 오피스 직접 방문</li></ul></div>' +
        '</div>' +
      '</section>';
  }

  function viewSched() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">급식편의본부 주요 업무추진 일정' + srcLink(30) + '</h2>' +
        '<div class="days" id="days"></div>' +
      '</section>' +
      '<section class="sec">' +
        '<h2 class="sec-h">잼버리 일정표' + srcLink(4) + '</h2>' +
        '<div class="card"><p>참가자 하루 흐름 — 기상·체조·세면(06:00) → 아침식사(07:00) → 조회(08:00) → 과정활동 → 점심식사(12:00) → 과정활동 → 저녁식사(17:00) → 저녁 프로그램(20:00) → 반집회 · 정리 및 취침(22:00)</p>' +
          '<p class="muted">8/5 입영 및 설영 · 개영식 / 8/6 K-POP 콘서트 / 8/7 교류활동(대별) / 8/8 폐영식 / 8/9 철영 및 퇴영</p>' +
          '<a class="btn sm" href="' + BOOK + '#p4" target="_blank" rel="noopener">일정표 원문 보기</a></div>' +
      '</section>';
  }

  function viewBook() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">자료 원문 (31쪽)</h2>' +
        '<p class="lead">오리엔테이션 자료 원본입니다. 이 화면 안에서 넘겨 보거나, 새 창으로 크게 볼 수 있습니다.</p>' +
        '<p><a class="btn sm solid" href="' + BOOK + '" target="_blank" rel="noopener">새 창으로 열기</a> ' +
          '<a class="btn sm" href="/krjam-fnc/assets/KNJ16-FnC-Orientation.pdf" download="제16회 한국잼버리 급식편의본부 오리엔테이션.pdf">PDF 내려받기</a></p>' +
        '<div class="bookwrap"><iframe id="bookframe" src="' + BOOK + '" title="급식편의본부 오리엔테이션 자료 원문" loading="lazy"></iframe></div>' +
      '</section>';
  }

  function viewDuty() {
    return '' +
      '<section class="sec">' +
        '<h2 class="sec-h">담당 배정' + srcLink(5, '조직도') + '</h2>' +
        '<p class="lead">구역·업무마다 <b>담당</b>과 <b>지원</b>을 정해 둡니다. 배정은 <b>홍보부 운영보드에 로그인</b>한 사람만 바꿀 수 있고, 누구나 볼 수 있습니다.</p>' +
        '<div id="dutybox">불러오는 중…</div>' +
      '</section>';
  }
  var RENDER = { home: viewHome, org: viewOrg, food: viewFood, menu: viewMenu, fac: viewFac,
                 inout: viewInout, ist: viewIst, duty: viewDuty, sched: viewSched, book: viewBook };

  /* ── 살아 있는 부분 ────────────────────────────────────────── */
  function renderHero() {
    var box = $('hero'); if (!box) return;
    var now = new Date();
    var items = [
      { l: '입영', d: new Date(EVENT.inDate), s: '8/3(월) 14:00' },
      { l: '개영식', d: new Date(EVENT.openDate), s: '8/5(수) 20:00' },
      { l: '퇴영', d: new Date(EVENT.outDate), s: '8/9(일) 11:00' },
    ];
    box.innerHTML = items.map(function (it) {
      var ms = it.d - now, past = ms <= 0;
      var v;
      if (past) v = '지났음';
      else {
        var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
            m = Math.floor(s % 3600 / 60), ss = s % 60;
        v = d > 0 ? ('D-' + d + ' ' + pad2(h) + ':' + pad2(m) + ':' + pad2(ss))
                  : (pad2(h) + ':' + pad2(m) + ':' + pad2(ss));
      }
      var soon = !past && (it.d - now) < 86400000;
      return '<div class="dcard' + (past ? ' past' : (soon ? ' now' : '')) + '">' +
        '<div class="dl1">' + esc(it.l) + '까지</div><div class="dv">' + esc(v) + '</div><div class="dl2">' + esc(it.s) + '</div></div>';
    }).join('');
  }

  function mealStatus(now) {
    var mins = nowMinutes(now);
    return MEAL_TIMES.map(function (m) {
      var a = minutesOf(m.from), b = minutesOf(m.to);
      var state = mins < a ? 'before' : (mins >= b ? 'after' : 'now');
      return { m: m, state: state };
    });
  }
  function renderMealNow() {
    var box = $('mealnow'); if (!box) return;
    var now = new Date(), rows = mealStatus(now);
    var open = rows.filter(function (r) { return r.state === 'now'; })[0];
    var head = open
      ? '<p><span class="chip ok">지금 ' + esc(open.m.name) + ' 운영 중</span> <b>' + esc(open.m.from) + ' ~ ' + esc(open.m.to) + '</b></p>'
      : '<p><span class="chip">지금은 식사 시간이 아닙니다</span></p>';
    box.innerHTML = head + rows.map(function (r) {
      var chip = r.state === 'now' ? '<span class="chip ok">운영 중</span>'
        : r.state === 'before' ? '<span class="chip info">예정</span>' : '<span class="chip">종료</span>';
      return '<div class="meal"><span class="mn">' + esc(r.m.name) + '</span>' +
        '<span class="mt">' + esc(r.m.from) + ' ~ ' + esc(r.m.to) + '</span>' +
        '<span class="mw">' + esc(r.m.who) + '</span><span class="ms">' + chip + '</span></div>';
    }).join('');
  }
  function renderMealTable() {
    var box = $('mealtable'); if (!box) return;
    var now = new Date(), rows = mealStatus(now);
    box.innerHTML =
      '<h3>잼버리 식당 (운영요원 · 컵스카우트 참관단)</h3>' +
      rows.map(function (r) {
        var chip = r.state === 'now' ? '<span class="chip ok">운영 중</span>'
          : r.state === 'before' ? '<span class="chip info">예정</span>' : '<span class="chip">종료</span>';
        return '<div class="meal"><span class="mn">' + esc(r.m.name) + '</span>' +
          '<span class="mt">' + esc(r.m.from) + ' ~ ' + esc(r.m.to) + '</span>' +
          '<span class="mw">' + esc(r.m.who) + '</span><span class="ms">' + chip + '</span></div>';
      }).join('') +
      '<h4>참가자 식자재 보급소</h4>' +
      SUPPLY_TIMES.map(function (s) {
        return '<div class="meal"><span class="mn">' + esc(s.name.split(' ')[0]) + '</span>' +
          '<span class="mt">' + esc(s.from) + ' ~ ' + esc(s.to) + '</span>' +
          '<span class="mw">' + esc(s.name) + '</span></div>';
      }).join('');
  }

  function renderToday() {
    var box = $('todaybox'); if (!box) return;
    var today = new Date();
    var key = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
    var day = SCHEDULE.filter(function (d) { return d.d === key; })[0];
    if (!day) {
      box.innerHTML = '<p class="muted">오늘(' + esc(key) + ')은 본부 운영 기간(8/3~8/9)이 아닙니다. 전체 일정은 <b>업무 일정</b>에서 볼 수 있습니다.</p>' +
        '<button class="btn sm" data-go="sched">업무 일정 보기</button>';
      return;
    }
    box.innerHTML = '<h3>' + esc(day.label) + '</h3><ul>' + day.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
  }

  function renderDays() {
    var box = $('days'); if (!box) return;
    var today = new Date();
    var key = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());
    box.innerHTML = SCHEDULE.map(function (d) {
      return '<div class="day' + (d.d === key ? ' today' : '') + '"><div class="dh">' + esc(d.label) + (d.d === key ? ' · 오늘' : '') + '</div>' +
        '<ul>' + d.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }

  /* 체크리스트 — 기기별 보관(localStorage). 서버에 올릴 개인정보가 아니다. */
  function ckState() { try { return JSON.parse(localStorage.getItem(LS_CK) || '{}') || {}; } catch (e) { return {}; } }
  function ckSave(s) { try { localStorage.setItem(LS_CK, JSON.stringify(s)); } catch (e) {} }
  function renderChecks() {
    var box = $('ckbox'); if (!box) return;
    var st = ckState(), total = 0, done = 0;
    box.innerHTML = CHECKS.map(function (g) {
      return '<div class="card"><h3>' + esc(g.g) + '</h3>' + g.items.map(function (t) {
        var id = g.g + '::' + t, on = !!st[id]; total++; if (on) done++;
        return '<button type="button" class="ck' + (on ? ' on' : '') + '" data-ck="' + esc(id) + '" aria-pressed="' + on + '">' +
          '<span class="bx">' + (on ? '✓' : '') + '</span><span class="tx">' + esc(t) + '</span></button>';
      }).join('') + '</div>';
    }).join('');
    var pct = total ? Math.round(done / total * 100) : 0;
    if ($('ck-fill')) $('ck-fill').style.width = pct + '%';
    if ($('ck-pct')) $('ck-pct').textContent = pct + '%';
  }

  /* 식사 메뉴 — 홍보부 보드와 같은 자료(/api/jp-meals) */
  var MENU_DAYS = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09'];
  var MENU_GROUPS = [['crew_n', '대원 일반식'], ['crew_s', '대원 특별식'], ['staff', '운영요원']];
  var menuData = null, menuGroup = 'staff';
  function loadMenu() {
    return fetch('/api/jp-meals').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.ok) { menuData = j.meals || {}; } return j; })
      .catch(function () { return null; });
  }
  function renderMenu() {
    var box = $('menubox'); if (!box) return;
    if (!menuData) {
      box.innerHTML = '<p class="muted">메뉴를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>' +
        '<button class="btn sm" id="menu-retry">다시 불러오기</button>';
      return;
    }
    var seg = MENU_GROUPS.map(function (g) {
      return '<button type="button" class="btn sm' + (menuGroup === g[0] ? ' solid' : ' ghost') + '" data-mg="' + g[0] + '">' + esc(g[1]) + '</button>';
    }).join(' ');
    var days = menuData[menuGroup] || {};
    var any = MENU_DAYS.some(function (d) { var r = days[d] || {}; return (r.b || r.l || r.d); });
    var rows = MENU_DAYS.map(function (d) {
      var r = days[d] || {};
      var lbl = (+d.slice(5, 7)) + '/' + (+d.slice(8, 10));
      return '<tr><th>' + esc(lbl) + '</th><td>' + (esc(r.b) || '<span class="muted">—</span>') + '</td>' +
        '<td>' + (esc(r.l) || '<span class="muted">—</span>') + '</td>' +
        '<td>' + (esc(r.d) || '<span class="muted">—</span>') + '</td></tr>';
    }).join('');
    box.innerHTML = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' + seg + '</div>' +
      (any ? '' : '<p class="muted">아직 등록된 메뉴가 없습니다. 홍보부 운영보드의 <b>식사 메뉴</b>에서 입력하면 여기에도 바로 보입니다.</p>') +
      '<div class="tblwrap"><table class="tbl"><thead><tr><th>날짜</th><th>조식</th><th>중식</th><th>석식</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (menuGroup === 'staff' ? '<p class="muted" style="margin-top:10px">조식 고정메뉴: 그린샐러드&amp;드레싱 · 식빵&amp;모닝빵&amp;딸기잼 · 우유(흰·딸기·초코) / 중식·석식: 제철과일 제공</p>' : '');
  }

  /* ── 담당 배정 ─────────────────────────────────────────────── */
  function peopleList() {
    var out = [];
    ORG.depts.forEach(function (d) {
      if (d.chief) out.push(d.chief);
      (d.teams || []).forEach(function (t) {
        if (t.lead) out.push(t.lead);
        (t.members || []).forEach(function (m) { if (m && m !== '충원예정') out.push(m); });
      });
    });
    out.unshift(ORG.head);
    var seen = {}, uniq = [];
    out.forEach(function (n) { if (!seen[n]) { seen[n] = 1; uniq.push(n); } });
    return uniq;
  }
  function loadDuty() {
    return fetch('/api/jp-fnc').then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.ok) { duties = j.duties || {}; dutyMeta = { updatedAt: j.updatedAt, by: j.by }; } return j; })
      .catch(function () { return null; });
  }
  function renderDuty() {
    var box = $('dutybox'); if (!box) return;
    if (!duties) {
      box.innerHTML = '<div class="card"><p class="muted">담당 배정을 불러오지 못했습니다.</p>' +
        '<button class="btn sm" id="duty-retry">다시 불러오기</button></div>';
      return;
    }
    var can = canAssign();
    var dl = '<datalist id="duty-people">' + peopleList().map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>';
    var rows = DUTIES.map(function (d) {
      var v = duties[d[0]] || { main: '', sub: '', note: '' };
      if (dutyEdit) {
        return '<tr><th>' + esc(d[1]) + '<span class="dmemo">' + esc(d[2]) + '</span></th>' +
          '<td><input class="dfield" type="text" list="duty-people" maxlength="60" data-duty="' + d[0] + '~main" value="' + esc(v.main) + '" placeholder="담당"></td>' +
          '<td><input class="dfield" type="text" list="duty-people" maxlength="60" data-duty="' + d[0] + '~sub" value="' + esc(v.sub) + '" placeholder="지원"></td>' +
          '<td><input class="dfield" type="text" maxlength="120" data-duty="' + d[0] + '~note" value="' + esc(v.note) + '" placeholder="메모"></td></tr>';
      }
      return '<tr><th>' + esc(d[1]) + '<span class="dmemo">' + esc(d[2]) + '</span></th>' +
        '<td>' + (v.main ? '<b>' + esc(v.main) + '</b>' : '<span class="muted">미배정</span>') + '</td>' +
        '<td>' + (v.sub ? esc(v.sub) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (v.note ? esc(v.note) : '<span class="muted">—</span>') + '</td></tr>';
    }).join('');
    var assigned = DUTIES.filter(function (d) { return (duties[d[0]] || {}).main; }).length;
    var tools = can
      ? (dutyEdit
          ? '<button class="btn sm solid" id="duty-save">저장</button> <button class="btn sm ghost" id="duty-cancel">취소</button>'
          : '<button class="btn sm" id="duty-edit">배정 바꾸기</button>')
      : '<span class="muted" style="font-size:var(--fs-1)">배정을 바꾸려면 <a href="/krjam-planning" target="_blank" rel="noopener">홍보부 운영보드</a>에 로그인하세요.</span>';
    box.innerHTML = '<div class="card">' +
      '<div class="dutybar"><span class="chip' + (assigned === DUTIES.length ? ' ok' : '') + '">배정 ' + assigned + ' / ' + DUTIES.length + '</span>' +
        (dutyMeta.updatedAt ? '<span class="muted" style="font-size:var(--fs-1)">마지막 수정 ' + esc(fmtWhen(dutyMeta.updatedAt)) + (dutyMeta.by ? ' · ' + esc(dutyMeta.by) : '') + '</span>' : '') +
        '<span class="spacer"></span>' + tools + '</div>' +
      '<div class="tblwrap"><table class="tbl dutytbl"><thead><tr><th>구역 · 업무</th><th>담당</th><th>지원</th><th>메모</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' + dl + '</div>';
  }
  function fmtWhen(iso) {
    try { var d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
    catch (e) { return ''; }
  }
  function saveDuty() {
    var next = {};
    [].forEach.call(document.querySelectorAll('[data-duty]'), function (el) {
      var p = el.getAttribute('data-duty').split('~');
      if (!next[p[0]]) next[p[0]] = { main: '', sub: '', note: '' };
      next[p[0]][p[1]] = el.value;
    });
    var btn = $('duty-save'); if (btn) { btn.disabled = true; btn.textContent = '저장 중…'; }
    fetch('/api/jp-fnc', { method: 'PUT', headers: Object.assign({ 'content-type': 'application/json' }, authHeader()),
      body: JSON.stringify({ duties: next }) })
      .then(function (r) {
        if (r.status === 401) { toast('로그인이 만료됐습니다. 홍보부 보드에서 다시 로그인해 주세요.'); return null; }
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (j && j.ok) { duties = j.duties || {}; dutyMeta = { updatedAt: j.updatedAt, by: j.by }; dutyEdit = false; renderDuty(); toast('담당 배정을 저장했습니다'); }
        else { if (btn) { btn.disabled = false; btn.textContent = '저장'; } }
      })
      .catch(function () { toast('네트워크 오류'); if (btn) { btn.disabled = false; btn.textContent = '저장'; } });
  }

  /* ── 검색 ──────────────────────────────────────────────────── */
  var INDEX = null;
  function buildIndex() {
    if (INDEX) return INDEX;
    INDEX = [];
    VIEWS.forEach(function (v) {
      var host = document.createElement('div');
      host.innerHTML = RENDER[v.id]();
      host.querySelectorAll('.sec').forEach(function (sec) {
        var h = sec.querySelector('.sec-h');
        var title = h ? h.textContent.replace(/원문.*$/, '').trim() : v.label;
        var text = (sec.textContent || '').replace(/\s+/g, ' ').trim();
        INDEX.push({ view: v.id, viewLabel: v.label, title: title, text: text });
      });
    });
    return INDEX;
  }
  function runSearch(q) {
    var box = $('searchres'); if (!box) return;
    q = (q || '').trim();
    if (!q) { box.hidden = true; box.innerHTML = ''; return; }
    var hits = buildIndex().filter(function (r) {
      return (r.title + ' ' + r.text).toLowerCase().indexOf(q.toLowerCase()) >= 0;
    }).slice(0, 12);
    box.hidden = false;
    if (!hits.length) { box.innerHTML = '<div class="card"><p class="muted">「' + esc(q) + '」에 해당하는 내용이 없습니다.</p></div>'; return; }
    box.innerHTML = hits.map(function (r) {
      var i = r.text.toLowerCase().indexOf(q.toLowerCase());
      var from = Math.max(0, i - 30), snip = r.text.slice(from, from + 110);
      var marked = esc(snip).replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), function (m) { return '<mark>' + m + '</mark>'; });
      return '<button type="button" class="sr" data-go="' + esc(r.view) + '">' +
        '<b>' + esc(r.title) + '</b><span>' + esc(r.viewLabel) + ' · …' + marked + '…</span></button>';
    }).join('');
  }

  /* ── 화면 전환 ─────────────────────────────────────────────── */
  var cur = null;
  function setView(id, push) {
    if (!RENDER[id]) id = 'home';
    cur = id;
    var host = $('views');
    host.innerHTML = '<div class="view on" id="view-' + id + '">' + RENDER[id]() + '</div>';
    $('view-title').textContent = (VIEWS.filter(function (v) { return v.id === id; })[0] || {}).label || '';
    document.title = ((VIEWS.filter(function (v) { return v.id === id; })[0] || {}).label || '') + ' — 급식편의본부 · 제16회 한국잼버리';
    [].forEach.call(document.querySelectorAll('[data-nav]'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-nav') === id);
    });
    if (id === 'home') { renderHero(); renderMealNow(); renderToday(); }
    if (id === 'food') renderMealTable();
    if (id === 'ist') renderChecks();
    if (id === 'sched') renderDays();
    if (id === 'menu') { renderMenu(); if (!menuData) loadMenu().then(renderMenu); }
    if (id === 'duty') { renderDuty(); if (!duties) loadDuty().then(renderDuty); }
    if (push !== false && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    closeSide();
    window.scrollTo(0, 0);
  }

  function openSide() { $('side').classList.add('open'); $('sidemask').hidden = false; $('btn-menu').setAttribute('aria-expanded', 'true'); }
  function closeSide() { $('side').classList.remove('open'); $('sidemask').hidden = true; $('btn-menu').setAttribute('aria-expanded', 'false'); }

  /* ── 초기화 ────────────────────────────────────────────────── */
  function buildNav() {
    var grp = null, out = '';
    VIEWS.forEach(function (v) {
      if (v.grp !== grp) { grp = v.grp; if (grp) out += '<div class="sidegrp">' + esc(grp) + '</div>'; }
      out += '<button type="button" class="navitem" data-nav="' + v.id + '"><span class="ni-ic">' + v.ic + '</span>' + esc(v.label) + '</button>';
    });
    $('sidenav').innerHTML = out;
    $('tabbar').innerHTML = TABS.map(function (id) {
      var v = VIEWS.filter(function (x) { return x.id === id; })[0];
      return '<button type="button" class="tabbtn" data-nav="' + id + '" aria-label="' + esc(v.label) + '"><span>' + v.ic + '</span>' + esc(v.short || v.label) + '</button>';
    }).join('');
  }

  function tick() {
    if (cur === 'home') { renderHero(); renderMealNow(); }
    if (cur === 'food') renderMealTable();
    var n = new Date();
    var t = $('topnow'); if (t) t.textContent = pad2(n.getHours()) + ':' + pad2(n.getMinutes());
  }

  function init() {
    buildNav();
    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]'); if (nav) { setView(nav.getAttribute('data-nav')); return; }
      var go = e.target.closest('[data-go]'); if (go) { setView(go.getAttribute('data-go')); $('search').value = ''; runSearch(''); $('search-x').hidden = true; return; }
      var ck = e.target.closest('[data-ck]');
      if (ck) { var st = ckState(), k = ck.getAttribute('data-ck'); st[k] = !st[k]; ckSave(st); renderChecks(); return; }
      var mg = e.target.closest('[data-mg]'); if (mg) { menuGroup = mg.getAttribute('data-mg'); renderMenu(); return; }
      if (e.target.closest('#menu-retry')) { loadMenu().then(renderMenu); return; }
      if (e.target.closest('#duty-retry')) { loadDuty().then(renderDuty); return; }
      if (e.target.closest('#duty-edit')) { dutyEdit = true; renderDuty(); return; }
      if (e.target.closest('#duty-cancel')) { dutyEdit = false; renderDuty(); return; }
      if (e.target.closest('#duty-save')) { saveDuty(); return; }
      if (e.target.closest('#ck-reset')) {
        if (confirm('체크한 내용을 모두 지울까요?')) { ckSave({}); renderChecks(); toast('체크리스트를 초기화했습니다'); }
        return;
      }
      if (e.target.closest('#btn-menu')) { $('side').classList.contains('open') ? closeSide() : openSide(); return; }
      if (e.target.closest('#sidemask')) { closeSide(); return; }
      if (e.target.closest('#search-x')) { $('search').value = ''; runSearch(''); $('search-x').hidden = true; $('search').focus(); return; }
    });
    $('search').addEventListener('input', function () {
      $('search-x').hidden = !this.value;
      runSearch(this.value);
    });
    window.addEventListener('hashchange', function () { setView((location.hash || '').replace('#', ''), false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSide(); if ($('search').value) { $('search').value = ''; runSearch(''); $('search-x').hidden = true; } }
      if (e.key === '/' && document.activeElement !== $('search')) { e.preventDefault(); $('search').focus(); }
    });
    setView((location.hash || '').replace('#', '') || 'home', false);
    tick(); setInterval(tick, 1000);
    loadMenu().then(function () { if (cur === 'menu') renderMenu(); });
    loadDuty().then(function () { if (cur === 'duty') renderDuty(); });
    try { window.__fncBoard = { setView: setView, VIEWS: VIEWS, DUTIES: DUTIES, ver: VER }; } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
