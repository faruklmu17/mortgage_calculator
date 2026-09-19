# 🏠 Mortgage Payoff Lab

> A privacy-first, client-side mortgage calculator that estimates your monthly **PITI** payment (Principal, Interest, Taxes, Insurance) and shows exactly how much time and interest you can save by making extra payments.

**Live site:** [https://mortgagepayofflab.com](https://mortgagepayofflab.com)

---

## ✨ Features

### 🧮 Monthly Payment Calculator
- Estimate your total **PITI** (Principal, Interest, Taxes, Insurance) + HOA fees.
- **Down payment** toggle — enter as a flat dollar amount **or** a percentage.
- Real-time recalculation as you type (no "submit" wait).
- Interactive **donut chart** breakdown of where every dollar goes (P&I / Taxes / Insurance / HOA).
- Stats: principal loan amount, total interest, monthly taxes & fees, total payoff cost.
- Auto-formatting of currency values and friendly validation messages.

### 🪄 Extra Payment Magic (NEW)
- See exactly how much **interest** and **time** you save by adding a little extra.
- Choose between a **monthly** extra payment or a **one-time lump sum**.
- Works from any point in your loan — enter your **current balance** and we simulate forward.
- Side-by-side: *Normally Remaining* vs. *New Payoff Time*, *Original Interest* vs. *New Total Interest*.
- Auto-syncs values from the main calculator when you switch tabs.
- Guided typewriter demo on first visit so first-time users immediately see the "magic."

### 🛡️ Privacy-First
- **100% client-side.** No accounts, no tracking cookies, no data leaves your browser.
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

| Concern    | Choice                                           |
| ---------- | ------------------------------------------------ |
| Language   | HTML5 + CSS3 + vanilla JavaScript (no framework) |
| Charts     | [Chart.js](https://www.chartjs.org/) (CDN)       |
| Icons      | [Font Awesome 6](https://fontawesome.com/) (CDN) |
| Fonts      | Google Fonts — *Outfit* + *Inter*                |
| Hosting    | GitHub Pages (custom domain via `CNAME`)         |
| Deployment | GitHub Actions (`.github/workflows/deploy.yml`)  |

> No build step, no dependencies to install, no `package.json`. It's a static site.

---

## 📁 Project Structure

```
.
├── index.html                  # Main application page (calculator + magic + SEO content)
├── script.js                   # All front-end logic (calculations, UI, demos)
├── style.css                   # Design system, components, responsive rules
├── privacy.html                # Privacy Policy page
├── preview.png                 # Social / Open Graph preview image
├── CNAME                       # Custom domain → mortgagepayofflab.com
├── robots.txt                  # Crawler rules
├── sitemap.xml                 # Sitemap for search engines
├── googleb4f539193a03794c.html # Google Search Console verification
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Pages deployment (triggered on `v1` branch)
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

Both simulations are capped at 600 months (50 years) as a safety guard against infinite loops with extremely low payments.

---

## 🚀 Getting Started

This is a fully static site — **no dependencies to install**. Just open the file:

```bash
# Option 1: Open directly in your browser
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

```bash
# Option 2: Serve it locally (nicer for development)
npx serve .
# or
python3 -m http.server 8000
```

Then visit <http://localhost:8000> (or the port your server picked).

---

## 📦 Deployment

The repo is set up for **GitHub Pages** on a custom domain.

1. Push changes to the `v1` branch — the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs automatically.
2. The custom domain (`mortgagepayofflab.com`) is configured via [`CNAME`](CNAME).
3. The workflow uploads the entire repo as the Pages artifact and deploys it.

You can also trigger a deployment manually from the GitHub **Actions** tab (`workflow_dispatch`).

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

Contributions are welcome! To keep the project lightweight:

1. Fork the repo.
2. Create a feature branch (`git checkout -b feat/my-idea`).
3. Keep the "no build step, no framework" spirit — plain HTML/CSS/JS.
4. Run the site locally (`open index.html`) and verify your change works.
5. Open a PR against the `v1` branch (that's the one that deploys to GitHub Pages).

---

## 📜 License

© 2025 Mortgage Payoff Lab. See the [Privacy Policy](privacy.html) for how the site handles (i.e. doesn't handle) your data.