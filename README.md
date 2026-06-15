# Tingting Yan — Professional Website

A self-contained static website (HTML/CSS/JS, no build step). Open `index.html`
in any browser to preview locally; deploy by uploading the whole folder to any
static host.

## Files

```
index.html              Main page (all content)
assets/css/styles.css   Design system + responsive layout
assets/js/main.js       Nav, active-section highlight, publications toggle, scroll reveal
assets/img/headshot.jpg Portrait
assets/img/favicon.svg  Browser tab icon
assets/cv/Tingting-Yan-CV.pdf   Downloadable CV
_backup_before_site_*/  Untouched copies of the original photo + CV PDF
```

The original files (`2025_Tingting Yan_-2.jpg`, `Resume_Tingting Yan_external.pdf`)
are left untouched; the site uses copies under `assets/`.

## Things to finish before going live

1. **Profile links.** Open `assets/js/main.js` and paste your real URLs into the
   `PROFILE_URLS` object (Google Scholar, LinkedIn, ORCID, TTU profile). Any link
   left blank stays safely disabled so no broken links appear.
2. **Review** the curated "Selected" publications and the "Beyond Research" copy.
3. **Update the CV** by replacing `assets/cv/Tingting-Yan-CV.pdf` when you have a
   newer version (keep the same filename).

## Fonts / offline

Headings use *Fraunces* and body uses *Newsreader*, loaded from Google Fonts.
If a visitor is offline or the CDN is blocked, the site falls back gracefully to
Palatino / Georgia serif — it always remains readable.

## Deploy options

### Option A — GitHub Pages (free)
1. Create a repository and upload these files (or push with git).
2. Repo **Settings -> Pages -> Build and deployment -> Deploy from a branch**,
   choose `main` / root. Your site appears at `https://<username>.github.io/<repo>/`.
3. Optional: add a custom domain under the same Pages settings.

### Option B — Netlify or Vercel (free, drag-and-drop)
1. Go to netlify.com (or vercel.com), sign in.
2. Drag this folder onto the dashboard. It deploys in seconds with a shareable URL.
3. Add a custom domain in the site settings if desired.

### Option C — Texas Tech / university web space
Upload the entire folder (keeping the `assets/` structure intact) to your
university web directory via the method IT provides (SFTP or a web uploader).
`index.html` becomes the landing page.

No server-side code is required for any option.

## Automated Google Scholar citation updates

The citation numbers and the "as of <month>" date stamps are refreshed
automatically once a month by a GitHub Action, so they no longer have to be
edited by hand.

- **Workflow:** `.github/workflows/update-citations.yml` runs on the 1st of each
  month (and can be run on demand from the repo's **Actions** tab via
  *Run workflow*).
- **Script:** `scripts/update_citations.py` pulls the latest figures from Google
  Scholar (via the SerpApi Google Scholar Author API), updates the three hero
  totals and every per-article "Cited by N" count in `index.html`, bumps the
  English and Chinese date stamps, and commits the change. Because this repo is
  connected to Vercel, the commit auto-deploys to production.
- **Setup (one time):** create a free SerpApi account, then add the API key as a
  repository secret named `SERPAPI_KEY` (**Settings -> Secrets and variables ->
  Actions -> New repository secret**). The free tier (100 searches/month) easily
  covers a monthly run.
- **Manual / dry run:** `SERPAPI_KEY=... python scripts/update_citations.py --check`
  reports what would change without writing any files.

The script edits text via narrowly scoped patterns, so publication years are
never altered and the commit diff stays minimal. Articles it cannot match to a
Scholar record are reported and left untouched (never guessed or removed).
