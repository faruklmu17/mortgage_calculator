# Migration Audit

## Status: COMPLETE

This report contains expanded findings from all in-scope files. Verified against the actual workspace files; corrections and newly-verified static assets are recorded in **Section 17 (Verification Record)**. The document is saved to disk at the repository root.

---

## Scope

### Files Inspected

| File | Role |
|------|------|
| `index.html` | Markup, inputs, tabs, SEO content, structure |
| `script.js` | All front-end logic: calculations, validation, tab sync, demos |
| `style.css` | Design system, responsive rules, animations |
| `privacy.html` | Privacy Policy page |
| `.github/workflows/deploy.yml` | GitHub Pages deployment |
| `README.md` | Documentation, tech stack, project structure |

### Files Inspected (static/config, outside the core 6 but verified this session)

| File | Role |
|------|------|
| `MIGRATION_PLAN.md` | The 18-step plan; defines Step 3 requirements |
| `CNAME` | Custom domain (`mortgagepayofflab.com`) |
| `robots.txt` | Crawler rules (Allow all, Sitemap declared) |
| `sitemap.xml` | Search-engine URL list (2 URLs) |
| `googleb4f539193a03794c.html` | Google Search Console verification token |
| `preview.png` | OG / Twitter social preview image (binary asset) |
| `.gitignore` | Git ignore set |

These files are outside the core 6 required by Step 3 but were read to close the previously-open "NOT INSPECTED" items (see Resolved Questions and Section 17).

### Resolved Questions (verified against actual files)

