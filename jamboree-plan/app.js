/* ===== config ===== */
var EVENT_DAY = '2026-08-05';
var RANGE_START = '2026-06-15';
var RANGE_END   = '2026-08-09';
var WD = ['일','월','화','수','목','금','토'];
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

/* ===== line icons (Feather/Lucide-style inline SVG) ===== */
var ICON={
  calendar:'<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18"/><path d="M8 2.5v4M16 2.5v4"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.6" cy="6" r="1.1"/><circle cx="3.6" cy="12" r="1.1"/><circle cx="3.6" cy="18" r="1.1"/>',
  link:'<path d="M9.5 12.5a4 4 0 0 0 5.7.4l2.8-2.8a4 4 0 0 0-5.66-5.66l-1.4 1.4"/><path d="M14.5 11.5a4 4 0 0 0-5.7-.4l-2.8 2.8a4 4 0 0 0 5.66 5.66l1.4-1.4"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="M21 15l-5-5L5 21"/>',
  paperclip:'<path d="M21 11.5l-8.95 8.96a5 5 0 0 1-7.07-7.07l9.19-9.2a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  fileText:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.7-6.4"/><path d="M21 4v5h-5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  ext:'<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 13.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/>',
  trash:'<path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6.5 7l.8 13a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-13"/>',
  download:'<path d="M12 3v12"/><path d="M7.5 11 12 15.5 16.5 11"/><path d="M5 21h14"/>',
  highlighter:'<path d="m9 11-4 4v3h3l4-4"/><path d="m13 7 4 4"/><path d="M14 4l6 6-7 7-6-6z"/>',
  alignLeft:'<path d="M4 6h16M4 12h10M4 18h13"/>',
  alignCenter:'<path d="M4 6h16M7 12h10M5 18h14"/>',
  alignRight:'<path d="M4 6h16M10 12h10M7 18h13"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1"/><path d="M17 14.2a6 6 0 0 1 4 5.8"/>',
  mapPin:'<path d="M12 21s-6.5-5.5-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.5 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.4"/>',
  tag:'<path d="M3 11V4a1 1 0 0 1 1-1h7l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  grid:'<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>'
};
function icon(name,size){ return '<svg class="ic" viewBox="0 0 24 24" width="'+(size||16)+'" height="'+(size||16)+'" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICON[name]||'')+'</svg>'; }

/* ===== date helpers ===== */
function ymd(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);}
function iso(dt){return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');}
function dayDiff(a,b){return Math.round((ymd(a)-ymd(b))/86400000);}
function todayISO(){var n=new Date();return iso(new Date(n.getFullYear(),n.getMonth(),n.getDate()));}

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

/* ===== overlay state ===== */
var LS='jamboree-plan:state', LS_AUTHOR='jamboree-plan:author';
var CHANNELS=['페이스북','인스타그램','유튜브','블로그','기타'];
var MAX_IMG=10;
function stateDefaults(){ return {edits:{}, extra:{}, marketing:null, header:null, hidden:{}, history:{}, meta:{}, notes:{}, types:null, events:null, timetable:null, roster:null, placement:null, ttcats:null, offtimes:null, contacts:null, divisions:null, protocol:null, launch:null}; }
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
  {id:'mtg-jy-0804',title:'분단야영장회의 22:00',kind:'회의',start:'2026-08-04',end:'2026-08-04',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHG 회의실'},
  {id:'mtg-jy-0805',title:'분단야영장회의 23:00',kind:'회의',start:'2026-08-05',end:'2026-08-05',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHG 회의실'},
  {id:'mtg-jy-0806',title:'분단야영장회의 23:00',kind:'회의',start:'2026-08-06',end:'2026-08-06',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHG 회의실'},
  {id:'mtg-jy-0807',title:'분단야영장회의 22:00',kind:'회의',start:'2026-08-07',end:'2026-08-07',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHG 회의실'},
  {id:'mtg-jy-0808',title:'분단야영장회의 23:00',kind:'회의',start:'2026-08-08',end:'2026-08-08',owner:'',memo:'참석: 야영장단·본부장·지원부장 / 장소: JHG 회의실'},
  {id:'mtg-bd-0804',title:'분단장 회의 21:00',kind:'회의',start:'2026-08-04',end:'2026-08-04',owner:'',memo:'참석: 야영장단·본부장·지원부장·분단장·분단지원부장 / 장소: JHG 회의실'},
  {id:'mtg-bd-0806',title:'분단장 회의 22:00',kind:'회의',start:'2026-08-06',end:'2026-08-06',owner:'',memo:'참석: 야영장단·본부장·지원부장·분단장·분단지원부장 / 장소: JHG 회의실'},
  {id:'mtg-bd-0808',title:'분단장 회의 22:00',kind:'회의',start:'2026-08-08',end:'2026-08-08',owner:'',memo:'참석: 야영장단·본부장·지원부장·분단장·분단지원부장 / 장소: JHG 회의실'}
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
var TTCAT_PALETTE=['#C0492F','#2F5D4A','#6B4FA0','#0F8A8A','#B07A1E','#2E6FAE','#7A6A57','#A33A24','#3E7C59','#8E5BB5','#127C7C','#9A6310','#3D6FB0','#6E5E4C'];
function defaultTtCats(){ return [['개·폐영식','#C0492F'],['프로그램','#2F5D4A'],['행사','#6B4FA0'],['홍보활동','#0F8A8A'],['식사','#B07A1E'],['회의','#2E6FAE'],['이동·기타','#7A6A57']]; }
function ttCats(){ if(!state.ttcats) state.ttcats=defaultTtCats(); return state.ttcats; }
function ttCatColor(c){ var L=ttCats(); for(var i=0;i<L.length;i++) if(L[i][0]===c) return L[i][1]; return '#7A6A57'; }
function saveTtCats(){ debouncedPut('ttcatTimer', {ttcats: ttCats()}, '종류 저장됨'); }
function addTtCat(name){ name=(name||'').trim(); if(!name) return false; var L=ttCats(); if(L.some(function(x){return x[0]===name;})){ toast('이미 있는 종류'); return false; } var used=L.map(function(x){return x[1];}); var col=TTCAT_PALETTE.filter(function(c){return used.indexOf(c)<0;})[0]||TTCAT_PALETTE[L.length%TTCAT_PALETTE.length]; L.push([name,col]); saveTtCats(); return true; }
function deleteTtCat(name){ var L=ttCats(); if(L.length<=1){ toast('최소 1개 종류는 필요합니다'); return false; } if(!confirm('종류 "'+name+'"을(를) 삭제할까요?\n이 종류를 쓰던 일정은 기본색으로 표시됩니다.')) return false; state.ttcats=L.filter(function(x){return x[0]!==name;}); saveTtCats(); return true; }
function setTtCatColor(name,color){ var L=ttCats(); for(var i=0;i<L.length;i++) if(L[i][0]===name){ L[i][1]=color; break; } saveTtCats(); }
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

/* ===== 홍보부 인원 R&R + 배치표 ===== */
function defaultRoster(){ return [
  {id:mkid(),name:'',role:'홍보부장',duty:'홍보 전략 총괄 · 대외 협력 · 최종 승인',contact:'',channel:''},
  {id:mkid(),name:'',role:'콘텐츠 기획',duty:'카드뉴스/영상 기획 · 운영 캘린더 관리 · 일정 조율',contact:'',channel:'페이스북'},
  {id:mkid(),name:'',role:'디자인',duty:'카드뉴스 · 웹포스터 제작 (/jamboree 제작기)',contact:'',channel:'인스타그램'},
  {id:mkid(),name:'',role:'영상 · 촬영',duty:'현장 촬영 · 편집 · 릴스/숏폼',contact:'',channel:'유튜브·인스타'},
  {id:mkid(),name:'',role:'채널 운영',duty:'SNS 업로드 · 댓글/DM 응대 · 통계',contact:'',channel:'페이스북·인스타·유튜브'},
  {id:mkid(),name:'',role:'사진 · 아카이브',duty:'현장 사진 · 자료 정리 · 보도자료 지원',contact:'',channel:'블로그'}
]; }
function rosterList(){ if(!state.roster) state.roster=defaultRoster(); return state.roster; }
function defaultPlacement(){ return [
  {id:mkid(),name:'',day:'8/5 개영',zone:'메인 스타디움',time:'18:00–22:00',task:'개영식 라이브 송출 · 현장 촬영'},
  {id:mkid(),name:'',day:'8/5 개영',zone:'등록센터',time:'09:00–13:00',task:'입영 스케치 · 사진'},
  {id:mkid(),name:'',day:'8/6',zone:'어드벤처 존',time:'14:00–18:00',task:'도전활동 릴스 촬영'},
  {id:mkid(),name:'',day:'8/7',zone:'평화광장',time:'14:00–16:00',task:'캠페인 콘텐츠 · 인터뷰'},
  {id:mkid(),name:'',day:'8/9 폐영',zone:'메인 스타디움',time:'18:00–21:00',task:'폐영식 · 하이라이트 영상'}
]; }
function placementList(){ if(!state.placement) state.placement=defaultPlacement(); return state.placement; }
/* ===== 취재 연락처 (coverage contacts) — 일정표와 연동되는 담당자 주소록 ===== */
function defaultContacts(){ return [
  {id:mkid(),name:'',org:'기획조정본부',role:'프로그램 담당',phone:'',email:'',memo:'프로그램 일정 · 현장 취재 협조'},
  {id:mkid(),name:'',org:'운영본부',role:'야영장(캠프치프)',phone:'',email:'',memo:'영지 · 서브캠프 현장 안내'},
  {id:mkid(),name:'',org:'외부 · 언론',role:'취재 기자',phone:'',email:'',memo:'보도자료 배포 / 공동취재'}
]; }
function contactList(){ if(!state.contacts) state.contacts=defaultContacts(); return state.contacts; }
function contactById(id){ var l=contactList(); for(var i=0;i<l.length;i++) if(l[i].id===id) return l[i]; return null; }
function contactLabel(c){ if(!c) return '?'; return (c.name||'').trim() || (c.org||'').trim() || (c.role||'').trim() || '(이름 미입력)'; }
function contactSub(c){ if(!c) return ''; var b=[]; if(c.org) b.push(c.org); if(c.role) b.push(c.role); return b.join(' · '); }
function contactPhoneLine(c){ if(!c) return ''; var b=[]; if(c.phone) b.push(c.phone); if(c.email) b.push(c.email); return b.join(' · '); }
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
  delete e.channel; delete e.link;
  return e;
}
function adopt(s){ var st=Object.assign(stateDefaults(), s||{}); Object.keys(st.edits).forEach(function(k){ st.edits[k]=normEdit(st.edits[k]); }); return st; }
function loadLocal(){ try{var r=localStorage.getItem(LS); if(r) state=adopt(JSON.parse(r));}catch(e){} }
function saveLocal(){ prune(); try{localStorage.setItem(LS,JSON.stringify(state));}catch(e){} }
function key(date,type){return date+'#'+type;}
function EDEF(){ return {title:'',ctype:'',status:'planned',time:'',owner:'',tags:'',posted:false,postedAt:'',channels:['페이스북'],links:{},images:[],files:[]}; }
function getEdit(k){ return state.edits[k] || (state.edits[k]=EDEF()); }   // editing (persists)
function peek(k){ return state.edits[k] || EDEF(); }                       // read-only (no store)
function hist(k){ return state.history[k] || []; }
function hasLink(e){ return e.links && Object.keys(e.links).some(function(c){return e.links[c];}); }
function linkCount(e){ return e.links ? Object.keys(e.links).filter(function(c){return e.links[c];}).length : 0; }
function channelPh(c){ return ({'페이스북':'https://facebook.com/…','인스타그램':'https://instagram.com/…','유튜브':'https://youtube.com/…','블로그':'https://blog…/…'})[c]||'https://…'; }
function normUrl(v){ v=(v||'').trim(); if(v && !/^https?:\/\//i.test(v) && /\./.test(v) && !/\s/.test(v)) v='https://'+v; return v; }
function lastEditText(k){ var m=state.meta[k]; if(!m||!m.updatedAt) return ''; return '마지막 작업: '+(m.author||'익명')+(m.ip?(' · IP '+m.ip):'')+' · '+fmtDateTime(m.updatedAt); }
function isDefaultEdit(e){ var defCh=!e.channels||(e.channels.length===1&&e.channels[0]==='페이스북'); return !e.title && !e.ctype && !e.time && !e.owner && !e.tags && !e.posted && !hasLink(e) && (!e.images||!e.images.length) && (!e.files||!e.files.length) && (!e.status||e.status==='planned') && defCh; }
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
var _mk=0; function mkid(){_mk++;return 'mk'+Date.now().toString(36)+_mk;}

/* ===== sync (per-card save) ===== */
function setSt(msg,ok){var e=document.getElementById('syncst'); if(e){ e.classList.toggle('ok',!!ok); e.innerHTML = ok?('<b>'+msg+'</b>'):msg; }}
function authorVal(){ var el=document.getElementById('author'); return el?(el.value||'').trim():''; }
function fmtTime(s){ try{var d=new Date(s);return d.getMonth()+1+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}catch(e){return '';} }
function slotEditPayload(k,s){
  var e=peek(k);
  return {title:e.title||'',ctype:e.ctype||'',status:e.status||'planned',time:e.time||'',owner:e.owner||'',tags:e.tags||'',posted:!!e.posted,postedAt:e.postedAt||'',channels:(e.channels&&e.channels.length?e.channels:['페이스북']),links:e.links||{},images:e.images||[],files:e.files||[],category:(s&&s.category)||''};
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
function updatePendingUI(){ var n=Object.keys(pending).length; if(n) setSt('저장 대기 '+n+'건 — 자동 재시도'); }
function flushPending(){ if(!navigator.onLine) return; Object.keys(pending).forEach(function(k){ var op=pending[k]; if(op==='delete') sendDelete(k); else doSaveCard(k, slotByKey(k)); }); }
function doSaveCard(k,s){
  if(s===undefined) s=slotByKey(k);
  setSt('서버 저장 중…');
  fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},
    body:JSON.stringify({slotKey:k, edit:slotEditPayload(k,s), author:authorVal()})})
    .then(function(r){return r.json();})
    .then(function(j){ if(j&&j.ok&&j.slot){ delete pending[k]; applyMeta(k,j.slot); saveLocal(); var n=Object.keys(pending).length; setSt(n?('저장 대기 '+n+'건'):('서버 저장됨 · '+fmtTime(j.slot.updatedAt)), !n); } else { pending[k]=true; setSt('저장 실패 — 재시도 예정'); } })
    .catch(function(){ pending[k]=true; setSt('오프라인/네트워크 오류 — 로컬 보관, 자동 재시도'); });
}
function sendDelete(k){
  saveLocal();
  fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},
    body:JSON.stringify({slotKey:k, deleted:true, author:authorVal()})})
    .then(function(r){return r.json();}).then(function(j){ if(j&&j.ok){ delete pending[k]; setSt('서버에서 삭제됨',true); } else { pending[k]='delete'; } }).catch(function(){ pending[k]='delete'; setSt('삭제 저장 실패 — 자동 재시도'); });
}
function putSlot(payload){
  return fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(Object.assign({author:authorVal()},payload))}).catch(function(){});
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
  fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},
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
    fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},
      body:JSON.stringify({marketing:state.marketing||[], author:authorVal()})})
      .then(function(r){return r.json();}).then(function(){ setSt('마케팅 저장됨',true); }).catch(function(){ setSt('마케팅 저장 실패'); });
  }, 500);
}
function saveAll(){
  var author=authorVal();
  prune();
  var ks={}; Object.keys(state.edits).forEach(function(k){ks[k]=1;}); Object.keys(state.hidden).forEach(function(k){ks[k]=1;});
  Object.keys(state.history).forEach(function(k){ if((state.history[k]||[]).length) ks[k]=1; });
  var arr=Object.keys(ks);
  setSt('전체 저장 중… ('+arr.length+')');
  Promise.all(arr.map(function(k){
    var body = state.hidden[k] ? {slotKey:k,deleted:true,author:author} : {slotKey:k,edit:slotEditPayload(k),author:author};
    return fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json();}).then(function(j){ if(j&&j.slot) applyMeta(k,j.slot); }).catch(function(){return null;});
  })).then(function(){
    return fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({marketing:state.marketing||[],author:author})});
  }).then(function(){ setSt('전체 저장 완료',true); toast('서버에 전체 저장됨'); }).catch(function(){ setSt('전체 저장 일부 실패'); });
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
  if(j&&j.types) state.types=j.types;
  if(j&&j.events) state.events=j.events;
  if(j&&j.timetable) state.timetable=j.timetable;
  if(j&&j.roster){ var r=j.roster.filter(function(x){ return x && ((x.name||'').trim()||(x.role||'').trim()||(x.duty||'').trim()||(x.contact||'').trim()||(x.channel||'').trim()); }); if(r.length) state.roster=r; }
  if(j&&j.placement) state.placement=j.placement;
  if(j&&Array.isArray(j.ttcats)&&j.ttcats.length) state.ttcats=j.ttcats;
  if(j&&j.offtimes&&typeof j.offtimes==='object'&&!Array.isArray(j.offtimes)) state.offtimes=j.offtimes;
  if(j&&Array.isArray(j.contacts)&&j.contacts.length) state.contacts=j.contacts;
  if(j&&Array.isArray(j.divisions)&&j.divisions.length) state.divisions=j.divisions;
  if(j&&Array.isArray(j.protocol)&&j.protocol.length) state.protocol=j.protocol;
  if(j&&j.launch&&typeof j.launch==='object'&&!Array.isArray(j.launch)) state.launch=j.launch;
}
function saveTypes(){
  saveLocal();
  fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},
    body:JSON.stringify({types:typeList(), author:authorVal()})}).catch(function(){});
}
var evTimer=null;
function saveEvents(){
  saveLocal();
  if(evTimer) clearTimeout(evTimer);
  setSt('일정 저장 대기…');
  evTimer=setTimeout(function(){
    setSt('일정 저장 중…');
    fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},
      body:JSON.stringify({events:state.events||[], author:authorVal()})})
      .then(function(r){return r.json();}).then(function(){ setSt('일정 저장됨',true); }).catch(function(){ setSt('일정 저장 실패'); });
  }, 500);
}
var ttTimer=null, rosterTimer=null, placeTimer=null;
function debouncedPut(timerName, body, okMsg){
  saveLocal();
  var t=window[timerName]; if(t) clearTimeout(t);
  setSt('저장 대기…');
  window[timerName]=setTimeout(function(){
    setSt('저장 중…');
    fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},
      body:JSON.stringify(Object.assign({author:authorVal()}, body))})
      .then(function(r){return r.json();}).then(function(){ setSt(okMsg||'저장됨',true); }).catch(function(){ setSt('저장 실패'); });
  }, 500);
}
function saveTimetable(){ debouncedPut('ttTimer', {timetable: state.timetable||[]}, '일정표 저장됨'); }
function saveRoster(){ debouncedPut('rosterTimer', {roster: state.roster||[]}, 'R&R 저장됨'); }
function savePlacement(){ debouncedPut('placeTimer', {placement: state.placement||[]}, '배치표 저장됨'); }
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
  fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},
    body:JSON.stringify({slotKey:k, addNote:{text:text}, author:authorVal()})})
    .then(function(r){return r.json();})
    .then(function(j){ if(j&&j.slot){ state.notes[k]=j.slot.notes||[]; applyMeta(k,j.slot); saveLocal(); refreshModal(); setSt('메모 저장됨',true); } else setSt('저장 실패'); })
    .catch(function(){ setSt('저장 실패 (네트워크)'); });
}
function reloadServer(){
  setSt('불러오는 중…');
  fetch('/api/jamboree-plan').then(function(r){return r.json();}).then(function(j){
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
    '<span><b>회기</b> '+h.period+'</span><span><b>장소</b> '+h.place+'</span>';
  renderClock();
}
// 개영식 = 2026-08-05 20:00 (KST). 시·분·초 라이브 카운트다운.
var EVENT_DT = new Date(2026,7,5,20,0,0);
function pad2(n){ return String(n).padStart(2,'0'); }
function renderClock(){
  var cl=document.getElementById('m-clock'), sub=document.getElementById('m-clocksub'); if(!cl) return;
  var diff=EVENT_DT-new Date();
  if(diff<=0){ cl.textContent='D-DAY · 개영!'; sub.textContent='개영식 2026-08-05 20:00 시작'; return; }
  var d=Math.floor(diff/86400000), h=Math.floor(diff%86400000/3600000), m=Math.floor(diff%3600000/60000), sc=Math.floor(diff%60000/1000);
  cl.innerHTML='D-'+d+' <span class="hms">'+pad2(h)+':'+pad2(m)+':'+pad2(sc)+'</span>';
  sub.textContent='개영식(2026-08-05 20:00)까지';
}

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
    var vis = q ? slots.filter(function(s){ return matchSearch(rec,s,peek(s.k)); }) : slots;
    if(q && !vis.length) cell.classList.add('dim');
    // 날짜 옆 작은 진행상태 점(슬롯별)
    var dots=vis.map(function(s){ var st=peek(s.k).status||'planned'; return '<span class="sdot" style="background:'+STCOL[st]+'" title="'+STATUS_LABEL[st]+'"></span>'; }).join('');
    var html='<div class="ctop"><span class="date">'+rec.label+(dots?(' <span class="sdots">'+dots+'</span>'):'')+'</span><span class="dd mono">'+rec.dlabel+'</span></div>';
    // 운영 일정(여러 날 연속) 띠 — 콘텐츠와 분리된 일정 레이어
    if(elay.lanes){
      var bands='';
      for(var li=0; li<elay.lanes; li++){
        var be=null; for(var bi=0;bi<elay.items.length;bi++){ var x=elay.items[bi]; if(x.lane===li && x.s<=rec.date && x.en>=rec.date){ be=x; break; } }
        if(be){ var isS=be.s===rec.date, isE=be.en===rec.date, wkS=(dt.getDay()===0);
          bands+='<div class="eband citem-ev" data-ev="'+be.e.id+'" title="'+esc(be.e.title+' · '+be.s+'~'+be.en)+'" style="background:'+eventColor(be.e.kind)+';'+(isS?'border-top-left-radius:6px;border-bottom-left-radius:6px;':'')+(isE?'border-top-right-radius:6px;border-bottom-right-radius:6px;':'')+'">'+((isS||wkS)?esc(be.e.title):'')+'</div>';
        } else bands+='<div class="eband ph"></div>';
      }
      html+='<div class="bands">'+bands+'</div>';
    }
    // 실제 콘텐츠(제목 있음)=카드처럼 부각 / 의미있는 시드(참가국·역할·이벤트)=옅게 / 빈 슬롯=작은 칩
    var minis='';
    vis.forEach(function(s){
      var e=peek(s.k), typ=ctchip(e.ctype);
      if(e.title){
        var mt=isMeeting(e);
        html+='<div class="cline filled citem'+(mt?' meeting':'')+'" data-sk="'+s.k+'"'+(mt?(' style="border-left-color:'+ctypeColor(e.ctype)+'"'):'')+'>'+typ+esc(e.title)+'</div>';
      } else if(s.seedTitle){
        html+='<div class="cline seed citem" data-sk="'+s.k+'">'+esc(s.seedTitle)+'</div>';
      } else {
        minis+='<span class="cmini citem" data-sk="'+s.k+'">'+TYPE_LABEL[s.type]+'</span>';
      }
    });
    if(minis) html+='<div class="cminis">'+minis+'</div>';
    // 의전 일정 — 시간이 지정된 항목만 캘린더에 '의전'으로 구분 표시(시간 미지정은 노출 안 함)
    protocolList().filter(function(p){ return p.date===rec.date && (p.time||'').trim(); }).forEach(function(p){
      var pw=prWho(p);
      html+='<div class="cline protocol citem-pr" data-pid="'+esc(p.id)+'" title="'+esc('의전 · '+pw+' · '+(p.activity||''))+'"><span class="prtag">의전</span>'+esc(p.time)+' · '+esc(p.activity||pw||p.role)+'</div>';
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
var STCOL={planned:'#9AA09A',draft:'#C8821C',ready:'#2F8F6B'};
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
function renderBoard(){
  var board=document.getElementById('board'); if(!board) return;
  board.innerHTML='';
  var cols={planned:[],draft:[],ready:[]}, total=0, ready=0, started=0, meetings=0;
  DAYS.forEach(function(d){
    daySlots(d).forEach(function(s){
      var e=peek(s.k), st=e.status||'planned';
      if(isMeeting(e)){ meetings++; } else { total++; if(st==='ready') ready++; if(st!=='planned') started++; }
      (cols[st]||cols.planned).push({d:d,s:s,e:e});
    });
  });
  STAGES.forEach(function(def){
    var items=cols[def[0]].filter(function(it){ return matchKind(it.e) && matchFilter(it.d, it.s, it.e) && matchSearch(it.d, it.s, it.e); });
    var col=document.createElement('div'); col.className='col';
    col.innerHTML='<div class="colh"><span class="pin" style="background:'+STCOL[def[0]]+'"></span>'+def[1]+'<span class="cnt">'+items.length+'</span></div>';
    var cards=document.createElement('div'); cards.className='cards';
    if(!items.length){ var em=document.createElement('div'); em.className='colempty'; em.textContent='없음'; cards.appendChild(em); }
    items.forEach(function(it){ try{ cards.appendChild(cardEl(it.d,it.s,it.e)); }catch(err){ console.warn('card render skip',err); } });
    col.appendChild(cards); board.appendChild(col);
  });
  document.getElementById('cnt-count').textContent='콘텐츠 '+total+' · 회의 '+meetings;
  var pct= total? Math.round(ready/total*100):0;
  document.getElementById('pfill').style.width=pct+'%';
  document.getElementById('ptext').textContent='콘텐츠 완료 '+ready+'/'+total+' ('+pct+'%) · 진행 시작 '+started+' · 회의 '+meetings+'건';
}
function chanClass(ch){ return ch==='인스타그램'?'ig':ch==='유튜브'?'yt':(ch==='페이스북'||!ch)?'':'etc'; }
function cardEl(d,s,e){
  var col=CAT_COLOR[s.category]||'var(--muted)';
  var title=e.title||s.seedTitle||'';
  var chs=(e.channels&&e.channels.length?e.channels:['페이스북']);
  var bits=[];
  if(e.posted) bits.push('<span class="postbadge">게시됨</span>');
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
function openDay(date){ var rec=byDate[date]; if(!rec) return; var s=daySlots(rec)[0]; if(s) openSlot(date,s); }  // (deprecated) → 첫 콘텐츠
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
  var timeInp=document.createElement('input'); timeInp.type='time'; timeInp.value=e.time||''; timeInp.oninput=function(){ e.time=timeInp.value; mark(); };
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
  hint.innerHTML='최대 '+MAX_IMG+'장 · 자동 축소(1600px) 후 서버 저장 · <a href="/jamboree" target="_blank" rel="noopener">'+icon('image',13)+' 카드뉴스 제작기 열기</a>';
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
function sanitizeHtml(h){ return (h||'').replace(/<\s*script/gi,'&lt;script').replace(/\son\w+\s*=/gi,' data-x='); }
function htmlToText(html){ return (html||'').replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi,'\n').replace(/<br\s*\/?>/gi,'\n').replace(/<li[^>]*>/gi,'• ').replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/\n{3,}/g,'\n\n').trim(); }
function copyText(txt, okMsg){ try{ if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(function(){toast(okMsg||'복사되었습니다');}).catch(function(){toast('복사 실패');}); } else { var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(okMsg||'복사되었습니다'); } }catch(e){ toast('복사 실패'); } }
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
  btn.classList.add('busy'); var orig=btn.textContent; btn.firstChild&&(btn.firstChild.nodeValue='업로드 중…');
  (function next(){
    if(!list.length){ btn.classList.remove('busy'); refreshModal(); mark(); return; }
    var f=list.shift();
    if(f.size>10*1024*1024){ toast(f.name+' : 10MB 초과로 제외'); next(); return; }
    uploadAttachment(f).then(function(j){ if(j&&j.url){ edit.files.push({name:j.name||f.name, url:j.url, ct:j.ct||f.type}); } next(); }).catch(function(){ toast('업로드 실패: '+f.name); next(); });
  })();
}
function uploadAttachment(file){
  return fetch('/api/file',{method:'POST',headers:{'content-type':(file.type||'application/octet-stream'),'x-filename':encodeURIComponent(file.name)},body:file})
    .then(function(r){return r.json();}).then(function(j){ return j&&j.url?j:null; });
}
function downscale(file,max,q){
  return new Promise(function(res,rej){
    var img=new Image(), url=URL.createObjectURL(file);
    img.onload=function(){
      var w=img.width,h=img.height,sc=Math.min(1,max/Math.max(w,h));
      var cw=Math.round(w*sc),ch=Math.round(h*sc);
      var c=document.createElement('canvas'); c.width=cw; c.height=ch;
      c.getContext('2d').drawImage(img,0,0,cw,ch);
      URL.revokeObjectURL(url);
      c.toBlob(function(b){ b?res(b):rej(); },'image/jpeg',q);
    };
    img.onerror=function(){ URL.revokeObjectURL(url); rej(); };
    img.src=url;
  });
}
function uploadBlob(blob){
  return fetch('/api/image',{method:'POST',headers:{'content-type':'image/jpeg'},body:blob})
    .then(function(r){return r.json();}).then(function(j){ return j&&j.url?j.url:null; });
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

/* ===== 일자별 시간 일정표 (타임테이블 그리드) ===== */
var WDS=['일','월','화','수','목','금','토'];
var TT_HS=0, TT_HE=24;             // 표시 시작/끝 시각 (24시간 일정표)
var TT_HH_PERIOD=46, TT_HH_DAY=84; // 시간당 픽셀(전체기간/일간)
var TT_HH=46;                      // 현재 모드 픽셀(renderTimetable에서 설정)
function t2h(s){ if(!s) return null; var p=String(s).split(':'); var h=+p[0], m=+(p[1]||0); if(isNaN(h)) return null; return h+(isNaN(m)?0:m)/60; }
var TT_SNAP=0.25;   // 15분 단위
function snap15(h){ return Math.round(h/TT_SNAP)*TT_SNAP; }
function h2hhmm(h){ var tot=Math.round(h*60); var hh=Math.floor(tot/60), mm=tot%60; return (hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm; }
function timeOptions(sel){ var o=''; for(var m=0;m<24*60;m+=15){ var v=h2hhmm(m/60); o+='<option value="'+v+'"'+(v===sel?' selected':'')+'>'+v+'</option>'; } return o; }
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
function renderTTControls(){
  var seg=document.getElementById('tt-modeseg');
  if(seg) seg.querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b.dataset.m===ttMode); });
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
function renderTimetable(){
  renderTTControls();
  var leg=document.getElementById('tt-legend'); if(leg){ leg.innerHTML=ttCats().map(function(c){return '<span class="li"><span class="sw" style="background:'+c[1]+'"></span>'+esc(c[0])+'</span>';}).join(''); }
  var box=document.getElementById('tt-grid'); if(!box) return;
  var days = (ttMode==='day') ? [ jamDay(ttDay) || JAM_DAYS[3] ] : JAM_DAYS;
  box.className = 'ttgrid' + (ttMode==='day' ? ' ttgrid-day' : '');
  TT_HH = (ttMode==='day') ? TT_HH_DAY : TT_HH_PERIOD;
  var H='<div class="ttg-head"><div class="ttg-corner"></div>';
  days.forEach(function(d){ var dd=ymd(d[0]); var cls=dd.getDay()===0?'sun':dd.getDay()===6?'sat':''; var today=(d[0]===todayISO());
    H+='<div class="ttg-dayhead '+cls+(today?' today':'')+'"><b>8/'+dd.getDate()+'</b><span>'+WDS[dd.getDay()]+(d[1]?(' · '+esc(d[1])):'')+'</span></div>'; });
  H+='</div><div class="ttg-body">';
  H+='<div class="ttg-hours">';
  for(var h=TT_HS;h<TT_HE;h++){ H+='<div class="ttg-hr" style="height:'+TT_HH+'px"><span>'+(h<10?'0':'')+h+':00</span></div>'; }
  H+='</div>';
  days.forEach(function(d){
    H+='<div class="ttg-col" data-day="'+d[0]+'">';
    for(var hh=TT_HS;hh<TT_HE;hh++){ H+='<div class="ttg-cell" data-day="'+d[0]+'" data-h="'+hh+'" style="height:'+TT_HH+'px"></div>'; }
    var real=ttList().filter(function(t){return t.day===d[0] && t2h(t.start)!=null;});
    var prs=protocolList().filter(function(p){ return p.date===d[0] && t2h(p.time)!=null; }).map(function(p){ return {id:'pr:'+p.id, start:p.time, end:'', _pr:p}; });
    var dayView=(ttMode==='day');
    function emitTT(list, off, span){
      var lay=ttLanes(list);
      list.forEach(function(t){
        var s=t2h(t.start), e=t2h(t.end); if(e==null||e<=s) e=s+0.5;
        var top=(Math.max(s,TT_HS)-TT_HS)*TT_HH, bot=(Math.min(e,TT_HE)-TT_HS)*TT_HH, ht=Math.max(bot-top,24);
        var ln=lay.ncol[t.id]||1, li=lay.lane[t.id]||0, w=span/ln, L=off+li*w;
        if(t._pr){
          var p=t._pr, pw=prWho(p);
          H+='<div class="ttg-ev ttg-pr'+(dayView?' big':'')+'" data-pid="'+esc(p.id)+'" title="'+esc('의전 · '+pw+' · '+(p.activity||'')+(p.place?(' @ '+p.place):''))+'" style="top:'+top+'px;height:'+(ht-3)+'px;left:calc('+L+'% + 2px);width:calc('+w+'% - 4px)">'+
            '<div class="ttg-evt"><span class="prtag">의전</span> '+esc(p.activity||pw||p.role||'')+'</div>'+
            '<div class="ttg-evm">'+esc(p.time)+(pw?(' · '+esc(pw)):'')+(p.place?(' · '+esc(p.place)):'')+'</div>'+
          '</div>';
          return;
        }
        var who=ttAssignees(t).map(personLabel);
        var cons=ttContacts(t).map(function(c){ return contactLabel(c)+(c.phone?(' '+c.phone):''); });
        var tip=(t.start||'')+(t.end?('–'+t.end):'')+' '+(t.title||'')+(t.place?(' @ '+t.place):'')+(who.length?(' · 담당 '+who.join(', ')):'')+(cons.length?(' · 연락처 '+cons.join(', ')):'');
        H+='<div class="ttg-ev'+(dayView?' big':'')+'" data-id="'+esc(t.id)+'" title="'+esc(tip)+'" style="top:'+top+'px;height:'+(ht-3)+'px;left:calc('+L+'% + 2px);width:calc('+w+'% - 4px);background:'+ttCatColor(t.cat)+'">'+
          '<div class="ttg-rz top" data-id="'+esc(t.id)+'" title="시작 시간 조절"></div>'+
          '<button class="ttg-del" data-id="'+esc(t.id)+'" title="이 일정 삭제" aria-label="일정 삭제">'+icon('x',12)+'</button>'+
          '<div class="ttg-evt">'+esc(t.title||'(제목 없음)')+'</div>'+
          '<div class="ttg-evm">'+esc(t.start||'')+(t.end?('–'+esc(t.end)):'')+(t.place?(' · '+esc(t.place)):'')+'</div>'+
          (who.length?'<div class="ttg-evp">'+icon('users',10)+' '+esc(who.join(', '))+'</div>':'')+
          (dayView&&cons.length?'<div class="ttg-evp con">'+icon('phone',10)+' '+esc(cons.join(', '))+'</div>':'')+
          ((t.rundown&&t.rundown.length)?'<div class="ttg-evp rd">'+icon('fileText',10)+' 식순 '+t.rundown.length+'단계</div>':'')+
          '<div class="ttg-rz bot" data-id="'+esc(t.id)+'" title="종료 시간 조절"></div>'+
        '</div>';
      });
    }
    if(dayView && prs.length){
      // 일간 뷰: 좌측 = 일반 프로그램(취재일정), 우측 = 의전 일정
      H+='<div class="ttg-grouplab L">프로그램</div><div class="ttg-grouplab R">의전</div><div class="ttg-vsplit"></div>';
      emitTT(real, 0, 49); emitTT(prs, 51, 49);
    } else {
      emitTT(real.concat(prs), 0, 100);
    }
    H+='</div>';
  });
  H+='</div>';
  box.innerHTML=H;
  box.querySelectorAll('.ttg-ev').forEach(function(el){ el.addEventListener('pointerdown',function(e){ if(e.target.closest('.ttg-del')||e.target.closest('.ttg-rz')) return; ttPointerDown(e, el.dataset.id, 'move'); }); });
  box.querySelectorAll('.ttg-rz.top').forEach(function(el){ el.addEventListener('pointerdown',function(e){ e.stopPropagation(); ttPointerDown(e, el.dataset.id, 'resize-top'); }); });
  box.querySelectorAll('.ttg-rz.bot').forEach(function(el){ el.addEventListener('pointerdown',function(e){ e.stopPropagation(); ttPointerDown(e, el.dataset.id, 'resize-bottom'); }); });
  box.querySelectorAll('.ttg-del').forEach(function(el){ el.addEventListener('pointerdown',function(e){ e.stopPropagation(); }); el.onclick=function(e){ e.stopPropagation(); deleteTT(el.dataset.id); }; });
  box.querySelectorAll('.ttg-cell').forEach(function(el){ el.onclick=function(e){
    var oy=e.clientY-el.getBoundingClientRect().top;
    var frac=Math.max(0, Math.min(0.75, snap15(oy/TT_HH)));
    openTT(null, el.dataset.day, (+el.dataset.h)+frac);
  }; });
  box.querySelectorAll('.ttg-pr[data-pid]').forEach(function(el){ el.onclick=function(e){ e.stopPropagation(); setView('protocol'); }; });
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
  var t=ttList().filter(function(x){return x.id===id;})[0]; if(!t) return;
  if(!confirm('이 일정을 삭제할까요?\n\n'+(t.title||'(제목 없음)')+'  ·  '+(t.start||'')+(t.end?('–'+t.end):''))) return;
  state.timetable=ttList().filter(function(x){return x.id!==id;});
  saveTimetable(); renderTimetable(); if(curViewMode==='staff') renderStaff(); toast('일정 삭제됨');
}
/* ----- 시간 일정 편집 모달 ----- */
var ttDraft=null;
function openTT(id, day, hour){
  var ex=id?ttList().filter(function(t){return t.id===id;})[0]:null;
  if(ex){ ttDraft=clone(ex); if(!Array.isArray(ttDraft.assignees)) ttDraft.assignees=[]; if(!Array.isArray(ttDraft.contacts)) ttDraft.contacts=[]; }
  else { var hh=(hour!=null&&!isNaN(hour))?hour:9; var pad=function(n){return (n<10?'0':'')+n+':00';};
    ttDraft={id:mkid(), day:day||'2026-08-05', start:pad(hh), end:pad(Math.min(hh+1,23)), title:'', place:'', cat:'프로그램', assignees:[], contacts:[], memo:'', rundown:[], _new:true}; }
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
    '<div class="evfld"><label>장소</label><input id="tt-f-place" type="text" class="evinput" value="'+esc(ttDraft.place)+'" placeholder="예: 메인 스타디움"></div>'+
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
  b.querySelectorAll('#tt-catset .ccolor').forEach(function(cc){ cc.addEventListener('click',function(e){ e.stopPropagation(); }); cc.addEventListener('change',function(e){ e.stopPropagation(); setTtCatColor(cc.dataset.c, cc.value); renderTimetable(); renderTTModal(); }); });
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
  b.querySelector('#tt-f-place').oninput=function(){ ttDraft.place=this.value; };
  b.querySelector('#tt-f-memo').oninput=function(){ ttDraft.memo=this.value; };
  b.querySelectorAll('#tt-rundown .rd-in').forEach(function(inp){ inp.addEventListener('input',function(){ var i=+inp.dataset.i; if(ttDraft.rundown&&ttDraft.rundown[i]) ttDraft.rundown[i][inp.dataset.f]=inp.value; }); });
  b.querySelectorAll('#tt-rundown .rd-del').forEach(function(x){ x.onclick=function(){ var i=+x.dataset.i; if(ttDraft.rundown){ ttDraft.rundown.splice(i,1); renderTTModal(); } }; });
  var rdAdd=b.querySelector('#tt-rd-add'); if(rdAdd) rdAdd.onclick=function(){ if(!Array.isArray(ttDraft.rundown)) ttDraft.rundown=[]; ttDraft.rundown.push({time:'',title:'',note:''}); renderTTModal(); };
}
function commitTT(){
  if(!ttDraft) return;
  if(!(ttDraft.title||'').trim()){ toast('일정 제목을 입력하세요'); return; }
  var sH=t2h(ttDraft.start), eH=t2h(ttDraft.end); if(eH==null||sH==null||eH<=sH) ttDraft.end=h2hhmm((sH==null?TT_HS:sH)+TT_SNAP);
  var clean={id:ttDraft.id, day:ttDraft.day, start:ttDraft.start, end:ttDraft.end, title:ttDraft.title.trim(), place:ttDraft.place||'', cat:ttDraft.cat, assignees:(ttDraft.assignees||[]).slice(), contacts:(ttDraft.contacts||[]).slice(), memo:ttDraft.memo||'', rundown:(ttDraft.rundown||[]).filter(function(r){return (r.time||r.title||r.note);}).map(function(r){return {time:r.time||'',title:r.title||'',note:r.note||''};})};
  var list=ttList(), idx=-1; for(var i=0;i<list.length;i++) if(list[i].id===clean.id){idx=i;break;}
  if(idx>=0) list[idx]=clean; else list.push(clean);
  // 반복: 선택한 다른 날짜에도 같은 일정을 독립 항목으로 추가
  var rep=(ttDraft._repeat||[]).filter(function(x){return x && x!==clean.day;});
  var addedN=0; rep.forEach(function(dy){ list.push(Object.assign({},clean,{id:mkid(),day:dy,assignees:clean.assignees.slice(),contacts:clean.contacts.slice(),rundown:(clean.rundown||[]).map(function(r){return Object.assign({},r);})})); addedN++; });
  saveTimetable(); renderTimetable(); if(curViewMode==='staff') renderStaff(); closeTT(); toast(addedN?('시간 일정 저장됨 · '+addedN+'일 반복 추가'):'시간 일정 저장됨');
}
function deleteTTCur(){
  if(!ttDraft||ttDraft._new){ closeTT(); return; }
  if(!confirm('이 시간 일정을 삭제할까요?')) return;
  state.timetable=ttList().filter(function(t){return t.id!==ttDraft.id;});
  saveTimetable(); renderTimetable(); if(curViewMode==='staff') renderStaff(); closeTT(); toast('삭제됨');
}
function addTT(){ openTT(null,'2026-08-05',9); }

/* ===== 홍보부 인원 R&R + 배치(일정표 기반) 렌더 ===== */
function renderStaff(){
  var rb=document.getElementById('roster-body');
  if(rb){ rb.innerHTML='';
    rosterList().forEach(function(m){
      var tr=document.createElement('tr');
      tr.innerHTML=
        '<td class="mk" contenteditable data-f="role">'+esc(m.role)+'</td>'+
        '<td class="mk" contenteditable data-f="name">'+esc(m.name)+'</td>'+
        '<td class="mk" contenteditable data-f="duty">'+esc(m.duty)+'</td>'+
        '<td class="mk" contenteditable data-f="channel">'+esc(m.channel)+'</td>'+
        '<td class="mk" contenteditable data-f="contact">'+esc(m.contact)+'</td>'+
        '<td><button class="rm" title="삭제">'+icon('trash',14)+'</button></td>';
      tr.querySelectorAll('td.mk').forEach(function(td){ td.addEventListener('blur',function(){ m[td.dataset.f]=td.textContent.trim(); saveRoster(); renderOfftimes(); renderDerivedPlacement(); }); });
      tr.querySelector('.rm').onclick=function(){ state.roster=rosterList().filter(function(x){return x!==m;}); renderStaff(); saveRoster(); };
      rb.appendChild(tr);
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
function addRoster(){ rosterList().push({id:mkid(),name:'',role:'',duty:'',contact:'',channel:''}); renderStaff(); saveRoster(); }

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

/* ===== render orchestration ===== */
function renderAll(){ renderHeader(); renderCalendar(); renderFilters(); renderBoard(); renderMarketing(); if(curViewMode==='dashboard') renderDashboard(); }
function renderAfterEdit(k,s,now){
  // refresh overview (calendar + board); save the affected card to server
  renderCalendar(); renderBoard();
  if(k) saveCard(k,s,now);
}
function afterDelete(k){ renderCalendar(); renderBoard(); sendDelete(k); }
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function toast(msg){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},1800);}

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
function renderDivisions(){
  var tb=document.getElementById('div-body'); if(!tb) return; tb.innerHTML='';
  divisionList().forEach(function(m){
    var tr=document.createElement('tr');
    tr.innerHTML=
      '<td class="mk" contenteditable data-f="name">'+esc(m.name||'')+'</td>'+
      '<td class="mk divfed" contenteditable data-f="federations">'+esc(m.federations||'')+'</td>'+
      '<td class="mk" contenteditable data-f="leader">'+esc(m.leader||'')+'</td>'+
      '<td class="mk" contenteditable data-f="ops">'+esc(m.ops||'')+'</td>'+
      '<td class="mk" contenteditable data-f="safety">'+esc(m.safety||'')+'</td>'+
      '<td class="mk" contenteditable data-f="support">'+esc(m.support||'')+'</td>'+
      '<td><button class="rm" title="삭제">'+icon('trash',14)+'</button></td>';
    tr.querySelectorAll('td.mk').forEach(function(td){ td.addEventListener('blur',function(){ m[td.dataset.f]=td.textContent.trim(); saveDivisions(); }); });
    tr.querySelector('.rm').onclick=function(){ state.divisions=divisionList().filter(function(x){return x!==m;}); renderDivisions(); saveDivisions(); };
    tb.appendChild(tr);
  });
}

/* ===== 운영요원 발대식 및 사전 훈련 (launch) ===== */
function defaultLaunch(){ return {
  when:'2026. 8. 4.(화) 14:00', place:'잼버리 대집회장',
  steps:[
    {id:mkid(),time:'14:00 ~ 14:10',dur:'10분',title:'개회 및 내빈소개',note:'사회자'},
    {id:mkid(),time:'14:10 ~ 14:13',dur:'3분',title:'환영사',note:'야영장'},
    {id:mkid(),time:'14:13 ~ 14:16',dur:'3분',title:'격려사',note:'총재(대회장)'},
    {id:mkid(),time:'14:16 ~ 14:19',dur:'3분',title:'잼버리기 전달',note:'대회장, 야영장'},
    {id:mkid(),time:'14:19 ~ 14:29',dur:'10분',title:'임명장 수여',note:'분단야영장'},
    {id:mkid(),time:'14:30 ~ 15:00',dur:'30분',title:'잼버리 사전 교육',note:'안전교육, 운영요원 역할'},
    {id:mkid(),time:'15:00 ~ 15:10',dur:'10분',title:'폐회 및 광고 / 기념촬영',note:'사회자'}
  ]
}; }
function launchData(){ if(!state.launch) state.launch=defaultLaunch(); if(!Array.isArray(state.launch.steps)) state.launch.steps=[]; return state.launch; }
function saveLaunch(){ debouncedPut('launchTimer', {launch: launchData()}, '발대식 저장됨'); }
function renderLaunch(){
  var L=launchData();
  var head=document.getElementById('launch-head');
  if(head){
    head.innerHTML='<div class="launchmeta"><label>일시 <span class="mk" contenteditable data-f="when">'+esc(L.when||'')+'</span></label>'+
      '<label>장소 <span class="mk" contenteditable data-f="place">'+esc(L.place||'')+'</span></label></div>';
    head.querySelectorAll('.mk').forEach(function(sp){ sp.addEventListener('blur',function(){ L[sp.dataset.f]=sp.textContent.trim(); saveLaunch(); }); });
  }
  var tb=document.getElementById('launch-body'); if(!tb) return; tb.innerHTML='';
  L.steps.forEach(function(s){
    var tr=document.createElement('tr');
    tr.innerHTML=
      '<td class="mk" contenteditable data-f="time">'+esc(s.time||'')+'</td>'+
      '<td class="mk" contenteditable data-f="dur">'+esc(s.dur||'')+'</td>'+
      '<td class="mk" contenteditable data-f="title">'+esc(s.title||'')+'</td>'+
      '<td class="mk" contenteditable data-f="note">'+esc(s.note||'')+'</td>'+
      '<td><button class="rm" title="삭제">'+icon('trash',14)+'</button></td>';
    tr.querySelectorAll('td.mk').forEach(function(td){ td.addEventListener('blur',function(){ s[td.dataset.f]=td.textContent.trim(); saveLaunch(); }); });
    tr.querySelector('.rm').onclick=function(){ L.steps=L.steps.filter(function(x){return x!==s;}); renderLaunch(); saveLaunch(); };
    tb.appendChild(tr);
  });
}

/* ===== 의전 일정 (protocol) — 별도 페이지 + (시간 지정 시) 캘린더 노출 ===== */
function defaultProtocol(){
  var P=[
    ['대회장','이찬희','총재',{'2026-08-05':'리셉션(인사말) · 개영식(인사말)','2026-08-06':'과정활동 방문 · K-POP 콘서트','2026-08-07':'분단 방문 · 아침 배식봉사(식당)','2026-08-08':'과정활동 방문 · 폐영식(인사말)','2026-08-09':'환송'}],
    ['부대회장','정복현','강원연맹장(부총재)',{'2026-08-05':'리셉션 및 개영식','2026-08-06':'저녁 배식 봉사(급식배급소) · K-POP 콘서트','2026-08-07':'영지방문','2026-08-08':'과정활동 방문 · 폐영식','2026-08-09':'환송'}],
    ['야영장','김시범','중앙치프커미셔너',{'2026-08-05':'리셉션 · 개영식(기수단 선언)','2026-08-06':'과정활동 방문 · K-POP 콘서트','2026-08-07':'아침 배식봉사(식당) · 영지방문','2026-08-08':'과정활동 방문 · 폐영식(폐영선언)','2026-08-09':'환송'}],
    ['부야영장','김상협','국제커미셔너',{'2026-08-05':'리셉션 · 개영식','2026-08-06':'K-POP 콘서트','2026-08-07':'영지방문','2026-08-08':'과정활동 방문 · 폐영식','2026-08-09':'환송'}],
    ['부야영장','최유석','중앙훈련원장',{'2026-08-05':'리셉션 및 개영식','2026-08-06':'저녁 배식 봉사(급식배급소) · K-POP 콘서트','2026-08-07':'영지방문','2026-08-08':'과정활동 방문 · 폐영식','2026-08-09':'환송'}]
  ];
  var out=[]; P.forEach(function(r){ var role=r[0],name=r[1],title=r[2],days=r[3]; Object.keys(days).forEach(function(d){ out.push({id:mkid(),role:role,name:name,title:title,date:d,time:'',activity:days[d],place:'',memo:''}); }); });
  return out;
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
function renderProtocol(){
  var tb=document.getElementById('pr-body'); if(!tb) return; tb.innerHTML='';
  // 헤더 클릭 = 그 항목 정렬(재클릭 시 방향 토글)
  document.querySelectorAll('#prtbl thead th.prh').forEach(function(th){ var f=th.getAttribute('data-sf');
    th.classList.toggle('sorted', prSort.f===f);
    th.setAttribute('data-dir', prSort.f===f?(prSort.dir>0?'▲':'▼'):'');
    th.onclick=function(){ if(prSort.f===f) prSort.dir=-prSort.dir; else { prSort.f=f; prSort.dir=1; } renderProtocol(); };
  });
  var rows=protocolList().slice().sort(function(a,b){ var f=prSort.f, av=(a[f]||'').toString(), bv=(b[f]||'').toString(); if(av<bv) return -prSort.dir; if(av>bv) return prSort.dir; return 0; });
  rows.forEach(function(m){
    var tr=document.createElement('tr');
    tr.innerHTML=
      '<td class="mk" contenteditable data-f="role">'+esc(m.role||'')+'</td>'+
      '<td class="mk" contenteditable data-f="name">'+esc(m.name||'')+'</td>'+
      '<td class="mk" contenteditable data-f="title">'+esc(m.title||'')+'</td>'+
      '<td><input type="date" class="prin" data-f="date" min="2026-06-15" max="2026-08-09" value="'+esc(m.date||'')+'"></td>'+
      '<td><input type="time" class="prin pr-time" data-f="time" value="'+esc(m.time||'')+'"></td>'+
      '<td class="mk" contenteditable data-f="activity">'+esc(m.activity||'')+'</td>'+
      '<td class="mk" contenteditable data-f="place">'+esc(m.place||'')+'</td>'+
      '<td class="mk" contenteditable data-f="memo">'+esc(m.memo||'')+'</td>'+
      '<td><button class="rm" title="삭제">'+icon('trash',14)+'</button></td>';
    tr.querySelectorAll('td.mk').forEach(function(td){ td.addEventListener('blur',function(){ m[td.dataset.f]=td.textContent.trim(); saveProtocol(); if(td.dataset.f==='activity') refreshProtocolViews(); }); });
    tr.querySelectorAll('input.prin').forEach(function(inp){ inp.addEventListener('change',function(){ m[inp.dataset.f]=inp.value; refreshProtocolViews(); }); });
    tr.querySelector('.rm').onclick=function(){ state.protocol=protocolList().filter(function(x){return x!==m;}); renderProtocol(); refreshProtocolViews(); };
    tb.appendChild(tr);
  });
}

/* ===== password gate (scout1922) ===== */
var PW='scout1922';
function wirePwGate(){
  var gate=document.getElementById('pw-gate'); if(!gate) return;
  var unlocked=false; try{ unlocked=localStorage.getItem('jamboree-plan:unlocked')==='1'; }catch(e){}
  if(unlocked){ document.documentElement.classList.add('pw-ok'); return; }
  var inp=document.getElementById('pw-input'), go=document.getElementById('pw-go'), err=document.getElementById('pw-err');
  function tryPw(){
    if((inp&&inp.value||'')===PW){ try{localStorage.setItem('jamboree-plan:unlocked','1');}catch(e){} document.documentElement.classList.add('pw-ok'); }
    else { if(err) err.textContent='비밀번호가 올바르지 않습니다.'; if(inp){ inp.value=''; inp.focus(); } }
  }
  if(go) go.onclick=tryPw;
  if(inp) inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); tryPw(); } });
  setTimeout(function(){ if(inp) inp.focus(); },60);
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
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'+
    '&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=3';
  fetch(url).then(function(r){return r.json();}).then(function(j){ wxData=j; wxLoadedAt=Date.now(); wxLoading=false; renderWeather(); })
  .catch(function(){ wxLoading=false; var el=document.getElementById('wx'); if(el){ el.innerHTML='<div class="wxerr">날씨를 불러오지 못했어요. <button class="btn sm" id="wx-retry">다시 시도</button></div>'; var b=document.getElementById('wx-retry'); if(b) b.onclick=function(){ loadWeather(true); }; } });
}
function renderWeather(){
  var el=document.getElementById('wx'); if(!el) return;
  if(!wxData){ el.innerHTML='<div class="wxload">'+(wxLoading?'날씨 불러오는 중…':'날씨 준비 중…')+'</div>'; return; }
  var d=wxData.daily||{}, cur=wxData.current||{};
  var ci=wxInfo(cur.weather_code);
  var html='<div class="wxhead">'+
    '<div class="wxnow"><span class="wxnow-ic">'+ci[0]+'</span><div><div class="wxnow-t">'+(cur.temperature_2m!=null?Math.round(cur.temperature_2m)+'°':'—')+'</div>'+
      '<div class="wxnow-s">'+ci[1]+(cur.apparent_temperature!=null?(' · 체감 '+Math.round(cur.apparent_temperature)+'°'):'')+(cur.relative_humidity_2m!=null?(' · 습도 '+Math.round(cur.relative_humidity_2m)+'%'):'')+'</div></div></div>'+
    '<div class="wxloc">강원 고성 · 잼버리로 244<br><span>실시간 기상 · Open-Meteo</span></div></div>';
  var times=d.time||[];
  html+='<div class="wxdays">';
  for(var i=0;i<times.length && i<3;i++){
    var wi=wxInfo((d.weather_code||[])[i]);
    var pop=(d.precipitation_probability_max||[])[i];
    html+='<div class="wxday'+(i===0?' today':'')+'">'+
      '<div class="wxd-lab">'+wxDayLabel(i)+'</div><div class="wxd-ic">'+wi[0]+'</div><div class="wxd-desc">'+wi[1]+'</div>'+
      '<div class="wxd-temp"><b>'+Math.round((d.temperature_2m_max||[])[i])+'°</b> <span>'+Math.round((d.temperature_2m_min||[])[i])+'°</span></div>'+
      '<div class="wxd-pop">💧 '+(pop!=null?pop:0)+'%</div></div>';
  }
  html+='</div>';
  var H=wxData.hourly||{}, ht=H.time||[], nowMs=Date.now(), startIdx=0;
  for(var j=0;j<ht.length;j++){ if(new Date(ht[j]).getTime() >= nowMs-1800000){ startIdx=j; break; } }
  var hours='';
  for(var k=startIdx;k<ht.length && k<startIdx+12;k++){
    var hi=wxInfo((H.weather_code||[])[k]); var hh=new Date(ht[k]).getHours();
    var pp=(H.precipitation_probability||[])[k];
    hours+='<div class="wxh'+(k===startIdx?' now':'')+'"><div class="wxh-t">'+(k===startIdx?'지금':(hh+'시'))+'</div>'+
      '<div class="wxh-ic">'+hi[0]+'</div><div class="wxh-deg">'+Math.round((H.temperature_2m||[])[k])+'°</div>'+
      '<div class="wxh-pop">'+(pp!=null?pp:0)+'%</div></div>';
  }
  html+='<div class="wxhours-wrap"><div class="wxhours-lab">시간별 예보 · 지금부터</div><div class="wxhours">'+hours+'</div></div>';
  el.innerHTML=html;
}

