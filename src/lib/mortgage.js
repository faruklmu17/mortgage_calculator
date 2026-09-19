/**
 * Pure mortgage-payment calculation functions.
 *
 * Extracted verbatim from `script.js` (Step 7 of the migration plan).
 * These functions are framework- and DOM-free: they receive plain numeric
 * inputs and return plain numeric results. Rounding, ordering, and
 * payment-timing semantics match the original vanilla implementation so
 * that the extracted functions can be cross-checked against the baseline
 * reference values recorded in BASELINE_CASES.md.
 *
 * IMPORTANT — validation is NOT applied here. Callers should invoke
 * `validateMainLoan` (see ./validation.js) before using `monthlyPayment`
 * on values that came from user input. The function is also useful for
 * hypothetical / test values (e.g. 0% interest) that the UI currently
 * rejects — decision item F1 in BASELINE_CASES.md.
 */

/**
 * Standard fixed-rate P&I: `monthlyPI = P * i * (1+i)^n / ((1+i)^n - 1)`.
 *
 * @param {number} principal  Loan principal (0 → returns 0).
 * @param {number} annualRatePercent  Annual rate, e.g. 6.5 for 6.5%.
 * @param {number} termMonths  Number of monthly payments, e.g. 360.
 * @returns {number} P&I amount (no rounding).
 */
export function monthlyPayment(principal, annualRatePercent, termMonths) {
  if (principal <= 0 || termMonths <= 0) return 0;
  const i = annualRatePercent / 100 / 12;
  if (i === 0) return principal / termMonths;
  const x = Math.pow(1 + i, termMonths);
  return (principal * x * i) / (x - 1);
}

/**
 * Compute all derived monthly-amount fields that the main calculator
 * renders. Mirrors the arithmetic in `script.js`'s `calculate()`, but
 * performs no DOM writes and no display-string formatting.
 *
 * @param {object} p
 * @param {number} p.price  Home price.
 * @param {number} p.downPayment  Down payment in dollars (already normalized).
 * @param {number} p.annualRatePercent
 * @param {number} p.termYears
 * @param {number} [p.annualTax=0]  Annual property taxes.
 * @param {number} [p.annualInsurance=0]  Annual homeowners insurance.
 * @param {number} [p.monthlyHoa=0]  Monthly HOA.
 * @returns {{
 *   principal: number,
 *   monthlyPI: number,
 *   monthlyTax: number,
 *   monthlyInsurance: number,
 *   monthlyFees: number,   // tax + insurance + hoa (the "Taxes & Fees" card)
 *   totalMonthly: number,  // PITI
 *   totalInterest: number, // PI * months - principal (no clamp; can be 0 when i=0)
 *   totalPayoff: number,   // totalMonthly * termMonths
 *   termMonths: number
 * }}
 */
export function calculateMortgage({
  price,
  downPayment,
  annualRatePercent,
  termYears,
  annualTax = 0,
  annualInsurance = 0,
  monthlyHoa = 0,
} = {}) {
  const priceN = Number(price) || 0;
  const downN = Number(downPayment) || 0;
  const rateN = Number(annualRatePercent) || 0;
  const termYearsN = Number(termYears) || 0;
  const termMonths = Math.round(termYearsN * 12);

  const principal = priceN - downN;
  const monthlyPI = monthlyPayment(principal, rateN, termMonths);
  const monthlyTax = (Number(annualTax) || 0) / 12;
  const monthlyInsurance = (Number(annualInsurance) || 0) / 12;
  const monthlyHoaN = Number(monthlyHoa) || 0;
  const monthlyFees = monthlyTax + monthlyInsurance + monthlyHoaN;
  const totalMonthly = monthlyPI + monthlyFees;
  // Preserves the original formula: (PI * months - principal) — NOT clamped.
  // (For 0% interest this is exactly 0; for any valid amortizing loan it is
  // positive.)
  const totalInterest = monthlyPI * termMonths - principal;
  const totalPayoff = totalMonthly * termMonths;

  return {
    principal,
    monthlyPI,
    monthlyTax,
    monthlyInsurance,
    monthlyFees,
    totalMonthly,
    totalInterest,
    totalPayoff,
    termMonths,
  };
}
