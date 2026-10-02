/**
 * Step 10 — Vitest coverage for the pure Extra Payment Magic derivation
 * (`src/lib/extraMagic.js`).
 *
 * This is the display-layer counterpart to `amortization.test.js`: it
 * exercises the *exact* validation → contractual P&I → baseline +
 * accelerated `simulatePayoff` → format pipeline that
 * `ExtraPaymentCalculator.jsx` renders from.
 *
 * Covers the required Step 10 scenarios (B4/B5/B6/B7 from
 * BASELINE_CASES.md, plus the Step 10-specific non-success / limit
 * handling that did not exist in the original).
 */

import { describe, expect, it } from 'vitest';
import {
  deriveExtraPaymentResult,
  EXTMAGIC_BLANK,
} from './extraMagic.js';

/** The canonical baseline for the B-series. */
const BASE = Object.freeze({
  magicPrice: '400,000',
  magicDownPayment: '80,000',
  magicBalance: '', // falls back to original principal
  magicRate: '6.5',
  magicTermText: '30',
  magicTermSelect: '30',
  magicTax: '5,500',
  magicInsurance: '1,200',
  magicMonthlyPI: '',
  extraAmount: '',
});

const DISPLAY_STR_FIELDS = [
  'interestSaved',
  'timeSaved',
  'standardRemaining',
  'newPayoffTime',
  'originalInterest',
  'newTotalInterest',
  'newTotalMonthly',
  'savingsMessage',
];
function assertNoGibberish(r) {
  for (const k of DISPLAY_STR_FIELDS) {
    const v = String(r[k]);
    expect(v).not.toMatch(/NaN|Infinity/);
  }
}

describe('extmagic — blank state', () => {
  it('null fields returns BLANK with the Step 8 visual', () => {
    const r = deriveExtraPaymentResult(null);
    expect(r).toMatchObject(EXTMAGIC_BLANK);
    expect(r.hasCalc).toBe(false);
    expect(r.savingsMessage).toBe('Enter your details to see the magic happen!');
  });
});

describe('extmagic — B7 (no extra payment)', () => {
  it('baseline and accelerated are identical; savings $0; prompt message', () => {
    const r = deriveExtraPaymentResult(BASE, 'monthly');
    expect(r.hasCalc).toBe(true);
    expect(r.hasSimulation).toBe(true);
    expect(r.errorMsg).toBe('');
    expect(r.isNonSuccess).toBe(false);
    expect(r.interestSaved).toBe('$0');
    expect(r.timeSaved).toBe('0 months');
    expect(r.standardRemaining).toBe('30y 0m');
    expect(r.newPayoffTime).toBe('30y 0m');
    expect(r.originalInterest).toBe('$408,142');
    expect(r.newTotalInterest).toBe('$408,142');
    expect(r.savingsMessage).toBe('Increase your extra payment to see how much you can save!');
    expect(r.savingsIsHtml).toBe(false);
    expect(r.savingsColor).toBe('inherit');
    expect(r.piAutoFill).toBe('2,023');
    assertNoGibberish(r);
  });

  it('PITI includes tax+insurance (not part of the sim), matching A1 $2,581', () => {
    const r = deriveExtraPaymentResult(BASE, 'monthly');
    expect(r.newTotalMonthly).toBe('$2,581');
  });

  it('PITI is P&I only when tax/insurance blank', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicTax: '', magicInsurance: '' },
      'monthly'
    );
    expect(r.newTotalMonthly).toBe('$2,023');
  });
});

describe('extmagic — B4 ($200/month)', () => {
  it('finishes at 281 months (23y 5m) and saves $105,429', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '200' },
      'monthly'
    );
    expect(r.newPayoffTime).toBe('23y 5m');
    expect(r.standardRemaining).toBe('30y 0m');
    expect(r.interestSaved).toBe('$105,429');
    expect(r.originalInterest).toBe('$408,142');
    expect(r.newTotalInterest).toBe('$302,714');
    expect(r.timeSaved).toBe('6 years and 7 months');
    expect(r.savingsIsHtml).toBe(true);
    expect(r.savingsMessage).toMatch(/By paying <strong>\$200<\/strong> extra every month/);
    assertNoGibberish(r);
  });
});

