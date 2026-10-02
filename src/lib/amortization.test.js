/**
 * Step 7 — Vitest coverage for the payoff-schedule simulation
 * (`src/lib/amortization.js`).
 *
 * These tests exercise:
 *   - Standard amortization (A1 reference: 360 months / $408,142.36 interest).
 *   - Zero-interest and zero-principal behavior.
 *   - No-extra-payment (baseline matches a 0-extra accelerated run).
 *   - Monthly and one-time extra payments (B4 / B5 / B6 / B7 references).
 *   - A one-time lump sum larger than the remaining balance.
 *   - A final payment smaller than the regular payment (loan ends early).
 *   - Current balance below the original principal.
 *   - Invalid / non-finite inputs (must not throw, must not produce NaN).
 *   - Payments that do not reduce the balance (→ 600-month limit-reached).
 *   - The 600-month simulation cap returning `status === 'limit-reached'`
 *     (decision F7: surfaced explicitly, not as a bogus "paid-off").
 *
 * Tolerances are kept tight because both simulations come from the same
 * deterministic loop; only floating-point accumulation error differs.
 */

import { describe, expect, it } from 'vitest';
import {
  simulatePayoff,
  comparePayoffs,
  SIMULATION_MONTH_LIMIT,
  DONE_BALANCE_EPSILON,
} from './amortization.js';

/** A1-derived reference values (see ../mortgage.test.js for source). */
const P1_PI = 2022.6176751774892; // 6.5% / 30yr / $320k
const P1_TOTAL_INTEREST = 408142.3630638961;

describe('amortization module — public exports', () => {
  it('exposes a 600-month limit and a 0.01 epsilon', () => {
    expect(SIMULATION_MONTH_LIMIT).toBe(600);
    expect(DONE_BALANCE_EPSILON).toBe(0.01);
  });
});

describe('standard amortization (A1 reference — 360 months)', () => {
  it('pays off $320,000 in exactly 360 months with no extra', () => {
    const r = simulatePayoff({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
    });
    expect(r.status).toBe('paid-off');
    expect(r.months).toBe(360);
    // Independent cross-check: total interest equals A1 total interest within 1e-6.
    expect(Math.abs(r.totalInterest - P1_TOTAL_INTEREST)).toBeLessThan(1e-6);
    expect(r.remainingBalance).toBe(0);
  });

  it('principal paid + remaining balance reconciles to starting balance (within 1e-9)', () => {
    const r = simulatePayoff({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
    });
    // principalPaid = startingBalance - remainingBalance by construction
    expect(Math.abs(r.principalPaid + r.remainingBalance - r.startingBalance)).toBeLessThan(1e-9);
  });
});

describe('zero interest', () => {
  it('$120,000 / 120 months @ 0% pays off in exactly 120 months, $0 interest', () => {
    const r = simulatePayoff({
      startingBalance: 120000,
      contractualMonthlyPI: 1000,
      annualRatePercent: 0,
    });
    expect(r.status).toBe('paid-off');
    expect(r.months).toBe(120);
    expect(r.totalInterest).toBe(0);
    expect(r.remainingBalance).toBe(0);
  });

  it('zero-interest + monthly extra finishes early and still produces $0 interest', () => {
    const r = simulatePayoff({
      startingBalance: 120000,
      contractualMonthlyPI: 1000,
      annualRatePercent: 0,
      monthlyExtra: 200,
    });
    // $1,200 / month amortization → 120000/1200 = 100 months.
    expect(r.months).toBe(100);
    expect(r.totalInterest).toBe(0);
  });

  it('zero-interest + one-time extra pays off in fewer months', () => {
    const with0 = simulatePayoff({
      startingBalance: 120000,
      contractualMonthlyPI: 1000,
      annualRatePercent: 0,
    });
    const withExtra = simulatePayoff({
      startingBalance: 120000,
      contractualMonthlyPI: 1000,
      annualRatePercent: 0,
      oneTimeExtra: 20000,
    });
    expect(withExtra.months).toBeLessThan(with0.months);
    expect(withExtra.totalInterest).toBe(0);
  });
});

