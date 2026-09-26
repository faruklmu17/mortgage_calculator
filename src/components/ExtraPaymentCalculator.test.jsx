// @vitest-environment jsdom
/**
 * Step 12 — Vitest coverage for the Extra Payment Magic demo
 * (the script.js#runMagicDemo port in ExtraPaymentCalculator.jsx).
 *
 * The original demo's timeline (reproduced exactly): each field is typed
 * one character per 40 ms tick (the first tick writes the empty string),
 * with a 200 ms pause between fields. For the six demo values
 * ("600,000", "450,000", "120,000", "6.5", "30", "500") that is 2600 ms
 * total; the session key `mpl_magic_demo_v4` is set at completion (t =
 * 2600), the results-card glow (scale 1.02) starts then, and settles back
 * to scale(1) at t = 3100.
 *
 * Pins:
 *   - first-visit demo: typing cadence, final values, P&I auto-fill only
 *     once the form is valid (rate + term typed — the original validated
 *     before touching the P&I field), session key at completion, glow;
 *   - session behavior: no re-run once the key is set (reload-in-session
 *     semantics);
 *   - sync precedence: a main-tab price syncs into the tab instead of
 *     demoing (the original's navExtra order);
 *   - Step 12 "stop when the user begins interacting": typing and the
 *     Calculate button cancel the pending chain;
 *   - Step 12 "do not overwrite values the user has entered": a
 *     user-filled demo field is skipped, not cleared/retyped;
 *   - prefers-reduced-motion: values appear all at once, no glow, key
 *     set immediately;
 *   - unmount cancels the pending timer (AGENTS.md: "Clean up timers");
 *   - StrictMode: one live demo chain per nav click;
 *   - tab switch mid-demo (through CalculatorApp): the demo keeps
 *     running in the background (both tabs stay mounted, as in the
 *     original), and re-entering the tab does NOT start a second demo.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import ExtraPaymentCalculator from './ExtraPaymentCalculator.jsx';
import CalculatorApp from '../App.jsx';
import { EVENTS } from '../navBridge.js';
import { calculateMortgage } from '../lib/mortgage.js';
import { deriveExtraPaymentResult } from '../lib/extraPayment.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const DEMO_KEY = 'mpl_magic_demo_v4';

// The demo loan: 600,000 − 120,000 = 480,000 principal at 6.5% / 30 y.
const EXPECTED_PI = Math.round(
  calculateMortgage({
    price: 600000,
    downPayment: 120000,
    annualRatePercent: 6.5,
    termYears: 30,
  }).monthlyPI
).toLocaleString();

const EXPECTED_FINAL_INPUTS = {
  magicPrice: '600,000',
  magicDownPayment: '120,000',
  magicBalance: '450,000',
  magicRate: '6.5',
  magicTermText: '30',
  magicTax: '',
  magicInsurance: '',
  magicMonthlyPI: EXPECTED_PI,
  extraAmount: '500',
};

// jsdom has no matchMedia; the demo only uses it for
// prefers-reduced-motion.
let reduceMotion = false;
const reduceMotionListeners = new Set();
function setReduceMotion(value) {
  reduceMotion = value;
  reduceMotionListeners.forEach((cb) => cb());
}

beforeAll(() => {
  // `matches` must be a LIVE getter (as on a real MediaQueryList).
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    get matches() {
      return query === '(prefers-reduced-motion: reduce)' ? reduceMotion : false;
    },
    media: query,
    onchange: null,
    addEventListener: (_t, cb) => reduceMotionListeners.add(cb),
    removeEventListener: (_t, cb) => reduceMotionListeners.delete(cb),
    dispatchEvent: vi.fn(),
  }));
});

beforeEach(() => {
  reduceMotion = false;
  reduceMotionListeners.clear();
  sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  // Safety net: a test that failed before calling view.unmount() would
  // otherwise leave its inputs in the shared jsdom document, and the
  // next test's getElementById would read stale elements.
  document.body.innerHTML = '';
});

const INITIAL_MAIN = {
  price: '',
  downPayment: '',
  rate: '',
  term: '30',
  tax: '',
  insurance: '',
  hoa: '',
};

function renderMagic({ main = INITIAL_MAIN, strict = false } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let mainInputs = main;
  let seed = 0;
  const renderWith = () => {
    let tree = h(ExtraPaymentCalculator, { mainInputs, seedNonce: seed });
    if (strict) tree = h(StrictMode, null, tree);
    act(() => {
      root.render(tree);
    });
  };
  renderWith();
  return {
    container,
    nav() {
      // A static-header nav click: App bumps seedNonce (see App.jsx).
      seed += 1;
      renderWith();
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function typeInto(id, value) {
  const el = document.getElementById(id);
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

// Component-level tests render ExtraPaymentCalculator alone (no
// #extra-magic-section wrapper — that lives in App.jsx), so the default
// scope is the document; the App-level test scopes to the magic section
// (the main tab has its own .results-card too).
const resultsCard = (scope = '') =>
  document.querySelector(scope ? `${scope} .results-card` : '.results-card');

describe('Extra Payment Magic demo (Step 12)', () => {
  it('types all six demo values on the original cadence, fills P&I once valid, sets the key, and glows', () => {
    const view = renderMagic();
    expect(sessionStorage.getItem(DEMO_KEY)).toBeNull();

    view.nav(); // first "switch to Magic" — original navExtra handler
    // First tick is synchronous: price is the empty string.
    act(() => vi.advanceTimersByTime(120));
    expect(document.getElementById('magicPrice').value).toBe('600');

    // Rate and term are not typed yet → the form is invalid → the P&I
    // field must still be empty (the original validated before touching
    // it), even though price + balance are already complete.
    act(() => vi.advanceTimersByTime(720)); // t = 840
    expect(document.getElementById('magicPrice').value).toBe('600,000');
    expect(document.getElementById('magicBalance').value).toBe('450,000');
    expect(document.getElementById('magicMonthlyPI').value).toBe('');

    // Complete typing (t = 2600): final values, P&I auto-filled from the
    // ORIGINAL loan, session key set, glow engaged.
    act(() => vi.advanceTimersByTime(1760)); // t = 2600
    expect(document.getElementById('magicPrice').value).toBe('600,000');
    expect(document.getElementById('magicBalance').value).toBe('450,000');
    expect(document.getElementById('magicDownPayment').value).toBe('120,000');
    expect(document.getElementById('magicRate').value).toBe('6.5');
    expect(document.getElementById('magicTermText').value).toBe('30');
    expect(document.getElementById('extraAmount').value).toBe('500');
    expect(document.getElementById('magicMonthlyPI').value).toBe(EXPECTED_PI);
    expect(sessionStorage.getItem(DEMO_KEY)).toBe('1');
    expect(resultsCard().style.transform).toBe('scale(1.02)');
    expect(resultsCard().style.transition).toBe('all 0.5s ease');

    // The demo's result is on screen and matches the pure derivation of
    // the demo's final inputs (F6 resolution: the values remain in the
    // fields, so the result stays consistent with them).
    const expected = deriveExtraPaymentResult(EXPECTED_FINAL_INPUTS, 'monthly', false);
    expect(document.querySelector('.savings-message').textContent).toContain(
      expected.interestSaved
    );

    // Glow settles back 500 ms later; no timers remain.
    act(() => vi.advanceTimersByTime(500)); // t = 3100
    expect(resultsCard().style.transform).toBe('scale(1)');
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });

  it('does not re-run in the same session once the key is set', () => {
    const view = renderMagic();
    view.nav();
    act(() => vi.advanceTimersByTime(3100));
    expect(sessionStorage.getItem(DEMO_KEY)).toBe('1');

    // Simulate the user clearing the form after the demo…
    [
      'magicPrice',
      'magicBalance',
      'magicDownPayment',
      'magicRate',
      'magicTermText',
      'extraAmount',
    ].forEach((id) => typeInto(id, ''));
    // …and switching away and back (a fresh navExtra click).
    view.nav();
    act(() => vi.advanceTimersByTime(10000));

    // No second demo: the fields stay empty, the price was never retyped.
    expect(document.getElementById('magicPrice').value).toBe('');
    expect(document.getElementById('magicBalance').value).toBe('');
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });

  it('lets the Calculator → Magic sync win over the demo (main price present)', () => {
    const view = renderMagic({
      main: {
        price: '400,000',
        downPayment: '80,000',
        rate: '6.5',
        term: '30',
        tax: '5,500',
        insurance: '1,200',
        hoa: '',
      },
    });
    view.nav();
    act(() => vi.advanceTimersByTime(5000));

    // Synced from the main tab, NOT demoed: no demo values, no session
    // key, P&I synced for the 320,000 principal.
    expect(document.getElementById('magicPrice').value).toBe('400,000');
    expect(document.getElementById('magicBalance').value).toBe('320,000');
    expect(document.getElementById('magicMonthlyPI').value).toBe('2,023');
    expect(sessionStorage.getItem(DEMO_KEY)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });

  it('stops when the user begins typing', () => {
    const view = renderMagic();
    view.nav();
    act(() => vi.advanceTimersByTime(120));
    expect(document.getElementById('magicPrice').value).toBe('600');

    // User types their own rate → the demo's pending chain is cancelled.
    typeInto('magicRate', '7.5');

    act(() => vi.advanceTimersByTime(10000));
    expect(document.getElementById('magicRate').value).toBe('7.5');
    // Demo stopped mid-price; it never completed, so no session key.
    expect(document.getElementById('magicPrice').value).toBe('600');
    expect(document.getElementById('magicBalance').value).toBe('');
    expect(sessionStorage.getItem(DEMO_KEY)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });

  it('stops when the user clicks Calculate Savings', () => {
    const view = renderMagic();
    view.nav();
    act(() => vi.advanceTimersByTime(80));
    expect(document.getElementById('magicPrice').value).toBe('60');

    const btn = document.querySelector('.btn-calc');
    act(() => {
      btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });

    act(() => vi.advanceTimersByTime(10000));
    expect(document.getElementById('magicPrice').value).toBe('60');
    expect(sessionStorage.getItem(DEMO_KEY)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });

  it('skips (never clears) a field the user has already filled', () => {
    const view = renderMagic();
    // Before the first switch, the user enters a balance with the price
    // left empty.
    typeInto('magicBalance', '250,000');
    view.nav();

    // The skipped field adds one 200 ms beat to the 2600 ms timeline.
    act(() => vi.advanceTimersByTime(2280));

    expect(document.getElementById('magicBalance').value).toBe('250,000');
    expect(document.getElementById('magicPrice').value).toBe('600,000');
    expect(document.getElementById('magicDownPayment').value).toBe('120,000');
    expect(document.getElementById('magicRate').value).toBe('6.5');
    expect(document.getElementById('magicTermText').value).toBe('30');
    expect(document.getElementById('extraAmount').value).toBe('500');
    expect(sessionStorage.getItem(DEMO_KEY)).toBe('1');
    view.unmount();
  });

  it('appears all at once under prefers-reduced-motion (no typing, no glow)', () => {
    setReduceMotion(true);
    const view = renderMagic();
    typeInto('magicBalance', '250,000');

    view.nav(); // the demo's values appear synchronously

    expect(document.getElementById('magicPrice').value).toBe('600,000');
    expect(document.getElementById('magicBalance').value).toBe('250,000'); // skipped
    expect(document.getElementById('magicDownPayment').value).toBe('120,000');
    expect(document.getElementById('magicRate').value).toBe('6.5');
    expect(document.getElementById('magicTermText').value).toBe('30');
    expect(document.getElementById('extraAmount').value).toBe('500');
    expect(document.getElementById('magicMonthlyPI').value).toBe(EXPECTED_PI);
    expect(sessionStorage.getItem(DEMO_KEY)).toBe('1');
    expect(resultsCard().style.transform).toBe('');
    act(() => vi.advanceTimersByTime(10000)); // nothing may happen
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });

  it('cancels the pending timer on unmount mid-demo', () => {
    const view = renderMagic();
    view.nav();
    act(() => vi.advanceTimersByTime(120));
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(60000)); // nothing may fire
    expect(sessionStorage.getItem(DEMO_KEY)).toBeNull();
  });

  it('is StrictMode-safe: one live demo chain per nav click', () => {
    const view = renderMagic({ strict: true });
    view.nav();
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(120));
    expect(document.getElementById('magicPrice').value).toBe('600');
    act(() => vi.advanceTimersByTime(2480)); // t = 2600
    expect(sessionStorage.getItem(DEMO_KEY)).toBe('1');
    expect(document.getElementById('magicPrice').value).toBe('600,000');
    act(() => vi.advanceTimersByTime(500)); // t = 3100
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });
});

describe('demo across tab switches (through CalculatorApp, Step 12)', () => {
  function renderApp() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    window.scrollTo = vi.fn(); // jsdom has no scrollTo
    act(() => {
      root.render(h(CalculatorApp));
    });
    return {
      switchTab(tab) {
        act(() => {
          window.dispatchEvent(
            new window.CustomEvent(EVENTS.SWITCH_TAB, { detail: { tab } })
          );
        });
      },
      unmount() {
        act(() => root.unmount());
        container.remove();
      },
    };
  }

  it('keeps typing while the user is on the other tab, and a re-entry starts no second demo', () => {
    const app = renderApp();

    app.switchTab('magic'); // demo starts (main tab has no price)
    act(() => vi.advanceTimersByTime(120));
    expect(document.getElementById('magicPrice').value).toBe('600');

    // User goes back to the Calculator tab mid-demo. Both tabs stay
    // mounted (App toggles display), so the demo keeps running — same as
    // the original's page-level timer chain.
    app.switchTab('calculator');
    act(() => vi.advanceTimersByTime(1000)); // t = 1120
    expect(document.getElementById('magicDownPayment').value).toBe('12');

    // Returning to Magic bumps the seed again; the price is already
    // non-empty, so there is no sync and no second demo.
    app.switchTab('magic');
    act(() => vi.advanceTimersByTime(120)); // t = 1240
    expect(document.getElementById('magicPrice').value).toBe('600,000');

    // The single demo completes exactly once.
    act(() => vi.advanceTimersByTime(1360)); // t = 2600
    expect(sessionStorage.getItem(DEMO_KEY)).toBe('1');
    expect(document.getElementById('magicPrice').value).toBe('600,000');
    expect(document.getElementById('magicBalance').value).toBe('450,000');
    expect(document.getElementById('magicMonthlyPI').value).toBe(EXPECTED_PI);
    act(() => vi.advanceTimersByTime(500)); // t = 3100
    expect(resultsCard('#extra-magic-section').style.transform).toBe('scale(1)');
    app.unmount();
  });
});
