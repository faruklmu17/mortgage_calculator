# Baseline Behavior Cases (Step 4)

> **Purpose:** Reproduce and record the *existing* behavior of the original vanilla
> calculator so it can be compared against the React migration (Steps 7–14).
> A baseline documents existing behavior; it does **not** prove the existing math is correct.

## How to reproduce (original site)

```bash
python3 -m http.server 8000       # or: npx serve .
```

Open `http://localhost:8000`. The original `index.html` + `script.js` are unchanged as of Step 4.

- **Main calculator:** enter Home Price, Down Payment (`$` or `%`), Rate, Term, Tax, Insurance, HOA, then click **Calculate My Payment**.
- **Extra Payment Magic:** click the "Extra Payment Magic" nav link to switch tabs, enter the fields, then click **Calculate Savings**.
- Note: the main calculator recalculates **only on button click** (live `input` listeners are commented out in `script.js`). The Magic tab **does** recalculate on input.

## Reading the tables below — three kinds of value

For every case the table holds **three** value columns. Do not conflate them:

| Column | Meaning | Status |
|--------|---------|--------|
| **Inputs** | Exactly what to type, so the case is reproducible. | ✅ Fully specified |
| **Source-formula reference** | Output computed by re-implementing the *exact* `script.js` math (`calculate` / `calculateMagic`) in Node from the recorded inputs. Deterministic. Used **only to cross-check the browser** later. **Not** a browser observation. | ✅ Computed this session |
| **Browser-observed output** | What the live page actually displays for these inputs. | ⏳ **PENDING — requires a real browser** |
| **Screenshot** | Image of the rendered result. | ⏳ **PENDING — requires a real browser** |

> The agent running this step **has no browser access** and cannot take screenshots.
> Per Step 4 ("Do not invent observed outputs or claim browser tests were run"), the
> browser-observed column and all screenshots are left **PENDING**. The source-formula
> reference is provided so a human can enter the inputs, read the on-screen result, and
> confirm it matches the reference (or record a mismatch as a suspected bug).

---

## A. Main calculator cases

Tax / Insurance / HOA are optional in the app. For reproducibility these cases fix them at
**Tax = 5,500 / yr, Insurance = 1,200 / yr, HOA = 0** unless a case says otherwise.

| # | Inputs (Home Price · Down · Rate · Term · Tax · Ins · HOA) | Source-formula reference (display format) | Browser-observed | Screenshot |
|---|-----------------------------------------------------------|-------------------------------------------|------------------|------------|
| A1 | $400,000 · $80,000 · 6.5% · 30y · 5,500 · 1,200 · 0 | P&I **$2,023**; Principal **$320,000**; Total interest **$408,142**; Monthly taxes&fees **$558**; Total PITI **$2,581**; Total payoff **$929,142**. | ⏳ PENDING | ⏳ PENDING |
| A2 | $400,000 · $80,000 · **0%** · 30y · 5,500 · 1,200 · 0 | **Validation error:** "Please enter a valid interest rate and term." (code rejects `rate <= 0`; no payment is computed) | ⏳ PENDING | ⏳ PENDING |
| A3 | $400,000 · **$400,000** · 6.5% · 30y · 0 · 0 · 0 | **Validation error:** "Down payment must be less than the home price." (zero-loan path is blocked by validation) | ⏳ PENDING | ⏳ PENDING |
| A8 | **price blank** · any · any · any | **Validation error:** "Please enter a valid home price." (blank → `parseInput` → 0) | ⏳ PENDING | ⏳ PENDING |
| A9a | $400,000 · $80,000 · **negative (e.g. -1)** · 30y | **Validation error:** "Please enter a valid interest rate and term." | ⏳ PENDING | ⏳ PENDING |
| A9b | $400,000 · **90 (in % mode** ⇒ $360,000 down) · 6.5% · 30y | Down payment = 90% of price = $360,000 still < price, so a payment **is** computed (P&I = **$253**, principal $40,000). No error. | ⏳ PENDING | ⏳ PENDING |
| A9c | $400,000 · **110 (in % mode** ⇒ $440,000 down) · 6.5% · 30y | **Validation error:** "Down payment must be less than the home price." (down ≥ price; "excessive down payment" error is only reachable at ≥ 100%.) | ⏳ PENDING | ⏳ PENDING |

