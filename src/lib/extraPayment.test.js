/**
 * Step 10 — Vitest coverage for the Extra Payment Magic derivation
 * (`src/lib/extraPayment.js`).
 *
 * These tests pin the React tab's displayed result to the original
 * vanilla behavior using the identical inputs from BASELINE_CASES.md
 * (section B), plus the Step 10 requirements:
 *
 *   - Contractual P&I comes from the ORIGINAL loan, never from the
 *     current balance (B6 proves it: same $2,581 PITI at a $200k
 *     balance as at the full $320k principal).
 *   - Lump-sum timing (month 1), rounding, and manual P&I overrides.
 *   - Taxes / insurance stay outside the payoff simulations.
 *   - 0% interest, no extra, oversized extras, and small final payments.
 *   - F7 (approved): explicit non-payoff warnings for non-amortizing
 *     payments and the 600-month limit; a truncated loan is never
 *     presented as fully paid off.
 *   - F4 parity: the term select is dead UI; the text input drives the
 *     calculation (blank text term → validation error).
 *   - F2 (unresolved, preserved): a negative extra amount flows through
 *     unvalidated — it must not crash or display NaN/Infinity.
 */

import { describe, expect, it } from 'vitest';
import {
  deriveExtraPaymentResult,
  applyPIAutoFill,
  BLANK_MAGIC_RESULT,
  CORE_MAGIC_KEYS,
} from './extraPayment.js';

/** Base loan for all Magic cases (BASELINE_CASES.md §B). */
const BASE = {
  magicPrice: '400,000',
  magicDownPayment: '80,000',
  magicBalance: '320,000',
  magicRate: '6.5',
  magicTermText: '30',
  magicTax: '5,500',
  magicInsurance: '1,200',
  magicMonthlyPI: '2,023', // rounded auto-filled contractual P&I
};

const MAGIC_ERROR = 'Please enter valid mortgage details.';

describe('baseline cases (identical inputs to the original site)', () => {
  it('B4 — $200/month extra on the full $320k balance', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '200' },
      'monthly',
      false,
    );
    expect(r.errorMsg).toBe('');
    expect(r.limitWarning).toBe('');
    expect(r.standardRemaining).toBe('30y 0m');
    expect(r.newPayoffTime).toBe('23y 5m');
    expect(r.originalInterest).toBe('$408,142');
    expect(r.newTotalInterest).toBe('$302,714');
    expect(r.interestSaved).toBe('$105,429');
    expect(r.timeSaved).toBe('6 years and 7 months');
    expect(r.newTotalMonthly).toBe('$2,581');
    expect(r.savingsIsHtml).toBe(true);
    expect(r.savingsMessage).toBe(
      'By paying <strong>$200</strong> extra every month, you\'ll save <strong>$105,429</strong> in total interest!',
    );
    expect(r.savingsColor).toBe('var(--secondary)');
  });

  it('B5 — $10,000 one-time extra applies in month 1 (329 months total)', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '10,000' },
      'one-time',
      false,
    );
    expect(r.standardRemaining).toBe('30y 0m');
    expect(r.newPayoffTime).toBe('27y 5m'); // 329 months, pinned in amortization.test.js
    expect(r.originalInterest).toBe('$408,142');
    expect(r.newTotalInterest).toBe('$354,199');
    expect(r.interestSaved).toBe('$53,943');
    expect(r.timeSaved).toBe('2 years and 7 months');
    expect(r.savingsMessage).toContain('extra one-time');
  });

  it('B6 — current balance below the original principal', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicBalance: '200,000', extraAmount: '200' },
      'monthly',
      false,
    );
    expect(r.standardRemaining).toBe('11y 10m');
    expect(r.newPayoffTime).toBe('10y 4m');
    expect(r.originalInterest).toBe('$87,189');
    expect(r.newTotalInterest).toBe('$74,960');
    expect(r.interestSaved).toBe('$12,228');
    expect(r.timeSaved).toBe('1 year and 6 months');
  });

  it('B7 — zero extra: baseline and accelerated match exactly', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '0' },
      'monthly',
      false,
    );
    expect(r.standardRemaining).toBe('30y 0m');
    expect(r.newPayoffTime).toBe('30y 0m');
    expect(r.originalInterest).toBe(r.newTotalInterest);
    expect(r.interestSaved).toBe('$0');
    expect(r.timeSaved).toBe('0 months');
    expect(r.savingsIsHtml).toBe(false);
    expect(r.savingsMessage).toBe(
      'Increase your extra payment to see how much you can save!',
    );
  });

  it('blank balance falls back to the original principal (price − down)', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicBalance: '', extraAmount: '200' },
      'monthly',
      false,
    );
    expect(r.standardRemaining).toBe('30y 0m');
    expect(r.newPayoffTime).toBe('23y 5m'); // same as B4
  });
});

