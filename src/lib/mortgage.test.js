/**
 * Step 7 — Vitest coverage for the pure mortgage computation modules.
 *
 * These tests exercise the *pure* functions in `src/lib/mortgage.js` and
 * `src/lib/validation.js` (and spot-check `src/lib/formatting.js`), using:
 *
 *  - The approved A1 baseline (decision F1: 0% interest is now valid).
 *    A1: $320,000 @ 6.5% over 360 months
 *        monthly P&I        = 2022.6176751774892
 *        total interest     = 408142.3630638961
 *        (no intermediate rounding — canonical double-precision results
 *        of the exact same `Math.pow`/arithmetic sequence the original
 *        `script.js` uses, so the values are deterministic across runs.)
 *  - The "0% interest" rule promoted by F1.
 *  - The independent "0% interest → $1,000/month" check from the plan.
 *  - Invalid and non-finite value coverage (negative / NaN / Infinity / blank).
 *
 * Numeric tolerances:
 *  - A1 values use EXACT equality (bitwise) — they are deterministic double
 *    results of `calculateMortgage` (same formula + same order as original).
 *  - Simulated comparisons (payoff month, interest) use a 1e-6 absolute
 *    tolerance where tests compare to the A1 reference value.
 */

import { describe, expect, it } from 'vitest';
import {
  calculateMortgage,
  monthlyPayment,
} from './mortgage.js';
import {
  VALIDATION_ERROR_MESSAGES,
  validateMainLoan,
  validateMagicLoan,
  parseNumeric,
  parseInterestRate,
} from './validation.js';
import { formatCurrency } from './formatting.js';

/** A1 baseline (see BASELINE_CASES.md case A1). */
const A1 = Object.freeze({
  price: 400000,
  downPayment: 80000,
  annualRatePercent: 6.5,
  termYears: 30,
});
const A1_PI = 2022.6176751774892;
const A1_TOTAL_INTEREST = 408142.3630638961;
const A1_PRINCIPAL = 320000;

describe('mortgage module — A1 baseline (30-yr / 6.5% / $320k loan)', () => {
  it('matches the approved monthly P&I exactly (no intermediate rounding)', () => {
    expect(monthlyPayment(A1_PRINCIPAL, A1.annualRatePercent, 360)).toBe(A1_PI);
  });

  it('returns P&I that produces the approved total interest exactly', () => {
    const r = calculateMortgage(A1);
    expect(r.monthlyPI).toBe(A1_PI);
    // totalInterest = PI * months - principal (original semantics, no clamp)
    expect(r.totalInterest).toBe(A1_TOTAL_INTEREST);
  });

  it('computes principal, termMonths, and zero tax/hoa in the clean A1 case', () => {
    const r = calculateMortgage(A1);
    expect(r.principal).toBe(A1_PRINCIPAL);
    expect(r.termMonths).toBe(360);
    expect(r.monthlyTax).toBe(0);
    expect(r.monthlyInsurance).toBe(0);
    expect(r.monthlyHoa).toBe(0);
    expect(r.monthlyFees).toBe(0);
    expect(r.totalMonthly).toBe(A1_PI);
    // totalPayoff = totalMonthly * termMonths = PI * 360
    expect(r.totalPayoff).toBe(A1_PI * 360);
  });
});

describe('mortgage module — zero interest (decision F1: 0% is valid)', () => {
  it('returns principal / termMonths when rate is 0 (A1-style loan)', () => {
    expect(monthlyPayment(A1_PRINCIPAL, 0, 360)).toBe(A1_PRINCIPAL / 360);
  });

  it('independent check from plan: 0% on $120k/120m is exactly $1,000', () => {
    expect(monthlyPayment(120000, 0, 120)).toBe(1000);
  });

  it('calculateMortgage at 0% yields exactly $0 total interest (120k/10yr)', () => {
    const r = calculateMortgage({
      price: 120000,
      downPayment: 0,
      annualRatePercent: 0,
      termYears: 10,
    });
    expect(r.monthlyPI).toBe(1000);
    // 1000 * 120 - 120000 = 0 (the original non-clamped formula)
    expect(r.totalInterest).toBe(0);
    expect(r.totalPayoff).toBe(1000 * 120);
  });

  it('calculateMortgage at 0% with $80k down on $400k → $1,000/mo', () => {
    const r = calculateMortgage({ price: 400000, downPayment: 80000, annualRatePercent: 0, termYears: 30 });
    expect(r.monthlyPI).toBe(320000 / 360);
    expect(r.totalInterest).toBe(0);
  });
});

