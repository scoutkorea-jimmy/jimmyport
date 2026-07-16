/* krjam-planning — 업로드 인프라 계층
 *
 * 목적: 첨부 파일을 어디에 저장할지(KV vs R2) 결정하고 업로드를 수행한다.
 *       자료실·콘텐츠 모달 첨부가 함께 쓰므로 특정 도메인에 두지 않는다.
 * 의존: core.js. 그리고 세션 헤더(authHeader/authJsonHeaders) — 현재 app.js 소유.
 *       ⚠️ 남은 부채: 세션 계층(Auth)이 아직 app.js 에 있어 이 파일이 app.js 전역을 참조한다.
 *          Auth 를 session.js 로 분리하면 core → session → upload 로 단방향이 완성된다.
 * 로드: core.js 다음, app.js 보다 먼저.
 *
 * 저장소 선택 규칙: KV 는 값 1개당 25MiB 가 플랫폼 한계라 큰 파일을 담을 수 없다.
 *   ~8MB  : /api/file (KV)  — 기존 자료와 동일 경로
 *   8MB~  : /api/r2   (R2)  — 8MiB 청크 멀티파트
 */
/* 첨부 용량 — R2 도입으로 파일 1개당 100MB. 8MB 초과분은 8MiB 청크 멀티파트로 R2 에 저장. */
var MAX_FILE=100*1024*1024, R2_SWITCH=8*1024*1024, R2_CHUNK=8*1024*1024;
/* 첨부 업로드 — 8MB 이하는 기존 KV(/api/file), 초과분은 R2 멀티파트(최대 100MB).
   KV 는 값 1개당 25MiB 가 한계라 큰 파일은 R2 로만 갈 수 있다. */
function uploadAttachment(file, onProg){
  if(file.size>R2_SWITCH) return uploadLarge(file,onProg);
  var h=Object.assign({'content-type':(file.type||'application/octet-stream'),'x-filename':encodeURIComponent(file.name)}, authHeader());
  return fetch('/api/file',{method:'POST',headers:h,body:file})
    .then(function(r){return r.json();}).then(function(j){ return j&&j.url?j:null; });
}
/* R2 멀티파트: create → 8MiB 청크 PUT 반복 → complete. 실패 시 abort.
   청크로 쪼개는 이유 = Workers 요청 본문 100MB 제한을 피하고 진행률을 얻기 위함. */
function uploadLarge(file, onProg){
  var ct=file.type||'application/octet-stream';
  return fetch('/api/r2?action=create',{method:'POST',headers:authJsonHeaders(),body:JSON.stringify({name:file.name,ct:ct,size:file.size})})
    .then(function(r){return r.json();})
    .then(function(j){
      if(!(j&&j.ok)) throw new Error((j&&j.error)||'create_failed');
      var key=j.key, uploadId=j.uploadId, parts=[], n=Math.max(1,Math.ceil(file.size/R2_CHUNK));
      function put(i){
        if(i>=n) return Promise.resolve();
        var blob=file.slice(i*R2_CHUNK, Math.min(file.size,(i+1)*R2_CHUNK));
        return fetch('/api/r2?action=part&key='+encodeURIComponent(key)+'&uploadId='+encodeURIComponent(uploadId)+'&part='+(i+1),
                     {method:'PUT',headers:authHeader(),body:blob})
          .then(function(r){return r.json();})
          .then(function(p){
            if(!(p&&p.ok)) throw new Error((p&&p.error)||'part_failed');
            parts.push({partNumber:p.partNumber,etag:p.etag});
            if(onProg) onProg(Math.round((i+1)/n*100));
            return put(i+1);
          });
      }
      return put(0)
        .then(function(){
          return fetch('/api/r2?action=complete',{method:'POST',headers:authJsonHeaders(),
                       body:JSON.stringify({key:key,uploadId:uploadId,parts:parts,name:file.name})}).then(function(r){return r.json();});
        })
        .then(function(d){ if(!(d&&d.ok)) throw new Error((d&&d.error)||'complete_failed'); return d; })
        .catch(function(err){
          fetch('/api/r2?action=abort',{method:'POST',headers:authJsonHeaders(),body:JSON.stringify({key:key,uploadId:uploadId})}).catch(function(){});
          throw err;
        });
    });
}