describe('extmagic — B5 ($10,000 one-time, applied month 1)', () => {
  it('finishes at 329 months (27y 5m) and saves $53,943', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '10,000' },
      'one-time'
    );
    expect(r.newPayoffTime).toBe('27y 5m');
    expect(r.interestSaved).toBe('$53,943');
    expect(r.timeSaved).toBe('2 years and 7 months');
    expect(r.savingsIsHtml).toBe(true);
    expect(r.savingsMessage).toMatch(/By paying <strong>\$10,000<\/strong> extra one-time/);
    assertNoGibberish(r);
  });

  it('oversized lump sum finishes in month 1 without overpay', () => {
    const r = deriveExtraPaymentResult(
      {
        ...BASE,
        magicPrice: '1,000',
        magicDownPayment: '0',
        magicBalance: '1,000',
        magicRate: '0',
        extraAmount: '10,000',
      },
      'one-time'
    );
    expect(r.newPayoffTime).toBe('0y 1m');
    expect(r.interestSaved).toBe('$0');
    expect(r.isNonSuccess).toBe(false);
    assertNoGibberish(r);
  });
});

describe('extmagic — B6 (current balance below original)', () => {
  it('balance $200,000 with $200/month → 11y 10m / 10y 4m, saves $12,228', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicBalance: '200,000', extraAmount: '200' },
      'monthly'
    );
    expect(r.standardRemaining).toBe('11y 10m');
    expect(r.newPayoffTime).toBe('10y 4m');
    expect(r.interestSaved).toBe('$12,228');
    assertNoGibberish(r);
  });

  it('without explicit balance, falls back to original principal', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '200' },
      'monthly'
    );
    expect(r.standardRemaining).toBe('30y 0m');
  });
});

describe('extmagic — zero interest (rate 0, F1-approved)', () => {
  it('rate 0 → $0 total interest', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicRate: '0', extraAmount: '100' },
      'monthly'
    );
    expect(r.originalInterest).toBe('$0');
    expect(r.newTotalInterest).toBe('$0');
    expect(r.piAutoFill).toBe('889');
    assertNoGibberish(r);
  });

  it('blank rate → validation error', () => {
    const r = deriveExtraPaymentResult({ ...BASE, magicRate: '' }, 'monthly');
    expect(r.errorMsg).toBe('Please enter valid mortgage details.');
    expect(r.hasSimulation).toBe(false);
    assertNoGibberish(r);
  });
});

describe('extmagic — manual P&I override (isPIOverride)', () => {
  it('honored under non-core triggers (isPIOverride=true)', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicMonthlyPI: '1,500' },
      'monthly',
      true
    );
    expect(r.newTotalMonthly).toBe('$2,058');
    expect(r.piAutoFill).toBe(null);
  });

  it('NOT honored under core triggers (isPIOverride=false)', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicMonthlyPI: '1,500' },
      'monthly',
      false
    );
    expect(r.piAutoFill).toBe('2,023');
    expect(r.newTotalMonthly).toBe('$2,581');
  });

  it('manual PI of 0 falls back to calculated PI', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicMonthlyPI: '0' },
      'monthly',
      true
    );
    expect(r.piAutoFill).toBe('2,023');
  });
});

