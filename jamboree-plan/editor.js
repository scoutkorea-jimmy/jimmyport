(function(){
  var V='2.11.5';
  var U=function(n){ return 'https://esm.sh/@tiptap/'+n+'@'+V; };
  window.__ttReady=(async function(){
    try{
      var m=await Promise.all([
        import(U('core')), import(U('starter-kit')), import(U('extension-underline')),
        import(U('extension-link')), import(U('extension-image')), import(U('extension-text-align')),
        import(U('extension-highlight')), import(U('extension-subscript')), import(U('extension-superscript')),
        import(U('extension-task-list')), import(U('extension-task-item')), import(U('extension-table')),
        import(U('extension-table-row')), import(U('extension-table-header')), import(U('extension-table-cell')),
        import(U('extension-text-style')), import(U('extension-color')), import(U('extension-typography')),
        import(U('extension-placeholder'))
      ]);
      var d=function(x){ return x.default||x; };
      var extensions=[
        d(m[1]).configure({}),
        d(m[2]), d(m[3]).configure({openOnClick:false,autolink:true}), d(m[4]),
        d(m[5]).configure({types:['heading','paragraph']}),
        d(m[6]).configure({multicolor:true}),
        d(m[7]), d(m[8]), d(m[9]), d(m[10]).configure({nested:true}),
        d(m[11]).configure({resizable:true}), d(m[12]), d(m[13]), d(m[14]),
        d(m[15]), d(m[16]), d(m[17]),
        d(m[18]).configure({placeholder:'SNS 게시 문구를 입력하세요…'})
      ];
      return { Editor: m[0].Editor, extensions: extensions };
    }catch(err){ console.warn('Tiptap load failed', err); return null; }
  })();
})();
