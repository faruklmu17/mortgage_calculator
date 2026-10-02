/**
 * Step 10 — the pure derivation function for the Extra Payment Magic tab.
 *
 * Receives a snapshot of the *raw* magic field strings, the extra-payment
 * mode, and the `isPIOverride` flag (was the last action a non-core edit?),
 * and runs the same validation → contractual P&I → baseline + accelerated
 * `simulatePayoff` → format pipeline that `script.js#calculateMagic` runs —
 * but as a framework-free, side-effect-free function. That is what lets
 * `ExtraPaymentCalculator.jsx` follow the same "submitted snapshot + derive
 * on render" pattern Step 9 established for the main tab, and lets the test
 * suite exercise the full display shape (including the non-amortizing /
 * limit-reached messaging) without mounting any React.
 *
 * Preserved verbatim from the original (see `script.js#calculateMagic`):
 *   - Validation gates & the combined "Please enter valid mortgage details."
 *     error (F1: 0% still valid via `parseInterestRate`).
 *   - Contractual P&I computed from the ORIGINAL price / downPayment /
 *     rate / term — never from the current balance (Step 10 req #3).
 *   - `isPIOverride` semantics (Step 8 note carried): a manual
 *     `magicMonthlyPI` is respected only when `isPIOverride` is true AND
 *     the value is > 0. Otherwise the calculated P&I wins, and the
 *     calculated value (rounded to whole dollars) is what the UI writes
 *     back to the field (`piAutoFill`).
 *   - Taxes & insurance go into the "New Monthly PITI" display but are NOT
 *     passed into `simulatePayoff` (Step 10 req #4 — HOA isn't even a
 *     magic-tab input, same as the original).
 *   - One-time extra is applied to month 1 only (via `simulatePayoff`'s
 *     `oneTimeApplied` flag — Step 10 req #2).
 *   - `interestSaved > 0` is the strict "savings positive" check that
 *     drives the headline message text and color (Step 8, preserved).
 *
 * Step 10 additions on top of the original (req #7 + approved F7):
 *   - When a simulation reaches the 600-month cap, the result is flagged
 *     `isNonSuccess: true` and the happy "you'll save …" headline is
 *     replaced with a clear non-success warning, so an unpaid loan is never
 *     presented as fully paid off. (`simulatePayoff` itself already returns
 *     `status: 'limit-reached'`; the Step 7 tests pin that — this is the
 *     visible piece of the F7 decision.)
 *   - `nonSuccessReason` (`'non-amortizing'` | `'limit-reached'` | `null`)
 *     lets the UI (and future steps) tell the two apart.
 *
 * Returns a single plain object: no DOM, no React, no sessionStorage, no
 * timers. `ExtraPaymentCalculator` calls it on every render from the
 * `submitted` snapshot (its only derived-value source of truth).
 *
 * @param {object|null} fields     Raw magic field strings, or `null` for the
 *   blank (no calculation yet) state.
 * @param {'monthly'|'one-time'}  [mode='monthly']  Extra-payment mode in effect.
 * @param {boolean}               [isPIOverride=false]  True when the most recent
 *   user action edits a non-core field (balance/tax/insurance/extra/manual P&I),
 *   so a manual `magicMonthlyPI` is honored.
 * @returns {object} Fully-formed display result (see `EXTMAGIC_BLANK` for the
 *   base shape; on success the numeric fields are populated and
 *   `hasSimulation` is true; on validation failure `errorMsg` is set and
 *   `hasSimulation` is false).
 */

import { parseNumeric, parseInterestRate } from './validation.js';
import { calculateMortgage } from './mortgage.js';
import { simulatePayoff } from './amortization.js';
import {
  formatCurrency,
  formatDurationSpan,
  formatShortDuration,
} from './formatting.js';

/**
 * Base display shape for the blank / pre-calculation state. Mirrors Step 8's
 * `INITIAL_RESULT` visually (the tab's first paint looks identical), plus the
 * Step 10 non-success fields and the `piAutoFill` helper field.
 */
