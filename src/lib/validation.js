/**
 * Input parsing + validation. Pure functions, no DOM.
 *
 * Message strings are copied verbatim from `script.js` so the migrated UI
 * displays byte-identical error text (Step 7 requirement: "preserve
 * validation order and messages"). Do not re-word them without an explicit
 * decision in BASELINE_CASES.md Section F.
 */

/**
 * Parse a user-typed numeric field exactly the way `script.js#parseInput`
 * does: strip commas, parseFloat, fall back to 0.
 *
 * NOTE: "abc" → 0 (same as blank). See decision F3 (non-numeric silent-0)
 * in BASELINE_CASES.md — not changed here to preserve behavior.
 *
 * @param {string|number} val
 * @returns {number}
 */
export function parseNumeric(val) {
  return parseFloat(String(val).replace(/,/g, '')) || 0;
}

/** Exact validation messages (verbatim from script.js). */
export const VALIDATION_ERROR_MESSAGES = Object.freeze({
  VALID_HOME_PRICE: 'Please enter a valid home price.',
  VALID_RATE_AND_TERM: 'Please enter a valid interest rate and term.',
  DOWNPAYMENT_LESS_THAN_PRICE: 'Down payment must be less than the home price.',
  VALID_MAGIC_DETAILS: 'Please enter valid mortgage details.',
});

/**
 * Main-calculator validation, in the original order.
 *
 * @param {object} p
 * @param {number} p.price  Home price (dollars).
 * @param {number} p.downPayment  Down payment (dollars, after any % → $ mode conversion).
 * @param {number} p.annualRatePercent
 * @param {number} p.termYears
 * @returns {string|null}  Error message or null when inputs are valid.
 *
 * Order matches `script.js#calculate()`:
 *   1. price <= 0                    → VALID_HOME_PRICE
 *   2. downPayment >= price          → DOWNPAYMENT_LESS_THAN_PRICE
 *   3. monthlyRate <= 0 || months <= 0 → VALID_RATE_AND_TERM
 *
 * Decision F1 (0% interest) — currently **rejected** by rule 3. This function
 * preserves that decision. Flip it only after F1 is resolved.
 */
export function validateMainLoan({ price, downPayment, annualRatePercent, termYears }) {
  const p = Number(price) || 0;
  const d = Number(downPayment) || 0;
  const r = Number(annualRatePercent) || 0;
  const t = Number(termYears) || 0;

  if (p <= 0) return VALIDATION_ERROR_MESSAGES.VALID_HOME_PRICE;
  if (d >= p) return VALIDATION_ERROR_MESSAGES.DOWNPAYMENT_LESS_THAN_PRICE;
  const monthlyRate = r / 100 / 12;
  const termMonths = t * 12;
  if (monthlyRate <= 0 || termMonths <= 0) return VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM;

  return null;
}

/**
 * Extra Payment Magic validation — mirrors the combined check in
 * `script.js#calculateMagic`. One message for all failure modes.
 *
 * Original predicate:
 *   price <= 0 || (currentBalance <= 0 && downPayment >= price) || rate <= 0 || termYears <= 0
 * @param {object} p
 * @param {number} p.price  Original home price.
 * @param {number} p.downPayment  Original down payment.
 * @param {number} p.currentBalance  Current loan balance (may be 0/blank → fall back to price − down).
 * @param {number} p.annualRatePercent
 * @param {number} p.termYears
 */
export function validateMagicLoan({ price, downPayment, currentBalance, annualRatePercent, termYears }) {
  const p = Number(price) || 0;
  const d = Number(downPayment) || 0;
  const b = Number(currentBalance) || 0;
  const r = Number(annualRatePercent) || 0;
  const t = Number(termYears) || 0;

  if (p <= 0) return VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS;
  if (b <= 0 && d >= p) return VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS;
  if (r <= 0) return VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS;
  if (t <= 0) return VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS;
  return null;
}
