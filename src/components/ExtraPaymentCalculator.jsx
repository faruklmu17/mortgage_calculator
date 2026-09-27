// Step 10: Extra Payment Magic tab — submitted-snapshot + derive pattern.
//
// Mirrors Step 9's PaymentCalculator refactor: the only "calculated inputs"
// state value is `submitted` (a snapshot of the raw magic field strings +
// the extra-mode + the isPIOverride trigger taken at the moment of the
// user action that fired the recalc). The displayed result (including the
// error message and the new Step 10 non-success messaging per F7) is
// derived from `submitted` on every render by the pure
// `deriveExtraPaymentResult` helper in `src/lib/extraMagic.js` — no
// formatted or derived value is stored in state.
//
// DOM behavior preserved from Step 8 (and from original script.js):
//   - Same DOM structure, CSS classes, IDs, labels, aria attributes.
//   - Same isPIOverride semantics: core-edits recalculate P&I and
//     auto-fill the field; non-core-edits honor a manual P&I.
//   - Same one-time main → magic sync driven by `seedNonce` (only once,
//     only when magic price is empty and main price > 0).
//   - Same "on-blur format" behavior on numeric fields (preserved from
//     Step 8 for balance / price / down / tax / insurance).
//   - Same toggle button behavior for Monthly vs One-time.
//
// Step 10 requirements honored here:
//   #1 P&I / balance / mode — all preserved (see `submitted`).
//   #2 Lump-sum timing (month 1), rounding, manual P&I overrides,
//      tab sync — preserved (see `deriveExtraPaymentResult`).
//   #3 Contractual P&I computed from the ORIGINAL loan, never from the
//      current balance (see `deriveExtraPaymentResult`).
//   #4 Taxes & insurance are display-only (PITI) — excluded from the
//      payoff simulation.
//   #5 Baseline + accelerated payoff time and interest + time saved +
//      interest saved — all derived.
//   #6 0% interest, zero extra, oversized extras, small final payment —
//      handled by `simulatePayoff` / `deriveExtraPaymentResult` (tests
//      in `src/lib/extraMagic.test.js`).
//   #7 Non-success (non-amortizing, 600-month limit) — surfaced with a
//      clear warning; never presented as a "successful" payoff.
//   #8 Raw input strings preserved while editing; same styling; NaN /
//      Infinity never displayed.
//
// Main → magic sync (Step 8 note #2 / Step 10 req #2):
//   - Fires on **every** nav-Extra click (each `seedNonce` bump), not just
//     once — matching the original, which re-checked on every click.
//   - Fires **only when** main price > 0 and the magic price is empty
//     (preserving the user's existing magic inputs otherwise).
//   - On fire: copies the main tab's loan fields into the magic fields
//     (price/down/rate/term/tax/insurance), sets `magicBalance` to
//     `price - downPayment`, commits the synced snapshot as the new
//     `submitted`, and triggers a recalculation.
//   - If the magic price is NOT empty, the sync is skipped; the tab still
//     shows the last committed result (or the BLANK state if none yet).

import { useEffect, useRef, useState } from 'react';
import { parseNumeric } from '../lib/validation.js';
import {
  deriveExtraPaymentResult,
} from '../lib/extraMagic.js';

const CORE_KEYS = new Set([
  'magicPrice',
  'magicDownPayment',
  'magicRate',
  'magicTermText',
  'magicTermSelect',
]);
const NON_CORE_KEYS = new Set([
  'magicBalance',
  'magicTax',
  'magicInsurance',
  'extraAmount',
  'magicMonthlyPI',
]);

/**
 * Strip the `__`-prefixed bookkeeping keys off a snapshot before returning
 * it to `deriveExtraPaymentResult`. The pure module only reads the 10
 * magic field names and ignores unknown keys — but we keep this small
 * helper so the call-site reads cleanly.
 */