> **A9b note (excessive down payment as a *percentage*):** with the `%` toggle, "90" is 90% of price
> ($360,000), which is *still below* the $400,000 price, so the validator **accepts** it and returns a
> payment — it does **not** trigger the "Down payment must be less than the home price" error. Only a value
> ≥ 100% (percent) or ≥ 1.0× price (dollar) errors. The "excessive down payment → error" expectation in the
> Step 4 table is only reachable at **≥ 100%**. Record the browser behavior for A9 (choose a clearly
> excessive value such as `110` in % mode to force the error) to decide whether partial overpayment should error.

**Down-payment toggle behavior (preserve):** With the `%` toggle active, entering `20` means $80,000 on a
$400,000 price. Switching modes rewrites the field: `$→%` computes `(value/price)*100` (1 decimal place);
`%→$` computes `round(price * value/100)`. Verify in browser (A1 entered in `$`, then re-entered in `%` as `20`,
should match).

---

## B. Extra Payment Magic cases

Base loan for all Magic cases: **Home Price $400,000 · Down $80,000 · Rate 6.5% · Term 30**
(→ original principal $320,000, contractual P&I $2,023). "Current balance below original"
is isolated in B6.

| # | Inputs (adds to base loan) | Source-formula reference (display format) | Browser-observed | Screenshot |
|---|----------------------------|-------------------------------------------|------------------|------------|
| B4 | Current balance **$320,000**; Extra **$200 / month** (Monthly mode) | Normally remaining **30y 0m**; New payoff **23y 5m**; Interest saved **$105,429**; Time saved **6y 7m**; Orig interest **$408,142** → New **$302,714** | ⏳ PENDING | ⏳ PENDING |
| B5 | Current balance **$320,000**; Extra **$10,000 one-time** (One-time mode) | Normally remaining **30y 0m**; New payoff **27y 5m**; Interest saved **$53,943**; Time saved **2y 7m**; Orig interest **$408,142** → New **$354,199** | ⏳ PENDING | ⏳ PENDING |
| B6 | Current balance **$200,000** (below original); Extra **$200 / month** | Normally remaining **11y 10m**; New payoff **10y 4m**; Interest saved **$12,228**; Time saved **1y 6m**; Orig **$87,189** → New **$74,960** | ⏳ PENDING | ⏳ PENDING |
| B7 | Current balance **$320,000**; Extra **$0** (Monthly mode) | Normally remaining **30y 0m**; New payoff **30y 0m**; Interest saved **$0**; Time saved **0 months**; Orig = New **$408,142** (simulations match) | ⏳ PENDING | ⏳ PENDING |

**One-time timing (preserve):** the one-time extra amount is added to the **first** month's principal
reduction (`oneTimeApplied` flag) — not spread, not after interest. Confirm B5 matches the reference.

**Independent cross-check (must hold for valid amortizing loans):** with extra = 0 (B7) the baseline and
accelerated simulations are identical. A *positive* extra payment must **never** increase payoff time or
total interest. If B4/B5 ever show interest saved ≤ 0 *and* a longer payoff, that is a suspected bug.

---

## C. Tab synchronization case

| # | Action | Source-formula reference (expected field copies) | Browser-observed | Screenshot |
|---|--------|--------------------------------------------------|------------------|------------|
| C10a | In **Main**: Home Price $400,000, Down $80,000, Rate 6.5, Term 30, Tax 5,500, Ins 1,200. Then click **Extra Payment Magic**. | On switching to Magic (only if Magic price field was empty), the app copies: `magicPrice`=400,000, `magicDownPayment`=80,000, **`magicBalance`=320,000** (= price − downPayment), `magicRate`=6.5, `magicTerm`(leading text input)=30, `magicTax`=5,500, `magicInsurance`=1,200, then auto-runs `calculateMagic()`. | ⏳ PENDING | ⏳ PENDING |
| C10b | After C10, edit a value **in Magic**, then switch back to **Main**. | **No reverse sync** — Main values are unchanged (one-way Calculator → Magic only). | ⏳ PENDING | ⏳ PENDING |

> **Preserve:** synchronization is **one-directional** (Calculator → Magic) and occurs **only on tab
> switch**, only when the Magic price field is empty. It is not live and not reversible.

---

## D. Screenshot checklist (all PENDING — no browser access)

