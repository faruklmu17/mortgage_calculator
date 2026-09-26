# 🏠 Mortgage Payoff Lab

> A privacy-first, client-side mortgage calculator that estimates your monthly **PITI** payment (Principal, Interest, Taxes, Insurance) and shows exactly how much time and interest you can save by making extra payments.

**Live site:** [https://mortgagepayofflab.com](https://mortgagepayofflab.com)

---

## ✨ Features

### 🧮 Monthly Payment Calculator
- Estimate your total **PITI** (Principal, Interest, Taxes, Insurance) + HOA fees.
- **Down payment** toggle — enter as a flat dollar amount **or** a percentage.
- Results recalculate when you click **Calculate My Payment** (and when you toggle $/%).
- Interactive **donut chart** breakdown of where every dollar goes (P&I / Taxes / Insurance / HOA).
- Stats: principal loan amount, total interest, monthly taxes & fees, total payoff cost.
- Auto-formatting of currency values and friendly validation messages.

### 🪄 Extra Payment Magic (NEW)
- See exactly how much **interest** and **time** you save by adding a little extra.
- Choose between a **monthly** extra payment or a **one-time lump sum**.
- Works from any point in your loan — enter your **current balance** and we simulate forward.
- Side-by-side: *Normally Remaining* vs. *New Payoff Time*, *Original Interest* vs. *New Total Interest*.
- Real-time recalculation as you type; auto-syncs values from the main calculator when you switch tabs.
- Guided typewriter demo on first visit so first-time users immediately see the "magic."

### 🛡️ Privacy-First
- **100% client-side calculations.** No accounts, no tracking, and the financial data you enter is processed locally in your browser — it is never stored or transmitted to any server.
- The page loads its icons and fonts from two public CDNs (Font Awesome, Google Fonts) as standard public-resource requests; calculator inputs are not part of those requests.
- Only `sessionStorage` is used to remember that the intro demo has already played.

### 📈 SEO & AI-Ready
- JSON-LD structured data (`SoftwareApplication` + `FAQPage`).
- Open Graph & Twitter Card tags.
- `robots.txt`, `sitemap.xml`, and a Google verification file.
- FAQ and educational sections written for humans **and** AI chatbots.

### 🎨 Modern UI
- Glassmorphism design system, smooth fade-in animations, and a sticky blurred header.
- Fully responsive: desktop grid layout collapses gracefully on tablets and phones.
- Custom typewriter placeholder animation to guide first-time input.

---

## 🛠 Tech Stack

| Concern    | Choice                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- |
| Framework  | React 19 (function components + hooks)                                                  |
| Language   | JavaScript (ES modules; no TypeScript)                                                  |
| Build tool | [Vite](https://vite.dev/) 8                                                             |
| Charts     | [Chart.js](https://www.chartjs.org/) 4 + [react-chartjs-2](https://react-chartjs-2.dev/) (bundled, not CDN) |
| Icons      | [Font Awesome 6](https://fontawesome.com/) (CDN)                                        |
| Fonts      | Google Fonts — *Outfit* + *Inter*                                                       |
| Testing    | [Vitest](https://vitest.dev/) + jsdom                                                   |
| Hosting    | GitHub Pages (custom domain via `CNAME`)                                                |
| Deployment | GitHub Actions (`.github/workflows/deploy.yml`)                                         |

The mortgage math lives in pure, UI-free ES modules under `src/lib/` (independent of React), and every one of them is covered by the test suite.

---

## 📁 Project Structure

```
.
├── index.html                  # Vite entry: app shell + static SEO/educational content
├── src/                        # React app
│   ├── main.jsx                # React root (mounts CalculatorApp into #calculator-root)
│   ├── App.jsx                 # Tab state + shared main↔magic input state
│   ├── navBridge.js            # CustomEvent bridge: static header nav ↔ React app
│   ├── components/             # PaymentCalculator, ExtraPaymentCalculator, PaymentChart (+ tests)
│   └── lib/                    # Pure mortgage math, validation, formatting (+ tests)
├── style.css                   # Design system, components, responsive rules
├── vite.config.js              # Vite build + Vitest configuration
├── package.json                # Scripts (dev / build / preview / test) + dependencies
├── package-lock.json           # Lockfile (reproducible `npm ci` in CI)
├── public/                     # Static files copied verbatim into the production build
│   ├── privacy.html            # Privacy Policy page (self-contained styles)
│   ├── preview.png             # Social / Open Graph preview image
│   ├── CNAME                   # Custom domain → mortgagepayofflab.com
│   ├── robots.txt              # Crawler rules
│   ├── sitemap.xml             # Sitemap for search engines
│   └── googleb4f539193a03794c.html # Google Search Console verification
├── AGENTS.md                   # Coding-agent instructions (migration scope + rules)
├── MIGRATION_PLAN.md           # Step-by-step React migration plan
├── MIGRATION_STATUS.md         # Step-by-step status + verification results
├── MIGRATION_AUDIT.md          # Pre-migration code audit
├── BASELINE_CASES.md           # Behavior baseline captured before the migration
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Pages deployment (triggered on the `v1` branch)
```

---

## 🧠 How the Math Works

### Standard Mortgage Payment (P&I)

Uses the industry-standard amortization formula:

```
M = P · [ i(1 + i)^n ] / [ (1 + i)^n – 1 ]
```

Where:
- `P` = principal (home price − down payment)
- `i` = monthly interest rate (annual rate ÷ 100 ÷ 12)
- `n` = total number of months (term in years × 12)
- `M` = monthly Principal & Interest payment

The **PITI** monthly total is:

```
PITI = M + (annual taxes / 12) + (annual insurance / 12) + monthly HOA
```

### Extra Payment Magic

1. **Velocity check** — compute the fixed monthly P&I from the *original* loan terms.
2. **Baseline simulation** — walk the loan forward from the *current balance* using only that fixed payment → "Normally Remaining" time and original total interest.
3. **Accelerated simulation** — walk the loan forward again, adding the extra payment (monthly or one-time) → new payoff time and new total interest.
4. **Savings** — the difference in interest and time between the two simulations.

Both simulations are capped at 600 months (50 years) as a safety guard against infinite loops with extremely low payments; loans that cannot be paid off within the limit are flagged with an explicit warning instead of showing a misleading payoff date.

---

## 🚀 Getting Started

**Prerequisites:** Node.js `^20.19.0` or `>=22.12.0` (Node 22 LTS recommended — CI builds with Node 22).

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (Vite, hot reload) → http://localhost:5173
npm run dev

# 3. Run the test suite (Vitest)
npm test

# 4. Create the production build (output in dist/)
npm run build

# 5. Preview the production build locally
npm run preview
```

---

## 📦 Deployment

The repo is set up for **GitHub Pages** on a custom domain.

1. Push changes to the `v1` branch — the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs automatically: it installs dependencies, runs `npm test`, runs `npm run build`, and uploads the built `dist/` folder as the Pages artifact (Vite copies the static files from `public/` into `dist/`).
2. The custom domain (`mortgagepayofflab.com`) is configured via [`CNAME`](public/CNAME).
3. You can also trigger a deployment manually from the GitHub **Actions** tab (`workflow_dispatch` — available on the `v1` branch only).

---

## 🌐 SEO Checklist

- [x] Unique `<title>` and `<meta name="description">`
- [x] Canonical URL
- [x] Open Graph (`og:*`) tags for Facebook / Slack / Discord previews
- [x] Twitter Card (`twitter:*`) tags
- [x] JSON-LD: `SoftwareApplication` + `FAQPage`
- [x] `robots.txt` + `sitemap.xml`
- [x] Google Search Console verification file
- [x] `CNAME` for custom domain
- [x] FAQ + educational content on-page (human- and LLM-friendly)

---

## 📄 Assumptions & Disclaimers

- Interest is **compounded monthly**.
- Property taxes and insurance are entered as **annual** figures and divided by 12.
- HOA is entered as a **monthly** figure.
- **PMI / mortgage insurance** is **not** included.
- Estimates are for planning purposes only — actual loan terms depend on your lender, credit, and local rates.

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo.
2. Create a feature branch (`git checkout -b feat/my-idea`).
3. Keep the rules in [AGENTS.md](AGENTS.md) in mind — client-side only: no backend, no TypeScript, no routing, no styling framework.
4. Run `npm test` and `npm run build`, and verify your change in the dev server (`npm run dev`).
5. Open a PR against the `v1` branch (that's the one that deploys to GitHub Pages).

---

## 📜 License

© 2025 Mortgage Payoff Lab. See the [Privacy Policy](public/privacy.html) for how the site handles (i.e. doesn't handle) your data.
