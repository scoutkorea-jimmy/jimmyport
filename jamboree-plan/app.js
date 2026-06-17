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
  tag:'<path d="M3 11V4a1 1 0 0 1 1-1h7l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.2"/>'
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
var FIXED_EVENTS = {
  '2026-07-06':'참여형·AI 콘텐츠 이벤트 접수 시작',
  '2026-07-26':'이벤트 접수 마감',
  '2026-08-05':'이벤트 결과/콘텐츠 공개'
};

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
    // 소식 자동 생성 제거 — 소식 콘텐츠는 사용자가 직접 추가(＋)
    if(FIXED_EVENTS[date])
      items.push({type:'event',category:'이벤트',seedTitle:FIXED_EVENTS[date]});
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
function stateDefaults(){ return {edits:{}, extra:{}, marketing:null, header:null, hidden:{}, history:{}, meta:{}, notes:{}, types:null}; }
function defaultTypes(){ return ['카드뉴스','영상','이미지카드','웹포스터','보도자료','릴스/숏폼']; }
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
}
function saveTypes(){
  saveLocal();
  fetch('/api/jamboree-plan',{method:'PUT',headers:{'content-type':'application/json'},
    body:JSON.stringify({types:typeList(), author:authorVal()})}).catch(function(){});
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
  var ctype=e.ctype?('<span class="ctchip">'+esc(e.ctype)+'</span> '):'';
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
    // 실제 콘텐츠(제목 있음)=카드처럼 부각 / 의미있는 시드(참가국·역할·이벤트)=옅게 / 빈 슬롯=작은 칩
    var minis='';
    vis.forEach(function(s){
      var e=peek(s.k), typ=e.ctype?('<span class="ctchip">'+esc(e.ctype)+'</span>'):'';
      if(e.title){
        html+='<div class="cline filled citem" data-sk="'+s.k+'">'+typ+esc(e.title)+'</div>';
      } else if(s.seedTitle){
        html+='<div class="cline seed citem" data-sk="'+s.k+'">'+esc(s.seedTitle)+'</div>';
      } else {
        minis+='<span class="cmini citem" data-sk="'+s.k+'">'+TYPE_LABEL[s.type]+'</span>';
      }
    });
    if(minis) html+='<div class="cminis">'+minis+'</div>';
    html+='<button class="cadd" title="이 날짜에 콘텐츠 추가" aria-label="콘텐츠 추가">'+icon('plus',13)+'</button>';
    cell.innerHTML=html;
    (function(rc){
      // 콘텐츠는 콘텐츠 단위로 열림(일자 단위 X)
      cell.querySelectorAll('.citem[data-sk]').forEach(function(el){
        el.addEventListener('click',function(ev){ ev.stopPropagation(); var sl=findSlot(byDate[rc.date], el.getAttribute('data-sk')); if(sl) openSlot(rc.date, sl); });
        el.addEventListener('mouseenter',function(){ showCalTip(el, rc.date); });
        el.addEventListener('mouseleave',hideCalTip);
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
  row('전체', [['all',null,'전체 보기']]);
  row('유형', [['type','dcount','D-count'],['type','event','이벤트'],['type','extra','추가']]);
  row('단계', ['한국 대표단','외국 대표단','피날레','휴지기'].map(function(p){return ['phase',p,p];}));
  row('채널', CHANNELS.map(function(c){return ['channel',c,c];}));
  row('상태', STAGES.map(function(st){return ['status',st[0],st[1]];}));
  var tl=typeList(); if(tl.length) row('종류', tl.map(function(t){return ['ctype',t,t];}));
}
function renderBoard(){
  var board=document.getElementById('board'); if(!board) return;
  board.innerHTML='';
  var cols={planned:[],draft:[],ready:[]}, total=0, ready=0, started=0;
  DAYS.forEach(function(d){
    daySlots(d).forEach(function(s){
      var e=peek(s.k), st=e.status||'planned';
      total++; if(st==='ready') ready++; if(st!=='planned') started++;
      (cols[st]||cols.planned).push({d:d,s:s,e:e});
    });
  });
  STAGES.forEach(function(def){
    var items=cols[def[0]].filter(function(it){ return matchFilter(it.d, it.s, it.e) && matchSearch(it.d, it.s, it.e); });
    var col=document.createElement('div'); col.className='col';
    col.innerHTML='<div class="colh"><span class="pin" style="background:'+STCOL[def[0]]+'"></span>'+def[1]+'<span class="cnt">'+items.length+'</span></div>';
    var cards=document.createElement('div'); cards.className='cards';
    if(!items.length){ var em=document.createElement('div'); em.className='colempty'; em.textContent='없음'; cards.appendChild(em); }
    items.forEach(function(it){ try{ cards.appendChild(cardEl(it.d,it.s,it.e)); }catch(err){ console.warn('card render skip',err); } });
    col.appendChild(cards); board.appendChild(col);
  });
  document.getElementById('cnt-count').textContent=total+'개 슬롯';
  var pct= total? Math.round(ready/total*100):0;
  document.getElementById('pfill').style.width=pct+'%';
  document.getElementById('ptext').textContent='완료 '+ready+'/'+total+' ('+pct+'%) · 진행 시작 '+started;
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
  var card=document.createElement('div'); card.className='card'; card.style.borderLeftColor=col;
  card.innerHTML=
    '<div class="crow1"><span class="dlab">'+(d.dlabel||'—')+'</span><span>'+d.label+' '+d.weekday+(e.time?(' · '+esc(e.time)):'')+'</span>'+
      '<span class="typebadge t-'+s.type+'" style="margin-left:auto">'+TYPE_LABEL[s.type]+'</span></div>'+
    '<div class="ccat" style="color:'+col+'">'+s.category+'</div>'+
    '<div class="ctitle'+(title?'':' empty')+'">'+(e.ctype?'<span class="ctchip">'+esc(e.ctype)+'</span> ':'')+(title?esc(title):'제목 미입력 — 클릭해 작성')+'</div>'+
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
  var wrap=document.createElement('div'); wrap.className='slot';
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
  metaFld.innerHTML='<label>게시 예정 시간 · 담당자</label>';
  var mrow=document.createElement('div'); mrow.className='row2';
  var timeInp=document.createElement('input'); timeInp.type='time'; timeInp.value=e.time||''; timeInp.oninput=function(){ e.time=timeInp.value; mark(); };
  var ownerInp=inputEl('text', e.owner||'', '담당자 이름', function(v){ e.owner=v; mark(); });
  mrow.appendChild(timeInp); mrow.appendChild(ownerInp); metaFld.appendChild(mrow);
  var postWrap=document.createElement('label'); postWrap.className='posttoggle'+(e.posted?' on':'');
  var pchk=document.createElement('input'); pchk.type='checkbox'; pchk.checked=!!e.posted;
  var pstat=document.createElement('span'); pstat.className='poststat';
  function pstatTxt(){ return e.posted?('게시 완료'+(e.postedAt?(' · '+fmtDateTime(e.postedAt)):'')):'아직 게시 전'; }
  pstat.textContent=pstatTxt();
  pchk.onchange=function(){ e.posted=pchk.checked; e.postedAt=pchk.checked?new Date().toISOString():''; postWrap.classList.toggle('on',pchk.checked); pstat.textContent=pstatTxt(); mark(); };
  postWrap.appendChild(pchk); postWrap.appendChild(document.createTextNode(' 게시 완료 ')); postWrap.appendChild(pstat);
  metaFld.appendChild(postWrap); wrap.appendChild(metaFld);

  // 채널 (복수 선택)
  var chWrap=document.createElement('div'); chWrap.className='fld';
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
  var linkFld=document.createElement('div'); linkFld.className='fld';
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
  var tagFld=document.createElement('div'); tagFld.className='fld';
  tagFld.innerHTML='<label>해시태그</label>';
  tagFld.appendChild(inputEl('text', e.tags||'', '#한국잼버리 #스카우트 #Goseong2026', function(v){ e.tags=v; mark(); }));
  wrap.appendChild(tagFld);

  // images (max 10) — 대부분 카드뉴스
  var imgFld=document.createElement('div'); imgFld.className='fld';
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
  var hsec=document.createElement('div'); hsec.className='fld histsec';
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
  ninp.onkeydown=function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); var v=ninp.value.trim(); if(v){ addNote(s.k, v); ninp.value=''; } } };
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
  function commit(v){ v=(v||'').trim(); e.ctype=v; if(v && typeList().indexOf(v)<0){ if(!state.types) state.types=defaultTypes().slice(); state.types.push(v); saveTypes(); } mark(); }
  function renderMenu(){
    menu.innerHTML='';
    var list=typeList();
    list.forEach(function(t){
      var row=document.createElement('div'); row.className='typeopt';
      var lab=document.createElement('span'); lab.className='typelab'; lab.textContent=t;
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
  inp.onkeydown=function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); commit(inp.value); close(); inp.blur(); } else if(ev.key==='Escape'){ close(); } };
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

/* ===== render orchestration ===== */
function renderAll(){ renderHeader(); renderCalendar(); renderFilters(); renderBoard(); renderMarketing(); }
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

/* ===== wire up ===== */
/* ===== view tabs ===== */
var curViewMode='calendar';
function setView(v){
  curViewMode=v;
  document.getElementById('calendar').style.display = v==='calendar'?'':'none';
  document.getElementById('content').style.display  = v==='list'?'':'none';
  document.querySelectorAll('.vtab').forEach(function(b){ b.classList.toggle('active', b.dataset.v===v); });
  try{localStorage.setItem('jamboree-plan:view',v);}catch(e){}
  if(v==='list') renderBoard();
}

function init(){
  loadLocal();
  // 정적 라인 아이콘 주입
  document.querySelectorAll('[data-ic]').forEach(function(el){ el.innerHTML=icon(el.getAttribute('data-ic'), +(el.getAttribute('data-ic-size')||16)); });
  renderAll();
  setInterval(renderClock,1000);
  // try server (shared board) — MERGE into local (never wipes local-only content)
  fetch('/api/jamboree-plan').then(function(r){return r.json();}).then(function(j){
    applyServer(j); saveLocal(); renderAll();
    setSt('자동 저장 · 서버 동기화됨',true);
  }).catch(function(){ setSt('로컬 편집 중 (서버 연결 안 됨)'); });

  document.getElementById('reload').onclick=reloadServer;
  document.getElementById('export').onclick=exportJSON;
  var cs=document.getElementById('cal-search');
  if(cs) cs.addEventListener('input',function(){ var v=this.value; if(searchTimer)clearTimeout(searchTimer); searchTimer=setTimeout(function(){ searchQ=v; renderCalendar(); renderBoard(); },120); });
  // view tabs
  document.querySelectorAll('.vtab').forEach(function(b){ b.onclick=function(){ setView(b.dataset.v); }; });
  var savedView=null; try{savedView=localStorage.getItem('jamboree-plan:view');}catch(e){}
  setView(savedView==='list'?'list':'calendar');
  // add content (list view)
  var ad=document.getElementById('add-date'); var td=todayISO();
  ad.value=(td>='2026-06-15'&&td<='2026-08-09')?td:'2026-06-26';
  document.getElementById('add-content').onclick=function(){
    var d=ad.value; if(!d||!byDate[d]){ toast('범위 내 날짜를 선택하세요 (6/15~8/9)'); return; }
    var k=addContent(d); var sl=findSlot(byDate[d],k); renderAfterEdit(k,sl); openSlot(d, sl);
  };
  document.getElementById('mk-add').onclick=function(){ if(!state.marketing)state.marketing=defaultMarketing(); state.marketing.push({id:mkid(),date:'',title:'',channel:'',memo:''}); renderMarketing(); saveMarketing(); };
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
