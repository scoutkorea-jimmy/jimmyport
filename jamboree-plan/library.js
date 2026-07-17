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
// 기본 카테고리는 키/한글라벨 매핑, 그 외 사용자 정의 카테고리는 문자열 그대로가 라벨(자유 추가)
var LIB_BASE=[['plan','잼버리 운영 계획서'],['reference','참고자료'],['notice','공지사항'],['cardnews','카드뉴스 자료'],['photo','사진·기타']];
function isTextAsset(a){ return a && a.kind==='text'; }   // 텍스트형 자료(파일 없이 리치텍스트 본문)
function libBaseLabel(c){ for(var i=0;i<LIB_BASE.length;i++) if(LIB_BASE[i][0]===c) return LIB_BASE[i][1]; return null; }
function libCatLabel(c){ return libBaseLabel(c) || c || '사진·기타'; }
// 입력값(라벨 또는 키) → 저장용 카테고리 키. 기본 라벨/키는 기본 키로, 그 외는 문자열 그대로
function libCatKey(v){ v=(v||'').trim(); for(var i=0;i<LIB_BASE.length;i++) if(LIB_BASE[i][1]===v||LIB_BASE[i][0]===v) return LIB_BASE[i][0]; return v; }
function assetCat(a){ return (a.category&&String(a.category)) || (a.type==='cardnews'?'cardnews':'photo'); }
// 카테고리 목록 = 기본 3종 + 자료들이 실제 쓰는 사용자 정의 카테고리(중복 제거)
function libCats(){ var out=LIB_BASE.map(function(c){return c[0];}); libItems.forEach(function(a){ var c=assetCat(a); if(out.indexOf(c)<0) out.push(c); }); return out; }
function isImageAsset(a){ if(a.ct) return /^image\//i.test(a.ct); return /^\/api\/image\?/.test(a.url||''); }
function docLabel(ct){ ct=(ct||'').toLowerCase();
  if(/pdf/.test(ct)) return 'PDF'; if(/hwp/.test(ct)) return 'HWP';
  if(/presentation|powerpoint/.test(ct)) return 'PPT'; if(/sheet|excel/.test(ct)) return 'XLS';
  if(/word|document/.test(ct)) return 'DOC'; if(/zip|compress/.test(ct)) return 'ZIP';
  if(/mpeg|mp3/.test(ct)) return 'MP3'; if(/^audio\//.test(ct)) return 'AUDIO'; if(/^video\//.test(ct)) return 'VIDEO';
  var seg=ct.split('/').pop()||''; return (seg.split('.').pop()||'FILE').toUpperCase().slice(0,8); }
function isAudioAsset(a){ return /^audio\//i.test(a.ct||'') || /\.(mp3|m4a|wav|ogg|aac)$/i.test(a.name||''); }
function loadLibrary(){
  fetch('/api/jp-assets').then(function(r){return r.json();}).then(function(j){ libItems=(j&&j.assets)||[]; libLoaded=true; if(curViewMode==='library') renderLibrary(); else if(curViewMode==='dashboard') renderDashboard(); })
    .catch(function(){ libLoaded=true; if(curViewMode==='library') renderLibrary(); else if(curViewMode==='dashboard') renderDashboard(); });
}
function libAllTags(){ var s={}; libItems.forEach(function(a){ (a.tags||[]).forEach(function(t){ s[t]=(s[t]||0)+1; }); }); return Object.keys(s).sort(); }
/* 카드 클릭 = 자료 미리보기(무슨 자료인지 확인) — 받기는 카드 안 버튼으로 별도 */
function libCardHtml(a){
  var canDel=Auth.isAdmin()||(Auth.username&&a.author===Auth.username);
  var text=isTextAsset(a), img=!text&&isImageAsset(a);
  var thumb = text
    ? '<div class="libimg libtextthumb">'+icon('fileText',28)+'<span>'+esc(libCatLabel(assetCat(a)))+'</span></div>'
    : img ? '<div class="libimg"><img src="'+esc(a.url)+'" alt="" loading="lazy"></div>'
    : '<div class="libimg libdoc">'+icon('fileText',30)+'<span>'+esc(docLabel(a.ct))+'</span></div>';
  var tools='<button class="btn xs ghost" data-lib-open="'+esc(a.id)+'">'+icon('search',12)+' 보기</button>';
  if(!text) tools+='<a class="btn xs ghost" href="'+esc(a.url)+'" download target="_blank" rel="noopener" data-lib-dl>'+icon(img?'image':'fileText',12)+' 받기</a>';
  if(canDel) tools+='<button class="btn xs ghost danger" data-lib-del="'+esc(a.id)+'">'+icon('trash',12)+' 삭제</button>';
  return '<div class="libcard'+(text?' istext':'')+'" data-lib-open="'+esc(a.id)+'" role="button" tabindex="0" title="클릭하면 자료를 봅니다">'+thumb+
    '<div class="libmeta"><div class="libname">'+esc(a.name||'(제목 없음)')+'</div>'+
      ((a.tags&&a.tags.length)?('<div class="libtags">'+a.tags.map(function(t){return '<span>#'+esc(t)+'</span>';}).join('')+'</div>'):'')+
      '<div class="libsub">'+esc(a.authorName||'')+' · '+esc(fmtNewsTime(a.createdAt))+(!text&&a.size?(' · '+fmtMB(a.size)):'')+'</div>'+
      '<div class="libtools">'+tools+'</div>'+
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
  document.getElementById('asset-mtitle').textContent=a.name||'(제목 없음)';
  var text=isTextAsset(a), img=!text&&isImageAsset(a), pdf=!text&&isPdfAsset(a), audio=!text&&isAudioAsset(a);
  var dl=document.getElementById('asset-dl'), aop=document.getElementById('asset-open');
  var canEdit=Auth.isAdmin()||(Auth.username&&a.author===Auth.username);   // 마스터·관리자 또는 업로더 본인
  if(text){   // 텍스트형 자료 — 리치텍스트 본문(정화)만 표시, 받기·새 탭 없음
    var meta=[['구분', libCatLabel(assetCat(a))],['올린 사람', a.authorName||'—'],
      ['올린 날짜', fmtNewsTime(a.createdAt)+((a.updatedAt&&a.updatedAt!==a.createdAt)?' · 수정됨':'')]];
    document.getElementById('asset-body').innerHTML=
      '<div class="apv-text news-text">'+(a.body?sanitizeHtml(a.body):'<span class="muted">내용 없음</span>')+'</div>'+
      ((a.tags&&a.tags.length)?('<div class="libtags apv-tags">'+a.tags.map(function(t){return '<span>#'+esc(t)+'</span>';}).join('')+'</div>'):'')+
      '<dl class="apv-meta">'+meta.map(function(r){ return '<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>'; }).join('')+'</dl>';
    dl.style.display='none'; aop.style.display='none';
  } else {
    var prev;
    if(img) prev='<div class="apv apv-img"><img src="'+esc(a.url)+'" alt=""></div>';
    else if(pdf) prev='<div class="apv apv-pdf"><iframe src="'+esc(inlineUrl(a.url))+'" title="PDF 미리보기"></iframe></div>';
    else if(audio) prev='<div class="apv apv-audio">'+icon('fileText',30)+'<audio controls preload="none" src="'+esc(inlineUrl(a.url))+'"></audio></div>';
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
    dl.style.display=''; aop.style.display=''; dl.href=a.url; dl.setAttribute('download','');
  }
  var del=document.getElementById('asset-del'); del.style.display=canEdit?'':'none';
  var eb=document.getElementById('asset-edit-btn'); if(eb) eb.style.display=canEdit?'':'none';
  document.getElementById('asset-edit').style.display='none';
  document.getElementById('asset-body').style.display='';
  document.getElementById('asset-scrim').classList.add('show');
}
function closeAsset(){ document.getElementById('asset-scrim').classList.remove('show'); assetCur=null;
  var b=document.getElementById('asset-body'); if(b) b.innerHTML='';
  var e=document.getElementById('asset-edit'); if(e){ e.innerHTML=''; e.style.display='none'; } }   // iframe 정리(백그라운드 로딩 중단)
/* 자료 수정 — 이름·카테고리·태그(마스터/관리자 또는 업로더 본인). PATCH /api/jp-assets */
function openAssetEdit(){
  var a=assetCur; if(!a) return;
  if(isTextAsset(a)){ closeAsset(); openLibText(a.id); return; }   // 텍스트형은 본문까지 편집하는 전용 모달로
  document.getElementById('asset-body').style.display='none';
  var ed=document.getElementById('asset-edit'); ed.style.display='';
  ed.innerHTML=
    '<div class="fl">자료 이름</div>'+
    '<input class="ti" id="ae-name" type="text" maxlength="80" value="'+esc(a.name||'')+'">'+
    '<div class="fl">카테고리 <span class="libup-cathint">(선택 또는 새로 입력해 추가)</span></div>'+
    '<input class="ti" id="ae-cat" list="ae-catlist" maxlength="40" value="'+esc(libCatLabel(assetCat(a)))+'">'+
    '<datalist id="ae-catlist">'+libCats().map(function(c){ return '<option value="'+esc(libCatLabel(c))+'"></option>'; }).join('')+'</datalist>'+
    '<div class="fl">태그 (쉼표로 구분 · 선택)</div>'+
    '<input class="ti" id="ae-tags" type="text" value="'+esc((a.tags||[]).join(', '))+'">'+
    '<div class="ae-actions"><button class="btn ghost sm" id="ae-cancel">취소</button><button class="btn solid sm" id="ae-save">저장</button></div>';
  ed.querySelector('#ae-cancel').onclick=function(){ ed.style.display='none'; ed.innerHTML=''; document.getElementById('asset-body').style.display=''; };
  ed.querySelector('#ae-save').onclick=commitAssetEdit;
  setTimeout(function(){ var n=document.getElementById('ae-name'); n&&n.focus(); },30);
}
function commitAssetEdit(){
  var a=assetCur; if(!a) return;
  var name=(document.getElementById('ae-name').value||'').trim();
  var cat=libCatKey(document.getElementById('ae-cat').value);
  var tags=(document.getElementById('ae-tags').value||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
  fetch('/api/jp-assets',{method:'PATCH',headers:authJsonHeaders(),body:JSON.stringify({id:a.id,name:name,category:cat,tags:tags})})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } return r.json(); })
    .then(function(j){ if(j&&j.ok&&j.asset){
      for(var i=0;i<libItems.length;i++) if(libItems[i].id===a.id) libItems[i]=j.asset;
      renderLibrary(); openAsset(a.id); toast('수정됨');
    } else if(j) toast('수정 권한이 없거나 실패했습니다'); });
}
/* ===== 텍스트형 자료(참고자료·공지사항) — 리치텍스트 편집기 ===== */
var libTextEdit=null, libTextEditor=null;   // libTextEdit: {id?, name, category, body(HTML), tags}
function openLibText(id){
  if(!Auth.authed()){ toast('로그인 후 작성할 수 있습니다'); return; }
  var src=id?assetById(id):null;
  libTextEdit = (src&&isTextAsset(src))
    ? {id:src.id, name:src.name||'', category:assetCat(src), body:src.body||'', tags:(src.tags||[]).join(', ')}
    : {name:'', category:'notice', body:'', tags:''};
  document.getElementById('libtext-mtitle').textContent = (libTextEdit.id?'텍스트 자료 수정':'텍스트 자료 작성');
  renderLibTextEditor();
  document.getElementById('libtext-scrim').classList.add('show');
  setTimeout(function(){ var n=document.getElementById('lt-name'); n&&n.focus(); },40);
}
function closeLibText(){
  if(libTextEditor){ libTextEditor.destroy(); libTextEditor=null; }
  document.getElementById('libtext-scrim').classList.remove('show'); libTextEdit=null;
  var b=document.getElementById('libtext-body'); if(b) b.innerHTML='';
}
function renderLibTextEditor(){
  var b=document.getElementById('libtext-body'); if(!b||!libTextEdit) return;
  b.innerHTML=
    '<div class="fl">제목</div><input class="ti" id="lt-name" type="text" maxlength="120" placeholder="자료 제목 (예: 8월 촬영 유의사항 · 공지)" value="'+esc(libTextEdit.name)+'">'+
    '<div class="fl">구분 <span class="libup-cathint">(선택 또는 새로 입력)</span></div>'+
    '<input class="ti" id="lt-cat" list="lt-catlist" maxlength="40" value="'+esc(libCatLabel(libTextEdit.category))+'">'+
    '<datalist id="lt-catlist">'+libCats().map(function(c){ return '<option value="'+esc(libCatLabel(c))+'"></option>'; }).join('')+'</datalist>'+
    '<div class="fl">내용</div><div class="news-bodyed" id="lt-bodywrap"></div>'+
    '<div class="fl">태그 (쉼표로 구분 · 선택)</div><input class="ti" id="lt-tags" type="text" placeholder="예: 촬영, 공지, 안전" value="'+esc(libTextEdit.tags)+'">';
  document.getElementById('lt-name').oninput=function(){ libTextEdit.name=this.value; };
  document.getElementById('lt-cat').oninput=function(){ libTextEdit.category=libCatKey(this.value)||'notice'; };
  document.getElementById('lt-tags').oninput=function(){ libTextEdit.tags=this.value; };
  var wrap=document.getElementById('lt-bodywrap');
  if(libTextEditor){ libTextEditor.destroy(); libTextEditor=null; }
  var initHtml = /<[a-z][\s\S]*>/i.test(libTextEdit.body) ? libTextEdit.body : esc(libTextEdit.body).replace(/\n/g,'<br>');
  libTextEditor=mountRichEditor(wrap, initHtml, function(html){ if(libTextEdit) libTextEdit.body=html; });
}
function commitLibText(){
  if(!libTextEdit) return;
  var name=(libTextEdit.name||'').trim(), bodyHtml=(libTextEdit.body||'').trim();
  var bodyText=bodyHtml.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();
  if(!name && !bodyText){ toast('제목 또는 내용을 입력하세요'); return; }
  var cat=libCatKey(libTextEdit.category)||'notice';
  var tags=(libTextEdit.tags||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
  var editing=!!libTextEdit.id;
  var payload = editing
    ? {id:libTextEdit.id, name:name, category:cat, body:bodyHtml, tags:tags}
    : {kind:'text', name:name, category:cat, body:bodyHtml, tags:tags};
  fetch('/api/jp-assets',{method:editing?'PATCH':'POST',headers:authJsonHeaders(),body:JSON.stringify(payload)})
    .then(function(r){ if(r.status===401){ authExpired(); return null; } if(r.status===403){ toast('권한이 없습니다'); return null; } return r.json(); })
    .then(function(j){ if(!j) return;
      if(j.ok&&j.asset){
        var i=-1; for(var k=0;k<libItems.length;k++) if(libItems[k].id===j.asset.id) i=k;
        if(i>=0) libItems[i]=j.asset; else libItems.unshift(j.asset);
        closeLibText(); renderLibrary(); toast(editing?'수정됨':'텍스트 자료를 저장했습니다');
      } else toast('저장 실패');
    })
    .catch(function(){ toast('네트워크 오류'); });
}
function renderLibrary(){
  var grid=document.getElementById('lib-grid'); if(!grid) return;
  // 구분(카테고리) 탭
  var catBar=document.getElementById('lib-cats');
  if(catBar){
    var counts={}; libItems.forEach(function(a){ var c=assetCat(a); counts[c]=(counts[c]||0)+1; });
    catBar.innerHTML='<button class="libcat'+(libCat===''?' on':'')+'" data-libcat="">전체 '+libItems.length+'</button>'+
      libCats().map(function(c){ return '<button class="libcat cat-'+esc(c)+(libCat===c?' on':'')+'" data-libcat="'+esc(c)+'">'+esc(libCatLabel(c))+' '+(counts[c]||0)+'</button>'; }).join('');
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
  if(!items.length){ grid.innerHTML='<div class="news-empty">자료가 없습니다. 우측 상단 <b>텍스트 자료 작성</b> · <b>문서·파일 올리기</b> · <b>카드뉴스·사진 올리기</b>로 추가하세요.</div>'; return; }
  // 특정 구분 선택 시 그 구분만, '전체'면 구분별 섹션으로 묶어 표시
  if(libCat){
    var only=items.filter(function(a){ return assetCat(a)===libCat; });
    grid.innerHTML=only.length?only.map(libCardHtml).join(''):'<div class="news-empty">이 구분에는 자료가 없습니다.</div>';
    return;
  }
  var html='';
  libCats().forEach(function(c){
    var g=items.filter(function(a){ return assetCat(a)===c; });
    if(!g.length) return;
    html+='<div class="libsection"><div class="libsec-h">'+esc(libCatLabel(c))+' <span>'+g.length+'</span></div><div class="libgrid inner">'+g.map(libCardHtml).join('')+'</div></div>';
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
var libUp=null;   // {files:[], names:[], category, tags} — names[i] = 검색될 문서명(기본 = 파일명)
function fileBaseName(f){ return (f.name||'').replace(/\.[a-z0-9]+$/i,''); }
function openLibUpload(files, category){
  if(!Auth.authed()){ toast('로그인 후 올릴 수 있습니다'); return; }
  var arr=Array.prototype.slice.call(files||[]); if(!arr.length) return;
  libUp={ files:arr, names:arr.map(fileBaseName), category:(category==='plan'?'plan':'photo'), tags:'' };   // 버튼 기본값(모달에서 변경 가능)
  renderLibUpload();
  document.getElementById('lib-scrim').classList.add('show');
  setTimeout(function(){ var t=document.querySelector('#lib-body [data-libup-name="0"]'); t&&t.focus(); },30);
}
function closeLibUpload(){ document.getElementById('lib-scrim').classList.remove('show'); libUp=null; }
function captureLibUp(){ if(!libUp) return; var c=document.getElementById('libup-cat'); if(c) libUp.category=libCatKey(c.value)||libUp.category; var t=document.getElementById('libup-tags'); if(t) libUp.tags=t.value; }
function renderLibUpload(){
  if(!libUp) return;
  document.getElementById('lib-mtitle').textContent='자료 올리기';
  var rows=libUp.files.map(function(f,i){
    var over=f.size>MAX_FILE;
    return '<div class="libup-row'+(over?' over':'')+'">'+icon(/^image\//i.test(f.type||'')?'image':'fileText',14)+
      '<span class="libup-n">'+esc(f.name)+'</span>'+
      '<span class="libup-s">'+fmtMB(f.size)+(over?' · 100MB 초과':'')+'</span>'+
      '<button class="btn xs ghost" data-libup-del="'+i+'" aria-label="빼기">'+icon('x',12)+'</button></div>'+
      (over?'':'<input class="ti libup-name" type="text" data-libup-name="'+i+'" value="'+esc(libUp.names[i]||'')+'" maxlength="80" placeholder="검색될 문서명">');
  }).join('');
  var over=libUp.files.filter(function(f){return f.size>MAX_FILE;}).length;
  document.getElementById('lib-body').innerHTML=
    '<div class="fl">파일 ('+libUp.files.length+') — 파일마다 <b>검색될 문서명</b>을 정하세요</div><div class="libup-list">'+rows+'</div>'+
    (over?'<div class="libup-warn">'+icon('clock',13)+' 100MB를 넘는 파일 '+over+'개는 업로드에서 제외됩니다.</div>':'')+
    '<div class="fl">카테고리 <span class="libup-cathint">(선택 또는 새로 입력해 추가)</span></div>'+
    '<input class="ti" id="libup-cat" list="libup-catlist" value="'+esc(libCatLabel(libUp.category))+'" placeholder="카테고리 선택 또는 새로 입력" maxlength="40">'+
    '<datalist id="libup-catlist">'+libCats().map(function(c){ return '<option value="'+esc(libCatLabel(c))+'"></option>'; }).join('')+'</datalist>'+
    '<div class="fl">태그 (쉼표로 구분 · 선택)</div>'+
    '<input class="ti" id="libup-tags" type="text" placeholder="예: 개영식, 운영, 카드뉴스" value="'+esc(libUp.tags)+'">'+
    '<div class="libup-hint">파일 1개당 <b>100MB</b>까지 · 사진은 자동 축소(1600px) 후 저장됩니다. 문서명·태그로 자료실에서 검색됩니다.</div>';
  var btn=document.getElementById('lib-upload');
  var n=libUp.files.filter(function(f){return f.size<=MAX_FILE;}).length;
  btn.disabled=!n; btn.textContent=n?('업로드 ('+n+')'):'올릴 파일 없음';
}
function commitLibUpload(){
  if(!libUp) return;
  captureLibUp();
  var files=libUp.files, cat=libUp.category, tags=(libUp.tags||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
  var names=libUp.names.slice();
  closeLibUpload();
  uploadAssets(files, cat, tags, names);
}
function uploadAssets(files, category, tags, names){
  if(!Auth.authed()){ toast('로그인 후 올릴 수 있습니다'); return; }
  var arr=Array.prototype.slice.call(files||[]); if(!arr.length) return;
  tags=tags||[]; names=names||[];
  var over=arr.filter(function(f){ return f.size>MAX_FILE; });
  if(over.length){ toast(over[0].name+' : '+fmtMB(over[0].size)+' — 파일 1개당 100MB까지'); }
  // names[i] 는 파일과 같은 인덱스 — 초과 파일을 걸러도 쌍이 어긋나지 않게 함께 거른다
  var pairs=arr.map(function(f,i){ return {f:f, name:(names[i]||'').trim()||fileBaseName(f)}; })
    .filter(function(p){ return p.f.size<=MAX_FILE; });
  if(!pairs.length){ return; }
  var ok=0, fail=0;
  function record(d, p, ct){
    if(!(d&&d.url)) return Promise.resolve(null);
    var cat = category || (/\.png$/i.test(p.f.name||'')?'cardnews':'photo');   // 모달에서 고른(또는 새로 입력한) 카테고리 그대로
    var type = cat==='cardnews' ? 'cardnews' : 'photo';
    return fetch('/api/jp-assets',{method:'POST',headers:authJsonHeaders(),body:JSON.stringify({url:d.url,name:p.name,type:type,category:cat,ct:ct||'',size:p.f.size,tags:tags})}).then(function(r){return r.json();});
  }
  // 큰 파일이 서로 대역폭을 뺏지 않도록 순차 업로드
  (function next(i){
    if(i>=pairs.length){ libProgress(null); renderLibrary(); toast(fail?('자료 '+ok+'개 추가 · '+fail+'개 실패'):('자료 '+ok+'개 추가됨')); return; }
    var p0=pairs[i], f=p0.f, isImg=/^image\//i.test(f.type||'');
    var lbl=(pairs.length>1?('('+(i+1)+'/'+pairs.length+') '):'')+f.name+' · '+fmtMB(f.size);
    libProgress(lbl,0);
    // uploadBlob 은 URL "문자열"로 resolve — 여기서 r.json() 을 다시 부르면 안 된다(과거 버그: 이미지 업로드 전건 실패)
    var p = isImg
      ? downscale(f,1600,0.85).then(function(blob){ libProgress(lbl,50); return uploadBlob(blob); }).then(function(url){ libProgress(lbl,90); return record(url?{url:url}:null,p0,'image/jpeg'); })
      : uploadAttachment(f,function(pc){ libProgress(lbl,Math.round(pc*0.9)); }).then(function(d){ libProgress(lbl,95); return record(d,p0,(d&&d.ct)||f.type||'application/octet-stream'); });
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