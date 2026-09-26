// Step 10: Extra Payment Magic tab — parity-hardened, derived-on-render.
//
// Step 8 created this tab. Step 10 completes its parity work:
//
//   1. The displayed result is now derived on every render from the raw
//      field strings + extra mode + P&I-override flag by the pure
//      `deriveExtraPaymentResult` (src/lib/extraPayment.js) — the same
//      derive-on-render pattern Step 9 applied to the main calculator,
//      and AGENTS.md's "Do not store redundant calculated values in
//      state". No `result` object is stored in state.
//
//   2. Decision F7 (approved in the Step 10 request): a simulation that
//      hits the 600-month cap without paying off — or a payment that
//      does not cover the first month's interest — is surfaced as an
//      explicit `limitWarning` with a trailing '+' on the truncated
//      duration, so an unpaid loan is never presented as fully paid off.
//
//   3. Parity restorations against the original script.js:
//      - the `magicMonthlyPI` focus guard (the original never overwrote
//        a focused field) is restored via the ref;
//      - the loan term is read from the text input ONLY — the original
//        `getElementById('magicTerm')` returned the first element in
//        document order (the text input); the select was dead UI
//        (decision F4, unresolved);
//      - the tab sync re-runs on EVERY switch to this tab while the
//        magic price field is empty (the original navExtra handler had
//        no one-time latch), writes the raw principal unconditionally,
//        and never touches the dead select;
//      - the original blur formatters (thousands separators on the
//        seven currency fields, no recalculation) are restored.
//
//   4. Documented deviations (see MIGRATION_STATUS.md, Step 10):
//      - a validation error resets the result cards to the all-sentinel
//        values (consistent with the Step 9 main calculator; the
//        original kept previously displayed values on error).
//
// Step 12: the original script.js#runMagicDemo (navExtra-handler-driven,
// sessionStorage key `mpl_magic_demo_v4`) is now ported, with the Step 12
// requirements layered on top:
//   - same demo values/order and the same 40 ms/char + 200 ms pause
//     cadence, with the P&I auto-fill applied on the original
//     calculateMagic() ticks (every third char + field completion);
//   - the session key is set when typing FINISHES, as in the original
//     (a reload mid-demo re-runs the demo on the next switch);
//   - every timer is tracked in demoTimerRef and cleared on stop/unmount;
//   - user interaction (typing, Calculate, mode toggle) stops the demo;
//   - a second nav click while a demo is running cannot start a second
//     one (the original would have started a competing chain — latent
//     bug, not reproduced);
//   - fields the user already filled are skipped, never cleared (the
//     original cleared all six before typing — Step 12: "do not overwrite
//     values the user has entered");
//   - the original's "clear the fields but keep the stale result" ending
//     is not possible under the Step 10 derived-on-render pattern
//     (AGENTS.md: do not store redundant calculated values) — the demo
//     values REMAIN in the fields so the result stays visible and
//     consistent with them (F6 resolved, see MIGRATION_STATUS.md);
//   - prefers-reduced-motion: the values appear all at once, no glow.
//
// The DOM structure, CSS classes, and aria attributes are unchanged from
// Step 8 / the original index.html.

import { useEffect, useRef, useState } from 'react';
import { parseNumeric } from '../lib/validation.js';
import {
  deriveExtraPaymentResult,
  applyPIAutoFill,
  CORE_MAGIC_KEYS,
} from '../lib/extraPayment.js';

// Step 12: the original's demo session key (the "v4" rename forced a
// one-time reset for existing visitors; it must stay as-is) and the demo
// values in the original's typing order. `magicTerm` in the original
// resolved to the LEADING text input (decision F4), hence
// `magicTermText` here.
const MAGIC_DEMO_KEY = 'mpl_magic_demo_v4';
const MAGIC_DEMO_FIELDS = [
  ['magicPrice', '600,000'],
  ['magicBalance', '450,000'],
  ['magicDownPayment', '120,000'],
  ['magicRate', '6.5'],
  ['magicTermText', '30'],
  ['extraAmount', '500'],
];

