// Block internal repo files from being served publicly.
// Cloudflare Pages serves every file in the output dir, and `.assetsignore`
// is NOT honored by `wrangler pages deploy`. A root _middleware runs ahead of
// static-asset serving, so we 404 the private paths and pass everything else
// (incl. /api/* functions and normal assets) straight through via next().
const BLOCKED = [
  /\.md$/i,                  // CLAUDE.md, KMS.md, FEATURES.md, README.md, DESIGN.md, ...
  /^\/wrangler\.toml$/i,     // KV namespace id, project config
  /^\/package(-lock)?\.json$/i,
  /^\/\.gitignore$/i,
  /^\/\.assetsignore$/i,
  /^\/\.claude(\/|$)/i,      // local tooling/settings
  /^\/test(\/|$)/i,          // regression suite — internal only (*.md is covered above, but the .js is not)
  /^\/scripts(\/|$)/i,       // 배포 때만 쓰는 생성 스크립트(gen-status.js) — 공개할 것이 아니다
  // Site-map original from 시설물자관리본부 (internal doc). Kept in the repo as the
  // high-res source for jamboree-plan/assets/sitemap.png, which is what the app
  // actually serves — the original itself must not be public.
  /^\/KakaoTalk_Photo_[\d-]+\.png$/i,
];

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (BLOCKED.some((re) => re.test(path))) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const res = await context.next();
  // Because this middleware wraps every request, the `_headers` no-cache rule is
  // bypassed for static assets (they fall back to Pages' default max-age=14400),
  // so new deploys can take hours to reach browsers. Force-revalidate every
  // static asset / HTML here. API routes (/api/*) keep their own cache headers.
  //
  // HTML/JS/CSS: `no-cache` (저장은 하되 매번 재검증). v0.9.259 에서 `no-store` 에서 바꿨다.
  //
  // no-store 를 골랐던 이유는 배포 중 엣지가 옛 빌드를 새 `?v=` 주소에 max-age(4시간) 동안
  // 물고 있던 사고였다(v0.9.235 - 새 HTML + 옛 CSS 로 화면이 깨졌다). 그 원인은 max-age 이지
  // '저장' 자체가 아니다. no-cache 는 max-age 를 주지 않으므로 브라우저·엣지가 항상 서버에 물어보고,
  // 바뀌지 않았으면 304(수백 바이트)만 받는다. 최신성은 그대로이고 매번 450KB 를 다시 받지 않는다.
  //
  // 되돌리려면 반드시 "배포 직후 새 HTML + 옛 JS" 조합이 나오는지부터 확인할 것.
  //
  // Images/PDFs are left alone on purpose — they are addressed by filename, so
  // a stale copy is still the right bytes, and caching them keeps the 31-page
  // flipbook cheap. (Observed live: they keep Pages' default max-age=14400
  // regardless of what is set here, so do not expect `no-cache` on them.)
  if (!path.startsWith("/api/")) {
    const cc = "no-cache";
    // Static-asset responses can carry immutable headers; fall back to rebuilding.
    try {
      res.headers.set("Cache-Control", cc);
      return res;
    } catch {
      try {
        const r = new Response(res.body, res);
        r.headers.set("Cache-Control", cc);
        return r;
      } catch {
        return res;
      }
    }
  }
  return res;
}
