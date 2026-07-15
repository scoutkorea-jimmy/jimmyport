/* krjam-planning — 자료실(자료 아카이브) 도메인
 *
 * 목적: 운영 계획서·카드뉴스·사진의 목록/미리보기/업로드/삭제.
 * 의존: core.js(esc·icon·toast·fmtMB·fmtNewsTime·downscale·uploadBlob), upload.js(uploadAttachment·MAX_FILE),
 *       그리고 세션(Auth/authHeader) — 현재 app.js 소유(남은 부채, upload.js 주석 참고).
 * 로드: upload.js 다음, app.js 보다 먼저. app.js 는 renderLibrary()/loadLibrary()/openLibUpload() 만 호출한다.
 *
 * 데이터 흐름: /api/jp-assets(GET) → libItems → renderLibrary()
 *              업로드: 파일 → openLibUpload(모달) → uploadAssets → uploadAttachment(KV|R2) → /api/jp-assets(POST)
 * 상태 소유: libItems/libLoaded/libSearch/libTag/libCat/assetCur/libUp 는 이 파일만 변경한다.
 */
var libItems=[], libLoaded=false, libSearch='', libTag='', libCat='';
var LIB_CATS=[['plan','잼버리 운영 계획서'],['cardnews','카드뉴스 자료'],['photo','사진·기타']];
function libCatLabel(c){ for(var i=0;i<LIB_CATS.length;i++) if(LIB_CATS[i][0]===c) return LIB_CATS[i][1]; return '사진·기타'; }
function assetCat(a){ if(a.category&&libCatLabel(a.category)) { for(var i=0;i<LIB_CATS.length;i++) if(LIB_CATS[i][0]===a.category) return a.category; } return (a.type==='cardnews'?'cardnews':'photo'); }
function isImageAsset(a){ if(a.ct) return /^image\//i.test(a.ct); return /^\/api\/image\?/.test(a.url||''); }
function docLabel(ct){ ct=(ct||'').toLowerCase();
  if(/pdf/.test(ct)) return 'PDF'; if(/hwp/.test(ct)) return 'HWP';
  if(/presentation|powerpoint/.test(ct)) return 'PPT'; if(/sheet|excel/.test(ct)) return 'XLS';
  if(/word|document/.test(ct)) return 'DOC'; if(/zip|compress/.test(ct)) return 'ZIP';
  var seg=ct.split('/').pop()||''; return (seg.split('.').pop()||'FILE').toUpperCase().slice(0,8); }
function loadLibrary(){
  fetch('/api/jp-assets').then(function(r){return r.json();}).then(function(j){ libItems=(j&&j.assets)||[]; libLoaded=true; if(curViewMode==='library') renderLibrary(); else if(curViewMode==='dashboard') renderDashboard(); })
    .catch(function(){ libLoaded=true; if(curViewMode==='library') renderLibrary(); else if(curViewMode==='dashboard') renderDashboard(); });
}
function libAllTags(){ var s={}; libItems.forEach(function(a){ (a.tags||[]).forEach(function(t){ s[t]=(s[t]||0)+1; }); }); return Object.keys(s).sort(); }
/* 카드 클릭 = 자료 미리보기(무슨 자료인지 확인) — 받기는 카드 안 버튼으로 별도 */
function libCardHtml(a){
  var canDel=Auth.isAdmin()||(Auth.username&&a.author===Auth.username);
  var img=isImageAsset(a);
  var thumb=img
    ? '<div class="libimg"><img src="'+esc(a.url)+'" alt="" loading="lazy"></div>'
    : '<div class="libimg libdoc">'+icon('fileText',30)+'<span>'+esc(docLabel(a.ct))+'</span></div>';
  return '<div class="libcard" data-lib-open="'+esc(a.id)+'" role="button" tabindex="0" title="클릭하면 자료를 미리 봅니다">'+thumb+
    '<div class="libmeta"><div class="libname">'+esc(a.name||'(이름 없음)')+'</div>'+
      ((a.tags&&a.tags.length)?('<div class="libtags">'+a.tags.map(function(t){return '<span>#'+esc(t)+'</span>';}).join('')+'</div>'):'')+
      '<div class="libsub">'+esc(a.authorName||'')+' · '+esc(fmtNewsTime(a.createdAt))+(a.size?(' · '+fmtMB(a.size)):'')+'</div>'+
      '<div class="libtools"><button class="btn xs ghost" data-lib-open="'+esc(a.id)+'">'+icon('search',12)+' 보기</button>'+
        '<a class="btn xs ghost" href="'+esc(a.url)+'" download target="_blank" rel="noopener" data-lib-dl>'+icon(img?'image':'fileText',12)+' 받기</a>'+
        (canDel?'<button class="btn xs ghost danger" data-lib-del="'+esc(a.id)+'">'+icon('trash',12)+' 삭제</button>':'')+'</div>'+
    '</div></div>';
}
/* ===== 자료 미리보기 모달 ===== */
var assetCur=null;
function assetById(id){ for(var i=0;i<libItems.length;i++) if(libItems[i].id===id) return libItems[i]; return null; }
function inlineUrl(u){ return u+(u.indexOf('?')>=0?'&':'?')+'inline=1'; }   // file/r2 는 기본이 attachment → 미리보기용 inline
function isPdfAsset(a){ return /pdf/i.test(a.ct||'') || /\.pdf$/i.test(a.name||''); }
function openAsset(id){
  var a=assetById(id); if(!a) return;
  assetCur=a;
  document.getElementById('asset-mtitle').textContent=a.name||'(이름 없음)';
  var img=isImageAsset(a), pdf=isPdfAsset(a);
  var prev;
  if(img) prev='<div class="apv apv-img"><img src="'+esc(a.url)+'" alt=""></div>';
  else if(pdf) prev='<div class="apv apv-pdf"><iframe src="'+esc(inlineUrl(a.url))+'" title="PDF 미리보기"></iframe></div>';
  else prev='<div class="apv apv-none">'+icon('fileText',44)+'<b>'+esc(docLabel(a.ct))+'</b>'+
      '<span>이 형식은 미리보기를 지원하지 않습니다. <b>받기</b>로 내려받아 확인하세요.</span></div>';
  var rows=[
    ['구분', libCatLabel(assetCat(a))],
    ['형식', docLabel(a.ct)+(a.ct?(' · '+a.ct):'')],
    ['용량', a.size?fmtMB(a.size):'—'],
    ['올린 사람', a.authorName||'—'],
    ['올린 날짜', fmtNewsTime(a.createdAt)],
  ];
  document.getElementById('asset-body').innerHTML=prev+
    ((a.tags&&a.tags.length)?('<div class="libtags apv-tags">'+a.tags.map(function(t){return '<span>#'+esc(t)+'</span>';}).join('')+'</div>'):'')+
    '<dl class="apv-meta">'+rows.map(function(r){ return '<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>'; }).join('')+'</dl>';
  var dl=document.getElementById('asset-dl'); dl.href=a.url; dl.setAttribute('download','');
  var del=document.getElementById('asset-del');
  del.style.display=(Auth.isAdmin()||(Auth.username&&a.author===Auth.username))?'':'none';
  document.getElementById('asset-scrim').classList.add('show');
}
function closeAsset(){ document.getElementById('asset-scrim').classList.remove('show'); assetCur=null;
  var b=document.getElementById('asset-body'); if(b) b.innerHTML=''; }   // iframe 정리(백그라운드 로딩 중단)
function renderLibrary(){
  var grid=document.getElementById('lib-grid'); if(!grid) return;
  // 구분(카테고리) 탭
  var catBar=document.getElementById('lib-cats');
  if(catBar){
    var counts={}; libItems.forEach(function(a){ var c=assetCat(a); counts[c]=(counts[c]||0)+1; });
    catBar.innerHTML='<button class="libcat'+(libCat===''?' on':'')+'" data-libcat="">전체 '+libItems.length+'</button>'+
      LIB_CATS.map(function(c){ return '<button class="libcat cat-'+c[0]+(libCat===c[0]?' on':'')+'" data-libcat="'+c[0]+'">'+esc(c[1])+' '+(counts[c[0]]||0)+'</button>'; }).join('');
  }
  var tagBar=document.getElementById('lib-tags');
  if(tagBar){ var tags=libAllTags(); tagBar.innerHTML=(libTag?'<button class="libtag on" data-libtag="">전체</button>':'')+tags.map(function(t){ return '<button class="libtag'+(libTag===t?' on':'')+'" data-libtag="'+esc(t)+'">#'+esc(t)+'</button>'; }).join(''); }
  if(!libLoaded){ grid.innerHTML='<div class="news-empty">불러오는 중…</div>'; return; }
  var q=libSearch.trim().toLowerCase();
  var items=libItems.filter(function(a){
    if(libTag && (a.tags||[]).indexOf(libTag)<0) return false;
    if(q){ var hay=[(a.name||''),(a.tags||[]).join(' '),(a.authorName||'')].join(' ').toLowerCase(); if(hay.indexOf(q)<0) return false; }
    return true;
  });
  if(!items.length){ grid.innerHTML='<div class="news-empty">자료가 없습니다. 우측 상단 <b>운영 계획서 올리기</b> 또는 <b>카드뉴스·사진 올리기</b>로 추가하세요.</div>'; return; }
  // 특정 구분 선택 시 그 구분만, '전체'면 구분별 섹션으로 묶어 표시
  if(libCat){
    var only=items.filter(function(a){ return assetCat(a)===libCat; });
    grid.innerHTML=only.length?only.map(libCardHtml).join(''):'<div class="news-empty">이 구분에는 자료가 없습니다.</div>';
    return;
  }
  var html='';
  LIB_CATS.forEach(function(c){
    var g=items.filter(function(a){ return assetCat(a)===c[0]; });
    if(!g.length) return;
    html+='<div class="libsection"><div class="libsec-h">'+esc(c[1])+' <span>'+g.length+'</span></div><div class="libgrid inner">'+g.map(libCardHtml).join('')+'</div></div>';
  });
  grid.innerHTML=html;
}
/* 업로드 진행률 바 — 100MB 파일은 오래 걸려서 토스트만으론 상태를 알 수 없다 */
function libProgress(label, pct){
  var box=document.getElementById('lib-progress'); if(!box) return;
  if(label===null){ box.style.display='none'; return; }
  box.style.display='';
  document.getElementById('lib-progress-t').textContent=label;
  document.getElementById('lib-progress-p').textContent=(pct||0)+'%';
  document.getElementById('lib-progress-f').style.width=(pct||0)+'%';
}
/* 업로드 모달 — 파일 목록·구분·태그를 한 화면에서 확인 후 올린다 (기존 window.prompt 대체) */
var libUp=null;   // {files:[], category, tags}
function openLibUpload(files, category){
  if(!Auth.authed()){ toast('로그인 후 올릴 수 있습니다'); return; }
  var arr=Array.prototype.slice.call(files||[]); if(!arr.length) return;
  libUp={ files:arr, category:category, tags:'' };
  renderLibUpload();
  document.getElementById('lib-scrim').classList.add('show');
  setTimeout(function(){ var t=document.getElementById('libup-tags'); t&&t.focus(); },30);
}
function closeLibUpload(){ document.getElementById('lib-scrim').classList.remove('show'); libUp=null; }
function renderLibUpload(){
  if(!libUp) return;
  var catLabel=libUp.category==='plan'?'잼버리 운영 계획서':'카드뉴스·사진';
  document.getElementById('lib-mtitle').textContent=catLabel+' 올리기';
  var rows=libUp.files.map(function(f,i){
    var over=f.size>MAX_FILE;
    return '<div class="libup-row'+(over?' over':'')+'">'+icon(/^image\//i.test(f.type||'')?'image':'fileText',14)+
      '<span class="libup-n">'+esc(f.name)+'</span>'+
      '<span class="libup-s">'+fmtMB(f.size)+(over?' · 100MB 초과':'')+'</span>'+
      '<button class="btn xs ghost" data-libup-del="'+i+'" aria-label="빼기">'+icon('x',12)+'</button></div>';
  }).join('');
  var over=libUp.files.filter(function(f){return f.size>MAX_FILE;}).length;
  document.getElementById('lib-body').innerHTML=
    '<div class="fl">파일 ('+libUp.files.length+')</div><div class="libup-list">'+rows+'</div>'+
    (over?'<div class="libup-warn">'+icon('clock',13)+' 100MB를 넘는 파일 '+over+'개는 업로드에서 제외됩니다.</div>':'')+
    '<div class="fl">태그 (쉼표로 구분 · 선택)</div>'+
    '<input class="ti" id="libup-tags" type="text" placeholder="예: 개영식, 운영, 카드뉴스" value="'+esc(libUp.tags)+'">'+
    '<div class="libup-hint">파일 1개당 <b>100MB</b>까지 · 사진은 자동 축소(1600px) 후 저장됩니다.</div>';
  var btn=document.getElementById('lib-upload');
  var n=libUp.files.filter(function(f){return f.size<=MAX_FILE;}).length;
  btn.disabled=!n; btn.textContent=n?('업로드 ('+n+')'):'올릴 파일 없음';
}
function commitLibUpload(){
  if(!libUp) return;
  var t=document.getElementById('libup-tags'); if(t) libUp.tags=t.value;
  var files=libUp.files, cat=libUp.category, tags=(libUp.tags||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
  closeLibUpload();
  uploadAssets(files, cat, tags);
}
function uploadAssets(files, category, tags){
  if(!Auth.authed()){ toast('로그인 후 올릴 수 있습니다'); return; }
  var arr=Array.prototype.slice.call(files||[]); if(!arr.length) return;
  tags=tags||[];
  var over=arr.filter(function(f){ return f.size>MAX_FILE; });
  if(over.length){ toast(over[0].name+' : '+fmtMB(over[0].size)+' — 파일 1개당 100MB까지'); arr=arr.filter(function(f){ return f.size<=MAX_FILE; }); }
  if(!arr.length){ return; }
  var ok=0, fail=0;
  function record(d, f, ct){
    if(!(d&&d.url)) return Promise.resolve(null);
    var cat = category==='plan' ? 'plan' : (/\.png$/i.test(f.name||'')?'cardnews':'photo');  // 미디어 업로드는 PNG=카드뉴스, 그 외=사진
    var type = cat==='cardnews' ? 'cardnews' : 'photo';
    return fetch('/api/jp-assets',{method:'POST',headers:authJsonHeaders(),body:JSON.stringify({url:d.url,name:(f.name||'').replace(/\.[a-z0-9]+$/i,''),type:type,category:cat,ct:ct||'',tags:tags,authorName:Auth.name||Auth.username})}).then(function(r){return r.json();});
  }
  // 큰 파일이 서로 대역폭을 뺏지 않도록 순차 업로드
  (function next(i){
    if(i>=arr.length){ libProgress(null); renderLibrary(); toast(fail?('자료 '+ok+'개 추가 · '+fail+'개 실패'):('자료 '+ok+'개 추가됨')); return; }
    var f=arr[i], isImg=/^image\//i.test(f.type||'');
    var lbl=(arr.length>1?('('+(i+1)+'/'+arr.length+') '):'')+f.name+' · '+fmtMB(f.size);
    libProgress(lbl,0);
    var p = isImg
      ? downscale(f,1600,0.85).then(function(blob){ libProgress(lbl,50); return uploadBlob(blob).then(function(r){return r.json();}); }).then(function(d){ libProgress(lbl,90); return record(d,f,'image/jpeg'); })
      : uploadAttachment(f,function(pc){ libProgress(lbl,Math.round(pc*0.9)); }).then(function(d){ libProgress(lbl,95); return record(d,f,(d&&d.ct)||f.type||'application/octet-stream'); });
    p.then(function(j){ if(j&&j.ok&&j.asset){ libItems.unshift(j.asset); ok++; } else fail++; next(i+1); })
     .catch(function(){ fail++; next(i+1); });
  })(0);
}
/* 서버에 삭제 요청만 — 렌더·알림 없음. {ok, reason} 반환(실패 원인을 구분해 전달). */
function requestAssetDelete(id){
  return fetch('/api/jp-assets?id='+encodeURIComponent(id),{method:'DELETE',headers:authHeader()})
    .then(function(r){
      if(r.status===401){ authExpired(); return {ok:false, reason:'auth'}; }
      return r.json().then(function(j){ return (j&&j.ok) ? {ok:true} : {ok:false, reason:'forbidden'}; });
    })
    .catch(function(){ return {ok:false, reason:'network'}; });
}
function removeAssetFromList(id){ libItems=libItems.filter(function(x){ return x.id!==id; }); }
var ASSET_DELETE_ERR={auth:'세션이 만료되었습니다. 다시 로그인하세요.', forbidden:'삭제 권한이 없습니다.', network:'네트워크 오류로 삭제하지 못했습니다.'};
function deleteAsset(id){
  if(!confirm('이 자료를 삭제할까요?')) return;
  requestAssetDelete(id).then(function(res){
    if(!res.ok){ toast(ASSET_DELETE_ERR[res.reason]||'삭제하지 못했습니다.'); return; }
    removeAssetFromList(id);
    renderLibrary();
    if(assetCur&&assetCur.id===id) closeAsset();   // 미리보기로 연 자료를 지웠으면 모달도 닫는다
    toast('삭제됨');
  });
}