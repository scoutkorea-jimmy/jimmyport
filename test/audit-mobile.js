/* 홍보부·급식본부 모바일 실측 감사 (v0.9.275)
   사용자 최우선 요구: 두 보드는 **모바일 최적화가 최우선**이다. 그래서 화면마다 실제 폰 크기로 열어 잰다.
   ⚠️ 가로 스크롤 컨테이너(표·탭바) 안에서 화면 밖으로 나가는 것은 정상이므로 제외한다 —
      그걸 세면 진짜 문제(칸 밖으로 밀려난 글자)가 묻힌다.
   ⚠️ 실패하면 종료코드 1 — 회귀 스위트가 그대로 쓴다.
   원래 감사 설명: — 사용자 최우선 요구(모바일 최적화) 기준으로 잰다.
   ① 가로 넘침 ② 조작 요소 40px ③ 글자 13px ④ 글자 단위 줄바꿈 ⑤ 화면 밖으로 나간 요소
   ⑥ 한 줄 글자수(너무 길면 못 읽는다) ⑦ 겹침(버튼이 다른 요소에 가려짐) */
const puppeteer=require('puppeteer-core'); const http=require('http'); const fs=require('fs'); const path=require('path');
const path0=require('path'); const ROOT=path0.resolve(__dirname,'..'); const PORT=8911;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jsx':'text/jsx'};
// v0.9.295 — 급식본부 종료로 홍보부만 남았다.
const R={'/krjam-planning':'/krjam-planning.html'};
const NEWS=[{id:'n1',title:'개영식 현장 스케치 물놀이존 취재기',subtitle:'첫날 밤, 4만 명의 함성이 울려 퍼졌다',body:'<p>본문</p>',images:[],tags:['개영식','현장','주경기장'],stage:'published',cardnewsDone:true,photographer:'김사진',reporter:'박취재',depts:['기획조정본부','운영본부','급식편의본부'],priority:3.5,en:'need',author:'jimmy',authorName:'박지민',createdAt:'2026-08-05T22:10:00Z',comments:[{id:'c1',username:'kim',author:'김검수',text:'사진 교체 바랍니다',ts:'2026-08-06T01:00:00Z',v:1}]}];
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);
  if(p==='/api/hit'){r.writeHead(204);return r.end();}
  if(p.startsWith('/api/')){r.writeHead(200,{'content-type':'application/json'});
    return r.end(JSON.stringify({ok:true,articles:NEWS,press:[],tips:[],assets:[],items:[],duties:{},
      meals:{crew_n:{'2026-08-05':{b:'시리얼',l:'유닛 자율',d:'불고기'}},crew_s:{},staff:{'2026-08-05':{b:'샐러드',l:'간편식',d:'제육볶음'}}},
      slots:{},types:[],events:[],ttcats:[],offtimes:{},marketing:[],contacts:[],divisions:[],protocol:[],mappos:{},shoots:[],timetable:[],roster:[],staff:[],shifts:[]}));}
  if(R[p])p=R[p]; const f=path.join(ROOT,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('nf');}
  r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'}); r.end(fs.readFileSync(f));});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const PROBE=()=>{
  const W=window.innerWidth;
  const vis=el=>{const r=el.getBoundingClientRect();if(r.width<1||r.height<1)return false;
    const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity>0.1;};
  const label=el=>{const c=String(el.className||'').trim().split(/\s+/).filter(Boolean).slice(0,2).join('.');
    return el.tagName.toLowerCase()+(el.id?'#'+el.id:(c?'.'+c:''));};
  const out={over:document.documentElement.scrollWidth-W,tap:[],small:[],charbreak:[],outside:[]};
  document.querySelectorAll('*').forEach(el=>{
    if(!vis(el))return;
    const cs=getComputedStyle(el),r=el.getBoundingClientRect();
    const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length);
    if(own&&parseFloat(cs.fontSize)<13)out.small.push(parseFloat(cs.fontSize)+'px '+label(el));
    const ty=(el.getAttribute&&el.getAttribute('type'))||'';
    const exempt=/^(checkbox|radio|range|color)$/.test(ty);
    const ctl=el.tagName==='BUTTON'||el.tagName==='SELECT'||el.tagName==='TEXTAREA'||
      (el.tagName==='INPUT'&&!exempt)||(el.tagName==='A'&&cs.display!=='inline');
    if(ctl&&r.height<39.5&&!/news-tagx|ac-del|\bx\b|ttb/.test(String(el.className)))out.tap.push(r.height.toFixed(1)+'px '+label(el));
    if(own&&cs.wordBreak==='break-all')out.charbreak.push(label(el));
    // 가로 스크롤 컨테이너 안에 있으면 화면 밖으로 나가는 게 정상이다(표·탭바) → 제외
    if(r.right>W+1&&r.width>40){
      let sc=false;
      for(let a=el.parentElement;a;a=a.parentElement){
        const cs2=getComputedStyle(a);
        if(/(auto|scroll)/.test(cs2.overflowX)&&a.scrollWidth>a.clientWidth+1){sc=true;break;}
      }
      if(!sc)out.outside.push(Math.round(r.right-W)+'px '+label(el));
    }
  });
  ['over','tap','small','charbreak','outside'].forEach(k=>{if(Array.isArray(out[k]))out[k]=[...new Set(out[k])].slice(0,6);});
  return out;
};
(async()=>{await new Promise(r=>srv.listen(PORT,r));
  const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox']});
  const VP=[['iPhone SE 375',{width:375,height:667,isMobile:true,hasTouch:true,deviceScaleFactor:2}],
            ['iPhone 390',{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:3}],
            ['작은폰 360',{width:360,height:740,isMobile:true,hasTouch:true,deviceScaleFactor:2}]];
  const res={};
  for(const [vn,vp] of VP){
    // 홍보부 — 12개 화면
    const p=await b.newPage(); await p.setViewport(vp);
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.evaluateOnNewDocument(()=>{localStorage.setItem('jamboree-plan:session',JSON.stringify({token:'T',name:'박지민',username:'jimmy',role:'admin',type:'홍보부',tabs:[],exp:Date.now()+9e6}));});
    await p.goto(`http://localhost:${PORT}/krjam-planning`,{waitUntil:'networkidle2'}); await wait(1500);
    for(const v of ['dashboard','calendar','list','news','press','tips','timetable','staff','protocol','library','meals','contacts']){
      await p.evaluate(x=>setView(x),v); await wait(350);
      const r=await p.evaluate(PROBE);
      const hit=['over','tap','small','charbreak','outside'].filter(k=>k==='over'?r.over>0:r[k].length);
      if(hit.length)(res['홍보부 '+vn]=res['홍보부 '+vn]||{})[v]=r;
    }
    if(errs.length)(res['홍보부 '+vn]=res['홍보부 '+vn]||{}).errors=errs.slice(0,3);
    await p.close();
  }
  const groups=Object.keys(res);
  if(!groups.length){ console.log('  PASS 모바일 실측 — 가로 넘침·조작 40px·글자 13px·글자단위 줄바꿈·칸 밖 밀림 0건');
    console.log('\n결과: 1/1 통과'); await b.close(); srv.close(); process.exit(0); }
  console.log(JSON.stringify(res,null,1));
  console.log('  FAIL 모바일 실측 — ' + groups.length + '개 화면군에서 문제');
  console.log('\n결과: 0/1 통과');
  await b.close(); srv.close(); process.exit(1);})();