describe('contractual P&I comes from the original loan, not the current balance', () => {
  it('B6 keeps the $2,023 contractual P&I at a $200,000 balance (no new-loan recompute)', () => {
    const atFull = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '0' },
      'monthly',
      false,
    );
    const atReduced = deriveExtraPaymentResult(
      { ...BASE, magicBalance: '200,000', extraAmount: '0' },
      'monthly',
      false,
    );
    // Same contractual P&I + same tax/insurance → same displayed PITI.
    // (A recompute from the $200k balance as a new loan would show
    // ~$1,114, not $2,581.)
    expect(atReduced.newTotalMonthly).toBe(atFull.newTotalMonthly);
    expect(atReduced.newTotalMonthly).toBe('$2,581');
  });
});

describe('manual P&I override (isPIOverride semantics, F5 preserved)', () => {
  it('piIsManual=true uses the user-entered P&I for both simulations', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicMonthlyPI: '2,500', extraAmount: '0' },
      'monthly',
      true,
    );
    // $2,500/mo pays the $320k/6.5% balance off in 219 months (18y 3m),
    // not the 360 months the calculated $2,023 would take.
    expect(r.standardRemaining).toBe('18y 3m');
    expect(r.newPayoffTime).toBe('18y 3m');
  });

  it('piIsManual=false with the same field value uses the calculated P&I', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicMonthlyPI: '2,500', extraAmount: '0' },
      'monthly',
      false,
    );
    expect(r.standardRemaining).toBe('30y 0m');
    expect(r.newPayoffTime).toBe('30y 0m');
  });
});

describe('taxes and insurance stay outside the payoff simulation', () => {
  it('changing tax/insurance alters only newTotalMonthly, never the schedule', () => {
    const plain = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '200' },
      'monthly',
      false,
    );
    const heavy = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '200', magicTax: '20,000', magicInsurance: '10,000' },
      'monthly',
      false,
    );
    expect(heavy.standardRemaining).toBe(plain.standardRemaining);
    expect(heavy.newPayoffTime).toBe(plain.newPayoffTime);
    expect(heavy.originalInterest).toBe(plain.originalInterest);
    expect(heavy.newTotalInterest).toBe(plain.newTotalInterest);
    // 2022.62 + 20000/12 + 10000/12 = 2022.62 + 1666.67 + 833.33 = 4522.62
    expect(heavy.newTotalMonthly).toBe('$4,523');
    expect(plain.newTotalMonthly).toBe('$2,581');
  });
});

