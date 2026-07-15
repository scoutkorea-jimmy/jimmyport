/* krjam-planning — core 유틸리티 계층
 *
 * 목적: 앱 어디서나 쓰는 leaf 헬퍼(문자열·날짜·아이콘·토스트·이미지 업로드)를 한곳에 모은다.
 * 의존성: 없음. 이 파일은 app.js 의 상태(state/Auth/렌더러)를 절대 참조하지 않는다.
 *         의존 방향은 항상 app.js → core.js 단방향이며, 반대 방향이 생기면 그 코드는 여기 있으면 안 된다.
 * 로드: app.js 보다 먼저 (classic script, 전역 공유).
 *
 * ⚠️ 여기 추가해도 되는 것 = 입력을 받아 결과를 반환하거나 자기 DOM 조각만 만지는 함수.
 *    특정 도메인(자료실/제보/일정표) 규칙은 여기 두지 말 것 — 해당 기능 근처에 둔다.
 */

/* ===== 요일 ===== */
var WD = ['일','월','화','수','목','금','토'];
var WDS = WD;   // 과거에 같은 배열이 WD/WDS 두 이름으로 중복 선언돼 있어 별칭으로 통일

/* ===== 날짜 ===== */
function ymd(s){ var p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function iso(dt){ return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'); }
function dayDiff(a,b){ return Math.round((ymd(a)-ymd(b))/86400000); }
function todayISO(){ var n=new Date(); return iso(new Date(n.getFullYear(),n.getMonth(),n.getDate())); }

/* ===== 문자열·포맷 ===== */
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function pad2(n){ return String(n).padStart(2,'0'); }
function fmtMB(b){ return (b/1048576).toFixed(b<10485760?1:0)+'MB'; }
// 사이트 전역 24시간제 규칙 — toLocaleTimeString 은 OS 로케일에 따라 12h 가 되어 쓰지 않는다
function fmtNewsTime(isoStr){
  try{ var d=new Date(isoStr); return d.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'})+' '+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
  catch(e){ return ''; }
}
// 사용자가 'example.com' 처럼 스킴 없이 넣는 경우가 많아 https 를 보완
function normUrl(v){ v=(v||'').trim(); if(v && !/^https?:\/\//i.test(v) && /\./.test(v) && !/\s/.test(v)) v='https://'+v; return v; }
function htmlToText(html){
  return (html||'').replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi,'\n').replace(/<br\s*\/?>/gi,'\n')
    .replace(/<li[^>]*>/gi,'• ').replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/\n{3,}/g,'\n\n').trim();
}
var _mk=0; function mkid(){ _mk++; return 'mk'+Date.now().toString(36)+_mk; }

/* ===== 라인 아이콘 (Feather/Lucide 스타일 인라인 SVG) ===== */
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
  grid:'<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'
};
function icon(name,size){
  return '<svg class="ic" viewBox="0 0 24 24" width="'+(size||16)+'" height="'+(size||16)+'" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICON[name]||'')+'</svg>';
}

/* ===== 알림 · 클립보드 ===== */
function toast(msg){
  var t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); },1800);
}
function copyText(txt, okMsg){
  try{
    if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(function(){ toast(okMsg||'복사되었습니다'); }).catch(function(){ toast('복사 실패'); }); return; }
    var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); toast(okMsg||'복사되었습니다');   // execCommand = 구형 브라우저 폴백
  }catch(e){ toast('복사 실패'); }
}

/* ===== 이미지 다운스케일 · 업로드 ===== */
// 원본 그대로 올리면 KV 한도(10MB)를 넘기 쉬워 캔버스로 축소 후 JPEG 로 재인코딩
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
    .then(function(r){ return r.json(); }).then(function(j){ return j&&j.url?j.url:null; });
}
