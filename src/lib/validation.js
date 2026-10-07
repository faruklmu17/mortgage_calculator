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

/**
 * Parse an **interest rate** field, distinguishing the three ways a value can
 * be "zero-ish" while still rejecting the empty / non-numeric ones:
 *
 *   - blank            (`` , spaces)  → NaN   (reject)
 *   - non-numeric      ("abc")       → NaN   (reject)
 *   - negative         (-1, -6.5)    → -1 / -6.5  (reject by callers)
 *   - non-finite       (Infinity)    → NaN   (reject)
 *   - explicit zero    ("0", "0.0")  → 0     (accept → zero-interest loan)
 *   - normal           ("6.5")       → 6.5   (accept)
 *
 * This is why the UI validates rates against the **raw** field text rather
 * than the `parseNumeric` output (which collapses blank and "abc" to 0).
 *
 * @param {string|number} raw
 * @returns {number}  Parsed rate, or `NaN` when blank / non-numeric / non-finite.
 */
export function parseInterestRate(raw) {
  const s = String(raw ?? '').trim();
  if (s === '') return NaN;
  const n = parseFloat(s.replace(/,/g, ''));
  if (!Number.isFinite(n)) return NaN;
  return n;
}

/** Exact validation messages (verbatim from script.js). */
export const VALIDATION_ERROR_MESSAGES = Object.freeze({
  VALID_HOME_PRICE: 'Please enter a valid home price.',
  DOWNPAYMENT_LESS_THAN_PRICE: 'Down payment must be less than the home price.',
  VALID_RATE_AND_TERM: 'Please enter a valid interest rate and term.',
  VALID_MAGIC_DETAILS: 'Please enter valid mortgage details.',
});

/**
 * Main-calculator validation, in the original order.
 *
 * Decision F1 (approved, Step 7): **0% interest is now a valid rate** and is
 * treated as a zero-interest loan (monthly P&I = principal ÷ termMonths; the
 * amortization schedule produces $0 total interest).
 *
 * Rate is validated from the **raw** field text via {@link parseInterestRate},
 * so negative, blank, non-numeric, and non-finite values are all rejected
 * while an explicit `0` / `0.0` is accepted.
 *
 * @param {object} p
 * @param {number} p.price  Home price (dollars).
 * @param {number} p.downPayment  Down payment (dollars, after any % → $ conversion).
 * @param {string|number} p.annualRatePercent  Raw rate field (string recommended).
 * @param {number} p.termYears
 * @returns {string|null}  Error message or null when inputs are valid.
 *
 * Order preserved from `script.js#calculate()`:
 *   1. price <= 0                    → VALID_HOME_PRICE
 *   2. downPayment >= price          → DOWNPAYMENT_LESS_THAN_PRICE
 *   3. bad rate OR termMonths <= 0   → VALID_RATE_AND_TERM
 */
export function validateMainLoan({ price, downPayment, annualRatePercent, termYears }) {
  const p = Number(price) || 0;
  const d = Number(downPayment) || 0;
  const r = parseInterestRate(annualRatePercent);
  const t = Number(termYears);

  if (p <= 0) return VALIDATION_ERROR_MESSAGES.VALID_HOME_PRICE;
  if (d >= p) return VALIDATION_ERROR_MESSAGES.DOWNPAYMENT_LESS_THAN_PRICE;
  if (!(r >= 0)) return VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM;
  const termMonths = t * 12;
  if (!(termMonths > 0)) return VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM;

  return null;
}

/**
 * Extra Payment Magic validation — mirrors the combined check in
 * `script.js#calculateMagic`. One message for all failure modes.
 *
 * Decision F1: 0% interest is valid; negative / blank / non-numeric rates
 * (and non-finite) are rejected. Uses {@link parseInterestRate} for the same
 * raw-string semantics as {@link validateMainLoan}.
 *
 * @param {object} p
 * @param {number} p.price  Original home price.
 * @param {number} p.downPayment  Original down payment.
 * @param {number} p.currentBalance  Current loan balance (may be 0/blank → fall back to price − down).
 * @param {string|number} p.annualRatePercent  Raw rate field (string recommended).
 * @param {number} p.termYears
 */
export function validateMagicLoan({ price, downPayment, currentBalance, annualRatePercent, termYears }) {
  const p = Number(price) || 0;
  const d = Number(downPayment) || 0;
  const b = Number(currentBalance) || 0;
  const r = parseInterestRate(annualRatePercent);
  const t = Number(termYears);

  if (p <= 0) return VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS;
  if (b <= 0 && d >= p) return VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS;
  if (!(r >= 0)) return VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS;
  if (t <= 0 || !Number.isFinite(t)) return VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS;
  return null;
}