describe('0% interest (F1 approved) and edge payoffs', () => {
  it('accepts an explicit 0% rate and produces $0 interest', () => {
    const r = deriveExtraPaymentResult(
      {
        ...BASE,
        magicRate: '0',
        magicMonthlyPI: '889', // 320000/360 rounded
        extraAmount: '0',
      },
      'monthly',
      false,
    );
    expect(r.errorMsg).toBe('');
    expect(r.originalInterest).toBe('$0');
    expect(r.newTotalInterest).toBe('$0');
    expect(r.standardRemaining).toBe('30y 0m');
  });

  it('a lump sum larger than the remaining balance finishes in month 1', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '1,000,000' },
      'one-time',
      false,
    );
    expect(r.newPayoffTime).toBe('0y 1m');
    expect(r.newTotalInterest).toBe('$1,733'); // one month of interest only
    expect(r.limitWarning).toBe('');
  });

  it('a balance that does not divide evenly still pays off (small final payment)', () => {
    // $50 over the $320,000 A1 balance: after 360 regular payments a small
    // residual (< one regular payment) remains and is settled in month 361.
    const r = deriveExtraPaymentResult(
      { ...BASE, magicBalance: '320,050', extraAmount: '0' },
      'monthly',
      false,
    );
    expect(r.errorMsg).toBe('');
    expect(r.standardRemaining).toBe('30y 1m'); // no '+' — genuinely paid off
    expect(r.newPayoffTime).toBe('30y 1m');
  });
});

describe('validation (single combined message, original wording)', () => {
  const cases = [
    ['blank price', { ...BASE, magicPrice: '' }],
    ['price 0', { ...BASE, magicPrice: '0' }],
    ['down ≥ price with blank balance', { ...BASE, magicPrice: '400,000', magicDownPayment: '400,000', magicBalance: '' }],
    ['blank rate', { ...BASE, magicRate: '' }],
    ['negative rate', { ...BASE, magicRate: '-1' }],
    ['non-numeric rate', { ...BASE, magicRate: 'abc' }],
    ['blank term (F4: the dead select does NOT substitute)', { ...BASE, magicTermText: '' }],
    ['zero term', { ...BASE, magicTermText: '0' }],
  ];

  for (const [label, inputs] of cases) {
    it(`${label} → "${MAGIC_ERROR}" + sentinel cards`, () => {
      const r = deriveExtraPaymentResult(inputs, 'monthly', false);
      expect(r.errorMsg).toBe(MAGIC_ERROR);
      expect(r.hasCalc).toBe(false);
      expect(r.interestSaved).toBe(BLANK_MAGIC_RESULT.interestSaved);
      expect(r.standardRemaining).toBe(BLANK_MAGIC_RESULT.standardRemaining);
      expect(r.savingsMessage).toBe(BLANK_MAGIC_RESULT.savingsMessage);
    });
  }

  it('down ≥ price is accepted when a positive current balance is given', () => {
    // Original quirk (preserved): the contractual P&I is derived from
    // price − downPayment, so with down ≥ price it is $0. With a positive
    // balance the validation gate passes and a manual P&I drives the sim.
    const r = deriveExtraPaymentResult(
      {
        magicPrice: '450,000',
        magicDownPayment: '500,000',
        magicBalance: '100,000',
        magicRate: '6.5',
        magicTermText: '30',
        magicTax: '',
        magicInsurance: '',
        magicMonthlyPI: '1,000',
        extraAmount: '0',
      },
      'monthly',
      true,
    );
    expect(r.errorMsg).toBe('');
    expect(r.newPayoffTime).toBe('12y 1m'); // 145 months at the manual $1,000 P&I

    // Same inputs without a manual P&I: contractual P&I is $0 (price − down
    // ≤ 0), so the balance grows — surfaced by the F7 warning instead of
    // the original's silent "50y 0m".
    const noPI = deriveExtraPaymentResult(
      {
        magicPrice: '450,000',
        magicDownPayment: '500,000',
        magicBalance: '100,000',
        magicRate: '6.5',
        magicTermText: '30',
        magicTax: '',
        magicInsurance: '',
        magicMonthlyPI: '',
        extraAmount: '0',
      },
      'monthly',
      false,
    );
    expect(noPI.errorMsg).toBe('');
    expect(noPI.standardRemaining).toBe('50y 0m+');
    expect(noPI.limitWarning).toContain("does not cover the first month's interest");
  });
});