export const EXTMAGIC_BLANK = Object.freeze({
  hasCalc: false,
  hasSimulation: false,
  isNonSuccess: false,
  nonSuccessReason: null,
  interestSaved: '$0',
  timeSaved: '0 months',
  standardRemaining: '30y 0m',
  newPayoffTime: '30y 0m',
  originalInterest: '$0',
  newTotalInterest: '$0',
  newTotalMonthly: '$0',
  savingsMessage: 'Enter your details to see the magic happen!',
  savingsColor: 'inherit',
  savingsIsHtml: false,
  errorMsg: '',
  piAutoFill: null,
});

/**
 * Derive the Extra Payment Magic display from a submitted snapshot of the raw
 * field strings. Pure — no React, no DOM, no mutation. See module JSDoc.
 *
 * @param {object|null} fields
 * @param {'monthly'|'one-time'} [mode='monthly']
 * @param {boolean} [isPIOverride=false]  Honor a manual `magicMonthlyPI` only
 *   when true (matching the original `calculateMagic(isPIOverride)` gate).
 */
export function deriveExtraPaymentResult(
  fields,
  mode = 'monthly',
  isPIOverride = false
) {
  if (!fields) return EXTMAGIC_BLANK;

  const price = parseNumeric(fields.magicPrice);
  const downPayment = parseNumeric(fields.magicDownPayment);
  const currentBalanceInput = parseNumeric(fields.magicBalance);
  const ratePercent = parseNumeric(fields.magicRate);
  // Step 8 note #2: original had a duplicate `magicTerm` id (text input +
  // select); the select was unreachable via getElementById. React splits the
  // two controls; we honor the text field first, select as fallback.
  const termYearsRaw =
    parseNumeric(fields.magicTermText) ||
    parseNumeric(fields.magicTermSelect);
  const extraPayment = parseNumeric(fields.extraAmount);
  // Taxes & insurance are display-only (added into "New Monthly PITI"); they
  // deliberately do NOT enter the payoff simulation (Step 10 req #4).
  const monthlyTax = parseNumeric(fields.magicTax) / 12;
  const monthlyInsurance = parseNumeric(fields.magicInsurance) / 12;
  const manualPI = parseNumeric(fields.magicMonthlyPI);

  const originalPrincipal = price - downPayment;
  const startingBalance =
    currentBalanceInput > 0 ? currentBalanceInput : originalPrincipal;

  // ── Validation gates — verbatim from script.js#calculateMagic ──
  // F1 (approved, Step 7): 0% is valid; blank / non-numeric / negative /
  // non-finite rejected. Validated against the raw field text.
  const rawRateNumber = parseInterestRate(fields.magicRate);
  if (
    price <= 0 ||
    (currentBalanceInput <= 0 && downPayment >= price) ||
    !(rawRateNumber >= 0) ||
    !(termYearsRaw > 0)
  ) {
    return {
      ...EXTMAGIC_BLANK,
      hasCalc: true,
      errorMsg: 'Please enter valid mortgage details.',
    };
  }

  // ── Contractual P&I from the ORIGINAL loan (price/down/rate/term). ──
  // req #3: never derived from the current balance as a "new loan".
  const calculatedPI = calculateMortgage({
    price,
    downPayment,
    annualRatePercent: ratePercent,
    termYears: termYearsRaw,
  }).monthlyPI;

  // ── Manual-P&I override (preserved isPIOverride semantics). ──
  // A user-entered `magicMonthlyPI` is used only when the trigger was a
  // non-core field edit (isPIOverride) and the value is > 0. Otherwise the
  // recalculated P&I wins and the UI auto-fills the rounded value.
  const useManualPI = isPIOverride && manualPI > 0;
  const standardMonthlyPI = useManualPI ? manualPI : calculatedPI;
  // piAutoFill: value the UI should write back into the field (null ⇒ keep
  // the user's text, e.g. when honoring a manual override).
  const piAutoFill = useManualPI
    ? null
    : Math.round(standardMonthlyPI).toLocaleString('en-US');

  // ── Baseline (no extra) + accelerated (chosen mode) simulations ──
  const isMonthly = mode === 'monthly';
  const baseline = simulatePayoff({
    startingBalance,
    contractualMonthlyPI: standardMonthlyPI,
    annualRatePercent: ratePercent,
    monthlyExtra: 0,
    oneTimeExtra: 0,
  });
  const accelerated = simulatePayoff({
    startingBalance,
    contractualMonthlyPI: standardMonthlyPI,
    annualRatePercent: ratePercent,
    monthlyExtra: isMonthly ? extraPayment : 0,
    oneTimeExtra: isMonthly ? 0 : extraPayment,
  });

  const baselineInterest = baseline.totalInterest;
  const baselineMonths = baseline.months;
  const newTotalInterest = accelerated.totalInterest;
  const monthsToPayoff = accelerated.months;

  const interestSaved = baselineInterest - newTotalInterest;
  const monthsSaved = baselineMonths - monthsToPayoff;

  // ── Non-success detection (Step 10 req #7 + approved F7) ──
  const anyLimitReached =
    baseline.status === 'limit-reached' ||
    accelerated.status === 'limit-reached';
  // Non-amortizing ⇔ monthly interest in month 1 >= the contractual P&I
  // (i.e. the payment cannot reduce the balance at all / rate > P&I).
  const monthlyRate = ratePercent / 100 / 12;
  const nonAmortizing = standardMonthlyPI <= startingBalance * monthlyRate;
  const nonSuccessReason = anyLimitReached
    ? nonAmortizing
      ? 'non-amortizing'
      : 'limit-reached'
    : null;

  // ── Headline savings message ──
  // Original: savings>0 → HTML + secondary-green; else plain-text prompt.
  // Step 10: a limit-reached payoff is a NON-success → explicit warning so
  // an unpaid loan is never presented as fully paid off.
  let savingsMessage;
  let savingsColor;
  let savingsIsHtml;
  if (anyLimitReached) {
    savingsMessage = nonAmortizing
      ? 'This payment does not amortize the loan — the monthly P&I is not ' +
        'enough to cover interest. Increase the payment to see a payoff.'
      : 'This loan would not be paid off within the 50-year (600-month) ' +
        'simulation limit. Increase the payment to see a payoff.';
    savingsColor = 'var(--danger, #ef4444)';
    savingsIsHtml = false;
  } else if (interestSaved > 0) {
    savingsMessage = `By paying <strong>${formatCurrency(extraPayment)}</strong> extra ${
      isMonthly ? 'every month' : 'one-time'
    }, you'll save <strong>${formatCurrency(interestSaved)}</strong> in total interest!`;
    savingsColor = 'var(--secondary)';
    savingsIsHtml = true;
  } else {
    savingsMessage =
      'Increase your extra payment to see how much you can save!';
    savingsColor = 'inherit';
    savingsIsHtml = false;
  }

  return {
    hasCalc: true,
    hasSimulation: true,
    isNonSuccess: anyLimitReached,
    nonSuccessReason,
    interestSaved: formatCurrency(Math.max(0, interestSaved)),
    timeSaved: formatDurationSpan(monthsSaved),
    standardRemaining: formatShortDuration(baselineMonths),
    newPayoffTime: formatShortDuration(monthsToPayoff),
    originalInterest: formatCurrency(baselineInterest),
    newTotalInterest: formatCurrency(newTotalInterest),
    newTotalMonthly: formatCurrency(
      standardMonthlyPI + monthlyTax + monthlyInsurance
    ),
    savingsMessage,
    savingsColor,
    savingsIsHtml,
    errorMsg: '',
    piAutoFill,
  };
}
