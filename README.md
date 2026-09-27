# 🏠 Mortgage Payoff Lab

> A privacy-first, client-side mortgage calculator that estimates your monthly **PITI** payment (Principal, Interest, Taxes, Insurance) and shows exactly how much time and interest you can save by making extra payments.

**Live site:** [https://mortgagepayofflab.com](https://mortgagepayofflab.com)

---

## ✨ Features

### 🧮 Monthly Payment Calculator
- Estimate your total **PITI** (Principal, Interest, Taxes, Insurance) + HOA fees.
- **Down payment** toggle — enter as a flat dollar amount **or** a percentage.
- Recalculate with one click; friendly validation messages and auto-formatting of currency values.
- Interactive **donut chart** breakdown of where every dollar goes (P&I / Taxes / Insurance / HOA).
- Stats: principal loan amount, total interest, monthly taxes & fees, total payoff cost.

### 🪄 Extra Payment Magic
- See exactly how much **interest** and **time** you save by adding a little extra.
- Choose between a **monthly** extra payment or a **one-time lump sum**.
- Works from any point in your loan — enter your **current balance** and we simulate forward.
- Side-by-side: *Normally Remaining* vs. *New Payoff Time*, *Original Interest* vs. *New Total Interest*.
- Auto-syncs values from the main calculator when you switch tabs.
- Guided typewriter demo on first visit to the tab so first-time users immediately see the "magic."

### 🛡️ Privacy-First
- **Calculations run 100% client-side.** No accounts, no tracking cookies, no analytics — the values you enter are never transmitted to any server.
- (Like most static sites, the page loads its fonts and icons from public CDNs; those requests carry no calculator data.)
- Only `sessionStorage` is used to remember that the intro demo has already played.

### 📈 SEO & AI-Ready
- JSON-LD structured data (`SoftwareApplication` + `FAQPage`).
- Open Graph & Twitter Card tags (absolute image URLs for social crawlers).
- `robots.txt`, `sitemap.xml`, and a Google verification file.
- FAQ and educational sections written for humans **and** AI chatbots.

### 🎨 Modern UI
- Glassmorphism design system, smooth fade-in animations, and a sticky blurred header.
- Fully responsive: desktop grid layout collapses gracefully on tablets and phones.
- Custom typewriter placeholder animation to guide first-time input.

---

## 🛠 Tech Stack

| Concern    | Choice                                           |
| ---------- | ------------------------------------------------ |
| UI         | React 19 (function components + hooks)           |
| Language   | JavaScript (JSX) — no TypeScript                 |
| Build      | Vite                                             |
| Tests      | Vitest (pure calculation modules)                |
| Charts     | Chart.js + react-chartjs-2 (bundled, no CDN)     |
| Icons      | [Font Awesome 6](https://fontawesome.com/) (CDN) |
| Fonts      | Google Fonts — *Outfit* + *Inter*                |
| Hosting    | GitHub Pages (custom domain via `CNAME`)         |
| Deployment | GitHub Actions — builds `dist/` and deploys it   |

The interactive calculators are React; the surrounding page (header, FAQ,
educational sections, SEO metadata, JSON-LD) remains static HTML, and all
mortgage math lives in framework-free modules under `src/lib/` that the test
suite exercises directly.

### Requirements

Node.js **20.19+ or 22.12+** (Vite 8 engine requirement). Node 22 LTS is recommended and is what CI uses.

---

## 📁 Project Structure

```
.
├── index.html                  # Vite entry: head/SEO, static content, React root
├── src/
│   ├── main.jsx                # React entry — mounts <CalculatorApp />
│   ├── App.jsx                 # Tab state, nav bridge, shared loan inputs
│   ├── navBridge.js            # Static header → React CustomEvent bridge
│   ├── components/
│   │   ├── PaymentCalculator.jsx     # Main PITI calculator tab
│   │   ├── ExtraPaymentCalculator.jsx# Extra Payment Magic tab
│   │   └── PaymentChart.jsx          # Chart.js donut (react-chartjs-2)
│   ├── hooks/
│   │   ├── useTypewriterPlaceholder.js # Animated price-field placeholder
│   │   └── useMagicDemo.js             # First-visit magic-tab intro demo
│   └── lib/                    # Pure calculation modules + Vitest suites
│       ├── mortgage.js         # P&I, PITI, totals
│       ├── amortization.js     # Baseline & accelerated payoff simulations
│       ├── validation.js       # Input parsing + loan validation
│       ├── formatting.js       # Currency & duration display helpers
│       ├── extraMagic.js       # Full magic-tab result derivation
│       └── *.test.js           # Baseline-pinned unit tests
├── style.css                   # Design system, components, responsive rules
├── public/
│   ├── privacy.html            # Privacy Policy (self-contained page)
│   ├── CNAME                   # Custom domain → mortgagepayofflab.com
│   ├── robots.txt              # Crawler rules
│   ├── sitemap.xml             # Sitemap for search engines
│   ├── preview.png             # Social / Open Graph preview image
│   └── googleb4f539193a03794c.html # Google Search Console verification
├── vite.config.js
├── package.json / package-lock.json
├── MIGRATION_PLAN.md           # History: the 18-step React migration
├── MIGRATION_STATUS.md         # History: step-by-step results
├── MIGRATION_AUDIT.md          # History: pre-migration behavior audit
├── BASELINE_CASES.md           # History: baseline behavior reference
└── .github/workflows/deploy.yml # CI: test + build + Pages deployment
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
3. **Accelerated simulation** — walk the loan forward again, adding the extra payment (monthly, or one-time applied in month 1) → new payoff time and new total interest.
4. **Savings** — the difference in interest and time between the two simulations.

Both simulations are capped at 600 months (50 years) as a safety guard against infinite loops with extremely low payments; loans that would run past the cap (or whose payment doesn't cover interest) are shown with an explicit warning instead of a fake "paid off" result.

All of this lives in `src/lib/` (see the file table above) and is pinned by the Vitest suite against the baseline values in `BASELINE_CASES.md`.

---

## 🚀 Getting Started

```bash
npm install

# Development server (Vite)
npm run dev

# Run the calculation test suite (Vitest)
npm test

# Production build → dist/
npm run build

# Serve the production build locally
npm run preview
```

Then visit the URL printed by the dev/preview server.

---

## 📦 Deployment

The repo is set up for **GitHub Pages** on a custom domain.

1. Push changes to the `v1` branch — the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs `npm ci`, `npm test`, and `npm run build`, then uploads and deploys **`dist/`** (the built site, not the source).
2. Pull requests against `v1` run the same test/build validation but never deploy.
3. The custom domain (`mortgagepayofflab.com`) is configured via [`public/CNAME`](public/CNAME).

You can also trigger a deployment manually from the GitHub **Actions** tab — manual runs are restricted to the `v1` branch.

---

## 🌐 SEO Checklist

- [x] Unique `<title>` and `<meta name="description">`
- [x] Canonical URL
- [x] Open Graph (`og:*`) tags with absolute image URL
- [x] Twitter Card (`twitter:*`) tags with absolute image URL
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

Contributions are welcome! To keep the project approachable:

1. Fork the repo.
2. Create a feature branch (`git checkout -b feat/my-idea`).
3. Keep the migration's constraints: no backend, no routing, no TypeScript, no styling framework; keep the math in `src/lib/` and framework-free.
4. Run `npm test` and `npm run build`, and verify the change in the browser (`npm run dev`).
5. Open a PR against the `v1` branch (that's the one that deploys to GitHub Pages).

---

## 📜 License

© 2025 Mortgage Payoff Lab. See the [Privacy Policy](privacy.html) for how the site handles (i.e. doesn't handle) your data.
