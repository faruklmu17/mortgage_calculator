/**
 * Extra Payment Magic — pure derivation of the tab's displayed result.
 *
 * Extracted in Step 10 so the React component renders from a pure
 * function of the raw field strings (AGENTS.md: "Derive calculated
 * results from inputs. Do not store redundant calculated values in
 * state" — the same pattern Step 9 applied to the main calculator),
 * and so the baseline-vs-React parity can be pinned by Vitest without
 * a browser.
 *
 * The behavior mirrors the original `script.js#calculateMagic`
 * (pre-migration), with the documented differences:
 *
 *   1. Decision F7 (approved in the Step 10 request): a simulation that
 *      hits the 600-month cap without reaching a zero balance is
 *      surfaced explicitly via `limitWarning` (plus a trailing '+' on
 *      the truncated duration) instead of being presented as a
 *      completed payoff. A payment that does not even cover the first
 *      month's interest gets a specific non-amortizing warning. The
 *      "you'll save …" success message is suppressed whenever either
 *      simulation is not a genuine payoff.
 *   2. The original's duplicated `id="magicTerm"` (text input + select,
 *      decision F4 — still unresolved) is resolved FOR PARITY by
 *      reading only the text input: the original
 *      `document.getElementById('magicTerm')` returned the first
 *      element in document order, which was the text input. The select
 *      was dead UI (no listeners, never read, never written by the tab
 *      sync).
 *
 * Taxes, insurance, and (absent in this tab) HOA never enter the
 * payoff simulations — they only appear in the displayed
 * `newTotalMonthly` PITI figure, exactly as in the original.
 */

import { parseNumeric, validateMagicLoan } from './validation.js';
import { calculateMortgage } from './mortgage.js';
import { comparePayoffs, SIMULATION_MONTH_LIMIT } from './amortization.js';
import {
  formatCurrency,
  formatDurationSpan,
  formatShortDuration,
} from './formatting.js';

/**
 * Magic fields whose edit re-derived the contractual P&I in the original
 * (`calculateMagic(false)` listeners on magicPrice, magicDownPayment,
 * magicRate, and the leading magicTerm text input). Everything else
 * (balance, tax, insurance, extra amount, manual P&I) used
 * `calculateMagic(true)`. The term SELECT had no listener at all.
 */
export const CORE_MAGIC_KEYS = new Set([
  'magicPrice',
  'magicDownPayment',
  'magicRate',
  'magicTermText',
]);

/**
 * Sentinel display shown before the first successful calculation and
 * whenever validation fails. The values match the original static HTML
 * initial markup byte-for-byte ("30 Years", "0 years", "$0", "Enter your
 * details to see the magic happen!").
 *
 * (On validation failure the original kept the previously displayed
 * values; the React migration resets to this sentinel, consistent with
 * the Step 9 main-calculator behavior. Documented in
 * MIGRATION_STATUS.md.)
 */
export const BLANK_MAGIC_RESULT = {
  interestSaved: '$0',
  timeSaved: '0 years',
  standardRemaining: '30 Years',
  newPayoffTime: '30 Years',
  originalInterest: '$0',
  newTotalInterest: '$0',
  newTotalMonthly: '$0',
  savingsMessage: 'Enter your details to see the magic happen!',
  savingsColor: 'inherit',
  savingsIsHtml: false,
  limitWarning: '',
  errorMsg: '',
  hasCalc: false,
};

/**
 * The original `magicMonthlyPI` auto-fill, as a pure function.
 *
 * Mirrors script.js#calculateMagic:
 *
 *   let standardMonthlyPI = parseInput(magicMonthlyPI.value);
 *   if (standardMonthlyPI <= 0 || !isPIOverride) {
 *     standardMonthlyPI = calculatedPI;
 *     if (document.activeElement !== magicMonthlyPI) {
 *       magicMonthlyPI.value = Math.round(standardMonthlyPI).toLocaleString();
 *     }
 *   }
 *
 * `force` corresponds to `!isPIOverride` (core-field edits, the
 * Calculate button, mode toggles, and the tab sync — all of which
 * re-derived the P&I and rewrote the field). Without force, the field is
 * rewritten only when it holds a non-positive value. `isFocused`
 * reproduces the original focus guard (a focused field is never
 * overwritten, even though the simulation still uses the calculated
 * P&I).
 *
 * Note the original wrote `Math.round(calculatedPI).toLocaleString()`
 * (no explicit locale) while the tab sync wrote
 * `principal.toLocaleString('en-US')`; both are preserved as-is.
 *
 * @param {object} inputs  The magic field strings.
 * @param {boolean} [options.force]   Core-event semantics (always fill).
 * @param {boolean} [options.isFocused]  True when the P&I field has focus.
 * @returns {{inputs: object, filledPI: boolean}}  `filledPI` is true when
 *   the original fill branch was taken — the simulation must then use the
 *   UNROUNDED calculated P&I even though the field displays the rounded
 *   value. `inputs` is a new object only when the field string changed.
 */
