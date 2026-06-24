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
];

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (BLOCKED.some((re) => re.test(path))) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return context.next();
}
