/* ===== config ===== */
var EVENT_DAY = '2026-08-05';
var RANGE_START = '2026-06-15';
var RANGE_END   = '2026-08-09';
var HEADER_DEF = {
  title:'제16회 한국잼버리 · SNS 운영 캘린더',
  slogan:'평화를 잇다, 지구를 살리다, 미래를 개척하다 (Peace and Planet, Ready for Future)',
  place:'강원특별자치도 고성군 토성면 잼버리로 244',
  period:'2026-08-05 ~ 2026-08-09'
};
var CAT_COLOR = {'휴지기':'var(--c-rest)','한국 대표단':'var(--c-sub)','외국 대표단':'var(--c-intl)','피날레':'var(--c-fin)','행사 진행':'var(--c-during)','주요 소식':'var(--c-app)','이벤트':'var(--c-intl)','콘텐츠':'var(--accent)'};
var CAT_TINT = {'휴지기':'rgba(138,138,130,.10)','한국 대표단':'rgba(47,143,107,.12)','외국 대표단':'rgba(46,111,174,.10)','피날레':'rgba(192,73,47,.12)','행사 진행':'rgba(154,158,152,.10)'};
var TYPE_LABEL = {dcount:'D-count',sosik:'소식',event:'이벤트',extra:'추가'};
var STATUS_LABEL = {planned:'기획',draft:'작성중',ready:'완료'};



function phaseOf(dd){
  if(dd>=41) return '휴지기';
  if(dd>=22) return '한국 대표단';   // D-40 ~ D-22 : 국내(한국) D-count 신청
  if(dd>=5)  return '외국 대표단';   // D-21 ~ D-5  : 17개국 (1일 1개국)
  if(dd>=0)  return '피날레';        // D-4 ~ D-day
  return '행사 진행';
}
// 피날레 D-카운트 = 그날 카드를 드는 담당자(역할). D-day는 개영식.
function finaleTitle(dd){
  return ({4:'국제 커미셔너',3:'야영장(캠프치프)',2:'한국스카우트연맹 총재',1:'전체 운영요원',0:'개영식'})[dd] || '';
}
// 외국 대표단 17개국 = D-21~D-5 (1일 1개국 슬롯; 제목은 국가명으로 수정)
var CIRCLED=['','①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰'];
function foreignTitle(dd){ var n=22-dd; return '참가국 '+(CIRCLED[n]||('#'+n)); }
/* (이벤트 접수/공개는 '일정 레이어'로 이동 — defaultEvents) */

/* base schedule built deterministically from rules */
function buildDays(){
  var out=[], cur=ymd(RANGE_START), end=ymd(RANGE_END), today=todayISO();
  while(cur<=end){
    var date=iso(cur), dd=dayDiff(EVENT_DAY,date), ph=phaseOf(dd), wd=cur.getDay();
    var dlabel = dd>0?('D-'+dd):(dd===0?'D-DAY':'');
    var items=[];
    if(ph==='한국 대표단')
      items.push({type:'dcount',category:ph,seedTitle:''});
    if(ph==='외국 대표단')
      items.push({type:'dcount',category:ph,seedTitle:foreignTitle(dd)});
    if(ph==='피날레')
      items.push({type:'dcount',category:'피날레',seedTitle:finaleTitle(dd)});
    // 소식·이벤트 자동 생성 제거 — 소식=사용자 추가, 이벤트=일정 레이어
    out.push({date:date,label:(cur.getMonth()+1)+'/'+cur.getDate(),dday:dd,dlabel:dlabel,
      weekday:WD[wd],wd:wd,phase:ph,past:date<today,today:date===today,items:items});
    cur.setDate(cur.getDate()+1);
  }
  return out;
}
var DAYS = buildDays();
var byDate={}; DAYS.forEach(function(d){byDate[d.date]=d;});
var dcountApproved=[];   // 디데이 프로젝트(krjam-dcount) 승인 카드 — 캘린더 자동 연동

/* ===== overlay state ===== */
var LS='jamboree-plan:state', LS_AUTHOR='jamboree-plan:author';
var CHANNELS=['페이스북','인스타그램','유튜브','블로그','기타'];
var MAX_IMG=10;
function stateDefaults(){ return {edits:{}, extra:{}, marketing:null, header:null, hidden:{}, history:{}, meta:{}, notes:{}, types:null, events:null, timetable:null, roster:null, teams:null, ttcats:null, offtimes:null, contacts:null, divisions:null, protocol:null, mappos:null, shoots:null}; }
function defaultTypes(){ return ['카드뉴스','영상','이미지카드','웹포스터','보도자료','릴스/숏폼']; }
/* 운영 일정(일정 레이어) — 회의·공모전 등 단일/연속(여러 날). 콘텐츠와 분리. */
var EVENT_KINDS=[['회의','#6B4FA0'],['공모전','#0F8A8A'],['행사','#C0492F'],['운영','#2E6FAE'],['기타','#7A6A57']];
function eventColor(kind){ for(var i=0;i<EVENT_KINDS.length;i++) if(EVENT_KINDS[i][0]===kind) return EVENT_KINDS[i][1]; return '#7A6A57'; }
function defaultEvents(){ return [
  {id:mkid(),title:'참여형·AI 콘텐츠 이벤트 접수',kind:'공모전',start:'2026-07-06',end:'2026-07-26',owner:'',memo:'D-30~D-10 접수 기간'},
  {id:mkid(),title:'이벤트 결과 발표 · 콘텐츠 공개',kind:'행사',start:'2026-08-05',end:'2026-08-05',owner:'',memo:'개영일 공개'},
  {id:mkid(),title:'제16회 한국잼버리',kind:'행사',start:'2026-08-05',end:'2026-08-09',owner:'',memo:'본 행사 기간'}
].concat(meetingSeeds()); }
/* 잼버리 기간 중 회의(고정) — 운영 일정(events)에 회의 종류로 노출. 안정적 id로 중복 방지. */
function meetingSeeds(){ return [
  {id:'mtg-jy-0804',title:'분단야영장회의 22:00',kind:'회의',start:'2026-08-04',end:'2026-08-04',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHQ 본부'},
  {id:'mtg-jy-0805',title:'분단야영장회의 23:00',kind:'회의',start:'2026-08-05',end:'2026-08-05',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHQ 본부'},
  {id:'mtg-jy-0806',title:'분단야영장회의 23:00',kind:'회의',start:'2026-08-06',end:'2026-08-06',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHQ 본부'},
  {id:'mtg-jy-0807',title:'분단야영장회의 22:00',kind:'회의',start:'2026-08-07',end:'2026-08-07',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHQ 본부'},
  {id:'mtg-jy-0808',title:'분단야영장회의 23:00',kind:'회의',start:'2026-08-08',end:'2026-08-08',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHQ 본부'},
  {id:'mtg-bd-0804',title:'분단장 회의 21:00',kind:'회의',start:'2026-08-04',end:'2026-08-04',owner:'',memo:'참석: 야영장단·본부장·지원부장·분단장·분단지원부장 / 장소: JHQ 본부'},
  {id:'mtg-bd-0806',title:'분단장 회의 22:00',kind:'회의',start:'2026-08-06',end:'2026-08-06',owner:'',memo:'참석: 야영장단·본부장·지원부장·분단장·분단지원부장 / 장소: JHQ 본부'},
  {id:'mtg-bd-0808',title:'분단장 회의 22:00',kind:'회의',start:'2026-08-08',end:'2026-08-08',owner:'',memo:'참석: 야영장단·본부장·지원부장·분단장·분단지원부장 / 장소: JHQ 본부'}
]; }
/* 서버 events에 회의 시드가 없으면 병합(라이브 보드에도 회의가 보이도록). 추가가 있으면 저장. */
function mergeSeedMeetings(){
  var evs=eventList(); var have={}; evs.forEach(function(e){ have[e.id]=1; });
  var added=0; meetingSeeds().forEach(function(m){ if(!have[m.id]){ evs.push(Object.assign({},m)); added++; } });
  if(added) saveEvents();
}
function eventList(){ if(!state.events) state.events=defaultEvents(); return state.events; }
function layoutEvents(){
  var evs=eventList().filter(function(e){return e.start;}).map(function(e){return {e:e, s:e.start, en:e.end||e.start};}).filter(function(x){return x.en>=x.s;});
  evs.sort(function(a,b){return a.s<b.s?-1:a.s>b.s?1:(a.en<b.en?1:-1);});
  var laneEnd=[];
  evs.forEach(function(x){ var li=0; while(laneEnd[li]!==undefined && laneEnd[li]>=x.s) li++; x.lane=li; laneEnd[li]=x.en; });
  return {items:evs, lanes:laneEnd.length};
}

/* ===== 잼버리 일자별 시간 일정표 (timetable) ===== */
var JAM_DAYS=[
  ['2026-08-02','사전'],['2026-08-03','사전'],['2026-08-04','사전'],
  ['2026-08-05','개영'],['2026-08-06',''],['2026-08-07',''],['2026-08-08',''],['2026-08-09','폐영']
];
// 새 종류에 자동 배정되는 색 — 전부 흰 글씨 4.5:1 이상만 남겼다(이전엔 4.18·3.72 등 미달 색이 섞여 있었음)
var TTCAT_PALETTE=['#B03E24','#2F5D4A','#6B4FA0','#0B6E6E','#8A5A0B','#2E6FAE','#6B5C4A','#96341F','#2F6B4B','#7B4CA0','#0F6262','#84550C','#33629B','#5E5344'];
// 블록에 흰 글씨를 얹으므로 전부 대비 4.5 이상. 홍보활동(#0F8A8A 4.18)·식사(#B07A1E 3.72)가 미달이라 어둡게 조정.
function defaultTtCats(){ return [['개·폐영식','#B03E24'],['프로그램','#2F5D4A'],['행사','#6B4FA0'],['홍보활동','#0B6E6E'],['식사','#8A5A0B'],['회의','#2E6FAE'],['이동·기타','#6B5C4A']]; }
function ttCats(){ if(!state.ttcats) state.ttcats=defaultTtCats(); return state.ttcats; }
function ttCatColor(c){ var L=ttCats(); for(var i=0;i<L.length;i++) if(L[i][0]===c) return L[i][1]; return '#7A6A57'; }
function saveTtCats(){ debouncedPut('ttcatTimer', {ttcats: ttCats()}, '종류 저장됨'); }
function addTtCat(name){ name=(name||'').trim(); if(!name) return false; var L=ttCats(); if(L.some(function(x){return x[0]===name;})){ toast('이미 있는 종류'); return false; } var used=L.map(function(x){return x[1];}); var col=TTCAT_PALETTE.filter(function(c){return used.indexOf(c)<0;})[0]||TTCAT_PALETTE[L.length%TTCAT_PALETTE.length]; L.push([name,col]); saveTtCats(); return true; }
function deleteTtCat(name){ var L=ttCats(); if(L.length<=1){ toast('최소 1개 종류는 필요합니다'); return false; } if(!confirm('종류 "'+name+'"을(를) 삭제할까요?\n이 종류를 쓰던 일정은 기본색으로 표시됩니다.')) return false; state.ttcats=L.filter(function(x){return x[0]!==name;}); saveTtCats(); return true; }
/* 블록에 흰 글씨를 얹으므로 대비 미달 색은 그대로 둘 수 없다 → 통과할 때까지 어둡게 보정하고 이유를 알린다.
   (규칙은 core.js 의 darkenToContrast · 기준 4.5:1) */
function setTtCatColor(name,color){
  var safe=darkenToContrast(color);
  if(safe.toUpperCase()!==String(color).toUpperCase()) toast('글씨가 읽히도록 색을 조금 어둡게 맞췄어요');
  var L=ttCats(); for(var i=0;i<L.length;i++) if(L[i][0]===name){ L[i][1]=safe; break; }
  saveTtCats(); return safe;
}
/* ----- 인원별 오프타임 (배정 불가 시간) ----- */
var OFF_BLOCKS=[['am','오전','09–12',9,12],['pm','오후','14–17',14,17],['eve','저녁','19–22',19,22]];
function offMap(){ if(!state.offtimes) state.offtimes={}; return state.offtimes; }
function personOff(pid){ var m=offMap(); if(!m[pid]) m[pid]={}; return m[pid]; }
function isOff(pid,date,bk){ var d=offMap()[pid]; return !!(d&&d[date]&&d[date][bk]); }
function toggleOff(pid,date,bk){ var po=personOff(pid); if(!po[date]) po[date]={}; if(po[date][bk]) delete po[date][bk]; else po[date][bk]=true; if(!Object.keys(po[date]).length) delete po[date]; saveOfftimes(); }
function offConflict(pid,date,sH,eH){ if(sH==null||eH==null) return null; for(var i=0;i<OFF_BLOCKS.length;i++){ if(!offAllowed(date,i)) continue; var bk=OFF_BLOCKS[i]; if(isOff(pid,date,bk[0]) && sH<bk[4] && eH>bk[3]) return bk[1]; } return null; }
function saveOfftimes(){ debouncedPut('offTimer', {offtimes: offMap()}, '오프타임 저장됨'); }
function defaultTimetable(){ return [
  {id:mkid(),day:'2026-08-02',start:'10:00',end:'16:00',title:'사전 답사 · 영지 점검',place:'영지 전역',cat:'이동·기타',owner:'',memo:'촬영 동선 사전 점검'},
  {id:mkid(),day:'2026-08-03',start:'09:00',end:'18:00',title:'미디어센터 설치 · 장비 세팅',place:'미디어센터',cat:'홍보활동',owner:'',memo:'송출/촬영 장비 점검'},
  {id:mkid(),day:'2026-08-04',start:'09:00',end:'12:00',title:'운영요원 사전 교육 · 리허설',place:'메인 스타디움',cat:'회의',owner:'',memo:''},
  {id:mkid(),day:'2026-08-04',start:'14:00',end:'18:00',title:'개영 콘텐츠 사전 제작',place:'미디어센터',cat:'홍보활동',owner:'',memo:'카드뉴스/영상 사전 준비'},
  {id:mkid(),day:'2026-08-05',start:'09:00',end:'13:00',title:'참가자 입영 · 등록',place:'영지 전역 · 등록센터',cat:'행사',owner:'',memo:'입영 현장 스케치 촬영'},
  {id:mkid(),day:'2026-08-05',start:'14:00',end:'17:00',title:'단위 야영장 설영',place:'서브캠프',cat:'프로그램',owner:'',memo:''},
  {id:mkid(),day:'2026-08-05',start:'18:00',end:'19:30',title:'개영 리허설 · 송출 점검',place:'메인 스타디움',cat:'홍보활동',owner:'',memo:'라이브 송출 테스트'},
  {id:mkid(),day:'2026-08-05',start:'20:00',end:'21:30',title:'개영식',place:'메인 스타디움',cat:'개·폐영식',owner:'',memo:'★ 홍보 핵심 · 라이브 + 카드뉴스'},
  {id:mkid(),day:'2026-08-06',start:'09:00',end:'12:00',title:'모듈 프로그램 (글로벌 디벨롭먼트 빌리지)',place:'GDV 존',cat:'프로그램',owner:'',memo:''},
  {id:mkid(),day:'2026-08-06',start:'14:00',end:'18:00',title:'도전활동 (어드벤처)',place:'어드벤처 존',cat:'프로그램',owner:'',memo:'릴스/숏폼 촬영'},
  {id:mkid(),day:'2026-08-06',start:'19:00',end:'21:00',title:'문화교류의 밤',place:'문화광장',cat:'행사',owner:'',memo:''},
  {id:mkid(),day:'2026-08-07',start:'09:00',end:'17:00',title:'서브캠프 프로그램',place:'각 서브캠프',cat:'프로그램',owner:'',memo:''},
  {id:mkid(),day:'2026-08-07',start:'14:00',end:'16:00',title:'환경 · 평화 캠페인',place:'평화광장',cat:'홍보활동',owner:'',memo:'주제 메시지 콘텐츠'},
  {id:mkid(),day:'2026-08-07',start:'20:00',end:'21:30',title:'글로벌 페스티벌',place:'메인 스테이지',cat:'행사',owner:'',memo:''},
  {id:mkid(),day:'2026-08-08',start:'09:00',end:'17:00',title:'지역사회 봉사 · 문화 탐방',place:'강원 일원',cat:'프로그램',owner:'',memo:''},
  {id:mkid(),day:'2026-08-08',start:'19:00',end:'21:00',title:'잼버리 어워드',place:'메인 스타디움',cat:'행사',owner:'',memo:''},
  {id:mkid(),day:'2026-08-09',start:'10:00',end:'12:00',title:'정리 · 철수',place:'영지 전역',cat:'이동·기타',owner:'',memo:''},
  {id:mkid(),day:'2026-08-09',start:'19:00',end:'20:30',title:'폐영식',place:'메인 스타디움',cat:'개·폐영식',owner:'',memo:'★ 마무리 콘텐츠 · 하이라이트'}
]; }
function ttList(){ if(!state.timetable) state.timetable=defaultTimetable(); return state.timetable; }
/* 컵 참관단 일정표(사용자 제공, 8/4~8/9) — 잼버리 일정·의전과 구분되는 '독립 트랙'(track='cub').
   1기 8/4~8/7(오전) · 2기 8/7(오후)~8/9 (8/7 이 교대일: 오전 1기 퇴소 / 오후 2기 입소).
   카테고리(ttcats)가 아니라 트랙이므로 범례에 카테고리로 넣지 않고, 일간뷰에서 별도 열로 렌더한다.
   안정 id(cub-<기수>-MMDD-HHMM)로 시드 병합(멱등). */
var CUB_CAT='컵 참관단';
var CUB_BATCH_COLOR={1:'#3F6FA8', 2:'#A85B3F'};   // 1기·2기 트랙 색(범례 카테고리와 분리)
var CUB_BATCH_LABEL={1:'1기', 2:'2기'};
function cubColor(b){ return darkenToContrast(CUB_BATCH_COLOR[(b===2||b==='2')?2:1]); }   // 흰 글씨 대비 보정
// 일정표 트랙 필터 — 잼버리 일정 · 의전 일정 · 컵 1기 · 컵 2기 (전체기간·일간 공통 적용)
var TT_TRACKS=[['jam','잼버리 일정'],['pr','의전 일정'],['cub1','컵 1기'],['cub2','컵 2기']];
var ttFilter={jam:true,pr:true,cub1:true,cub2:true};
try{ var _tf=JSON.parse(localStorage.getItem('jamboree-plan:tt-filter')||'null'); if(_tf) TT_TRACKS.forEach(function(t){ ttFilter[t[0]]=(_tf[t[0]]!==false); }); }catch(e){}
function ttTrackOfItem(t){ return t.track==='cub' ? ((t.batch===2||t.batch==='2')?'cub2':'cub1') : 'jam'; }
function ttTrackOn(k){ return ttFilter[k]!==false; }
function saveTtFilter(){ try{ localStorage.setItem('jamboree-plan:tt-filter', JSON.stringify(ttFilter)); }catch(e){} }
function cubObserverSeeds(){
  function it(batch,day,s,e,title){ return {id:'cub-'+batch+'-'+day.slice(5).replace('-','')+'-'+s.replace(':',''),
    track:'cub', batch:batch, day:day, start:s, end:e, title:title, place:'', cat:CUB_CAT, assignees:[], contacts:[], rundown:[], memo:'', noCover:false}; }
  return [
    // ── 1기 ── 8/4 (화)
    it(1,'2026-08-04','09:00','14:00','운영요원 입영'),
    it(1,'2026-08-04','14:00','15:00','등록·입소식'),
    it(1,'2026-08-04','15:00','18:00','과정활동'),
    it(1,'2026-08-04','18:00','20:00','저녁식사'),
    it(1,'2026-08-04','20:00','22:00','개영식'),
    it(1,'2026-08-04','22:00','23:00','정리 및 취침'),
    // 1기 8/5 (수)
    it(1,'2026-08-05','14:00','18:00','워터파크'),
    it(1,'2026-08-05','18:00','20:00','저녁식사'),
    it(1,'2026-08-05','20:00','22:00','K-POP 콘서트'),
    it(1,'2026-08-05','22:00','23:00','정리 및 취침'),
    // 1기 8/6 (목)
    it(1,'2026-08-06','06:00','07:00','기상 및 세면'),
    it(1,'2026-08-06','07:00','09:00','아침식사 및 정리'),
    it(1,'2026-08-06','09:00','12:00','과정활동'),
    it(1,'2026-08-06','12:00','14:00','점심식사'),
    it(1,'2026-08-06','14:00','18:00','워터파크'),
    it(1,'2026-08-06','18:00','20:00','저녁식사'),
    it(1,'2026-08-06','20:00','22:00','컵스나잇'),
    it(1,'2026-08-06','22:00','23:00','정리 및 취침'),
    // 1기 8/7 (금) 오전 — 퇴소
    it(1,'2026-08-07','06:00','07:00','기상 및 세면'),
    it(1,'2026-08-07','07:00','09:00','아침식사 및 정리·퇴소식'),
    it(1,'2026-08-07','09:00','12:00','DMZ 견학'),
    it(1,'2026-08-07','12:00','14:00','점심 및 귀가'),
    // ── 2기 ── 8/7 (금) 오후 — 입소
    it(2,'2026-08-07','14:00','15:00','등록·입소식'),
    it(2,'2026-08-07','15:00','18:00','과정활동'),
    it(2,'2026-08-07','18:00','20:00','저녁식사'),
    it(2,'2026-08-07','20:00','22:00','폐영식'),
    // 2기 8/8 (토)
    it(2,'2026-08-08','06:00','07:00','기상 및 세면'),
    it(2,'2026-08-08','07:00','09:00','아침식사 및 정리/퇴소식·종교활동'),
    it(2,'2026-08-08','09:00','12:00','과정활동'),
    it(2,'2026-08-08','12:00','14:00','점심식사'),
    it(2,'2026-08-08','14:00','18:00','워터파크'),
    // 2기 8/9 (일)
    it(2,'2026-08-09','06:00','07:00','기상 및 세면'),
    it(2,'2026-08-09','07:00','09:00','아침식사 및 정리/퇴소식·종교활동'),
    it(2,'2026-08-09','09:00','12:00','DMZ 견학'),
    it(2,'2026-08-09','12:00','14:00','점심 및 귀가')
  ];
}
function mergeCubObservers(){
  // 컵 참관단은 독립 트랙 → 카테고리(범례)에서 제외(구 버전이 addTtCat 로 넣었을 수 있음)
  if(ttCats().some(function(c){ return c[0]===CUB_CAT; })){ state.ttcats=ttCats().filter(function(c){ return c[0]!==CUB_CAT; }); saveTtCats(); }
  var list=ttList(), before=list.length;
  // 구 스킴(단일 트랙 cub-MMDD-HHMM) 제거 → 신 기수 스킴(cub-<기수>-…)으로 대체. 시드 전용 id 만 매칭(사용자 생성분 불변)
  list=list.filter(function(t){ return !/^cub-\d{4}-\d{4}$/.test(t.id); });
  var have={}; list.forEach(function(t){ have[t.id]=1; });
  var added=0; cubObserverSeeds().forEach(function(s){ if(!have[s.id]){ list.push(s); added++; } });
  state.timetable=list;
  if(added || list.length!==before) saveTimetable();
}

/* ===== 홍보부 인원 R&R + 배치표 ===== */
function defaultRoster(){ return [
  {id:mkid(),name:'',role:'홍보부장',duty:'홍보 전략 총괄 · 대외 협력 · 최종 승인',contact:'',channel:'',team:'lead'},
  {id:mkid(),name:'',role:'콘텐츠 기획',duty:'카드뉴스/영상 기획 · 운영 캘린더 관리 · 일정 조율',contact:'',channel:'페이스북',team:'t1'},
  {id:mkid(),name:'',role:'디자인',duty:'카드뉴스 · 웹포스터 제작 (/krjam-cardnews 제작기)',contact:'',channel:'인스타그램',team:'t1'},
  {id:mkid(),name:'',role:'사진 · 아카이브',duty:'현장 사진 · 자료 정리 · 보도자료 지원',contact:'',channel:'블로그',team:'t1'},
  {id:mkid(),name:'',role:'영상 · 촬영',duty:'현장 촬영 · 편집 · 릴스/숏폼',contact:'',channel:'유튜브·인스타',team:'t2'},
  {id:mkid(),name:'',role:'채널 운영',duty:'SNS 업로드 · 댓글/DM 응대 · 통계',contact:'',channel:'페이스북·인스타·유튜브',team:'t2'}
]; }
function rosterList(){ if(!state.roster) state.roster=defaultRoster(); return state.roster; }
/* 팀(홍보부장 아래 2개 팀) — 팀명 편집 가능 */
function defaultTeams(){ return {t1:'1팀', t2:'2팀'}; }
function teamNames(){ if(!state.teams) state.teams=defaultTeams(); if(!state.teams.t1) state.teams.t1='1팀'; if(!state.teams.t2) state.teams.t2='2팀'; return state.teams; }
function teamOf(m){ if(m&&m.team) return m.team; return (m&&(m.role||'').indexOf('부장')>=0)?'lead':'t1'; }  // 구버전 데이터 마이그레이션
function teamLabel(t){ if(t==='lead') return '홍보부장'; var tn=teamNames(); return tn[t]||t; }
var TEAM_ORDER=['lead','t1','t2'];
/* placement(수동 배치표)는 v0.9.40 파생 뷰(renderDerivedPlacement)로 대체된 dormant 코드 — v0.9.180 정리 */
/* ===== 취재 연락처 (coverage contacts) — 일정표와 연동되는 담당자 주소록 ===== */
function defaultContacts(){ return [
  {id:mkid(),name:'',org:'기획조정본부',role:'프로그램 담당',phone:'',email:'',memo:'프로그램 일정 · 현장 취재 협조'},
  {id:mkid(),name:'',org:'운영본부',role:'야영장(캠프치프)',phone:'',email:'',memo:'영지 · 서브캠프 현장 안내'},
  {id:mkid(),name:'',org:'외부 · 언론',role:'취재 기자',phone:'',email:'',memo:'보도자료 배포 / 공동취재'}
]; }
function contactList(){ if(!state.contacts) state.contacts=defaultContacts(); return state.contacts; }
function contactById(id){ var l=contactList(); for(var i=0;i<l.length;i++) if(l[i].id===id) return l[i]; return null; }
function contactLabel(c){ if(!c) return '?'; return (c.name||'').trim() || (c.org||'').trim() || (c.role||'').trim() || '(이름 미입력)'; }
function ttContacts(t){ return ((t&&t.contacts)||[]).map(contactById).filter(Boolean); }
function saveContacts(){ debouncedPut('contactTimer', {contacts: contactList()}, '연락처 저장됨'); }
function addContactRow(){ contactList().push({id:mkid(),name:'',org:'',role:'',phone:'',email:'',memo:''}); }
var CTYPE_COLOR={'회의 · 기획조정본부':'#6B4FA0','회의 · 홍보부':'#0F8A8A'};
function ctypeColor(t){ if(CTYPE_COLOR[t]) return CTYPE_COLOR[t]; if(/회의/.test(t||'')) return '#7A6A57'; return 'var(--accent)'; }
function ctchip(t){ return t?('<span class="ctchip" style="background:'+ctypeColor(t)+'">'+esc(t)+'</span>'):''; }
function isMeeting(e){ return /회의/.test((e&&e.ctype)||''); }
function typeList(){ return (state.types&&state.types.length)?state.types:defaultTypes(); }
function notesOf(k){ return state.notes[k]||[]; }
var state = stateDefaults();
function normEdit(e){
  e=Object.assign(EDEF(), e||{});
  if(!Array.isArray(e.channels)||!e.channels.length) e.channels = e.channel ? [e.channel] : ['페이스북'];
  if(typeof e.links!=='object'||!e.links) e.links = e.link ? (function(){var o={};o[e.channels[0]]=e.link;return o;})() : {};
  if(!Array.isArray(e.files)) e.files=[];
  if(typeof e.due!=='string') e.due='';
  e.approval=normApproval(e.approval);
  delete e.channel; delete e.link;
  return e;
}
function adopt(s){ var st=Object.assign(stateDefaults(), s||{}); Object.keys(st.edits).forEach(function(k){ st.edits[k]=normEdit(st.edits[k]); }); return st; }
function loadLocal(){ try{var r=localStorage.getItem(LS); if(r) state=adopt(JSON.parse(r));}catch(e){} }
function saveLocal(){ prune(); try{localStorage.setItem(LS,JSON.stringify(state));}catch(e){} }
function key(date,type){return date+'#'+type;}
function EDEF(){ return {title:'',ctype:'',status:'planned',time:'',owner:'',tags:'',posted:false,postedAt:'',channels:['페이스북'],links:{},images:[],files:[],due:'',approval:{state:'none',by:'',at:'',note:''}}; }
function normApproval(a){ a=(a&&typeof a==='object')?a:{}; return {state:(['none','requested','approved','rejected'].indexOf(a.state)>=0?a.state:'none'),by:a.by||'',at:a.at||'',note:a.note||''}; }
function getEdit(k){ return state.edits[k] || (state.edits[k]=EDEF()); }   // editing (persists)
function peek(k){ return state.edits[k] || EDEF(); }                       // read-only (no store)
function hist(k){ return state.history[k] || []; }
function hasLink(e){ return e.links && Object.keys(e.links).some(function(c){return e.links[c];}); }
function linkCount(e){ return e.links ? Object.keys(e.links).filter(function(c){return e.links[c];}).length : 0; }
function channelPh(c){ return ({'페이스북':'https://facebook.com/…','인스타그램':'https://instagram.com/…','유튜브':'https://youtube.com/…','블로그':'https://blog…/…'})[c]||'https://…'; }
function lastEditText(k){ var m=state.meta[k]; if(!m||!m.updatedAt) return ''; return '마지막 작업: '+(m.author||'익명')+(m.ip?(' · IP '+m.ip):'')+' · '+fmtDateTime(m.updatedAt); }
function isDefaultEdit(e){ var defCh=!e.channels||(e.channels.length===1&&e.channels[0]==='페이스북'); var defAp=!e.approval||!e.approval.state||e.approval.state==='none'; return !e.title && !e.ctype && !e.time && !e.owner && !e.tags && !e.posted && !hasLink(e) && (!e.images||!e.images.length) && (!e.files||!e.files.length) && (!e.status||e.status==='planned') && defCh && !e.due && defAp; }
function prune(){ Object.keys(state.edits).forEach(function(k){ if(isDefaultEdit(state.edits[k]) && !(state.history[k]&&state.history[k].length) && k.indexOf('#extra#')<0) delete state.edits[k]; }); }
function defaultMarketing(){
  return [
    {id:mkid(),date:'2026-02-22',title:'세계 스카우트의 날 (Thinking Day)',channel:'인스타·페이스북',memo:'B-P 탄생 기념 · 글로벌 연대 메시지'},
    {id:mkid(),date:'2026-03',   title:'새 학기 대원 모집 캠페인',channel:'인스타·블로그·유튜브',memo:'신학기 가입 유도'},
    {id:mkid(),date:'2026-05-05',title:'어린이날 캠페인',channel:'전 채널',memo:'가족·체험 콘텐츠'},
    {id:mkid(),date:'2026-08-05',title:'제16회 한국잼버리 개영',channel:'전 채널',memo:'본 행사 · 실시간 운영'},
    {id:mkid(),date:'2026-10',   title:'가을 야영 시즌 / 창립기념',channel:'인스타·유튜브',memo:'활동 하이라이트'}
  ];
}

/* ===== sync (per-card save) ===== */
function setSt(msg,ok){var e=document.getElementById('syncst'); if(e){ e.classList.toggle('ok',!!ok); e.innerHTML = ok?('<b>'+msg+'</b>'):msg; }}
// 과거 #author 입력칸(v0.9.27 제거)을 읽던 잔재 — 로그인 도입(v0.9.103) 후에도 연결이 안 돼 모든 저장이 '익명'으로 기록되던 버그
function authorVal(){ return (Auth && (Auth.name||Auth.username)) || '익명'; }
function fmtTime(s){ try{var d=new Date(s);return d.getMonth()+1+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}catch(e){return '';} }
function slotEditPayload(k,s){
  var e=peek(k);
  return {title:e.title||'',ctype:e.ctype||'',status:e.status||'planned',time:e.time||'',owner:e.owner||'',tags:e.tags||'',posted:!!e.posted,postedAt:e.postedAt||'',channels:(e.channels&&e.channels.length?e.channels:['페이스북']),links:e.links||{},images:e.images||[],files:e.files||[],due:e.due||'',approval:normApproval(e.approval),category:(s&&s.category)||''};
}
function applyMeta(k,slot){ if(slot){ state.meta[k]={author:slot.author,ip:slot.ip,updatedAt:slot.updatedAt}; updateLastEditUI(k); } }
function updateLastEditUI(k){ var els=document.querySelectorAll('[data-lastedit="'+k+'"]'); for(var i=0;i<els.length;i++) els[i].textContent=lastEditText(k); }
var cardTimers={};
function saveCard(k,s,now){        // per-card server save (즉시 또는 짧은 디바운스). 항상 서버.
  saveLocal();
  if(cardTimers[k]) clearTimeout(cardTimers[k]);
  if(now){ doSaveCard(k,s); return; }
  setSt('저장 대기…');
  cardTimers[k]=setTimeout(function(){ doSaveCard(k,s); }, 500);
}
/* 저장 안정성: 실패 시 pending에 등록 → 온라인/주기적으로 자동 재시도 */
var pending={};
function slotByKey(k){ var rec=byDate[(k||'').split('#')[0]]; return rec?findSlot(rec,k):null; }
function flushPending(){ if(!navigator.onLine) return; Object.keys(pending).forEach(function(k){ var op=pending[k]; if(op==='delete') sendDelete(k); else doSaveCard(k, slotByKey(k)); }); }
function doSaveCard(k,s){
  if(s===undefined) s=slotByKey(k);
  setSt('서버 저장 중…');
  fetch('/api/jamboree-plan',{method:'PUT',headers:authJsonHeaders(),
    body:JSON.stringify({slotKey:k, edit:slotEditPayload(k,s), author:authorVal()})})
    .then(function(r){ if(r.status===401) authExpired(); return r.json(); })
    .then(function(j){ if(j&&j.ok&&j.slot){ delete pending[k]; applyMeta(k,j.slot); saveLocal(); var n=Object.keys(pending).length; setSt(n?('저장 대기 '+n+'건'):('서버 저장됨 · '+fmtTime(j.slot.updatedAt)), !n); } else { pending[k]=true; setSt('저장 실패 — 재시도 예정'); } })
    .catch(function(){ pending[k]=true; setSt('오프라인/네트워크 오류 — 로컬 보관, 자동 재시도'); });
}
function sendDelete(k){
  saveLocal();
  fetch('/api/jamboree-plan',{method:'PUT',headers:authJsonHeaders(),
    body:JSON.stringify({slotKey:k, deleted:true, author:authorVal()})})
    .then(function(r){return r.json();}).then(function(j){ if(j&&j.ok){ delete pending[k]; setSt('서버에서 삭제됨',true); } else { pending[k]='delete'; } }).catch(function(){ pending[k]='delete'; setSt('삭제 저장 실패 — 자동 재시도'); });
}
function putSlot(payload){
  return fetch('/api/jamboree-plan',{method:'PUT',headers:authJsonHeaders(),body:JSON.stringify(Object.assign({author:authorVal()},payload))}).catch(function(){});
}
/* 드래그앤드랍: 콘텐츠(편집+히스토리+메모)를 다른 날짜로 이동 → 대상엔 새 슬롯, 원본은 비움/삭제 */
function moveContent(srcKey, srcSlot, srcDate, targetDate){
  if(!targetDate || targetDate===srcDate) return;
  var src=peek(srcKey);
  if(!(src.title||hasLink(src)||(src.images&&src.images.length)||(src.files&&src.files.length)||hist(srcKey).length||notesOf(srcKey).length)){ return; } // 빈 슬롯은 이동 안 함
  var newKey=addContent(targetDate);
  state.edits[newKey]=clone(src);
  state.history[newKey]=(state.history[srcKey]||[]).slice();
  state.notes[newKey]=(state.notes[srcKey]||[]).slice();
  var nsl=findSlot(byDate[targetDate],newKey);
  setSt('일정 이동 저장 중…');
  putSlot({slotKey:newKey, edit:slotEditPayload(newKey,nsl), setHistory:state.history[newKey], setNotes:state.notes[newKey]})
    .then(function(){ setSt('일정 이동됨',true); });
  if(srcSlot.extra){
    state.extra[srcDate]=(state.extra[srcDate]||[]).filter(function(x){return x.id!==srcSlot.eid;});
    delete state.edits[srcKey]; delete state.history[srcKey]; delete state.notes[srcKey]; delete state.meta[srcKey];
    sendDelete(srcKey);
  } else {
    delete state.edits[srcKey]; delete state.history[srcKey]; delete state.notes[srcKey];
    putSlot({slotKey:srcKey, edit:slotEditPayload(srcKey,srcSlot), setHistory:[], setNotes:[]});
  }
  saveLocal(); renderCalendar(); renderBoard();
  toast((byDate[targetDate].label)+' 로 이동했습니다');
}
var dragSrc=null;
function clearDropTargets(){ document.querySelectorAll('.cell.dragover').forEach(function(c){c.classList.remove('dragover');}); }
function addHistoryNote(k, html){
  if(!html || !html.replace(/<[^>]*>/g,'').trim()) { toast('내용을 입력하세요'); return; }
  setSt('SNS 문구 저장 중…');
  fetch('/api/jamboree-plan',{method:'PUT',headers:authJsonHeaders(),
    body:JSON.stringify({slotKey:k, addHistory:{html:html}, author:authorVal()})})
    .then(function(r){return r.json();})
    .then(function(j){ if(j&&j.slot){ state.history[k]=j.slot.history||[]; applyMeta(k,j.slot); saveLocal(); refreshModal(); renderCalendar(); renderBoard(); setSt('SNS 문구 저장됨',true); toast('SNS 문구 저장됨'); } else setSt('저장 실패'); })
    .catch(function(){ setSt('저장 실패 (네트워크)'); });
}
var mktTimer=null;
function saveMarketing(){
  saveLocal();
  if(mktTimer) clearTimeout(mktTimer);
  setSt('마케팅 저장 대기…');
  mktTimer=setTimeout(function(){
    setSt('마케팅 저장 중…');
    fetch('/api/jamboree-plan',{method:'PUT',headers:authJsonHeaders(),
      body:JSON.stringify({marketing:state.marketing||[], author:authorVal()})})
      .then(function(r){return r.json();}).then(function(){ setSt('마케팅 저장됨',true); }).catch(function(){ setSt('마케팅 저장 실패'); });
  }, 500);
}
function applyServer(j){
  // MERGE(병합): 서버 카드는 자기 키만 갱신, 로컬 전용 카드는 보존 → 데이터 유실 방지
  var slots=j&&j.slots||{};
  Object.keys(slots).forEach(function(k){
    var r=slots[k]||{}; var isExtra=k.indexOf('#extra#')>=0;
    state.meta[k]={author:r.author,ip:r.ip,updatedAt:r.updatedAt};
    if(r.deleted){
      if(!isExtra){ state.hidden[k]=true; } else { var pp=k.split('#'),dd=pp[0],ii=pp[2]; if(state.extra[dd]) state.extra[dd]=state.extra[dd].filter(function(x){return x.id!==ii;}); }
      delete state.edits[k]; delete state.history[k]; delete state.notes[k];
      return;
    }
    if(r.edit) state.edits[k]=normEdit(r.edit);
    if(r.history) state.history[k]=r.history;
    if(r.notes) state.notes[k]=r.notes;
    if(isExtra){ var p=k.split('#'), date=p[0], id=p[2]; if(!state.extra[date]) state.extra[date]=[]; if(!state.extra[date].some(function(x){return x.id===id;})) state.extra[date].push({id:id,category:(r.edit&&r.edit.category)||'콘텐츠'}); }
  });
  if(j&&j.marketing) state.marketing=j.marketing;
  state._mealsFromServer=!!(j&&j.meals&&typeof j.meals==='object'&&Object.keys(j.meals).length);
  if(state._mealsFromServer) state.meals=j.meals;
  if(j&&j.types) state.types=j.types;
  if(j&&j.events) state.events=j.events;
  if(j&&j.timetable) state.timetable=j.timetable;
  if(j&&j.roster){ var r=j.roster.filter(function(x){ return x && ((x.name||'').trim()||(x.role||'').trim()||(x.duty||'').trim()||(x.contact||'').trim()||(x.channel||'').trim()); }); if(r.length) state.roster=r; }
  if(j&&j.teams&&typeof j.teams==='object'&&!Array.isArray(j.teams)) state.teams=Object.assign(defaultTeams(), j.teams);
  if(j&&Array.isArray(j.ttcats)&&j.ttcats.length) state.ttcats=j.ttcats;
  if(j&&j.offtimes&&typeof j.offtimes==='object'&&!Array.isArray(j.offtimes)) state.offtimes=j.offtimes;
  if(j&&Array.isArray(j.contacts)&&j.contacts.length) state.contacts=j.contacts;
  if(j&&Array.isArray(j.divisions)&&j.divisions.length) state.divisions=j.divisions;
  state._protoFromServer=!!(j&&Array.isArray(j.protocol)&&j.protocol.length);   // 서버에 실제 저장본이 있었는지(상세 시드 확정 판단용)
  if(state._protoFromServer) state.protocol=j.protocol;
  if(j&&j.mappos&&typeof j.mappos==='object'&&!Array.isArray(j.mappos)) state.mappos=j.mappos;
  if(j&&Array.isArray(j.shoots)) state.shoots=j.shoots;
}
function saveTypes(){
  saveLocal();
  fetch('/api/jamboree-plan',{method:'PUT',headers:authJsonHeaders(),
    body:JSON.stringify({types:typeList(), author:authorVal()})}).catch(function(){});
}
var evTimer=null;
function saveEvents(){
  saveLocal();
  if(evTimer) clearTimeout(evTimer);
  setSt('일정 저장 대기…');
  evTimer=setTimeout(function(){
    setSt('일정 저장 중…');
    fetch('/api/jamboree-plan',{method:'PUT',headers:authJsonHeaders(),
      body:JSON.stringify({events:state.events||[], author:authorVal()})})
      .then(function(r){return r.json();}).then(function(){ setSt('일정 저장됨',true); }).catch(function(){ setSt('일정 저장 실패'); });
  }, 500);
}
var ttTimer=null, rosterTimer=null;
function debouncedPut(timerName, body, okMsg){
  saveLocal();
  var t=window[timerName]; if(t) clearTimeout(t);
  setSt('저장 대기…');
  window[timerName]=setTimeout(function(){
    setSt('저장 중…');
    fetch('/api/jamboree-plan',{method:'PUT',headers:authJsonHeaders(),
      body:JSON.stringify(Object.assign({author:authorVal()}, body))})
      .then(function(r){return r.json();}).then(function(){ setSt(okMsg||'저장됨',true); }).catch(function(){ setSt('저장 실패'); });
  }, 500);
}
function saveTimetable(){ debouncedPut('ttTimer', {timetable: state.timetable||[]}, '일정표 저장됨'); }
function saveRoster(){ debouncedPut('rosterTimer', {roster: state.roster||[], teams: teamNames()}, 'R&R 저장됨'); }
/* ===== 운영 일정 편집 모달 ===== */
var evDraft=null;
function openEvent(id){
  var ex=id?eventList().filter(function(e){return e.id===id;})[0]:null;
  evDraft = ex ? clone(ex) : {id:mkid(), title:'', kind:'회의', start:todayISO(), end:'', owner:'', memo:'', _new:true};
  if(evDraft.start<'2026-06-15'||evDraft.start>'2026-08-09') evDraft.start='2026-07-06';
  if(!evDraft.end) evDraft.end=evDraft.start;
  renderEventModal();
  document.getElementById('ev-scrim').classList.add('show');
}
function closeEvent(){ document.getElementById('ev-scrim').classList.remove('show'); evDraft=null; }
function renderEventModal(){
  document.getElementById('ev-title').textContent = evDraft._new?'새 일정':'일정 편집';
  document.getElementById('ev-del').style.display = evDraft._new?'none':'inline-flex';
  var b=document.getElementById('ev-body');
  b.innerHTML=
    '<div class="evfld"><label>종류</label><div class="evkinds">'+
      EVENT_KINDS.map(function(kc){var on=evDraft.kind===kc[0]; return '<button type="button" class="evkind" data-k="'+kc[0]+'" style="'+(on?('background:'+kc[1]+';border-color:'+kc[1]+';color:#fff'):'')+'">'+kc[0]+'</button>';}).join('')+
    '</div></div>'+
    '<div class="evfld"><label>제목</label><input id="ev-f-title" type="text" class="evinput" value="'+esc(evDraft.title)+'" placeholder="예: 공모전 접수 / 주간 홍보부 회의"></div>'+
    '<div class="evfld"><label>기간 (시작 ~ 종료)</label><div class="evrow"><input id="ev-f-start" type="date" class="evinput" min="2026-06-15" max="2026-08-09" value="'+esc(evDraft.start)+'"><span class="evtilde">~</span><input id="ev-f-end" type="date" class="evinput" min="2026-06-15" max="2026-08-09" value="'+esc(evDraft.end)+'"></div></div>'+
    '<div class="evfld"><label>담당자</label><input id="ev-f-owner" type="text" class="evinput" value="'+esc(evDraft.owner)+'" placeholder="담당자"></div>'+
    '<div class="evfld"><label>메모</label><textarea id="ev-f-memo" class="evinput" rows="2">'+esc(evDraft.memo)+'</textarea></div>';
  b.querySelectorAll('.evkind').forEach(function(bt){ bt.onclick=function(){ evDraft.kind=bt.getAttribute('data-k'); renderEventModal(); }; });
  b.querySelector('#ev-f-title').oninput=function(){ evDraft.title=this.value; };
  b.querySelector('#ev-f-start').oninput=function(){ evDraft.start=this.value; var en=b.querySelector('#ev-f-end'); if(evDraft.end&&evDraft.end<this.value){ evDraft.end=this.value; en.value=this.value; } en.min=this.value; };
  b.querySelector('#ev-f-end').oninput=function(){ evDraft.end=this.value; };
  b.querySelector('#ev-f-owner').oninput=function(){ evDraft.owner=this.value; };
  b.querySelector('#ev-f-memo').oninput=function(){ evDraft.memo=this.value; };
}
function commitEvent(){
  if(!evDraft) return;
  if(!(evDraft.title||'').trim()){ toast('일정 제목을 입력하세요'); return; }
  if(!evDraft.end||evDraft.end<evDraft.start) evDraft.end=evDraft.start;
  var arr=eventList();
  var clean={id:evDraft.id, title:evDraft.title.trim(), kind:evDraft.kind, start:evDraft.start, end:evDraft.end, owner:(evDraft.owner||'').trim(), memo:evDraft.memo||''};
  var idx=-1; for(var i=0;i<arr.length;i++) if(arr[i].id===clean.id){ idx=i; break; }
  if(idx>=0) arr[idx]=clean; else arr.push(clean);
  saveEvents(); renderCalendar(); closeEvent(); toast('일정 저장됨');
}
function deleteEventCur(){
  if(!evDraft) return; if(!confirm('이 일정을 삭제할까요?')) return;
  state.events=eventList().filter(function(e){return e.id!==evDraft.id;});
  saveEvents(); renderCalendar(); closeEvent(); toast('일정 삭제됨');
}
function addNote(k, text){
  if(!text||!text.trim()) return;
  setSt('메모 저장 중…');
  fetch('/api/jamboree-plan',{method:'PUT',headers:authJsonHeaders(),
    body:JSON.stringify({slotKey:k, addNote:{text:text}, author:authorVal()})})
    .then(function(r){return r.json();})
    .then(function(j){ if(j&&j.slot){ state.notes[k]=j.slot.notes||[]; applyMeta(k,j.slot); saveLocal(); refreshModal(); setSt('메모 저장됨',true); } else setSt('저장 실패'); })
    .catch(function(){ setSt('저장 실패 (네트워크)'); });
}
function reloadServer(){
  setSt('불러오는 중…');
  fetch('/api/jamboree-plan',{headers:authHeader()}).then(function(r){ if(r.status===401){ authExpired(); throw new Error('401'); } return r.json(); }).then(function(j){
    applyServer(j); saveLocal(); renderAll(); setSt('서버에서 불러옴',true); toast('서버 데이터 불러옴');
  }).catch(function(){ setSt('불러오기 실패'); });
}

/* ===== meta / header ===== */
function hdr(){ return Object.assign({},HEADER_DEF,state.header||{}); }
function renderHeader(){
  var h=hdr();
  document.getElementById('m-title').textContent=h.title;
  document.getElementById('m-slogan').textContent=h.slogan;
  document.getElementById('m-meta').innerHTML =
    '<span><b>행사기간</b> '+h.period+'</span><span><b>장소</b> '+h.place+'</span>';
  loadWeather();   // 헤더 컴팩트 날씨(회기와 D-day 사이) — 모든 뷰에서 항상 보이게
  renderClock();
}
// 개영식 = 2026-08-05 20:00 (KST). 시·분·초 라이브 카운트다운.
var EVENT_DT = new Date(2026,7,5,20,0,0);
function renderClock(){
  var cl=document.getElementById('m-clock'), sub=document.getElementById('m-clocksub'); if(!cl) return;
  var diff=EVENT_DT-new Date();
  if(diff<=0){ cl.textContent='D-DAY · 개영!'; sub.textContent='개영식 2026-08-05 20:00 시작'; return; }
  var d=Math.floor(diff/86400000), h=Math.floor(diff%86400000/3600000), m=Math.floor(diff%3600000/60000), sc=Math.floor(diff%60000/1000);
  cl.innerHTML='D-'+d+' <span class="hms">'+pad2(h)+':'+pad2(m)+':'+pad2(sc)+'</span>';
  sub.textContent='개영식(2026-08-05 20:00)까지';
}
/* 대시보드 실시간 D-day 카운트다운 */
var dashClockTimer=null;
function ddayCountdownHTML(){ var diff=EVENT_DT-new Date(); if(diff<=0) return '<b>D-DAY</b> · 개영!'; var d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000),sc=Math.floor(diff%60000/1000); return 'D-'+d+' <span class="hms">'+pad2(h)+':'+pad2(m)+':'+pad2(sc)+'</span>'; }
function startDashClock(){ stopDashClock(); dashClockTimer=setInterval(function(){ var el=document.getElementById('dash-dday-t'); if(!el){ stopDashClock(); return; } el.innerHTML=ddayCountdownHTML(); }, 1000); }
function stopDashClock(){ if(dashClockTimer){ clearInterval(dashClockTimer); dashClockTimer=null; } }
/* 승인 대기 회원 수(관리자) — 대시보드 액션 큐용, 1회 캐시 */
var dashMembersPending=null;
function loadDashMembers(){ if(!Auth.isAdmin()) return; fetch('/api/jp-members',{headers:authHeader()}).then(function(r){ return r.ok?r.json():null; }).then(function(j){ if(j&&j.members){ dashMembersPending=j.members.filter(function(m){return m.status!=='approved';}).length; if(curViewMode==='dashboard') renderDashboard(); } }).catch(function(){}); }

/* ===== calendar ===== */
/* 좁은 셀에서 잘리는 제목 → 호버 시 전체 제목 커스텀 툴팁 */
function calTipEl(){ var t=document.getElementById('caltip'); if(!t){ t=document.createElement('div'); t.id='caltip'; t.className='caltip'; document.body.appendChild(t); } return t; }
function hideCalTip(){ var t=document.getElementById('caltip'); if(t) t.classList.remove('show'); }
function showCalTip(el, date){
  var rec=byDate[date]; var k=el.getAttribute('data-sk'); var s=findSlot(rec,k); if(!s){ hideCalTip(); return; }
  var e=peek(k);
  var title=e.title||s.seedTitle||(s.category+' · 비어있음');
  var ctype=e.ctype?(ctchip(e.ctype)+' '):'';
  var meta=[rec.label+'('+rec.weekday+')', rec.dlabel||rec.phase];
  if(e.time) meta.push(e.time);
  meta.push(s.category, STATUS_LABEL[e.status||'planned']);
  if(e.posted) meta.push('게시됨');
  if(e.owner) meta.push('담당 '+e.owner);
  var chs=(e.channels||[]); if(e.title && chs.length) meta.push(chs.join('·'));
  var bits=[]; if(hasLink(e)) bits.push('링크 '+linkCount(e)); if(e.images&&e.images.length) bits.push('이미지 '+e.images.length); if(e.files&&e.files.length) bits.push('첨부 '+e.files.length); if(hist(k).length) bits.push('SNS문구 '+hist(k).length);
  if(e.tags) bits.push(e.tags);
  var tip=calTipEl();
  tip.innerHTML='<div class="ctt">'+ctype+esc(title)+'</div><div class="ctm">'+esc(meta.filter(Boolean).join(' · '))+'</div>'+(bits.length?'<div class="ctm">'+esc(bits.join(' · '))+'</div>':'');
  tip.classList.add('show');
  var r=el.getBoundingClientRect(), tw=tip.offsetWidth, th=tip.offsetHeight;
  var left=Math.max(8, Math.min(r.left, window.innerWidth-tw-8));
  var top=r.top-th-8; if(top<8) top=r.bottom+8;
  tip.style.left=left+'px'; tip.style.top=top+'px';
}
var searchQ='', searchTimer=null;
function matchSearch(d,s,e){
  var q=(searchQ||'').trim().toLowerCase(); if(!q) return true;
  var hay=[e.title,s.seedTitle,e.ctype,s.category,d.label,d.dlabel,(e.channels||[]).join(' '),TYPE_LABEL[s.type]].join(' ');
  var links=e.links||{}; Object.keys(links).forEach(function(c){ hay+=' '+(links[c]||''); });
  hist(s.k).forEach(function(h){ hay+=' '+(h.html||'').replace(/<[^>]*>/g,' '); });
  notesOf(s.k).forEach(function(n){ hay+=' '+(n.text||''); });
  return hay.toLowerCase().indexOf(q)>=0;
}
function renderCalendar(){
  hideCalTip();
  var cal=document.getElementById('cal'); cal.innerHTML='';
  WD.forEach(function(h,i){var el=document.createElement('div');el.className='h'+(i===0?' sun':i===6?' sat':'');el.textContent=h;cal.appendChild(el);});
  var first=ymd(DAYS[0].date); first.setDate(first.getDate()-first.getDay());
  var last=ymd(DAYS[DAYS.length-1].date); last.setDate(last.getDate()+(6-last.getDay()));
  var q=(searchQ||'').trim();
  var elay=layoutEvents();
  for(var dt=new Date(first); dt<=last; dt.setDate(dt.getDate()+1)){
    var rec=byDate[iso(dt)];
    var cell=document.createElement('div');
    if(!rec){cell.className='cell empty';cal.appendChild(cell);continue;}
    cell.className='cell clickable'+(rec.today?' today':'')+(rec.past?' past':'');
    cell.setAttribute('data-date',rec.date);
    var tint = CAT_TINT[rec.phase]||'#fff';
    cell.style.background=tint;
    var slots=daySlots(rec);
    var ql=q.toLowerCase();
    var smatch=function(s){ return !q || matchSearch(rec,s,peek(s.k)); };
    // 검색 시: 일치 항목만 색, 나머지는 회색(.ghost) — 숨기지 않음
    var dots=slots.map(function(s){ var st=peek(s.k).status||'planned'; var g=q&&!smatch(s); return '<span class="sdot'+(g?' ghost':'')+'" style="background:'+(g?'#cfd3cd':STCOL[st])+'" title="'+STATUS_LABEL[st]+'"></span>'; }).join('');
    var html='<div class="ctop"><span class="date">'+rec.label+(dots?(' <span class="sdots">'+dots+'</span>'):'')+'</span><span class="dd mono">'+rec.dlabel+'</span></div>';
    // 운영 일정(여러 날 연속) 띠 — 콘텐츠와 분리된 일정 레이어
    if(elay.lanes){
      var bands='';
      for(var li=0; li<elay.lanes; li++){
        var be=null; for(var bi=0;bi<elay.items.length;bi++){ var x=elay.items[bi]; if(x.lane===li && x.s<=rec.date && x.en>=rec.date){ be=x; break; } }
        if(be){ var isS=be.s===rec.date, isE=be.en===rec.date, wkS=(dt.getDay()===0);
          var eg=q&&((be.e.title||'')+' '+(be.e.kind||'')).toLowerCase().indexOf(ql)<0;
          bands+='<div class="eband citem-ev'+(eg?' ghost':'')+'" data-ev="'+be.e.id+'" title="'+esc(be.e.title+' · '+be.s+'~'+be.en)+'" style="background:'+(eg?'#d7dad4':eventColor(be.e.kind))+';'+(isS?'border-top-left-radius:6px;border-bottom-left-radius:6px;':'')+(isE?'border-top-right-radius:6px;border-bottom-right-radius:6px;':'')+'">'+((isS||wkS)?esc(be.e.title):'')+'</div>';
        } else bands+='<div class="eband ph"></div>';
      }
      html+='<div class="bands">'+bands+'</div>';
    }
    // 실제 콘텐츠=부각 / 시드=옅게 / 빈 슬롯=작은 칩 — 검색 비일치=회색
    var minis='';
    slots.forEach(function(s){
      var e=peek(s.k), typ=ctchip(e.ctype), g=q&&!smatch(s);
      if(e.title){
        var mt=isMeeting(e);
        html+='<div class="cline filled citem'+(mt?' meeting':'')+(g?' ghost':'')+'" data-sk="'+s.k+'"'+((mt&&!g)?(' style="border-left-color:'+ctypeColor(e.ctype)+'"'):'')+'>'+typ+esc(e.title)+'</div>';
      } else if(s.seedTitle){
        html+='<div class="cline seed citem'+(g?' ghost':'')+'" data-sk="'+s.k+'">'+esc(s.seedTitle)+'</div>';
      } else {
        minis+='<span class="cmini citem'+(g?' ghost':'')+'" data-sk="'+s.k+'">'+TYPE_LABEL[s.type]+'</span>';
      }
    });
    if(minis) html+='<div class="cminis">'+minis+'</div>';
    // 의전 일정 — 이벤트(활동)별로 묶고, 참여자를 '구분(대회장 등)+이름'으로 표기(직책 총재 X). 시간 지정 항목만. 검색 비일치=회색
    var prToday=protocolList().filter(function(p){ return p.date===rec.date && (p.time||'').trim(); });
    if(prToday.length){
      var evGroups={}, evOrder=[];
      prToday.forEach(function(p){ var k=JSON.stringify([p.time||'', p.activity||'']); if(!evGroups[k]){ evGroups[k]={time:p.time, activity:p.activity, people:[], first:p}; evOrder.push(k); } evGroups[k].people.push(p); });
      evOrder.sort(function(a,b){ return (evGroups[a].time||'').localeCompare(evGroups[b].time||''); }).forEach(function(k){
        var g=evGroups[k];
        var ppl=g.people.slice().sort(function(x,y){ var ra=protRoleRank(x.role), rb=protRoleRank(y.role); if(ra!==rb) return ra-rb; return (x.name||'').localeCompare(y.name||'','ko'); });
        var pplRaw=ppl.map(function(x){ return ((x.role||'')+' '+(x.name||'')).trim(); });
        var evName=g.activity||g.first.role||'의전';
        var pg=q&&((evName+' '+pplRaw.join(' ')).toLowerCase().indexOf(ql)<0);
        html+='<div class="cline protocol citem-pr'+(pg?' ghost':'')+'" data-pid="'+esc(g.first.id)+'" title="'+esc('의전 · '+(g.time||'')+' '+evName+' · '+pplRaw.join(', '))+'"><span class="prtag">의전</span>'+(g.time?('<span class="pr-time">'+esc(g.time)+'</span> '):'')+'<b class="pr-name">'+esc(evName)+'</b> '+pplRaw.map(function(t){return esc(t);}).join(' · ')+'</div>';
      });
    }
    // 디데이 프로젝트 승인 카드(자동 연동) — 사진·문구 표시(홍보부 SNS 카드뉴스 준비용)
    dcountApproved.filter(function(a){ return a.targetDate===rec.date; }).forEach(function(a){
      // 사진 URL 도 외부 입력(디데이 신청자 업로드) — esc 없이 넣으면 속성 탈출 XSS 경로가 된다
      var ph=(a.photos||[]).slice(0,3).map(function(u){ return /^\/api\/image\?id=[A-Za-z0-9_-]+$/.test(u||'') ? '<img src="'+esc(u)+'" data-img="'+esc(u)+'" class="dcph" alt="">' : ''; }).join('');
      html+='<div class="cline dcard" title="'+esc('디데이 카드 D-'+a.dNumber+(a.name?(' · '+a.name):'')+(a.teaser?(' — '+a.teaser):''))+'" style="cursor:pointer;border-left:3px solid #C8821C;background:rgba(216,162,74,.14);color:#E3C07E;font-weight:700">'
        +'★ 디데이 D-'+a.dNumber+(a.name?(' · '+esc(a.name)):'')
        +(a.teaser?('<div style="font-weight:400;font-size:11px;color:#CBA968;white-space:normal;margin-top:2px">'+esc(a.teaser)+'</div>'):'')
        +(ph?('<div class="dcphs">'+ph+'</div>'):'<div style="font-weight:400;font-size:10px;color:#B99458;margin-top:2px">사진 업로드 대기</div>')
        +'</div>';
    });
    html+='<button class="cadd" title="이 날짜에 콘텐츠 추가" aria-label="콘텐츠 추가">'+icon('plus',13)+'</button>';
    cell.innerHTML=html;
    (function(rc){
      // 콘텐츠는 콘텐츠 단위로 열림(일자 단위 X)
      cell.querySelectorAll('.citem[data-sk]').forEach(function(el){
        el.addEventListener('click',function(ev){ ev.stopPropagation(); var sl=findSlot(byDate[rc.date], el.getAttribute('data-sk')); if(sl) openSlot(rc.date, sl); });
        el.addEventListener('mouseenter',function(){ showCalTip(el, rc.date); });
        el.addEventListener('mouseleave',hideCalTip);
      });
      cell.querySelectorAll('.eband[data-ev]').forEach(function(el){
        el.addEventListener('click',function(ev){ ev.stopPropagation(); openEvent(el.getAttribute('data-ev')); });
      });
      cell.querySelectorAll('.citem-pr[data-pid]').forEach(function(el){
        el.addEventListener('click',function(ev){ ev.stopPropagation(); setView('protocol'); });
      });
      cell.querySelectorAll('.cline.dcard').forEach(function(el){
        el.addEventListener('click',function(ev){ ev.stopPropagation(); var im=ev.target.closest('.dcph'); if(im&&im.getAttribute('data-img')){ window.open(im.getAttribute('data-img'),'_blank'); } else { window.open('/krjam-dcount','_blank'); } });
      });
      // 드래그앤드랍: 실제 콘텐츠(filled)만 드래그해 다른 날짜로 이동
      cell.querySelectorAll('.cline.filled[data-sk]').forEach(function(el){
        el.setAttribute('draggable','true');
        el.addEventListener('dragstart',function(ev){ ev.stopPropagation(); var k=el.getAttribute('data-sk'); dragSrc={key:k, slot:findSlot(byDate[rc.date],k), date:rc.date}; el.classList.add('dragging'); try{ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',k);}catch(e){} });
        el.addEventListener('dragend',function(){ el.classList.remove('dragging'); clearDropTargets(); dragSrc=null; });
      });
      cell.addEventListener('dragover',function(ev){ if(dragSrc && dragSrc.date!==rc.date){ ev.preventDefault(); try{ev.dataTransfer.dropEffect='move';}catch(e){} cell.classList.add('dragover'); } });
      cell.addEventListener('dragleave',function(ev){ if(ev.target===cell) cell.classList.remove('dragover'); });
      cell.addEventListener('drop',function(ev){ ev.preventDefault(); cell.classList.remove('dragover'); if(dragSrc && dragSrc.date!==rc.date){ moveContent(dragSrc.key, dragSrc.slot, dragSrc.date, rc.date); } dragSrc=null; });
      var ab=cell.querySelector('.cadd');
      if(ab) ab.addEventListener('click',function(ev){ ev.stopPropagation(); var k=addContent(rc.date); var sl=findSlot(byDate[rc.date],k); renderAfterEdit(k,sl); openSlot(rc.date, sl); });
    })(rec);
    cal.appendChild(cell);
  }
}

/* ===== content slots ===== */
function daySlots(rec){
  // returns [{type,category,seedTitle,k,seed?,extra?,eid?}] for a day (seed items + extra), hidden filtered
  var arr=rec.items.map(function(it){return {type:it.type,category:it.category,seedTitle:it.seedTitle,k:key(rec.date,it.type),seed:true};})
    .filter(function(s){ return !state.hidden[s.k]; });
  (state.extra[rec.date]||[]).forEach(function(x){
    arr.push({type:'extra',category:x.category||'콘텐츠',seedTitle:'',k:rec.date+'#extra#'+x.id,extra:true,eid:x.id});
  });
  return arr;
}
function findSlot(rec,k){ var a=daySlots(rec); for(var i=0;i<a.length;i++) if(a[i].k===k) return a[i]; return null; }
function deleteSlot(date, s){
  if(s.extra){ state.extra[date]=(state.extra[date]||[]).filter(function(x){return x.id!==s.eid;}); }
  else { state.hidden[s.k]=true; }   // seed slot → hide
  delete state.edits[s.k];
}
function addContent(date){
  if(!state.extra[date]) state.extra[date]=[];
  var x={id:mkid(),category:'콘텐츠'}; state.extra[date].push(x);
  return date+'#extra#'+x.id;
}
var curFilter={kind:'all'};
var STCOL={planned:'#4C554D',draft:'#8A5A0B',ready:'#1F6B4F'};   // 솔리드·점 — 흰 글씨 7.74/5.92/6.41 (이전 2.67/3.15/3.99 미달)
var STCHIP={planned:['rgba(255,255,255,.07)','#B7C0B8'],draft:['rgba(232,165,75,.14)','#E8A54B'],ready:['rgba(59,227,138,.13)','#66DDA0']};   // [연배경, 잉크] — 배지용
var STAGES=[['planned','기획'],['draft','작성중'],['ready','완료']];
function matchFilter(d,s,e){
  var f=curFilter; if(!f||f.kind==='all') return true;
  if(f.kind==='type')    return s.type===f.v;
  if(f.kind==='phase')   return d.phase===f.v;
  if(f.kind==='channel') return (e.channels||[]).indexOf(f.v)>=0;
  if(f.kind==='ctype')   return (e.ctype||'')===f.v;
  if(f.kind==='status')  return (e.status||'planned')===f.v;
  return true;
}
function renderFilters(){
  var box=document.getElementById('filters'); if(!box) return; box.innerHTML='';
  function btnEl(kind,v,label){
    var on=(curFilter.kind===kind && (kind==='all'||curFilter.v===v));
    var b=document.createElement('button'); b.className='filterbtn'+(on?' active':''); b.textContent=label;
    b.onclick=function(){ curFilter=(kind==='all')?{kind:'all'}:{kind:kind,v:v}; renderFilters(); renderBoard(); };
    return b;
  }
  function row(label, items){
    var r=document.createElement('div'); r.className='frow';
    var l=document.createElement('span'); l.className='flabel'; l.textContent=label; r.appendChild(l);
    items.forEach(function(it){ r.appendChild(btnEl(it[0],it[1],it[2])); });
    box.appendChild(r);
  }
  // 구분 토글(콘텐츠/회의) — curFilter와 독립
  var kr=document.createElement('div'); kr.className='frow';
  var kl=document.createElement('span'); kl.className='flabel'; kl.textContent='구분'; kr.appendChild(kl);
  [['all','전체'],['content','콘텐츠'],['meeting','회의']].forEach(function(it){
    var kb=document.createElement('button'); kb.className='filterbtn kindbtn'+(kindFilter===it[0]?' active':''); kb.textContent=it[1];
    kb.onclick=function(){ kindFilter=it[0]; renderFilters(); renderBoard(); };
    kr.appendChild(kb);
  });
  box.appendChild(kr);
  row('필터', [['all',null,'전체 보기']]);
  row('유형', [['type','dcount','D-count'],['type','event','이벤트'],['type','extra','추가']]);
  row('단계', ['한국 대표단','외국 대표단','피날레','휴지기'].map(function(p){return ['phase',p,p];}));
  row('채널', CHANNELS.map(function(c){return ['channel',c,c];}));
  row('상태', STAGES.map(function(st){return ['status',st[0],st[1]];}));
  var tl=typeList(); if(tl.length) row('종류', tl.map(function(t){return ['ctype',t,t];}));
}
var kindFilter='all';   // all | content | meeting
function matchKind(e){ return kindFilter==='all' || (kindFilter==='meeting'? isMeeting(e) : !isMeeting(e)); }

/* ===== 보드: 빈 슬롯 숨김 · 정렬 · 필터바 접기 ===== */
/* 아직 아무도 손대지 않은 시드 슬롯 — 기본으로 숨겨 기획 칼럼이 도배되는 걸 막는다 */
function isBlankSlot(k,e){ return isDefaultEdit(e) && !hist(k).length && !notesOf(k).length; }
var BSORTS=[['date','날짜'],['due','마감'],['owner','담당자'],['title','제목']];
var showEmpty=false, filtersOpen=false, boardSort='date', boardDrag=null;
try{ showEmpty=localStorage.getItem('jamboree-plan:show-empty')==='1'; }catch(e){}
try{ boardSort=localStorage.getItem('jamboree-plan:board-sort')||'date'; }catch(e){}
function sortCards(items){
  var a=items.slice(), FAR='￿';
  if(boardSort==='due')        a.sort(function(x,y){ var dx=x.e.due||FAR, dy=y.e.due||FAR; return dx===dy? x.d.date.localeCompare(y.d.date) : dx.localeCompare(dy); });
  else if(boardSort==='owner') a.sort(function(x,y){ var ox=x.e.owner||FAR, oy=y.e.owner||FAR; return ox===oy? x.d.date.localeCompare(y.d.date) : ox.localeCompare(oy,'ko'); });
  else if(boardSort==='title') a.sort(function(x,y){ return (x.e.title||x.s.seedTitle||FAR).localeCompare(y.e.title||y.s.seedTitle||FAR,'ko'); });
  return a;   // date = DAYS 순회 그대로(기존 동작)
}
function filterSummary(){
  var out=[];
  if(kindFilter!=='all') out.push(kindFilter==='meeting'?'회의':'콘텐츠');
  if(curFilter.kind!=='all'){
    var lbl={type:'유형',phase:'단계',channel:'채널',ctype:'종류',status:'상태'}[curFilter.kind]||'', v=curFilter.v;
    if(curFilter.kind==='type') v=TYPE_LABEL[v]||v;
    if(curFilter.kind==='status'){ var f=STAGES.filter(function(st){return st[0]===v;})[0]; v=f?f[1]:v; }
    out.push(lbl+' '+v);
  }
  if((searchQ||'').trim()) out.push('검색 “'+searchQ.trim()+'”');
  return out;
}
var boardBlank=0;
function renderBoardBar(blank){
  if(blank!=null) boardBlank=blank;
  var seg=document.getElementById('board-sort');
  if(seg) seg.innerHTML=BSORTS.map(function(s){ return '<button data-bsort="'+s[0]+'"'+(boardSort===s[0]?' class="on"':'')+'>'+s[1]+'</button>'; }).join('');
  var te=document.getElementById('toggle-empty');
  if(te){ te.classList.toggle('solid',showEmpty); te.textContent=(showEmpty?'빈 슬롯 숨기기':'빈 슬롯 보기')+(boardBlank?(' ('+boardBlank+')'):''); }
  var ft=document.getElementById('filters-toggle');
  if(ft){ var sum=filterSummary();
    ft.classList.toggle('solid',!!sum.length);
    ft.textContent=(filtersOpen?'▾ ':'▸ ')+'필터'+(sum.length?(' · '+sum.join(' · ')):' · 전체');
  }
}
/* ===== 마감일 · 승인 ===== */
var APPROVAL_LABEL={none:'',requested:'검수 요청',approved:'승인됨',rejected:'반려됨'};
function dueState(e){ // '' | 'soon'(오늘~내일) | 'over'(지남) — 미게시 콘텐츠만
  if(!e||!e.due||e.posted) return '';
  var today=todayISO(); if(e.due<today) return 'over';
  var days=Math.round((new Date(e.due+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
  return days<=1?'soon':'';
}
function dueBadge(e){ if(!e||!e.due) return ''; var ds=dueState(e); var lbl='마감 '+e.due.slice(5);
  if(ds==='over') return '<span class="duebadge over">'+lbl+' 지남</span>';
  if(ds==='soon') return '<span class="duebadge soon">'+lbl+' 임박</span>';
  return '<span class="duebadge">'+lbl+'</span>'; }
function approvalBadge(e){ var a=(e&&e.approval)||{}; if(!a.state||a.state==='none') return ''; return '<span class="apbadge ap-'+a.state+'">'+(APPROVAL_LABEL[a.state]||'')+'</span>'; }
function dueItems(){ var out=[]; DAYS.forEach(function(d){ daySlots(d).forEach(function(s){ var e=peek(s.k); if(isMeeting(e)) return; var ds=dueState(e); if(ds) out.push({d:d,s:s,e:e,ds:ds}); }); }); return out; }
/* 마감 알림(브라우저 Notification) */
var NOTIF_KEY='jamboree-plan:due-notified';
function notifiedSet(){ try{ return JSON.parse(localStorage.getItem(NOTIF_KEY)||'{}'); }catch(e){ return {}; } }
function scanDueNotify(){
  if(!('Notification' in window) || Notification.permission!=='granted') return;
  var notified=notifiedSet(), today=todayISO(), changed=false;
  dueItems().forEach(function(it){ var key=it.s.k+'|'+today; if(notified[key]) return; notified[key]=1; changed=true;
    var title=it.e.title||it.s.seedTitle||'콘텐츠';
    try{ new Notification(it.ds==='over'?'마감 지난 콘텐츠':'마감 임박 콘텐츠',{body:title+' — 마감 '+(it.e.due||''),icon:'/jamboree/assets/logo.png',tag:it.s.k}); }catch(e){}
  });
  if(changed){ try{ localStorage.setItem(NOTIF_KEY,JSON.stringify(notified)); }catch(e){} }
}
function updateNotifyBtn(){ var b=document.getElementById('due-notify'); if(!b) return; var sup=('Notification' in window); var on=sup&&Notification.permission==='granted'; b.textContent=on?'🔔 마감 알림 켜짐':'🔔 마감 알림 켜기'; b.classList.toggle('solid',on); b.disabled=sup&&Notification.permission==='denied'; }
function enableDueNotify(){
  if(!('Notification' in window)){ toast('이 브라우저는 알림을 지원하지 않습니다'); return; }
  if(Notification.permission==='granted'){ toast('마감 알림이 이미 켜져 있습니다'); scanDueNotify(); return; }
  Notification.requestPermission().then(function(p){ updateNotifyBtn(); if(p==='granted'){ toast('마감 알림이 켜졌습니다'); scanDueNotify(); } else toast('알림 권한이 허용되지 않았습니다'); });
}
/* 콘텐츠 파이프라인 — 상태(status) + 검수(approval)를 합쳐 5단계로 파생.
   제보 인박스(tips) → 기획 → 작성중 → 검수 → 완료·게시. 검수는 기존 승인 필드에서 파생(중복 상태값 안 만듦). */
function pipelineStage(e){
  var st=e.status||'planned', ap=(e.approval&&e.approval.state)||'none';
  if(ap==='requested') return 'review';
  if(e.posted || st==='ready' || ap==='approved') return 'done';
  if(st==='draft') return 'draft';
  return 'planned';
}
var PIPE=[['planned','기획','var(--st-planned)'],['draft','작성중','var(--st-draft)'],['review','검수','#B69BFF'],['done','완료·게시','var(--st-ready)']];
function setPipelineStage(k,stage){
  var e=getEdit(k), a=normApproval(e.approval);
  if(stage==='planned'){ e.status='planned'; a.state='none'; }
  else if(stage==='draft'){ e.status='draft'; a.state='none'; }
  else if(stage==='review'){ a.state='requested'; if(e.status==='planned') e.status='draft'; }
  else if(stage==='done'){ e.status='ready'; if(a.state==='requested') a.state='approved'; }
  e.approval=a;
}
// 제보 인박스 카드 — 파이프라인 입구(홍보부만). "콘텐츠로 전환"이 제보를 콘텐츠 일정으로.
function inboxCard(t){
  var el=document.createElement('div'); el.className='card card-inbox';
  var meta=(t.date||'')+(t.time?(' '+t.time):'')+(t.zone?(' · '+tipZoneLabel(t.zone)):'');
  el.innerHTML='<div class="ic-src">'+icon('inbox',11)+' '+esc(t.source==='public'?'외부 제보':'제보')+(t.reporterName?(' · '+esc(t.reporterName)):'')+'</div>'+
    '<div class="ctitle">'+esc((t.text||'').replace(/\s+/g,' ').slice(0,64)||'(내용 없음)')+'</div>'+
    (meta.trim()?('<div class="crow1">'+esc(meta)+'</div>'):'')+
    '<button class="btn xs solid ic-conv" data-tipconv="'+esc(t.id)+'">콘텐츠로 전환 →</button>';
  return el;
}
var boardMStage='planned';   // 모바일: 한 번에 한 단계만
function renderBoard(){
  var board=document.getElementById('board'); if(!board) return;
  board.innerHTML='';
  var cols={planned:[],draft:[],review:[],done:[]}, total=0, ready=0, started=0, meetings=0, blank=0;
  DAYS.forEach(function(d){
    daySlots(d).forEach(function(s){
      var e=peek(s.k), st=e.status||'planned';
      if(isMeeting(e)){ meetings++; } else { total++; if(st==='ready'||e.posted) ready++; if(st!=='planned') started++; }
      if(isBlankSlot(s.k,e)){ blank++; if(!showEmpty) return; }
      var stg=pipelineStage(e);
      (cols[stg]||cols.planned).push({d:d,s:s,e:e});
    });
  });
  var staff=Auth.isStaff();
  // 제보 인박스 컬럼(홍보부만) — 파이프라인 맨 앞
  if(staff){
    if(!tipLoaded) loadTips();
    var newTips=tipLoaded?tipItems.filter(function(t){ return t.status==='new'; }):[];
    var ibx=document.createElement('div'); ibx.className='col col-inbox'; ibx.setAttribute('data-st','inbox');
    if(boardMStage==='inbox') ibx.classList.add('msel');
    ibx.innerHTML='<div class="colh"><span class="pin" style="background:var(--ch-fb)"></span>제보 인박스<span class="cnt">'+newTips.length+'</span></div>';
    var ic=document.createElement('div'); ic.className='cards';
    if(!tipLoaded){ ic.innerHTML='<div class="colempty">불러오는 중…</div>'; }
    else if(!newTips.length){ ic.innerHTML='<div class="colempty">새 제보 없음</div>'; }
    else newTips.forEach(function(t){ try{ ic.appendChild(inboxCard(t)); }catch(err){} });
    ibx.appendChild(ic); board.appendChild(ibx);
  }
  PIPE.forEach(function(def){
    var items=sortCards(cols[def[0]].filter(function(it){ return matchKind(it.e) && matchFilter(it.d, it.s, it.e) && matchSearch(it.d, it.s, it.e); }));
    var col=document.createElement('div'); col.className='col'; col.setAttribute('data-st',def[0]);
    if(boardMStage===def[0]) col.classList.add('msel');
    col.innerHTML='<div class="colh"><span class="pin" style="background:'+def[2]+'"></span>'+def[1]+'<span class="cnt">'+items.length+'</span></div>';
    var cards=document.createElement('div'); cards.className='cards';
    if(!items.length){ var em=document.createElement('div'); em.className='colempty'; em.textContent=(!showEmpty&&blank)?'없음 — 빈 슬롯은 숨김':'없음'; cards.appendChild(em); }
    items.forEach(function(it){ try{ cards.appendChild(cardEl(it.d,it.s,it.e)); }catch(err){ console.warn('card render skip',err); } });
    col.appendChild(cards);
    // 칼럼에 드롭 = 그 단계로 이동
    col.addEventListener('dragover',function(ev){ if(!boardDrag) return; ev.preventDefault(); try{ev.dataTransfer.dropEffect='move';}catch(e){} col.classList.add('dropcol'); });
    col.addEventListener('dragleave',function(ev){ if(ev.target===col) col.classList.remove('dropcol'); });
    col.addEventListener('drop',function(ev){
      ev.preventDefault(); col.classList.remove('dropcol');
      if(!boardDrag) return;
      var bd=boardDrag; boardDrag=null;
      if(pipelineStage(peek(bd.s.k))===def[0]) return;
      setPipelineStage(bd.s.k, def[0]); renderAfterEdit(bd.s.k,bd.s);
    });
    board.appendChild(col);
  });
  // 모바일 단계 세그먼트
  var mseg=document.getElementById('board-mseg');
  if(mseg){ var segs=(staff?[['inbox','인박스']]:[]).concat(PIPE.map(function(p){return [p[0],p[1]];}));
    mseg.innerHTML=segs.map(function(s){ return '<button data-mstage="'+s[0]+'"'+(boardMStage===s[0]?' class="on"':'')+'>'+s[1]+'</button>'; }).join('');
  }
  renderBoardBar(blank);
  document.getElementById('cnt-count').textContent='콘텐츠 '+total+' · 회의 '+meetings;
  var pct= total? Math.round(ready/total*100):0;
  document.getElementById('pfill').style.width=pct+'%';
  document.getElementById('ptext').textContent='콘텐츠 완료 '+ready+'/'+total+' ('+pct+'%) · 진행 시작 '+started+' · 회의 '+meetings+'건';
  var dbn=document.getElementById('due-banner');
  if(dbn){ var due=dueItems(), over=due.filter(function(x){return x.ds==='over';}).length, soon=due.filter(function(x){return x.ds==='soon';}).length;
    if(over||soon){ dbn.style.display=''; dbn.innerHTML='<span data-ic="clock" data-ic-size="15" style="vertical-align:-3px"></span> <b>마감 주의</b> — 임박 '+soon+'건'+(over?(' · 지남 '+over+'건'):'')+' (미게시 콘텐츠)'; var ic=dbn.querySelector('[data-ic]'); if(ic) ic.innerHTML=icon('clock',15); }
    else dbn.style.display='none';
  }
}
function chanClass(ch){ return ch==='인스타그램'?'ig':ch==='유튜브'?'yt':(ch==='페이스북'||!ch)?'':'etc'; }
function cardEl(d,s,e){
  var col=CAT_COLOR[s.category]||'var(--muted)';
  var title=e.title||s.seedTitle||'';
  var chs=(e.channels&&e.channels.length?e.channels:['페이스북']);
  var bits=[];
  if(e.posted) bits.push('<span class="postbadge">게시됨</span>');
  var ab=approvalBadge(e); if(ab) bits.push(ab);
  var db=dueBadge(e); if(db) bits.push(db);
  bits=bits.concat(chs.map(function(c){ return '<span class="chchip '+chanClass(c)+'">'+esc(c)+'</span>'; }));
  var ln=linkCount(e); if(ln) bits.push('<span class="minic">'+icon('link',13)+' '+ln+'</span>');
  if(e.images&&e.images.length) bits.push('<span class="minic">'+icon('image',13)+' '+e.images.length+'</span>');
  if(e.files&&e.files.length) bits.push('<span class="minic">'+icon('paperclip',13)+' '+e.files.length+'</span>');
  if(hist(s.k).length) bits.push('<span class="minic">'+icon('fileText',13)+' '+hist(s.k).length+'</span>');
  if(e.owner) bits.push('<span class="minic">'+icon('user',12)+' '+esc(e.owner)+'</span>');
  var card=document.createElement('div'); card.className='card'+(isMeeting(e)?' meetingcard':''); card.style.borderLeftColor=isMeeting(e)?ctypeColor(e.ctype):col;
  card.innerHTML=
    '<div class="crow1"><span class="dlab">'+(d.dlabel||'—')+'</span><span>'+d.label+' '+d.weekday+(e.time?(' · '+esc(e.time)):'')+'</span>'+
      '<span class="typebadge t-'+s.type+'" style="margin-left:auto">'+TYPE_LABEL[s.type]+'</span></div>'+
    '<div class="ccat" style="color:'+col+'">'+s.category+'</div>'+
    '<div class="ctitle'+(title?'':' empty')+'">'+(e.ctype?ctchip(e.ctype)+' ':'')+(title?esc(title):'제목 미입력 — 클릭해 작성')+'</div>'+
    '<div class="cmeta">'+bits.join('')+'</div>';
  var del=document.createElement('button'); del.className='cdel'; del.innerHTML=icon('trash',13); del.title='삭제';
  del.onclick=function(ev){ ev.stopPropagation(); if(confirm('이 콘텐츠를 삭제할까요?')){ deleteSlot(d.date,s); afterDelete(s.k); } };
  card.appendChild(del);
  var seg=document.createElement('div'); seg.className='seg';
  STAGES.forEach(function(st){
    var btn=document.createElement('button'); btn.textContent=st[1];
    if((e.status||'planned')===st[0]){ btn.style.background=STCOL[st[0]]; btn.style.color='#fff'; btn.style.fontWeight='700'; }
    btn.onclick=function(ev){ ev.stopPropagation(); getEdit(s.k).status=st[0]; renderAfterEdit(s.k,s); };
    seg.appendChild(btn);
  });
  card.appendChild(seg);
  card.draggable=true;
  card.addEventListener('dragstart',function(ev){ boardDrag={d:d,s:s}; card.classList.add('bdragging'); try{ ev.dataTransfer.effectAllowed='move'; ev.dataTransfer.setData('text/plain',s.k); }catch(e){} });
  card.addEventListener('dragend',function(){ boardDrag=null; card.classList.remove('bdragging'); document.querySelectorAll('.col.dropcol').forEach(function(c){c.classList.remove('dropcol');}); });
  card.addEventListener('click',function(){ openSlot(d.date,s); });
  return card;
}

/* ===== detail modal (day = all slots / slot = single) ===== */
/* 모달: 임시 draft에서 편집 → '저장' 버튼으로만 반영. 미저장 이탈 시 가드. */
var curView=null;  // {date, slot, draft, dirty}
var mdEditors=[];
function destroyEditors(){ mdEditors.forEach(function(ed){ try{ed.destroy();}catch(e){} }); mdEditors=[]; }
function clone(o){ try{ return JSON.parse(JSON.stringify(o||{})); }catch(e){ return {}; } }
function openSlot(date, slot){ if(!byDate[date]) return; curView={date:date, slot:slot, draft:clone(peek(slot.k)), dirty:false}; showModal(); }
function showModal(){
  var rec=byDate[curView.date], s=curView.slot, p=rec.date.split('-');
  document.getElementById('md-title').textContent=p[0]+'. '+(+p[1])+'. '+(+p[2])+'. ('+rec.weekday+')';
  var dd=rec.dday, until = dd>0?('개영식까지 '+dd+'일'):(dd===0?'개영식 당일':'행사 기간');
  document.getElementById('md-sub').textContent= s.category+' · '+TYPE_LABEL[s.type]+' · '+until;
  var bdg=document.getElementById('md-dbadge'); if(bdg){ bdg.textContent=rec.dlabel||'행사중'; bdg.className='md-dbadge'+(rec.dlabel==='D-DAY'?' dday':''); }
  refreshModal(); updateDirtyUI();
  document.getElementById('scrim').classList.add('show');
}
function refreshModal(){
  destroyEditors();
  var rec=byDate[curView.date], body=document.getElementById('md-body'); body.innerHTML='';
  body.appendChild(slotEl(rec, curView.slot, curView.draft));
}
function mark(){ if(curView){ curView.dirty=true; updateDirtyUI(); } }
function updateDirtyUI(){
  var d=document.getElementById('md-dirty'); if(d) d.textContent = (curView&&curView.dirty) ? '저장되지 않은 변경 있음' : '';
  var b=document.getElementById('md-save'); if(b) b.classList.toggle('on', !!(curView&&curView.dirty));
}
function commitDraft(){
  if(!curView) return;
  var k=curView.slot.k, s=curView.slot;
  state.edits[k]=clone(curView.draft);
  curView.dirty=false;
  renderCalendar(); renderBoard();
  doSaveCard(k,s);   // 즉시 서버 저장
}
function closeModal(){ destroyEditors(); hideGuard(); document.getElementById('scrim').classList.remove('show'); curView=null; }
function tryClose(){ if(curView && curView.dirty) showGuard(); else closeModal(); }
function saveAndClose(){ commitDraft(); closeModal(); toast('저장되었습니다'); }
function discardAndClose(){ closeModal(); toast('변경 사항을 되돌렸습니다'); }
function showGuard(){ var g=document.getElementById('md-guard'); if(g) g.classList.add('show'); }
function hideGuard(){ var g=document.getElementById('md-guard'); if(g) g.classList.remove('show'); }
function slotEl(rec,s,e){
  if(!e) e=getEdit(s.k);
  var meeting=isMeeting(e);
  var wrap=document.createElement('div'); wrap.className='slot'+(meeting?' mtg':'');
  var col=CAT_COLOR[s.category]||'var(--muted)';
  var head=document.createElement('div'); head.className='shead';
  head.innerHTML='<span class="chip" style="background:'+col+'1A;color:'+col+'">'+s.category+'</span>'+
    '<span class="typebadge t-'+s.type+'">'+TYPE_LABEL[s.type]+'</span>';
  var rm=document.createElement('button'); rm.className='rm'; rm.innerHTML=icon('trash',13)+' 삭제';
  rm.onclick=function(){
    if(!confirm('이 콘텐츠를 삭제할까요? (즉시 삭제)')) return;
    var dk=s.k, dt=curView.date;
    deleteSlot(dt, s);
    closeModal();
    afterDelete(dk);
  };
  head.appendChild(rm);
  wrap.appendChild(head);

  // 마지막 작업자 · IP
  var le=document.createElement('div'); le.className='lastedit'; le.setAttribute('data-lastedit', s.k); le.textContent=lastEditText(s.k);
  wrap.appendChild(le);

  // 상태 (맨 위, 세그먼트)
  var stWrap=document.createElement('div'); stWrap.className='fld';
  stWrap.innerHTML='<label>상태</label>';
  var seg=document.createElement('div'); seg.className='seg statusseg';
  STAGES.forEach(function(st){
    var btn=document.createElement('button'); btn.type='button'; btn.textContent=st[1];
    function paint(){ var on=((e.status||'planned')===st[0]); btn.style.background=on?STCOL[st[0]]:''; btn.style.color=on?'#fff':''; btn.style.fontWeight=on?'700':''; }
    paint();
    btn.onclick=function(){ e.status=st[0]; seg.querySelectorAll('button').forEach(function(b,i){ var on=(STAGES[i][0]===e.status); b.style.background=on?STCOL[e.status]:''; b.style.color=on?'#fff':''; b.style.fontWeight=on?'700':''; }); mark(); };
    seg.appendChild(btn);
  });
  stWrap.appendChild(seg); wrap.appendChild(stWrap);

  // 콘텐츠 종류(추가/삭제 드롭다운) + 제목 (같은 줄)
  var titleFld=document.createElement('div'); titleFld.className='fld';
  titleFld.innerHTML='<label>콘텐츠 종류 · 제목</label>';
  var trow=document.createElement('div'); trow.className='titlerow';
  trow.appendChild(buildTypeCombo(e,s));
  var titleInp=inputEl('text', e.title||s.seedTitle||'', s.seedTitle||'예: 참가국 ① 일본 대표단', function(v){ e.title=v; mark(); });
  titleInp.className='titleinp';
  trow.appendChild(titleInp);
  titleFld.appendChild(trow); wrap.appendChild(titleFld);

  // 게시 시간 · 담당자 · 게시 완료 (SNS 운영)
  var metaFld=document.createElement('div'); metaFld.className='fld';
  metaFld.innerHTML='<label>'+(meeting?'회의 시간 · 담당자':'게시 예정 시간 · 담당자')+'</label>';
  var mrow=document.createElement('div'); mrow.className='row2';
  var th=t2h(e.time); var thh=th!=null?Math.floor(th):'', tmm=th!=null?Math.round((th-Math.floor(th))*60):'';
  var timeInp=document.createElement('span'); timeInp.className='evtimegrp';
  timeInp.innerHTML='<input type="number" class="evtime" min="0" max="23" value="'+thh+'" inputmode="numeric" aria-label="시"><span class="evcolon">:</span><input type="number" class="evtime" min="0" max="59" step="5" value="'+tmm+'" inputmode="numeric" aria-label="분">';
  (function(){ var hi=timeInp.children[0], mi=timeInp.children[2]; function upd(){ if(hi.value===''&&mi.value===''){ e.time=''; mark(); return; } var h=Math.max(0,Math.min(23,parseInt(hi.value,10)||0)), m=Math.max(0,Math.min(59,parseInt(mi.value,10)||0)); e.time=pad2(h)+':'+pad2(m); mark(); } hi.oninput=upd; mi.oninput=upd; })();
  var ownerInp=inputEl('text', e.owner||'', meeting?'주재/담당자':'담당자 이름', function(v){ e.owner=v; mark(); });
  mrow.appendChild(timeInp); mrow.appendChild(ownerInp); metaFld.appendChild(mrow);
  var postWrap=document.createElement('label'); postWrap.className='posttoggle sns-only'+(e.posted?' on':'');
  var pchk=document.createElement('input'); pchk.type='checkbox'; pchk.checked=!!e.posted;
  var pstat=document.createElement('span'); pstat.className='poststat';
  function pstatTxt(){ return e.posted?('게시 완료'+(e.postedAt?(' · '+fmtDateTime(e.postedAt)):'')):'아직 게시 전'; }
  pstat.textContent=pstatTxt();
  pchk.onchange=function(){ e.posted=pchk.checked; e.postedAt=pchk.checked?new Date().toISOString():''; postWrap.classList.toggle('on',pchk.checked); pstat.textContent=pstatTxt(); mark(); };
  postWrap.appendChild(pchk); postWrap.appendChild(document.createTextNode(' 게시 완료 ')); postWrap.appendChild(pstat);
  metaFld.appendChild(postWrap); wrap.appendChild(metaFld);

  // 마감일 + 승인 (콘텐츠만)
  var dueFld=document.createElement('div'); dueFld.className='fld sns-only';
  dueFld.innerHTML='<label>마감일 (이 날짜까지 게시 · 선택) · 검수/승인</label>';
  var dueInp=document.createElement('input'); dueInp.type='date'; dueInp.className='evinput duein'; dueInp.value=e.due||''; dueInp.min='2026-06-15'; dueInp.max='2026-08-31';
  dueInp.onchange=function(){ e.due=dueInp.value; mark(); };
  dueFld.appendChild(dueInp);
  var apWrap=document.createElement('div'); apWrap.className='apctrl';
  function renderAp(){
    apWrap.innerHTML=''; var a=e.approval=normApproval(e.approval);
    var now=document.createElement('span'); now.className='apnow ap-'+(a.state||'none');
    now.textContent= a.state==='approved'?('승인됨'+(a.by?(' · '+a.by):'')) : a.state==='rejected'?('반려됨'+(a.note?(' · '+a.note):'')) : a.state==='requested'?'검수 요청됨':'검수 전';
    apWrap.appendChild(now);
    var btns=document.createElement('div'); btns.className='apbtns';
    function apBtn(label,cls,fn){ var b=document.createElement('button'); b.type='button'; b.className='btn xs '+cls; b.textContent=label; b.onclick=fn; btns.appendChild(b); }
    if(a.state!=='requested'&&a.state!=='approved') apBtn('검수 요청','ghost',function(){ a.state='requested'; a.at=new Date().toISOString(); a.by=Auth.name||Auth.username||''; renderAp(); mark(); });
    if(Auth.isStaff()){
      if(a.state!=='approved') apBtn('승인','solid',function(){ a.state='approved'; a.by=Auth.name||Auth.username||'홍보부'; a.at=new Date().toISOString(); a.note=''; renderAp(); mark(); });
      if(a.state!=='rejected') apBtn('반려','danger',function(){ var n=prompt('반려 사유 (선택)')||''; a.state='rejected'; a.note=n.slice(0,300); a.by=Auth.name||Auth.username||''; a.at=new Date().toISOString(); renderAp(); mark(); });
    }
    if(a.state!=='none') apBtn('해제','ghost',function(){ a.state='none'; a.by=''; a.at=''; a.note=''; renderAp(); mark(); });
    apWrap.appendChild(btns);
  }
  renderAp();
  dueFld.appendChild(apWrap); wrap.appendChild(dueFld);

  // 채널 (복수 선택)
  var chWrap=document.createElement('div'); chWrap.className='fld sns-only';
  chWrap.innerHTML='<label>채널 (복수 선택 가능)</label>';
  var chTog=document.createElement('div'); chTog.className='chtoggles';
  CHANNELS.forEach(function(c){
    var chip=document.createElement('button'); chip.type='button'; chip.className='chtog'+(e.channels.indexOf(c)>=0?' on':''); chip.textContent=c;
    chip.onclick=function(){
      var i=e.channels.indexOf(c);
      if(i>=0){ if(e.channels.length>1) e.channels.splice(i,1); else { toast('채널은 최소 1개'); return; } }
      else e.channels.push(c);
      chip.classList.toggle('on', e.channels.indexOf(c)>=0);
      renderLinks(); mark();
    };
    chTog.appendChild(chip);
  });
  chWrap.appendChild(chTog); wrap.appendChild(chWrap);

  // 콘텐츠 링크 — 선택한 채널별로 "채널 / 링크" 자동 생성
  var linkFld=document.createElement('div'); linkFld.className='fld sns-only';
  linkFld.innerHTML='<label>콘텐츠 링크 (채널별)</label>';
  var linksWrap=document.createElement('div'); linksWrap.className='linkswrap';
  function renderLinks(){
    linksWrap.innerHTML='';
    if(!e.links) e.links={};
    e.channels.forEach(function(c){
      var rowL=document.createElement('div'); rowL.className='linkrow';
      var lab=document.createElement('span'); lab.className='linklab '+chanClass(c); lab.textContent=c;
      var inp=document.createElement('input'); inp.type='url'; inp.value=e.links[c]||''; inp.placeholder=channelPh(c);
      var t=null; inp.oninput=function(){ if(t)clearTimeout(t); var v=inp.value; t=setTimeout(function(){ e.links[c]=normUrl(v); renderLinkOpen(rowL,c); mark(); },200); };
      rowL.appendChild(lab); rowL.appendChild(inp);
      renderLinkOpen(rowL,c);
      linksWrap.appendChild(rowL);
    });
  }
  function renderLinkOpen(rowL,c){ var ex=rowL.querySelector('.linkopen'); if(ex)ex.remove(); if(e.links[c]){ var a=document.createElement('a'); a.className='linkopen'; a.href=e.links[c]; a.target='_blank'; a.rel='noopener'; a.title='링크 열기'; a.innerHTML=icon('ext',15); rowL.appendChild(a); } }
  renderLinks();
  linkFld.appendChild(linksWrap); wrap.appendChild(linkFld);

  // 해시태그
  var tagFld=document.createElement('div'); tagFld.className='fld sns-only';
  tagFld.innerHTML='<label>해시태그</label>';
  tagFld.appendChild(inputEl('text', e.tags||'', '#한국잼버리 #스카우트 #Goseong2026', function(v){ e.tags=v; mark(); }));
  wrap.appendChild(tagFld);

  // images (max 10) — 대부분 카드뉴스
  var imgFld=document.createElement('div'); imgFld.className='fld sns-only';
  var cnt=(e.images||[]).length;
  imgFld.innerHTML='<label>업로드 콘텐츠 이미지 ('+cnt+'/'+MAX_IMG+')</label>';
  var grid=document.createElement('div'); grid.className='imgs';
  (e.images||[]).forEach(function(url,idx){
    var th=document.createElement('div'); th.className='th';
    th.innerHTML='<img src="'+esc(url)+'" alt=""><button class="del" title="삭제">'+icon('x',12)+'</button>';
    th.querySelector('img').onclick=function(){ openLightbox(url); };
    th.querySelector('.del').onclick=function(ev){ ev.stopPropagation(); e.images.splice(idx,1); refreshModal(); mark(); };
    grid.appendChild(th);
  });
  if(cnt<MAX_IMG){
    var add=document.createElement('label'); add.className='add'; add.innerHTML=icon('plus',22);
    var fileIn=document.createElement('input'); fileIn.type='file'; fileIn.accept='image/*'; fileIn.multiple=true; fileIn.style.display='none';
    fileIn.onchange=function(){ handleFiles(fileIn.files, e, add, s.k, s); };
    add.appendChild(fileIn); grid.appendChild(add);
  }
  imgFld.appendChild(grid);
  var hint=document.createElement('div'); hint.className='note'; hint.style.marginTop='6px';
  hint.innerHTML='최대 '+MAX_IMG+'장 · 자동 축소(1600px) 후 서버 저장 · <a href="/krjam-cardnews" target="_blank" rel="noopener">'+icon('image',13)+' 카드뉴스 제작기 열기</a>';
  imgFld.appendChild(hint);
  wrap.appendChild(imgFld);

  // 관련 첨부파일 (이미지 외 PDF·문서 등)
  var fileFld=document.createElement('div'); fileFld.className='fld';
  fileFld.innerHTML='<label>관련 첨부파일 ('+((e.files||[]).length)+')</label>';
  var flist=document.createElement('div'); flist.className='filelist';
  (e.files||[]).forEach(function(f,idx){
    var row=document.createElement('div'); row.className='filerow';
    row.innerHTML='<span class="fico">'+icon('paperclip',14)+'</span><a href="'+esc(f.url)+'" target="_blank" rel="noopener" download>'+esc(f.name||'파일')+'</a>';
    var del=document.createElement('button'); del.className='filedel'; del.innerHTML=icon('x',13); del.title='삭제';
    del.onclick=function(){ e.files.splice(idx,1); refreshModal(); mark(); };
    row.appendChild(del); flist.appendChild(row);
  });
  fileFld.appendChild(flist);
  var fbtn=document.createElement('label'); fbtn.className='btn ghost sm'; fbtn.style.marginTop='6px'; fbtn.innerHTML=icon('paperclip',14)+' 파일 첨부 (PDF·문서 등, 최대 10MB)';
  var fIn=document.createElement('input'); fIn.type='file'; fIn.multiple=true; fIn.style.display='none';
  fIn.onchange=function(){ handleAttachments(fIn.files, e, fbtn, s.k, s); };
  fbtn.appendChild(fIn); fileFld.appendChild(fbtn);
  wrap.appendChild(fileFld);

  // SNS용 텍스트 문구 (Tiptap)
  var hsec=document.createElement('div'); hsec.className='fld histsec sns-only';
  hsec.innerHTML='<label>SNS용 텍스트 문구 (작성자·시간·IP 기록)</label>';
  hsec.appendChild(buildHistoryList(s.k));
  hsec.appendChild(buildMemoComposer(s.k));
  wrap.appendChild(hsec);

  // 간단 메모 (Enter로 바로 등록)
  var nsec=document.createElement('div'); nsec.className='fld notesec';
  nsec.innerHTML='<label>간단 메모 (Enter로 바로 등록)</label>';
  var nlist=document.createElement('div'); nlist.className='notelist';
  notesOf(s.k).slice().reverse().forEach(function(n){
    var d=document.createElement('div'); d.className='noteitem';
    d.innerHTML='<span class="nmeta">'+esc((n.author||'익명')+' · '+fmtDateTime(n.ts)+(n.ip?(' · '+n.ip):''))+'</span> '+esc(n.text);
    nlist.appendChild(d);
  });
  var ninp=document.createElement('input'); ninp.type='text'; ninp.className='noteinput'; ninp.placeholder='메모 입력 후 Enter';
  ninp.onkeydown=function(ev){ if(ev.key==='Enter'){ if(ev.isComposing||ev.keyCode===229) return; ev.preventDefault(); var v=ninp.value.trim(); if(v){ addNote(s.k, v); ninp.value=''; } } };
  nsec.appendChild(nlist); nsec.appendChild(ninp); wrap.appendChild(nsec);
  return wrap;
}
/* ===== Tiptap memo + history ===== */
function fmtDateTime(s){ try{var d=new Date(s);return (''+d.getFullYear()).slice(2)+'/'+(d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}catch(e){return '';} }
/* SNS 문구(리치 텍스트) 표시용 새니타이저 — 정규식이 아니라 DOM 파스 후 화이트리스트 검사.
 * 과거 정규식(\son\w+=)은 <img/src=x/onerror=…> 처럼 공백 없는 구분자를 통과시켰다. */
function sanitizeHtml(h){
  var doc; try{ doc=new DOMParser().parseFromString('<div>'+(h||'')+'</div>','text/html'); }catch(e){ return ''; }
  var BAD_TAG=/^(script|style|iframe|object|embed|form|link|meta|base)$/i;
  var root=doc.body.firstChild; if(!root) return '';
  Array.prototype.slice.call(root.querySelectorAll('*')).forEach(function(el){
    if(BAD_TAG.test(el.tagName)){ el.remove(); return; }
    Array.prototype.slice.call(el.attributes).forEach(function(at){
      var n=at.name.toLowerCase(), v=(at.value||'').replace(/[\s -]+/g,'').toLowerCase();
      if(n.indexOf('on')===0){ el.removeAttribute(at.name); return; }
      if((n==='href'||n==='src'||n==='xlink:href') && (v.indexOf('javascript:')===0||v.indexOf('data:text/html')===0)) el.removeAttribute(at.name);
    });
  });
  return root.innerHTML;
}
function currentTags(k){ return (curView && curView.slot && curView.slot.k===k && curView.draft) ? (curView.draft.tags||'') : (peek(k).tags||''); }
function buildTypeCombo(e, s){
  var box=document.createElement('div'); box.className='typecombo';
  var inp=document.createElement('input'); inp.className='typeinput'; inp.value=e.ctype||''; inp.placeholder='종류';
  var menu=document.createElement('div'); menu.className='typemenu';
  function commit(v){ v=(v||'').trim(); var was=isMeeting(e); e.ctype=v; if(v && typeList().indexOf(v)<0){ if(!state.types) state.types=defaultTypes().slice(); state.types.push(v); saveTypes(); } mark(); if(isMeeting(e)!==was) refreshModal(); }
  function renderMenu(){
    menu.innerHTML='';
    var list=typeList();
    list.forEach(function(t){
      var row=document.createElement('div'); row.className='typeopt';
      var lab=document.createElement('span'); lab.className='typelab'; lab.innerHTML='<span class="tdot" style="background:'+ctypeColor(t)+'"></span>'+esc(t);
      lab.onmousedown=function(ev){ ev.preventDefault(); inp.value=t; commit(t); close(); };
      var del=document.createElement('button'); del.type='button'; del.className='typedel'; del.innerHTML=icon('x',13); del.title='이 종류 삭제';
      del.onmousedown=function(ev){ ev.preventDefault(); ev.stopPropagation(); state.types=list.filter(function(x){return x!==t;}); saveTypes(); renderMenu(); };
      row.appendChild(lab); row.appendChild(del); menu.appendChild(row);
    });
    var hint=document.createElement('div'); hint.className='note'; hint.style.margin='4px 6px'; hint.textContent='입력 후 Enter로 새 종류 추가';
    menu.appendChild(hint);
  }
  function open(){ renderMenu(); menu.classList.add('show'); }
  function close(){ menu.classList.remove('show'); }
  inp.onfocus=open;
  inp.onkeydown=function(ev){ if(ev.key==='Enter'){ if(ev.isComposing||ev.keyCode===229) return; ev.preventDefault(); commit(inp.value); close(); inp.blur(); } else if(ev.key==='Escape'){ close(); } };
  inp.onblur=function(){ setTimeout(close,160); if((inp.value||'').trim()!==(e.ctype||'')) commit(inp.value); };
  box.appendChild(inp); box.appendChild(menu);
  return box;
}
function buildHistoryList(k){
  var box=document.createElement('div'); box.className='histlist';
  var entries=hist(k).slice().reverse();
  if(!entries.length){ box.innerHTML='<div class="note" style="margin:4px 0">아직 등록된 SNS 문구가 없습니다. 아래에서 작성하세요.</div>'; return box; }
  entries.forEach(function(h){
    var item=document.createElement('div'); item.className='histitem';
    var meta=document.createElement('div'); meta.className='histmeta';
    meta.innerHTML='<span>'+esc((h.author||'익명')+' · '+fmtDateTime(h.ts)+(h.ip?(' · '+h.ip):''))+'</span>';
    var cp=document.createElement('button'); cp.type='button'; cp.className='histcopy'; cp.innerHTML=icon('copy',13)+' 복사'; cp.title='문구+해시태그 복사';
    cp.onclick=function(){ var t=currentTags(k); copyText(htmlToText(h.html)+(t?('\n\n'+t):''), 'SNS 문구'+(t?'+해시태그':'')+' 복사됨'); };
    meta.appendChild(cp);
    var content=document.createElement('div'); content.className='histhtml'; content.innerHTML=sanitizeHtml(h.html||'');
    item.appendChild(meta); item.appendChild(content); box.appendChild(item);
  });
  return box;
}
function buildMemoComposer(k){
  var box=document.createElement('div'); box.className='memo-composer';
  var tb=document.createElement('div'); tb.className='tt-toolbar';
  var ed=document.createElement('div'); ed.className='tt-editor';
  var foot=document.createElement('div'); foot.className='ttfoot';
  var cc=document.createElement('span'); cc.className='ttcount'; cc.textContent='0자';
  var addBtn=document.createElement('button'); addBtn.type='button'; addBtn.className='btn sm solid addhist'; addBtn.innerHTML=icon('plus',14)+' SNS 문구 저장'; addBtn.disabled=true;
  foot.appendChild(cc); foot.appendChild(addBtn);
  box.appendChild(tb); box.appendChild(ed); box.appendChild(foot);
  function setCount(n){ cc.textContent=n+'자'+(n>2200?' · 인스타 초과':(n>280?' · X(트위터) 초과':'')); cc.classList.toggle('over', n>2200); }
  function fallback(){
    ed.contentEditable='true'; ed.classList.add('fallback'); ed.setAttribute('data-ph','SNS 게시 문구를 입력하세요…');
    tb.innerHTML='<span class="note" style="margin:0">서식 도구를 불러오지 못했습니다 — 일반 텍스트로 기록됩니다.</span>';
    addBtn.disabled=false;
    ed.addEventListener('input',function(){ setCount((ed.textContent||'').length); });
    addBtn.onclick=function(){ addHistoryNote(k, ed.innerHTML); ed.innerHTML=''; setCount(0); };
  }
  if(window.__ttReady){
    window.__ttReady.then(function(TT){
      if(!TT){ fallback(); return; }
      try{
        var editor=new TT.Editor({element:ed, extensions:TT.extensions, content:'', onUpdate:function(){ setCount(editor.getText().length); }});
        mdEditors.push(editor);
        buildToolbar(tb, editor);
        addBtn.disabled=false;
        addBtn.onclick=function(){ addHistoryNote(k, editor.getHTML()); editor.commands.clearContent(); setCount(0); };
      }catch(err){ console.warn('editor init failed', err); fallback(); }
    });
  } else fallback();
  return box;
}
function buildToolbar(tb, ed){
  tb.innerHTML='';
  var items=[];
  function add(label,title,run,active){
    var btn=document.createElement('button'); btn.type='button'; btn.className='ttb'; btn.title=title; btn.innerHTML=label;
    btn.onmousedown=function(ev){ ev.preventDefault(); };
    btn.onclick=function(){ run(); sync(); };
    btn._active=active||null; tb.appendChild(btn); items.push(btn); return btn;
  }
  add('<b>B</b>','굵게',function(){ed.chain().focus().toggleBold().run();},function(){return ed.isActive('bold');});
  add('<i>I</i>','기울임',function(){ed.chain().focus().toggleItalic().run();},function(){return ed.isActive('italic');});
  add('<u>U</u>','밑줄',function(){ed.chain().focus().toggleUnderline().run();},function(){return ed.isActive('underline');});
  add('<s>S</s>','취소선',function(){ed.chain().focus().toggleStrike().run();},function(){return ed.isActive('strike');});
  add('H1','제목1',function(){ed.chain().focus().toggleHeading({level:1}).run();},function(){return ed.isActive('heading',{level:1});});
  add('H2','제목2',function(){ed.chain().focus().toggleHeading({level:2}).run();},function(){return ed.isActive('heading',{level:2});});
  add('H3','제목3',function(){ed.chain().focus().toggleHeading({level:3}).run();},function(){return ed.isActive('heading',{level:3});});
  add('• 목록','글머리 목록',function(){ed.chain().focus().toggleBulletList().run();},function(){return ed.isActive('bulletList');});
  add('1. 목록','번호 목록',function(){ed.chain().focus().toggleOrderedList().run();},function(){return ed.isActive('orderedList');});
  add('☑ 체크','체크리스트',function(){ed.chain().focus().toggleTaskList().run();},function(){return ed.isActive('taskList');});
  add('❝','인용',function(){ed.chain().focus().toggleBlockquote().run();},function(){return ed.isActive('blockquote');});
  add('&lt;/&gt;','인라인 코드',function(){ed.chain().focus().toggleCode().run();},function(){return ed.isActive('code');});
  add('▤','코드블록',function(){ed.chain().focus().toggleCodeBlock().run();},function(){return ed.isActive('codeBlock');});
  add(icon('highlighter',15),'형광펜',function(){ed.chain().focus().toggleHighlight().run();},function(){return ed.isActive('highlight');});
  add(icon('link',15),'링크',function(){ var u=prompt('링크 URL'); if(u){ed.chain().focus().extendMarkRange('link').setLink({href:u}).run();} else {ed.chain().focus().unsetLink().run();} },function(){return ed.isActive('link');});
  add(icon('alignLeft',15),'왼쪽 정렬',function(){ed.chain().focus().setTextAlign('left').run();},function(){return ed.isActive({textAlign:'left'});});
  add(icon('alignCenter',15),'가운데 정렬',function(){ed.chain().focus().setTextAlign('center').run();},function(){return ed.isActive({textAlign:'center'});});
  add(icon('alignRight',15),'오른쪽 정렬',function(){ed.chain().focus().setTextAlign('right').run();},function(){return ed.isActive({textAlign:'right'});});
  add('x²','위첨자',function(){ed.chain().focus().toggleSuperscript().run();},function(){return ed.isActive('superscript');});
  add('x₂','아래첨자',function(){ed.chain().focus().toggleSubscript().run();},function(){return ed.isActive('subscript');});
  add('▦ 표','표 삽입',function(){ed.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run();});
  add('―','구분선',function(){ed.chain().focus().setHorizontalRule().run();});
  var color=document.createElement('input'); color.type='color'; color.className='ttcolor'; color.title='글자색'; color.value='#1C211D';
  color.onchange=function(){ ed.chain().focus().setColor(color.value).run(); }; tb.appendChild(color);
  add('↶','실행취소',function(){ed.chain().focus().undo().run();});
  add('↷','다시실행',function(){ed.chain().focus().redo().run();});
  function sync(){ items.forEach(function(b){ if(b._active){ try{ b.classList.toggle('on', !!b._active()); }catch(e){} } }); }
  ed.on('selectionUpdate',sync); ed.on('transaction',sync); sync();
}
function fld(label, inputNode){
  var f=document.createElement('div'); f.className='fld';
  var l=document.createElement('label'); l.textContent=label; f.appendChild(l); f.appendChild(inputNode); return f;
}
function inputEl(type,val,ph,oninput){
  var i=document.createElement('input'); i.type=type; i.value=val; i.placeholder=ph||'';
  var t=null;
  i.oninput=function(){ if(t)clearTimeout(t); var v=i.value; t=setTimeout(function(){oninput(v);},150); };
  return i;
}

/* image upload (downscale -> /api/image) */
function handleFiles(files, edit, addBtn, k, s){
  if(!files||!files.length) return;
  if(!edit.images) edit.images=[];
  var remaining=MAX_IMG-edit.images.length;
  if(remaining<=0){ toast('이미지는 최대 '+MAX_IMG+'장입니다'); return; }
  var list=Array.prototype.slice.call(files);
  if(list.length>remaining){ toast('최대 '+MAX_IMG+'장 (초과 '+(list.length-remaining)+'장 제외)'); list=list.slice(0,remaining); }
  addBtn.classList.add('busy');
  (function next(){
    if(!list.length){ addBtn.classList.remove('busy'); refreshModal(); mark(); return; }
    var f=list.shift();
    downscale(f,1600,0.85).then(function(blob){ return uploadBlob(blob); })
      .then(function(url){ if(url && edit.images.length<MAX_IMG){ edit.images.push(url); } next(); })
      .catch(function(){ toast('이미지 업로드 실패'); next(); });
  })();
}
/* attachment upload (any file -> /api/file) */
function handleAttachments(files, edit, btn, k, s){
  if(!files||!files.length) return;
  if(!edit.files) edit.files=[];
  var list=Array.prototype.slice.call(files);
  var room=20-edit.files.length;
  if(room<=0){ toast('첨부는 최대 20개입니다'); return; }
  if(list.length>room) list=list.slice(0,room);
  // 버튼 첫 자식은 <svg> Element 라 nodeValue 대입이 no-op — 진행 표시는 textContent 로 통째 교체(모달 재렌더가 원복)
  btn.classList.add('busy'); btn.textContent='업로드 중…';
  (function next(){
    if(!list.length){ btn.classList.remove('busy'); refreshModal(); mark(); return; }
    var f=list.shift();
    if(f.size>MAX_FILE){ toast(f.name+' : '+fmtMB(f.size)+' — 100MB 초과로 제외'); next(); return; }
    uploadAttachment(f,function(p){ btn.textContent='업로드 '+p+'%…'; })
      .then(function(j){ if(j&&j.url){ edit.files.push({name:j.name||f.name, url:j.url, ct:j.ct||f.type}); } next(); })
      .catch(function(){ toast('업로드 실패: '+f.name); next(); });
  })();
}
function openLightbox(url){ document.getElementById('lb-img').src=url; document.getElementById('lightbox').classList.add('show'); }

/* ===== marketing ===== */
function renderMarketing(){
  if(!state.marketing) state.marketing=defaultMarketing();
  var tb=document.getElementById('mkbody'); tb.innerHTML='';
  state.marketing.forEach(function(m){
    var tr=document.createElement('tr');
    tr.innerHTML=
      '<td class="mk" contenteditable data-f="date">'+esc(m.date||'')+'</td>'+
      '<td class="mk" contenteditable data-f="title">'+esc(m.title||'')+'</td>'+
      '<td class="mk" contenteditable data-f="channel">'+esc(m.channel||'')+'</td>'+
      '<td class="mk" contenteditable data-f="memo">'+esc(m.memo||'')+'</td>'+
      '<td><button class="rm mkdel" title="행 삭제">'+icon('trash',14)+'</button></td>';
    tr.querySelectorAll('td.mk').forEach(function(td){
      td.addEventListener('blur',function(){ m[td.dataset.f]=td.textContent.trim(); saveMarketing(); });
    });
    tr.querySelector('.rm').onclick=function(){ state.marketing=state.marketing.filter(function(x){return x!==m;}); renderMarketing(); saveMarketing(); };
    tb.appendChild(tr);
  });
}

/* ===== 잼버리식당 식사 메뉴 (meals) — 대원 일반식/특별식 · 운영요원 × 날짜 × 조·중·석식 ===== */
var MEAL_DAYS=['2026-08-03','2026-08-04','2026-08-05','2026-08-06','2026-08-07','2026-08-08','2026-08-09'];
var MEAL_COLS=[['b','조식'],['l','중식'],['d','석식']];
var MEAL_GROUPS=[['crew_n','대원 일반식'],['crew_s','대원 특별식'],['staff','운영요원']];
var MEAL_NOTE={ staff:'조식 고정메뉴: 그린샐러드&드레싱 · 식빵&모닝빵&딸기잼 · 우유(흰·딸기·초코) / 중식·석식: 제철과일 제공' };
var mealGroup='crew_n';
function mealsData(){
  if(!state.meals||typeof state.meals!=='object') state.meals={};
  MEAL_GROUPS.forEach(function(g){ if(!state.meals[g[0]]) state.meals[g[0]]={}; });
  if(state.meals.crew){ Object.keys(state.meals.crew).forEach(function(d){ if(!state.meals.crew_n[d]) state.meals.crew_n[d]=state.meals.crew[d]; }); delete state.meals.crew; }   // 구버전 crew→crew_n 이관
  return state.meals;
}
function saveMeals(){ debouncedPut('mealTimer', {meals: mealsData()}, '식사 메뉴 저장됨'); }
// 사용자 제공 메뉴표(대원 일반식·특별식 8/5~8/9 · 운영요원 8/3~8/9). 여러 품목은 줄바꿈으로 저장.
function defaultMeals(){
  function C(){ return Array.prototype.slice.call(arguments).filter(Boolean).join('\n'); }
  return {
    crew_n:{
      '2026-08-06':{ b:C('롤유부초밥','미역된장국','직화구이맛후랑크구이','요거트','청포도랑사과랑주스'), l:C('달콤화이트패스츄리빵','빅요구르트','허쉬초코퍼지휘낭시애','쫄깃한메추리알','미니팝콘','복숭아곤약젤리'), d:C('돼지김치찌개&라면사리','클로렐라쌀밥','쇠고기장조림','포켓몬스틱김자반','콘샐러드','스위트애플망고주스','계절과일') },
      '2026-08-07':{ b:C('모닝빵&딸기잼','초코우유','고칼슘꼬마약과','고단백에너지바','계절과일'), l:C('초코칩머핀','아침에주스포도','우리밀바나나빵','뽀로로두부북','국산콩두부칩','쭈욱짜먹는애플'), d:C('삼겹살구이','클로렐라쌀밥','우거지된장국','상추,쌈무&쌈장','볶음김치','제로사이다','스테비아방울토마토') },
      '2026-08-08':{ b:C('셀프햄치즈토스트','바나나맛우유','꿈을꿔요아몬드림','골드키위퓨레'), l:C('미니딸기샌드','레몬에이드','크림치즈휘낭시애','구운계란','그레인미니바이트초코','감귤퐁당컵과일'), d:C('치킨마크네거리','클로렐라쌀밥','종합어묵탕','김치','메추리알장조림','제주한라봉퓨레','계절과일') },
      '2026-08-09':{ b:C('컵시리얼&흰우유','촉촉한반숙란','샐러드주스오렌지','딸기구겔호프','액티비아딸기요거트'), l:'', d:'' },
      '2026-08-05':{ b:'', l:'', d:C('비프유니짜장덮밥','햇반','계란북엇국','고메함박스테이크','반달단무지','복숭아퐁당컵과일','쥬시쿨자두') }
    },
    crew_s:{
      '2026-08-06':{ b:C('롤유부초밥','미역된장국','스크래블에그','요거트','청포도랑사과랑주스'), l:C('달콤화이트패스츄리빵','빅요구르트','허쉬초코퍼지휘낭시애','쫄깃한메추리알','미니팝콘','복숭아곤약젤리'), d:C('황태미역국','클로렐라쌀밥','직화순살삼치구이','포켓몬스틱김자반','저당콘감자샐러드','스위트애플망고주스','계절과일') },
      '2026-08-07':{ b:C('모닝빵&딸기잼','초코우유','고칼슘꼬마약과','고단백에너지바','계절과일'), l:C('초코칩머핀','아침에주스포도','우리밀바나나빵','뽀로로두부북','국산콩두부칩','쭈욱짜먹는애플'), d:C('직화순살고등어구이','클로렐라쌀밥','우거지된장국','저당콘감자샐러드','볶음김치','제로사이다','스테비아방울토마토') },
      '2026-08-08':{ b:C('스크램블토스트','바나나맛우유','꿈을꿔요아몬드림','골드키위퓨레'), l:C('미니딸기샌드','레몬에이드','크림치즈휘낭시애','구운계란','그레인미니바이트초코','감귤퐁당컵과일'), d:C('직화가자미구이','클로렐라쌀밥','미역미소된장국','김치','메추리알장조림','제주한라봉퓨레','계절과일') },
      '2026-08-09':{ b:C('컵시리얼&흰우유','촉촉한반숙란','샐러드주스오렌지','딸기구겔호프','액티비아딸기요거트'), l:'', d:'' },
      '2026-08-05':{ b:'', l:'', d:C('동원짜장참치캔','햇반','계란북엇국','직화가자미구이','반달단무지','복숭아퐁당컵과일','쥬시쿨자두') }
    },
    staff:{
      '2026-08-03':{ b:C('쌀밥','소고기미역국','떡갈비&양송이','김치'), l:C('쌀밥','비프카레','맑은김치국','통등심돈까스','시금치나물','블루베리샐러드','김치'), d:C('[망고음료]','쌀밥','닭개장','오징어야채핫바','메추리알조림','건파래볶음','김치') },
      '2026-08-04':{ b:C('쌀밥','소고기우거지국','고등어무조림','김치'), l:C('쌀밥','황태무국','닭볶음탕','김말이강정','오이양파무침','김치'), d:C('[포도음료]','쌀밥','건새우아욱국','파채소불고기','야채계란찜','무말랭이무침','김치') },
      '2026-08-05':{ b:C('쌀밥','쑥갓어묵탕','미트볼야채볶음','김치'), l:'', d:C('[요거트푸딩]','쌀밥','사골떡국','단호박순살갈비찜','갈비만두찜','치커리유자청무침','김치') },
      '2026-08-06':{ b:C('쌀밥','소고기무국','메추리알장조림','김치'), l:C('화이트패스츄리빵','빅요구르트','초코퍼지휘낭시애','쫄깃한메추리알','미니팝콘','복숭아곤약젤리'), d:C('[오색경단]','장각삼계탕','쌀밥','김치전','오이고추짱장무침','요구르트','김치') },
      '2026-08-07':{ b:C('돈육짜장덮밥','팽이장국','등심탕수육','김치'), l:C('초코칩머핀','아침에주스포도','우리밀바나나빵','뽀로로두부북','국산콩두부칩','쭈욱짜먹는애플'), d:C('[사과주스]','삼겹보쌈','쌀밥','얼갈이된장국','비빔막국수','배추된장무침','김치') },
      '2026-08-08':{ b:'', l:C('미니딸기샌드','레몬에이드','크림치즈휘낭시애','구운계란','그레인미니바이트초코','감귤퐁당컵과일'), d:C('[카프리썬]','쌀밥','된장찌개','제육볶음','한식잡채','부추걸절이','김치') },
      '2026-08-09':{ b:C('쌀밥','얼큰 무채어묵탕','떡갈비야채조림','김치'), l:'', d:'' }
    }
  };
}
function mealsHasContent(){ var m=mealsData(); return MEAL_GROUPS.some(function(g){ var gg=m[g[0]]||{}; return Object.keys(gg).some(function(d){ var r=gg[d]||{}; return !!(r.b||r.l||r.d); }); }); }
// 내용(음식명)이 하나도 없으면 사용자 제공 메뉴로 시드 + 저장(공유 보드 반영). 빈 구조만 저장돼 있어도 시드된다.
// 내용이 하나라도 있으면 보존(사용자 편집 유지). — 서버에 빈 meals 가 저장돼 seed 가 막히던 문제 대응.
function upgradeMeals(){ if(!mealsHasContent()){ state.meals=defaultMeals(); saveMeals(); } }
function renderMeals(){
  var seg=document.getElementById('meal-groupseg');
  if(seg) seg.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.dataset.mg===mealGroup); });
  var note=document.getElementById('meal-note');
  if(note){ var nt=MEAL_NOTE[mealGroup]||''; note.textContent=nt; note.style.display=nt?'':'none'; }
  var tb=document.getElementById('mealbody'); if(!tb) return; tb.innerHTML='';
  var g=mealsData()[mealGroup]||{};
  MEAL_DAYS.forEach(function(d){
    var row=g[d]||{}, wd=WD[new Date(d+'T00:00:00').getDay()];
    var tr=document.createElement('tr');
    tr.innerHTML='<td class="mealdate">'+d.slice(5).replace('-','/')+' <span class="wd">('+wd+')</span></td>'+
      MEAL_COLS.map(function(c){ return '<td class="mk mealcell" contenteditable data-c="'+c[0]+'">'+esc(row[c[0]]||'')+'</td>'; }).join('');
    tr.querySelectorAll('td.mk').forEach(function(td){ td.addEventListener('blur',function(){
      var data=mealsData(); if(!data[mealGroup][d]) data[mealGroup][d]={}; data[mealGroup][d][td.dataset.c]=(td.innerText||'').replace(/\n{2,}/g,'\n').replace(/^\n+|\n+$/g,'').trim(); saveMeals();
    }); });
    tb.appendChild(tr);
  });
}

/* ===== 일자별 시간 일정표 (타임테이블 그리드) ===== */
var TT_HS=0, TT_HE=24;             // 표시 시작/끝 시각 (24시간 일정표)
var TT_HH_PERIOD=46, TT_HH_DAY=84; // 시간당 픽셀(전체기간/일간)
var TT_HH=46;                      // 현재 모드 픽셀(renderTimetable에서 설정)
function t2h(s){ if(!s) return null; var p=String(s).split(':'); var h=+p[0], m=+(p[1]||0); if(isNaN(h)) return null; return h+(isNaN(m)?0:m)/60; }
var TT_SNAP=0.25;   // 15분 단위
function snap15(h){ return Math.round(h/TT_SNAP)*TT_SNAP; }
function h2hhmm(h){ var tot=Math.round(h*60); var hh=Math.floor(tot/60), mm=tot%60; return (hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm; }
function rosterById(id){ var l=rosterList(); for(var i=0;i<l.length;i++) if(l[i].id===id) return l[i]; return null; }
function personLabel(m){ if(!m) return '?'; var n=(m.name||'').trim(), r=(m.role||'').trim(); return n||r||'(이름 미입력)'; }
function ttAssignees(t){ return ((t&&t.assignees)||[]).map(rosterById).filter(Boolean); }
function ttLanes(evs){
  var list=evs.map(function(t){var s=t2h(t.start),e=t2h(t.end); if(e==null||e<=s)e=s+0.5; return {id:t.id,s:s,e:e};}).sort(function(a,b){return a.s-b.s||a.e-b.e;});
  var lane={}, ncol={}, i=0;
  while(i<list.length){
    var cl=[list[i]], end=list[i].e, j=i+1;
    while(j<list.length && list[j].s < end-1e-9){ cl.push(list[j]); if(list[j].e>end) end=list[j].e; j++; }
    var le=[];
    cl.forEach(function(x){ var k=0; while(le[k]!==undefined && le[k]>x.s+1e-9) k++; lane[x.id]=k; le[k]=x.e; });
    cl.forEach(function(x){ ncol[x.id]=le.length; });
    i=j;
  }
  return {lane:lane, ncol:ncol};
}
var ttMode=(function(){try{return localStorage.getItem('jamboree-plan:ttmode')||'period';}catch(e){return 'period';}})();
var ttDay=(function(){try{return localStorage.getItem('jamboree-plan:ttday')||'2026-08-05';}catch(e){return '2026-08-05';}})();
function jamDay(d){ for(var i=0;i<JAM_DAYS.length;i++) if(JAM_DAYS[i][0]===d) return JAM_DAYS[i]; return null; }
var OFF_START_DATE='2026-08-03', OFF_START_BLOCK=1;   // 오프타임 지정 시작: 8/3 오후(pm)부터
function offAllowed(date, blockIdx){ if(date<OFF_START_DATE) return false; if(date===OFF_START_DATE) return blockIdx>=OFF_START_BLOCK; return true; }
function offDays(){ return JAM_DAYS.filter(function(d){ return d[0]>=OFF_START_DATE; }); }
function renderTTFilter(){
  var box=document.getElementById('tt-filter'); if(!box) return;
  var allOn=TT_TRACKS.every(function(t){ return ttTrackOn(t[0]); });
  box.innerHTML='<span class="ttf-lab">보기</span>'+
    '<button type="button" class="ttfchip all'+(allOn?' on':'')+'" data-ttf="__all">전체</button>'+
    TT_TRACKS.map(function(t){ var on=ttTrackOn(t[0]);
      var sw=t[0]==='pr'?'#C89A3E':t[0]==='cub1'?cubColor(1):t[0]==='cub2'?cubColor(2):'#2F5D4A';
      return '<button type="button" class="ttfchip'+(on?' on':'')+'" data-ttf="'+t[0]+'"><span class="sw" style="background:'+sw+'"></span>'+esc(t[1])+'</button>';
    }).join('');
}
function renderTTControls(){
  var seg=document.getElementById('tt-modeseg');
  if(seg) seg.querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b.dataset.m===ttMode); });
  renderTTFilter();
  var days=document.getElementById('tt-days'); if(!days) return;
  days.style.display = ttMode==='day' ? '' : 'none';
  if(ttMode!=='day'){ days.innerHTML=''; return; }
  days.innerHTML='';
  JAM_DAYS.forEach(function(d){ var dd=ymd(d[0]);
    var b=document.createElement('button'); b.className='ttdaytab'+(d[0]===ttDay?' active':'');
    b.innerHTML='<b>8/'+dd.getDate()+'</b><span>'+WDS[dd.getDay()]+(d[1]?(' '+esc(d[1])):'')+'</span>';
    b.onclick=function(){ ttDay=d[0]; try{localStorage.setItem('jamboree-plan:ttday',ttDay);}catch(e){} renderTimetable(); };
    days.appendChild(b);
  });
}
/* ===== 일정표 그리드 렌더링 =====
 * 계산·마크업(순수) → 조립 → 배선(부작용) 순으로 분리.
 * *Html/*Geometry 함수는 DOM 을 만지지 않고 값만 반환하므로 단독으로 검증할 수 있다.
 * TT_HH(시간당 픽셀)는 뷰 모드에 따라 달라져 col.hh 로 주입한다 — 드래그 로직도 같은 값을 써야 해
 * renderTimetable 이 전역 TT_HH 를 갱신하는 기존 동작은 유지(ttPointerDown·셀 클릭이 참조). */

// 일정 → 블록 좌표. col={off,span,hh} (컬럼 시작 %, 폭 %, 시간당 px). 부작용 없음.
function ttBlockGeometry(t, lay, col){
  var s=t2h(t.start), e=t2h(t.end); if(e==null||e<=s) e=s+0.5;
  var top=(Math.max(s,TT_HS)-TT_HS)*col.hh, bot=(Math.min(e,TT_HE)-TT_HS)*col.hh;
  var lanes=lay.ncol[t.id]||1, lane=lay.lane[t.id]||0, w=col.span/lanes;
  return { top:top, height:Math.max(bot-top,24)-3, left:col.off+lane*w, width:w };
}
function ttGeoStyle(g){ return 'top:'+g.top+'px;height:'+g.height+'px;left:calc('+g.left+'% + 2px);width:calc('+g.width+'% - 4px)'; }

function ttBlockTooltip(t, who, cons){
  return (t.start||'')+(t.end?('–'+t.end):'')+' '+(t.title||'')+(t.place?(' @ '+t.place):'')+
    (who.length?(' · 담당 '+who.join(', ')):'')+(cons.length?(' · 연락처 '+cons.join(', ')):'')+(t.noCover?' · 취재 불필요':'');
}
// 식순 — 일간 뷰는 블록 안 미니 타임라인, 전체기간 뷰는 단계 수 배지(공간이 좁아서)
function ttRundownHtml(t, dayView){
  var rd=(t.rundown||[]).filter(function(r){ return (r.time||r.title); });
  if(dayView && rd.length){
    return '<div class="ttg-rd">'+rd.map(function(r){
      return '<div class="ttg-rd-row"><span class="ttg-rd-t">'+esc(r.time||'·')+'</span><span class="ttg-rd-x">'+esc(r.title||'')+(r.note?(' · '+esc(r.note)):'')+'</span></div>'; }).join('')+'</div>';
  }
  if((t.rundown||[]).length) return '<div class="ttg-evp rd">'+icon('fileText',10)+' 식순 '+t.rundown.length+'단계</div>';
  return '';
}
// 의전 블록 — 읽기 전용(클릭 시 의전 탭으로 이동)
// g: 이벤트 그룹 {time, endTime, activity, place, people:[{role,name}...], ids:[]}. 같은 활동=한 블록, 참여자=구분(대회장)+이름(직책 X)
function ttProtocolBlockHtml(g, geo, dayView){
  var ppl=(g.people||[]).slice().sort(function(a,b){ var ra=protRoleRank(a.role), rb=protRoleRank(b.role); if(ra!==rb) return ra-rb; return (a.name||'').localeCompare(b.name||'','ko'); })
    .map(function(x){ return ((x.role||'')+' '+(x.name||'')).trim(); });
  var pplTxt=ppl.join(', '), evName=g.activity||ppl[0]||'의전', pid=(g.ids&&g.ids[0])||'';
  return '<div class="ttg-ev ttg-pr'+(dayView?' big':'')+'" data-pid="'+esc(pid)+'" title="'+esc('의전 · '+(g.time||'')+' '+evName+(pplTxt?(' · '+pplTxt):'')+(g.place?(' @ '+g.place):''))+'" style="'+ttGeoStyle(geo)+'">'+
    '<div class="ttg-evt"><span class="prtag">의전</span> '+esc(evName)+'</div>'+
    '<div class="ttg-evm">'+esc(g.time||'')+(pplTxt?(' · '+esc(pplTxt)):'')+(g.place?(' · '+esc(g.place)):'')+'</div>'+
  '</div>';
}
// 시간 일정 블록 — 배경은 인라인 카테고리색(취재 불필요면 CSS .nocover 가 !important 로 덮음)
function ttEventBlockHtml(t, geo, dayView){
  var who=ttAssignees(t).map(personLabel);
  var cons=ttContacts(t).map(function(c){ return contactLabel(c)+(c.phone?(' '+c.phone):''); });
  var isCub=t.track==='cub', bg=isCub?cubColor(t.batch):ttCatColor(t.cat);
  var cubTag=isCub?('<span class="cubtag">'+esc(CUB_BATCH_LABEL[(t.batch===2||t.batch==='2')?2:1])+'</span> '):'';
  return '<div class="ttg-ev'+(dayView?' big':'')+(t.noCover?' nocover':'')+(isCub?' cub':'')+'" data-id="'+esc(t.id)+'" title="'+esc((isCub?('컵 '+CUB_BATCH_LABEL[(t.batch===2||t.batch==='2')?2:1]+' · '):'')+ttBlockTooltip(t,who,cons))+'" style="'+ttGeoStyle(geo)+';background:'+bg+'">'+
    '<div class="ttg-rz top" data-id="'+esc(t.id)+'" title="시작 시간 조절"></div>'+
    '<button class="ttg-cov'+(t.noCover?' on':'')+'" data-cov="'+esc(t.id)+'" title="'+(t.noCover?'취재 불필요 해제':'취재 불필요로 표시')+'" aria-label="취재 불필요 토글" aria-pressed="'+(t.noCover?'true':'false')+'">'+icon('edit',11)+'</button>'+
    '<button class="ttg-del" data-id="'+esc(t.id)+'" title="이 일정 삭제" aria-label="일정 삭제">'+icon('x',12)+'</button>'+
    '<div class="ttg-evt">'+cubTag+(t.noCover?'<span class="nctag">취재 X</span> ':'')+esc(t.title||'(제목 없음)')+'</div>'+
    '<div class="ttg-evm">'+esc(t.start||'')+(t.end?('–'+esc(t.end)):'')+(t.place?(' · '+esc(t.place)):'')+'</div>'+
    (who.length?'<div class="ttg-evp">'+icon('users',10)+' '+esc(who.join(', '))+'</div>':'')+
    ttRundownHtml(t, dayView)+
    '<div class="ttg-rz bot" data-id="'+esc(t.id)+'" title="종료 시간 조절"></div>'+
  '</div>';
}
// 한 그룹(겹침 레인 배치 포함) → 블록 마크업. 의전 pseudo-이벤트(_pr)는 의전 블록으로.
function ttBlocksHtml(list, col, dayView){
  var lay=ttLanes(list);
  return list.map(function(t){
    var geo=ttBlockGeometry(t, lay, col);
    return t._pr ? ttProtocolBlockHtml(t._pr, geo, dayView) : ttEventBlockHtml(t, geo, dayView);
  }).join('');
}
function ttHeadHtml(days){
  return '<div class="ttg-head"><div class="ttg-corner"></div>'+days.map(function(d){
    var dd=ymd(d[0]), cls=dd.getDay()===0?'sun':dd.getDay()===6?'sat':'', today=(d[0]===todayISO());
    return '<div class="ttg-dayhead '+cls+(today?' today':'')+'"><b>8/'+dd.getDate()+'</b><span>'+WDS[dd.getDay()]+(d[1]?(' · '+esc(d[1])):'')+'</span></div>';
  }).join('')+'</div>';
}
function ttHoursHtml(hh){
  var out='';
  for(var h=TT_HS;h<TT_HE;h++) out+='<div class="ttg-hr" style="height:'+hh+'px"><span>'+(h<10?'0':'')+h+':00</span></div>';
  return '<div class="ttg-hours">'+out+'</div>';
}
function ttCellsHtml(day, hh){
  var out='';
  for(var h=TT_HS;h<TT_HE;h++) out+='<div class="ttg-cell" data-day="'+day+'" data-h="'+h+'" style="height:'+hh+'px"></div>';
  return out;
}
// 하루 컬럼 — 일간 뷰는 잼버리 일정 · 의전 일정 · 컵 참관단을 각각 별도 열로(존재하는 트랙만), 아니면 통합 레인
function ttColumnHtml(d, dayView, hh){
  var items=ttList().filter(function(t){ return t.day===d[0] && t2h(t.start)!=null && ttTrackOn(ttTrackOfItem(t)); });
  var jam=items.filter(function(t){ return t.track!=='cub'; });   // 잼버리 일정
  var cub=items.filter(function(t){ return t.track==='cub'; });    // 컵 참관단(1·2기)
  // 의전 pseudo-이벤트 — 같은 활동+시각은 한 블록으로 묶고 참여자를 구분(대회장)+이름으로. (종료 미입력 시 +30분)
  var prs=[];
  if(ttTrackOn('pr')){
    var prRaw=protocolList().filter(function(p){ return p.date===d[0] && t2h(p.time)!=null; });
    var pmap={}, pord=[];
    prRaw.forEach(function(p){ var pk=JSON.stringify([p.time||'', p.activity||'']);
      if(!pmap[pk]){ pmap[pk]={time:p.time, endTime:p.endTime, activity:p.activity, place:p.place, people:[], ids:[]}; pord.push(pk); }
      pmap[pk].people.push(p); pmap[pk].ids.push(p.id); if(!pmap[pk].endTime&&p.endTime) pmap[pk].endTime=p.endTime;
    });
    prs=pord.map(function(pk){ var g=pmap[pk], sh=t2h(g.time);
      return {id:'pr:'+g.ids[0], start:g.time, end:(g.endTime&&t2h(g.endTime)!=null)?g.endTime:h2hhmm(Math.min(24,sh+0.5)), _pr:g}; });
  }
  var body;
  if(dayView && (prs.length || cub.length)){
    var tracks=[{lab:'잼버리 일정', cls:'', items:jam}];
    if(prs.length) tracks.push({lab:'의전 일정', cls:'gl-pr', items:prs});
    if(cub.length) tracks.push({lab:'컵 참관단', cls:'gl-cub', items:cub});
    var n=tracks.length, gap=2, span=(100-(n-1)*gap)/n;
    body=tracks.map(function(tk,i){ var off=i*(span+gap);
      return '<div class="ttg-grouplab '+tk.cls+'" style="left:calc('+off+'% + 5px)">'+tk.lab+'</div>'+
        (i? '<div class="ttg-vsplit" style="left:'+(off-gap/2)+'%"></div>':'')+
        ttBlocksHtml(tk.items, {off:off, span:span, hh:hh}, dayView);
    }).join('');
  } else {
    body=ttBlocksHtml(jam.concat(prs, cub), {off:0, span:100, hh:hh}, dayView);
  }
  return '<div class="ttg-col" data-day="'+d[0]+'">'+ttCellsHtml(d[0], hh)+body+'</div>';
}
function renderTTLegend(){
  var leg=document.getElementById('tt-legend'); if(!leg) return;
  // 카테고리(잼버리 일정 종류) + 구분선 + 컵 참관단 트랙(1·2기, 별도 색)
  leg.innerHTML=ttCats().map(function(c){ return '<span class="li"><span class="sw" style="background:'+c[1]+'"></span>'+esc(c[0])+'</span>'; }).join('')+
    '<span class="li-sep"></span>'+
    '<span class="li"><span class="sw" style="background:'+cubColor(1)+'"></span>컵 1기</span>'+
    '<span class="li"><span class="sw" style="background:'+cubColor(2)+'"></span>컵 2기</span>';
}
// 그리드 이벤트 배선 — 드래그/리사이즈/삭제/취재불필요/빈칸 클릭
function wireTimetableGrid(box){
  box.querySelectorAll('.ttg-ev').forEach(function(el){ el.addEventListener('pointerdown',function(e){
    if(e.target.closest('.ttg-del')||e.target.closest('.ttg-cov')||e.target.closest('.ttg-rz')) return;   // 버튼은 드래그 시작 제외
    ttPointerDown(e, el.dataset.id, 'move'); }); });
  box.querySelectorAll('.ttg-rz.top').forEach(function(el){ el.addEventListener('pointerdown',function(e){ e.stopPropagation(); ttPointerDown(e, el.dataset.id, 'resize-top'); }); });
  box.querySelectorAll('.ttg-rz.bot').forEach(function(el){ el.addEventListener('pointerdown',function(e){ e.stopPropagation(); ttPointerDown(e, el.dataset.id, 'resize-bottom'); }); });
  box.querySelectorAll('.ttg-del').forEach(function(el){ el.addEventListener('pointerdown',function(e){ e.stopPropagation(); }); el.onclick=function(e){ e.stopPropagation(); deleteTT(el.dataset.id); }; });
  box.querySelectorAll('.ttg-cov').forEach(function(el){ el.addEventListener('pointerdown',function(e){ e.stopPropagation(); }); el.onclick=function(e){ e.stopPropagation(); toggleNoCover(el.dataset.cov); }; });
  box.querySelectorAll('.ttg-cell').forEach(function(el){ el.onclick=function(e){
    var oy=e.clientY-el.getBoundingClientRect().top;
    var frac=Math.max(0, Math.min(0.75, snap15(oy/TT_HH)));
    openTT(null, el.dataset.day, (+el.dataset.h)+frac);
  }; });
  box.querySelectorAll('.ttg-pr[data-pid]').forEach(function(el){ el.onclick=function(e){ e.stopPropagation(); setView('protocol'); }; });
}
function renderTimetable(){
  renderTTControls();
  renderTTLegend();
  var box=document.getElementById('tt-grid'); if(!box) return;
  var dayView=(ttMode==='day');
  var days=dayView ? [ jamDay(ttDay) || JAM_DAYS[3] ] : JAM_DAYS;
  box.className='ttgrid'+(dayView?' ttgrid-day':'');
  TT_HH=dayView?TT_HH_DAY:TT_HH_PERIOD;   // 전역 — 드래그·셀 클릭이 같은 값을 참조
  box.innerHTML=ttHeadHtml(days)+'<div class="ttg-body">'+ttHoursHtml(TT_HH)+
    days.map(function(d){ return ttColumnHtml(d, dayView, TT_HH); }).join('')+'</div>';
  wireTimetableGrid(box);
}
/* 시간 입력: 시/분 숫자 입력(드롭다운 대신) */
function ttTimeFields(prefix, val){ var h=t2h(val); var hh=h!=null?Math.floor(h):9; var mm=h!=null?Math.round((h-Math.floor(h))*60):0; return '<span class="evtimegrp"><input type="number" class="evtime" id="'+prefix+'h" min="0" max="23" value="'+hh+'" inputmode="numeric" aria-label="시"><span class="evcolon">:</span><input type="number" class="evtime" id="'+prefix+'m" min="0" max="59" step="5" value="'+mm+'" inputmode="numeric" aria-label="분"></span>'; }
function readTimeFields(prefix){ var he=document.getElementById(prefix+'h'), me=document.getElementById(prefix+'m'); var h=Math.max(0,Math.min(23,parseInt(he&&he.value,10)||0)); var m=Math.max(0,Math.min(59,parseInt(me&&me.value,10)||0)); return pad2(h)+':'+pad2(m); }
/* ----- 드래그(이동)·리사이즈(상/하단 길이) — 15분 단위 스냅 ----- */
var ttDrag=null;
function ttColAt(x){ var cols=document.querySelectorAll('.ttg-col'); for(var i=0;i<cols.length;i++){ var r=cols[i].getBoundingClientRect(); if(x>=r.left&&x<=r.right) return cols[i]; } return null; }
function ttPointerDown(e, id, mode){
  if(e.button!=null && e.button!==0) return;
  var t=ttList().filter(function(x){return x.id===id;})[0]; if(!t) return;
  e.preventDefault();
  var s=t2h(t.start), en=t2h(t.end); if(s==null) s=TT_HS; if(en==null||en<=s) en=s+0.5;
  ttDrag={id:id, mode:mode, startY:e.clientY, startX:e.clientX, s0:s, e0:en, dur:en-s, day:t.day, newDay:t.day, moved:false, curS:s, curE:en,
          el:document.querySelector('.ttg-ev[data-id="'+id+'"]')};
  document.addEventListener('pointermove', ttPointerMove);
  document.addEventListener('pointerup', ttPointerUp);
  document.body.classList.add('tt-dragging');
}
function ttPointerMove(e){
  if(!ttDrag) return;
  var dyH=(e.clientY-ttDrag.startY)/TT_HH;
  if(Math.abs(e.clientY-ttDrag.startY)>3 || Math.abs(e.clientX-ttDrag.startX)>3) ttDrag.moved=true;
  var el=ttDrag.el; if(!el) return;
  if(ttDrag.mode==='move'){
    var ns=Math.max(TT_HS, Math.min(snap15(ttDrag.s0+dyH), TT_HE-ttDrag.dur));
    el.style.top=((ns-TT_HS)*TT_HH)+'px'; ttDrag.curS=ns; ttDrag.curE=ns+ttDrag.dur;
    if(ttMode!=='day'){
      document.querySelectorAll('.ttg-col.dropday').forEach(function(c){c.classList.remove('dropday');});
      var col=ttColAt(e.clientX);
      if(col){ ttDrag.newDay=col.getAttribute('data-day'); if(ttDrag.newDay!==ttDrag.day) col.classList.add('dropday'); }
    }
  } else if(ttDrag.mode==='resize-bottom'){
    var ne=Math.max(ttDrag.s0+TT_SNAP, Math.min(snap15(ttDrag.e0+dyH), TT_HE));
    el.style.height=(((ne-ttDrag.s0)*TT_HH)-3)+'px'; ttDrag.curS=ttDrag.s0; ttDrag.curE=ne;
  } else if(ttDrag.mode==='resize-top'){
    var nst=Math.min(ttDrag.e0-TT_SNAP, Math.max(snap15(ttDrag.s0+dyH), TT_HS));
    el.style.top=((nst-TT_HS)*TT_HH)+'px'; el.style.height=(((ttDrag.e0-nst)*TT_HH)-3)+'px'; ttDrag.curS=nst; ttDrag.curE=ttDrag.e0;
  }
  var lab=el.querySelector('.ttg-evm'); if(lab) lab.textContent=h2hhmm(ttDrag.curS)+'–'+h2hhmm(ttDrag.curE);
}
function ttPointerUp(){
  document.removeEventListener('pointermove', ttPointerMove);
  document.removeEventListener('pointerup', ttPointerUp);
  document.body.classList.remove('tt-dragging');
  document.querySelectorAll('.ttg-col.dropday').forEach(function(c){c.classList.remove('dropday');});
  var d=ttDrag; ttDrag=null; if(!d) return;
  if(!d.moved){ openTT(d.id); return; }
  var t=ttList().filter(function(x){return x.id===d.id;})[0]; if(!t){ renderTimetable(); return; }
  var s=snap15(d.curS), en=snap15(d.curE); if(en<=s) en=s+TT_SNAP;
  t.start=h2hhmm(s); t.end=h2hhmm(en);
  if(ttMode!=='day' && d.mode==='move' && d.newDay) t.day=d.newDay;
  saveTimetable(); renderTimetable(); if(curViewMode==='staff') renderStaff();
}
function deleteTT(id){
  var t=ttById(id); if(!t) return;
  if(!confirm('이 일정을 삭제할까요?\n\n'+(t.title||'(제목 없음)')+'  ·  '+(t.start||'')+(t.end?('–'+t.end):''))) return;
  removeTt(id);
  afterTimetableChange(); toast('일정 삭제됨');
}
/* ----- 시간 일정 편집 모달 ----- */
var ttDraft=null;
function openTT(id, day, hour){
  var ex=id?ttList().filter(function(t){return t.id===id;})[0]:null;
  if(ex){ ttDraft=clone(ex); if(!Array.isArray(ttDraft.assignees)) ttDraft.assignees=[]; if(!Array.isArray(ttDraft.contacts)) ttDraft.contacts=[]; }
  else { var hh=(hour!=null&&!isNaN(hour))?hour:9; var pad=function(n){return (n<10?'0':'')+n+':00';};
    ttDraft={id:mkid(), day:day||'2026-08-05', start:pad(hh), end:pad(Math.min(hh+1,23)), title:'', place:'', zone:'', cat:'프로그램', assignees:[], contacts:[], memo:'', rundown:[], noCover:false, _new:true}; }
  if(!Array.isArray(ttDraft.rundown)) ttDraft.rundown=[];
  renderTTModal();
  document.getElementById('tt-scrim').classList.add('show');
}
function closeTT(){ document.getElementById('tt-scrim').classList.remove('show'); ttDraft=null; }
function renderTTModal(){
  document.getElementById('tt-mtitle').textContent=ttDraft._new?'새 시간 일정':'시간 일정 편집';
  document.getElementById('tt-del').style.display=ttDraft._new?'none':'inline-flex';
  var b=document.getElementById('tt-body');
  var dayOpts=JAM_DAYS.map(function(d){var dd=ymd(d[0]);return '<option value="'+d[0]+'"'+(d[0]===ttDraft.day?' selected':'')+'>8/'+dd.getDate()+' ('+WDS[dd.getDay()]+')'+(d[1]?(' '+esc(d[1])):'')+'</option>';}).join('');
  var people=rosterList();
  var asgHtml=people.length?people.map(function(m){
    var on=ttDraft.assignees.indexOf(m.id)>=0;
    var off=offConflict(m.id, ttDraft.day, t2h(ttDraft.start), t2h(ttDraft.end));
    var cls='evkind asg'+(off?(on?' offwarn':' offdis'):'');
    var style=on?'background:var(--accent);border-color:var(--accent);color:#fff':'';
    return '<button type="button" class="'+cls+'" data-pid="'+esc(m.id)+'"'+(style?(' style="'+style+'"'):'')+' title="'+(off?('오프타임('+off+') — 배정 불가'):'')+'">'+esc(personLabel(m))+(off?(' · 오프('+off+')'):'')+'</button>';
  }).join(''):'<span class="hintmini">먼저 <b>인원·배치</b> 탭에서 인원을 추가하세요.</span>';
  var conSel=(ttDraft.contacts||[]);
  var conRows=conSel.map(function(cid,idx){
    var c=contactById(cid);
    var nm=c?contactLabel(c):'(삭제된 연락처)';
    return '<div class="conrow"><span class="condot"></span><span class="conname">'+esc(nm)+'</span>'+
      (c&&c.role?'<span class="conrole">'+esc(c.role)+'</span>':'')+
      (c&&c.phone?'<span class="conphone mono">'+esc(c.phone)+'</span>':'<span class="conphone none">전화 미입력</span>')+
      '<button type="button" class="conrm" data-idx="'+idx+'" title="연결 해제" aria-label="해제">'+icon('x',13)+'</button></div>';
  }).join('');
  var conPicker = conSel.length<3
    ? '<div class="conpick"><input type="text" class="conpick-input" id="tt-conpick-input" placeholder="이름 또는 직함으로 검색 · 선택" autocomplete="off"><div class="conpick-menu" id="tt-conpick-menu"></div></div>'
    : '<div class="hintmini">연락처는 최대 3명까지 연결할 수 있습니다.</div>';
  var conSection = conRows + conPicker;
  b.innerHTML=
    '<div class="evfld"><label>종류 — 클릭해 선택 · 입력 후 Enter로 추가 · ✕로 삭제</label><div class="chipset" id="tt-catset">'+
      ttCats().map(function(c){var on=ttDraft.cat===c[0];return '<span class="csel'+(on?' on':'')+'" data-c="'+esc(c[0])+'" style="'+(on?('background:'+c[1]+';border-color:'+c[1]+';color:#fff'):'')+'"><input type="color" class="ccolor" data-c="'+esc(c[0])+'" value="'+esc(c[1])+'" title="색상 변경">'+esc(c[0])+'<button type="button" class="cx" data-c="'+esc(c[0])+'" title="종류 삭제" aria-label="삭제">'+icon('x',11)+'</button></span>';}).join('')+
      '<input type="text" class="cinput" id="tt-catinput" placeholder="+ 종류 입력">'+
    '</div></div>'+
    '<div class="evfld"><label>날짜</label><select id="tt-f-day" class="evinput">'+dayOpts+'</select></div>'+
    '<div class="evfld"><label>시간 (시작 ~ 종료) · 24시간제 · 숫자 입력 (시 : 분)</label><div class="evrow evtimerow">'+ttTimeFields('tt-s',ttDraft.start)+'<span class="evtilde">~</span>'+ttTimeFields('tt-e',ttDraft.end)+'</div></div>'+
    '<div class="evfld"><label>반복 — 같은 일정을 추가할 다른 날짜 선택(선택)</label><div class="evkinds" id="tt-rep">'+
      JAM_DAYS.map(function(d){var dd=ymd(d[0]);var on=(ttDraft._repeat||[]).indexOf(d[0])>=0;var base=d[0]===ttDraft.day;return '<button type="button" class="evkind rep'+(on?' on':'')+'" data-d="'+d[0]+'"'+(base?' disabled title="기준 날짜"':'')+(on?' style="background:var(--accent);border-color:var(--accent);color:#fff"':'')+'>8/'+dd.getDate()+'<span class="repwd">('+WDS[dd.getDay()]+')</span>'+(base?' 기준':'')+'</button>';}).join('')+
    '</div></div>'+
    '<div class="evfld"><label>제목</label><input id="tt-f-title" type="text" class="evinput" value="'+esc(ttDraft.title)+'" placeholder="예: 개영식 / 모듈 프로그램"></div>'+
    '<div class="evfld"><label class="nccheck"><input type="checkbox" id="tt-f-nocover"'+(ttDraft.noCover?' checked':'')+'><span><b>취재 불필요</b> — 홍보부가 취재하지 않는 일정. 체크하면 일정표에서 흐리게 표시됩니다.</span></label></div>'+
    '<div class="evfld"><label>장소</label><input id="tt-f-place" type="text" class="evinput" value="'+esc(ttDraft.place)+'" placeholder="예: 메인 스타디움"></div>'+
    '<div class="evfld"><label>현장 지도 구역 (선택) — 지정하면 <b>현장 위치 지도</b>의 일정표 연동에서 정확히 표시됩니다</label><select id="tt-f-zone" class="evinput">'+zoneOptions(ttDraft.zone)+'</select></div>'+
    '<div class="evfld"><label>담당 인원 (배치) — 지정하면 인원·배치에 자동 반영</label><div class="evkinds" id="tt-asg">'+asgHtml+'</div></div>'+
    '<div class="evfld"><label>관련 취재 연락처 (최대 3명) — 이름을 선택하면 직함·전화가 자동으로 표시됩니다 (동명이인은 직함으로 검색)</label><div id="tt-con">'+conSection+'</div></div>'+
    '<div class="evfld"><label>메모 · 촬영 포인트</label><textarea id="tt-f-memo" class="evinput" rows="2">'+esc(ttDraft.memo)+'</textarea></div>'+
    '<div class="evfld"><label>세부 일정 · 식순 (개영식 등 행사 진행 순서) — 선택</label><div class="rundown" id="tt-rundown">'+
      (ttDraft.rundown||[]).map(function(r,i){ return '<div class="rd-row">'+
        '<input type="text" class="rd-in rd-time" data-i="'+i+'" data-f="time" value="'+esc(r.time||'')+'" placeholder="20:00">'+
        '<input type="text" class="rd-in rd-title" data-i="'+i+'" data-f="title" value="'+esc(r.title||'')+'" placeholder="순서 · 내용 (예: 개회 선언)">'+
        '<input type="text" class="rd-in rd-note" data-i="'+i+'" data-f="note" value="'+esc(r.note||'')+'" placeholder="비고 · 담당">'+
        '<button type="button" class="rd-del" data-i="'+i+'" title="행 삭제" aria-label="삭제">'+icon('x',12)+'</button></div>'; }).join('')+
      '<button type="button" class="rd-add" id="tt-rd-add">'+icon('plus',13)+' 순서 추가</button>'+
    '</div></div>';
  b.querySelectorAll('#tt-catset .csel').forEach(function(ch){ ch.addEventListener('click',function(e){ if(e.target.closest('.cx')||e.target.closest('.ccolor')) return; ttDraft.cat=ch.dataset.c; renderTTModal(); }); });
  b.querySelectorAll('#tt-catset .ccolor').forEach(function(cc){ cc.addEventListener('click',function(e){ e.stopPropagation(); }); cc.addEventListener('change',function(e){ e.stopPropagation(); cc.value=setTtCatColor(cc.dataset.c, cc.value); renderTimetable(); renderTTModal(); }); });
  b.querySelectorAll('#tt-catset .cx').forEach(function(x){ x.addEventListener('click',function(e){ e.stopPropagation(); var nm=x.dataset.c; if(deleteTtCat(nm)){ if(ttDraft.cat===nm) ttDraft.cat=(ttCats()[0]||['프로그램'])[0]; renderTTModal(); } }); });
  var ci=b.querySelector('#tt-catinput'); if(ci) ci.addEventListener('keydown',function(e){ if(e.key==='Enter'){ if(e.isComposing||e.keyCode===229) return; e.preventDefault(); var v=this.value.trim(); if(v && addTtCat(v)) ttDraft.cat=v; this.value=''; renderTTModal(); var ni=document.getElementById('tt-catinput'); if(ni) ni.focus(); } });
  b.querySelectorAll('.evkind.asg').forEach(function(bt){ bt.onclick=function(){ var pid=bt.dataset.pid; var i=ttDraft.assignees.indexOf(pid);
    if(i>=0){ ttDraft.assignees.splice(i,1); }
    else { var off=offConflict(pid, ttDraft.day, t2h(ttDraft.start), t2h(ttDraft.end)); if(off){ toast(personLabel(rosterById(pid))+' 님은 이 시간 오프('+off+')라 배정할 수 없습니다'); return; } ttDraft.assignees.push(pid); }
    renderTTModal(); }; });
  b.querySelectorAll('#tt-con .conrm').forEach(function(bt){ bt.onclick=function(){ var i=+bt.dataset.idx; if(ttDraft.contacts && i>=0 && i<ttDraft.contacts.length){ ttDraft.contacts.splice(i,1); renderTTModal(); } }; });
  var pin=b.querySelector('#tt-conpick-input'), pmenu=b.querySelector('#tt-conpick-menu');
  if(pin && pmenu){
    var addLinkedContact=function(cid){ if(!ttDraft.contacts) ttDraft.contacts=[]; if(ttDraft.contacts.length>=3){ toast('연락처는 최대 3명까지'); return; } if(ttDraft.contacts.indexOf(cid)<0) ttDraft.contacts.push(cid); renderTTModal(); };
    var createAndLink=function(nm){ nm=(nm||'').trim(); if(!nm) return; var nc={id:mkid(),name:nm,org:'',role:'',phone:'',email:'',memo:''}; contactList().push(nc); saveContacts(); addLinkedContact(nc.id); };
    var renderMenu=function(){
      var q=(pin.value||'').trim().toLowerCase();
      var sel=ttDraft.contacts||[];
      var opts=contactList().filter(function(c){ return sel.indexOf(c.id)<0; }).filter(function(c){
        if(!q) return true; return [c.name,c.role,c.org,c.phone].join(' ').toLowerCase().indexOf(q)>=0;
      });
      var html=opts.map(function(c){
        return '<div class="conpick-opt" data-cid="'+esc(c.id)+'"><span class="co-name">'+esc(contactLabel(c))+'</span>'+
          (c.role?'<span class="co-role">'+esc(c.role)+'</span>':'')+
          (c.phone?'<span class="co-phone mono">'+esc(c.phone)+'</span>':'')+'</div>';
      }).join('');
      var typed=(pin.value||'').trim();
      if(!opts.length && !typed) html='<div class="conpick-empty">등록된 연락처가 없습니다. 이름을 입력해 추가하세요.</div>';
      if(typed) html+='<div class="conpick-add" data-new="'+esc(typed)+'">'+icon('plus',13)+' ‘'+esc(typed)+'’ 새 연락처로 추가</div>';
      pmenu.innerHTML=html;
      pmenu.querySelectorAll('.conpick-opt').forEach(function(o){ o.onmousedown=function(ev){ ev.preventDefault(); addLinkedContact(o.dataset.cid); }; });
      var addEl=pmenu.querySelector('.conpick-add'); if(addEl) addEl.onmousedown=function(ev){ ev.preventDefault(); createAndLink(addEl.dataset.new); };
    };
    pin.onfocus=function(){ pmenu.classList.add('show'); renderMenu(); };
    pin.oninput=renderMenu;
    pin.onkeydown=function(ev){ if(ev.key==='Enter'){ if(ev.isComposing||ev.keyCode===229) return; ev.preventDefault(); var first=pmenu.querySelector('.conpick-opt'); if(first) addLinkedContact(first.dataset.cid); else createAndLink(pin.value); } else if(ev.key==='Escape'){ pmenu.classList.remove('show'); } };
    pin.onblur=function(){ setTimeout(function(){ if(pmenu) pmenu.classList.remove('show'); },180); };
  }
  b.querySelector('#tt-f-day').onchange=function(){ ttDraft.day=this.value; if(ttDraft._repeat) ttDraft._repeat=ttDraft._repeat.filter(function(x){return x!==ttDraft.day;}); renderTTModal(); };
  function syncStart(){ ttDraft.start=readTimeFields('tt-s'); }
  function syncEnd(){ ttDraft.end=readTimeFields('tt-e'); }
  ['tt-sh','tt-sm'].forEach(function(idd){ var el=b.querySelector('#'+idd); if(el){ el.addEventListener('input',syncStart); el.addEventListener('change',function(){ syncStart(); if(t2h(ttDraft.end)<=t2h(ttDraft.start)) ttDraft.end=h2hhmm(t2h(ttDraft.start)+TT_SNAP); renderTTModal(); }); } });
  ['tt-eh','tt-em'].forEach(function(idd){ var el=b.querySelector('#'+idd); if(el) el.addEventListener('input',syncEnd); });
  b.querySelectorAll('#tt-rep .rep').forEach(function(bt){ if(bt.disabled) return; bt.onclick=function(){ if(!ttDraft._repeat) ttDraft._repeat=[]; var dd=bt.dataset.d; var i=ttDraft._repeat.indexOf(dd); if(i>=0) ttDraft._repeat.splice(i,1); else ttDraft._repeat.push(dd); renderTTModal(); }; });
  b.querySelector('#tt-f-title').oninput=function(){ ttDraft.title=this.value; };
  b.querySelector('#tt-f-nocover').onchange=function(){ ttDraft.noCover=this.checked; };
  b.querySelector('#tt-f-place').oninput=function(){ ttDraft.place=this.value; };
  var zsel=b.querySelector('#tt-f-zone'); if(zsel) zsel.onchange=function(){ ttDraft.zone=this.value; };
  b.querySelector('#tt-f-memo').oninput=function(){ ttDraft.memo=this.value; };
  b.querySelectorAll('#tt-rundown .rd-in').forEach(function(inp){ inp.addEventListener('input',function(){ var i=+inp.dataset.i; if(ttDraft.rundown&&ttDraft.rundown[i]) ttDraft.rundown[i][inp.dataset.f]=inp.value; }); });
  b.querySelectorAll('#tt-rundown .rd-del').forEach(function(x){ x.onclick=function(){ var i=+x.dataset.i; if(ttDraft.rundown){ ttDraft.rundown.splice(i,1); renderTTModal(); } }; });
  var rdAdd=b.querySelector('#tt-rd-add'); if(rdAdd) rdAdd.onclick=function(){ if(!Array.isArray(ttDraft.rundown)) ttDraft.rundown=[]; ttDraft.rundown.push({time:'',title:'',note:''}); renderTTModal(); };
}
function ttIdx(id){ var l=ttList(); for(var i=0;i<l.length;i++) if(l[i].id===id) return i; return -1; }
function ttById(id){ var i=ttIdx(id); return i<0?null:ttList()[i]; }
/* 일정표 변경 후 공통 후처리 — 저장 + 영향받는 뷰 갱신.
   deleteTT·toggleNoCover·finishTT·deleteTTCur 이 같은 3줄을 각자 복사하고 있어 하나로 합침. */
function afterTimetableChange(){
  saveTimetable(); renderTimetable();
  if(curViewMode==='staff') renderStaff();   // 현장 배치는 일정표에서 파생되므로 같이 갱신
}
/* --- 데이터 변경만 담당 (저장·렌더·알림은 호출부 책임) --- */
function setTtNoCover(id, on){ var t=ttById(id); if(!t) return null; t.noCover=!!on; return t; }
function removeTt(id){ state.timetable=ttList().filter(function(t){ return t.id!==id; }); }
function buildCleanTT(){ return {id:ttDraft.id, day:ttDraft.day, start:ttDraft.start, end:ttDraft.end, title:ttDraft.title.trim(), place:ttDraft.place||'', zone:ttDraft.zone||'', cat:ttDraft.cat, assignees:(ttDraft.assignees||[]).slice(), contacts:(ttDraft.contacts||[]).slice(), memo:ttDraft.memo||'', series:ttDraft.series||'', tipId:ttDraft.tipId||'', track:ttDraft.track||'', batch:ttDraft.batch||0, noCover:!!ttDraft.noCover, rundown:(ttDraft.rundown||[]).filter(function(r){return (r.time||r.title||r.note);}).map(function(r){return {time:r.time||'',title:r.title||'',note:r.note||''};})}; }
/* 취재 불필요 — 그리드 블록에서 바로 토글(여러 건을 빠르게 표시하려고 모달 없이) */
function toggleNoCover(id){
  var t=setTtNoCover(id, !((ttById(id)||{}).noCover));
  if(!t) return;
  afterTimetableChange();
  toast(t.noCover?'취재 불필요로 표시':'취재 필요로 되돌림');
}
function ttCopy(src, day, sid){ return Object.assign({},src,{id:mkid(),day:day,series:sid,assignees:src.assignees.slice(),contacts:src.contacts.slice(),rundown:(src.rundown||[]).map(function(r){return Object.assign({},r);})}); }
function finishTT(msg){ afterTimetableChange(); closeTT(); toast(msg); }
/* 반복 일정 수정 범위 선택 — 이 일정만 / 모든 반복 */
function askSeriesScope(cb){
  var ov=document.createElement('div'); ov.className='scrim show'; ov.style.zIndex='300';
  ov.innerHTML='<div class="modal" style="max-width:380px"><div class="mhead"><div class="mt">반복 일정 수정</div></div>'+
    '<div class="mbody"><p style="margin:0;color:var(--ink-2);font-size:14px;line-height:1.65">이 일정은 <b>여러 날 반복</b> 일정입니다.<br>어떻게 수정할까요?</p></div>'+
    '<div class="mfoot"><button class="btn ghost sm" data-a="cancel">취소</button><span class="spacer"></span><button class="btn sm" data-a="one">이 일정만</button><button class="btn solid" data-a="all">모든 반복 일정</button></div></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){ if(e.target===ov){ document.body.removeChild(ov); return; } var a=e.target.closest('[data-a]'); if(!a) return; var act=a.dataset.a; document.body.removeChild(ov); if(act==='one'||act==='all') cb(act); });
}
function commitTT(){
  if(!ttDraft) return;
  if(!(ttDraft.title||'').trim()){ toast('일정 제목을 입력하세요'); return; }
  var sH=t2h(ttDraft.start), eH=t2h(ttDraft.end); if(eH==null||sH==null||eH<=sH) ttDraft.end=h2hhmm((sH==null?TT_HS:sH)+TT_SNAP);
  var clean=buildCleanTT();
  var list=ttList();
  var rep=(ttDraft._repeat||[]).filter(function(x){return x && x!==clean.day;});
  var others=clean.series?list.filter(function(x){return x.series===clean.series && x.id!==clean.id;}):[];
  function applyOne(){ var i=ttIdx(clean.id); if(i>=0) list[i]=clean; else list.push(clean); }
  function addReps(sid){ rep.forEach(function(dy){ list.push(ttCopy(clean,dy,sid)); }); }
  // 기존 + 시리즈(다른 반복 멤버 존재) → 범위 물어보기
  if(!ttDraft._new && others.length){
    askSeriesScope(function(scope){
      applyOne();
      if(scope==='all'){ others.forEach(function(o){ o.title=clean.title; o.start=clean.start; o.end=clean.end; o.cat=clean.cat; o.place=clean.place; o.zone=clean.zone; o.memo=clean.memo; o.noCover=clean.noCover; o.assignees=clean.assignees.slice(); o.contacts=clean.contacts.slice(); o.rundown=(clean.rundown||[]).map(function(r){return Object.assign({},r);}); }); }
      if(rep.length) addReps(clean.series);
      finishTT(scope==='all'?'반복 일정 전체 수정됨':'이 일정만 수정됨');
    });
    return;
  }
  // 반복 날짜 선택됨 → 시리즈 생성/확장
  if(rep.length){ var sid=clean.series||('ser'+mkid()); clean.series=sid; applyOne(); addReps(sid); finishTT('시간 일정 저장됨 · '+rep.length+'일 반복 추가'); return; }
  // 단건
  applyOne(); finishTT('시간 일정 저장됨');
}
function deleteTTCur(){
  if(!ttDraft||ttDraft._new){ closeTT(); return; }
  if(!confirm('이 시간 일정을 삭제할까요?')) return;
  removeTt(ttDraft.id);
  afterTimetableChange(); closeTT(); toast('삭제됨');
}
function addTT(){ openTT(null,'2026-08-05',9); }

/* ===== 홍보부 인원 R&R + 배치(일정표 기반) 렌더 ===== */
function renderStaff(){
  var rb=document.getElementById('roster-body');
  if(rb){ rb.innerHTML='';
    var people=rosterList();
    TEAM_ORDER.forEach(function(tk){
      var members=people.filter(function(m){ return teamOf(m)===tk; });
      // 팀 구분 헤더 행(홍보부장 = 고정 라벨 / 1·2팀 = 이름 편집)
      var htr=document.createElement('tr'); htr.className='team-row team-'+tk;
      var teamCtrl = tk==='lead'
        ? '<span class="team-badge lead">홍보부장</span>'
        : '<span class="team-badge '+tk+'"></span><input class="team-name" data-team="'+tk+'" value="'+esc(teamNames()[tk])+'" placeholder="팀 이름" aria-label="팀 이름">';
      htr.innerHTML='<td colspan="7"><div class="team-hd">'+teamCtrl+
        '<button class="btn xs team-add" data-team="'+tk+'">'+icon('plus',13)+' 인원 추가</button>'+
        '<span class="team-count">'+members.length+'명</span></div></td>';
      rb.appendChild(htr);
      var addName=htr.querySelector('.team-name');
      if(addName){
        addName.addEventListener('input',function(){ teamNames()[tk]=addName.value; saveRoster(); });
        addName.addEventListener('blur',function(){ teamNames()[tk]=addName.value.trim(); renderStaff(); saveRoster(); renderDerivedPlacement(); });
      }
      htr.querySelector('.team-add').onclick=function(){ addRoster(tk); };
      // 팀 소속 인원 행
      members.forEach(function(m){
        var tr=document.createElement('tr'); tr.className='member-row';
        var teamSel='<select class="team-sel" data-f="team" title="팀 이동">'+
          TEAM_ORDER.map(function(o){ return '<option value="'+o+'"'+(teamOf(m)===o?' selected':'')+'>'+esc(teamLabel(o))+'</option>'; }).join('')+'</select>';
        tr.innerHTML=
          '<td class="mk" contenteditable data-f="role">'+esc(m.role)+'</td>'+
          '<td class="mk" contenteditable data-f="name">'+esc(m.name)+'</td>'+
          '<td class="mk" contenteditable data-f="duty">'+esc(m.duty)+'</td>'+
          '<td class="mk" contenteditable data-f="channel">'+esc(m.channel)+'</td>'+
          '<td class="mk" contenteditable data-f="contact">'+esc(m.contact)+'</td>'+
          '<td>'+teamSel+'</td>'+
          '<td><button class="rm" title="삭제">'+icon('trash',14)+'</button></td>';
        tr.querySelectorAll('td.mk').forEach(function(td){ td.addEventListener('blur',function(){ m[td.dataset.f]=td.textContent.trim(); saveRoster(); renderOfftimes(); renderDerivedPlacement(); }); });
        tr.querySelector('.team-sel').onchange=function(){ m.team=this.value; renderStaff(); saveRoster(); renderDerivedPlacement(); };
        tr.querySelector('.rm').onclick=function(){ state.roster=rosterList().filter(function(x){return x!==m;}); renderStaff(); saveRoster(); renderOfftimes(); renderDerivedPlacement(); };
        rb.appendChild(tr);
      });
    });
  }
  renderOfftimes();
  renderDerivedPlacement();
}
function renderOfftimes(){
  var box=document.getElementById('offtimes'); if(!box) return;
  var people=rosterList();
  if(!people.length){ box.innerHTML='<p class="empty-note">먼저 위 R&amp;R 표에 인원을 추가하세요.</p>'; return; }
  var DAYS_E=offDays();
  var H='<div class="offwrap"><table class="offtbl"><thead><tr><th class="offname">인원</th>';
  DAYS_E.forEach(function(d){ var dd=ymd(d[0]); H+='<th>8/'+dd.getDate()+'<span>'+WDS[dd.getDay()]+(d[1]?(' '+esc(d[1])):'')+'</span></th>'; });
  H+='</tr></thead><tbody>';
  people.forEach(function(m){
    H+='<tr><td class="offname">'+esc(personLabel(m))+'</td>';
    DAYS_E.forEach(function(d){
      H+='<td class="offcell">'+OFF_BLOCKS.map(function(bk,i){
        if(!offAllowed(d[0],i)) return '<span class="offtog na" title="이 시간은 오프 지정 불가">'+bk[1]+'</span>';
        var off=isOff(m.id,d[0],bk[0]); return '<button type="button" class="offtog'+(off?' off':'')+'" data-pid="'+esc(m.id)+'" data-d="'+d[0]+'" data-bk="'+bk[0]+'" title="'+bk[1]+' '+bk[2]+(off?' · 오프':'')+'">'+bk[1]+'</button>';
      }).join('')+'</td>';
    });
    H+='</tr>';
  });
  H+='</tbody></table></div>';
  box.innerHTML=H;
  box.querySelectorAll('.offtog').forEach(function(bt){ bt.onclick=function(){ toggleOff(bt.dataset.pid, bt.dataset.d, bt.dataset.bk); renderOfftimes(); renderDerivedPlacement(); }; });
}
function placeSlotHTML(t, pid){ var dd=ymd(t.day); var off=pid?offConflict(pid,t.day,t2h(t.start),t2h(t.end)):null; return '<div class="pslot'+(off?' conflict':'')+'" data-id="'+esc(t.id)+'" title="'+(off?('오프타임('+off+')과 겹침'):'')+'"><span class="pdot" style="background:'+ttCatColor(t.cat)+'"></span><span class="pday">8/'+dd.getDate()+' ('+WDS[dd.getDay()]+')</span><span class="ptime mono">'+esc(t.start||'')+(t.end?('–'+t.end):'')+'</span><span class="pwhere">'+esc(t.place||'장소 미정')+'</span><span class="pwhat">'+esc(t.title||'')+'</span>'+(off?'<span class="pconf">오프충돌</span>':'')+'</div>'; }
function dayIdx(d){ for(var i=0;i<JAM_DAYS.length;i++) if(JAM_DAYS[i][0]===d) return i; return 99; }
function ttHours(t){ var s=t2h(t.start), e=t2h(t.end); if(s==null||e==null||e<=s) return 0; return e-s; }
function fmtDur(h){ if(!h) return '0분'; var mins=Math.round(h*60), hh=Math.floor(mins/60), mm=mins%60; return (hh?hh+'시간':'')+(hh&&mm?' ':'')+(mm?mm+'분':'')||'0분'; }
function sumHours(items){ return items.reduce(function(a,t){return a+ttHours(t);},0); }
function sortByDayTime(a,b){ var da=dayIdx(a.day), db=dayIdx(b.day); if(da!==db) return da-db; return (a.start||'')<(b.start||'')?-1:(a.start||'')>(b.start||'')?1:0; }
function renderDerivedPlacement(){
  var box=document.getElementById('place-derived');
  var people=rosterList();
  if(box){
    if(!people.length){ box.innerHTML='<p class="empty-note">먼저 위 R&amp;R 표에 인원을 추가하고, <b>잼버리 일정표</b>에서 일정에 담당으로 지정하세요.</p>'; }
    else {
      var H='';
      people.forEach(function(m){
        var items=ttList().filter(function(t){ return (t.assignees||[]).indexOf(m.id)>=0; }).slice().sort(sortByDayTime);
        var tot=sumHours(items);
        H+='<div class="pcard"><div class="pcard-h"><span class="pname">'+esc(personLabel(m))+'</span>'+((m.name&&m.role)?'<span class="prole">'+esc(m.role)+'</span>':'')+'<span class="pcount">'+(items.length?(items.length+'건'):'배치 없음')+'</span>'+(items.length?('<span class="phours" title="총 투입시간">'+fmtDur(tot)+'</span>'):'')+'</div>';
        if(items.length){ H+='<div class="pslots">'+items.map(function(t){return placeSlotHTML(t,m.id);}).join('')+'</div>'; }
        else { H+='<div class="pempty">일정표에서 이 인원을 담당으로 지정하면 시간·장소가 자동으로 표시됩니다.</div>'; }
        H+='</div>';
      });
      box.innerHTML=H;
      box.querySelectorAll('.pslot[data-id]').forEach(function(el){ el.onclick=function(){ openTT(el.dataset.id); }; });
    }
  }
  // 담당자 미지정 일정 — 현장 배치와 별도 구분 섹션
  var un=ttList().filter(function(t){ return !(t.assignees&&t.assignees.length); }).slice().sort(sortByDayTime);
  var ubox=document.getElementById('place-unassigned'), uhead=document.getElementById('unassigned-head');
  if(ubox){
    if(un.length){
      if(uhead) uhead.style.display=''; ubox.style.display='';
      ubox.innerHTML='<div class="pcard pcard-un"><div class="pcard-h"><span class="pname">담당자 미지정</span><span class="pcount warn">'+un.length+'건 · 배정 필요</span></div><div class="pslots">'+un.map(placeSlotHTML).join('')+'</div></div>';
      ubox.querySelectorAll('.pslot[data-id]').forEach(function(el){ el.onclick=function(){ openTT(el.dataset.id); }; });
    } else {
      if(uhead) uhead.style.display='none'; ubox.style.display='none'; ubox.innerHTML='';
    }
  }
}
function addRoster(team){ rosterList().push({id:mkid(),name:'',role:'',duty:'',contact:'',channel:'',team:team||'t1'}); renderStaff(); saveRoster(); }

/* ===== 취재 연락처 탭 (주소록 + 연결된 일정) ===== */
var conSearchQ='', conSearchTimer=null;
function contactSchedules(cid){ return ttList().filter(function(t){ return (t.contacts||[]).indexOf(cid)>=0; }).slice().sort(sortByDayTime); }
function matchContact(c){
  var q=(conSearchQ||'').trim().toLowerCase(); if(!q) return true;
  var hay=[c.name,c.org,c.role,c.phone,c.email,c.memo];
  contactSchedules(c.id).forEach(function(t){ hay.push(t.title,t.place); });
  return hay.join(' ').toLowerCase().indexOf(q)>=0;
}
function renderContacts(){
  var tb=document.getElementById('con-body'); if(!tb) return; tb.innerHTML='';
  var list=contactList().filter(matchContact);
  if(!list.length){
    var er=document.createElement('tr');
    er.innerHTML='<td colspan="8" class="empty-note" style="border:none;background:none">'+(conSearchQ?'검색 결과가 없습니다.':'연락처가 없습니다. ‘연락처 추가’로 만들어 보세요.')+'</td>';
    tb.appendChild(er); return;
  }
  list.forEach(function(c){
    var tr=document.createElement('tr');
    var scheds=contactSchedules(c.id);
    var linkHtml = scheds.length ? scheds.map(function(t){ var dd=ymd(t.day);
      return '<span class="conlink" data-id="'+esc(t.id)+'" title="'+esc((t.title||'')+(t.place?(' · '+t.place):''))+'"><span class="pdot" style="background:'+ttCatColor(t.cat)+'"></span>8/'+dd.getDate()+' '+esc(t.start||'')+' · '+esc(t.title||'(제목 없음)')+'</span>';
    }).join('') : '<span class="faintmini">연결된 일정 없음</span>';
    tr.innerHTML=
      '<td class="mk" contenteditable data-f="name">'+esc(c.name)+'</td>'+
      '<td class="mk" contenteditable data-f="org">'+esc(c.org)+'</td>'+
      '<td class="mk" contenteditable data-f="role">'+esc(c.role)+'</td>'+
      '<td class="mk" contenteditable data-f="phone">'+esc(c.phone)+'</td>'+
      '<td class="mk" contenteditable data-f="email">'+esc(c.email)+'</td>'+
      '<td class="mk" contenteditable data-f="memo">'+esc(c.memo)+'</td>'+
      '<td class="conlinks">'+linkHtml+'</td>'+
      '<td><button class="rm" title="삭제">'+icon('trash',14)+'</button></td>';
    tr.querySelectorAll('td.mk').forEach(function(td){ td.addEventListener('blur',function(){ c[td.dataset.f]=td.textContent.trim(); saveContacts(); }); });
    tr.querySelectorAll('.conlink[data-id]').forEach(function(el){ el.onclick=function(){ openTT(el.dataset.id); }; });
    tr.querySelector('.rm').onclick=function(){
      var sc=contactSchedules(c.id);
      if(!confirm(sc.length?('이 연락처는 '+sc.length+'개 일정에 연결되어 있습니다.\n삭제하면 일정에서도 연결이 해제됩니다. 삭제할까요?'):'이 연락처를 삭제할까요?')) return;
      var changed=false;
      ttList().forEach(function(t){ if((t.contacts||[]).indexOf(c.id)>=0){ t.contacts=t.contacts.filter(function(x){return x!==c.id;}); changed=true; } });
      state.contacts=contactList().filter(function(x){return x!==c;});
      saveContacts(); if(changed){ saveTimetable(); renderTimetable(); }
      renderContacts();
    };
    tb.appendChild(tr);
  });
}

/* ===== 현장 위치 지도 (site map) — 홍보부 인원 위치 (수동 배치 + 일정표 연동) ===== */
/* 좌표(x,y)는 배치도 이미지(2000×1414) 기준 비율(0~1). al=장소명 자동매칭 별칭 */
var ZONES=[
  // 본부 · 시설
  {key:'jhq',label:'JHQ 본부',grp:'본부·시설',x:0.416,y:0.373,al:['jhq','본부','미디어','홍보','상황실','회의']},
  {key:'exhibit',label:'전시·행사장',grp:'본부·시설',x:0.374,y:0.460,al:['전시','행사장','문화']},
  {key:'stage',label:'메인무대',grp:'본부·시설',x:0.505,y:0.792,al:['메인','무대','스타디움','스테이지','개영','폐영','어워드','페스티벌']},
  {key:'food',label:'급식',grp:'본부·시설',x:0.345,y:0.642,al:['급식','식사','배식','중식','석식','조식']},
  {key:'camp',label:'대회장·야영장',grp:'본부·시설',x:0.456,y:0.362,al:['대회장','야영장','설영','서브캠프']},
  {key:'p1',label:'과정1 활동장',grp:'본부·시설',x:0.318,y:0.368,al:['과정1']},
  {key:'p2',label:'과정2 활동장',grp:'본부·시설',x:0.325,y:0.449,al:['과정2','과정활동']},
  {key:'p3',label:'과정3 활동장',grp:'본부·시설',x:0.363,y:0.382,al:['과정3']},
  {key:'p4',label:'과정4 활동장',grp:'본부·시설',x:0.616,y:0.177,al:['과정4']},
  {key:'gym',label:'과정5·체육관',grp:'본부·시설',x:0.438,y:0.840,al:['과정5','체육관']},
  {key:'supply',label:'물자보급장소',grp:'본부·시설',x:0.246,y:0.376,al:['물자','보급']},
  {key:'cubs',label:'컵스카우트 숙소',grp:'본부·시설',x:0.196,y:0.424,al:['컵스']},
  {key:'staffpark',label:'운영요원 주차장',grp:'본부·시설',x:0.486,y:0.207,al:['운영요원주차']},
  {key:'buspark',label:'버스 주차장',grp:'본부·시설',x:0.536,y:0.171,al:['버스']},
  {key:'admin',label:'관리사무소',grp:'본부·시설',x:0.235,y:0.624,al:['관리사무소']},
  {key:'hospital',label:'잼버리병원',grp:'본부·시설',x:0.173,y:0.461,al:['병원','의료','구호']},
  {key:'staffhouse',label:'운영요원 숙소',grp:'본부·시설',x:0.581,y:0.433,al:['운영요원숙소','숙소']},
  // 분단 영지
  {key:'gn',label:'큰물결분단',grp:'분단 영지',x:0.243,y:0.460},
  {key:'sb',label:'솔바람분단',grp:'분단 영지',x:0.270,y:0.530},
  {key:'bn',label:'빛누리분단',grp:'분단 영지',x:0.389,y:0.771},
  {key:'ul',label:'어울림분단',grp:'분단 영지',x:0.408,y:0.548},
  {key:'pb',label:'푸른별분단',grp:'분단 영지',x:0.453,y:0.654},
  {key:'ph',label:'평화숲분단',grp:'분단 영지',x:0.480,y:0.576},
  {key:'kd',label:'꿈동산분단',grp:'분단 영지',x:0.540,y:0.460},
  // 게이트
  {key:'g1',label:'Gate 1',grp:'게이트',x:0.100,y:0.511,al:['게이트1','gate1']},
  {key:'g2',label:'Gate 2',grp:'게이트',x:0.093,y:0.470,al:['게이트2','gate2']},
  {key:'g3',label:'Gate 3',grp:'게이트',x:0.194,y:0.354,al:['게이트3','gate3']},
  {key:'g4',label:'Gate 4',grp:'게이트',x:0.330,y:0.239,al:['게이트4','gate4','등록','입영']},
  {key:'g5',label:'Gate 5',grp:'게이트',x:0.529,y:0.100,al:['게이트5','gate5']}
];
var PERSON_COLORS=['#2F6FB0','#C23E6E','#2E8B6B','#C26A2E','#6A3FB5','#0F8A8A','#B07A1E','#C0492F','#3E7C59','#8E5BB5','#2E6FAE','#9A6310'];
function personColor(idx){ return PERSON_COLORS[idx%PERSON_COLORS.length]; }
function avatarInitial(m){ var s=((m.name||'').trim()||(m.role||'').trim()||'?'); return s.slice(0,1); }
function zoneByKey(k){ for(var i=0;i<ZONES.length;i++) if(ZONES[i].key===k) return ZONES[i]; return null; }
function zoneForPlace(txt){
  txt=(txt||'').toString().toLowerCase().replace(/\s/g,''); if(!txt) return null;
  for(var i=0;i<ZONES.length;i++){ var z=ZONES[i]; var al=(z.al||[]).concat([z.label]);
    for(var j=0;j<al.length;j++){ var a=(al[j]||'').toLowerCase().replace(/\s/g,''); if(a.length>=2 && (txt.indexOf(a)>=0 || a.indexOf(txt)>=0)) return z.key; } }
  return null;
}
function zoneOptions(sel){
  var g={}; ZONES.forEach(function(z){ (g[z.grp]||(g[z.grp]=[])).push(z); });
  var html='<option value="">— 자동 (장소명으로 추정) —</option>';
  Object.keys(g).forEach(function(grp){ html+='<optgroup label="'+esc(grp)+'">'+g[grp].map(function(z){ return '<option value="'+z.key+'"'+(z.key===sel?' selected':'')+'>'+esc(z.label)+'</option>'; }).join('')+'</optgroup>'; });
  return html;
}
function mapPosMap(){ if(!state.mappos) state.mappos={}; return state.mappos; }
function mapZoneOf(pid){ var v=mapPosMap()[pid]; if(!v) return null; return typeof v==='string'?v:(v.zone||null); }   // 구버전(문자열)·신버전({zone,at}) 호환
function mapAtOf(pid){ var v=mapPosMap()[pid]; return (v&&typeof v==='object')?v.at:null; }
function saveMapPos(){ debouncedPut('mapTimer', {mappos: mapPosMap()}, '현장 위치 저장됨'); }
function checkinAgo(at){ if(!at) return ''; var ms=Date.now()-new Date(at).getTime(); if(isNaN(ms)||ms<0) return ''; var m=Math.floor(ms/60000); if(m<1) return '방금'; if(m<60) return m+'분 전'; var h=Math.floor(m/60); if(h<24) return h+'시간 전'; return Math.floor(h/24)+'일 전'; }
/* ===== 촬영 요청(shoots) ===== */
function shootList(){ if(!state.shoots) state.shoots=[]; return state.shoots; }
function saveShoots(){ debouncedPut('shootTimer', {shoots: shootList()}, '촬영 요청 저장됨'); }
function addShoot(){ shootList().unshift({id:mkid(),zone:'',title:'',time:'',note:'',status:'open',assignees:[],by:(Auth.name||Auth.username||''),createdAt:new Date().toISOString()}); renderShootList(); renderSiteMapMarkers(); saveShoots(); }
function smMinLabel(mi){ var h=Math.floor(mi/60), m=mi%60; return (h<10?'0':'')+h+':'+(m<10?'0':'')+m; }
var smSel=null, smByZone={}, smPopZone=null;
var smTimeMode='now', smDay='2026-08-05', smTimeMin=1200;   // 'now'=실시간 / 'pick'=시간 지정(슬라이더)
// 위치 계산 기준 시점 → {day,h} 또는 null. 실시간이면 현재, 시간 지정이면 슬라이더 값.
function smMoment(){ if(smTimeMode==='now') return smNow(); return {day:smDay, h:smTimeMin/60}; }
// 현재(실시간) 잼버리 시각 → {day,h} 또는 null(행사 기간 외)
function smNow(){
  var d=new Date();
  var iso=d.getFullYear()+'-'+(d.getMonth()<9?'0':'')+(d.getMonth()+1)+'-'+(d.getDate()<10?'0':'')+d.getDate();
  if(!jamDay(iso)) return null;
  return {day:iso, h:d.getHours()+d.getMinutes()/60};
}
// 한 인원의 현재 위치 → {zone, src:'manual'|'sched'|'default', item?}
// 우선순위: 수동 지정 > 현재 시각 일정표 > 기본(JHQ 본부)
function smPersonZone(m){
  var manual=mapZoneOf(m.id);
  if(manual && zoneByKey(manual)) return {zone:manual, src:'manual', at:mapAtOf(m.id)};
  var mo=smMoment();
  if(mo){
    var items=ttList().filter(function(t){ if(t.day!==mo.day) return false; var s=t2h(t.start), e=t2h(t.end); if(s==null||e==null) return false; return (t.assignees||[]).indexOf(m.id)>=0 && s<=mo.h && e>mo.h; });
    if(items.length){ items.sort(sortByDayTime);
      for(var i=0;i<items.length;i++){ var z=items[i].zone||zoneForPlace(items[i].place); if(z&&zoneByKey(z)) return {zone:z, src:'sched', item:items[i]}; }
    }
  }
  return {zone:'jhq', src:'default'};   // 기본 = JHQ 본부
}
function smPlace(pid, zoneKey){ if(!zoneKey){ delete mapPosMap()[pid]; } else mapPosMap()[pid]={zone:zoneKey, at:new Date().toISOString()}; saveMapPos(); smSel=null; renderSiteMap(); }
function smUnplace(pid){ if(mapPosMap()[pid]){ delete mapPosMap()[pid]; saveMapPos(); } smSel=null; renderSiteMap(); }
function renderSiteMap(){
  var sec=document.getElementById('sitemap'); if(!sec) return;
  // 모드 토글
  sec.querySelectorAll('#sm-modeseg button').forEach(function(b){ b.classList.toggle('active', b.dataset.m===smTimeMode); });
  var live=document.getElementById('sm-live'); if(live) live.style.display = smTimeMode==='now'?'':'none';
  var sched=document.getElementById('sm-sched'); if(sched) sched.style.display = smTimeMode==='pick'?'':'none';
  // 실시간: 현재 시각 표시
  var nowEl=document.getElementById('sm-now');
  if(nowEl){ var now=smNow();
    if(now){ var d=ymd(now.day); nowEl.textContent='8/'+d.getDate()+' ('+WDS[d.getDay()]+') '+smMinLabel(Math.round(now.h*60)); }
    else nowEl.textContent='행사 기간 외 — 전원 기본 위치(JHQ 본부)';
  }
  // 시간 지정: 날짜 옵션(최초 1회) + 슬라이더 라벨
  var daySel=document.getElementById('sm-day');
  if(daySel){ if(!daySel.options.length){ daySel.innerHTML=JAM_DAYS.map(function(d){var dd=ymd(d[0]);return '<option value="'+d[0]+'">8/'+dd.getDate()+' ('+WDS[dd.getDay()]+')'+(d[1]?(' '+esc(d[1])):'')+'</option>';}).join(''); } daySel.value=smDay; }
  var tlab=document.getElementById('sm-tlabel'); if(tlab) tlab.textContent=smMinLabel(smTimeMin);
  var tr=document.getElementById('sm-time'); if(tr) tr.value=smTimeMin;
  var clr=document.getElementById('sm-clear'); if(clr) clr.style.display = Object.keys(mapPosMap()).length?'':'none';
  renderSiteMapMarkers();
  renderSiteSelbar();
  renderShootList();
}
function renderShootList(){
  var box=document.getElementById('shoot-list'); if(!box) return;
  var L=shootList();
  if(!L.length){ box.innerHTML='<p class="sm-empty">촬영 요청이 없습니다. ‘촬영 요청 추가’로 등록하면 지도에 <b>카메라 핀</b>으로 표시됩니다.</p>'; return; }
  box.innerHTML=L.map(function(s){
    return '<div class="shootcard s-'+esc(s.status)+'" id="shoot-'+esc(s.id)+'">'+
      '<div class="shoot-row1">'+
        '<button type="button" class="shoot-status'+(s.status==='done'?' done':'')+'" data-shoot-toggle="'+esc(s.id)+'" title="요청 중 ↔ 완료">'+(s.status==='done'?(icon('check',13)+' 완료'):'요청 중')+'</button>'+
        '<input class="shoot-title" data-shoot="'+esc(s.id)+'" data-f="title" placeholder="촬영 요청 제목 (예: 개영식 입장 스케치)" value="'+esc(s.title)+'">'+
        '<button type="button" class="btn xs ghost danger shoot-del" data-shoot-del="'+esc(s.id)+'" aria-label="삭제">'+icon('trash',13)+'</button>'+
      '</div>'+
      '<div class="shoot-row2">'+
        '<select class="shoot-zone" data-shoot="'+esc(s.id)+'" data-f="zone">'+tipZoneOptions(s.zone)+'</select>'+
        '<input class="shoot-time" data-shoot="'+esc(s.id)+'" data-f="time" placeholder="시간 (예: 8/5 20:00)" value="'+esc(s.time)+'">'+
      '</div>'+
      '<input class="shoot-note" data-shoot="'+esc(s.id)+'" data-f="note" placeholder="메모 · 요청 내용 · 담당" value="'+esc(s.note)+'">'+
    '</div>';
  }).join('');
}
function renderSiteMapMarkers(){
  var stage=document.getElementById('sm-stage'); if(!stage) return;
  var people=rosterList();
  smByZone={};
  people.forEach(function(m,idx){ var p=smPersonZone(m); if(p){ (smByZone[p.zone]||(smByZone[p.zone]=[])).push({m:m,idx:idx,p:p}); } });
  Array.prototype.slice.call(stage.querySelectorAll('.smzone,.smshoot')).forEach(function(el){ el.remove(); });
  // 촬영 요청 핀(카메라) — 구역에 표시, 인원 콜아웃 아래로 살짝 내려 배치
  shootList().forEach(function(s){ if(!s.zone) return; var z=zoneByKey(s.zone); if(!z) return;
    var el=document.createElement('div'); el.className='smshoot s-'+esc(s.status); el.style.left=(z.x*100)+'%'; el.style.top=(z.y*100)+'%'; el.dataset.shoot=s.id;
    el.innerHTML=icon('camera',12)+(s.title?('<span class="smshoot-t">'+esc(s.title)+'</span>'):'');
    el.title='촬영 요청: '+(s.title||'(제목 없음)')+(s.time?(' · '+s.time):'')+(s.status==='done'?' · 완료':'');
    stage.appendChild(el);
  });
  var CAP=3;  // 한 구역에 여러 명이면 대표 N명만 겹쳐 보이고 나머지는 +수
  ZONES.forEach(function(z){
    var ppl=smByZone[z.key]||[];
    var el=document.createElement('div');
    el.className='smzone'+(ppl.length?' has':'')+(ppl.length>1?' multi':'');
    el.style.left=(z.x*100)+'%'; el.style.top=(z.y*100)+'%';
    el.dataset.zone=z.key;
    var shown=ppl.slice(0,CAP), extra=ppl.length-shown.length;
    var avs=shown.map(function(o,i){
      var manual=o.p.src==='manual';
      var ttl=personLabel(o.m)+(manual?' · 수동 지정':(o.p.item?(' · '+(o.p.item.title||'일정')+' '+(o.p.item.start||'')):''));
      return '<span class="smav'+(smSel===o.m.id?' sel':'')+'" draggable="true" data-pid="'+esc(o.m.id)+'" style="background:'+personColor(o.idx)+';z-index:'+(10-i)+'" title="'+esc(ttl)+'">'+esc(avatarInitial(o.m))+(manual?'<i class="smpin"></i>':'')+'</span>';
    }).join('');
    if(extra>0) avs+='<span class="smmore" title="'+extra+'명 더 — 클릭해 전체 보기">+'+extra+'</span>';
    el.innerHTML='<span class="smavs'+(ppl.length>1?' stack':'')+'">'+avs+'</span><span class="smdot"></span><span class="smlbl">'+esc(z.label)+(ppl.length>1?(' · '+ppl.length+'명'):'')+'</span>';
    stage.appendChild(el);
  });
  renderZonePopover();
}
/* 한 구역에 여러 명 → 클릭 시 말풍선으로 전체 명단(이동·빼기) */
function openZonePopover(zkey){ smPopZone=(smPopZone===zkey)?null:zkey; renderZonePopover(); }
function closeZonePopover(){ smPopZone=null; renderZonePopover(); }
function renderZonePopover(){
  var stage=document.getElementById('sm-stage'); if(!stage) return;
  var old=stage.querySelector('.smpop'); if(old) old.remove();
  if(!smPopZone) return;
  var z=zoneByKey(smPopZone), ppl=smByZone[smPopZone]||[];
  if(!z||!ppl.length){ smPopZone=null; return; }
  var pop=document.createElement('div'); pop.className='smpop';
  pop.style.left=(z.x*100)+'%'; pop.style.top=(z.y*100)+'%';
  pop.innerHTML='<div class="smpop-h">'+esc(z.label)+' · '+ppl.length+'명<button class="smpop-x" data-pop-close aria-label="닫기">'+icon('x',13)+'</button></div>'+
    '<div class="smpop-list">'+ppl.map(function(o){
      var manual=o.p.src==='manual';
      var ago=manual?checkinAgo(o.p.at):'';
      var sub=manual?('수동 지정'+(ago?(' · 체크인 '+ago):'')):(o.p.src==='sched'&&o.p.item?((o.p.item.start||'')+' '+(o.p.item.title||'')):'대기 · 기본 위치');
      return '<div class="smpop-row"><span class="smav" style="background:'+personColor(o.idx)+'">'+esc(avatarInitial(o.m))+'</span><span class="smpop-name">'+esc(personLabel(o.m))+'<span class="smpop-sub">'+esc(sub)+'</span></span>'+
        '<button type="button" class="btn xs" data-pop-move="'+esc(o.m.id)+'">이동</button>'+(manual?('<button type="button" class="btn xs danger" data-pop-unplace="'+esc(o.m.id)+'" title="수동 지정 해제 (자동으로 되돌리기)">해제</button>'):'')+'</div>';
    }).join('')+'</div>';
  stage.appendChild(pop);
}
function renderSiteSelbar(){
  var bar=document.getElementById('sm-selbar'); if(!bar) return;
  if(!smSel){ bar.classList.remove('show'); bar.innerHTML=''; return; }
  var m=rosterById(smSel); if(!m){ smSel=null; bar.classList.remove('show'); return; }
  var placed=!!mapPosMap()[smSel];
  bar.innerHTML='<b>'+esc(personLabel(m))+'</b> 선택됨 — 옮길 <b>구역을 클릭</b>하세요'+
    (placed?'<button type="button" class="btn xs danger" data-sm-unplace title="수동 지정 해제 (자동으로 되돌리기)">수동 해제</button>':'')+
    '<button type="button" class="btn xs ghost" data-sm-desel>선택 해제</button>';
  bar.classList.add('show');
}

/* ===== render orchestration ===== */
function renderAll(){ renderHeader(); renderCalendar(); renderFilters(); renderBoard(); renderMarketing(); if(curViewMode==='dashboard') renderDashboard(); }
function renderAfterEdit(k,s,now){
  // refresh overview (calendar + board); save the affected card to server
  renderCalendar(); renderBoard();
  if(k) saveCard(k,s,now);
}
function afterDelete(k){ renderCalendar(); renderBoard(); sendDelete(k); }

/* ===== export ===== */
function exportJSON(){
  var out={meta:hdr(),event_day:EVENT_DAY,generated:todayISO(),days:DAYS.map(function(d){
    return {date:d.date,dlabel:d.dlabel,weekday:d.weekday,phase:d.phase,items:daySlots(d).map(function(s){
      var e=peek(s.k); return {type:s.type,category:s.category,ctype:e.ctype||'',title:e.title||s.seedTitle||'',time:e.time||'',owner:e.owner||'',tags:e.tags||'',posted:!!e.posted,postedAt:e.postedAt||'',channels:e.channels||['페이스북'],links:e.links||{},images:e.images||[],files:e.files||[],status:e.status||'planned',snsText:hist(s.k),notes:notesOf(s.k)};
    })};
  }),marketing:state.marketing||[]};
  var blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='jamboree-sns-plan.json'; a.click();
  if(navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(out,null,2)).then(function(){toast('JSON 다운로드 + 클립보드 복사');}).catch(function(){toast('JSON 다운로드 완료');});
  else toast('JSON 다운로드 완료');
}

/* ===== 분단 명단 (divisions) ===== */
function defaultDivisions(){ return [
  {id:mkid(),name:'평화숲분단',region:'서울북부',federations:'서울북부연맹, 경기북부연맹, 부산연맹, 일본, 스리랑카, 말레이시아',leader:'엄철용',ops:'송중현',safety:'허삼흥',support:'조형호'},
  {id:mkid(),name:'어울림분단',region:'가톨릭',federations:'가톨릭연맹, 대만, 싱가포르',leader:'구형수',ops:'방중현',safety:'김지현',support:'김수연'},
  {id:mkid(),name:'푸른별분단',region:'',federations:'경남연맹, 강원연맹, 대구연맹, 불교연맹, 말레이시아, 대만, 라이베리아',leader:'',ops:'',safety:'',support:''},
  {id:mkid(),name:'솔바람분단',region:'서울남부',federations:'서울남부연맹, 인천연맹, 충남세종연맹, 기독교연맹, 대만, 말레이시아, 필리핀',leader:'안승휘',ops:'',safety:'',support:''},
  {id:mkid(),name:'큰물결분단',region:'전북',federations:'전북연맹, 제주연맹, 원불교연맹, 대만, 말레이시아, 스리랑카',leader:'엄정영',ops:'박철',safety:'김인',support:'전혁준'},
  {id:mkid(),name:'빛누리분단',region:'광주',federations:'광주연맹, 충북연맹, 전남연맹, 태국, 싱가포르, 스리랑카',leader:'이승용',ops:'박선주',safety:'한진혁',support:'유창훈'},
  {id:mkid(),name:'꿈동산분단',region:'경기남부',federations:'경기남부연맹, 대전연맹, 방글라데시, 홍콩, 마카오',leader:'이성수',ops:'박혜정',safety:'주락형',support:'김홍기'}
]; }
function divisionList(){
  if(!state.divisions) state.divisions=defaultDivisions();
  var defs=null;   // 구버전(연맹목록 없음) 데이터에 이름으로 연맹목록 백필
  state.divisions.forEach(function(e){ if(e && (e.federations==null||e.federations==='')){ if(!defs){ defs={}; defaultDivisions().forEach(function(d){defs[d.name]=d;}); } var dd=defs[e.name]; if(dd&&dd.federations) e.federations=dd.federations; } if(e&&e.federations==null) e.federations=''; });
  return state.divisions;
}
function saveDivisions(){ debouncedPut('divTimer', {divisions: state.divisions||[]}, '분단 명단 저장됨'); }
function addDivision(){ divisionList().push({id:mkid(),name:'',region:'',leader:'',ops:'',safety:'',support:''}); renderDivisions(); saveDivisions(); }
var divSearchQ='', divSearchTimer=null;
function divFeds(m){ return (m.federations||'').split(',').map(function(s){return s.trim();}).filter(Boolean); }
function setDivFeds(m, arr){ m.federations=arr.join(', '); }
function renderDivisions(){
  var tb=document.getElementById('div-body'); if(!tb) return; tb.innerHTML='';
  var q=(divSearchQ||'').trim().toLowerCase();
  divisionList().forEach(function(m){
    var feds=divFeds(m);
    var hay=[m.name,m.leader,m.ops,m.safety,m.support].concat(feds).join(' ').toLowerCase();
    var match=!q||hay.indexOf(q)>=0;
    var fedChips=feds.map(function(f){ var hit=q&&f.toLowerCase().indexOf(q)>=0; return '<span class="fedchip'+(hit?' hit':'')+'">'+esc(f)+'<button type="button" class="fedx" data-f="'+esc(f)+'" title="삭제" aria-label="삭제">'+icon('x',10)+'</button></span>'; }).join('');
    var tr=document.createElement('tr'); if(q&&!match) tr.className='rowdim';
    tr.innerHTML=
      '<td class="mk" contenteditable data-f="name">'+esc(m.name||'')+'</td>'+
      '<td class="divfedcell"><div class="fedset">'+fedChips+'<input type="text" class="fedadd" placeholder="+ 연맹·국가"></div></td>'+
      '<td class="mk" contenteditable data-f="leader">'+esc(m.leader||'')+'</td>'+
      '<td class="mk" contenteditable data-f="ops">'+esc(m.ops||'')+'</td>'+
      '<td class="mk" contenteditable data-f="safety">'+esc(m.safety||'')+'</td>'+
      '<td class="mk" contenteditable data-f="support">'+esc(m.support||'')+'</td>'+
      '<td><button class="rm" title="삭제">'+icon('trash',14)+'</button></td>';
    tr.querySelectorAll('td.mk').forEach(function(td){ td.addEventListener('blur',function(){ m[td.dataset.f]=td.textContent.trim(); saveDivisions(); }); });
    tr.querySelectorAll('.fedx').forEach(function(x){ x.onclick=function(){ setDivFeds(m, divFeds(m).filter(function(y){return y!==x.dataset.f;})); saveDivisions(); renderDivisions(); }; });
    var addIn=tr.querySelector('.fedadd'); if(addIn){ addIn.addEventListener('keydown',function(e){ if(e.key==='Enter'){ if(e.isComposing||e.keyCode===229) return; e.preventDefault(); var v=this.value.trim(); if(v){ var arr=divFeds(m); if(arr.indexOf(v)<0){ arr.push(v); setDivFeds(m,arr); saveDivisions(); } } this.value=''; renderDivisions(); } }); }
    tr.querySelector('.rm').onclick=function(){ state.divisions=divisionList().filter(function(x){return x!==m;}); renderDivisions(); saveDivisions(); };
    tb.appendChild(tr);
  });
}

/* launch(운영요원 발대식)는 v0.9.52 UI 제거 후 dormant 였던 코드 — v0.9.180 에서 함수·API 분기까지 정리 완료 */

/* ===== 의전 일정 (protocol) — 별도 페이지 + (시간 지정 시) 캘린더 노출 ===== */
function defaultProtocol(){
  // 대회장/부대회장/야영장/부야영장 의전 상세 일정(사용자 제공, 8/5~8/9). 시각·장소 포함, memo '(안)'=종료시각 미확정.
  var P=[
    ['대회장','이찬희','총재',[
      ['2026-08-05','18:30','19:40','환영 리셉션 인사말','D동 대강당',''],
      ['2026-08-05','20:00','21:30','개영식 인사말','대집회장',''],
      ['2026-08-06','09:00','11:00','과정활동장 방문','영내 과정활동장',''],
      ['2026-08-06','20:00','21:30','K-POP 콘서트','대집회장','(안)'],
      ['2026-08-07','07:00','08:30','아침 배식봉사','D동 식당',''],
      ['2026-08-07','09:00','11:00','분단 방문','각 분단 영지',''],
      ['2026-08-08','09:00','11:00','과정활동장 방문','영내 과정활동장',''],
      ['2026-08-08','20:00','21:30','폐영식 인사말','대집회장','(안)'],
      ['2026-08-09','09:00','11:00','참가자 환송','주 출입구·퇴영장','(안)']
    ]],
    ['부대회장','정복현','강원연맹장(부총재)',[
      ['2026-08-05','18:30','19:40','환영 리셉션','D동 대강당',''],
      ['2026-08-05','20:00','21:30','개영식','대집회장',''],
      ['2026-08-06','17:30','19:00','저녁 배식봉사','급식배급소',''],
      ['2026-08-06','20:00','21:30','K-POP 콘서트','대집회장','(안)'],
      ['2026-08-07','09:00','11:00','영지 방문','각 분단 영지',''],
      ['2026-08-08','09:00','11:00','과정활동장 방문','영내 과정활동장',''],
      ['2026-08-08','20:00','21:30','폐영식','대집회장','(안)'],
      ['2026-08-09','09:00','11:00','참가자 환송','주 출입구·퇴영장','(안)']
    ]],
    ['야영장','김시범','중앙치프커미셔너',[
      ['2026-08-05','18:30','19:40','환영 리셉션','D동 대강당',''],
      ['2026-08-05','20:00','21:30','개영식·개회선언','대집회장',''],
      ['2026-08-06','09:00','11:00','과정활동장 방문','영내 과정활동장',''],
      ['2026-08-06','20:00','21:30','K-POP 콘서트','대집회장','(안)'],
      ['2026-08-07','07:00','08:30','아침 배식봉사','D동 식당',''],
      ['2026-08-07','09:00','11:00','영지 방문','각 분단 영지',''],
      ['2026-08-08','09:00','11:00','과정활동장 방문','영내 과정활동장',''],
      ['2026-08-08','20:00','21:30','폐영식·폐영선언','대집회장','(안)'],
      ['2026-08-09','09:00','11:00','참가자 환송','주 출입구·퇴영장','(안)']
    ]],
    ['부야영장','김상협','국제커미셔너',[
      ['2026-08-05','18:30','19:40','환영 리셉션','D동 대강당',''],
      ['2026-08-05','20:00','21:30','개영식','대집회장',''],
      ['2026-08-06','20:00','21:30','K-POP 콘서트','대집회장','(안)'],
      ['2026-08-07','09:00','11:00','영지 방문','각 분단 영지',''],
      ['2026-08-08','09:00','11:00','과정활동장 방문','영내 과정활동장',''],
      ['2026-08-08','20:00','21:30','폐영식','대집회장','(안)'],
      ['2026-08-09','09:00','11:00','참가자 환송','주 출입구·퇴영장','(안)']
    ]],
    ['부야영장','최유석','중앙훈련원장',[
      ['2026-08-05','18:30','19:40','환영 리셉션','D동 대강당',''],
      ['2026-08-05','20:00','21:30','개영식','대집회장',''],
      ['2026-08-06','17:30','19:00','저녁 배식봉사','급식배급소',''],
      ['2026-08-06','20:00','21:30','K-POP 콘서트','대집회장','(안)'],
      ['2026-08-07','09:00','11:00','영지 방문','각 분단 영지',''],
      ['2026-08-08','09:00','11:00','과정활동장 방문','영내 과정활동장',''],
      ['2026-08-08','20:00','21:30','폐영식','대집회장','(안)'],
      ['2026-08-09','09:00','11:00','참가자 환송','주 출입구·퇴영장','(안)']
    ]]
  ];
  var out=[], n=0;
  P.forEach(function(r){ var role=r[0],name=r[1],title=r[2],rows=r[3];
    rows.forEach(function(x){ n++; out.push({id:'prot-'+(n<10?'0':'')+n,role:role,name:name,title:title,date:x[0],time:x[1],endTime:x[2],activity:x[3],place:x[4],memo:x[5]||''}); }); });
  return out;
}
// 서버에 실제 저장본이 없거나(=시드 재생성) 구 기본 시드(시각 하나도 없음)면 상세 의전표로 확정 + 서버 저장.
// → 공유 보드에 확실히 반영·영속. 상세본은 시각이 있어 재실행되지 않음(멱등). 사용자 실제 편집(서버 저장 + 시각 있음)은 보존.
function upgradeProtocol(){
  var L=protocolList();   // 서버에 없으면 여기서 상세 default 로 채워짐
  // 상세본은 고유 id(prot-NN)를 쓴다. 그 id가 하나도 없으면 = 구 개략 시드(random id) → 상세 41건으로 확정 + 서버 저장.
  // (구 시드에 사용자가 시각을 한둘 채워 넣었어도 상세본으로 교체된다. 상세본을 편집한 경우엔 prot-NN 이 있어 보존.)
  var hasDetailed = L.some(function(e){ return /^prot-\d/.test(e.id||''); });
  if(!hasDetailed){ state.protocol=defaultProtocol(); saveProtocol(); state._protoFromServer=true; }
}
function protocolList(){
  if(!state.protocol) state.protocol=defaultProtocol();
  // 구버전(person 단일필드) → name/title 분리 마이그레이션
  state.protocol.forEach(function(e){ if(e&&e.name==null&&e.person){ var sp=String(e.person).trim().split(/\s+/); e.name=sp.shift()||''; e.title=sp.join(' '); delete e.person; } if(e){ if(e.name==null)e.name=''; if(e.title==null)e.title=''; } });
  return state.protocol;
}
var prSort={f:'date',dir:1};
function prWho(p){ return (p.name||'')+(p.title?(' '+p.title):''); }
function saveProtocol(){ debouncedPut('protoTimer', {protocol: state.protocol||[]}, '의전 일정 저장됨'); }
function addProtocol(){ protocolList().push({id:mkid(),role:'',name:'',title:'',date:'',time:'',activity:'',place:'',memo:''}); renderProtocol(); saveProtocol(); }
function refreshProtocolViews(){ saveProtocol(); renderCalendar(); if(typeof renderTimetable==='function') renderTimetable(); }
// 의전 장소 = 현장 지도 구역(ZONES) 라벨을 공유. 기존에 입력된 커스텀 장소는 상단에 보존.
function protPlaceOptions(sel){
  var has=false, opts=ZONES.map(function(z){ if(z.label===sel)has=true; return '<option value="'+esc(z.label)+'"'+(z.label===sel?' selected':'')+'>'+esc(z.label)+'</option>'; }).join('');
  return '<option value=""'+(sel?'':' selected')+'>— 장소 —</option>'+((sel&&!has)?('<option value="'+esc(sel)+'" selected>'+esc(sel)+'</option>'):'')+opts;
}
function protPersonKey(m){ return (m.name||'')+'|'+(m.title||'')+'|'+(m.role||''); }
// 의전 순서: 대회장 → 부대회장 → 야영장 → 부야영장 (부- 접두는 substring 이라 먼저 판정)
function protRoleRank(role){
  var r=(role||'').replace(/\s+/g,''); var bu=/^부/.test(r);
  if(/대회장/.test(r)) return bu?1:0;
  if(/야영장/.test(r)) return bu?3:2;
  return 9;
}
function renderProtocol(){
  var tb=document.getElementById('pr-body'); if(!tb) return; tb.innerHTML='';
  // 성명/직책(인원)별 그루핑 — 인원 정보(구분·성명·직책)는 rowspan 으로 한 번만, 그 아래 일정들. (헤더 정렬은 그루핑으로 대체)
  document.querySelectorAll('#prtbl thead th.prh').forEach(function(th){ th.classList.remove('sorted'); th.setAttribute('data-dir',''); th.onclick=null; th.style.cursor='default'; });
  // 구분(대회장→부대회장→야영장→부야영장) 우선 → 성명 가나다순 → 직책 → 날짜·시간
  var rows=protocolList().slice().sort(function(a,b){
    var ra=protRoleRank(a.role), rb=protRoleRank(b.role); if(ra!==rb) return ra-rb;
    var nc=(a.name||'').localeCompare(b.name||'','ko'); if(nc) return nc;
    var ta=(a.title||''), tt=(b.title||''); if(ta!==tt) return ta<tt?-1:1;
    var da=(a.date||'')+(a.time||''), db=(b.date||'')+(b.time||''); return da<db?-1:da>db?1:0;
  });
  function evEditors(tr,m){
    tr.querySelectorAll('td.mk:not(.pr-person)').forEach(function(td){ td.addEventListener('blur',function(){ m[td.dataset.f]=td.textContent.trim(); saveProtocol(); if(td.dataset.f==='activity') refreshProtocolViews(); }); });
    var dt=tr.querySelector('input.prin[data-f="date"]'); if(dt) dt.addEventListener('change',function(){ m.date=this.value; saveProtocol(); refreshProtocolViews(); });
    var pl=tr.querySelector('select.prplace'); if(pl) pl.addEventListener('change',function(){ m.place=this.value; saveProtocol(); refreshProtocolViews(); });
    var prtH=tr.querySelector('.prtime-h'), prtM=tr.querySelector('.prtime-m'), prtEH=tr.querySelector('.prtime-eh'), prtEM=tr.querySelector('.prtime-em');
    if(prtH&&prtM){
      [prtH,prtM,prtEH,prtEM].forEach(function(inp){ if(inp) inp.addEventListener('input',function(){ this.value=this.value.replace(/\D/g,'').slice(0,2); }); });   // 숫자만
      var updT=function(){
        if(prtH.value===''&&prtM.value===''){ m.time=''; } else { var h=Math.max(0,Math.min(23,parseInt(prtH.value,10)||0)), mm=Math.max(0,Math.min(59,parseInt(prtM.value,10)||0)); m.time=pad2(h)+':'+pad2(mm); }
        if(prtEH.value===''&&prtEM.value===''){ m.endTime=''; } else { var eh=Math.max(0,Math.min(23,parseInt(prtEH.value,10)||0)), em=Math.max(0,Math.min(59,parseInt(prtEM.value,10)||0)); m.endTime=pad2(eh)+':'+pad2(em); }
        saveProtocol(); refreshProtocolViews();
      };
      [prtH,prtM,prtEH,prtEM].forEach(function(inp){ if(inp){ inp.addEventListener('change',updT); inp.addEventListener('blur',updT); } });
    }
    tr.querySelector('.rm').onclick=function(){ state.protocol=protocolList().filter(function(x){return x!==m;}); saveProtocol(); renderProtocol(); refreshProtocolViews(); };
  }
  function eventCells(m){
    var prh=t2h(m.time), prHH=prh!=null?Math.floor(prh):'', prMM=prh!=null?Math.round((prh-Math.floor(prh))*60):'';
    var peh=t2h(m.endTime), pEH=peh!=null?Math.floor(peh):'', pEM=peh!=null?Math.round((peh-Math.floor(peh))*60):'';
    return '<td><input type="date" class="prin" data-f="date" min="2026-06-15" max="2026-08-09" value="'+esc(m.date||'')+'"></td>'+
      '<td><span class="evtimegrp pr-timegrp">'+
        '<input type="text" class="evtime prtime-h" inputmode="numeric" maxlength="2" value="'+prHH+'" aria-label="시작 시" placeholder="시"><span class="evcolon">:</span><input type="text" class="evtime prtime-m" inputmode="numeric" maxlength="2" value="'+prMM+'" aria-label="시작 분" placeholder="분">'+
        '<span class="evtilde">~</span>'+
        '<input type="text" class="evtime prtime-eh" inputmode="numeric" maxlength="2" value="'+pEH+'" aria-label="종료 시" placeholder="시"><span class="evcolon">:</span><input type="text" class="evtime prtime-em" inputmode="numeric" maxlength="2" value="'+pEM+'" aria-label="종료 분" placeholder="분">'+
      '</span></td>'+
      '<td class="mk" contenteditable data-f="activity">'+esc(m.activity||'')+'</td>'+
      '<td><select class="prin prplace" data-f="place">'+protPlaceOptions(m.place||'')+'</select></td>'+
      '<td class="mk" contenteditable data-f="memo">'+esc(m.memo||'')+'</td>'+
      '<td><button class="rm" title="삭제">'+icon('trash',14)+'</button></td>';
  }
  var i=0;
  while(i<rows.length){
    var key=protPersonKey(rows[i]), group=[];
    while(i<rows.length && protPersonKey(rows[i])===key){ group.push(rows[i]); i++; }
    group.forEach(function(m, gi){
      var tr=document.createElement('tr'); if(gi===0) tr.className='pr-grouprow';
      if(gi===0){
        tr.innerHTML='<td class="mk pr-person" contenteditable data-f="role" rowspan="'+group.length+'">'+esc(m.role||'')+'</td>'+
          '<td class="mk pr-person" contenteditable data-f="name" rowspan="'+group.length+'">'+esc(m.name||'')+'</td>'+
          '<td class="mk pr-person" contenteditable data-f="title" rowspan="'+group.length+'">'+esc(m.title||'')+'</td>'+eventCells(m);
        // 인원 셀(구분·성명·직책) 편집 → 그룹 전체에 전파
        tr.querySelectorAll('td.pr-person').forEach(function(td){ td.addEventListener('blur',function(){ var v=td.textContent.trim(); group.forEach(function(gm){ gm[td.dataset.f]=v; }); saveProtocol(); refreshProtocolViews(); renderProtocol(); }); });
      } else {
        tr.innerHTML=eventCells(m);
      }
      evEditors(tr,m);
      tb.appendChild(tr);
    });
  }
}

/* ===== auth (개별 ID/PW 로그인 · 관리자=TOTP) ===== */
var SESSION_KEY='jamboree-plan:session';
// 홍보부 운영·관리 탭(유형 '홍보부' 또는 관리자만 접근) vs 콘텐츠 탭(모든 회원)
var MANAGE_TABS=['staff','contacts','orginfo','protocol'];

/* ===== 2단 내비게이션 (v0.9.184) — 업무 공간(workspace) → 세부 뷰 =====
   12개 평평한 탭을 업무 4공간으로 묶는다. 뷰 렌더 로직은 그대로, 배치·탐색만 바꾼다. */
var WS_LIST=[{ws:'dash',label:'대시보드',ic:'grid'},{ws:'content',label:'콘텐츠',ic:'list'},{ws:'field',label:'현장',ic:'mapPin'},{ws:'team',label:'팀·자료',ic:'users'}];
var WS_VIEWS={ dash:['dashboard'], content:['calendar','list','news','tips'], field:['timetable','sitemap','protocol','meals'], team:['staff','contacts','orginfo','library'] };
function wsOfView(v){ for(var k in WS_VIEWS){ if(WS_VIEWS[k].indexOf(v)>=0) return k; } return 'dash'; }
function wsHasVisible(ws){ return (WS_VIEWS[ws]||[]).some(function(v){ return Auth.authed()&&Auth.canSee(v); }); }
var curWs='dash', wsLastView={};
// 공간바/세부바 활성·가시성 갱신 (setView·reflectAuthUI 가 호출)
function renderNav(){
  curWs=wsOfView(curViewMode);
  document.querySelectorAll('.wstab[data-ws]').forEach(function(b){
    var ws=b.getAttribute('data-ws');
    b.style.display=wsHasVisible(ws)?'':'none';
    b.classList.toggle('active', ws===curWs);
  });
  var shown=0;
  document.querySelectorAll('.subbar .vtab[data-v]').forEach(function(b){
    var v=b.getAttribute('data-v'), ws=b.getAttribute('data-ws');
    var show=(ws===curWs)&&Auth.authed()&&Auth.canSee(v);
    b.style.display=show?'':'none';
    b.classList.toggle('active', v===curViewMode);
    if(show) shown++;
  });
  // 뷰가 1개뿐인 공간(대시보드)은 세부바를 숨긴다(중복 방지)
  var sub=document.getElementById('subbar'); if(sub) sub.style.display=(shown>1)?'':'none';
}
// 공간 전환 → 그 공간에서 마지막으로 본 뷰(없으면 첫 뷰)로
function setWorkspace(ws){
  var views=(WS_VIEWS[ws]||[]).filter(function(v){ return Auth.canSee(v); });
  if(!views.length) return;
  if(views.indexOf(curViewMode)>=0){ renderNav(); return; }
  var last=wsLastView[ws];
  setView(views.indexOf(last)>=0 ? last : views[0]);
}
var Auth={ token:null, exp:0, role:null, name:'', username:'', type:'', tabs:[], master:false };
Auth.load=function(){
  try{ var s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
    if(s&&s.token&&s.exp&&s.exp>Date.now()){ this.token=s.token; this.exp=s.exp; this.role=s.role||'member'; this.name=s.name||''; this.username=s.username||''; this.type=s.type||'일반'; this.tabs=Array.isArray(s.tabs)?s.tabs:[]; this.master=!!s.master; return true; }
  }catch(e){}
  return false;
};
Auth.save=function(){ try{ localStorage.setItem(SESSION_KEY, JSON.stringify({token:this.token,exp:this.exp,role:this.role,name:this.name,username:this.username,type:this.type,tabs:this.tabs,master:this.master})); }catch(e){} };
Auth.clear=function(){ this.token=null; this.exp=0; this.role=null; this.name=''; this.username=''; this.type=''; this.tabs=[]; this.master=false; try{ localStorage.removeItem(SESSION_KEY); }catch(e){} };
Auth.authed=function(){ return !!(this.token && this.exp>Date.now()); };
// 마스터 회원 = 관리자와 동일 권한(서버도 세션의 master 서명을 검증) — 개인 계정이라 TOTP 코드 없이 관리 가능
Auth.isAdmin=function(){ return this.role==='admin' || !!this.master; };
// 유형(type)이 가진 탭만. tabs 비어있으면(구버전 세션) 콘텐츠 탭만 폴백 → 잠금 방지.
// tips(소식 제보)는 제보자 개인정보가 담겨 홍보부 전용 — sitemap 과 함께 isStaff 게이트
Auth.canSee=function(v){ if(v==='dashboard'||v==='library'||v==='news'||v==='meals') return true; if(v==='sitemap'||v==='tips') return this.isStaff(); return this.isAdmin() || ((this.tabs&&this.tabs.length) ? this.tabs.indexOf(v)>=0 : MANAGE_TABS.indexOf(v)<0); };
Auth.isStaff=function(){ var me=this; return this.isAdmin() || ((this.tabs&&this.tabs.length) ? MANAGE_TABS.some(function(t){ return me.tabs.indexOf(t)>=0; }) : false); };
function authHeader(){ return Auth.token ? {'Authorization':'Bearer '+Auth.token} : {}; }
function authJsonHeaders(){ var h={'content-type':'application/json'}; if(Auth.token) h['Authorization']='Bearer '+Auth.token; return h; }
// 쓰기 응답이 401이면 세션 만료 — 게이트 다시 표시
function authExpired(){ Auth.clear(); document.documentElement.classList.remove('pw-ok'); reflectAuthUI(); var e=document.getElementById('auth-err'); if(e) e.textContent='세션이 만료되었습니다. 다시 로그인하세요.'; }

function reflectAuthUI(){
  var who=document.getElementById('whoami'), out=document.getElementById('logout'), mb=document.getElementById('members-btn'), cp=document.getElementById('changepw-btn');
  if(Auth.authed()){
    if(who) who.textContent = Auth.role==='admin'? '관리자' : ('로그인: '+(Auth.name||Auth.username)+(Auth.master?' · 마스터':(Auth.type&&Auth.type!=='일반'?' · '+Auth.type:'')));
    if(out) out.style.display='';
    if(mb) mb.style.display = Auth.isAdmin()? '' : 'none';
    if(cp) cp.style.display = Auth.role==='admin'? 'none' : '';   // 마스터도 회원 계정 — 본인 비번 변경 가능
  } else {
    if(who) who.textContent=''; if(out) out.style.display='none'; if(mb) mb.style.display='none'; if(cp) cp.style.display='none';
  }
  // 탭 접근(공간/세부 가시성)은 renderNav 가 canSee 기준으로 처리 — 관리 탭은 홍보부 유형/관리자만
  renderNav();
  renderBotNav();
}

/* ===== 모바일 하단 탭 = 업무 4공간 =====
   하단 탭은 공간(workspace)만 — 공간 안 세부는 상단 subbar(가로 스크롤)로 전환한다.
   공간 목록·권한은 renderNav 와 같은 규칙(canSee)을 따르므로 한 벌만 존재한다. */
function renderBotNav(){
  var bn=document.getElementById('botnav'); if(!bn) return;
  var wss=WS_LIST.filter(function(w){ return wsHasVisible(w.ws); });
  // 그릴 공간이 없으면(로그인 전) 하단 탭을 비우고 상단 공간바를 그대로 둔다 — 메뉴가 통째로 사라지지 않게.
  if(!wss.length){ bn.innerHTML=''; document.documentElement.classList.remove('botnav-ready'); return; }
  bn.innerHTML=wss.map(function(w){
    return '<button class="bn'+(curWs===w.ws?' on':'')+'" data-bnws="'+w.ws+'" role="tab">'+icon(w.ic,21)+'<span>'+esc(w.label)+'</span></button>';
  }).join('');
  document.documentElement.classList.add('botnav-ready');   // 이 시점부터만 상단 공간바를 숨긴다(CSS)
}
function closeNavSheet(){ var s=document.getElementById('navsheet'); if(s) s.classList.remove('show'); }
function onAuthed(){ document.documentElement.classList.add('pw-ok'); reflectAuthUI(); loadNews(); loadBoard(); resetAdminIdle(); }

function wireAuthGate(){
  var gate=document.getElementById('auth-gate'); if(!gate) return;
  // 세션이 있어도 폼 배선은 항상 한다 — 조기 반환하면 세션 만료(authExpired)로 게이트가
  // 다시 떴을 때 로그인 버튼이 네이티브 submit(새로고침)이 되어 로그인이 불가능해진다
  var hasSession=Auth.load();
  if(hasSession){ document.documentElement.classList.add('pw-ok'); reflectAuthUI(); }
  var err=document.getElementById('auth-err');
  function setErr(m){ if(err) err.textContent=m||''; }
  var fLogin=document.getElementById('auth-login'), fReg=document.getElementById('auth-register'), fAdmin=document.getElementById('auth-admin-form');
  // 탭 전환
  document.querySelectorAll('.auth-tab').forEach(function(b){ b.onclick=function(){
    document.querySelectorAll('.auth-tab').forEach(function(x){ x.classList.toggle('active', x===b); });
    var at=b.dataset.at; fLogin.style.display=at==='login'?'':'none'; fReg.style.display=at==='register'?'':'none'; fAdmin.style.display='none'; setErr('');
  }; });
  var adLink=document.getElementById('auth-admin-link');
  if(adLink) adLink.onclick=function(){ var show=fAdmin.style.display==='none'; fAdmin.style.display=show?'':'none'; if(show){ setErr(''); var c=document.getElementById('ad-code'); if(c) c.focus(); } };

  function errMsg(code){
    return ({bad_username:'아이디는 영문·숫자·_ , 3~24자입니다.', name_required:'이름을 입력하세요.',
      weak_password:'비밀번호는 4자 이상이어야 합니다.', username_taken:'이미 사용 중인 아이디입니다.',
      too_many_attempts:'시도가 너무 많습니다. 잠시 후 다시 시도하세요.', invalid_login:'아이디 또는 비밀번호가 올바르지 않습니다.',
      pending_approval:'아직 승인 대기 중입니다. 홍보부 부장에게 확인하세요.', invalid_code:'인증코드가 올바르지 않습니다.',
      consent_required:'개인정보 수집·이용 동의가 필요합니다.',
      totp_not_configured:'관리자 인증이 설정되지 않았습니다.'})[code] || '오류가 발생했습니다.';
  }

  fLogin.onsubmit=function(e){ e.preventDefault();
    var u=(document.getElementById('li-user').value||'').trim(), p=document.getElementById('li-pw').value||'';
    if(!u||!p){ setErr('아이디와 비밀번호를 입력하세요.'); return; }
    setErr('로그인 중…');
    fetch('/api/jp-members',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:u,password:p})})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
      .then(function(res){ if(res.ok&&res.j.ok){ Auth.token=res.j.token; Auth.exp=res.j.exp; Auth.role='member'; Auth.name=res.j.name||''; Auth.username=res.j.username||u; Auth.type=res.j.type||'일반'; Auth.tabs=res.j.tabs||[]; Auth.master=!!res.j.master; Auth.save(); setErr(''); onAuthed(); }
        else setErr(errMsg(res.j&&res.j.error)); })
      .catch(function(){ setErr('네트워크 오류'); });
  };

  fReg.onsubmit=function(e){ e.preventDefault();
    var name=(document.getElementById('rg-name').value||'').trim(), u=(document.getElementById('rg-user').value||'').trim(), p=document.getElementById('rg-pw').value||'';
    var consent=document.getElementById('rg-consent');
    if(!name||!u||!p){ setErr('이름·아이디·비밀번호를 모두 입력하세요.'); return; }
    if(!consent||!consent.checked){ setErr('개인정보 수집·이용에 동의해야 신청할 수 있습니다.'); return; }
    setErr('회원가입 신청 중…');
    fetch('/api/jp-members',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'register',username:u,password:p,name:name,consent:true})})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
      .then(function(res){ if(res.ok&&res.j.ok){ setErr(''); document.querySelector('.auth-tab[data-at="login"]').click();
          var e2=document.getElementById('auth-err'); if(e2){ e2.style.color='var(--accent,#2f5d4a)'; e2.textContent='회원가입 신청 완료 — 홍보부 부장에게 확인하여 계정을 부여받으세요. 승인 후 로그인됩니다.'; } }
        else setErr(errMsg(res.j&&res.j.error)); })
      .catch(function(){ setErr('네트워크 오류'); });
  };

  fAdmin.onsubmit=function(e){ e.preventDefault();
    var code=(document.getElementById('ad-code').value||'').replace(/\D/g,'');
    if(code.length!==6){ setErr('6자리 코드를 입력하세요.'); return; }
    setErr('확인 중…');
    fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:code})})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
      .then(function(res){ if(res.ok&&res.j.ok){ Auth.token=res.j.token; Auth.exp=res.j.exp; Auth.role='admin'; Auth.name='관리자'; Auth.username='admin'; Auth.save(); setErr(''); onAuthed(); }
        else setErr(errMsg(res.j&&res.j.error)); })
      .catch(function(){ setErr('네트워크 오류'); });
  };

  if(!hasSession) setTimeout(function(){ var i=document.getElementById('li-user'); if(i) i.focus(); },60);
}

function doLogout(){ Auth.clear(); try{ location.reload(); }catch(e){ document.documentElement.classList.remove('pw-ok'); } }
// 관리자 15분 유휴 자동 로그아웃
var adminIdleT=0;
// 유휴 로그아웃은 공용기기에서 쓰는 TOTP 관리자 세션 전용 — 마스터(개인 계정)에는 적용하지 않음
function resetAdminIdle(){ if(adminIdleT){ clearTimeout(adminIdleT); adminIdleT=0; } if(Auth.authed()&&Auth.role==='admin'){ adminIdleT=setTimeout(function(){ alert('15분 동안 활동이 없어 관리자에서 로그아웃됩니다.'); doLogout(); }, 15*60*1000); } }
function startIdleWatch(){ ['pointerdown','keydown','wheel','touchstart','input','change'].forEach(function(ev){ document.addEventListener(ev, resetAdminIdle, {passive:true,capture:true}); }); }
// 본인 비밀번호 변경(로그인 회원)
function changeMyPassword(){
  if(!Auth.authed()||Auth.role==='admin') return;   // TOTP 관리자만 제외 — 마스터는 본인 회원 비번을 바꾼다
  var oldp=prompt('현재 비밀번호'); if(oldp===null) return;
  var np=prompt('새 비밀번호 (4자 이상)'); if(np===null) return; if(np.length<4){ toast('4자 이상'); return; }
  fetch('/api/jp-members',{method:'POST',headers:authJsonHeaders(),body:JSON.stringify({action:'change_password',oldPassword:oldp,newPassword:np})})
    .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
    .then(function(res){ if(res.ok&&res.j.ok){ toast('비밀번호를 변경했습니다'); } else { toast(res.j&&res.j.error==='wrong_password'?'현재 비밀번호가 틀립니다':(res.j&&res.j.error==='weak_password'?'4자 이상이어야 합니다':'변경 실패')); } })
    .catch(function(){ toast('네트워크 오류'); });
}

/* ===== 홍보부원 기사 (news) ===== */
var newsItems=[], newsLoaded=false, newsEdit=null; // newsEdit: {id?, title, body, images[]}
function loadNews(){
  fetch('/api/jp-news').then(function(r){return r.json();}).then(function(j){ newsItems=(j&&j.articles)||[]; newsLoaded=true; if(curViewMode==='news') renderNews(); else if(curViewMode==='dashboard') renderDashboard(); })
    .catch(function(){ newsLoaded=true; if(curViewMode==='news') renderNews(); else if(curViewMode==='dashboard') renderDashboard(); });
}
function canEditNews(a){ return Auth.isAdmin() || (Auth.username && a.author===Auth.username); }
// 이 기사 내용·사진을 카드뉴스 제작기로 가져가기(localStorage 전달 → 제작기가 현재 카드에 채움)
function articleToCardnews(id){
  var a=newsItems.filter(function(x){return x.id===id;})[0]; if(!a) return;
  try{ localStorage.setItem('cc-import', JSON.stringify({title:a.title||'', body:a.body||'', images:(a.images||[]).slice(0,3), at:Date.now()})); }catch(e){}
  window.open('/krjam-cardnews','_blank','noopener');
  toast('카드뉴스 제작기에서 상단 “기사 가져오기”를 눌러 채우세요');
}
// ── 기사 검수 코멘트 ──
var openComments={};
function renderArticleComments(a){
  var list=(a.comments||[]).map(function(c){
    var del=(Auth.isAdmin()||(Auth.username&&c.username===Auth.username))?'<button class="ac-del" data-ac-del="'+esc(a.id)+'~'+esc(c.id)+'" aria-label="삭제">'+icon('x',12)+'</button>':'';
    return '<div class="ac-item"><div class="ac-h"><b>'+esc(c.author||'')+'</b><span>'+esc(fmtNewsTime(c.ts))+'</span>'+del+'</div><div class="ac-t">'+esc(c.text||'').replace(/\n/g,'<br>')+'</div></div>';
  }).join('');
  return '<div class="ac-box">'+(list||'<div class="ac-empty">아직 검수 코멘트가 없습니다.</div>')+
    (Auth.authed()?('<div class="ac-add"><input class="ac-input" data-ac-input="'+esc(a.id)+'" placeholder="검수 의견·수정 요청…" maxlength="1000"><button class="btn xs solid" data-ac-send="'+esc(a.id)+'">등록</button></div>'):'')+'</div>';
}
function toggleNewsComments(id){ openComments[id]=!openComments[id]; renderNews(); }
function addNewsComment(id){
  var inp=document.querySelector('[data-ac-input="'+id+'"]'); if(!inp) return; var text=(inp.value||'').trim(); if(!text) return;
  fetch('/api/jp-news',{method:'POST',headers:authJsonHeaders(),body:JSON.stringify({action:'comment',id:id,text:text,authorName:Auth.name||Auth.username})})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok&&j.article){ var i=newsItems.map(function(x){return x.id;}).indexOf(id); if(i>=0) newsItems[i]=j.article; openComments[id]=true; renderNews(); } else toast('등록 실패'); })
    .catch(function(){ toast('네트워크 오류'); });
}
function deleteNewsComment(id, cid){
  fetch('/api/jp-news',{method:'POST',headers:authJsonHeaders(),body:JSON.stringify({action:'comment_delete',id:id,commentId:cid})})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok&&j.article){ var i=newsItems.map(function(x){return x.id;}).indexOf(id); if(i>=0) newsItems[i]=j.article; renderNews(); } })
    .catch(function(){ toast('네트워크 오류'); });
}

/* ===== 자료 라이브러리 (아카이브) — 운영 계획서 / 카드뉴스 자료 / 사진·기타 구분 ===== */
function renderNews(){
  var box=document.getElementById('news-list'); if(!box) return;
  if(!newsLoaded){ box.innerHTML='<div class="news-empty">기사 불러오는 중…</div>'; return; }
  if(!newsItems.length){ box.innerHTML='<div class="news-empty">아직 올라온 기사가 없습니다. <b>기사 작성</b>으로 첫 기사를 올려보세요.</div>'; return; }
  box.innerHTML=newsItems.map(function(a){
    var imgs=(a.images||[]).slice(0,3).map(function(u){ return '<img class="news-thumb" src="'+esc(u)+'" data-lb="'+esc(u)+'" alt="">'; }).join('');
    var tools='';
    if(canEditNews(a)) tools+='<button class="btn xs ghost" data-news-edit="'+esc(a.id)+'">'+icon('edit',13)+' 수정</button>';
    tools+='<button class="btn xs ghost" data-news-tocard="'+esc(a.id)+'" title="이 기사 내용·사진으로 카드뉴스 제작기 채우기">'+icon('image',13)+' 카드뉴스 만들기</button>';
    tools+='<button class="btn xs ghost" data-news-comments="'+esc(a.id)+'">'+icon('fileText',13)+' 검수 '+((a.comments||[]).length||0)+'</button>';
    if(Auth.isAdmin()) tools+='<button class="btn xs ghost danger" data-news-del="'+esc(a.id)+'">'+icon('trash',13)+' 삭제</button>';
    var edited=(a.updatedAt&&a.updatedAt!==a.createdAt)?' · 수정됨':'';
    return '<article class="news-card">'+
      (imgs?('<div class="news-photos n'+(a.images||[]).length+'">'+imgs+'</div>'):'')+
      '<div class="news-main">'+
        '<h3 class="news-title">'+esc(a.title||'(제목 없음)')+'</h3>'+
        '<div class="news-meta"><span class="news-author">'+icon('user',13)+' '+esc(a.authorName||a.author||'홍보부원')+'</span><span class="news-date">'+esc(fmtNewsTime(a.createdAt))+edited+'</span></div>'+
        (a.body?('<div class="news-text">'+esc(a.body).replace(/\n/g,'<br>')+'</div>'):'')+
        (tools?('<div class="news-tools">'+tools+'</div>'):'')+
        (openComments[a.id]?renderArticleComments(a):'')+
      '</div></article>';
  }).join('');
}
function openNewsEditor(id){
  if(!Auth.authed()){ toast('로그인 후 작성할 수 있습니다'); return; }
  var src=id?newsItems.filter(function(x){return x.id===id;})[0]:null;
  newsEdit = src ? {id:src.id, title:src.title||'', body:src.body||'', images:(src.images||[]).slice(0,3)} : {title:'', body:'', images:[]};
  document.getElementById('news-mtitle').textContent = id?'기사 수정':'기사 작성';
  renderNewsEditor();
  document.getElementById('news-scrim').classList.add('show');
}
function closeNewsEditor(){ document.getElementById('news-scrim').classList.remove('show'); newsEdit=null; }
function renderNewsEditor(){
  var b=document.getElementById('news-body'); if(!b||!newsEdit) return;
  var slots=newsEdit.images.map(function(u,i){ return '<div class="news-slot filled"><img src="'+esc(u)+'" alt=""><button class="news-slot-x" data-news-img-del="'+i+'" aria-label="삭제">'+icon('x',13)+'</button></div>'; }).join('');
  var addSlot = newsEdit.images.length<3 ? '<label class="news-slot add">'+icon('plus',18)+'<span>사진 추가</span><input type="file" accept="image/*" multiple id="news-file" hidden></label>' : '';
  b.innerHTML=
    '<label class="fl">제목</label><input class="ti" id="news-title" type="text" maxlength="160" placeholder="기사 제목" value="'+esc(newsEdit.title)+'">'+
    '<label class="fl">사진 (최대 3장)</label><div class="news-slots">'+slots+addSlot+'</div>'+
    '<label class="fl">기사 본문</label><textarea class="ta" id="news-bodytext" rows="8" placeholder="기사 내용을 입력하세요">'+esc(newsEdit.body)+'</textarea>';
  var ti=document.getElementById('news-title'); if(ti) ti.oninput=function(){ newsEdit.title=this.value; };
  var ta=document.getElementById('news-bodytext'); if(ta) ta.oninput=function(){ newsEdit.body=this.value; };
  var fi=document.getElementById('news-file');
  if(fi) fi.onchange=function(){ handleNewsFiles(this.files); };
}
function handleNewsFiles(files){
  if(!files||!files.length||!newsEdit) return;
  var remaining=3-newsEdit.images.length; if(remaining<=0){ toast('사진은 최대 3장입니다'); return; }
  var list=Array.prototype.slice.call(files).slice(0,remaining);
  toast('사진 업로드 중…');
  (function next(){
    if(!list.length){ renderNewsEditor(); return; }
    var f=list.shift();
    downscale(f,1600,0.85).then(function(blob){ return uploadBlob(blob); })
      .then(function(url){ if(url && newsEdit.images.length<3) newsEdit.images.push(url); next(); })
      .catch(function(){ toast('사진 업로드 실패'); next(); });
  })();
}
function commitNews(){
  if(!newsEdit) return;
  var title=(newsEdit.title||'').trim(), body=(newsEdit.body||'').trim();
  if(!title && !body){ toast('제목 또는 본문을 입력하세요'); return; }
  var method=newsEdit.id?'PUT':'POST';
  var payload={title:title, body:body, images:newsEdit.images, authorName:Auth.name||Auth.username};
  if(newsEdit.id) payload.id=newsEdit.id;
  fetch('/api/jp-news',{method:method,headers:authJsonHeaders(),body:JSON.stringify(payload)})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } if(r.status===403){ toast('수정 권한이 없습니다'); return null; } return r.json(); })
    .then(function(j){ if(!j) return; if(j.ok){ toast(newsEdit.id?'기사를 수정했습니다':'기사를 게시했습니다'); closeNewsEditor(); loadNews(); } else toast('저장 실패'); })
    .catch(function(){ toast('네트워크 오류'); });
}
function deleteNews(id){
  if(!Auth.isAdmin()) return;
  if(!confirm('이 기사를 삭제할까요? (되돌릴 수 없습니다)')) return;
  fetch('/api/jp-news?id='+encodeURIComponent(id),{method:'DELETE',headers:authHeader()})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok){ toast('기사를 삭제했습니다'); loadNews(); } })
    .catch(function(){ toast('네트워크 오류'); });
}

/* ===== 현장 제보 인박스 ===== */
var tipItems=[], tipLoaded=false, tipFilter='all', tipEdit=null;
// [라벨, 연배경, 잉크] — 흰 글씨 솔리드였으나 대비 미달이라 연한 칩으로
var TIP_STATUS={ 'new':['새 제보','var(--st-planned-bg)','#C2CBC3'], 'used':['채택','var(--st-ready-bg)','#66DDA0'], 'rejected':['반려','rgba(210,84,60,.15)','#E68A7C'] };
function loadTips(){
  fetch('/api/jp-tips',{headers:authHeader()}).then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(!j) return; tipItems=(j&&j.tips)||[]; tipLoaded=true; afterTipsLoaded(); })
    .catch(function(){ tipLoaded=true; afterTipsLoaded(); });
}
function afterTipsLoaded(){ if(curViewMode==='tips') renderTips(); else if(curViewMode==='dashboard') renderDashboard(); else if(curViewMode==='list') renderBoard(); }
function tipZoneLabel(z){ var zz=zoneByKey(z); return zz?zz.label:(z||''); }
function tipZoneOptions(sel){ return '<option value="">— 선택 안 함 —</option>'+ZONES.map(function(z){ return '<option value="'+z.key+'"'+(z.key===sel?' selected':'')+'>'+esc(z.label)+'</option>'; }).join(''); }
function renderTips(){
  var bar=document.getElementById('tip-filters');
  if(bar){ var counts={all:tipItems.length}; tipItems.forEach(function(t){ counts[t.status]=(counts[t.status]||0)+1; });
    var defs=[['all','전체'],['new','새 제보'],['used','채택'],['rejected','반려']];
    bar.innerHTML='<div class="frow">'+defs.map(function(d){ return '<button class="filterbtn'+(tipFilter===d[0]?' active':'')+'" data-tipf="'+d[0]+'">'+d[1]+' ('+(counts[d[0]]||0)+')</button>'; }).join('')+'</div>';
  }
  var grid=document.getElementById('tip-grid'); if(!grid) return;
  if(!tipLoaded){ grid.innerHTML='<div class="news-empty">불러오는 중…</div>'; return; }
  var items=tipItems.filter(function(t){ return tipFilter==='all'||t.status===tipFilter; });
  if(!items.length){ grid.innerHTML='<div class="news-empty">'+(tipFilter==='all'?'아직 제보가 없습니다. 우측 상단 <b>제보하기</b>로 첫 제보를 올려보세요.':'해당 상태의 제보가 없습니다.')+'</div>'; return; }
  var staff=Auth.isStaff();
  grid.innerHTML=items.map(function(t){
    var st=TIP_STATUS[t.status]||TIP_STATUS['new'];
    var photos=(t.photos||[]).map(function(u){ return '<img class="tip-thumb" src="'+esc(u)+'" data-lb="'+esc(u)+'" alt="" loading="lazy">'; }).join('');
    var meta=[]; if(t.reporterName) meta.push(icon('user',12)+' '+esc(t.reporterName)); if(t.phone) meta.push('<a class="tip-phone" href="tel:'+esc(t.phone)+'">'+icon('phone',12)+' '+esc(t.phone)+'</a>'); if(t.org) meta.push(esc(t.org)); var zl=tipZoneLabel(t.zone); if(zl) meta.push(icon('mapPin',12)+' '+esc(zl));
    var srcBadge=(t.source==='public')?'<span class="tip-src">외부 제보</span>':'';
    var asg=t.assignee?rosterById(t.assignee):null;
    var asgChip=asg?('<span class="tip-asg">'+icon('user',12)+' 담당 '+esc(personLabel(asg))+'</span>'):'';
    // 제보자 희망 일시(선택) — 아직 일정 안 잡힌 경우에만 표시
    if(!t.scheduled && (t.date||t.time)) meta.push(icon('clock',12)+' 희망 '+esc([t.date,t.time].filter(Boolean).join(' ')));
    var scChip=t.scheduled
      ? ('<span class="tip-sch '+(t.scheduled.kind==='tt'?'tt':'slot')+'" data-tip-goto="'+esc(t.id)+'" title="연결된 일정 열기">'+
          icon(t.scheduled.kind==='tt'?'clock':'calendar',12)+' 일정 '+esc([t.scheduled.date,t.scheduled.time].filter(Boolean).join(' '))+'</span>')
      : '';
    var canDel=Auth.isAdmin()||(Auth.username&&t.reporterUser===Auth.username);
    var tools='';
    if(staff){
      var ropts='<option value="">담당 미지정</option>'+rosterList().map(function(m){ return '<option value="'+esc(m.id)+'"'+(t.assignee===m.id?' selected':'')+'>'+esc(personLabel(m))+'</option>'; }).join('');
      tools+='<select class="tip-assign" data-tip-assign="'+esc(t.id)+'" title="담당자 배정">'+ropts+'</select>';
      tools+='<button class="btn xs ghost" data-tip-sched="'+esc(t.id)+'" title="날짜·시간·담당을 정해 일정에 올립니다">'+icon('clock',12)+' '+(t.scheduled?'일정 변경':'일정 잡기')+'</button>';
      if(t.scheduled) tools+='<button class="btn xs ghost" data-tip-unsched="'+esc(t.id)+'" title="일정 링크 해제">링크 해제</button>';
      tools+='<button class="btn xs ghost" data-tip-tonews="'+esc(t.id)+'" title="이 제보로 기사 작성">'+icon('fileText',12)+' 기사로</button>';
      if((t.photos||[]).length) tools+='<button class="btn xs ghost" data-tip-toassets="'+esc(t.id)+'" title="사진을 자료실로">'+icon('image',12)+' 자료실로</button>';
      if(t.status!=='used') tools+='<button class="btn xs ghost" data-tip-status="'+esc(t.id)+'~used">'+icon('check',12)+' 채택</button>';
      if(t.status!=='rejected') tools+='<button class="btn xs ghost danger" data-tip-status="'+esc(t.id)+'~rejected">반려</button>';
      if(t.status!=='new') tools+='<button class="btn xs ghost" data-tip-status="'+esc(t.id)+'~new">되돌리기</button>';
    }
    if(canDel) tools+='<button class="btn xs ghost danger" data-tip-del="'+esc(t.id)+'">'+icon('trash',12)+' 삭제</button>';
    return '<article class="tipcard s-'+esc(t.status)+'">'+
      (photos?('<div class="tip-photos n'+(t.photos||[]).length+'">'+photos+'</div>'):'')+
      '<div class="tip-main">'+
        '<div class="tip-top"><span class="tip-badge" style="background:'+st[1]+';color:'+st[2]+'">'+st[0]+'</span>'+srcBadge+asgChip+scChip+'<span class="tip-time">'+esc(fmtNewsTime(t.createdAt))+'</span></div>'+
        (t.text?('<div class="tip-text">'+esc(t.text).replace(/\n/g,'<br>')+'</div>'):'')+
        (meta.length?('<div class="tip-meta">'+meta.join('<span class="dotsep">·</span>')+'</div>'):'')+
        (tools?('<div class="tip-tools">'+tools+'</div>'):'')+
      '</div></article>';
  }).join('');
}
function openTipEditor(){
  if(!Auth.authed()){ toast('로그인 후 제보할 수 있습니다'); return; }
  tipEdit={ org:'', zone:'', text:'', images:[] };
  renderTipEditor();
  document.getElementById('tip-scrim').classList.add('show');
}
function closeTipEditor(){ document.getElementById('tip-scrim').classList.remove('show'); tipEdit=null; }
function renderTipEditor(){
  var b=document.getElementById('tip-body'); if(!b||!tipEdit) return;
  var slots=tipEdit.images.map(function(u,i){ return '<div class="news-slot filled"><img src="'+esc(u)+'" alt=""><button class="news-slot-x" data-tip-img-del="'+i+'" aria-label="삭제">'+icon('x',13)+'</button></div>'; }).join('');
  var addSlot=tipEdit.images.length<3?'<label class="news-slot add">'+icon('plus',18)+'<span>사진 추가</span><input type="file" accept="image/*" multiple id="tip-file" hidden></label>':'';
  b.innerHTML=
    '<div class="tip-who">제보자: <b>'+esc(Auth.name||Auth.username||'')+'</b></div>'+
    '<label class="fl">소속 (선택) — 예: 운영본부 · 평화숲분단</label><input class="ti" id="tip-org" type="text" maxlength="60" placeholder="소속 · 부서" value="'+esc(tipEdit.org)+'">'+
    '<label class="fl">위치 (선택)</label><select class="ti" id="tip-zone">'+tipZoneOptions(tipEdit.zone)+'</select>'+
    '<label class="fl">소식 내용</label><textarea class="ta" id="tip-text" rows="4" placeholder="잼버리 소식 · 사연을 적어주세요">'+esc(tipEdit.text)+'</textarea>'+
    '<label class="fl">사진 (최대 3장)</label><div class="news-slots">'+slots+addSlot+'</div>';
  b.querySelector('#tip-org').oninput=function(){ tipEdit.org=this.value; };
  b.querySelector('#tip-zone').onchange=function(){ tipEdit.zone=this.value; };
  b.querySelector('#tip-text').oninput=function(){ tipEdit.text=this.value; };
  var fi=b.querySelector('#tip-file'); if(fi) fi.onchange=function(){ handleTipFiles(this.files); };
}
function handleTipFiles(files){
  if(!files||!files.length||!tipEdit) return;
  var remaining=3-tipEdit.images.length; if(remaining<=0){ toast('사진은 최대 3장입니다'); return; }
  var list=Array.prototype.slice.call(files).slice(0,remaining); toast('사진 업로드 중…');
  (function next(){ if(!list.length){ renderTipEditor(); return; } var f=list.shift();
    downscale(f,1600,0.85).then(function(blob){ return uploadBlob(blob); })
      .then(function(url){ if(url && tipEdit.images.length<3) tipEdit.images.push(url); next(); })
      .catch(function(){ toast('사진 업로드 실패'); next(); }); })();
}
function commitTip(){
  if(!tipEdit) return;
  var text=(tipEdit.text||'').trim();
  if(!text && !tipEdit.images.length){ toast('내용 또는 사진을 입력하세요'); return; }
  fetch('/api/jp-tips',{method:'POST',headers:authJsonHeaders(),body:JSON.stringify({org:tipEdit.org,zone:tipEdit.zone,text:text,photos:tipEdit.images,reporterName:Auth.name||Auth.username})})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok&&j.tip){ tipItems.unshift(j.tip); toast('제보가 등록되었습니다. 감사합니다!'); closeTipEditor(); if(curViewMode==='tips') renderTips(); } else toast('등록 실패'); })
    .catch(function(){ toast('네트워크 오류'); });
}
function triageTip(id,status){
  fetch('/api/jp-tips',{method:'PATCH',headers:authJsonHeaders(),body:JSON.stringify({id:id,status:status})})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok&&j.tip){ var i=tipItems.map(function(x){return x.id;}).indexOf(id); if(i>=0) tipItems[i]=j.tip; renderTips(); } })
    .catch(function(){ toast('네트워크 오류'); });
}
function assignTip(id,assignee){
  fetch('/api/jp-tips',{method:'PATCH',headers:authJsonHeaders(),body:JSON.stringify({id:id,assignee:assignee})})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok&&j.tip){ var i=tipItems.map(function(x){return x.id;}).indexOf(id); if(i>=0) tipItems[i]=j.tip; renderTips(); var who=assignee?rosterById(assignee):null; toast(who?(personLabel(who)+' 님에게 배정'):'담당 해제'); } })
    .catch(function(){ toast('네트워크 오류'); });
}
function deleteTip(id){
  if(!confirm('이 제보를 삭제할까요?')) return;
  fetch('/api/jp-tips?id='+encodeURIComponent(id),{method:'DELETE',headers:authHeader()})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok){ tipItems=tipItems.filter(function(x){return x.id!==id;}); renderTips(); toast('삭제됨'); } else if(j) toast('삭제 권한 없음'); })
    .catch(function(){ toast('네트워크 오류'); });
}
/* ===== 소식 제보 → 일정 잡기 =====
   날짜로 자동 분기: 8/2~8/9(JAM_DAYS) = 잼버리 일정표의 취재 블록 · 그 외 = 콘텐츠 캘린더 슬롯.
   제보에는 scheduled{kind,ref,date,time} 를 남겨 양방향으로 오갈 수 있게 한다. */
var tschDraft=null;   // {tipId, date, hh, mm, dur, title, assignees[], zone}
function isJamDay(d){ return JAM_DAYS.some(function(x){ return x[0]===d; }); }
function tipTitleGuess(t){
  var s=(t.text||'').trim().split('\n')[0].trim();
  if(s.length>40) s=s.slice(0,40)+'…';
  return s || ((t.reporterName||'소식')+' 취재');
}
function openTipSchedule(id){
  var t=tipItems.filter(function(x){return x.id===id;})[0]; if(!t) return;
  if(!Auth.isStaff()){ toast('홍보부만 일정을 잡을 수 있습니다'); return; }
  var sc=t.scheduled||null;
  var d=(sc&&sc.date)||t.date||todayISO();
  var tm=(sc&&sc.time)||t.time||'10:00';
  // ||10 폴백은 자정(0시)을 10시로 바꿔버린다 — NaN 검사로 구분
  var h0=parseInt(tm.split(':')[0],10), m0=parseInt(tm.split(':')[1],10);
  tschDraft={ tipId:id, date:d, hh:isNaN(h0)?10:Math.max(0,Math.min(23,h0)), mm:isNaN(m0)?0:Math.max(0,Math.min(59,m0)),
              dur:60, title:tipTitleGuess(t), assignees:t.assignee?[t.assignee]:[], zone:t.zone||'' };
  renderTipSchedule();
  document.getElementById('tsch-scrim').classList.add('show');
}
function closeTipSchedule(){ document.getElementById('tsch-scrim').classList.remove('show'); tschDraft=null; }
function renderTipSchedule(){
  if(!tschDraft) return;
  var d=tschDraft, jam=isJamDay(d.date);
  var people=rosterList().map(function(m){
    var on=d.assignees.indexOf(m.id)>=0;
    return '<button class="evkind'+(on?' on':'')+'" data-tsch-p="'+esc(m.id)+'">'+esc(personLabel(m))+'</button>';
  }).join('') || '<span class="tsch-none">홍보부 인원이 없습니다 — 인원 관리에서 먼저 등록하세요.</span>';
  document.getElementById('tsch-body').innerHTML=
    '<div class="fl">날짜</div>'+
    '<input class="ti" id="tsch-date" type="date" min="2026-06-15" max="2026-08-09" value="'+esc(d.date)+'">'+
    '<div class="tsch-dest '+(jam?'jam':'cal')+'">'+icon(jam?'clock':'calendar',13)+'<span>'+
      (jam?'<b>잼버리 일정표</b>에 취재 블록으로 등록됩니다.':'<b>콘텐츠 캘린더</b>에 콘텐츠로 등록됩니다. <span class="tsch-why">(일정표는 8/2~8/9만 다룹니다)</span>')+'</span></div>'+
    '<div class="fl">시작 시각 (24시간)</div>'+
    '<div class="evtimegrp"><input class="evtime" id="tsch-hh" type="number" min="0" max="23" value="'+d.hh+'"><span>:</span>'+
      '<input class="evtime" id="tsch-mm" type="number" min="0" max="59" step="5" value="'+d.mm+'">'+
      (jam?('<span class="tsch-dur">소요 <input class="evtime" id="tsch-dur" type="number" min="15" max="600" step="15" value="'+d.dur+'">분</span>'):'')+'</div>'+
    '<div class="fl">제목</div>'+
    '<input class="ti" id="tsch-title" type="text" maxlength="120" value="'+esc(d.title)+'">'+
    '<div class="fl">담당 인원</div><div class="chipset">'+people+'</div>'+
    '<div class="fl">현장 지도 구역</div><select class="ti" id="tsch-zone">'+zoneOptions(d.zone)+'</select>';
}
function commitTipSchedule(){
  if(!tschDraft) return;
  var d=tschDraft;
  d.date=document.getElementById('tsch-date').value||'';
  d.hh=Math.max(0,Math.min(23,parseInt(document.getElementById('tsch-hh').value,10)||0));
  d.mm=Math.max(0,Math.min(59,parseInt(document.getElementById('tsch-mm').value,10)||0));
  var durEl=document.getElementById('tsch-dur'); if(durEl) d.dur=Math.max(15,parseInt(durEl.value,10)||60);
  d.title=(document.getElementById('tsch-title').value||'').trim();
  d.zone=document.getElementById('tsch-zone').value||'';
  if(!d.date){ toast('날짜를 선택하세요'); return; }
  if(!d.title){ toast('제목을 입력하세요'); return; }
  var t=tipItems.filter(function(x){return x.id===d.tipId;})[0];
  var time=pad2(d.hh)+':'+pad2(d.mm);
  var sched;
  if(isJamDay(d.date)){
    // 잼버리 일정표 취재 블록
    var startH=d.hh+d.mm/60, endH=Math.min(24,startH+d.dur/60);
    var item={ id:mkid(), day:d.date, start:time, end:h2hhmm(endH), title:d.title,
               place:tipZoneLabel(d.zone), zone:d.zone, cat:'홍보활동',
               assignees:d.assignees.slice(), contacts:[], memo:'소식 제보에서 생성'+(t&&t.reporterName?(' · 제보자 '+t.reporterName):''),
               series:'', rundown:[], tipId:d.tipId };
    ttList().push(item); saveTimetable();
    if(curViewMode==='timetable') renderTimetable(); if(curViewMode==='staff') renderStaff();
    sched={kind:'tt', ref:item.id, date:d.date, time:time};
  } else {
    // 콘텐츠 캘린더 슬롯 (행사 전 소식)
    if(!byDate[d.date]){ toast('캘린더 기간(6/15~8/9) 밖 날짜입니다'); return; }
    var k=addContent(d.date), e=getEdit(k);
    e.title=d.title; e.time=time; e.ctype='취재';
    var who=d.assignees.length?rosterById(d.assignees[0]):null; if(who) e.owner=personLabel(who);
    var s=findSlot(byDate[d.date],k);
    renderAfterEdit(k,s,true);
    if(curViewMode==='calendar') renderCalendar();
    sched={kind:'slot', ref:k, date:d.date, time:time};
  }
  // 제보에 일정 링크 + 담당자 동기화
  var patch={id:d.tipId, scheduled:sched, date:d.date, time:time};
  if(d.assignees.length) patch.assignee=d.assignees[0];
  fetch('/api/jp-tips',{method:'PATCH',headers:authJsonHeaders(),body:JSON.stringify(patch)})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok&&j.tip){ var i=tipItems.map(function(x){return x.id;}).indexOf(d.tipId); if(i>=0) tipItems[i]=j.tip; renderTips(); } })
    .catch(function(){ toast('제보 링크 저장 실패 — 일정은 생성됨'); });
  closeTipSchedule();
  toast(sched.kind==='tt'?'잼버리 일정표에 등록됨':'콘텐츠 캘린더에 등록됨');
}
function openTipScheduled(id){   // 제보 카드의 일정 칩 → 해당 일정으로 이동
  var t=tipItems.filter(function(x){return x.id===id;})[0]; if(!t||!t.scheduled) return;
  var sc=t.scheduled;
  if(sc.kind==='tt'){ setView('timetable'); setTimeout(function(){ openTT(sc.ref); },60); }
  else { var s=byDate[sc.date]&&findSlot(byDate[sc.date],sc.ref); if(s){ setView('calendar'); setTimeout(function(){ openSlot(sc.date,s); },60); } else toast('연결된 콘텐츠를 찾을 수 없습니다'); }
}
function unscheduleTip(id){
  if(!confirm('이 제보의 일정 링크를 해제할까요?\n(생성된 일정 자체는 남습니다)')) return;
  fetch('/api/jp-tips',{method:'PATCH',headers:authJsonHeaders(),body:JSON.stringify({id:id,scheduled:null})})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok&&j.tip){ var i=tipItems.map(function(x){return x.id;}).indexOf(id); if(i>=0) tipItems[i]=j.tip; renderTips(); toast('일정 링크 해제됨'); } })
    .catch(function(){ toast('네트워크 오류'); });
}
function tipToNews(id){
  var t=tipItems.filter(function(x){return x.id===id;})[0]; if(!t) return;
  if(!Auth.authed()){ toast('로그인 후 작성'); return; }
  newsEdit={ title:'', body:t.text||'', images:(t.photos||[]).slice(0,3) };
  document.getElementById('news-mtitle').textContent='기사 작성 (소식 제보)';
  renderNewsEditor();
  document.getElementById('news-scrim').classList.add('show');
}
function tipToAssets(id){
  var t=tipItems.filter(function(x){return x.id===id;})[0]; if(!t||!(t.photos||[]).length) return;
  var zl=tipZoneLabel(t.zone); var tags=zl?[zl]:[];
  toast('자료실로 보내는 중…'); var done=0,ok=0;
  t.photos.forEach(function(url){
    fetch('/api/jp-assets',{method:'POST',headers:authJsonHeaders(),body:JSON.stringify({url:url,name:(t.reporterName||'잼버리 소식 제보'),type:'photo',tags:tags,authorName:Auth.name||Auth.username})})
      .then(function(r){return r.json();}).then(function(j){ if(j&&j.ok){ ok++; if(typeof libItems!=='undefined'&&j.asset) libItems.unshift(j.asset); } done++; if(done===t.photos.length) toast('자료실에 '+ok+'개 추가됨'); })
      .catch(function(){ done++; });
  });
}

/* ===== 관리자: 홍보부원 회원 관리 ===== */
var membersList=[], memberTypes={};
var TAB_LABELS=[['dashboard','대시보드'],['news','기사'],['calendar','캘린더'],['list','리스트'],['timetable','일정표'],['staff','인원관리'],['contacts','협조연락처'],['orginfo','분단연락망'],['protocol','의전']];
function openMembers(){
  if(!Auth.isAdmin()) return;
  document.getElementById('members-scrim').classList.add('show');
  renderMembers('불러오는 중…');
  fetch('/api/jp-members',{headers:authHeader()})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(!j) return; membersList=(j&&j.members)||[]; memberTypes=(j&&j.types)||{}; renderMembers(); })
    .catch(function(){ renderMembers('불러오기 실패'); });
}
function saveMemberTypes(rerender){
  fetch('/api/jp-members',{method:'PATCH',headers:authJsonHeaders(),body:JSON.stringify({action:'types',types:memberTypes})})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok){ memberTypes=j.types||memberTypes; toast('유형 저장됨'); if(rerender) renderMembers(); } })
    .catch(function(){ toast('네트워크 오류'); });
}
function renameType(from, to){
  to=(to||'').trim();
  if(!to || to===from){ renderMembers(); return; }
  if(memberTypes[to]!=null){ toast('이미 있는 유형 이름입니다'); renderMembers(); return; }
  fetch('/api/jp-members',{method:'PATCH',headers:authJsonHeaders(),body:JSON.stringify({action:'rename_type',from:from,to:to})})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok){ toast('유형 이름 변경됨'); openMembers(); } else { toast('변경 실패'); renderMembers(); } })
    .catch(function(){ toast('네트워크 오류'); });
}
function closeMembers(){ document.getElementById('members-scrim').classList.remove('show'); }
function renderMembers(msg){
  var b=document.getElementById('members-body'); if(!b) return;
  if(msg){ b.innerHTML='<div class="news-empty">'+esc(msg)+'</div>'; return; }
  var pend=membersList.filter(function(m){return m.status!=='approved';});
  var appr=membersList.filter(function(m){return m.status==='approved';});
  function row(m){
    var tools='';
    if(m.status!=='approved') tools+='<button class="btn xs solid" data-mem-approve="'+esc(m.username)+'">'+icon('check',13)+' 승인</button>';
    if(m.status==='approved'){ var topts=Object.keys(memberTypes).length?Object.keys(memberTypes):['일반','홍보부']; if(m.type&&topts.indexOf(m.type)<0) topts=topts.concat([m.type]); tools+='<select class="mem-type" data-mem-type="'+esc(m.username)+'" title="회원 유형 (접근 권한)">'+topts.map(function(tn){return '<option value="'+esc(tn)+'"'+((m.type||'일반')===tn?' selected':'')+'>'+esc(tn)+'</option>';}).join('')+'</select>'; }
    if(m.status==='approved') tools+='<button class="btn xs ghost" data-mem-master="'+esc(m.username)+'" data-val="'+(m.master?'0':'1')+'" title="마스터 = 관리자와 동일 권한(회원 승인·삭제 포함)">'+(m.master?'마스터 해제':'마스터 지정')+'</button>';
    tools+='<button class="btn xs ghost" data-mem-reset="'+esc(m.username)+'">PW 초기화</button>';
    tools+='<button class="btn xs ghost danger" data-mem-reject="'+esc(m.username)+'">'+icon('trash',13)+' 삭제</button>';
    return '<div class="mem-row"><div class="mem-id"><b>'+esc(m.name||'')+'</b><span>@'+esc(m.username)+'</span></div>'+
      '<span class="mem-status '+(m.status==='approved'?'ok':'pend')+'">'+(m.status==='approved'?(m.master?'마스터':'승인됨'):'승인 대기')+'</span>'+
      '<div class="mem-tools">'+tools+'</div></div>';
  }
  var typesHtml='';
  Object.keys(memberTypes).forEach(function(tn){
    var tabs=memberTypes[tn]||[];
    typesHtml+='<div class="mtype-row"><div class="mtype-h"><input class="mtype-name" data-type-rename="'+esc(tn)+'" value="'+esc(tn)+'" maxlength="20" title="유형 이름 — 수정 후 칸 밖을 클릭하면 적용(회원 일괄 이전)"><button class="btn xs ghost danger" data-type-del="'+esc(tn)+'">삭제</button></div><div class="mtype-tabs">'+
      TAB_LABELS.map(function(p){ return '<label class="mtype-tab"><input type="checkbox" data-type-tab="'+esc(tn)+'" data-tab="'+p[0]+'"'+(tabs.indexOf(p[0])>=0?' checked':'')+'> '+esc(p[1])+'</label>'; }).join('')+'</div></div>';
  });
  b.innerHTML=
    '<div class="mem-sec"><h4>회원 유형 · 접근 탭</h4>'+typesHtml+
      '<div class="mtype-add"><input id="newtype-name" placeholder="새 유형 이름" maxlength="20"><button class="btn xs solid" id="newtype-add">+ 유형 추가</button></div>'+
      '<p class="news-empty" style="text-align:left;margin:6px 2px 0;line-height:1.6">유형마다 접근할 탭을 체크하세요. 변경은 즉시 저장되고, 회원은 <b>다시 로그인</b>하면 적용됩니다.</p></div>'+
    '<div class="mem-sec"><h4>승인 대기 ('+pend.length+')</h4>'+(pend.length?pend.map(row).join(''):'<div class="news-empty">대기 중인 신청이 없습니다.</div>')+'</div>'+
    '<div class="mem-sec"><h4>승인된 회원 ('+appr.length+')</h4>'+(appr.length?appr.map(row).join(''):'<div class="news-empty">아직 없습니다.</div>')+'</div>';
  var na=document.getElementById('newtype-add'); if(na) na.onclick=function(){ var nm=(document.getElementById('newtype-name').value||'').trim(); if(!nm){ toast('유형 이름 입력'); return; } if(memberTypes[nm]){ toast('이미 있는 유형'); return; } memberTypes[nm]=['dashboard','news','calendar','list','timetable']; saveMemberTypes(true); };
}
function patchMember(username, action, val){
  var body={username:username, action:action};
  if(action==='reset'&&val) body.password=val;
  if(action==='type'&&val) body.type=val;
  if(action==='master') body.master=(val===true||val==='1');
  return fetch('/api/jp-members',{method:'PATCH',headers:authJsonHeaders(),body:JSON.stringify(body)})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); });
}
function approveMember(u){ patchMember(u,'approve').then(function(j){ if(j&&j.ok){ toast('승인했습니다'); openMembers(); } }); }
function rejectMember(u){ if(!confirm('@'+u+' 계정을 삭제할까요?')) return; patchMember(u,'reject').then(function(j){ if(j&&j.ok){ toast('삭제했습니다'); openMembers(); } }); }
function resetMemberPw(u){ var p=prompt('@'+u+' 의 새 비밀번호 (4자 이상)'); if(!p) return; if(p.length<4){ toast('4자 이상'); return; } patchMember(u,'reset',p).then(function(j){ if(j&&j.ok) toast('비밀번호를 초기화했습니다'); }); }
function setMemberType(u,t){ patchMember(u,'type',t).then(function(j){ if(j&&j.ok){ toast('@'+u+' 유형: '+t); var m=membersList.filter(function(x){return x.username===u;})[0]; if(m) m.type=t; } }); }
function setMemberMaster(u,on){
  if(on && !confirm('@'+u+' 을(를) 마스터로 지정할까요?\n마스터는 관리자와 동일한 권한(회원 승인·삭제·전체 관리)을 갖습니다.')) return;
  patchMember(u,'master',on).then(function(j){ if(j&&j.ok){ toast(on?('@'+u+' 마스터 지정됨 — 재로그인 후 적용'):('@'+u+' 마스터 해제됨')); var m=membersList.filter(function(x){return x.username===u;})[0]; if(m) m.master=on; renderMembers(); } else toast('변경 실패'); });
}

/* ===== weather (Open-Meteo · 강원 고성 토성면 잼버리로 244 인근) ===== */
var WX_LAT=38.286, WX_LON=128.520;
var wxData=null, wxLoadedAt=0, wxLoading=false;
var WMO={0:['☀️','맑음'],1:['🌤️','대체로 맑음'],2:['⛅','구름 조금'],3:['☁️','흐림'],
  45:['🌫️','안개'],48:['🌫️','상고대 안개'],51:['🌦️','약한 이슬비'],53:['🌦️','이슬비'],55:['🌦️','강한 이슬비'],
  56:['🌧️','어는 이슬비'],57:['🌧️','어는 이슬비'],61:['🌧️','약한 비'],63:['🌧️','비'],65:['🌧️','강한 비'],
  66:['🌧️','어는 비'],67:['🌧️','어는 비'],71:['🌨️','약한 눈'],73:['🌨️','눈'],75:['❄️','강한 눈'],77:['🌨️','싸락눈'],
  80:['🌦️','소나기'],81:['🌦️','소나기'],82:['⛈️','강한 소나기'],85:['🌨️','소낙눈'],86:['🌨️','강한 소낙눈'],
  95:['⛈️','뇌우'],96:['⛈️','우박 동반 뇌우'],99:['⛈️','강한 뇌우']};
function wxInfo(c){ return WMO[c]||['🌡️','—']; }
function wxDayLabel(i){ return i===0?'오늘':i===1?'내일':i===2?'모레':''; }
function loadWeather(force){
  if(!force && wxData && (Date.now()-wxLoadedAt < 1800000)){ renderWeather(); return; }
  if(wxLoading) return;
  wxLoading=true; renderWeather();
  var url='https://api.open-meteo.com/v1/forecast?latitude='+WX_LAT+'&longitude='+WX_LON+
    '&timezone=Asia%2FSeoul&current=temperature_2m,weather_code,apparent_temperature,relative_humidity_2m,wind_speed_10m'+
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'+
    '&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=3';
  fetch(url).then(function(r){return r.json();}).then(function(j){ wxData=j; wxLoadedAt=Date.now(); wxLoading=false; renderWeather(); })
  .catch(function(){ wxLoading=false; var el=document.getElementById('wx-head'); if(el){ el.innerHTML='<span class="wxc-load">날씨 불러오기 실패 · <button class="btn xs" id="wx-retry">다시 시도</button></span>'; var b=document.getElementById('wx-retry'); if(b) b.onclick=function(){ loadWeather(true); }; } });
}
// 헤더 컴팩트 날씨 — 회기(행사기간)와 D-day 사이 한 줄. 클릭하면 상세 모달(현재+시간별). 현재 + 오늘 최고/최저 + 강수확률.
function renderWeather(){
  var el=document.getElementById('wx-head'); if(!el) return;
  if(!wxData){ el.innerHTML=wxLoading?'<span class="wxc-load">날씨 불러오는 중…</span>':''; el.classList.remove('clickable'); return; }
  var cur=wxData.current||{}, d=wxData.daily||{}, ci=wxInfo(cur.weather_code);
  var hi=(d.temperature_2m_max||[])[0], lo=(d.temperature_2m_min||[])[0], pop=(d.precipitation_probability_max||[])[0];
  el.classList.add('clickable'); el.setAttribute('role','button'); el.setAttribute('tabindex','0'); el.title='자세한 날씨 보기';
  el.innerHTML='<span class="wxc-ic">'+ci[0]+'</span>'+
    '<b class="wxc-t">'+(cur.temperature_2m!=null?Math.round(cur.temperature_2m)+'°':'—')+'</b>'+
    '<span class="wxc-d">'+ci[1]+'</span>'+
    (hi!=null?('<span class="wxc-hl">↑'+Math.round(hi)+'° ↓'+Math.round(lo)+'°</span>'):'')+
    (pop!=null?('<span class="wxc-pop">💧'+pop+'%</span>'):'')+
    '<span class="wxc-loc">강원 고성</span>';
}
function fmtHm(iso){ try{ var d=new Date(iso); return pad2(d.getHours())+':'+pad2(d.getMinutes()); }catch(e){ return '—'; } }
// 날씨 상세 모달 — 현재(최고/최저·강수·일출·일몰) + 시간별(날씨·온도·강수)
function openWeatherModal(){
  if(!wxData){ loadWeather(true); return; }
  var sc=document.getElementById('wx-scrim'); if(!sc) return;
  renderWeatherModal();
  sc.classList.add('show');
}
function closeWeatherModal(){ var sc=document.getElementById('wx-scrim'); if(sc) sc.classList.remove('show'); }
function renderWeatherModal(){
  var body=document.getElementById('wx-modal-body'); if(!body||!wxData) return;
  var cur=wxData.current||{}, d=wxData.daily||{}, ci=wxInfo(cur.weather_code);
  var hi=(d.temperature_2m_max||[])[0], lo=(d.temperature_2m_min||[])[0], pop=(d.precipitation_probability_max||[])[0];
  var sr=(d.sunrise||[])[0], ss=(d.sunset||[])[0];
  var html='<div class="wxm-now"><span class="wxm-ic">'+ci[0]+'</span>'+
    '<div class="wxm-nt"><div class="wxm-temp">'+(cur.temperature_2m!=null?Math.round(cur.temperature_2m)+'°':'—')+'</div>'+
      '<div class="wxm-desc">'+ci[1]+(cur.apparent_temperature!=null?(' · 체감 '+Math.round(cur.apparent_temperature)+'°'):'')+'</div></div>'+
    '<div class="wxm-loc">강원 고성<br><span>실시간 · Open-Meteo</span></div></div>';
  html+='<div class="wxm-grid">'+
    '<div class="wxm-cell"><span class="wxm-l">최고</span><b>'+(hi!=null?Math.round(hi)+'°':'—')+'</b></div>'+
    '<div class="wxm-cell"><span class="wxm-l">최저</span><b>'+(lo!=null?Math.round(lo)+'°':'—')+'</b></div>'+
    '<div class="wxm-cell"><span class="wxm-l">강수확률</span><b>'+(pop!=null?pop+'%':'—')+'</b></div>'+
    '<div class="wxm-cell"><span class="wxm-l">일출</span><b>'+(sr?fmtHm(sr):'—')+'</b></div>'+
    '<div class="wxm-cell"><span class="wxm-l">일몰</span><b>'+(ss?fmtHm(ss):'—')+'</b></div>'+
    '<div class="wxm-cell"><span class="wxm-l">습도</span><b>'+(cur.relative_humidity_2m!=null?Math.round(cur.relative_humidity_2m)+'%':'—')+'</b></div>'+
  '</div>';
  var H=wxData.hourly||{}, ht=H.time||[], nowMs=Date.now(), startIdx=0;
  for(var j=0;j<ht.length;j++){ if(new Date(ht[j]).getTime() >= nowMs-1800000){ startIdx=j; break; } }
  var hours='';
  for(var k=startIdx;k<ht.length && k<startIdx+24;k++){
    var hi2=wxInfo((H.weather_code||[])[k]); var hh=new Date(ht[k]).getHours();
    var pp=(H.precipitation_probability||[])[k];
    hours+='<div class="wxm-h'+(k===startIdx?' now':'')+'"><div class="wxm-ht">'+(k===startIdx?'지금':(hh+'시'))+'</div>'+
      '<div class="wxm-hic">'+hi2[0]+'</div><div class="wxm-hdeg">'+Math.round((H.temperature_2m||[])[k])+'°</div>'+
      '<div class="wxm-hpop">💧'+(pp!=null?pp:0)+'%</div></div>';
  }
  html+='<div class="wxm-hours-lab">시간별 예보 · 지금부터 24시간</div><div class="wxm-hours">'+hours+'</div>';
  body.innerHTML=html;
}

/* ===== dashboard ===== */
function renderDashboard(){
  loadWeather();
  var box=document.getElementById('dash-stats'); if(!box) return;
  // 대시보드 위젯용 지연 로드(탭 방문 전이라도 채움)
  if(Auth.authed()){ if(Auth.isStaff() && !tipLoaded) loadTips(); if(!newsLoaded) loadNews(); if(!libLoaded) loadLibrary(); }
  if(Auth.isAdmin() && dashMembersPending===null) loadDashMembers();
  var today=todayISO(), isJamboree=(today>='2026-08-02' && today<='2026-08-09');
  var total=0, planned=0, draft=0, ready=0, meetings=0, upcoming=[];
  var posted=0, titled=0, byCh={}, byOwner={}, dueSoon=[];
  var tPlanned=0, tDraft=0, tReady=0;   // 실제(제목 있는) 콘텐츠만 — 파이프라인용
  var approvalReq=0, overdue=0, weekLeft=0;
  // 콘텐츠 owner ↔ 팀 매칭용 이름 집합
  var teamNameSet={lead:{},t1:{},t2:{}}, teamTT={lead:0,t1:0,t2:0}, teamContent={lead:0,t1:0,t2:0};
  rosterList().forEach(function(m){ var nm=(m.name||'').trim(); if(nm) teamNameSet[teamOf(m)][nm]=1; });
  function teamForOwner(name){ name=(name||'').trim(); if(!name) return null; if(teamNameSet.lead[name])return 'lead'; if(teamNameSet.t1[name])return 't1'; if(teamNameSet.t2[name])return 't2'; return null; }
  DAYS.forEach(function(d){
    daySlots(d).forEach(function(s){
      var e=peek(s.k), st=e.status||'planned';
      if(isMeeting(e)){ meetings++; }
      else {
        total++; if(st==='ready')ready++; else if(st==='draft')draft++; else planned++;
        if(e.approval && e.approval.state==='requested') approvalReq++;
        if(e.title){
          titled++; if(e.posted) posted++;
          if(st==='ready')tReady++; else if(st==='draft')tDraft++; else tPlanned++;
          (e.channels||[]).forEach(function(c){ if(!byCh[c])byCh[c]={t:0,p:0}; byCh[c].t++; if(e.posted)byCh[c].p++; });
          var ow=(e.owner||'').trim()||'(미지정)'; byOwner[ow]=(byOwner[ow]||0)+1;
          var tm=teamForOwner(e.owner); if(tm) teamContent[tm]++;
          var dl=dayDiff(d.date, today);
          if(!e.posted && dl>=0 && dl<=3) dueSoon.push({d:d,s:s,e:e,dl:dl});
          if(!e.posted && dl>=0 && dl<=7) weekLeft++;
          if(!e.posted && e.due && e.due<today) overdue++;
        }
      }
      if(e.title && d.date>=today){ upcoming.push({d:d,s:s,e:e}); }
    });
  });
  dueSoon.sort(function(a,b){ return a.dl-b.dl; });
  upcoming.sort(function(a,b){ return a.d.date<b.d.date?-1:a.d.date>b.d.date?1:0; });
  var pct= total? Math.round(ready/total*100):0;
  var evs=eventList().filter(function(ev){ return ev.title && (ev.end||ev.start||'')>=today; }).sort(function(a,b){ return (a.start||'')<(b.start||'')?-1:1; });
  var rosterN=rosterList().filter(function(r){ return (r.name||'').trim()||(r.role||'').trim(); }).length;
  var ttN=ttList().length;
  var conN=contactList().filter(function(c){ return (c.name||'').trim(); }).length;
  var dd=dayDiff(EVENT_DAY, today);
  // 팀별 시간 일정(assignees 기준)
  ttList().forEach(function(t){ (t.assignees||[]).forEach(function(pid){ var m=rosterById(pid); if(m) teamTT[teamOf(m)]++; }); });
  // 소식 제보 · 기사 · D-count 파생
  var tipsNew = tipLoaded ? tipItems.filter(function(t){ return t.status==='new'; }).length : 0;
  var tipsUnassigned = tipLoaded ? tipItems.filter(function(t){ return t.status==='new' && !t.assignee; }).length : 0;
  var newsComments = newsLoaded ? newsItems.reduce(function(a,x){ return a+((x.comments||[]).length); },0) : 0;
  var dcApproved = dcountApproved.length;
  var dcWeek = dcountApproved.filter(function(a){ var dl=dayDiff(a.targetDate, today); return dl>=0 && dl<=7; }).length;
  var staff=Auth.isStaff(), admin=Auth.isAdmin();

  function statCard(label, big, sub, color){
    return '<div class="statcard"><div class="sc-lab">'+label+'</div><div class="sc-big" style="color:'+(color||'var(--ink)')+'">'+big+'</div><div class="sc-sub">'+(sub||'')+'</div></div>';
  }
  var html='';

  // ===== B. 실시간 D-day 배너 =====
  html+='<div class="dash-dday"><div class="dd-left"><span class="dd-lab">개영식까지</span><span class="dd-big" id="dash-dday-t">'+ddayCountdownHTML()+'</span></div>'+
    '<div class="dd-right"><span class="dd-note">이번 주 남은 콘텐츠 <b>'+weekLeft+'건</b>'+(overdue?(' · <span class="dd-over">마감 지남 '+overdue+'건</span>'):'')+'</span><span class="dd-sub">2026-08-05(수) 20:00 · 강원 고성</span></div></div>';

  // ===== A. 지금 처리할 일 (액션 큐) =====
  var acts=[];
  if(staff && approvalReq) acts.push({n:approvalReq, lab:'검수·승인 대기 콘텐츠', go:'list', c:'#C0492F'});
  if(overdue) acts.push({n:overdue, lab:'마감 지난 미게시 콘텐츠', go:'list', c:'var(--danger)'});
  if(staff && tipsNew) acts.push({n:tipsNew, lab:'미처리 소식 제보'+(tipsUnassigned?(' (미배정 '+tipsUnassigned+')'):''), go:'tips', c:'var(--st-planned)'});
  if(staff && newsComments) acts.push({n:newsComments, lab:'기사 검수 의견', go:'news', c:'var(--c-intl)'});
  if(admin && dashMembersPending) acts.push({n:dashMembersPending, lab:'회원가입 승인 대기', go:'members', c:'var(--accent)'});
  html+='<div class="dashpanel actq"><div class="dp-h">지금 처리할 일</div>';
  if(!acts.length){ html+='<div class="dp-empty ok">밀린 일이 없습니다. 모두 처리됨 ✓</div>'; }
  else { html+='<div class="actq-list">'+acts.map(function(a){ return '<button class="actq-item" '+(a.go==='members'?'data-open-members="1"':('data-goto="'+a.go+'"'))+'><span class="actq-n" style="background:'+a.c+'">'+a.n+'</span><span class="actq-lab">'+a.lab+'</span><span class="actq-arw">→</span></button>'; }).join('')+'</div>'; }
  html+='</div>';

  // ===== 통계 카드 (업무 지표 — D-day 는 위 배너와 중복이라 뺐고, 참고성 인원·연락처도 뺌) =====
  html+='<div class="dashgrid">';
  html+=statCard('콘텐츠 진행', ready+' / '+total, '완료 '+pct+'% · 작성중 '+draft+' · 기획 '+planned, 'var(--st-ready)');
  html+=statCard('게시 완료', posted+' / '+titled, titled?(Math.round(posted/titled*100)+'% 게시'):'게시할 콘텐츠 없음', 'var(--c-intl)');
  html+=statCard('운영 일정', evs.length+'건', '다가오는 회의 · 공모전 · 행사', 'var(--c-intl)');
  html+=statCard('시간 일정', ttN+'건', '잼버리 일정표 (8/2~8/9)', 'var(--accent)');
  html+=statCard('디데이 신청', dcApproved+'건', dcWeek?('이번 주 확정 '+dcWeek+'건'):'승인 확정 카드', 'var(--c-sub)');
  html+='</div>';

  // ===== E. 콘텐츠 파이프라인 (제목 있는 실제 콘텐츠 기준) =====
  var readyUnposted=Math.max(0, tReady-posted);
  var pipe=[['기획',tPlanned,'var(--st-planned)'],['작성중',tDraft,'var(--st-draft)'],['완료·미게시',readyUnposted,'var(--st-ready)'],['게시완료',posted,'var(--c-intl)']];
  var pipeSum=pipe.reduce(function(a,x){return a+x[1];},0)||1;
  html+='<div class="dashpanel"><div class="dp-h">콘텐츠 파이프라인 <span class="dp-hsub">'+titled+'건</span></div>';
  html+='<div class="pipebar">'+pipe.map(function(p){ var w=Math.round(p[1]/pipeSum*100); return p[1]?'<div class="pipeseg" style="width:'+w+'%;background:'+p[2]+'" title="'+p[0]+' '+p[1]+'건"></div>':''; }).join('')+'</div>';
  html+='<div class="pipelegend">'+pipe.map(function(p){ return '<span><i style="background:'+p[2]+'"></i>'+p[0]+' <b>'+p[1]+'</b></span>'; }).join('')+'</div></div>';

  // ===== 다가오는 콘텐츠 / 운영 일정 =====
  html+='<div class="dashcols">';
  html+='<div class="dashpanel"><div class="dp-h">다가오는 콘텐츠</div>';
  if(!upcoming.length){ html+='<div class="dp-empty">예정된(제목 입력된) 콘텐츠가 없습니다.</div>'; }
  else { html+='<div class="dp-list">'; upcoming.slice(0,7).forEach(function(it){
    html+='<button class="dp-item" data-date="'+it.d.date+'" data-sk="'+esc(it.s.k)+'">'+
      '<span class="dp-d">'+it.d.label+' '+it.d.weekday+'</span>'+
      '<span class="dp-t">'+(it.e.ctype?ctchip(it.e.ctype)+' ':'')+esc(it.e.title)+'</span>'+
      '<span class="dp-st" style="background:'+STCHIP[it.e.status||'planned'][0]+';color:'+STCHIP[it.e.status||'planned'][1]+'">'+STATUS_LABEL[it.e.status||'planned']+'</span></button>';
  }); html+='</div>'; }
  html+='</div>';
  html+='<div class="dashpanel"><div class="dp-h">다가오는 운영 일정</div>';
  if(!evs.length){ html+='<div class="dp-empty">예정된 운영 일정이 없습니다.</div>'; }
  else { html+='<div class="dp-list">'; evs.slice(0,7).forEach(function(ev){
    var ek=(eventColor?eventColor(ev.kind):'#7A6A57');
    html+='<button class="dp-item" data-eid="'+esc(ev.id)+'">'+
      '<span class="dp-d">'+(ev.start||'').slice(5)+(ev.end&&ev.end!==ev.start?('~'+ev.end.slice(5)):'')+'</span>'+
      '<span class="dp-t"><span class="dp-kind" style="background:'+ek+'">'+esc(ev.kind||'')+'</span> '+esc(ev.title)+'</span></button>';
  }); html+='</div>'; }
  html+='</div></div>';

  // ===== C. 오늘의 현장 / G. 팀별 워크로드 =====
  html+='<div class="dashcols">';
  var todayTT=ttList().filter(function(t){ return t.day===today; }).slice().sort(function(a,b){ return (a.start||'')<(b.start||'')?-1:1; });
  var openShoots=shootList().filter(function(s){ return s.status!=='done'; });
  var placedNow=rosterList().filter(function(m){ return mapZoneOf(m.id); }).length;
  html+='<div class="dashpanel"><div class="dp-h">오늘의 현장 <span class="dp-hsub">'+(isJamboree?('오늘 '+today.slice(5)):'잼버리 기간(8/2~8/9)')+'</span></div>';
  html+='<div class="fieldrow"><button class="fieldstat" data-goto="timetable"><b>'+todayTT.length+'</b><span>오늘 시간 일정</span></button>'+
    '<button class="fieldstat" data-goto="sitemap"><b>'+placedNow+'</b><span>현장 배치 인원</span></button>'+
    '<button class="fieldstat" data-goto="sitemap"><b>'+openShoots.length+'</b><span>미완료 촬영 요청</span></button></div>';
  if(todayTT.length){ html+='<div class="dp-list">'+todayTT.slice(0,5).map(function(t){ return '<button class="dp-item" data-ttid="'+esc(t.id)+'"><span class="dp-d">'+esc(t.start||'')+(t.end?('~'+t.end):'')+'</span><span class="dp-t">'+esc(t.title||'(제목 없음)')+(t.place?(' <span class="dp-place">· '+esc(t.place)+'</span>'):'')+'</span></button>'; }).join('')+'</div>'; }
  else { html+='<div class="dp-empty">오늘 등록된 시간 일정이 없습니다.</div>'; }
  html+='</div>';
  // 팀별 워크로드
  html+='<div class="dashpanel"><div class="dp-h">팀별 워크로드</div><div class="teamload">';
  TEAM_ORDER.forEach(function(tk){
    var members=rosterList().filter(function(m){ return teamOf(m)===tk && ((m.name||'').trim()||(m.role||'').trim()); });
    var badge=tk==='lead'?'<span class="tl-badge lead">홍보부장</span>':'<span class="tl-badge '+tk+'">'+esc(teamNames()[tk])+'</span>';
    html+='<div class="tl-row">'+badge+'<span class="tl-people">'+members.length+'명</span>'+
      '<span class="tl-stat">콘텐츠 <b>'+teamContent[tk]+'</b></span><span class="tl-stat">현장 <b>'+teamTT[tk]+'</b></span></div>';
  });
  html+='</div><div class="dp-hint">콘텐츠=담당자(이름) 매칭 · 현장=잼버리 일정표 담당 배정 기준</div></div>';
  html+='</div>';

  // ===== 게시 현황 · 통계 =====
  var owners=Object.keys(byOwner).sort(function(a,b){return byOwner[b]-byOwner[a];});
  html+='<div class="dashpanel"><div class="dp-h">게시 현황 · 통계</div><div class="pubgrid">';
  html+='<div class="pubcol"><div class="pubcol-h">채널별 (게시/전체)</div>'+CHANNELS.map(function(c){ var x=byCh[c]||{t:0,p:0}; return '<div class="pubrow"><span>'+esc(c)+'</span><b>'+x.p+' / '+x.t+'</b></div>'; }).join('')+'</div>';
  html+='<div class="pubcol"><div class="pubcol-h">담당자별 콘텐츠</div>'+(owners.length?owners.slice(0,8).map(function(o){ return '<div class="pubrow"><span>'+esc(o)+'</span><b>'+byOwner[o]+'건</b></div>'; }).join(''):'<div class="dp-empty">담당자 지정된 콘텐츠 없음</div>')+'</div>';
  html+='<div class="pubcol"><div class="pubcol-h">마감 임박 · 미게시 (3일 내)</div>'+(dueSoon.length?dueSoon.slice(0,8).map(function(it){ return '<button class="pubrow due" data-date="'+it.d.date+'" data-sk="'+esc(it.s.k)+'"><span>'+it.d.label+' '+(it.dl===0?'오늘':('D-'+it.dl))+'</span><b>'+esc(it.e.title)+'</b></button>'; }).join(''):'<div class="dp-empty">임박한 미게시 콘텐츠 없음</div>')+'</div>';
  html+='</div></div>';

  // ===== F. 최근 자료실 / 최근 기사 =====
  html+='<div class="dashcols">';
  html+='<div class="dashpanel"><div class="dp-h">최근 자료실 <span class="dp-hsub">'+(libLoaded?libItems.length:'…')+'</span></div>';
  if(libLoaded && libItems.length){ html+='<div class="recentlib">'+libItems.slice(0,4).map(function(a){ var img=isImageAsset(a); return '<a class="rlib" href="'+esc(a.url)+'" target="_blank" rel="noopener">'+(img?'<span class="rlib-img" style="background-image:url('+esc(a.url)+')"></span>':'<span class="rlib-doc">'+icon('fileText',22)+'</span>')+'<span class="rlib-n">'+esc(a.name||'(이름 없음)')+'</span></a>'; }).join('')+'</div>'; }
  else { html+='<div class="dp-empty">'+(libLoaded?'올라온 자료가 없습니다.':'불러오는 중…')+'</div>'; }
  html+='<button class="dp-more" data-goto="library">자료실 전체 보기 →</button></div>';
  html+='<div class="dashpanel"><div class="dp-h">최근 기사 <span class="dp-hsub">'+(newsLoaded?newsItems.length:'…')+'</span></div>';
  if(newsLoaded && newsItems.length){ html+='<div class="dp-list">'+newsItems.slice(0,5).map(function(a){ return '<button class="dp-item" data-goto="news"><span class="dp-t">'+esc(a.title||'(제목 없음)')+'</span><span class="dp-d">'+esc((a.authorName||'')+(a.comments&&a.comments.length?(' · 검수 '+a.comments.length):''))+'</span></button>'; }).join('')+'</div>'; }
  else { html+='<div class="dp-empty">'+(newsLoaded?'올라온 기사가 없습니다.':'불러오는 중…')+'</div>'; }
  html+='<button class="dp-more" data-goto="news">기사 전체 보기 →</button></div>';
  html+='</div>';

  // ===== D. 디데이 프로젝트 요약 =====
  html+='<div class="dashpanel dcsum"><div class="dp-h">디데이 프로젝트 (D-count)</div>'+
    '<div class="dcsum-row"><span class="dcsum-stat"><b>'+dcApproved+'</b> 승인 확정</span><span class="dcsum-stat"><b>'+dcWeek+'</b> 이번 주 디데이</span>'+
    '<a class="dp-more" href="/krjam-dcount" target="_blank" rel="noopener">디데이 프로젝트 열기 →</a></div>';
  if(dcApproved){ var dcSorted=dcountApproved.slice().sort(function(a,b){ return dayDiff(a.targetDate,today)-dayDiff(b.targetDate,today); }); html+='<div class="dp-list">'+dcSorted.slice(0,5).map(function(a){ return '<a class="dp-item" href="/krjam-dcount" target="_blank" rel="noopener"><span class="dp-d">D-'+a.dNumber+' · '+esc(a.targetDate.slice(5))+'</span><span class="dp-t">'+esc(a.name||'')+(a.org?(' <span class="dp-place">· '+esc(a.org)+'</span>'):'')+'</span></a>'; }).join('')+'</div>'; }
  html+='</div>';

  box.innerHTML=html;
  startDashClock();
  box.querySelectorAll('.dp-item[data-sk],.pubrow[data-sk]').forEach(function(b){ b.onclick=function(){ var date=b.getAttribute('data-date'); var rec=byDate[date]; var s=rec?findSlot(rec, b.getAttribute('data-sk')):null; if(s) openSlot(date,s); }; });
  box.querySelectorAll('.dp-item[data-eid]').forEach(function(b){ b.onclick=function(){ openEvent(b.getAttribute('data-eid')); }; });
  box.querySelectorAll('.dp-item[data-ttid]').forEach(function(b){ b.onclick=function(){ openTT(b.getAttribute('data-ttid')); }; });
  box.querySelectorAll('[data-goto]').forEach(function(b){ b.onclick=function(){ setView(b.getAttribute('data-goto')); }; });
  box.querySelectorAll('[data-open-members]').forEach(function(b){ b.onclick=function(){ openMembers(); }; });
}

/* ===== wire up ===== */
/* ===== view tabs ===== */
var curViewMode='calendar';
function setView(v){
  if(!Auth.canSee(v)) v='dashboard';   // 관리 탭은 홍보부 유형/관리자만
  curViewMode=v;
  if(v!=='dashboard') stopDashClock();
  var db=document.getElementById('dashboard'); if(db) db.style.display = v==='dashboard'?'':'none';
  var nw=document.getElementById('news'); if(nw) nw.style.display = v==='news'?'':'none';
  document.getElementById('calendar').style.display  = v==='calendar'?'':'none';
  document.getElementById('content').style.display   = v==='list'?'':'none';
  document.getElementById('timetable').style.display = v==='timetable'?'':'none';
  document.getElementById('staff').style.display     = v==='staff'?'':'none';
  var cn=document.getElementById('contacts'); if(cn) cn.style.display = v==='contacts'?'':'none';
  var oi=document.getElementById('orginfo'); if(oi) oi.style.display = v==='orginfo'?'':'none';
  var pr=document.getElementById('protocol'); if(pr) pr.style.display = v==='protocol'?'':'none';
  var lib=document.getElementById('library'); if(lib) lib.style.display = v==='library'?'':'none';
  var tps=document.getElementById('tips'); if(tps) tps.style.display = v==='tips'?'':'none';
  var smv=document.getElementById('sitemap'); if(smv) smv.style.display = v==='sitemap'?'':'none';
  var mlv=document.getElementById('meals'); if(mlv) mlv.style.display = v==='meals'?'':'none';
  // 마케팅 캘린더는 캘린더/리스트 뷰에서만 노출
  var mk=document.getElementById('marketing'); if(mk) mk.style.display=(v==='calendar'||v==='list')?'':'none';
  wsLastView[wsOfView(v)]=v;
  renderNav();      // 공간·세부 활성/가시성
  renderBotNav();   // 하단 탭 활성 상태도 같은 시점에 갱신
  try{localStorage.setItem('jamboree-plan:view',v);}catch(e){}
  if(v==='dashboard') renderDashboard();
  if(v==='news') renderNews();
  if(v==='library'){ if(!libLoaded) loadLibrary(); else renderLibrary(); }
  if(v==='tips'){ if(!tipLoaded) loadTips(); else renderTips(); }
  if(v==='list') renderBoard();
  if(v==='timetable') renderTimetable();
  if(v==='staff') renderStaff();
  if(v==='contacts') renderContacts();
  if(v==='orginfo') renderDivisions();
  if(v==='protocol') renderProtocol();
  if(v==='sitemap') renderSiteMap();
  if(v==='meals') renderMeals();
}

// 공유 보드 로드 — 서버 GET 이 이제 로그인(회원 세션)을 요구하므로 로그인 후에만 부른다
function loadBoard(){
  fetch('/api/jamboree-plan',{headers:authHeader()}).then(function(r){ if(r.status===401){ authExpired(); throw new Error('401'); } return r.json(); }).then(function(j){
    applyServer(j); mergeSeedMeetings(); mergeCubObservers(); upgradeProtocol(); upgradeMeals(); saveLocal(); renderAll();
    setSt('자동 저장 · 서버 동기화됨',true);
  }).catch(function(){ setSt('로컬 편집 중 (서버 연결 안 됨)'); });
}
function init(){
  wireAuthGate();
  if(Auth.authed()) loadNews();
  loadLocal();
  mergeSeedMeetings();   // 잼버리 기간 회의를 운영 일정에 보장
  // 정적 라인 아이콘 주입
  document.querySelectorAll('[data-ic]').forEach(function(el){ el.innerHTML=icon(el.getAttribute('data-ic'), +(el.getAttribute('data-ic-size')||16)); });
  renderAll();
  setInterval(renderClock,1000);
  // 디데이 프로젝트(krjam-dcount) 승인 카드 → 캘린더 자동 연동
  fetch('/api/krjam-dcount').then(function(r){return r.json();}).then(function(j){ dcountApproved=(j&&j.approved)||[]; renderCalendar(); }).catch(function(){});
  // try server (shared board) — MERGE into local (never wipes local-only content)
  if(Auth.authed()) loadBoard();

  document.getElementById('reload').onclick=reloadServer;
  document.getElementById('export').onclick=exportJSON;
  // 헤더 날씨 클릭 → 상세 모달
  var wxh=document.getElementById('wx-head');
  if(wxh){ wxh.addEventListener('click',function(){ if(wxData) openWeatherModal(); });
    wxh.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&wxData){ e.preventDefault(); openWeatherModal(); } }); }
  var wxc=document.getElementById('wx-modal-close'); if(wxc) wxc.onclick=closeWeatherModal;
  var wxsc=document.getElementById('wx-scrim'); if(wxsc) wxsc.addEventListener('click',function(e){ if(e.target===this) closeWeatherModal(); });
  var cs=document.getElementById('cal-search');
  if(cs) cs.addEventListener('input',function(){ var v=this.value; if(searchTimer)clearTimeout(searchTimer); searchTimer=setTimeout(function(){ searchQ=v; renderCalendar(); renderBoard(); },120); });
  // 운영 일정(events) 모달
  var ae=document.getElementById('add-event'); if(ae) ae.onclick=function(){ openEvent(null); };
  document.getElementById('ev-close').onclick=closeEvent;
  document.getElementById('ev-cancel').onclick=closeEvent;
  document.getElementById('ev-save').onclick=commitEvent;
  document.getElementById('ev-del').onclick=deleteEventCur;
  document.getElementById('ev-scrim').addEventListener('click',function(e){ if(e.target===this) closeEvent(); });
  // 2단 내비게이션: 공간(wstab) → 세부(vtab)
  document.querySelectorAll('.wstab[data-ws]').forEach(function(b){ b.onclick=function(){ setWorkspace(b.getAttribute('data-ws')); window.scrollTo({top:0,behavior:'smooth'}); }; });
  document.querySelectorAll('.vtab[data-v]').forEach(function(b){ b.onclick=function(){ setView(b.dataset.v); }; });
  // 모바일 하단 탭 = 업무 공간
  var bn=document.getElementById('botnav');
  if(bn) bn.addEventListener('click',function(e){ var b=e.target.closest('[data-bnws]'); if(!b) return;
    setWorkspace(b.getAttribute('data-bnws')); window.scrollTo({top:0,behavior:'smooth'}); });
  var savedView=null; try{savedView=localStorage.getItem('jamboree-plan:view');}catch(e){}
  setView(['dashboard','news','tips','calendar','list','timetable','library','staff','contacts','orginfo','protocol','sitemap','meals'].indexOf(savedView)>=0?savedView:'dashboard');
  // 인증 · 기사 · 홍보부원 회원 배선
  reflectAuthUI();
  var lo=document.getElementById('logout'); if(lo) lo.onclick=doLogout;
  var na=document.getElementById('news-add'); if(na) na.onclick=function(){ openNewsEditor(null); };
  document.getElementById('news-close').onclick=closeNewsEditor;
  document.getElementById('news-cancel').onclick=closeNewsEditor;
  document.getElementById('news-save').onclick=commitNews;
  document.getElementById('news-scrim').addEventListener('click',function(e){ if(e.target===this) closeNewsEditor(); });
  document.getElementById('members-close').onclick=closeMembers;
  document.getElementById('members-cancel').onclick=closeMembers;
  document.getElementById('members-scrim').addEventListener('click',function(e){ if(e.target===this) closeMembers(); });
  var mb=document.getElementById('members-btn'); if(mb) mb.onclick=openMembers;
  var cpb=document.getElementById('changepw-btn'); if(cpb) cpb.onclick=changeMyPassword;
  startIdleWatch();
  // news 목록 위임 (썸네일 라이트박스 · 수정 · 삭제)
  document.getElementById('news-list').addEventListener('click',function(e){
    var lb=e.target.closest('[data-lb]'); if(lb){ openLightbox(lb.getAttribute('data-lb')); return; }
    var ed=e.target.closest('[data-news-edit]'); if(ed){ openNewsEditor(ed.getAttribute('data-news-edit')); return; }
    var dl=e.target.closest('[data-news-del]'); if(dl){ deleteNews(dl.getAttribute('data-news-del')); return; }
    var tc=e.target.closest('[data-news-tocard]'); if(tc){ articleToCardnews(tc.getAttribute('data-news-tocard')); return; }
    var nc=e.target.closest('[data-news-comments]'); if(nc){ toggleNewsComments(nc.getAttribute('data-news-comments')); return; }
    var as=e.target.closest('[data-ac-send]'); if(as){ addNewsComment(as.getAttribute('data-ac-send')); return; }
    var ad=e.target.closest('[data-ac-del]'); if(ad){ var pr=ad.getAttribute('data-ac-del').split('~'); deleteNewsComment(pr[0],pr[1]); return; }
  });
  document.getElementById('news-list').addEventListener('keydown',function(e){
    if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){ var inp=e.target.closest('[data-ac-input]'); if(inp){ e.preventDefault(); addNewsComment(inp.getAttribute('data-ac-input')); } }
  });
  // 자료실(라이브러리) 배선
  var lfp=document.getElementById('lib-file-plan'); if(lfp) lfp.addEventListener('change',function(){ openLibUpload(this.files,'plan'); this.value=''; });
  var lfm=document.getElementById('lib-file-media'); if(lfm) lfm.addEventListener('change',function(){ openLibUpload(this.files,'media'); this.value=''; });
  var lbx=document.getElementById('lib-close'); if(lbx) lbx.onclick=closeLibUpload;
  var lbc=document.getElementById('lib-cancel'); if(lbc) lbc.onclick=closeLibUpload;
  var lbu=document.getElementById('lib-upload'); if(lbu) lbu.onclick=commitLibUpload;
  var lbs=document.getElementById('lib-scrim');
  if(lbs){ lbs.addEventListener('click',function(e){ if(e.target===lbs) closeLibUpload(); });
    lbs.addEventListener('click',function(e){ var d=e.target.closest('[data-libup-del]'); if(d&&libUp){ captureLibUp(); var di=+d.getAttribute('data-libup-del'); libUp.files.splice(di,1); libUp.names.splice(di,1); if(!libUp.files.length){ closeLibUpload(); return; } renderLibUpload(); } });
    // 문서명 입력은 데이터만 갱신(재렌더 없음 — 포커스 유지)
    lbs.addEventListener('input',function(e){ var n=e.target.closest('[data-libup-name]'); if(n&&libUp) libUp.names[+n.getAttribute('data-libup-name')]=n.value; }); }
  var ls=document.getElementById('lib-search'); if(ls) ls.addEventListener('input',function(){ libSearch=this.value; renderLibrary(); });
  var lt=document.getElementById('lib-tags'); if(lt) lt.addEventListener('click',function(e){ var b=e.target.closest('[data-libtag]'); if(b){ libTag=b.getAttribute('data-libtag'); renderLibrary(); } });
  var lc=document.getElementById('lib-cats'); if(lc) lc.addEventListener('click',function(e){ var b=e.target.closest('[data-libcat]'); if(b){ libCat=b.getAttribute('data-libcat'); renderLibrary(); } });
  var lg=document.getElementById('lib-grid');
  if(lg){ lg.addEventListener('click',function(e){
      var d=e.target.closest('[data-lib-del]'); if(d){ e.preventDefault(); e.stopPropagation(); deleteAsset(d.getAttribute('data-lib-del')); return; }
      if(e.target.closest('[data-lib-dl]')) return;            // '받기'는 그대로 다운로드
      var o=e.target.closest('[data-lib-open]'); if(o){ e.preventDefault(); openAsset(o.getAttribute('data-lib-open')); }
    });
    lg.addEventListener('keydown',function(e){
      if(e.key!=='Enter'&&e.key!==' ') return;
      var o=e.target.closest('.libcard[data-lib-open]'); if(o){ e.preventDefault(); openAsset(o.getAttribute('data-lib-open')); }
    });
  }
  // 자료 미리보기 모달
  var ax=document.getElementById('asset-close'); if(ax) ax.onclick=closeAsset;
  var asc=document.getElementById('asset-scrim'); if(asc) asc.addEventListener('click',function(e){ if(e.target===asc) closeAsset(); });
  var aop=document.getElementById('asset-open'); if(aop) aop.onclick=function(){ if(assetCur) window.open(inlineUrl(assetCur.url),'_blank','noopener'); };
  var ad=document.getElementById('asset-del'); if(ad) ad.onclick=function(){ if(assetCur) deleteAsset(assetCur.id); };   // 성공 시 deleteAsset 이 모달을 닫는다
  var aeb=document.getElementById('asset-edit-btn'); if(aeb) aeb.onclick=function(){ openAssetEdit(); };
  // 현장 제보 인박스 배선
  var tipAdd=document.getElementById('tip-add'); if(tipAdd) tipAdd.onclick=openTipEditor;
  var tipClose=document.getElementById('tip-close'); if(tipClose) tipClose.onclick=closeTipEditor;
  var tipCancel=document.getElementById('tip-cancel'); if(tipCancel) tipCancel.onclick=closeTipEditor;
  var tipSave=document.getElementById('tip-save'); if(tipSave) tipSave.onclick=commitTip;
  var tipScrim=document.getElementById('tip-scrim'); if(tipScrim) tipScrim.addEventListener('click',function(e){ if(e.target===this) closeTipEditor(); });
  var tipBody=document.getElementById('tip-body'); if(tipBody) tipBody.addEventListener('click',function(e){ var x=e.target.closest('[data-tip-img-del]'); if(x&&tipEdit){ tipEdit.images.splice(+x.getAttribute('data-tip-img-del'),1); renderTipEditor(); } });
  var mealSeg=document.getElementById('meal-groupseg'); if(mealSeg) mealSeg.addEventListener('click',function(e){ var b=e.target.closest('[data-mg]'); if(!b) return; mealGroup=b.getAttribute('data-mg'); renderMeals(); });
  var tipFil=document.getElementById('tip-filters'); if(tipFil) tipFil.addEventListener('click',function(e){ var b=e.target.closest('[data-tipf]'); if(b){ tipFilter=b.getAttribute('data-tipf'); renderTips(); } });
  var tipGrid=document.getElementById('tip-grid'); if(tipGrid){ tipGrid.addEventListener('click',function(e){
    var lb=e.target.closest('[data-lb]'); if(lb){ openLightbox(lb.getAttribute('data-lb')); return; }
    var s=e.target.closest('[data-tip-status]'); if(s){ var pr=s.getAttribute('data-tip-status').split('~'); triageTip(pr[0],pr[1]); return; }
    var dl=e.target.closest('[data-tip-del]'); if(dl){ deleteTip(dl.getAttribute('data-tip-del')); return; }
    var tn=e.target.closest('[data-tip-tonews]'); if(tn){ tipToNews(tn.getAttribute('data-tip-tonews')); return; }
    var ta=e.target.closest('[data-tip-toassets]'); if(ta){ tipToAssets(ta.getAttribute('data-tip-toassets')); return; }
    var sc=e.target.closest('[data-tip-sched]'); if(sc){ openTipSchedule(sc.getAttribute('data-tip-sched')); return; }
    var us=e.target.closest('[data-tip-unsched]'); if(us){ unscheduleTip(us.getAttribute('data-tip-unsched')); return; }
    var gt=e.target.closest('[data-tip-goto]'); if(gt){ openTipScheduled(gt.getAttribute('data-tip-goto')); return; }
  });
  tipGrid.addEventListener('change',function(e){ var a=e.target.closest('[data-tip-assign]'); if(a){ assignTip(a.getAttribute('data-tip-assign'), a.value); } });
  }
  // 일정 잡기 모달
  var tsx=document.getElementById('tsch-close'); if(tsx) tsx.onclick=closeTipSchedule;
  var tsc=document.getElementById('tsch-cancel'); if(tsc) tsc.onclick=closeTipSchedule;
  var tss=document.getElementById('tsch-save'); if(tss) tss.onclick=commitTipSchedule;
  var tsr=document.getElementById('tsch-scrim');
  if(tsr){ tsr.addEventListener('click',function(e){ if(e.target===tsr) closeTipSchedule(); });
    tsr.addEventListener('click',function(e){
      var p=e.target.closest('[data-tsch-p]');
      if(p&&tschDraft){ var id=p.getAttribute('data-tsch-p'), i=tschDraft.assignees.indexOf(id);
        if(i>=0) tschDraft.assignees.splice(i,1); else tschDraft.assignees.push(id);
        p.classList.toggle('on',i<0); }
    });
    // 날짜를 바꾸면 목적지(일정표/캘린더)가 즉시 바뀌므로 다시 그린다.
    // 재렌더 전에 "모든" 입력을 draft로 회수해야 한다 — 구역·소요를 빼먹어 조용히 초기화되던 버그
    tsr.addEventListener('change',function(e){
      if(e.target.id==='tsch-date'&&tschDraft){
        tschDraft.date=e.target.value;
        tschDraft.hh=Math.max(0,Math.min(23,parseInt(document.getElementById('tsch-hh').value,10)||0));
        tschDraft.mm=Math.max(0,Math.min(59,parseInt(document.getElementById('tsch-mm').value,10)||0));
        tschDraft.title=document.getElementById('tsch-title').value||'';
        var z=document.getElementById('tsch-zone'); if(z) tschDraft.zone=z.value||'';
        var du=document.getElementById('tsch-dur'); if(du) tschDraft.dur=Math.max(15,parseInt(du.value,10)||60);
        renderTipSchedule();
      }
    });
  }
  var jc=document.getElementById('jebo-copy'); if(jc) jc.onclick=function(){ var url=location.origin+'/krjam-jebo'; (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){ toast('제보 페이지 링크 복사됨'); },function(){ window.prompt('제보 페이지 주소', url); }); };
  // news 편집 모달 위임 (사진 삭제)
  document.getElementById('news-body').addEventListener('click',function(e){
    var x=e.target.closest('[data-news-img-del]'); if(x&&newsEdit){ newsEdit.images.splice(+x.getAttribute('data-news-img-del'),1); renderNewsEditor(); }
  });
  // 홍보부원 회원 모달 위임
  document.getElementById('members-body').addEventListener('click',function(e){
    var a=e.target.closest('[data-mem-approve]'); if(a){ approveMember(a.getAttribute('data-mem-approve')); return; }
    var r=e.target.closest('[data-mem-reject]'); if(r){ rejectMember(r.getAttribute('data-mem-reject')); return; }
    var mm=e.target.closest('[data-mem-master]'); if(mm){ setMemberMaster(mm.getAttribute('data-mem-master'), mm.getAttribute('data-val')==='1'); return; }
    var p=e.target.closest('[data-mem-reset]'); if(p){ resetMemberPw(p.getAttribute('data-mem-reset')); return; }
    var td=e.target.closest('[data-type-del]'); if(td){ var dtn=td.getAttribute('data-type-del'); if(confirm('유형 "'+dtn+'" 을 삭제할까요? (이 유형 회원은 다음 로그인 시 일반으로 처리)')){ delete memberTypes[dtn]; saveMemberTypes(true); } return; }
  });
  document.getElementById('members-body').addEventListener('change',function(e){
    var s=e.target.closest('[data-mem-type]'); if(s){ setMemberType(s.getAttribute('data-mem-type'), s.value); return; }
    var rn=e.target.closest('[data-type-rename]'); if(rn){ renameType(rn.getAttribute('data-type-rename'), rn.value); return; }
    var tt=e.target.closest('[data-type-tab]'); if(tt){ var tn=tt.getAttribute('data-type-tab'), tab=tt.getAttribute('data-tab'); var arr=memberTypes[tn]||(memberTypes[tn]=[]); var ix=arr.indexOf(tab); if(tt.checked){ if(ix<0) arr.push(tab); } else if(ix>=0) arr.splice(ix,1); saveMemberTypes(false); return; }
  });
  var dvAdd=document.getElementById('div-add'); if(dvAdd) dvAdd.onclick=addDivision;
  var dvSe=document.getElementById('div-search'); if(dvSe) dvSe.addEventListener('input',function(){ var v=this.value; if(divSearchTimer)clearTimeout(divSearchTimer); divSearchTimer=setTimeout(function(){ divSearchQ=v; renderDivisions(); },120); });
  var prAdd=document.getElementById('pr-add'); if(prAdd) prAdd.onclick=addProtocol;
  // add content (list view)
  var ad=document.getElementById('add-date'); var td=todayISO();
  ad.value=(td>='2026-06-15'&&td<='2026-08-09')?td:'2026-06-26';
  document.getElementById('add-content').onclick=function(){
    var d=ad.value; if(!d||!byDate[d]){ toast('범위 내 날짜를 선택하세요 (6/15~8/9)'); return; }
    var k=addContent(d); var sl=findSlot(byDate[d],k); renderAfterEdit(k,sl); openSlot(d, sl);
  };
  document.getElementById('mk-add').onclick=function(){ if(!state.marketing)state.marketing=defaultMarketing(); state.marketing.push({id:mkid(),date:'',title:'',channel:'',memo:''}); renderMarketing(); saveMarketing(); };
  // 마감 알림
  var dn=document.getElementById('due-notify'); if(dn) dn.onclick=enableDueNotify;
  // 보드 바 — 정렬 · 빈 슬롯 토글 · 필터 접기
  var bs=document.getElementById('board-sort');
  if(bs) bs.addEventListener('click',function(e){ var b=e.target.closest('[data-bsort]'); if(!b) return;
    boardSort=b.getAttribute('data-bsort'); try{localStorage.setItem('jamboree-plan:board-sort',boardSort);}catch(_){} renderBoard(); });
  // 콘텐츠 파이프라인 — 모바일 단계 세그먼트 · 인박스(제보) → 콘텐츠 전환
  var bmseg=document.getElementById('board-mseg');
  if(bmseg) bmseg.addEventListener('click',function(e){ var b=e.target.closest('[data-mstage]'); if(!b) return;
    boardMStage=b.getAttribute('data-mstage'); renderBoard(); });
  var boardEl=document.getElementById('board');
  if(boardEl) boardEl.addEventListener('click',function(e){ var c=e.target.closest('[data-tipconv]'); if(!c) return;
    e.stopPropagation(); openTipSchedule(c.getAttribute('data-tipconv')); });
  var tge=document.getElementById('toggle-empty');
  if(tge) tge.onclick=function(){ showEmpty=!showEmpty; try{localStorage.setItem('jamboree-plan:show-empty',showEmpty?'1':'0');}catch(_){} renderBoard(); };
  var fto=document.getElementById('filters-toggle');
  if(fto) fto.onclick=function(){ filtersOpen=!filtersOpen; var fb=document.getElementById('filters'); if(fb) fb.style.display=filtersOpen?'':'none'; renderBoardBar(); };
  updateNotifyBtn(); setTimeout(scanDueNotify,3000); setInterval(scanDueNotify, 5*60*1000);
  var ttAdd=document.getElementById('tt-add'); if(ttAdd) ttAdd.onclick=addTT;
  var ttSeg=document.getElementById('tt-modeseg'); if(ttSeg) ttSeg.querySelectorAll('button').forEach(function(bt){ bt.onclick=function(){ ttMode=bt.dataset.m; try{localStorage.setItem('jamboree-plan:ttmode',ttMode);}catch(e){} renderTimetable(); }; });
  var ttFil=document.getElementById('tt-filter'); if(ttFil) ttFil.addEventListener('click',function(e){ var b=e.target.closest('[data-ttf]'); if(!b) return;
    var k=b.getAttribute('data-ttf');
    if(k==='__all'){ var allOn=TT_TRACKS.every(function(t){ return ttTrackOn(t[0]); }); TT_TRACKS.forEach(function(t){ ttFilter[t[0]]=!allOn; }); }   // 전체 토글(모두 켜져있으면 끄고, 아니면 모두 켬)
    else ttFilter[k]=!ttTrackOn(k);
    saveTtFilter(); renderTimetable(); });
  var rsAdd=document.getElementById('roster-add'); if(rsAdd) rsAdd.onclick=function(){ addRoster('t1'); };
  // 현장 위치 지도 — 지금 기준(실시간, 1분 갱신) ↔ 시간 지정(슬라이더) 공존 + 수동 지정(우선)
  var smSeg=document.getElementById('sm-modeseg'); if(smSeg) smSeg.querySelectorAll('button').forEach(function(bt){ bt.onclick=function(){ smTimeMode=bt.dataset.m; renderSiteMap(); }; });
  var smDaySel=document.getElementById('sm-day'); if(smDaySel) smDaySel.addEventListener('change',function(){ smDay=this.value; renderSiteMapMarkers(); });
  var smTime=document.getElementById('sm-time'); if(smTime) smTime.addEventListener('input',function(){ smTimeMin=+this.value; var lb=document.getElementById('sm-tlabel'); if(lb) lb.textContent=smMinLabel(smTimeMin); renderSiteMapMarkers(); });
  var smClear=document.getElementById('sm-clear'); if(smClear) smClear.onclick=function(){ if(!Object.keys(mapPosMap()).length) return; if(!confirm('수동으로 지정한 위치를 모두 초기화할까요?\n전원이 자동 표시(일정 없으면 JHQ 본부)로 돌아갑니다.')) return; state.mappos={}; saveMapPos(); smSel=null; renderSiteMap(); };
  setInterval(function(){ if(curViewMode==='sitemap' && smTimeMode==='now') renderSiteMap(); }, 60000);
  var smDragPid=null;
  var smStage=document.getElementById('sm-stage');
  if(smStage){
    smStage.addEventListener('click',function(e){
      if(e.target.closest('[data-pop-close]')){ closeZonePopover(); return; }
      var mv=e.target.closest('[data-pop-move]'); if(mv){ smSel=mv.getAttribute('data-pop-move'); closeZonePopover(); renderSiteMapMarkers(); renderSiteSelbar(); return; }
      var up=e.target.closest('[data-pop-unplace]'); if(up){ smUnplace(up.getAttribute('data-pop-unplace')); return; }
      if(e.target.closest('.smpop')) return;   // 그 외 말풍선 내부 클릭은 무시
      var sh=e.target.closest('.smshoot'); if(sh){ var c=document.getElementById('shoot-'+sh.dataset.shoot); if(c){ c.scrollIntoView({behavior:'smooth',block:'center'}); c.classList.add('flash'); setTimeout(function(){ c.classList.remove('flash'); },1200); } return; }
      var z=e.target.closest('.smzone');
      if(z){ var zk=z.dataset.zone;
        if(smSel){ smPlace(smSel, zk); return; }          // 선택된 인원 → 그 구역에 배치
        if(z.classList.contains('has')){ openZonePopover(zk); }  // 인원 있는 구역 → 말풍선
        return;
      }
      closeZonePopover();   // 빈 곳 클릭 → 말풍선 닫기
    });
    smStage.addEventListener('dragstart',function(e){ var av=e.target.closest('.smav[data-pid]'); if(av){ smDragPid=av.dataset.pid; try{e.dataTransfer.setData('text/plain',smDragPid);e.dataTransfer.effectAllowed='move';}catch(_){} } });
    smStage.addEventListener('dragover',function(e){ var z=e.target.closest('.smzone'); if(z&&smDragPid){ e.preventDefault(); document.querySelectorAll('.smzone.drop').forEach(function(x){x.classList.remove('drop');}); z.classList.add('drop'); } });
    smStage.addEventListener('dragleave',function(e){ var z=e.target.closest('.smzone'); if(z) z.classList.remove('drop'); });
    smStage.addEventListener('drop',function(e){ var z=e.target.closest('.smzone'); if(z&&smDragPid){ e.preventDefault(); z.classList.remove('drop'); smPlace(smDragPid, z.dataset.zone); smDragPid=null; } });
    smStage.addEventListener('dragend',function(){ smDragPid=null; document.querySelectorAll('.smzone.drop').forEach(function(x){x.classList.remove('drop');}); });
  }
  var smSelbar=document.getElementById('sm-selbar');
  if(smSelbar) smSelbar.addEventListener('click',function(e){
    if(e.target.closest('[data-sm-unplace]')){ if(smSel) smUnplace(smSel); return; }
    if(e.target.closest('[data-sm-desel]')){ smSel=null; renderSiteMapMarkers(); renderSiteSelbar(); return; }
  });
  // 촬영 요청
  var shootAdd=document.getElementById('shoot-add'); if(shootAdd) shootAdd.onclick=addShoot;
  var shootBox=document.getElementById('shoot-list');
  if(shootBox){
    function shootById(id){ return shootList().filter(function(x){return x.id===id;})[0]; }
    function onShootField(el){ var s=shootById(el.getAttribute('data-shoot')); if(!s) return; s[el.getAttribute('data-f')]=el.value; saveShoots(); if(el.getAttribute('data-f')==='zone'||el.getAttribute('data-f')==='title') renderSiteMapMarkers(); }
    shootBox.addEventListener('input',function(e){ var f=e.target.closest('[data-shoot][data-f]'); if(f && f.tagName!=='SELECT') onShootField(f); });
    shootBox.addEventListener('change',function(e){ var f=e.target.closest('select[data-shoot][data-f]'); if(f) onShootField(f); });
    shootBox.addEventListener('click',function(e){
      var tg=e.target.closest('[data-shoot-toggle]'); if(tg){ var s=shootById(tg.getAttribute('data-shoot-toggle')); if(s){ s.status=s.status==='done'?'open':'done'; renderShootList(); renderSiteMapMarkers(); saveShoots(); } return; }
      var dl=e.target.closest('[data-shoot-del]'); if(dl){ var id=dl.getAttribute('data-shoot-del'); if(confirm('이 촬영 요청을 삭제할까요?')){ state.shoots=shootList().filter(function(x){return x.id!==id;}); renderShootList(); renderSiteMapMarkers(); saveShoots(); } return; }
    });
  }
  // 취재 연락처 탭
  var conAdd=document.getElementById('con-add'); if(conAdd) conAdd.onclick=function(){ addContactRow(); renderContacts(); saveContacts(); };
  var conSe=document.getElementById('con-search'); if(conSe) conSe.addEventListener('input',function(){ var v=this.value; if(conSearchTimer)clearTimeout(conSearchTimer); conSearchTimer=setTimeout(function(){ conSearchQ=v; renderContacts(); },120); });
  // 시간 일정 편집 모달
  document.getElementById('tt-close').onclick=closeTT;
  document.getElementById('tt-cancel').onclick=closeTT;
  document.getElementById('tt-save').onclick=commitTT;
  document.getElementById('tt-del').onclick=deleteTTCur;
  document.getElementById('tt-scrim').addEventListener('click',function(e){ if(e.target===this) closeTT(); });
  // modal: explicit save + unsaved-changes guard
  document.getElementById('md-close').onclick=tryClose;
  document.getElementById('md-cancel').onclick=tryClose;
  document.getElementById('md-save').onclick=saveAndClose;
  document.getElementById('g-save').onclick=saveAndClose;
  document.getElementById('g-discard').onclick=discardAndClose;
  document.getElementById('g-cancel').onclick=hideGuard;
  document.getElementById('scrim').addEventListener('click',function(e){ if(e.target===this) tryClose(); });
  document.getElementById('lightbox').addEventListener('click',function(){ this.classList.remove('show'); });
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape') return;
    if(document.getElementById('lightbox').classList.contains('show')){ document.getElementById('lightbox').classList.remove('show'); return; }
    if(document.getElementById('news-scrim').classList.contains('show')){ closeNewsEditor(); return; }
    if(document.getElementById('members-scrim').classList.contains('show')){ closeMembers(); return; }
    if(document.getElementById('ev-scrim').classList.contains('show')){ closeEvent(); return; }
    if(document.getElementById('tt-scrim').classList.contains('show')){ closeTT(); return; }
    if(document.getElementById('md-guard').classList.contains('show')){ hideGuard(); return; }
    if(curView) tryClose();
  });
  // 안정성: 오프라인/네트워크 복구 시 미저장분 자동 재시도 + 이탈 경고
  window.addEventListener('online', function(){ toast('온라인 — 미저장분 동기화'); flushPending(); });
  window.addEventListener('offline', function(){ setSt('오프라인 — 로컬 보관 중'); });
  window.addEventListener('beforeunload', function(ev){ if(Object.keys(pending).length || (curView&&curView.dirty)){ ev.preventDefault(); ev.returnValue=''; } });
  setInterval(flushPending, 15000);
}
init();