export function applyPIAutoFill(inputs, { force = false, isFocused = false } = {}) {
  const price = parseNumeric(inputs.magicPrice);
  const downPayment = parseNumeric(inputs.magicDownPayment);
  const termYears = parseNumeric(inputs.magicTermText);

  // The original validated before touching the P&I field; an invalid
  // form early-returned and left every field untouched.
  const valid =
    validateMagicLoan({
      price,
      downPayment,
      currentBalance: parseNumeric(inputs.magicBalance),
      annualRatePercent: inputs.magicRate,
      termYears,
    }) === null;
  if (!valid) return { inputs, filledPI: false };

  const manualPI = parseNumeric(inputs.magicMonthlyPI);
  const branchTaken = force || manualPI <= 0;
  if (!branchTaken) return { inputs, filledPI: false };

  const calculatedPI = calculateMortgage({
    price,
    downPayment,
    annualRatePercent: parseNumeric(inputs.magicRate),
    termYears,
  }).monthlyPI;
  const rounded = Math.round(calculatedPI).toLocaleString();
  if (isFocused || inputs.magicMonthlyPI === rounded) {
    return { inputs, filledPI: true };
  }
  return { inputs: { ...inputs, magicMonthlyPI: rounded }, filledPI: true };
}

/**
 * Pure: raw magic inputs + extra mode + P&I-override flag → the displayed
 * result shape. Recomputed on every render (the magic tab recalculated
 * live on every input in the original), so no derived value is stored in
 * React state.
 *
 * The contractual P&I is always derived from the ORIGINAL loan
 * (price, down payment, rate, term) — never from the current balance,
 * which is only the starting point of the forward-looking simulations
 * (Step 10 requirement: do not treat the current balance as a new loan).
 *
 * @param {object} inputs  The magic field strings (raw, as typed).
 * @param {'monthly'|'one-time'} mode
 * @param {boolean} [piIsManual]  True when the P&I field holds a
 *   user-entered value the original would honor (`calculateMagic(true)`
 *   with value > 0). False → the unrounded calculated P&I is used.
 * @returns {object} BLANK_MAGIC_RESULT (possibly with `errorMsg` set) on
 *   validation failure; otherwise the formatted display values plus
 *   `limitWarning` (F7) and `hasCalc: true`.
 */