describe('extmagic — validation failures', () => {
  it('blank price → error', () => {
    const r = deriveExtraPaymentResult({ ...BASE, magicPrice: '' }, 'monthly');
    expect(r.errorMsg).toBe('Please enter valid mortgage details.');
    expect(r.hasSimulation).toBe(false);
    assertNoGibberish(r);
  });

  it('down ≥ price with no balance → error', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicPrice: '100,000', magicDownPayment: '150,000' },
      'monthly'
    );
    expect(r.errorMsg).toBe('Please enter valid mortgage details.');
  });

  it('negative rate → error', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicRate: '-1' },
      'monthly'
    );
    expect(r.errorMsg).toBe('Please enter valid mortgage details.');
  });

  it('non-numeric rate → error', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicRate: 'abc' },
      'monthly'
    );
    expect(r.errorMsg).toBe('Please enter valid mortgage details.');
  });

  it('term blank in both text and select → error', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, magicTermText: '', magicTermSelect: '' },
      'monthly'
    );
    expect(r.errorMsg).toBe('Please enter valid mortgage details.');
  });
});

describe('extmagic — non-amortizing / limit-reached (Step 10 req #7, F7)', () => {
  it('non-amortizing (rate high, PI low) → non-amortizing headline at the 600-month cap', () => {
    const r = deriveExtraPaymentResult(
      {
        ...BASE,
        magicPrice: '200,000',
        magicDownPayment: '0',
        magicBalance: '200,000',
        magicRate: '12',
        magicTermText: '30',
        magicMonthlyPI: '500',
      },
      'monthly',
      true
    );
    expect(r.hasSimulation).toBe(true);
    expect(r.isNonSuccess).toBe(true);
    expect(r.nonSuccessReason).toBe('non-amortizing');
    expect(r.standardRemaining).toBe('50y 0m');
    expect(r.newPayoffTime).toBe('50y 0m');
    expect(r.savingsIsHtml).toBe(false);
    expect(r.savingsColor).toBe('var(--danger, #ef4444)');
    expect(r.savingsMessage).toMatch(/does not amortize/i);
    assertNoGibberish(r);
  });

  it('valid amortizing loan exceeding 600 months → limit-reached headline', () => {
    const r = deriveExtraPaymentResult(
      {
        ...BASE,
        magicPrice: '1,000,000',
        magicDownPayment: '0',
        magicBalance: '1,000,000',
        magicRate: '0',
        magicTermText: '30',
        magicMonthlyPI: '10',
      },
      'monthly',
      true
    );
    expect(r.isNonSuccess).toBe(true);
    expect(r.nonSuccessReason).toBe('limit-reached');
    expect(r.standardRemaining).toBe('50y 0m');
    expect(r.savingsIsHtml).toBe(false);
    expect(r.savingsMessage).toMatch(/600-month/i);
    assertNoGibberish(r);
  });

  it('never presents a limit-reached loan as paid-off', () => {
    const r = deriveExtraPaymentResult(
      {
        ...BASE,
        magicPrice: '200,000',
        magicDownPayment: '0',
        magicBalance: '200,000',
        magicRate: '12',
        magicTermText: '30',
        magicMonthlyPI: '500',
      },
      'monthly',
      true
    );
    expect(r.isNonSuccess).toBe(true);
    expect(r.nonSuccessReason).toBe('non-amortizing');
    expect(r.savingsMessage).not.toMatch(/you'll save/i);
  });
});

describe('extmagic — negative extra (F2/F9: semantics preserved)', () => {
  it('does not crash; numeric savings clamps to 0', () => {
    const r = deriveExtraPaymentResult(
      { ...BASE, extraAmount: '-50' },
      'monthly'
    );
    expect(r.interestSaved).toBe('$0');
    expect(r.savingsIsHtml).toBe(false);
    expect(r.errorMsg).toBe('');
    assertNoGibberish(r);
  });
});

describe('extmagic — non-finite / malformed values', () => {
  it('all fields empty → validation error, no sim', () => {
    const r = deriveExtraPaymentResult(
      {
        magicPrice: '',
        magicDownPayment: '',
        magicBalance: '',
        magicRate: '',
        magicTermText: '',
        magicTermSelect: '',
        magicTax: '',
        magicInsurance: '',
        magicMonthlyPI: '',
        extraAmount: '',
      },
      'monthly'
    );
    expect(r.errorMsg).toBe('Please enter valid mortgage details.');
    assertNoGibberish(r);
  });
});