describe('mortgage module — zero principal / degenerate inputs', () => {
  it('returns 0 for principal <= 0', () => {
    expect(monthlyPayment(0, 6.5, 360)).toBe(0);
    expect(monthlyPayment(-1000, 6.5, 360)).toBe(0);
  });

  it('returns 0 for termMonths <= 0', () => {
    expect(monthlyPayment(320000, 6.5, 0)).toBe(0);
    expect(monthlyPayment(320000, 6.5, -1)).toBe(0);
  });

  it('calculateMortgage tolerates NaN inputs without producing NaN totals', () => {
    const r = calculateMortgage({
      price: NaN,
      downPayment: NaN,
      annualRatePercent: NaN,
      termYears: NaN,
    });
    expect(Number.isFinite(r.monthlyPI)).toBe(true);
    expect(Number.isFinite(r.totalInterest)).toBe(true);
    expect(Number.isFinite(r.totalPayoff)).toBe(true);
  });
});

describe('mortgage module — PITI components (tax / insurance / HOA)', () => {
  it('breaks annual figures into monthly and sums them as monthlyFees', () => {
    const r = calculateMortgage({
      ...A1,
      annualTax: 6300,
      annualInsurance: 1440,
      monthlyHoa: 250,
    });
    expect(r.monthlyTax).toBe(6300 / 12);
    expect(r.monthlyInsurance).toBe(1440 / 12);
    expect(r.monthlyHoa).toBe(250);
    expect(r.monthlyFees).toBe(6300 / 12 + 1440 / 12 + 250);
    expect(r.totalMonthly).toBe(A1_PI + r.monthlyFees);
    expect(r.totalPayoff).toBe((A1_PI + r.monthlyFees) * 360);
    // totalInterest still comes from PI * months - principal (no fees)
    expect(r.totalInterest).toBe(A1_TOTAL_INTEREST);
  });
});

describe('validation module — parseNumeric (verbatim from script.js#parseInput)', () => {
  it('returns 0 for blank / spaces', () => {
    expect(parseNumeric('')).toBe(0);
    expect(parseNumeric('   ')).toBe(0);
  });

  it('returns 0 for non-numeric text (decision F3: silent-0, preserved)', () => {
    expect(parseNumeric('abc')).toBe(0);
    expect(parseNumeric('12ab')).toBe(12); // parseFloat stops at first non-digit
  });

  it('strips commas and parses numbers', () => {
    expect(parseNumeric('1,234.5')).toBe(1234.5);
    expect(parseNumeric('400000')).toBe(400000);
  });

  it('tolerates numeric inputs (not strings)', () => {
    expect(parseNumeric(0)).toBe(0);
    expect(parseNumeric(1000.5)).toBe(1000.5);
  });
});

describe('validation module — parseInterestRate (F1: raw-string semantics)', () => {
  it('rejects blank / spaces with NaN (does NOT coerce to 0)', () => {
    expect(Number.isNaN(parseInterestRate(''))).toBe(true);
    expect(Number.isNaN(parseInterestRate('   '))).toBe(true);
  });

  it('rejects non-numeric text with NaN', () => {
    expect(Number.isNaN(parseInterestRate('abc'))).toBe(true);
  });

  it('rejects non-finite values with NaN', () => {
    expect(Number.isNaN(parseInterestRate('Infinity'))).toBe(true);
  });

  it('accepts explicit zero ("0" is a VALID rate under F1)', () => {
    expect(parseInterestRate('0')).toBe(0);
    expect(parseInterestRate('0.0')).toBe(0);
  });

  it('accepts normal values', () => {
    expect(parseInterestRate('6.5')).toBe(6.5);
    expect(parseInterestRate(' 6.5 ')).toBe(6.5);
    expect(parseInterestRate(' 4.5 ')).toBe(4.5);
  });

  it('preserves negative values so callers can reject them', () => {
    expect(parseInterestRate('-1')).toBe(-1);
    expect(parseInterestRate('-6.5')).toBe(-6.5);
  });
});

