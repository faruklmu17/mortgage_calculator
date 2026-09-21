/** Max months the original simulations would run (`monthsToPayoff < 600`). */
export const SIMULATION_MONTH_LIMIT = 600;

/** Balance below this epsilon is treated as "paid off" (original `> 0.01` check). */
export const DONE_BALANCE_EPSILON = 0.01;

/**
 * Simulate a single payoff schedule from `startingBalance` using a fixed
 * contractual monthly P&I, at an annual rate, with an optional extra payment.
 *
 * Zero interest is now supported (rate may be 0): interest is $0 each month and
 * the loan simply amortizes as principal ÷ months.
 *
 * @param {object} p
 * @param {number} p.startingBalance  Balance to begin amortizing from.
 * @param {number} p.contractualMonthlyPI  Original contractual monthly P&I.
 * @param {number} p.annualRatePercent  Annual rate, e.g. 6.5 or 0.
 * @param {number} [p.monthlyExtra=0]  Extra principal added every month.
 * @param {number} [p.oneTimeExtra=0]  Extra principal added once, in month 1.
 * @returns {{
 *   status: 'paid-off'|'limit-reached',
 *   months: number,
 *   totalInterest: number,
 *   startingBalance: number,
 *   remainingBalance: number,
 *   principalPaid: number,
 * }}
 */
export function simulatePayoff({
  startingBalance,
  contractualMonthlyPI,
  annualRatePercent,
  monthlyExtra = 0,
  oneTimeExtra = 0,
} = {}) {
  const balance0 = Number(startingBalance) || 0;
  const pi = Number(contractualMonthlyPI) || 0;
  const rate = Number(annualRatePercent) || 0;
  const monthlyRate = rate / 100 / 12;
  const monthlyExtraN = Number(monthlyExtra) || 0;
  const oneTimeExtraN = Number(oneTimeExtra) || 0;

  let balance = balance0;
  let totalInterest = 0;
  let months = 0;
  let oneTimeApplied = false;

  while (balance > DONE_BALANCE_EPSILON && months < SIMULATION_MONTH_LIMIT) {
    months++;
    const interestForMonth = balance * monthlyRate;
    totalInterest += interestForMonth;

    let principalRepayment = pi - interestForMonth;

    if (monthlyExtraN !== 0) {
      principalRepayment += monthlyExtraN;
    } else if (oneTimeExtraN !== 0 && !oneTimeApplied) {
      principalRepayment += oneTimeExtraN;
      oneTimeApplied = true;
    }

    if (balance <= principalRepayment) {
      balance = 0;
    } else {
      balance -= principalRepayment;
    }
  }

  const status = balance > DONE_BALANCE_EPSILON ? 'limit-reached' : 'paid-off';

  return {
    status,
    months,
    totalInterest,
    startingBalance: balance0,
    remainingBalance: balance,
    principalPaid: balance0 - balance,
  };
}

/**
 * Convenience pair of simulations (baseline + accelerated) for the
 * Extra Payment Magic tab. Both start from the same balance; the accelerated
 * one applies the chosen extra-payment mode.
 *
 * @param {object} p  See {@link simulatePayoff}.
 * @returns {{ baseline: Object, accelerated: Object, interestSaved: number, monthsSaved: number }}
 */
export function comparePayoffs(p = {}) {
  const baseline = simulatePayoff({
    ...p,
    monthlyExtra: 0,
    oneTimeExtra: 0,
  });
  const accelerated = simulatePayoff(p);
  return {
    baseline,
    accelerated,
    interestSaved: baseline.totalInterest - accelerated.totalInterest,
    monthsSaved: baseline.months - accelerated.months,
  };
}