describe('F7 (approved): explicit non-payoff states — never present an unpaid loan as paid off', () => {
  it('payment below first-month interest (both simulations grow) → non-amortizing warning', () => {
    const r = deriveExtraPaymentResult(
      {
        magicPrice: '500,000',
        magicDownPayment: '0',
        magicBalance: '500,000',
        magicRate: '24',
        magicTermText: '30',
        magicTax: '',
        magicInsurance: '',
        magicMonthlyPI: '5,000', // below the $10,000 first-month interest
        extraAmount: '0',
      },
      'monthly',
      true,
    );
    expect(r.standardRemaining).toBe('50y 0m+');
    expect(r.newPayoffTime).toBe('50y 0m+');
    expect(r.limitWarning).toContain("does not cover the first month's interest");
    expect(r.savingsIsHtml).toBe(false);
    expect(r.savingsMessage).toBe(
      'Resolve the warning above to see your total interest savings.',
    );
  });

  it('baseline grows but the extra payment keeps it amortizing → baseline warning', () => {
    const r = deriveExtraPaymentResult(
      {
        magicPrice: '1,000,000',
        magicDownPayment: '0',
        magicBalance: '2,000,000',
        magicRate: '3',
        magicTermText: '30',
        magicTax: '',
        magicInsurance: '',
        magicMonthlyPI: '4,999', // below the $5,000 first-month interest
        extraAmount: '1,500', // brings the monthly total above interest
      },
      'monthly',
      true,
    );
    expect(r.standardRemaining).toBe('50y 0m+');
    expect(r.newPayoffTime).toBe('49y 0m'); // 588 months — a real payoff
    expect(r.newPayoffTime.endsWith('+')).toBe(false);
    expect(r.limitWarning).toContain(
      'Your current payment alone does not cover the first month',
    );
  });

  it('amortizing but slower than the 600-month window → truncated warning on both', () => {
    const r = deriveExtraPaymentResult(
      {
        magicPrice: '1,000,000',
        magicDownPayment: '0',
        magicBalance: '2,000,000',
        magicRate: '3',
        magicTermText: '30',
        magicTax: '',
        magicInsurance: '',
        magicMonthlyPI: '5,001', // just above the $5,000 first-month interest
        extraAmount: '0',
      },
      'monthly',
      true,
    );
    expect(r.standardRemaining).toBe('50y 0m+');
    expect(r.newPayoffTime).toBe('50y 0m+');
    expect(r.limitWarning).toContain('not fully paid off within the 50-year');
    expect(r.limitWarning).toContain('truncated at 600 months');
    expect(r.savingsIsHtml).toBe(false);
  });

  it('baseline truncated, accelerated pays off in time → baseline-truncation warning', () => {
    const r = deriveExtraPaymentResult(
      {
        magicPrice: '1,000,000',
        magicDownPayment: '0',
        magicBalance: '2,000,000',
        magicRate: '3',
        magicTermText: '30',
        magicTax: '',
        magicInsurance: '',
        magicMonthlyPI: '5,001',
        extraAmount: '1,500',
      },
      'monthly',
      true,
    );
    expect(r.standardRemaining).toBe('50y 0m+');
    expect(r.newPayoffTime).toBe('49y 0m');
    expect(r.limitWarning).toContain(
      'baseline figures are truncated at 600 months',
    );
  });
});

describe('F2 (unresolved, preserved): negative extra amounts flow through unvalidated', () => {
  it('does not crash, does not display NaN/Infinity, and never pays off sooner', () => {
    const plain = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '0' },
      'monthly',
      false,
    );
    const negative = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '-50' },
      'monthly',
      false,
    );
    expect(negative.errorMsg).toBe('');
    for (const v of Object.values(negative)) {
      if (typeof v === 'string') {
        expect(v).not.toContain('NaN');
        expect(v).not.toContain('Infinity');
      }
    }
    // "30y 0m" (360) vs "32y 7m" (391): the negative extra lengthens the
    // payoff instead of shortening it.
    expect(negative.newPayoffTime).toBe('32y 7m');
    expect(plain.newPayoffTime).toBe('30y 0m');
    expect(negative.interestSaved).toBe('$0'); // clamped, never negative
  });
});