export default function ExtraPaymentCalculator({ mainInputs, seedNonce }) {
  const [magicInputs, setMagicInputs] = useState({
    magicPrice: '',
    magicDownPayment: '',
    magicBalance: '',
    magicRate: '',
    magicTermText: '',
    magicTax: '',
    magicInsurance: '',
    magicMonthlyPI: '',
    extraAmount: '',
  });
  const [extraMode, setExtraMode] = useState('monthly');
  // Whether the P&I field currently holds a user-entered value the
  // original would honor (a calculateMagic(true) event with value > 0).
  // The simulation must use the UNROUNDED calculated P&I whenever this
  // is false — even when the field displays the rounded auto-filled
  // value — exactly as the original used `calculatedPI` whenever its
  // fill branch ran.
  const [piIsManual, setPiIsManual] = useState(false);
  const magicMonthlyPIRef = useRef(null);

  // ── Step 12: magic demo (script.js#runMagicDemo) ──
  // The demo is a single setTimeout chain; at most one timer is pending
  // at any moment, so one ref tracks it. Refs (not state) so the user
  // handlers and the effect below always see the live value.
  const demoActiveRef = useRef(false);
  const demoTimerRef = useRef(null);
  // 0 = none, 1 = glowing (scale 1.02), 2 = settled back to scale(1).
  // The original set the inline transition + transform on the results
  // card directly; the state-driven inline style keeps style.css
  // untouched (AGENTS.md: reuse the existing CSS).
  const [demoGlow, setDemoGlow] = useState(0);

  // Step 12: cancel the pending demo timer. Called by the user handlers
  // (interaction stops the demo) and by the unmount cleanup below
  // (AGENTS.md: "Clean up timers").
  function stopDemo() {
    if (demoTimerRef.current !== null) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    demoActiveRef.current = false;
    // If the user interrupted between the glow start and its settle-back
    // timer, drop the glow rather than leaving the card scaled up.
    if (demoGlow !== 0) setDemoGlow(0);
  }

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  // Step 12: type the demo values into the tab. `baseline` is the field
  // state at the moment the original navExtra handler reached its demo
  // check (i.e. after the Calculator → Magic sync).
  function startDemo(baseline) {
    if (demoActiveRef.current) return; // no competing second chain
    if (sessionStorage.getItem(MAGIC_DEMO_KEY) === '1') return;

    // Step 12 (prefers-reduced-motion): no typing animation, no glow —
    // the demo values appear all at once; the session key is set
    // immediately (nothing left to "finish").
    if (prefersReducedMotion()) {
      const next = { ...baseline };
      MAGIC_DEMO_FIELDS.forEach(([key, val]) => {
        if (String(next[key]).trim() === '') next[key] = val;
      });
      const { inputs: filled } = applyPIAutoFill(next, {
        force: true,
        isFocused: piIsFocused(),
      });
      setMagicInputs(filled);
      setPiIsManual(false);
      sessionStorage.setItem(MAGIC_DEMO_KEY, '1');
      return;
    }

    demoActiveRef.current = true;
    // Original: cleared all six fields before typing. Step 12
    // requirement: values the user already entered are never cleared or
    // overwritten — those fields are skipped instead (same 200 ms beat).
    const demoData = MAGIC_DEMO_FIELDS.map(([key, val]) => ({
      key,
      val,
      skip: String(baseline[key]).trim() !== '',
    }));
    // The in-progress field strings; the P&I auto-fill writes into the
    // same copy so it is carried forward tick by tick.
    const current = { ...baseline };

    function schedule(fn, ms) {
      demoTimerRef.current = setTimeout(() => {
        demoTimerRef.current = null;
        fn();
      }, ms);
    }

    function typeField(index, charIdx) {
      if (index >= demoData.length) {
        // Original: the session key is set when typing FINISHES, not at
        // start — a reload mid-demo re-runs the demo on the next switch.
        sessionStorage.setItem(MAGIC_DEMO_KEY, '1');
        demoActiveRef.current = false;
        // Original: soft glow on the results card — scale(1.02) with a
        // 0.5 s transition, back to scale(1) 500 ms later.
        setDemoGlow(1);
        schedule(() => setDemoGlow(2), 500);
        return;
      }
      const item = demoData[index];
      if (item.skip) {
        schedule(() => typeField(index + 1, 0), 200);
        return;
      }
      const targetVal = item.val;
      if (charIdx <= targetVal.length) {
        current[item.key] = targetVal.substring(0, charIdx);
        // Original: calculateMagic() (isPIOverride=false) after every
        // third character and on field completion → force P&I auto-fill.
        // applyPIAutoFill no-ops while the form is invalid, exactly like
        // the original's validation early-return (mid-demo the P&I field
        // stayed empty until rate + term were both typed).
        if (charIdx === targetVal.length || charIdx % 3 === 0) {
          const { inputs: filled } = applyPIAutoFill(current, {
            force: true,
            isFocused: piIsFocused(),
          });
          if (filled !== current) Object.assign(current, filled);
          setPiIsManual(false);
        }
        setMagicInputs({ ...current });
        // Original: 40 ms per character ("faster typing for numbers").
        schedule(() => typeField(index, charIdx + 1), 40);
      } else {
        // Original: 200 ms pause between fields.
        schedule(() => typeField(index + 1, 0), 200);
      }
    }

    typeField(0, 0);
  }

  // AGENTS.md: "Clean up timers" — the unmount cleanup cancels any
  // in-flight demo chain. (StrictMode-safe: stopDemo is a no-op when no
  // timer is pending.)
  useEffect(() => stopDemo, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived on every render — never stored (AGENTS.md / Step 9 pattern).
  // The magic tab recalculated live on every input in the original, so
  // the draft strings are the derivation inputs.
  const result = deriveExtraPaymentResult(magicInputs, extraMode, piIsManual);

  function piIsFocused() {
    return (
      typeof document !== 'undefined' &&
      document.activeElement === magicMonthlyPIRef.current
    );
  }

  // Original: every `input` on a magic field re-ran calculateMagic —
  // calculateMagic(false) for the core fields, calculateMagic(true) for
  // the rest. The term select is dead UI (no listener in the original).
  function handleMagicInput(key, value) {
    stopDemo(); // Step 12: user typing stops the demo (its own writes
    // bypass this handler, so this can never trip on demo activity).
    const next = { ...magicInputs, [key]: value };
    const isCore = CORE_MAGIC_KEYS.has(key);
    const { inputs: filled, filledPI } = applyPIAutoFill(next, {
      force: isCore,
      isFocused: piIsFocused(),
    });
    setMagicInputs(filled);
    setPiIsManual(!isCore && !filledPI && parseNumeric(filled.magicMonthlyPI) > 0);
  }

  // Original `magicCalcBtn` click: calculateMagic() → isPIOverride=false
  // → contractual P&I re-derived and the field rewritten (unless focused).
  function handleCalculate() {
    stopDemo(); // Step 12: user interaction stops the demo
    const { inputs: filled } = applyPIAutoFill(magicInputs, {
      force: true,
      isFocused: piIsFocused(),
    });
    if (filled !== magicInputs) setMagicInputs(filled);
    setPiIsManual(false);
  }

  // Original extraMonthlyBtn / extraOneTimeBtn: set extraMode, then
  // calculateMagic() (isPIOverride=false) with the new mode in effect.
  function selectExtraMode(mode) {
    stopDemo(); // Step 12: user interaction stops the demo
    if (mode === extraMode) return;
    setExtraMode(mode);
    const { inputs: filled } = applyPIAutoFill(magicInputs, {
      force: true,
      isFocused: piIsFocused(),
    });
    if (filled !== magicInputs) setMagicInputs(filled);
    setPiIsManual(false);
  }

  // Original blur listeners on the seven currency fields: reformat with
  // thousands separators (en-US) without recalculating.
  function handleMagicBlur(key, rawValue) {
    const val = parseNumeric(rawValue);
    if (val > 0) {
      setMagicInputs((prev) => ({ ...prev, [key]: val.toLocaleString('en-US') }));
    }
  }

  // One-way Calculator → Magic sync. Re-run on EVERY switch to this tab
  // (the original navExtra handler had no latch; the "only once" effect
  // came from the "magic price must be empty" gate, so a manually
  // cleared magic price re-syncs on the next switch — preserved).
  //
  // Step 12: the original navExtra handler ended with
  //   if (parseInput(magicPrice.value) <= 0) runMagicDemo();
  // — i.e. AFTER the sync check, whenever the magic price was (still)
  // empty. That is exactly "the main tab has no price to sync", so the
  // demo runs on first-visit style switches and never over a synced
  // (or user-filled) price.
  useEffect(() => {
    if (seedNonce <= 0) return;
    let next = magicInputs;
    const mainPrice = parseNumeric(mainInputs.price);
    if (mainPrice > 0 && parseNumeric(magicInputs.magicPrice) <= 0) {
      // Original: magicBalance.value = principal.toLocaleString('en-US')
      // unconditionally (it can be non-positive when down ≥ price); the
      // validation gate below then rejects the form.
      const principal = mainPrice - parseNumeric(mainInputs.downPayment);
      next = {
        ...magicInputs,
        magicPrice: mainInputs.price,
        magicDownPayment: mainInputs.downPayment,
        magicBalance: principal.toLocaleString('en-US'),
        magicRate: mainInputs.rate,
        magicTermText: String(mainInputs.term || ''),
        magicTax: mainInputs.tax,
        magicInsurance: mainInputs.insurance,
      };
      // Original: calculateMagic() → isPIOverride=false.
      const { inputs: filled } = applyPIAutoFill(next, {
        force: true,
        isFocused: piIsFocused(),
      });
      next = filled;
      setMagicInputs(filled);
      setPiIsManual(false);
    }
    // Step 12: the original's demo check, on the post-sync state.
    if (parseNumeric(next.magicPrice) <= 0) {
      startDemo(next);
    }
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
                onChange={(e) => handleMagicInput('magicTermText', e.target.value)}
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
                onChange={(e) => handleMagicInput('magicMonthlyPI', e.target.value)}
                onBlur={(e) => handleMagicBlur('magicMonthlyPI', e.target.value)}
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
              onChange={(e) => handleMagicInput('magicBalance', e.target.value)}
              onBlur={(e) => handleMagicBlur('magicBalance', e.target.value)}
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
                onChange={(e) => handleMagicInput('magicPrice', e.target.value)}
                onBlur={(e) => handleMagicBlur('magicPrice', e.target.value)}
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
                onChange={(e) => handleMagicInput('magicDownPayment', e.target.value)}
                onBlur={(e) => handleMagicBlur('magicDownPayment', e.target.value)}
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
                onChange={(e) => handleMagicInput('magicRate', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="input-group">
            <label htmlFor="magicTermSelect">Loan Term (Years)</label>
            <div className="input-wrapper">
              <i className="fas fa-calendar-alt"></i>
              {/* Dead control, exactly as in the original: the duplicated
                  id="magicTerm" meant getElementById always returned the
                  text input above, and the select had no listeners. It is
                  intentionally uncontrolled and never read (F4). */}
              <select
                id="magicTermSelect"
                defaultValue="30"
                aria-label="Loan Term in Years"
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
                onChange={(e) => handleMagicInput('magicTax', e.target.value)}
                onBlur={(e) => handleMagicBlur('magicTax', e.target.value)}
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
                onChange={(e) => handleMagicInput('magicInsurance', e.target.value)}
                onBlur={(e) => handleMagicBlur('magicInsurance', e.target.value)}
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
                onChange={(e) => handleMagicInput('extraAmount', e.target.value)}
                onBlur={(e) => handleMagicBlur('extraAmount', e.target.value)}
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
          style={result.errorMsg ? { display: 'block' } : { display: 'none' }}
        >
          {result.errorMsg}
        </div>
        {/* F7 (approved): explicit non-payoff warning for non-amortizing
            payments and the 600-month simulation limit. Reuses the
            .error-msg layout with an amber (non-error) palette. */}
        <div
          className="error-msg"
          role="status"
          style={
            result.limitWarning
              ? { display: 'block', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }
              : { display: 'none' }
          }
        >
          {result.limitWarning}
        </div>
      </article>

      {/* Step 12: the original's demo "soft glow" — results.style.transition =
          "all 0.5s ease"; scale(1.02) → scale(1) 500 ms later. State-driven
          inline style (same properties the original set inline). */}
      <aside
        className="results-card"
        style={
          demoGlow === 0
            ? undefined
            : {
                transition: 'all 0.5s ease',
                transform: demoGlow === 1 ? 'scale(1.02)' : 'scale(1)',
              }
        }
      >
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
