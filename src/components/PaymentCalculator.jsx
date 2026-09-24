// Step 9: main calculator tab — submitted-inputs / derived-result refactor.
//
// The DOM structure, CSS classes, aria attributes, result-card markup, and
// toggle / blur behavior are unchanged from Step 8 (which already matched
// the original index.html markup and script.js behavior). What Step 9
// required on top of that:
//
//   1. Keep raw input strings while editing (unchanged — the shared
//      `inputs` prop from CalculatorApp holds the draft strings, and the
//      `onBlur` formatters only rewrite them on blur, never on
//      keystroke, so clearing / decimals / pasting all work naturally).
//
//   2. Store submitted inputs separately from draft inputs, and derive
//      the displayed result (including the error message) from those
//      submitted inputs rather than writing a separate `result` object
//      into state. `submitted` below is the only "calculated inputs"
//      state value in this component — it is a snapshot of the raw field
//      strings (+ the down-payment unit mode in effect) taken at the
//      moment the user clicks Calculate or toggles $/%. Displayed values
//      are recomputed from it on every render via the pure
//      `deriveResult` helper, so there is never a stored copy of the
//      formatted result (AGENTS.md: "Do not store redundant calculated
//      values in state"; Step 9: "derive displayed results from those
//      submitted inputs").
//
//   3. Never display NaN or Infinity: `deriveResult` short-circuits at
//      each validation gate exactly the way the original script.js#
//      calculate did (price → down-payment → rate/term), each returning
//      the all-$0 sentinel plus the matching error string — no
//      calculation (and therefore no `formatCurrency` call) is ever
//      reached on the invalid paths, so `NaN` / `Infinity` cannot leak
//      into the display. The valid path delegates to the same
//      `calculateMortgage` module the tests already pin down, so its
//      outputs are structurally finite for every input that passes
//      validation.
//
//   4. Approved 0% interest support is preserved: the rate gate uses
//      `parseInterestRate` (raw-string aware, from Step 7), so an
//      explicit "0"/"0.0" passes and a blank or non-numeric rate is
//      rejected — exactly matching the F1-approved behavior.
//
// Chart: the donut is still drawn into the existing <canvas
// id="paymentChart"> via the Chart.js CDN global (Step 11 swaps this for
// react-chartjs-2). The effect keys off the four breakdown values it
// paints (destructured from the derived `result`) plus `hasCalc` — all of
// which only change when a recalculation actually occurs (inside
// `commitCalculation` / `selectMode`, matching the original
// updateChart() cadence) — never on unrelated re-renders like draft
// typing or tab switches. The previous-chart-destroy + on-unmount cleanup
// is preserved (AGENTS.md: "Clean up timers and chart resources").

import { useEffect, useRef, useState } from 'react';
import {
  parseNumeric,
  parseInterestRate,
} from '../lib/validation.js';
import { calculateMortgage } from '../lib/mortgage.js';
import { formatCurrency } from '../lib/formatting.js';

const BLANK_RESULT = {
  paymentAmount: '$0',
  piAmount: '$0',
  principal: '$0',
  totalInterest: '$0',
  monthlyFees: '$0',
  totalPayoff: '$0',
  hasCalc: false,
  pi: 0,
  tax: 0,
  insurance: 0,
  hoa: 0,
  errorMsg: '',
};

/**
 * Pure function: a "submitted" snapshot of the raw field strings (+ the
 * down-payment unit mode in effect) → the displayed result shape.
 * Recomputed on every render from the *submitted* snapshot (not the draft
 * `inputs`), so the display only ever reflects a calculation the user has
 * actually triggered — never a half-typed draft. Mirrors the validation
 * order and exact messages of the original script.js#calculate.
 *
 * @param {{mode: string, price: string, downPayment: string, rate: string,
 *          term: string, tax: string, insurance: string, hoa: string} | null} submitted
 * @returns {object} BLANK_RESULT (possibly with `errorMsg` set) on
 *   failure, or the formatted values + raw breakdown on success.
 */