1. `MIGRATION_PLAN.md` read — it is the 18-step React/Vite migration plan; Step 3 defines this read-only audit and its 10 required areas. No new runtime requirements affect the behavior inventory.
2. `CNAME` verified — contains exactly `mortgagepayofflab.com`. Matches README and canonical URL.
3. `robots.txt` verified — `User-agent: *` / `Allow: /`, plus `Sitemap: https://mortgagepayofflab.com/sitemap.xml`. No disallow rules.
4. `sitemap.xml` verified — lists two URLs: `https://mortgagepayofflab.com/` and `https://mortgagepayofflab.com/privacy.html` (both `lastmod 2026-01-06`).
5. `preview.png` verified — **actual content is JPEG (JFIF), 1024×1024, despite the `.png` extension** (see Suspected Bugs #11). 1024×1024 is not the 1200×630 size recommended for Open Graph/Twitter cards.

---

## 1. Calculator Inputs (Main Calculator)

| Input ID | Label | Type | Default / Placeholder | Notes |
|----------|-------|------|-----------------------|-------|
| `price` | Home Price ($) | text | placeholder="" | Typewriter animation fills placeholder |
| `downPayment` | Down Payment | text | placeholder="90,000" | Toggle between `$` and `%` via `dpDollar` / `dpPercent` buttons |
| `rate` | Interest Rate (%) | text | placeholder="6.5" | Annual rate |
| `term` | Loan Term (Years) | select | **30** (selected) | Options: 15, 30, 20, 10 |
| `tax` | Property Tax (Annual $) | text | placeholder="5,500" | |
| `insurance` | Home Insurance (Annual $) | text | placeholder="1,200" | |
| `hoa` | HOA Fee (Monthly $) | text | placeholder="0" | |

- No fields have pre-filled values; all rely on user input or the demo script.
- The `downPayment` field supports two modes controlled by the `downPaymentMode` variable (`'dollar'` or `'percent'`).

## 2. Calculator Inputs (Extra Payment Magic Tab)

| Input ID | Label | Type | Default / Placeholder |
|----------|-------|------|-----------------------|
| `magicPrice` | Home Price ($) | text | placeholder="600,000" |
| `magicDownPayment` | Down Payment ($) | text | placeholder="105,000" |
| `magicRate` | Interest Rate (%) | text | placeholder="6.5" |
| `magicTerm` | Original Loan Term (Years) | text + select (duplicate ID) | placeholder="30" / select default **30** |
| `magicBalance` | Current Loan Balance ($) | text | placeholder="515,000" |
| `magicMonthlyPI` | Monthly P&I Payment ($) | text | placeholder="2,500" |
| `magicTax` | Property Tax (Annual $) | text | placeholder="5,500" |
| `magicInsurance` | Home Insurance (Annual $) | text | placeholder="1,200" |
| `extraAmount` | Extra Payment | text | placeholder="200" |

- Extra payment mode toggle: `extraMonthlyBtn` (Monthly) vs `extraOneTimeBtn` (One-time), controlled by `extraMode` variable.
- **Duplicate ID:** The ID `magicTerm` appears twice in `index.html` – once as a `<input type="text">` and once as a `<select>`. `document.getElementById('magicTerm')` will always return the first occurrence (the text input), meaning the select element is unreachable via that ID.

## 3. Calculation Functions

### `calculate()` – Main PITI Calculator

1. Parses all inputs via `parseInput()` (strips commas, parses float, defaults to 0).
2. If `downPaymentMode === 'percent'`, converts: `downPayment = price * (downPayment / 100)`.
3. Computes `monthlyRate = rate / 100 / 12` and `termMonths = term * 12`.
4. **Validation checks (in order):**
   - `price <= 0` → "Please enter a valid home price."
   - `downPayment >= price` → "Down payment must be less than the home price."
   - `monthlyRate <= 0 || termMonths <= 0` → "Please enter a valid interest rate and term."
5. `principal = price - downPayment`.
6. Amortization: `monthlyPI = (principal * (1+r)^n * r) / ((1+r)^n - 1)`.
7. `totalMonthly = monthlyPI + (annualTax/12) + (annualInsurance/12) + monthlyHoa`.
8. Updates DOM and calls `updateChart()`.

### `calculateMagic(isPIOverride)` – Extra Payment Simulation

1. Parses all magic-section inputs.
2. `originalPrincipal = price - downPayment`; `termMonths = termYears * 12`.
3. `startingBalance` defaults to `originalPrincipal` if `magicBalance` is not provided.
4. **Validation:** `price <= 0 || (currentBalanceInput <= 0 && downPayment >= price) || rate <= 0 || termYears <= 0`.
5. Computes standard monthly P&I from original terms.
6. If `magicMonthlyPI` is filled AND `isPIOverride === true`, uses that value; otherwise recalculates and writes back (unless focused).
7. **Baseline simulation:** Month-by-month from `startingBalance` using fixed P&I, capped at 600 months.
8. **Accelerated simulation:** Same loop with extra payment:
   - `extraMode === 'monthly'`: added every month.
   - `extraMode === 'one-time'`: added only on first iteration (`oneTimeApplied` flag).
9. Computes savings and updates all displays.

## 4. Validation Summary

| Location | Check | Error Message |
|----------|-------|---------------|
| `calculate()` | `price <= 0` | "Please enter a valid home price." |
| `calculate()` | `downPayment >= price` | "Down payment must be less than the home price." |
| `calculate()` | `monthlyRate <= 0 \|\| termMonths <= 0` | "Please enter a valid interest rate and term." |
| `calculateMagic()` | `price <= 0 \|\| (currentBalanceInput <= 0 && downPayment >= price) \|\| rate <= 0 \|\| termYears <= 0` | "Please enter valid mortgage details." |

- No explicit check rejects a negative extra payment (would be parsed as a negative float by `parseInput()`).
- `parseInput()` returns `0` for non-numeric or empty values.

## 5. Tab Synchronization

- **Navigation:** Clicking `navCalc` or `navExtra` toggles `display` on `#calculator`, `#extra-magic-section`, `#guide`, and `#extra-magic-guide`.
- **Data sync (Calculator → Magic):** On `navExtra` click, if `magicPrice` is empty and `priceInput` has a value:
  - Copies price, down payment, rate, term, tax, insurance.
  - Sets `magicBalance` to `principal` (price − downPayment).
  - Calls `calculateMagic()`.
- **No reverse sync** (Magic → Calculator).
- **No live sync**; values only copy on tab switch.

## 6. One-Time Extra Payment Timing

**The one-time extra payment is applied in the first month of the accelerated simulation.**

```javascript
let oneTimeApplied = false;
while (balance > 0.01 && monthsToPayoff < 600) {
  monthsToPayoff++;
  const interestForMonth = balance * rate;
  newTotalInterest += interestForMonth;
  let principalRepayment = standardMonthlyPI - interestForMonth;

  if (extraMode === 'monthly') {
    principalRepayment += extraPayment;
  } else if (extraMode === 'one-time' && !oneTimeApplied) {
    principalRepayment += extraPayment;
    oneTimeApplied = true;
  }
  // ...
}
```

- Applied on iteration 1 (month 1), before subsequent months accrue interest on the reduced balance.
- Baseline simulation does not include the extra payment.

## 7. Chart Creation and Updates

- **Library:** Chart.js loaded from `cdn.jsdelivr.net` with `defer` in `index.html`.
- **Chart type:** Doughnut, `cutout: '70%'`.
- **Data:** Four segments – P&I, Taxes, Insurance, HOA.
- **Lifecycle:** `myDonutChart` is stored globally. On each `calculate()` call, `updateChart()` calls `myDonutChart.destroy()` before creating a new instance.
- **Legend:** Bottom position, point-style markers, 12px font.
- **Tooltip:** Custom callback formatting values as currency.
- **Canvas:** `#paymentChart` inside `.chart-container` (min-height 250px, glass background).
- **No chart** is rendered in the Extra Payment Magic tab; that tab uses text displays and a savings message instead.

## 8. Demo Animations, Timers, and sessionStorage

### Main Calculator Demo (`runDemo()`)
- **Status:** Currently **commented out** (`// runDemoOnce();`).
- Would fill: price "525,000", down payment "105,000", rate "6.75", tax "6,300", insurance "1,440", HOA "250".
- Uses staggered `setTimeout` calls (800ms, then 400ms intervals) to type values sequentially.
- Gate: `sessionStorage.getItem("mpl_demo_seen") === "1"`.

### Magic Tab Demo (`runMagicDemo()`)
- **Status:** Active. Triggered on `navExtra` click if `magicPrice` is empty.
- Fills: price "600,000", balance "450,000", down payment "120,000", rate "6.5", term "30", extra "500".
- Uses a recursive `typeField()` function with 40ms per character, 200ms between fields.
- Calls `calculateMagic()` during typing (every 3 characters or at field completion) for real-time effect.
- After completion: adds a scale glow to results, then clears all demo fields after 2 seconds.
- Gate: `sessionStorage.getItem("mpl_magic_demo_v4") === "1"`.
- The key was renamed from a previous version (`// Renamed to force reset`) to ensure existing users see the new demo.

### Typewriter Placeholder (`initTypewriter()`)
- Runs on the `price` input's `placeholder` attribute.
- Cycles through "Enter your home price here..." with a blinking cursor.
- Stops if user has typed a value or focused the field; resumes after 1 second.
- Speeds: 100ms typing, 50ms deleting, 3000ms pause at full message, 500ms pause before restart.

### sessionStorage Keys

| Key | Purpose |
|-----|---------|
| `mpl_demo_seen` | Gate for main calculator demo (currently unused since demo is disabled) |
| `mpl_magic_demo_v4` | Gate for magic tab typewriter demo |

- No other sessionStorage or localStorage usage. User calculator inputs are **not** persisted.

## 9. SEO Metadata and Educational Content

### Head Metadata (`index.html`)

| Element | Value |
|---------|-------|
| `<title>` | "Mortgage Payoff Calculator – Monthly Payment & Payoff Insights" |
| `meta[name=title]` | Same as title |
| `meta[name=description]` | "Estimate your monthly mortgage payment (PITI) and understand how your loan costs break down..." |
| `meta[name=author]` | "Mortgage Payoff Lab" |
| `<link rel=canonical>` | `https://mortgagepayofflab.com/` |
| Open Graph | `og:type`, `og:url`, `og:title`, `og:description`, `og:image` (preview.png) |
| Twitter Card | `summary_large_image`, `twitter:url`, `twitter:title`, `twitter:description`, `twitter:image` |

### JSON-LD Structured Data

1. **SoftwareApplication:** name, url, operatingSystem (Web), category (FinanceApplication), description, featureList (5 items), offer (free, USD).
2. **FAQPage:** 3 questions – monthly payment calculation, data storage, PITI definition.

### On-Page Educational Content

- **Main Guide (`#guide`):** "Mortgage Payment Calculator" section with P&I/escrow/HOA explanation, tips, FAQ (3 questions), and a "Trust & Transparency" block with the formula and assumptions.
- **Extra Magic Guide (`#extra-magic-guide`):** "The Magic of Extra Mortgage Payments" section explaining Principal Acceleration, a 3-step "How Our Logic Works" card, a "Pro Tip: Start Early" card, and 4 FAQ questions (extra payment direction, starting mid-loan, lump sum vs. monthly, prepayment penalties).
- **Footer links** to `#calculator`, `#guide`, `#tips`, About, Contact, Privacy Policy.

### README SEO Checklist

All items checked: unique title/description, canonical URL, OG tags, Twitter Card, JSON-LD, robots.txt, sitemap.xml, Google verification, CNAME, FAQ/educational content.

## 10. External Scripts, Fonts, Styles, and Network Requests

| Resource | Source | Purpose |
|----------|--------|---------|
| Chart.js | `https://cdn.jsdelivr.net/npm/chart.js` (defer) | Donut chart rendering |
| Font Awesome 6.4.0 | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css` | Icons (loaded with `media="print" onload` trick) |
| Google Fonts | `@import` in `style.css` and inline in `privacy.html` | Outfit (300–800) + Inter (300–700) |

### Notable:
- **Font loading redundancy:** Google Fonts are loaded via `@import` in `style.css` AND via a separate `@import` inside `privacy.html`'s inline `<style>` block.
- **Font Awesome on privacy.html:** The back-link icon uses `<i class="fas fa-arrow-left">` but **no Font Awesome stylesheet is loaded** on `privacy.html`. The icon will not render.
- **No tracking scripts, analytics, or third-party cookies** are present in any file.
- **No API calls or fetch requests** in `script.js`.

## 11. Responsive Styling (`style.css`)

### Breakpoints

| Breakpoint | Changes |
|------------|---------|
| ≤ 900px | `.calculator-wrapper` → single column; `.calc-card` padding reduced; `h1` → 2rem; footer → single column, centered |
| ≤ 768px | `.nav-links` hidden; `.mobile-menu-btn` shown (but no JS handler for it) |
| ≤ 480px | `.row` → single column; `.payment-amount` → 2.2rem; `.stats-grid` → single column |

### Design System
- **Theme:** Dark glassmorphism (gradient background `#0f172a` → `#1e1b4b`, semi-transparent cards with `backdrop-filter: blur(20px)`).
- **CSS Custom Properties:** `--primary` (#4f46e5), `--secondary` (#10b981), `--glass`, `--glass-border`, `--text-main`, `--text-muted`, `--danger`.
- **Animations:** `fadeInUp` (sections), `fadeIn` (sub-labels), `bounceBadge` (nav badge), `glimmer` (nav extra link), `pulse` (NEW badge).
- **Sticky header:** `position: sticky; top: 0; z-index: 1000; backdrop-filter: blur(20px)`.
- **Tooltips:** CSS-only (`.tooltip-container:hover .tooltip-text`), 220px wide, positioned above.
- **Focus states:** Inputs get `border-color: var(--primary)` and a 4px box-shadow ring.
- **Extra Magic tab styling:** Green accent overrides for button, heading span, and `#extraAmount` input.

### Gap: Mobile Menu
- `.mobile-menu-btn` is displayed at ≤768px but **no JavaScript event listener** is attached to it in `script.js`. The hamburger button is non-functional.

## 12. Privacy Statements

### `privacy.html`
- **Title tag:** "Privacy Policy - Mortgage Pro" (discrepancy: app is "Mortgage Payoff Lab").
- **Body text:** References "Mortgage Pro" (not "Mortgage Payoff Lab").
- **Last updated:** December 30, 2025.
- **Key claims:**
  1. No financial data is stored or transmitted.
  2. All calculations are client-side.
  3. No data use, sharing, or selling.
  4. Contact via repository issue tracker.
- **No mention** of sessionStorage usage for demo flags.
- **No mention** of Google Fonts, Chart.js, or Font Awesome as external requests.

### `index.html` (FAQ/SEO)
- States: "No. Mortgage Payoff Lab is a privacy-first application. All calculations are performed locally in your browser, and no data is ever transmitted to a server or stored permanently."
- This is accurate regarding user financial data but does not disclose third-party CDN resources.

### README
- "100% client-side. No accounts, no tracking cookies, no data leaves your browser."
- "Only `sessionStorage` is used to remember that the intro demo has already played."

### Assessment
The privacy statements are **broadly accurate** regarding user financial data. However:
- The app makes network requests to Google Fonts, Chart.js CDN, and Font Awesome CDN. These are not disclosed in the privacy policy.
- sessionStorage is used for demo flags but not mentioned in `privacy.html`.
- The product name inconsistency ("Mortgage Pro" vs. "Mortgage Payoff Lab") may cause confusion.

## 13. Deployment Behavior (`.github/workflows/deploy.yml`)

| Aspect | Detail |
|--------|--------|
| **Trigger** | `push` to `v1` branch OR manual `workflow_dispatch` |
| **Concurrency** | One at a time; `cancel-in-progress: false` |
| **Permissions** | `contents: read`, `pages: write`, `id-token: write` |
| **Environment** | `github-pages` |
| **Runner** | `ubuntu-latest` |
| **Steps** | Checkout → Setup Pages → Upload artifact (path: `.`) → Deploy |
| **Artifact** | Entire repository root |
| **Build step** | None (static site) |

- **No secrets** are referenced.
- **No `CNAME` handling** in the workflow; custom domain resolved by GitHub Pages via the `CNAME` file.
- **No branch protection** or PR validation is defined.

## 14. Discrepancies Between README and Code

| # | README Claim | Actual Code/Files | Severity |
|---|-------------|-------------------|----------|
| 1 | "Real-time recalculation as you type (no 'submit' wait)" | Main calculator requires clicking "Calculate My Payment" button. Live input listeners are **commented out**. Only the Magic tab recalculates on input. | **High** |
| 2 | "Guided typewriter demo on first visit" | True for Magic tab. Main calculator demo is **disabled** (commented out). | Low |
| 3 | "Auto-syncs values from the main calculator when you switch tabs" | True for Calculator → Magic only. No reverse sync. | Low |
| 4 | Project structure lists all files | `MIGRATION_PLAN.md` and `MIGRATION_AUDIT.md` are present but **not listed** in README structure. | Low |
| 5 | "No build step, no dependencies, no `package.json`" | Correct. | N/A |
| 6 | Privacy: "100% client-side... no data leaves your browser" | True for user data, but app loads external CDN resources. Not disclosed in privacy policy. | Medium |
| 7 | "Only `sessionStorage` is used to remember that the intro demo has already played" | Two keys exist: `mpl_demo_seen` (unused) and `mpl_magic_demo_v4` (active). | Low |
| 8 | README formula matches code | Equivalent expressions. | N/A |
| 9 | "PMI / mortgage insurance is not included" | Correct. | N/A |
| 10 | `privacy.html` title: "Mortgage Pro" | App is "Mortgage Payoff Lab" everywhere else. | Medium |

## 15. Suspected Bugs

> Observations from code as read. No fixes proposed.

| # | Location | Description |
|---|----------|-------------|
| 1 | `index.html` (×2) | **Duplicate ID `magicTerm`:** On both the `<input type="text">` (label "Original Loan Term (Years)", placeholder "30") and the `<select>` (label "Loan Term (Years)", default 30). Both are valid HTML *elements* but the id is not unique — an HTML validity/a11y violation. `getElementById('magicTerm')` returns only the **first** occurrence (the text input), so the **second** element (the `<select>`) is not reachable by id and its value is not read by JS. **Correction:** the earlier claim "Select is unreachable" is imprecise — the SELECT is the unreachable second (latter) element; the value IS read, via the leading text input. See Section 17. |
| 2 | `privacy.html` | **Missing Font Awesome:** Back-link uses `<i class="fas fa-arrow-left">` but no Font Awesome CSS is loaded. Icon will not render. |
| 3 | `style.css` / `script.js` | **Non-functional mobile menu:** `.mobile-menu-btn` shown at ≤768px but no click handler in `script.js`. |
| 4 | `script.js` | **Negative extra payment not rejected:** A negative `extraAmount` would act as a loan draw-down, increasing total interest in the accelerated simulation. |
| 5 | `index.html` | **Duplicate `<main>` elements:** Both calculator and magic sections use `<main>`. HTML spec allows only one per page. A11y impact. |
| 6 | `script.js` | **PI override lost on core field change:** When `isPIOverride === false`, user's manual `magicMonthlyPI` value is overwritten by recalculated value. Undocumented behavior. |
| 7 | `script.js` | **Stale results after demo:** `runMagicDemo()` clears input fields after 2s but results panel retains demo output until user types new values. |
| 8 | `style.css` | **Google Fonts `@import` duplicated:** In `style.css` and inline in `privacy.html`. Redundant request on privacy page. |
| 9 | `script.js` | **`parseInput()` silent zero:** Non-numeric input (e.g., "abc") becomes `0` with no error shown. Combined with validation, this can produce confusing "valid" results on zero values. |
| 10 | `index.html` | **`og:image` and `twitter:image` use relative path `preview.png`:** Some platforms require absolute URLs for social card images. |
| 11 | `preview.png` | **File content/extension mismatch + wrong aspect ratio for social cards:** Despite the `.png` name, the file is JPEG (JFIF, 1024×1024). Open Graph/Twitter images are recommended ~1200×630; a 1:1 image will be cropped by the previewers. Not a runtime crash, but affects social previews. |

## 16. Audit Checklist

| Item | Status |
|------|--------|
| Calculator inputs (both tabs) | ✅ Audited |
| Default values / placeholders | ✅ Audited |
| Calculation functions | ✅ Audited |
| Validation logic | ✅ Audited |
| Tab synchronization | ✅ Audited |
| One-time extra payment timing | ✅ Audited |
| Chart creation and updates | ✅ Audited |
| Demo animations, timers, sessionStorage | ✅ Audited |
| SEO metadata and educational content | ✅ Audited |
| External scripts, fonts, styles, network requests | ✅ Audited |
| Responsive styling | ✅ Audited |
| Privacy statements | ✅ Audited |
| Deployment behavior | ✅ Audited |
| README vs. code discrepancies | ✅ Audited (10 items) |
| Suspected bugs | ✅ Listed (11 items) |
| Verified against actual `script.js`, `index.html`, `style.css`, `privacy.html`, `deploy.yml`, `README.md` | ✅ Cross-checked (see Section 17) |
| `MIGRATION_PLAN.md` | ✅ Read |
| `CNAME` | ✅ Read & verified |
| `robots.txt` | ✅ Read & verified |
| `sitemap.xml` | ✅ Read & verified |
| `googleb4f539193a03794c.html` | ✅ Read & verified |
| `preview.png` | ✅ Verified (type + dimensions) |
| `.gitignore` | ✅ Read |
| Audit report saved to disk | ✅ Complete |

---

## 17. Verification Record (this session)

Step 3 requires the behavior inventory to be grounded in actual source code. The findings above were cross-checked file-by-file against the workspace. All 10 required audit areas are confirmed against code.

### Required audit areas — all verified in source

| # | Required area (Step 3) | Verified against |
|---|------------------------|------------------|
| 1 | All calculator inputs and default values | `index.html` (both tabs), `script.js` |
| 2 | All mortgage and amortization functions | `script.js`: `calculate()`, `calculateMagic()`, `updateChart()` |
| 3 | Input parsing, formatting, validation | `script.js`: `parseInput()`, `formatCurrency()`, `showError()` |
| 4 | DOM event listeners and direct DOM updates | `script.js` (all `addEventListener` calls) |
| 5 | Tab-switching and value synchronization | `script.js`: `navCalc` / `navExtra` handlers |
| 6 | Chart creation and update logic | `script.js`: `updateChart()` |
| 7 | Demo animations, timers, sessionStorage | `script.js`: `runDemo()`, `runMagicDemo()`, `initTypewriter()` |
| 8 | SEO metadata and static educational content | `index.html` head + `#guide` / `#extra-magic-guide` |
| 9 | External fonts/scripts/styles and other requests | `index.html`, `style.css`, `privacy.html` |
| 10 | Actual deployment branch and workflow behavior | `.github/workflows/deploy.yml` |

### Previously-unverified static/config files — now read

| File | Verified content finding |
|------|--------------------------|
| `CNAME` | `mortgagepayofflab.com` (matches README/canonical) |
| `robots.txt` | `Allow: /` + Sitemap declaration; no disallows |
| `sitemap.xml` | Lists homepage + `/privacy.html` |
| `googleb4f539193a03794c.html` | Standard `google-site-verification` line (token-only file) |
| `preview.png` | **JPEG (JFIF), 1024×1024** despite `.png` name — see Bugs #10/#11 |
| `.gitignore` | Generic ignore set incl. `node_modules/`, `dist/`, `*.env` — already prepared for the Vite/Node migration in Steps 6+ |
| `MIGRATION_PLAN.md` | 18-step React/Vite plan; Step 3 defines this audit |

### Corrections made to this audit

1. **Bug #1 (duplicate `magicTerm`)** — clarified precision: the `<select>` is the *second* (latter, unreachable-by-id) element; the value *is* read via the first (text) input. The earlier wording overstated that the value "is never read."
2. **Unresolved Questions → Resolved** — all 5 questions answered by reading the actual files.
3. **New Bug #11 added** — `preview.png` is actually JPEG, 1024×1024 (1:1), which is a content/extension mismatch and not the recommended social-card aspect ratio.

### No changes to source
Per the Step 3 instructions, **no application files were modified** during verification — only `MIGRATION_AUDIT.md` and `MIGRATION_STATUS.md` were updated.

---

*Audit based on the contents of `index.html`, `script.js`, `style.css`, `privacy.html`, `.github/workflows/deploy.yml`, and `README.md` as read from the workspace. No findings were invented for unread files.*
```