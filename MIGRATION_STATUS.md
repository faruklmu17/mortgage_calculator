# Migration Status

## Step 3: Audit Existing Code — ✅ COMPLETE

The audit is complete, saved to `MIGRATION_AUDIT.md`, and verified against the actual workspace files. All 10 audit areas required by Step 3 were cross-checked in `index.html`, `script.js`, `style.css`, `privacy.html`, `.github/workflows/deploy.yml`, and `README.md`. No application files were modified (read-only step, as required).

> Step 1 and Step 2: not recorded in this file / not verifiable from workspace (the repo is on the `watson` branch; no `react-migration` branch exists yet).

## Step 4: Capture Baseline Behavior — ✅ COMPLETE (deliverable created; browser cells PENDING)

`BASELINE_CASES.md` is created with all 10 reproducible cases from the Step 4 table (plus the down-payment/overpayment sub-cases A9a/A9b/A9c), a deterministic **source-formula reference** for every numeric case, the exact "preserve" behaviors, and 9 explicit "decide before Step 7" items. Per Step 4 ("do not invent observed outputs or claim browser tests were run"), the **browser-observed** column and **all 5 screenshots** are left PENDING because this agent has **no browser access**. The original site is verified to serve locally (HTTP 200 on all assets). **No application files were modified.**

## Overall Step Tracking

| Step | Name | Status |
|------|------|--------|
| 1 | Establish how to work with Qwen | Not recorded |
| 2 | Protect the working version (branch) | Not recorded (on `watson` branch; no `react-migration` yet) |
| 3 | Audit the existing code | ✅ **COMPLETE** |
| 4 | Capture baseline behavior | ✅ **COMPLETE** (deliverable `BASELINE_CASES.md` created; browser-observed cells + screenshots PENDING — no browser available) |
| 5 | Add persistent instructions (AGENTS.md) | Not started |

### Files Inspected

| File | Status |
|------|--------|
| `index.html` | ✅ Read and verified against audit |
| `script.js` | ✅ Read and verified against audit |
| `style.css` | ✅ Read and verified against audit |
| `privacy.html` | ✅ Read and verified against audit |
| `.github/workflows/deploy.yml` | ✅ Read and verified against audit |
| `README.md` | ✅ Read and verified against audit |

### Additional files verified this session (previously "not read")

