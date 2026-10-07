/**
 * Display-string formatting. Pure functions; callers pass numbers, they
 * return strings. Separated from the calculation modules (Step 7
 * requirement: pure calculation functions avoid formatting numeric
 * results into display strings).
 *
 * The exact formatting behavior is copied from `script.js` so the
 * migrated UI shows byte-identical text.
 */

/**
 * `script.js#formatCurrency` — `Intl.NumberFormat('en-US')`, currency USD,
 * 0 places.
 *
 * @param {number} val
 * @returns {string}
 */
export function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Format a month-delta as "X years and Y months". Preserves the exact
 * branching and wording (including "0 months" for non-positive) from the
 * timeSaved text in `script.js#calculateMagic`.
 *
 * @param {number} monthsSaved
 * @returns {string}
 */
export function formatDurationSpan(monthsSaved) {
  if (monthsSaved <= 0) return '0 months';
  const years = Math.floor(monthsSaved / 12);
  const remaining = monthsSaved % 12;
  let text = '';
  if (years > 0) text += `${years} year${years > 1 ? 's' : ''}`;
  if (remaining > 0) text += (text ? ' and ' : '') + `${remaining} month${remaining > 1 ? 's' : ''}`;
  return text;
}

/**
 * "Xy Ym" shorthand used by `standardRemaining` / `newPayoffTime`.
 * @param {number} months
 * @returns {string}
 */
export function formatShortDuration(months) {
  const m = Number(months) || 0;
  return `${Math.floor(m / 12)}y ${m % 12}m`;
}