export function deriveExtraPaymentResult(inputs, mode, piIsManual = false) {
  const price = parseNumeric(inputs.magicPrice);
  const downPayment = parseNumeric(inputs.magicDownPayment);
  const currentBalanceInput = parseNumeric(inputs.magicBalance);
  const ratePercent = parseNumeric(inputs.magicRate);
  // F4 parity: the original read ONLY the leading text input (the first
  // element with id="magicTerm" in document order). The select never
  // drove the calculation and is ignored here.
  const termYears = parseNumeric(inputs.magicTermText);
  const extraPayment = parseNumeric(inputs.extraAmount);
  const monthlyTax = parseNumeric(inputs.magicTax) / 12;
  const monthlyInsurance = parseNumeric(inputs.magicInsurance) / 12;

  // Same single combined check and message as script.js#calculateMagic.
  const error = validateMagicLoan({
    price,
    downPayment,
    currentBalance: currentBalanceInput,
    annualRatePercent: inputs.magicRate,
    termYears,
  });
  if (error) return { ...BLANK_MAGIC_RESULT, errorMsg: error };

  const originalPrincipal = price - downPayment;
  // Start balance defaults to the original principal when blank/≤ 0.
  const startingBalance = currentBalanceInput > 0 ? currentBalanceInput : originalPrincipal;

  const calculatedPI = calculateMortgage({
    price,
    downPayment,
    annualRatePercent: ratePercent,
    termYears,
  }).monthlyPI;
  const manualPI = parseNumeric(inputs.magicMonthlyPI);
  const standardMonthlyPI =
    piIsManual && manualPI > 0 ? manualPI : calculatedPI;

  const isMonthly = mode === 'monthly';
  const { baseline, accelerated, interestSaved, monthsSaved } = comparePayoffs({
    startingBalance,
    contractualMonthlyPI: standardMonthlyPI,
    annualRatePercent: ratePercent,
    monthlyExtra: isMonthly ? extraPayment : 0,
    oneTimeExtra: isMonthly ? 0 : extraPayment,
  });

  // F7 (approved): surface simulations that did not actually pay off.
  // A payment that is below the first month's interest grows the balance
  // (and therefore can never pay off); a payment above interest that
  // still does not finish within the 600-month window is truncated.
  const monthlyRate = ratePercent / 100 / 12;
  const firstMonthInterest = startingBalance * monthlyRate;
  const baselineMonth1Principal = standardMonthlyPI - firstMonthInterest;
  // Both extra modes apply their amount in month 1 (the monthly extra
  // every month, the one-time extra only in month 1).
  const acceleratedMonth1Principal = baselineMonth1Principal + extraPayment;

  let limitWarning = '';
  if (acceleratedMonth1Principal < 0) {
    limitWarning =
      "Your payment does not cover the first month's interest, so the " +
      'balance would grow instead of shrinking. Increase your payment ' +
      'or extra payment.';
  } else if (baselineMonth1Principal < 0) {
    limitWarning =
      'Your current payment alone does not cover the first month\'s ' +
      'interest at this rate. The extra payment is what keeps the ' +
      'balance from growing.';
  } else if (accelerated.status === 'limit-reached') {
    limitWarning =
      `Even with this extra payment, the loan is not fully paid off ` +
      `within the 50-year (${SIMULATION_MONTH_LIMIT}-month) simulation ` +
      `limit. Results are shown truncated at ${SIMULATION_MONTH_LIMIT} ` +
      `months.`;
  } else if (baseline.status === 'limit-reached') {
    limitWarning =
      `Your current payment does not fully pay off the loan within the ` +
      `50-year (${SIMULATION_MONTH_LIMIT}-month) simulation limit, so ` +
      `the baseline figures are truncated at ${SIMULATION_MONTH_LIMIT} ` +
      `months.`;
  }

  // The success message claims a completed payoff, so it is suppressed
  // whenever either simulation is not a genuine payoff (F7).
  const savedPositive = interestSaved > 0 && !limitWarning;
  const truncatedSuffix = (sim) => (sim.status === 'limit-reached' ? '+' : '');

  return {
    ...BLANK_MAGIC_RESULT,
    hasCalc: true,
    interestSaved: formatCurrency(Math.max(0, interestSaved)),
    timeSaved: formatDurationSpan(monthsSaved),
    standardRemaining: formatShortDuration(baseline.months) + truncatedSuffix(baseline),
    newPayoffTime: formatShortDuration(accelerated.months) + truncatedSuffix(accelerated),
    originalInterest: formatCurrency(baseline.totalInterest),
    newTotalInterest: formatCurrency(accelerated.totalInterest),
    newTotalMonthly: formatCurrency(
      standardMonthlyPI + monthlyTax + monthlyInsurance,
    ),
    savingsMessage: savedPositive
      ? `By paying <strong>${formatCurrency(extraPayment)}</strong> extra ${
          isMonthly ? 'every month' : 'one-time'
        }, you'll save <strong>${formatCurrency(interestSaved)}</strong> in total interest!`
      : limitWarning
        ? 'Resolve the warning above to see your total interest savings.'
        : 'Increase your extra payment to see how much you can save!',
    savingsColor: savedPositive ? 'var(--secondary)' : 'inherit',
    savingsIsHtml: savedPositive,
    limitWarning,
    errorMsg: '',
  };
}
