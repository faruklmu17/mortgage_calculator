# Test Mortgage Payoff Lab on GitHub Pages

These instructions create a separate preview at:

<https://faruklmu17.github.io/mortgage-calculator-preview/>

The existing `mortgage_calculator` repository, `watson_iframe` branch, and
`mortgagepayofflab.com` deployment stay as they are. All preview code changes
below belong in a **new local copy**, `mortgage_calculator_preview`.
This guide has not created or deployed any remote resources.

## What runs where

| Component | Location |
| --- | --- |
| React calculator and static pages | GitHub Pages, built into `dist/` |
| Flask weather app | Separate Python web host, such as Render |
| OpenWeatherMap `API_KEY` | Weather host environment settings |
| `run.sh` | Local development only |

GitHub Pages cannot run Flask or `run.sh`. You can test the calculator first
without hosting weather; the weather iframe will remain unavailable until
you complete step 6. The current iframe URL, `127.0.0.1:5001`, points at the
visitor's computer, so it does not provide public weather hosting.

## 1. Create an empty preview repository

1. Sign in to GitHub as `faruklmu17`.
2. Create a new repository named **`mortgage-calculator-preview`**.
3. Choose **Public** for use with GitHub Free.
4. Leave README, license, and `.gitignore` initialization unchecked.
5. Keep the custom domain setting empty; use the default `github.io` URL.

If you choose another account or repository name, adjust the repository URL,
the `--base` value below, and the expected website URL accordingly.

## 2. Create a separate local copy

Run in a terminal:

```bash
cd /Users/Watson/workWS/web_devel
git clone --no-hardlinks --branch watson_iframe mortgage_calculator mortgage_calculator_preview
cd mortgage_calculator_preview
git remote set-url origin git@github.com:faruklmu17/mortgage-calculator-preview.git
git switch -c main
git remote -v
```

Confirm **both** remote entries point to `mortgage-calculator-preview.git`
before pushing anything. The clone includes committed changes on
`watson_iframe`; uncommitted edits from the original directory are not copied.

Use this new directory for all remaining terminal commands unless a step
explicitly says otherwise.

## 3. Adjust the preview copy

In `mortgage_calculator_preview`:

- Delete `public/CNAME` from this copy. It contains the production domain.
  Do not configure that domain in the preview repository's Pages settings.
- In `index.html`, change the logo link from `href="/"` to `href="./"`.
  This keeps the link within the preview repository's URL path.
- Add `<meta name="robots" content="noindex, nofollow">` inside the `<head>`
  of `index.html` and `public/privacy.html` to discourage indexing of the test
  pages. This does not make them private.