function fieldOnly(submitted) {
  if (!submitted) return null;
  const out = {
    magicPrice: submitted.magicPrice,
    magicDownPayment: submitted.magicDownPayment,
    magicBalance: submitted.magicBalance,
    magicRate: submitted.magicRate,
    magicTermText: submitted.magicTermText,
    magicTermSelect: submitted.magicTermSelect,
    magicTax: submitted.magicTax,
    magicInsurance: submitted.magicInsurance,
    magicMonthlyPI: submitted.magicMonthlyPI,
    extraAmount: submitted.extraAmount,
  };
  return out;
}

export default function ExtraPaymentCalculator({ mainInputs, seedNonce }) {
  // Draft strings for the 10 magic-tab fields. Always user-editable.
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
  // Extra-payment mode in effect ('monthly' | 'one-time').
  const [extraMode, setExtraMode] = useState('monthly');
  // The ONLY "calculated inputs" state value in this component: a snapshot
  // of the raw field strings + the isPIOverride trigger + the mode at the
  // moment of the user action that last fired a recalculation. `null`
  // before the first such action.
  const [submitted, setSubmitted] = useState(null);
  const piFieldRef = useRef(null);

  // Derived on every render — never stored (AGENTS.md / Step 9 pattern).
  // The `__isPIOverride` flag is what was in effect at the moment the
  // recalc was triggered; it is the same flag `script.js#calculateMagic`
  // received as an argument.
  const derived = deriveExtraPaymentResult(
    fieldOnly(submitted),
    extraMode,
    (submitted && submitted.__isPIOverride) === true
  );
  const result = derived; // named for readability at JSX call-sites
  const errorMsg = result.errorMsg || '';

  // ── Auto-fill the magicMonthlyPI field when the derive says to ──
  // Only when (a) `piAutoFill` is not null (we are NOT honoring a manual
  // override) AND (b) the PI field is not currently focused (the
  // original's `document.activeElement !== magicMonthlyPI` guard —
  // Step 8 note #1 carries through).
  // Keyed on the auto-fill string itself so it only fires when the value
  // would actually change for a calculation (not on unrelated re-renders).
  const piAutoFill = result.piAutoFill;
  useEffect(() => {
    if (piAutoFill == null) return;
    const el = piFieldRef.current;
    if (el && document.activeElement === el) return;
    setMagicInputs((prev) =>
      prev.magicMonthlyPI === piAutoFill
        ? prev
        : { ...prev, magicMonthlyPI: piAutoFill }
    );
  }, [piAutoFill]);

  // ── Main → magic sync (Step 8 note #2 / Step 10 req #2) ──
  // The original re-ran this check on EVERY navExtra click — including
  // clicks while already on the magic tab — whenever the magic price field
  // was empty and the main price had a value. It was NOT one-shot: a user
  // who cleared the magic price (or whose demo fields were cleared by the
  // Step 12 demo) could trigger a re-sync on the next nav-Extra click.
  // So there is no latch here: each seedNonce bump re-checks the
  // preconditions and syncs when they hold.
  useEffect(() => {
    if (!seedNonce || seedNonce <= 0) return;

    const mainPrice = parseNumeric(mainInputs.price);
    if (mainPrice <= 0) return;
    if (parseNumeric(magicInputs.magicPrice) > 0) return;

    const down = parseNumeric(mainInputs.downPayment);
    const principal = mainPrice - down;
    const synced = {
      ...magicInputs,
      magicPrice: mainInputs.price,
      magicDownPayment: mainInputs.downPayment,
      // Original copied `principal.toLocaleString('en-US')` unconditionally
      // (a non-positive principal still lands in the field and then fails
      // magic validation exactly as it did in the vanilla version).
      magicBalance: principal.toLocaleString('en-US'),
      magicRate: mainInputs.rate,
      magicTermText: String(mainInputs.term || ''),
      magicTermSelect: String(mainInputs.term || '30'),
      magicTax: mainInputs.tax,
      magicInsurance: mainInputs.insurance,
      extraAmount: '',
      magicMonthlyPI: '',
    };
    setMagicInputs(synced);
    // Commit the synced snapshot with a core trigger (isPIOverride=false)
    // so the PI auto-fills per the original behavior.
    setSubmitted({
      ...synced,
      __isPIOverride: false,
      __modeAtCommit: extraMode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedNonce]);

  // ── Field handlers ──

  function updateMagicInput(key, value) {
    const next = { ...magicInputs, [key]: value };
    setMagicInputs(next);

    const isCore = CORE_KEYS.has(key);
    const isNonCore = NON_CORE_KEYS.has(key);
    // Original semantics: any input in the magic form recalculates,
    // passing isPIOverride = isNonCore (true for the 5 non-core fields,
    // false for the 5 core fields).
    if (isCore || isNonCore) {
      setSubmitted({
        ...next,
        __isPIOverride: isNonCore,
        __modeAtCommit: extraMode,
      });
    }
    // Keys not in either set are inert (none exist today).
  }

  function handleCalculate() {
    // Original: Calculate-Savings recalcs with isPIOverride=false
    // (PI auto-fills) using the current field values.
    setSubmitted({
      ...magicInputs,
      __isPIOverride: false,
      __modeAtCommit: extraMode,
    });
  }

  function selectExtraMode(mode) {
    if (mode === extraMode) return;
    setExtraMode(mode);
    // Original: every toggle click recalcs with the current field values
    // (isPIOverride=false).
    setSubmitted({
      ...magicInputs,
      __isPIOverride: false,
      __modeAtCommit: mode,
    });
  }

  // ── Blur formatters (preserved from Step 8) ──
  function blurNumeric(key) {
    return (e) => {
      const val = parseNumeric(e.target.value);
      if (val > 0) {
        setMagicInputs((prev) => ({
          ...prev,
          [key]: val.toLocaleString('en-US'),
        }));
      }
    };
  }

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
                  style={{
                    fontSize: '0.8rem',
                    cursor: 'help',
                    color: 'var(--text-muted)',
                  }}
                ></i>
                <span className="tooltip-text">
                  We calculated this based on your original loan. Change this if
                  your actual monthly payment is different.
                </span>
              </div>
            </label>
            <div className="input-wrapper">
              <i
                className="fas fa-file-invoice-dollar"
                style={{ color: 'var(--primary)' }}
              ></i>
              <input
                type="text"
                id="magicMonthlyPI"
                placeholder="2,500"
                aria-label="Monthly Principal and Interest"
                value={magicInputs.magicMonthlyPI}
                ref={piFieldRef}
                onChange={(e) => updateMagicInput('magicMonthlyPI', e.target.value)}
                onBlur={blurNumeric('magicMonthlyPI')}
              />
            </div>
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="magicBalance">Current Loan Balance ($)</label>
          <div className="input-wrapper">
            <i
              className="fas fa-money-bill-trend-up"
              style={{ color: 'var(--secondary)' }}
            ></i>
            <input
              type="text"
              id="magicBalance"
              placeholder="515,000"
              aria-label="Current Loan Balance"
              value={magicInputs.magicBalance}
              onChange={(e) => updateMagicInput('magicBalance', e.target.value)}
              onBlur={blurNumeric('magicBalance')}
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
                onBlur={blurNumeric('magicPrice')}
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
                onBlur={blurNumeric('magicDownPayment')}
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
                onBlur={blurNumeric('magicTax')}
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
                onBlur={blurNumeric('magicInsurance')}
              />
            </div>
          </div>
          <div className="input-group">
            <div
              className="label-row"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
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
                onBlur={blurNumeric('extraAmount')}
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
          style={errorMsg ? { display: 'block' } : { display: 'none' }}
        >
          {errorMsg}
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
            style={{ fontSize: '1rem', color: '#fff', marginTop: '10px', fontWeight: 600 }}
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