function deriveResult(submitted) {
  if (!submitted) return BLANK_RESULT;

  const {
    mode: downPaymentMode,
    price,
    downPayment,
    rate,
    term,
    tax,
    insurance,
    hoa,
  } = submitted;

  const priceN = parseNumeric(price);
  let downPaymentN = parseNumeric(downPayment);
  if (downPaymentMode === 'percent') {
    downPaymentN = priceN * (downPaymentN / 100);
  }

  const ratePercent = parseNumeric(rate);
  const termYears = parseNumeric(term);
  const annualTax = parseNumeric(tax);
  const annualInsurance = parseNumeric(insurance);
  const monthlyHoa = parseNumeric(hoa);

  // Exact same gates, order, and messages as script.js#calculate.
  if (priceN <= 0) {
    return { ...BLANK_RESULT, errorMsg: 'Please enter a valid home price.' };
  }
  if (downPaymentN >= priceN) {
    return {
      ...BLANK_RESULT,
      errorMsg: 'Down payment must be less than the home price.',
    };
  }
  // F1 (approved, Step 7): 0% is valid; blank / non-numeric / negative /
  // non-finite rejected. Validated against the raw field text, not
  // parseNumeric's 0-fallback, so an empty rate field is not silently
  // accepted as a zero-interest loan.
  if (!(parseInterestRate(rate) >= 0) || !(termYears > 0)) {
    return {
      ...BLANK_RESULT,
      errorMsg: 'Please enter a valid interest rate and term.',
    };
  }

  // Exact same module + argument order as the original script.js#calculate.
  const calc = calculateMortgage({
    price: priceN,
    downPayment: downPaymentN,
    annualRatePercent: ratePercent,
    termYears,
    annualTax,
    annualInsurance,
    monthlyHoa,
  });

  return {
    paymentAmount: formatCurrency(calc.totalMonthly),
    piAmount: formatCurrency(calc.monthlyPI),
    principal: formatCurrency(calc.principal),
    totalInterest: formatCurrency(calc.totalInterest),
    monthlyFees: formatCurrency(calc.monthlyFees),
    totalPayoff: formatCurrency(calc.totalPayoff),
    hasCalc: true,
    pi: calc.monthlyPI,
    tax: calc.monthlyTax,
    insurance: calc.monthlyInsurance,
    hoa: calc.monthlyHoa,
    errorMsg: '',
  };
}