/* ===== dashboard ===== */
function renderDashboard(){
  loadWeather();
  var box=document.getElementById('dash-stats'); if(!box) return;
  var total=0, planned=0, draft=0, ready=0, meetings=0, today=todayISO(), upcoming=[];
  DAYS.forEach(function(d){
    daySlots(d).forEach(function(s){
      var e=peek(s.k), st=e.status||'planned';
      if(isMeeting(e)){ meetings++; }
      else { total++; if(st==='ready')ready++; else if(st==='draft')draft++; else planned++; }
      if(e.title && d.date>=today){ upcoming.push({d:d,s:s,e:e}); }
    });
  });
  upcoming.sort(function(a,b){ return a.d.date<b.d.date?-1:a.d.date>b.d.date?1:0; });
  var pct= total? Math.round(ready/total*100):0;
  var evs=eventList().filter(function(ev){ return ev.title && (ev.end||ev.start||'')>=today; }).sort(function(a,b){ return (a.start||'')<(b.start||'')?-1:1; });
  var rosterN=rosterList().filter(function(r){ return (r.name||'').trim()||(r.role||'').trim(); }).length;
  var ttN=ttList().length;
  var conN=contactList().filter(function(c){ return (c.name||'').trim(); }).length;
  var dd=dayDiff(EVENT_DAY, today);
  function statCard(label, big, sub, color){
    return '<div class="statcard"><div class="sc-lab">'+label+'</div><div class="sc-big" style="color:'+(color||'var(--ink)')+'">'+big+'</div><div class="sc-sub">'+(sub||'')+'</div></div>';
  }
  var html='<div class="dashgrid">';
  html+=statCard('개영까지', dd>0?('D-'+dd):(dd===0?'D-DAY':('D+'+(-dd))), '2026-08-05 개영', 'var(--c-fin)');
  html+=statCard('콘텐츠 진행', ready+' / '+total, '완료 '+pct+'% · 작성중 '+draft+' · 기획 '+planned, 'var(--st-ready)');
  html+=statCard('운영 일정', evs.length+'건', '다가오는 회의 · 공모전 · 행사', 'var(--c-intl)');
  html+=statCard('시간 일정', ttN+'건', '잼버리 일정표 (8/2~8/9)', 'var(--accent)');
  html+=statCard('인원 · 연락처', rosterN+' · '+conN, 'R&R 인원 · 취재 연락처', 'var(--ink-2)');
  html+=statCard('진행률', pct+'%', '<div class="sc-bar"><i style="width:'+pct+'%"></i></div>', 'var(--st-ready)');
  html+='</div>';
  html+='<div class="dashcols">';
  html+='<div class="dashpanel"><div class="dp-h">다가오는 콘텐츠</div>';
  if(!upcoming.length){ html+='<div class="dp-empty">예정된(제목 입력된) 콘텐츠가 없습니다.</div>'; }
  else { html+='<div class="dp-list">'; upcoming.slice(0,8).forEach(function(it){
    html+='<button class="dp-item" data-date="'+it.d.date+'" data-sk="'+esc(it.s.k)+'">'+
      '<span class="dp-d">'+it.d.label+' '+it.d.weekday+'</span>'+
      '<span class="dp-t">'+(it.e.ctype?ctchip(it.e.ctype)+' ':'')+esc(it.e.title)+'</span>'+
      '<span class="dp-st" style="background:'+STCOL[it.e.status||'planned']+'">'+STATUS_LABEL[it.e.status||'planned']+'</span></button>';
  }); html+='</div>'; }
  html+='</div>';
  html+='<div class="dashpanel"><div class="dp-h">다가오는 운영 일정</div>';
  if(!evs.length){ html+='<div class="dp-empty">예정된 운영 일정이 없습니다.</div>'; }
  else { html+='<div class="dp-list">'; evs.slice(0,8).forEach(function(ev){
    var ek=(eventColor?eventColor(ev.kind):'#7A6A57');
    html+='<button class="dp-item" data-eid="'+esc(ev.id)+'">'+
      '<span class="dp-d">'+(ev.start||'').slice(5)+(ev.end&&ev.end!==ev.start?('~'+ev.end.slice(5)):'')+'</span>'+
      '<span class="dp-t"><span class="dp-kind" style="background:'+ek+'">'+esc(ev.kind||'')+'</span> '+esc(ev.title)+'</span></button>';
  }); html+='</div>'; }
  html+='</div></div>';
  box.innerHTML=html;
  box.querySelectorAll('.dp-item[data-sk]').forEach(function(b){ b.onclick=function(){ var date=b.getAttribute('data-date'); var rec=byDate[date]; var s=rec?findSlot(rec, b.getAttribute('data-sk')):null; if(s) openSlot(date,s); }; });
  box.querySelectorAll('.dp-item[data-eid]').forEach(function(b){ b.onclick=function(){ openEvent(b.getAttribute('data-eid')); }; });
}