describe('zero principal / non-positive starting balance', () => {
  it('returns 0 months, paid-off, with zero interest for positive balance', () => {
    const r = simulatePayoff({
      startingBalance: 0,
      contractualMonthlyPI: 1000,
      annualRatePercent: 6.5,
    });
    expect(r.status).toBe('paid-off');
    expect(r.months).toBe(0);
    expect(r.totalInterest).toBe(0);
  });

  it('does not throw or produce NaN when given NaN / Infinity inputs', () => {
    const r = simulatePayoff({
      startingBalance: NaN,
      contractualMonthlyPI: NaN,
      annualRatePercent: NaN,
    });
    expect(Number.isFinite(r.months)).toBe(true);
    expect(Number.isFinite(r.totalInterest)).toBe(true);
    expect(r.months).toBe(0);
  });
});

describe('no extra → baseline matches accelerated', () => {
  it('accelerated with $0 extra gives the exact same schedule as baseline', () => {
    const b = simulatePayoff({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
      monthlyExtra: 0,
      oneTimeExtra: 0,
    });
    const a = simulatePayoff({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
      monthlyExtra: 0,
      oneTimeExtra: 0,
    });
    expect(a).toEqual(b);
    // comparePayoffs convenience: savings should be exactly 0.
    const cmp = comparePayoffs({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
      monthlyExtra: 0,
    });
    expect(cmp.interestSaved).toBe(0);
    expect(cmp.monthsSaved).toBe(0);
  });
});

describe('monthly extra payment (B4 reference — $200/month on A1)', () => {
  it('finishes earlier and saves a positive amount of interest', () => {
    const base = simulatePayoff({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
    });
    const acc = simulatePayoff({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
      monthlyExtra: 200,
    });
    expect(acc.months).toBeLessThan(base.months);
    expect(acc.totalInterest).toBeLessThan(base.totalInterest);
    // B4 reference: normally 30y 0m → new ~23y 5m (281 months).
    expect(acc.months).toBe(281);
  });

  it('comparePayoffs reports positive savings', () => {
    const cmp = comparePayoffs({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
      monthlyExtra: 200,
    });
    expect(cmp.interestSaved).toBeGreaterThan(0);
    expect(cmp.monthsSaved).toBeGreaterThan(0);
  });
});

describe('one-time extra payment (B5 reference — $10,000 in month 1)', () => {
  it('applies the one-time amount to month 1 only and saves interest', () => {
    const base = simulatePayoff({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
    });
    const acc = simulatePayoff({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
      oneTimeExtra: 10000,
    });
    expect(acc.months).toBeLessThan(base.months);
    expect(acc.totalInterest).toBeLessThan(base.totalInterest);
    // B5 reference: normally 30y 0m → new ~27y 5m (329 months).
    expect(acc.months).toBe(329);
  });

  it('a one-time payment > remaining balance finishes in month 1, not more', () => {
    const acc = simulatePayoff({
      startingBalance: 1000,
      contractualMonthlyPI: 100,
      annualRatePercent: 6.5,
      oneTimeExtra: 10000,
    });
    expect(acc.months).toBe(1);
    expect(acc.remainingBalance).toBe(0);
  });
});

describe('final payment smaller than the regular payment', () => {
  it('does not overpay the balance when the loan is fully settled', () => {
    // A loan of $1,100 at P&I $100 with 0% interest:
    //   months 1..11 pay exactly $100 each (balance: 100 → 0 → wait, 1100 - 100 = 1000 …
    //   so at 0% with $100/mo: 1100/100 = 11 months; final month pays the remainder.
    const r = simulatePayoff({
      startingBalance: 1100,
      contractualMonthlyPI: 100,
      annualRatePercent: 0,
    });
    expect(r.status).toBe('paid-off');
    expect(r.months).toBe(11);
    expect(r.totalInterest).toBe(0);
    expect(r.remainingBalance).toBe(0);
  });

  it('final-month "payment" is the residual balance, never more', () => {
    // With $1,050 balance at 0% and $100 / mo, the loan needs 11 months and
    // the 11th month's principal reduction is $50 — less than the $100 regular
    // payment. We assert that principal paid across the whole simulation is
    // exactly the starting balance (no overpay).
    const r = simulatePayoff({
      startingBalance: 1050,
      contractualMonthlyPI: 100,
      annualRatePercent: 0,
    });
    expect(r.principalPaid).toBe(1050);
    expect(r.remainingBalance).toBe(0);
  });
});

