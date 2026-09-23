// Step 8: Extra Payment Magic tab.
//
// All extra-payment state lives in this component (magic* fields, extra
// mode, magic result/error). Shared main-tab inputs arrive as props for
// the one-time main → magic sync that the original script.js did on
// "Extra Payment Magic" nav-link click (only when the magic form's price
// field was empty on first switch, latched via didSync useRef).
//
// The calculation mirrors script.js#calculateMagic verbatim, via the
// Step-7 pure modules. `isPIOverride` semantics are preserved: core
// fields (price, down, rate, term) trigger P&I recalculation; balance/
// tax/insurance/extra / manual P&I fields preserve a user-entered P&I.
//
// Fidelity notes:
//   - The original savingsMessage used innerHTML when positive (with
//     <strong> markup) and textContent otherwise. We preserve the same
//     distinction with a `savingsIsHtml` flag driving
//     dangerouslySetInnerHTML vs. plain-text rendering.
//   - savedPositive keys on `interestSaved > 0`, matching the original
//     exactly.

import { useEffect, useRef, useState } from 'react';
import {
  parseNumeric,
  parseInterestRate,
} from '../lib/validation.js';
import { calculateMortgage } from '../lib/mortgage.js';
import { simulatePayoff } from '../lib/amortization.js';
import {
  formatCurrency,
  formatDurationSpan,
  formatShortDuration,
} from '../lib/formatting.js';

const INITIAL_RESULT = {
  interestSaved: '$0',
  timeSaved: '0 years',
  standardRemaining: '30 Years',
  newPayoffTime: '30 Years',
  originalInterest: '$0',
  newTotalInterest: '$0',
  newTotalMonthly: '$0',
  savingsMessage: 'Enter your details to see the magic happen!',
  savingsColor: 'inherit',
  savingsIsHtml: false,
};

