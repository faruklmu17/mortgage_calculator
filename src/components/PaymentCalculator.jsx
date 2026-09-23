// Step 8: React boundary — main calculator tab.
//
// The DOM structure mirrors the original index.html markup (same classes,
// same order, same aria attributes) so the existing style.css applies
// unchanged. Shared loan inputs arrive as props from CalculatorApp (nearest
// common parent of both tabs) so the Extra Payment tab can read them on sync.
//
// The results card below is rendered from the last calculation only:
// state holds input strings, `result` holds derived values. No other
// derived values are duplicated in state.
//
// The donut chart is drawn into the existing <canvas id="paymentChart">
// on the first valid calculation and on every subsequent one. Step 11 will
// replace this with react-chartjs-2, but until then we must keep the
// original Chart.js (CDN global) path working. The effect cleanup
// destroys the previous Chart.js instance on every re-draw AND on unmount,
// so we never end up with two live Chart.js instances bound to the same
// canvas (AGENTS.md: "Clean up timers and chart resources").
//
// Down-payment toggle conversion: the original re-ran the calculation on
// every toggle click so the result card + chart always reflected the new
// value. That behavior is preserved here: `selectMode` computes the
// post-conversion string, writes it to shared state, and immediately runs
// the calculation with that value (bypassing the not-yet-committed state).

import { useEffect, useRef, useState } from 'react';
import {
  parseNumeric,
  parseInterestRate,
} from '../lib/validation.js';
import { calculateMortgage } from '../lib/mortgage.js';
import { formatCurrency } from '../lib/formatting.js';

const INITIAL_RESULT = {
  paymentAmount: '$0',
  piAmount: '$0',
  principal: '$0',
  totalInterest: '$0',
  monthlyFees: '$0',
  totalPayoff: '$0',
  // Raw numeric breakdown — only consumed by the chart effect, not for
  // display. `hasCalc` doubles as the "a valid result is ready" flag so
  // the effect can no-op on the first render before any calculate.
  hasCalc: false,
  pi: 0,
  tax: 0,
  insurance: 0,
  hoa: 0,
};

export default function PaymentCalculator({
  inputs,
  onInputChange,
  priceInputRef,
}) {
  const [downPaymentMode, setDownPaymentMode] = useState('dollar');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(INITIAL_RESULT);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // Parameterized on `overrides` so callers (the down-payment toggle in
  // particular) can pass a value that has not yet committed to shared
  // state — mirroring the original script.js#toggle + calculate() ordering.
  function handleCalculate(overrides) {
    setErrorMsg('');

    const bag = { ...inputs, ...(overrides || {}) };
    const price = parseNumeric(bag.price);
    let downPayment = parseNumeric(bag.downPayment);
    if (downPaymentMode === 'percent') {
      downPayment = price * (downPayment / 100);
    }

    const ratePercent = parseNumeric(bag.rate);
    const termYears = parseNumeric(bag.term);
    const annualTax = parseNumeric(bag.tax);
    const annualInsurance = parseNumeric(bag.insurance);
    const monthlyHoa = parseNumeric(bag.hoa);

    if (price <= 0) {
      setResult({ ...INITIAL_RESULT, paymentAmount: '$0' });
      setErrorMsg('Please enter a valid home price.');
      return;
    }
    if (downPayment >= price) {
      setResult({ ...INITIAL_RESULT, paymentAmount: '$0' });
      setErrorMsg('Down payment must be less than the home price.');
      return;
    }
    if (!(parseInterestRate(bag.rate) >= 0) || !(termYears > 0)) {
      setResult({ ...INITIAL_RESULT, paymentAmount: '$0' });
      setErrorMsg('Please enter a valid interest rate and term.');
      return;
    }

    // Exact same module + argument order as the original script.js#calculate.
    const calc = calculateMortgage({
      price,
      downPayment,
      annualRatePercent: ratePercent,
      termYears,
      annualTax,
      annualInsurance,
      monthlyHoa,
    });

    setResult({
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
    });
  }

  function selectMode(mode) {
    if (mode === downPaymentMode) return;
    const price = parseNumeric(inputs.price);
    const current = parseNumeric(inputs.downPayment);
    let nextValue = inputs.downPayment;

    if (mode === 'dollar' && current > 0 && price > 0) {
      nextValue = Math.round(price * (current / 100)).toLocaleString();
    } else if (mode === 'percent' && current > 0 && price > 0) {
      nextValue = ((current / price) * 100).toFixed(1);
    }

    setDownPaymentMode(mode);
    if (nextValue !== inputs.downPayment) {
      onInputChange('downPayment', nextValue);
    }
    // Re-calculate immediately with the new (possibly converted) value,
    // preserving the original "toggle → recalc" behavior.
    handleCalculate({ downPayment: nextValue });
  }

  // Draw (or redraw) the donut whenever a successful calculation has
  // occurred. The effect runs synchronously after React commits the new
  // `result`, so the latest numeric breakdown is always what's painted.
  // The cleanup runs both on every re-draw AND on unmount, guaranteeing
  // only one live Chart.js instance per canvas at a time.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!result.hasCalc) {
      // No successful calculation yet — keep the canvas clean and tear down
      // any existing instance (StrictMode safety).
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
          data: [result.pi, result.tax, result.insurance, result.hoa],
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
  }, [result]);

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

        <button className="btn-calc" type="button" onClick={() => handleCalculate()}>
          <i className="fas fa-calculator"></i>
          {' '}Calculate My Payment
        </button>

        <div className="error-msg" role="alert"
          style={errorMsg ? { display: 'block' } : { display: 'none' }}>
          {errorMsg}
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