describe('current balance below the original principal (B6 reference)', () => {
  it('shortens the payoff and reduces total interest vs A1', () => {
    const a1Base = simulatePayoff({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
    });
    const b6Base = simulatePayoff({
      startingBalance: 200000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
    });
    const b6Acc = simulatePayoff({
      startingBalance: 200000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
      monthlyExtra: 200,
    });
    // B6 reference: normally remaining ~11y 10m (142 months); new payoff ~10y 4m (124 months).
    expect(b6Base.months).toBe(142);
    expect(b6Acc.months).toBe(124);
    // Acceleration still works.
    expect(b6Acc.months).toBeLessThan(b6Base.months);
    // Total interest on B6 base is smaller than A1 base (less outstanding principal).
    expect(b6Base.totalInterest).toBeLessThan(a1Base.totalInterest);
  });
});

describe('invalid / non-finite values → does not throw, does not produce NaN months', () => {
  it('handles NaN starting balance', () => {
    const r = simulatePayoff({
      startingBalance: NaN,
      contractualMonthlyPI: 1000,
      annualRatePercent: 6.5,
    });
    expect(r.months).toBe(0);
    expect(Number.isFinite(r.totalInterest)).toBe(true);
  });

  it('handles Infinity (non-finite) starting balance gracefully', () => {
    // Infinity → Number → Infinity → balance > epsilon forever → hits 600 cap.
    // But the `Number(...)||0` guard maps Infinity through Number.isFinite
    // check to keep the loop bounded. Either way we must not hang.
    const r = simulatePayoff({
      startingBalance: Infinity,
      contractualMonthlyPI: 1000,
      annualRatePercent: 6.5,
    });
    expect(Number.isFinite(r.months)).toBe(true);
    expect(r.months).toBeLessThanOrEqual(SIMULATION_MONTH_LIMIT);
  });
});

describe('payments insufficient to reduce the balance → 600-month cap with limit-reached status', () => {
  it('a 1-month payment of 0.01 on a $1,000,000 loan runs out at 600 months', () => {
    const r = simulatePayoff({
      startingBalance: 1000000,
      contractualMonthlyPI: 0.01,
      annualRatePercent: 0,
    });
    expect(r.status).toBe('limit-reached');
    expect(r.months).toBe(SIMULATION_MONTH_LIMIT);
    expect(r.remainingBalance).toBeGreaterThan(DONE_BALANCE_EPSILON);
  });

  it('negative or zero contractual PI (rate > payment) hits the cap and is not "paid-off"', () => {
    const r = simulatePayoff({
      startingBalance: 100000,
      contractualMonthlyPI: 1,
      annualRatePercent: 30, // interest for month 1 = 100000*30/100/12 = 25000 > 1
    });
    expect(r.status).toBe('limit-reached');
    expect(r.months).toBe(SIMULATION_MONTH_LIMIT);
  });
});

describe('positive extra principal must never increase payoff time or total interest', () => {
  it('monotone in extra payment (property test over a small grid)', () => {
    const basePI = P1_PI;
    const base = { startingBalance: 320000, contractualMonthlyPI: basePI, annualRatePercent: 6.5 };

    const zero = simulatePayoff({ ...base, monthlyExtra: 0 });
    const small = simulatePayoff({ ...base, monthlyExtra: 100 });
    const large = simulatePayoff({ ...base, monthlyExtra: 1000 });

    expect(small.months).toBeLessThanOrEqual(zero.months);
    expect(large.months).toBeLessThanOrEqual(small.months);
    expect(small.totalInterest).toBeLessThanOrEqual(zero.totalInterest);
    expect(large.totalInterest).toBeLessThanOrEqual(small.totalInterest);
  });
});

describe('comparePayoffs — convenience wrapper', () => {
  it('returns matching baseline & accelerated with correct deltas for one-time extra', () => {
    const cmp = comparePayoffs({
      startingBalance: 320000,
      contractualMonthlyPI: P1_PI,
      annualRatePercent: 6.5,
      oneTimeExtra: 10000,
    });
    expect(cmp.baseline.months).toBe(360);
    expect(cmp.accelerated.months).toBe(329);
    expect(cmp.baseline.totalInterest).toBeCloseTo(P1_TOTAL_INTEREST, 6);
    expect(cmp.monthsSaved).toBe(31);
    expect(cmp.interestSaved).toBeGreaterThan(0);
  });
});