/* ===== wire up ===== */
/* ===== view tabs ===== */
var curViewMode='calendar';
function setView(v){
  curViewMode=v;
  var db=document.getElementById('dashboard'); if(db) db.style.display = v==='dashboard'?'':'none';
  document.getElementById('calendar').style.display  = v==='calendar'?'':'none';
  document.getElementById('content').style.display   = v==='list'?'':'none';
  document.getElementById('timetable').style.display = v==='timetable'?'':'none';
  document.getElementById('staff').style.display     = v==='staff'?'':'none';
  var cn=document.getElementById('contacts'); if(cn) cn.style.display = v==='contacts'?'':'none';
  var oi=document.getElementById('orginfo'); if(oi) oi.style.display = v==='orginfo'?'':'none';
  var pr=document.getElementById('protocol'); if(pr) pr.style.display = v==='protocol'?'':'none';
  // 마케팅 캘린더는 캘린더/리스트 뷰에서만 노출
  var mk=document.getElementById('marketing'); if(mk) mk.style.display=(v==='calendar'||v==='list')?'':'none';
  document.querySelectorAll('.vtab').forEach(function(b){ b.classList.toggle('active', b.dataset.v===v); });
  try{localStorage.setItem('jamboree-plan:view',v);}catch(e){}
  if(v==='dashboard') renderDashboard();
  if(v==='list') renderBoard();
  if(v==='timetable') renderTimetable();
  if(v==='staff') renderStaff();
  if(v==='contacts') renderContacts();
  if(v==='orginfo') renderDivisions();
  if(v==='protocol') renderProtocol();
}