export default function PaymentCalculator({
  inputs,
  onInputChange,
  priceInputRef,
}) {
  const [downPaymentMode, setDownPaymentMode] = useState('dollar');
  // The only "calculated inputs" state value: a snapshot of the raw field
  // strings (+ the unit mode in effect) taken at the last Calculate /
  // toggle click, or `null` before the first one. Never holds formatted
  // or derived values.
  const [submitted, setSubmitted] = useState(null);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // Derived on every render — never stored (Step 9 requirement).
  const result = deriveResult(submitted);
  // Deconstructed here so the chart effect can key on exactly the values
  // it uses (a small, equality-comparable tuple) rather than on `submitted`
  // or the whole derived object, and without needing an
  // `eslint-disable-next-line react-hooks/exhaustive-deps`.
  const { hasCalc, pi: chartPI, tax: chartTax, insurance: chartIns, hoa: chartHoa } = result;

  // Commit the current draft fields as the new "submitted" snapshot. This
  // is the only place `submitted` is ever written, so its object identity
  // — and therefore the chart effect keyed on it — only changes on the
  // exact two user actions the original re-ran the calculation on (button
  // click, down-payment toggle click).
  function commitCalculation(overrides = {}, mode = downPaymentMode) {
    const bag = { ...inputs, ...overrides };
    setSubmitted({
      mode,
      price: bag.price,
      downPayment: bag.downPayment,
      rate: bag.rate,
      term: bag.term,
      tax: bag.tax,
      insurance: bag.insurance,
      hoa: bag.hoa,
    });
  }

  function selectMode(mode) {
    if (mode === downPaymentMode) return;
    const price = parseNumeric(inputs.price);
    const current = parseNumeric(inputs.downPayment);
    let nextValue = inputs.downPayment;

    // Exact same conversion math as script.js#btnDollar / btnPercent.
    if (mode === 'dollar' && current > 0 && price > 0) {
      nextValue = Math.round(price * (current / 100)).toLocaleString();
    } else if (mode === 'percent' && current > 0 && price > 0) {
      nextValue = ((current / price) * 100).toFixed(1);
    }

    setDownPaymentMode(mode);
    if (nextValue !== inputs.downPayment) {
      onInputChange('downPayment', nextValue);
    }
    // Original behavior: every toggle click re-ran calculate() against the
    // field values present at that moment (including the just-converted
    // down-payment). Preserved: commit the current draft fields with the
    // converted down-payment and the new mode.
    commitCalculation({ downPayment: nextValue }, mode);
  }

  // Draw (or redraw) the donut whenever a successful calculation has
  // occurred. It depends on exactly the values it paints (destructured
  // above), so it fires only when a recalculation actually changes one of
  // them — never on unrelated re-renders like typing in a draft field or
  // switching tabs. The cleanup runs both on every re-draw AND on unmount,
  // guaranteeing only one live Chart.js instance per canvas at a time.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!hasCalc) {
      // No successful calculation yet — keep the canvas clean and tear down
      // any existing instance (StrictMode safety: the effect runs twice on
      // mount in dev, so this path must be idempotent).
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return undefined;
    }
    if (typeof window === 'undefined' || !canvas || !window.Chart) {
      // Chart.js (CDN) not loaded or no canvas — nothing to draw. Step 11
      // replaces this code path with react-chartjs-2.
      return undefined;
    }
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvas.getContext('2d');
    chartRef.current = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['P&I', 'Taxes', 'Insurance', 'HOA'],
        datasets: [{
          data: [chartPI, chartTax, chartIns, chartHoa],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              usePointStyle: true,
              padding: 20,
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                context.label + ': ' + formatCurrency(context.raw),
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [hasCalc, chartPI, chartTax, chartIns, chartHoa]);

  return (
    <>
      <article className="calc-card">
        <h1>Mortgage <span style={{ color: 'var(--primary)' }}>Payoff Lab</span></h1>
        <p className="subtitle">Enter your details to estimate your total monthly property expenses.</p>

        <div className="input-group">
          <label htmlFor="price">Home Price ($)</label>
          <div className="input-wrapper">
            <i className="fas fa-home"></i>
            <input
              type="text"
              id="price"
              placeholder=""
              aria-label="Home Purchase Price"
              value={inputs.price}
              ref={priceInputRef}
              onChange={(e) => onInputChange('price', e.target.value)}
              onBlur={(e) => {
                const val = parseNumeric(e.target.value);
                if (val > 0) onInputChange('price', val.toLocaleString('en-US'));
              }}
            />
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <div className="label-row"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label htmlFor="downPayment" style={{ marginBottom: 0 }}>Down Payment</label>
              <div className="toggle-group" style={{ display: 'flex', gap: '5px' }}>
                <button type="button" className={'toggle-btn' + (downPaymentMode === 'dollar' ? ' active' : '')}
                  onClick={() => selectMode('dollar')}>$</button>
                <button type="button" className={'toggle-btn' + (downPaymentMode === 'percent' ? ' active' : '')}
                  onClick={() => selectMode('percent')}>%</button>
              </div>
            </div>
            <div className="input-wrapper">
              <i className={downPaymentMode === 'dollar' ? 'fas fa-hand-holding-usd' : 'fas fa-percentage'}></i>
              <input
                type="text"
                id="downPayment"
                placeholder="90,000"
                aria-label="Down Payment Amount"
                value={inputs.downPayment}
                onChange={(e) => onInputChange('downPayment', e.target.value)}
                onBlur={(e) => {
                  const val = parseNumeric(e.target.value);
                  if (val > 0 && downPaymentMode === 'dollar') {
                    onInputChange('downPayment', val.toLocaleString('en-US'));
                  } else if (val > 0 && downPaymentMode === 'percent') {
                    onInputChange('downPayment', val.toFixed(1));
                  }
                }}
              />
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="rate">Interest Rate (%)</label>
            <div className="input-wrapper">
              <i className="fas fa-percentage"></i>
              <input
                type="text"
                id="rate"
                placeholder="6.5"
                aria-label="Annual Interest Rate"
                value={inputs.rate}
                onChange={(e) => onInputChange('rate', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <label htmlFor="term">Loan Term (Years)</label>
            <div className="input-wrapper">
              <i className="fas fa-calendar-alt"></i>
              <select
                id="term"
                aria-label="Loan Term in Years"
                value={inputs.term}
                onChange={(e) => onInputChange('term', e.target.value)}
              >
                <option value="15">15 Years</option>
                <option value="30">30 Years</option>
                <option value="20">20 Years</option>
                <option value="10">10 Years</option>
              </select>
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="tax">Property Tax (Annual $)</label>
            <div className="input-wrapper">
              <i className="fas fa-landmark"></i>
              <input
                type="text"
                id="tax"
                placeholder="5,500"
                aria-label="Annual Property Tax"
                value={inputs.tax}
                onChange={(e) => onInputChange('tax', e.target.value)}
                onBlur={(e) => {
                  const val = parseNumeric(e.target.value);
                  if (val > 0) onInputChange('tax', val.toLocaleString('en-US'));
                }}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <label htmlFor="insurance">Home Insurance (Annual $)</label>
            <div className="input-wrapper">
              <i className="fas fa-shield-alt"></i>
              <input
                type="text"
                id="insurance"
                placeholder="1,200"
                aria-label="Annual Homeowners Insurance"
                value={inputs.insurance}
                onChange={(e) => onInputChange('insurance', e.target.value)}
                onBlur={(e) => {
                  const val = parseNumeric(e.target.value);
                  if (val > 0) onInputChange('insurance', val.toLocaleString('en-US'));
                }}
              />
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="hoa">HOA Fee (Monthly $)</label>
            <div className="input-wrapper">
              <i className="fas fa-building"></i>
              <input
                type="text"
                id="hoa"
                placeholder="0"
                aria-label="Monthly HOA Fees"
                value={inputs.hoa}
                onChange={(e) => onInputChange('hoa', e.target.value)}
              />
            </div>
          </div>
        </div>

        <button className="btn-calc" type="button" onClick={() => commitCalculation()}>
          <i className="fas fa-calculator"></i>
          {' '}Calculate My Payment
        </button>

        <div className="error-msg" role="alert"
          style={result.errorMsg ? { display: 'block' } : { display: 'none' }}>
          {result.errorMsg}
        </div>
      </article>

      <aside className="results-card">
        <div className="calc-card payment-result">
          <div className="payment-label">PITI Monthly Payment</div>
          <div className="payment-amount" aria-live="polite">{result.paymentAmount}</div>
          <div className="pi-sub-label"
            style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '10px' }}>
            Principal &amp; Interest (P&amp;I):{' '}
            <span style={{ color: '#fff', fontWeight: 600 }}>{result.piAmount}</span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Principal Loan</div>
            <div className="value">{result.principal}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Interest</div>
            <div className="value">{result.totalInterest}</div>
          </div>
          <div className="stat-card">
            <div className="label">Taxes &amp; Fees</div>
            <div className="value">{result.monthlyFees}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Payoff</div>
            <div className="value">{result.totalPayoff}</div>
          </div>
        </div>

        <div className="chart-container">
          <canvas ref={canvasRef} id="paymentChart"></canvas>
        </div>
      </aside>
    </>
  );
}
