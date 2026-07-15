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
  /^\/CNAME$/i,              // legacy GitHub Pages domain file
  /^\/\.claude(\/|$)/i,      // local tooling/settings
  /^\/test(\/|$)/i,          // regression suite — internal only (*.md is covered above, but the .js is not)
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
  // static asset / HTML here (ETag → 304 when unchanged). API routes (/api/*)
  // keep their own cache headers untouched.
  if (!path.startsWith("/api/")) {
    try {
      const r = new Response(res.body, res);
      r.headers.set("Cache-Control", "no-cache");
      return r;
    } catch {
      return res;
    }
  }
  return res;
}