function init(){
  wirePwGate();
  loadLocal();
  mergeSeedMeetings();   // 잼버리 기간 회의를 운영 일정에 보장
  // 정적 라인 아이콘 주입
  document.querySelectorAll('[data-ic]').forEach(function(el){ el.innerHTML=icon(el.getAttribute('data-ic'), +(el.getAttribute('data-ic-size')||16)); });
  renderAll();
  setInterval(renderClock,1000);
  // try server (shared board) — MERGE into local (never wipes local-only content)
  fetch('/api/jamboree-plan').then(function(r){return r.json();}).then(function(j){
    applyServer(j); mergeSeedMeetings(); saveLocal(); renderAll();
    setSt('자동 저장 · 서버 동기화됨',true);
  }).catch(function(){ setSt('로컬 편집 중 (서버 연결 안 됨)'); });

  document.getElementById('reload').onclick=reloadServer;
  document.getElementById('export').onclick=exportJSON;
  var cs=document.getElementById('cal-search');
  if(cs) cs.addEventListener('input',function(){ var v=this.value; if(searchTimer)clearTimeout(searchTimer); searchTimer=setTimeout(function(){ searchQ=v; renderCalendar(); renderBoard(); },120); });
  // 운영 일정(events) 모달
  var ae=document.getElementById('add-event'); if(ae) ae.onclick=function(){ openEvent(null); };
  document.getElementById('ev-close').onclick=closeEvent;
  document.getElementById('ev-cancel').onclick=closeEvent;
  document.getElementById('ev-save').onclick=commitEvent;
  document.getElementById('ev-del').onclick=deleteEventCur;
  document.getElementById('ev-scrim').addEventListener('click',function(e){ if(e.target===this) closeEvent(); });
  // view tabs
  document.querySelectorAll('.vtab').forEach(function(b){ b.onclick=function(){ setView(b.dataset.v); }; });
  var savedView=null; try{savedView=localStorage.getItem('jamboree-plan:view');}catch(e){}
  setView(['dashboard','calendar','list','timetable','staff','contacts','orginfo','protocol'].indexOf(savedView)>=0?savedView:'dashboard');
  var dvAdd=document.getElementById('div-add'); if(dvAdd) dvAdd.onclick=addDivision;
  var prAdd=document.getElementById('pr-add'); if(prAdd) prAdd.onclick=addProtocol;
  // add content (list view)
  var ad=document.getElementById('add-date'); var td=todayISO();
  ad.value=(td>='2026-06-15'&&td<='2026-08-09')?td:'2026-06-26';
  document.getElementById('add-content').onclick=function(){
    var d=ad.value; if(!d||!byDate[d]){ toast('범위 내 날짜를 선택하세요 (6/15~8/9)'); return; }
    var k=addContent(d); var sl=findSlot(byDate[d],k); renderAfterEdit(k,sl); openSlot(d, sl);
  };
  document.getElementById('mk-add').onclick=function(){ if(!state.marketing)state.marketing=defaultMarketing(); state.marketing.push({id:mkid(),date:'',title:'',channel:'',memo:''}); renderMarketing(); saveMarketing(); };
  var ttAdd=document.getElementById('tt-add'); if(ttAdd) ttAdd.onclick=addTT;
  var ttSeg=document.getElementById('tt-modeseg'); if(ttSeg) ttSeg.querySelectorAll('button').forEach(function(bt){ bt.onclick=function(){ ttMode=bt.dataset.m; try{localStorage.setItem('jamboree-plan:ttmode',ttMode);}catch(e){} renderTimetable(); }; });
  var rsAdd=document.getElementById('roster-add'); if(rsAdd) rsAdd.onclick=addRoster;
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
