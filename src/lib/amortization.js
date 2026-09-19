/**
 * Payoff-schedule simulation for the Extra Payment Magic tab.
 *
 * Extracted verbatim from the two `while` loops in `script.js#calculateMagic`.
 * No DOM, no formatting, no validation — pure numerics in, numerics out.
 *
 * Status is an explicit enum so Step 10 can render distinct UI states:
 *   - "paid-off":        balance reached zero before 600 months (normal).
 *   - "limit-reached":   600 months elapsed with non-zero balance.
 *                        (Original code ended this loop silently; see
 *                         decision F7 in BASELINE_CASES.md.)
 */

/** Max months the original simulations would run (`monthsToPayoff < 600`). */
export const SIMULATION_MONTH_LIMIT = 600;

/** Balance below this epsilon is treated as "paid off" (original `> 0.01` check). */
export const DONE_BALALANCE_EPSILON