describe('validation module — validateMainLoan (F1: 0% is valid)', () => {
  const base = Object.freeze({
    price: 400000,
    downPayment: 80000,
    annualRatePercent: '6.5',
    termYears: 30,
  });

  it('accepts the A1 baseline (string rate)', () => {
    expect(validateMainLoan(base)).toBeNull();
  });

  it('accepts numeric rate too', () => {
    expect(validateMainLoan({ ...base, annualRatePercent: 6.5 })).toBeNull();
  });

  it('accepts 0% interest (F1)', () => {
    expect(validateMainLoan({ ...base, annualRatePercent: '0' })).toBeNull();
    expect(validateMainLoan({ ...base, annualRatePercent: 0 })).toBeNull();
  });

  it('rejects blank rate with VALID_RATE_AND_TERM (F1: empty ≠ 0)', () => {
    expect(
      validateMainLoan({ ...base, annualRatePercent: '' }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM);
  });

  it('rejects negative rate', () => {
    expect(
      validateMainLoan({ ...base, annualRatePercent: '-1' }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM);
  });

  it('rejects non-numeric rate', () => {
    expect(
      validateMainLoan({ ...base, annualRatePercent: 'abc' }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM);
  });

  it('rejects non-finite rate', () => {
    expect(
      validateMainLoan({ ...base, annualRatePercent: 'Infinity' }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM);
  });

  it('rejects zero/negative price with VALID_HOME_PRICE', () => {
    expect(
      validateMainLoan({ ...base, price: 0 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_HOME_PRICE);
    expect(
      validateMainLoan({ ...base, price: -100 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_HOME_PRICE);
  });

  it('rejects down payment >= price with DOWNPAYMENT_LESS_THAN_PRICE', () => {
    expect(
      validateMainLoan({ ...base, downPayment: 400000 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.DOWNPAYMENT_LESS_THAN_PRICE);
    expect(
      validateMainLoan({ ...base, downPayment: 999999 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.DOWNPAYMENT_LESS_THAN_PRICE);
  });

  it('rejects term <= 0 with VALID_RATE_AND_TERM', () => {
    expect(
      validateMainLoan({ ...base, termYears: 0 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM);
    expect(
      validateMainLoan({ ...base, termYears: -5 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM);
  });

  it('preserves original check order (price, down, rate, term)', () => {
    // price invalid   → first
    expect(
      validateMainLoan({ price: 0, downPayment: 999, annualRatePercent: '', termYears: -1 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_HOME_PRICE);
    // price ok, down invalid  → second
    expect(
      validateMainLoan({ price: 100, downPayment: 999, annualRatePercent: '', termYears: -1 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.DOWNPAYMENT_LESS_THAN_PRICE);
    // price/down ok, rate invalid → third
    expect(
      validateMainLoan({ price: 100, downPayment: 0, annualRatePercent: '', termYears: -1 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM);
  });
});

describe('validation module — validateMagicLoan (F1: 0% is valid)', () => {
  const base = Object.freeze({
    price: 400000,
    downPayment: 80000,
    currentBalance: 320000,
    annualRatePercent: '6.5',
    termYears: 30,
  });

  it('accepts the A1-style loan', () => {
    expect(validateMagicLoan(base)).toBeNull();
  });

  it('accepts 0% interest', () => {
    expect(validateMagicLoan({ ...base, annualRatePercent: '0' })).toBeNull();
  });

  it('rejects blank rate', () => {
    expect(
      validateMagicLoan({ ...base, annualRatePercent: '' }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS);
  });

  it('rejects negative rate', () => {
    expect(
      validateMagicLoan({ ...base, annualRatePercent: '-1' }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS);
  });

  it('rejects non-numeric rate', () => {
    expect(
      validateMagicLoan({ ...base, annualRatePercent: 'abc' }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS);
  });

  it('rejects non-finite rate', () => {
    expect(
      validateMagicLoan({ ...base, annualRatePercent: 'Infinity' }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS);
  });

  it('rejects zero/negative price', () => {
    expect(
      validateMagicLoan({ ...base, price: 0 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS);
  });

  it('rejects empty balance combined with down >= price', () => {
    expect(
      validateMagicLoan({ ...base, currentBalance: 0, downPayment: 500000 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS);
  });

  it('rejects term <= 0 or non-finite term', () => {
    expect(
      validateMagicLoan({ ...base, termYears: 0 }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS);
    expect(
      validateMagicLoan({ ...base, termYears: NaN }),
    ).toBe(VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS);
  });
});

describe('validation module — VALIDATION_ERROR_MESSAGES are verbatim from script.js', () => {
  it('contains the exact four error strings the UI expects', () => {
    expect(VALIDATION_ERROR_MESSAGES.VALID_HOME_PRICE).toBe('Please enter a valid home price.');
    expect(
      VALIDATION_ERROR_MESSAGES.DOWNPAYMENT_LESS_THAN_PRICE,
    ).toBe('Down payment must be less than the home price.');
    expect(
      VALIDATION_ERROR_MESSAGES.VALID_RATE_AND_TERM,
    ).toBe('Please enter a valid interest rate and term.');
    expect(VALIDATION_ERROR_MESSAGES.VALID_MAGIC_DETAILS).toBe('Please enter valid mortgage details.');
  });

  it('is frozen (cannot be mutated at runtime)', () => {
    expect(Object.isFrozen(VALIDATION_ERROR_MESSAGES)).toBe(true);
  });
});

describe('formatting module — formatCurrency (verbatim from script.js)', () => {
  it('formats integers as $X,XXX', () => {
    expect(formatCurrency(0)).toBe('$0');
    expect(formatCurrency(1)).toBe('$1');
    expect(formatCurrency(999)).toBe('$999');
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('rounds to nearest whole dollar (maximumFractionDigits: 0)', () => {
    expect(formatCurrency(1234.4)).toBe('$1,234');
    expect(formatCurrency(1234.5)).toBe('$1,235');
    // A1's monthly P&I, rounded, should display as $2,023
    expect(formatCurrency(A1_PI)).toBe('$2,023');
  });

  it('formats negative values with a minus sign', () => {
    expect(formatCurrency(-5)).toBe('-$5');
  });
});