Leave `vite.config.js` alone: the workflow below passes the preview base path
at build time. Vite needs `/mortgage-calculator-preview/` for this project URL.
Its existing `/` base remains appropriate for the production custom domain.
See [Vite's GitHub Pages guide](https://vite.dev/guide/static-deploy#github-pages).

## 4. Replace the workflow in the preview copy

Replace the **entire contents** of
`mortgage_calculator_preview/.github/workflows/deploy.yml` with:

```yaml
name: Deploy preview to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages-preview
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build -- --base=/mortgage-calculator-preview/
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
      - name: Deploy preview
        id: deployment
        uses: actions/deploy-pages@v5
```

This replaces the copied workflow rather than adding a second deployment
workflow. GitHub runs the tests, builds the React app, and publishes `dist/`.
The action versions follow the current
[Vite deployment example](https://vite.dev/guide/static-deploy#github-pages).

## 5. Push, enable Pages, and open the preview

From `mortgage_calculator_preview`, verify locally:

```bash
npm ci
npm test
npm run build -- --base=/mortgage-calculator-preview/
npm run preview -- --host 127.0.0.1 --port 4173
```

Open <http://127.0.0.1:4173/mortgage-calculator-preview/>.
If Vite selects another port, use that port with the same path.
Press **Ctrl+C** when finished.

Commit and push to the **preview repository**:

```bash
git remote -v
git add index.html public/CNAME public/privacy.html .github/workflows/deploy.yml
git commit -m "Configure separate GitHub Pages preview"
git push -u origin main
```

The `git add public/CNAME` command records its deletion. Then on GitHub:

1. Open **`faruklmu17/mortgage-calculator-preview` → Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Leave **Custom domain** empty.
4. Open **Actions → Deploy preview to GitHub Pages → Run workflow** and
   choose `main`. If the first push already deployed successfully, skip this.
5. Wait for the workflow to finish and open its deployment URL:
   <https://faruklmu17.github.io/mortgage-calculator-preview/>.

The initial push may fail to deploy if Pages has not yet been enabled; run
the workflow again after configuring it. If deployment waits for approval,
check the preview repository's `github-pages` environment rules under
**Settings → Environments**.
See [GitHub's publishing configuration instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 6. Optional: make weather work publicly

You can deploy the existing weather app to Render, following its
[official Flask guide](https://render.com/docs/deploy-flask). Choose a service
plan after reviewing the current pricing and limits shown by Render.

1. Ensure the desired weather code is committed and pushed to its own GitHub
   repository. The current local `weather_app` remote is
   `SuperElephantWS/weather_app`, on branch `main`.
2. In Render, select **New → Web Service** and connect that weather repository.
   If it belongs to a different GitHub account, grant access from an account
   that can access the repository.
3. Select the branch containing the weather app and use these settings:

   | Setting | Value |
   | --- | --- |
   | Language | Python 3 |
   | Root directory | Leave empty when `app.py` is at repository root |
   | Build command | `pip install -r requirements.txt gunicorn` |
   | Start command | `gunicorn app:app --bind 0.0.0.0:$PORT` |
   | Environment variable | `API_KEY` = your real OpenWeatherMap key |

   The existing requirements do not include Gunicorn, so the build command
   installs it explicitly. Render expands `$PORT` in the start command.
   Keep the API key in Render's environment settings; do not put it in React
   code, a `VITE_` variable, or the public repository.
4. Deploy and open the HTTPS URL Render provides, for example
   `https://YOUR-WEATHER-SERVICE.onrender.com/?city=New%20Haven`.
   Replace `YOUR-WEATHER-SERVICE` with the actual hostname. Confirm city search
   works directly before embedding it.
5. In the **preview copy** of `src/components/WeatherWidget.jsx`, replace:

   ```jsx
   src="http://127.0.0.1:5001/?city=New%20Haven"
   ```

   with your real HTTPS weather address:

   ```jsx
   src="https://YOUR-WEATHER-SERVICE.onrender.com/?city=New%20Haven"
   ```

6. Update `public/privacy.html` in the preview copy to describe the embedded
   weather host and external weather requests. The current privacy text
   predates public weather hosting.
7. From `mortgage_calculator_preview`, commit and push:

   ```bash
   git add src/components/WeatherWidget.jsx public/privacy.html
   git commit -m "Connect preview to hosted weather app"
   git push origin main
   ```

This triggers a new preview deployment. Your computer and `run.sh` can be off
when testing the publicly hosted calculator and weather service.

## 7. Check the deployed page

- Open the preview on another device to confirm it works independently of
  your local servers.
- Test the monthly payment and extra payment calculators.
- Refresh the page and check that styles and charts load.
- Open the Privacy Policy and click the logo to confirm the preview paths.
- If weather is hosted, test New Haven, another city, and an unknown city.
- Check the page on a phone and inspect the browser console for errors.
- Confirm `mortgagepayofflab.com` still serves the existing production site.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Pages returns 404 | Confirm the preview workflow passed, Pages uses GitHub Actions, and the URL includes `/mortgage-calculator-preview/`. |
| Styles or JavaScript return 404 | Check the workflow's `--base` matches the preview repository name, including both slashes. |
| Logo opens the wrong site | Use `href="./"` in the preview copy's logo link. |
| Weather is blank | Complete step 6; confirm the iframe uses the hosted HTTPS URL. |
| Weather works directly but embedding is refused | Inspect `X-Frame-Options` and CSP `frame-ancestors` on the weather response; the host must allow the preview origin. CORS settings do not control iframe embedding. |
| API key error | Check `API_KEY` on the weather host and redeploy/restart the service. |
| Weather service startup fails | Check Render logs, Gunicorn installation, and `app:app` against `app.py`. |
| Changes do not appear | Check the latest preview workflow completed, then refresh without cache. |

## Update or stop the preview

Edit and push `main` in `mortgage_calculator_preview` to publish updates.
Changes in the original `mortgage_calculator` directory do not automatically
sync to the preview copy; port the desired changes and retain the preview
workflow, base path, and hosted weather URL.

To stop serving the preview, use **Settings → Pages → Unpublish site** in the
preview repository. Disable its deployment workflow as well to prevent later
pushes from publishing it again. A hosted weather service has its own lifecycle;
stop it separately if it is no longer needed.