| Shot | Description | Status |
|------|-------------|--------|
| S1 | Main calculator, desktop width, with results (A1) | ⏳ PENDING |
| S2 | Extra Payment Magic, desktop width, with results (B4 or B5) | ⏳ PENDING |
| S3 | Main calculator, narrow mobile viewport (~390–430px), check for horizontal overflow | ⏳ PENDING |
| S4 | A validation message (A8 "valid home price" preferred) | ⏳ PENDING |
| S5 | Payment donut chart + result cards (A1) | ⏳ PENDING |

---

## E. Existing behavior we need to **preserve**

1. **Main calculator recalculates only on button click** (live `input` listeners are commented out in `script.js`).
2. **Magic tab recalculates on every `input`** and writes a recomputed contractual P&I back into
   `magicMonthlyPI` unless that field is the focused element.
3. **Validation order & exact messages:**
   - Main: price ≤ 0 → "Please enter a valid home price." → down ≥ price → "Down payment must be less than the home price." → rate/term ≤ 0 → "Please enter a valid interest rate and term."
   - Magic: a single combined check → "Please enter valid mortgage details."
4. **One-time extra payment applied to month 1** of the accelerated simulation (`oneTimeApplied` flag).
5. **Tab sync is one-directional** (Calculator → Magic), **only on tab switch**, only when Magic price is empty.
6. **Down-payment mode toggle** ($ ↔ %) rewrites the field value in both directions.
7. **600-month safety cap** on both baseline and accelerated simulations (unpaid balance at month 600 ends the loop silently — see decision item **F7** in Section F).
8. **Currency display** via `Intl.NumberFormat('en-US')`, 0 decimal places; thousands-formatted on `blur`.
9. **Chart is destroyed and re-created on every main-calculator computation** (`updateChart` → `myDonutChart.destroy()` then `new Chart(...)`).
10. **Magic tab has no chart** — it uses a text `#savingsMessage` and a piggy-bank icon instead.
11. **Typewriter placeholder** on the Main `price` input; **Magic demo** types values when Magic price is empty (gated by `sessionStorage` `mpl_magic_demo_v4`).

## F. Suspected bugs / behaviors requiring an **explicit decision** (do not fix in Step 4)

These come from the Step 3 audit (MIGRATION_AUDIT.md §15) and are surfaced here only so Step 7–10 can
encode the *decided* behavior rather than silently copy the current one:

| # | Case it affects | Question to decide |
|---|-----------------|--------------------|
| F1 | A2 (0% rate) | Code **rejects 0% interest** (`rate <= 0` → error). Should a 0% loan be a valid, zero-interest payment (as the Step 4 table's "zero interest" wording implies)? **Decision needed before Step 7 tests.** |
| F2 | B4/B5/B6 | A **negative** extra payment would act as a draw-down (increase interest). Reject or clamp? |
| F3 | A8 | Non-numeric input silently becomes `0` (`parseInput`). Should that be distinguished from a real 0? |
| F4 | all Magic | The **`magicTerm` ID is duplicated** (text input + select); only the leading text input is read. Is the select dead UI to remove, or should it drive the term? |
| F5 | B6 (PI edit) | Editing a **core** Magic field recalculates and **overwrites** a manual `magicMonthlyPI`. Intended, or a bug? |
| F6 | B5 | **Stale results after Magic demo:** demo clears fields after ~2 s but leaves results on screen until the user types. Intended? |
| F7 | all | **600-month cap** ends with a silently unpaid balance. Should this be an explicit `limit-reached` state (Step 7/10 requirement) rather than a bogus "complete" payoff? |
| F8 | A1 | **`preview.png`** is actually JPEG, 1024×1024 (1:1) — not the recommended ~1200×630 social-card size. (No effect on the calculator; affects social previews.) |
| F9 | A9 | **Negative extra-payment / overpayment** not validated (see F2, F4). |

> **Step 7 (Vitest) must encode the *decided* behavior for F1** in particular: if 0% stays invalid, the
> "zero interest" independent check (0% / $120,000 / 120 months → $1,000/mo) applies only to the *extracted*
> pure function (which should have no validation), **not** to the UI, which currently errors on `rate <= 0`.

---

*Step 4 is **read/record only**. No application files were changed, and no branch was switched. The source
is unchanged and can be re-run to fill the PENDING browser/screenshot cells.*
