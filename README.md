# Jimmy Park Homepage

Static homepage for [jimmypark.net](https://jimmypark.net/), hosted on GitHub Pages.

## Architecture

All homepage text and content is driven by **`data/site-config.json`** (copy, country list, work items, contact, SEO) plus **`data/portfolio.json`** (video items). `index.html` keeps Korean fallback text so the site stays readable if JS or the fetch fails.

## Files

| File | Purpose |
|---|---|
| `index.html`            | Homepage markup + Korean fallback copy |
| `styles.css`            | Responsive visual design (light theme) + manage admin + modal |
| `script.js`             | Homepage runtime — loads JSON, renders sections, KR/EN toggle |
| `manage.html`           | Unified admin (replaces `portfolio-admin.html`) |
| `manage.js`             | Admin logic — form binding, draft, JSON download, GitHub commit |
| `version-watch.js`      | Footer "live build" pill + full-screen "new build" modal |
| `VERSION` / `ADMIN_VERSION` | Site and admin version stamps (polled by `version-watch.js`) |
| `data/site-config.json` | All site copy in one JSON (hero, global, work, interests, contact, SEO) |
| `data/portfolio.json`   | Video portfolio item list |
| `CNAME`                 | Custom domain (`jimmypark.net`) for GitHub Pages |

## Manage admin — `/manage.html`

`manage.html` edits every section of the homepage from one screen. Two save paths:

### Option 1 — Download JSON, commit yourself
1. Open `https://jimmypark.net/manage.html`.
2. Edit fields. Changes auto-save as a local draft in `localStorage`; opening `index.html` in the same browser shows the draft as a live preview.
3. Click `site-config.json 다운로드` (and `portfolio.json 다운로드` if portfolio changed).
4. Replace the corresponding files under `data/` in the repo.
5. `git add data/ && git commit -m "…" && git push` → GitHub Pages auto-deploys in ~1–2 minutes.

### Option 2 — GitHub에 바로 커밋 (recommended)
1. Open the **`Deploy · GitHub`** tab inside manage.html.
2. Paste a **GitHub Personal Access Token** (Fine-grained, Repository → Contents: Read & Write). The PAT lives in `sessionStorage` only and is cleared when the tab closes.
3. Click `GitHub에 두 파일 커밋` — both JSON files are PUT to the repo via the GitHub Contents API.
4. GitHub Pages picks up the new commit and updates jimmypark.net automatically.

## Version watching

`version-watch.js` polls `/VERSION` and `/ADMIN_VERSION` every 60s. The footer shows the current versions plus a "최신 (HH:MM 확인)" status, so you can verify a deploy without DevTools. When a new build lands on a tab still showing the old build, a full-screen modal appears prompting a refresh.

## Analytics

[Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) is cookieless and PII-free. To enable: open `index.html`, find the commented `<script>` block near the bottom, paste your token, remove the surrounding `<!-- -->`, commit + push.

## Local preview

```sh
python3 -m http.server 8080
# → http://localhost:8080
```

Or use the existing `.wrangler` dev preview if you've used Cloudflare tooling here before.

## Deploy

GitHub Pages auto-deploys on push to `main`. There's no separate build step.