describe('no NaN / Infinity can reach the display', () => {
  const grid = [
    { ...BASE, extraAmount: '200' },
    { ...BASE, extraAmount: '10,000' },
    { ...BASE, extraAmount: '0' },
    { ...BASE, extraAmount: '-50' },
    { ...BASE, magicBalance: '' },
    { ...BASE, magicRate: '0' },
    { ...BASE, magicRate: '1e3' }, // parsed as 1000% by the original parser
    { ...BASE, magicMonthlyPI: '999,999' },
    { ...BASE, extraAmount: '999,999,999' },
  ];

  for (const [i, inputs] of grid.entries()) {
    for (const mode of ['monthly', 'one-time']) {
      for (const piIsManual of [false, true]) {
        it(`case ${i} / ${mode} / manual=${piIsManual} is fully finite`, () => {
          const r = deriveExtraPaymentResult(inputs, mode, piIsManual);
          for (const v of Object.values(r)) {
            if (typeof v === 'string') {
              expect(v).not.toContain('NaN');
              expect(v).not.toContain('Infinity');
            }
          }
        });
      }
    }
  }
});

describe('applyPIAutoFill (the original magicMonthlyPI write-back, as a pure function)', () => {
  const emptyPI = { ...BASE, magicMonthlyPI: '' };

  it('force (core edit / button / toggle / sync) rewrites the field with the rounded calculated P&I', () => {
    const { inputs, filledPI } = applyPIAutoFill(emptyPI, { force: true });
    expect(inputs.magicMonthlyPI).toBe('2,023');
    expect(filledPI).toBe(true);
  });

  it('soft (non-core edit) fills an empty field too', () => {
    const { inputs, filledPI } = applyPIAutoFill(emptyPI, { force: false });
    expect(inputs.magicMonthlyPI).toBe('2,023');
    expect(filledPI).toBe(true);
  });

  it('soft preserves a user-entered P&I', () => {
    const { inputs, filledPI } = applyPIAutoFill(BASE, { force: false });
    expect(inputs.magicMonthlyPI).toBe('2,023');
    expect(filledPI).toBe(false); // fill branch not taken
    const manual = { ...BASE, magicMonthlyPI: '2,500' };
    const { inputs: inputs2, filledPI: filled2 } = applyPIAutoFill(manual, {
      force: false,
    });
    expect(inputs2.magicMonthlyPI).toBe('2,500');
    expect(filled2).toBe(false);
  });

  it('force overwrites a user-entered P&I (F5, preserved)', () => {
    const manual = { ...BASE, magicMonthlyPI: '2,500' };
    const { inputs, filledPI } = applyPIAutoFill(manual, { force: true });
    expect(inputs.magicMonthlyPI).toBe('2,023');
    expect(filledPI).toBe(true);
  });

  it('a focused field is never overwritten (original focus guard), but the fill branch still counts', () => {
    const { inputs, filledPI } = applyPIAutoFill(emptyPI, {
      force: true,
      isFocused: true,
    });
    expect(inputs.magicMonthlyPI).toBe('');
    expect(filledPI).toBe(true); // simulation must use the calculated P&I
  });

  it('an invalid form is left completely untouched', () => {
    const invalid = { ...emptyPI, magicPrice: '' };
    const { inputs, filledPI } = applyPIAutoFill(invalid, { force: true });
    expect(inputs).toBe(invalid); // same reference — no mutation, no write
    expect(filledPI).toBe(false);
  });

  it('CORE_MAGIC_KEYS matches the original calculateMagic(false) listener set', () => {
    expect([...CORE_MAGIC_KEYS].sort()).toEqual(
      ['magicDownPayment', 'magicPrice', 'magicRate', 'magicTermText'].sort(),
    );
  });
});