export default function ExtraPaymentCalculator({ mainInputs, seedNonce }) {
  const [magicInputs, setMagicInputs] = useState({
    magicPrice: '',
    magicDownPayment: '',
    magicBalance: '',
    magicRate: '',
    magicTermText: '',
    magicTermSelect: '30',
    magicTax: '',
    magicInsurance: '',
    magicMonthlyPI: '',
    extraAmount: '',
  });
  const [extraMode, setExtraMode] = useState('monthly');
  const [magicErrorMsg, setMagicErrorMsg] = useState('');
  const [result, setResult] = useState(INITIAL_RESULT);
  const magicMonthlyPIRef = useRef(null);
  const didSync = useRef(false);

  function calculate(inputs, calcMode, isPIOverride) {
    setMagicErrorMsg('');

    const price = parseNumeric(inputs.magicPrice);
    const downPayment = parseNumeric(inputs.magicDownPayment);
    const currentBalanceInput = parseNumeric(inputs.magicBalance);
    const ratePercent = parseNumeric(inputs.magicRate);
    const termYearsRaw =
      parseNumeric(inputs.magicTermText) ||
      parseNumeric(inputs.magicTermSelect);
    const extraPayment = parseNumeric(inputs.extraAmount);
    const monthlyTax = parseNumeric(inputs.magicTax) / 12;
    const monthlyInsurance = parseNumeric(inputs.magicInsurance) / 12;

    const originalPrincipal = price - downPayment;
    const startingBalance =
      currentBalanceInput > 0 ? currentBalanceInput : originalPrincipal;

    const rawRateNumber = parseInterestRate(inputs.magicRate);
    if (
      price <= 0 ||
      (currentBalanceInput <= 0 && downPayment >= price) ||
      !(rawRateNumber >= 0) ||
      !(termYearsRaw > 0)
    ) {
      setMagicErrorMsg('Please enter valid mortgage details.');
      return;
    }

    const calculatedPI =
      calculateMortgage({
        price,
        downPayment,
        annualRatePercent: ratePercent,
        termYears: termYearsRaw,
      }).monthlyPI;

    let standardMonthlyPI = parseNumeric(inputs.magicMonthlyPI);
    if (standardMonthlyPI <= 0 || !isPIOverride) {
      standardMonthlyPI = calculatedPI;
      const roundedStr = Math.round(standardMonthlyPI).toLocaleString();
      if (inputs.magicMonthlyPI !== roundedStr) {
        setMagicInputs((prev) => ({ ...prev, magicMonthlyPI: roundedStr }));
      }
    }

    const isMonthly = calcMode === 'monthly';
    const baseline = simulatePayoff({
      startingBalance,
      contractualMonthlyPI: standardMonthlyPI,
      annualRatePercent: ratePercent,
      monthlyExtra: 0,
      oneTimeExtra: 0,
    });
    const accelerated = simulatePayoff({
      startingBalance,
      contractualMonthlyPI: standardMonthlyPI,
      annualRatePercent: ratePercent,
      monthlyExtra: isMonthly ? extraPayment : 0,
      oneTimeExtra: !isMonthly ? extraPayment : 0,
    });

    const baselineInterest = baseline.totalInterest;
    const baselineMonths = baseline.months;
    const newTotalInterest = accelerated.totalInterest;
    const monthsToPayoff = accelerated.months;

    const interestSaved = baselineInterest - newTotalInterest;
    const monthsSaved = baselineMonths - monthsToPayoff;

    const savedPositive = interestSaved > 0;
    setResult({
      interestSaved: formatCurrency(Math.max(0, interestSaved)),
      timeSaved: formatDurationSpan(monthsSaved),
      standardRemaining: formatShortDuration(baselineMonths),
      newPayoffTime: formatShortDuration(monthsToPayoff),
      originalInterest: formatCurrency(baselineInterest),
      newTotalInterest: formatCurrency(newTotalInterest),
      newTotalMonthly: formatCurrency(standardMonthlyPI + monthlyTax + monthlyInsurance),
      savingsMessage: savedPositive
        ? `By paying <strong>${formatCurrency(extraPayment)}</strong> extra ${
            isMonthly ? 'every month' : 'one-time'
          }, you'll save <strong>${formatCurrency(interestSaved)}</strong> in total interest!`
        : 'Increase your extra payment to see how much you can save!',
      savingsColor: savedPositive ? 'var(--secondary)' : 'inherit',
      savingsIsHtml: savedPositive,
    });
  }

  function updateMagicInput(key, value) {
    const next = { ...magicInputs, [key]: value };
    setMagicInputs(next);

    const isCore =
      key === 'magicPrice' ||
      key === 'magicDownPayment' ||
      key === 'magicRate' ||
      key === 'magicTermText' ||
      key === 'magicTermSelect';
    calculate(next, extraMode, !isCore);
  }

  function handleCalculate() {
    calculate(magicInputs, extraMode, false);
  }

  function selectExtraMode(mode) {
    if (mode === extraMode) return;
    setExtraMode(mode);
    calculate(magicInputs, mode, false);
  }

  // One-time main → magic sync.
  useEffect(() => {
    if (seedNonce <= 0) return;
    if (didSync.current) return;
    didSync.current = true;

    const mainPrice = parseNumeric(mainInputs.price);
    if (mainPrice <= 0) return;
    if (parseNumeric(magicInputs.magicPrice) > 0) return;

    const down = parseNumeric(mainInputs.downPayment);
    const principal = mainPrice - down;
    const next = {
      ...magicInputs,
      magicPrice: mainInputs.price,
      magicDownPayment: mainInputs.downPayment,
      magicBalance: principal > 0 ? principal.toLocaleString('en-US') : '',
      magicRate: mainInputs.rate,
      magicTermText: String(mainInputs.term || ''),
      magicTermSelect: String(mainInputs.term || '30'),
      magicTax: mainInputs.tax,
      magicInsurance: mainInputs.insurance,
    };
    setMagicInputs(next);
    calculate(next, extraMode, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedNonce]);

  return (
    <>
      <article className="calc-card">
        <div
          className="badge"
          style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '99px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-block',
            marginBottom: '12px',
          }}
        >
          NEW FEATURE
        </div>
        <h1>
          Extra Payment <span style={{ color: 'var(--secondary)' }}>Magic</span>
        </h1>
        <p className="subtitle">
          See how much time and interest you can save by paying a little extra.
        </p>

        <div className="row">
          <div className="input-group">
            <label htmlFor="magicTermText">Original Loan Term (Years)</label>
            <div className="input-wrapper">
              <i className="fas fa-calendar-alt"></i>
              <input
                type="text"
                id="magicTermText"
                placeholder="30"
                aria-label="Original Loan Term"
                value={magicInputs.magicTermText}
                onChange={(e) => updateMagicInput('magicTermText', e.target.value)}
              />
            </div>
          </div>
          <div className="input-group">
            <label
              htmlFor="magicMonthlyPI"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Monthly P&amp;I Payment ($)
              <div className="tooltip-container">
                <i
                  className="fas fa-info-circle"
                  style={{ fontSize: '0.8rem', cursor: 'help', color: 'var(--text-muted)' }}
                ></i>
                <span className="tooltip-text">
                  We calculated this based on your original loan. Change this if
                  your actual monthly payment is different.
                </span>
              </div>
            </label>
            <div className="input-wrapper">
              <i className="fas fa-file-invoice-dollar" style={{ color: 'var(--primary)' }}></i>
              <input
                type="text"
                id="magicMonthlyPI"
                placeholder="2,500"
                aria-label="Monthly Principal and Interest"
                value={magicInputs.magicMonthlyPI}
                ref={magicMonthlyPIRef}
                onChange={(e) => updateMagicInput('magicMonthlyPI', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="magicBalance">Current Loan Balance ($)</label>
          <div className="input-wrapper">
            <i className="fas fa-money-bill-trend-up" style={{ color: 'var(--secondary)' }}></i>
            <input
              type="text"
              id="magicBalance"
              placeholder="515,000"
              aria-label="Current Loan Balance"
              value={magicInputs.magicBalance}
              onChange={(e) => updateMagicInput('magicBalance', e.target.value)}
            />
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <label htmlFor="magicPrice">Home Price ($)</label>
            <div className="input-wrapper">
              <i className="fas fa-home"></i>
              <input
                type="text"
                id="magicPrice"
                placeholder="600,000"
                aria-label="Home Purchase Price"
                value={magicInputs.magicPrice}
                onChange={(e) => updateMagicInput('magicPrice', e.target.value)}
              />
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="magicDownPayment">Down Payment ($)</label>
            <div className="input-wrapper">
              <i className="fas fa-hand-holding-usd"></i>
              <input
                type="text"
                id="magicDownPayment"
                placeholder="105,000"
                aria-label="Down Payment Amount"
                value={magicInputs.magicDownPayment}
                onChange={(e) => updateMagicInput('magicDownPayment', e.target.value)}
              />
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="magicRate">Interest Rate (%)</label>
            <div className="input-wrapper">
              <i className="fas fa-percentage"></i>
              <input
                type="text"
                id="magicRate"
                placeholder="6.5"
                aria-label="Annual Interest Rate"
                value={magicInputs.magicRate}
                onChange={(e) => updateMagicInput('magicRate', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <label htmlFor="magicTermSelect">Loan Term (Years)</label>
            <div className="input-wrapper">
              <i className="fas fa-calendar-alt"></i>
              <select
                id="magicTermSelect"
                aria-label="Loan Term in Years"
                value={magicInputs.magicTermSelect}
                onChange={(e) => updateMagicInput('magicTermSelect', e.target.value)}
              >
                <option value="15">15 Years</option>
                <option value="30">30 Years</option>
                <option value="20">20 Years</option>
                <option value="10">10 Years</option>
              </select>
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="magicTax">Property Tax (Annual $)</label>
            <div className="input-wrapper">
              <i className="fas fa-landmark"></i>
              <input
                type="text"
                id="magicTax"
                placeholder="5,500"
                aria-label="Annual Property Tax"
                value={magicInputs.magicTax}
                onChange={(e) => updateMagicInput('magicTax', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <label htmlFor="magicInsurance">Home Insurance (Annual $)</label>
            <div className="input-wrapper">
              <i className="fas fa-shield-alt"></i>
              <input
                type="text"
                id="magicInsurance"
                placeholder="1,200"
                aria-label="Annual Homeowners Insurance"
                value={magicInputs.magicInsurance}
                onChange={(e) => updateMagicInput('magicInsurance', e.target.value)}
              />
            </div>
          </div>
          <div className="input-group">
            <div
              className="label-row"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}
            >
              <label htmlFor="extraAmount" style={{ marginBottom: 0 }}>
                Extra Payment
              </label>
              <div className="toggle-group" style={{ display: 'flex', gap: '5px' }}>
                <button
                  type="button"
                  className={'toggle-btn' + (extraMode === 'monthly' ? ' active' : '')}
                  onClick={() => selectExtraMode('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={'toggle-btn' + (extraMode === 'one-time' ? ' active' : '')}
                  onClick={() => selectExtraMode('one-time')}
                >
                  One-time
                </button>
              </div>
            </div>
            <div className="input-wrapper">
              <i className="fas fa-magic" style={{ color: 'var(--secondary)' }}></i>
              <input
                type="text"
                id="extraAmount"
                placeholder="200"
                aria-label="Extra Payment Amount"
                value={magicInputs.extraAmount}
                onChange={(e) => updateMagicInput('extraAmount', e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          className="btn-calc"
          type="button"
          style={{ background: 'var(--secondary)' }}
          onClick={handleCalculate}
        >
          <i className="fas fa-wand-magic-sparkles"></i>
          {' '}
          Calculate Savings
        </button>

        <div
          className="error-msg"
          role="alert"
          style={magicErrorMsg ? { display: 'block' } : { display: 'none' }}
        >
          {magicErrorMsg}
        </div>
      </article>

      <aside className="results-card">
        <div
          className="calc-card"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            borderColor: 'rgba(16, 185, 129, 0.2)',
            textAlign: 'center',
          }}
        >
          <div className="payment-label" style={{ color: 'var(--secondary)' }}>
            Total Interest Saved
          </div>
          <div className="payment-amount" style={{ color: 'var(--secondary)' }}>
            {result.interestSaved}
          </div>
          <div
            className="pi-sub-label"
            style={{
              fontSize: '1rem',
              color: '#fff',
              marginTop: '10px',
              fontWeight: 600,
            }}
          >
            Time Saved:{' '}
            <span style={{ color: 'var(--secondary)' }}>{result.timeSaved}</span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card" style={{ borderColor: 'var(--glass-border)' }}>
            <div
              className="label"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              Normally Remaining
              <div className="tooltip-container">
                <i
                  className="fas fa-info-circle"
                  style={{
                    fontSize: '0.8rem',
                    cursor: 'help',
                    color: 'var(--text-muted)',
                  }}
                ></i>
                <span className="tooltip-text">
                  Forward-looking simulation: Based on your current balance and
                  original fixed P&amp;I payment. This is the exact time left if
                  you make no more extra payments.
                </span>
              </div>
            </div>
            <div className="value" style={{ color: 'var(--text-muted)' }}>
              {result.standardRemaining}
            </div>
          </div>
          <div className="stat-card" style={{ borderColor: 'var(--secondary)' }}>
            <div className="label">New Payoff Time</div>
            <div className="value">{result.newPayoffTime}</div>
          </div>
          <div className="stat-card">
            <div className="label">Original Interest</div>
            <div className="value">{result.originalInterest}</div>
          </div>
          <div className="stat-card">
            <div className="label">New Total Interest</div>
            <div className="value">{result.newTotalInterest}</div>
          </div>
          <div className="stat-card">
            <div className="label">New Monthly PITI</div>
            <div className="value">{result.newTotalMonthly}</div>
          </div>
        </div>

        <div
          className="chart-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            textAlign: 'center',
            gap: '15px',
          }}
        >
          <div
            className="savings-message"
            style={{
              fontSize: '1.1rem',
              lineHeight: 1.5,
              color: result.savingsColor,
            }}
            {...(result.savingsIsHtml
              ? { dangerouslySetInnerHTML: { __html: result.savingsMessage } }
              : { children: result.savingsMessage })}
          ></div>
          <i className="fas fa-piggy-bank"></i>
        </div>
      </aside>
    </>
  );
}
