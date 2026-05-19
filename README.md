# Jimmy Park Homepage

Static site for [jimmypark.net](https://jimmypark.net/). Hosted on **Cloudflare Pages** (project: `jimmyport`). GitHub repo is source-only — git push **alone** does not deploy. Deploys happen via `wrangler pages deploy` or the GitHub Actions workflow in `.github/workflows/deploy-on-push.yml`.

## Architecture

All site copy lives in JSON files under `data/`. `index.html` keeps Korean fallback text so the site stays readable if JS or a fetch fails. `script.js` reads the JSON and renders every section.

| File | Purpose |
|---|---|
| `index.html`              | Homepage markup + Korean fallback copy |
| `script.js`               | Homepage runtime — loads JSON, renders sections, KR/EN toggle, portfolio modal, CF analytics inject |
| `styles.css`              | Light-theme visual system + admin layout + modal |
| `version-watch.js`        | Footer "live build" pill + full-screen "new build" modal |
| `manage.html` / `manage.js` | Unified admin — every text on the site is editable here |
| `manage-editor.js`        | ES-module Tiptap editor for KMS / Wiki / Design Guide admin tabs |
| `data/site-config.json`   | Hero / Profile / Experience / Career labels / Portfolio labels / Principles / Contact / SEO / analytics |
| `data/portfolio.json`     | Portfolio item array — `{ type: video\|pm, title, role, overview, youtubeUrl, detail_ko/en, thumbnail }` |
| `data/career.json`        | Chronological company experience |
| `data/kms.json`           | Internal feature specifications (admin only) |
| `data/wiki.json`          | Operator notes / procedures / lessons (admin only) |
| `data/design.json`        | Design guide — colour / typography / spacing / motion / components / tone (admin only) |
| `VERSION` / `ADMIN_VERSION` | Site and admin version stamps polled by `version-watch.js` |
| `CNAME`                   | Custom domain pointer |

## Manage admin — `/manage`

`manage.html` edits every text on the site. Three save paths:

1. **Local draft** — every change auto-saves to `localStorage`. Open `/` in the same browser to preview before committing.
2. **JSON 다운로드** — download the changed JSON files and replace them under `data/`, then commit + deploy manually.
3. **GitHub에 바로 커밋** ★ — paste a GitHub Personal Access Token in the **Deploy · GitHub** tab. One click commits up to six files (`site-config.json`, `portfolio.json`, `career.json`, `kms.json`, `wiki.json`, `design.json`) via the GitHub Contents API.

PAT lives in `sessionStorage` only and is cleared when the tab closes.

### Image upload from admin

The Hero panel has a file picker. Selecting an image PUTs it to `assets/` via the GitHub Contents API and updates `hero.image` to the new path automatically. Requires the same PAT.

## Cloudflare Web Analytics (cookieless, PII-free)

The site reads `analytics.cf_token` from `data/site-config.json` and injects the Cloudflare beacon at runtime. To enable:

1. **dash.cloudflare.com → Analytics & Logs → Web Analytics → Add a site** — pick `jimmypark.net`.
2. Copy the short token Cloudflare shows you (something like `a1b2c3d4...`).
3. Open `/manage` → **Site · SEO** tab → paste the token in the *CF Web Analytics token* field. Save.
4. Commit (Deploy tab) or download `site-config.json` and push manually.
5. Dashboard shows visitors, pageviews, top pages, **top countries** (free plan), top referrers, browser/OS/device breakdowns. City-level breakdown requires Cloudflare's paid tier; country + referrer + browser are free.

To stop tracking later: clear the token field and re-deploy.

## Cloudflare Access — gate `/manage` so only you can open it

The admin is otherwise reachable by anyone who knows the URL. Cloudflare Access (free Zero Trust plan, 50 users) puts an identity gate in front of it. **5-minute setup, no code change.**

1. **one.dash.cloudflare.com** → sign in with the same Cloudflare account that owns the `jimmyport` Pages project.
2. **Access → Applications → Add an application → Self-hosted.**
3. Application configuration:
   - Application name: `jimmypark manage`
   - Session duration: `24 hours`
   - Application domain → **Domain:** `jimmypark.net`, **Path:** `/manage*`
4. Add a policy:
   - Policy name: `owner only`
   - Action: **Allow**
   - Include rule → **Emails** → `scoutkorea@kakao.com` (the email you want to log in with)
5. Identity providers — keep the default "One-time PIN" enabled so logging in just requires reading your inbox for a 6-digit code. No social login required.
6. Save. Open `https://jimmypark.net/manage` in a fresh tab — you should see the Cloudflare Access screen, enter your email, get the PIN, and proceed.

After this, the public site stays open to everyone; only `/manage` requires the email gate.

## GitHub Actions auto-deploy — repo secrets

The repo has `.github/workflows/deploy-on-push.yml`. It calls `wrangler pages deploy . --project-name jimmyport --branch main` on every push to `main`. It only works once the two Cloudflare secrets are set on the repo:

1. **Create a Cloudflare API token** — dash.cloudflare.com → My Profile → API Tokens → Create Token → **Edit Cloudflare Workers** template. (This template includes the Pages permissions the workflow needs.)
2. **Copy the token** Cloudflare shows you. (You can't view it again later.)
3. **Copy your Cloudflare account id** — visible in `wrangler whoami` output. For this repo it is **`b8cc5609b10c4df5b8e31aec570937b8`**.
4. **github.com/scoutkorea-jimmy/jimmyport → Settings → Secrets and variables → Actions → New repository secret:**
   - Name `CLOUDFLARE_API_TOKEN`, value = the token from step 2.
   - Name `CLOUDFLARE_ACCOUNT_ID`, value = `b8cc5609b10c4df5b8e31aec570937b8`.
5. Make a small commit on `main` and push. Open the Actions tab — `Deploy jimmypark.net On Push` should run and `wrangler pages deploy` should finish green.

After this, every `git push origin main` deploys to production automatically (1–2 minutes). To skip a specific push include `[skip deploy]` in the commit message. Markdown-only / `.github/**` changes are auto-skipped via `paths-ignore`.

## Version watching

`version-watch.js` polls `/VERSION` and `/ADMIN_VERSION` every 60s. The footer shows current versions plus a "최신 (HH:MM 확인)" pill. When a newer build is detected on a tab still on the old build, a full-screen modal appears prompting a refresh.

## Local preview

```sh
python3 -m http.server 8080
# → http://localhost:8080
```

## Manual deploy (if Actions are not configured yet)

```sh
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)
wrangler pages deploy . \
  --project-name jimmyport \
  --branch main \
  --commit-hash "$COMMIT_SHA" \
  --commit-message "$COMMIT_MSG" \
  --commit-dirty=true
curl -sS "https://jimmypark.net/VERSION?_=$(date +%s)" -H "Cache-Control: no-cache"
```

Should print the value of the `VERSION` file. **Always pass `--project-name jimmyport`** — there is a separate project (`gilwell-media`) on the same Cloudflare account that must not receive deploys from this repo.