| File | Status |
|------|--------|
| `MIGRATION_PLAN.md` | ✅ Read (step 3 requirements derived from this) |
| `CNAME` | ✅ Verified (`mortgagepayofflab.com`) |
| `robots.txt` | ✅ Verified (Allow all, Sitemap declared) |
| `sitemap.xml` | ✅ Verified (2 URLs: `/`, `/privacy.html`) |
| `googleb4f539193a03794c.html` | ✅ Verified (token-only verification file) |
| `preview.png` | ✅ Verified (**JPEG, 1024×1024** despite .png name — see Bugs #10/#11) |
| `.gitignore` | ✅ Read (already prepared for Node/Vite migration) |

### Audit Coverage

- [x] Calculator inputs (main + magic tabs)
- [x] Default values and placeholders
- [x] Calculation functions (`calculate()`, `calculateMagic()`)
- [x] Validation logic
- [x] Tab synchronization
- [x] One-time extra payment timing
- [x] Chart creation and updates
- [x] Demo animations, timers, sessionStorage
- [x] SEO metadata and educational content
- [x] External scripts, fonts, styles, network requests
- [x] Responsive styling and breakpoints
- [x] Privacy statements and disclosures
- [x] Deployment behavior (GitHub Actions workflow)
- [x] README vs. code discrepancies (10 items)
- [x] Suspected bugs (11 items listed)
- [x] Verification against actual source (audit Section 17)

### Remaining Gaps

**None blocking Step 3.** All previously-unread files were read and verified. Known items are **recorded, not actioned** (Step 3 is read-only):

| Item | Disposition |
|------|-------------|
| Suspected Bugs #1–#11 (incl. `preview.png` JPEG/1024²; duplicate `magicTerm`; negative extra payment; missing mobile-menu handler; privacy wording) | Documented for Step 4 (baseline) and later steps; intentionally **not** fixed here |
| Two audit wording corrections made | Resolved this session (Bug #1 precision; Unresolved→Resolved questions) |

### Deliverables

- **`MIGRATION_AUDIT.md`** – Full audit report (17 sections, incl. new Verification Record). Status: ✅ Saved and verified.
- **`MIGRATION_STATUS.md`** – This file. Status: ✅ Saved.

### Files Changed in Latest Step

- `MIGRATION_AUDIT.md` (corrected, expanded, marked COMPLETE — Section 17 added)
- `MIGRATION_STATUS.md` (this file — Step 3 marked COMPLETE)
- **No application/source files were modified.**

### Next Steps

1. **Step 5 (Add persistent instructions — AGENTS.md)** — not started.
2. Human: fill the PENDING browser/screenshot cells in `BASELINE_CASES.md` (or run with a browser) before Step 7, and make the 9 decisions in Section F (especially F1: 0% interest).

---

# Step 4 Detail (this session)

## Step 4: Capture Baseline Behavior — ✅ COMPLETE

**Deliverable:** `BASELINE_CASES.md` (new file at repo root).

**Scope honored:** Step 4 is read/record only. **No application files modified, no branch switched, nothing pushed or deployed.**

## Files Changed / Created (this step)

- **Created:** `BASELINE_CASES.md`
- **Updated:** `MIGRATION_STATUS.md` (this file)
- Application files: **none** (`index.html`, `script.js`, `style.css`, `privacy.html`, workflow, README all unchanged)

## Checks Performed (this step)

| Check | Method | Result |
|-------|--------|--------|
| Site serves locally | `python3 -m http.server` + per-path fetch | **PASS** — `/`, `/privacy.html`, `/robots.txt`, `/sitemap.xml`, `/preview.png`, `/script.js`, `/style.css`, `/CNAME` all HTTP 200 |
| Main-calc reference for 10 cases | Node re-implementation of exact `calculate()` / `calculateMagic()` from `script.js` | **PASS** — deterministic values recorded in `BASELINE_CASES.md` |
| Independent cross-check (extra=0 ⇒ baseline equals accelerated) | Same Node run (B7) | **PASS** — both $408,142 / 360 months |
| Extra-payment monotonicity guard (F-check) | B4 vs B7 | **PASS** — extra payment reduces payoff time & interest |
| Down-payment overpayment boundary | A9b (90%, accepted, P&I $253) vs A9c (110%, error) | **PASS** — boundary at ≥ 100% confirmed |
| Browser rendering / screenshots | — | **NOT RUN — no browser available (honestly recorded as PENDING)** |

## Manual / Browser Checks **PENDING** (need a real browser)

- **S1–S5** screenshots (main + magic desktop, mobile viewport, validation message, chart+cards)
- **Browser-observed outputs** for all A/B/C cases (enter the recorded inputs, read the screen, match against the source-formula reference; record any mismatch)
- Keyboard navigation, decimal entry / paste, tab-switch visual state, mobile horizontal-overflow check

## Decisions Needed (Section F of BASELINE_CASES.md) — **do not fix in Step 4**

- **F1 (blocking for Step 7 tests):** 0% interest is currently **rejected** by the UI (`rate <= 0` → error). Decide: keep invalid, or allow a zero-interest payment? The "zero interest" baseline wording in Step 4 assumes it's valid.
- **F2/F9:** negative extra payment / overpayment not validated.
- **F3:** non-numeric input silently → 0.
- **F4:** duplicated `magicTerm` ID (only the leading text input is read).
- **F5:** editing a core Magic field overwrites a manual `magicMonthlyPI`.
- **F6:** post-demo stale results.
- **F7:** 600-month cap ends silently with unpaid balance (should become an explicit `limit-reached` state in Steps 7/10).
- **F8:** `preview.png` is JPEG 1024×1024 (1:1), not ~1200×630.

## Next Step

**Step 5 — Add persistent instructions for Qwen** (create `AGENTS.md` at repo root). **Not started** and not requested this turn.