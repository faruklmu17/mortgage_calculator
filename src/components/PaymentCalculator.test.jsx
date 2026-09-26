// @vitest-environment jsdom
/**
 * Step 12 — Vitest coverage for the price-input placeholder typewriter
 * (the script.js#initTypewriter port in PaymentCalculator.jsx).
 *
 * Pins:
 *   - the original timing table: 100 ms/char typing with a trailing "|"
 *     cursor, 3000 ms hold at the full message, 50 ms/char deletion
 *     (no cursor), 500 ms pause, repeat;
 *   - the stop/resume semantics: a non-empty value or field focus holds
 *     the full text (re-checked every second) and the animation RESUMES
 *     from where it left off once the field is empty and unfocused
 *     again — it does not restart from the beginning (original behavior);
 *   - Step 12 (prefers-reduced-motion): static full text, no timers, and
 *     the animation follows the setting changing at runtime;
 *   - timer cleanup on unmount and StrictMode-safety (one live chain).
 *
 * `submitted` is never set in these tests, so no calculation happens and
 * PaymentChart renders nothing (no chart.js canvas involved).
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import PaymentCalculator from './PaymentCalculator.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const FULL_TEXT = 'Enter your home price here...'; // 29 chars

// jsdom has no matchMedia; the component only uses it for
// prefers-reduced-motion.
let reduceMotion = false;
const reduceMotionListeners = new Set();
function setReduceMotion(value) {
  reduceMotion = value;
  reduceMotionListeners.forEach((cb) => cb());
}

beforeAll(() => {
  // `matches` must be a LIVE getter (as on a real MediaQueryList): the
  // component's 'change' listener re-reads mq.matches when the setting
  // flips.
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
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  // Safety net: a test that failed before calling view.unmount() would
  // otherwise leave its #price input in the shared jsdom document, and
  // the next test's getElementById would read that stale element.
  document.body.innerHTML = '';
});

const INITIAL_INPUTS = {
  price: '',
  downPayment: '',
  rate: '',
  term: '30',
  tax: '',
  insurance: '',
  hoa: '',
};

function renderCalculator(initial = INITIAL_INPUTS, { strict = false } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let inputs = initial;
  const ref = { current: null };
  const renderWith = () => {
    let tree = h(PaymentCalculator, {
      inputs,
      onInputChange: (key, value) => {
        inputs = { ...inputs, [key]: value };
        renderWith();
      },
      priceInputRef: ref,
    });
    if (strict) tree = h(StrictMode, null, tree);
    act(() => {
      root.render(tree);
    });
  };
  renderWith();
  return {
    container,
    priceInput: () => document.getElementById('price'),
    placeholder: () => document.getElementById('price').placeholder,
    setPrice(value) {
      inputs = { ...inputs, price: value };
      renderWith();
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('price-input placeholder typewriter (Step 12)', () => {
  it('types the text 100 ms/char with a trailing cursor, holds, deletes, and restarts', () => {
    const view = renderCalculator();
    // First tick is synchronous during mount.
    expect(view.placeholder()).toBe('|');

    act(() => vi.advanceTimersByTime(100));
    expect(view.placeholder()).toBe('E|');
    act(() => vi.advanceTimersByTime(200));
    expect(view.placeholder()).toBe('Ent|');

    // Full message + cursor after 100 ms per character.
    act(() => vi.advanceTimersByTime(FULL_TEXT.length * 100 - 300));
    expect(view.placeholder()).toBe(FULL_TEXT + '|');

    // 3000 ms hold, then deletion starts (the original shows the full
    // text without the cursor for the first two 50 ms ticks — a quirk
    // of its substring/charIndex formula, reproduced here).
    act(() => vi.advanceTimersByTime(3000));
    expect(view.placeholder()).toBe(FULL_TEXT);
    act(() => vi.advanceTimersByTime(50));
    expect(view.placeholder()).toBe(FULL_TEXT);
    act(() => vi.advanceTimersByTime(50));
    expect(view.placeholder()).toBe(FULL_TEXT.slice(0, -1));

    // Deletion runs 50 ms/char down to the empty string (28 more ticks
    // from the 28-char state).
    act(() => vi.advanceTimersByTime((FULL_TEXT.length - 1) * 50));
    expect(view.placeholder()).toBe('');

    // 500 ms pause, then the cycle restarts from the cursor.
    act(() => vi.advanceTimersByTime(500));
    expect(view.placeholder()).toBe('|');
    view.unmount();
  });

  it('stops (full text held, 1 s re-check) while the field has a value, and resumes where it left off', () => {
    const view = renderCalculator();
    act(() => vi.advanceTimersByTime(300)); // "Ent|" — charIndex now 4
    expect(view.placeholder()).toBe('Ent|');

    // User types a value → stop branch on the next tick.
    view.setPrice('100,000');
    act(() => vi.advanceTimersByTime(100));
    expect(view.placeholder()).toBe(FULL_TEXT);
    // The stopped chain keeps re-checking every second, still holding.
    act(() => vi.advanceTimersByTime(2000));
    expect(view.placeholder()).toBe(FULL_TEXT);

    // User clears the field → resumes from "Ent|" (charIndex 4), not
    // from the beginning.
    view.setPrice('');
    act(() => vi.advanceTimersByTime(1000));
    expect(view.placeholder()).toBe('Ente|');
    act(() => vi.advanceTimersByTime(100));
    expect(view.placeholder()).toBe('Enter|');
    view.unmount();
  });

  it('stops on focus and resumes on blur', () => {
    const view = renderCalculator();
    act(() => vi.advanceTimersByTime(200)); // "En|"
    const input = view.priceInput();

    act(() => {
      input.dispatchEvent(new window.Event('focusin', { bubbles: true }));
    });
    act(() => vi.advanceTimersByTime(100));
    expect(view.placeholder()).toBe(FULL_TEXT);
    act(() => vi.advanceTimersByTime(1000));
    expect(view.placeholder()).toBe(FULL_TEXT);

    act(() => {
      input.dispatchEvent(new window.Event('focusout', { bubbles: true }));
    });
    act(() => vi.advanceTimersByTime(1000));
    // Resumed from charIndex 3 (where the focus stopped it).
    expect(view.placeholder()).toBe('Ent|');
    view.unmount();
  });

  it('shows the static full text under prefers-reduced-motion, with no timers', () => {
    setReduceMotion(true);
    const view = renderCalculator();
    expect(view.placeholder()).toBe(FULL_TEXT);
    act(() => vi.advanceTimersByTime(60000));
    expect(view.placeholder()).toBe(FULL_TEXT);
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });

  it('follows the reduced-motion setting changing at runtime', () => {
    const view = renderCalculator();
    act(() => vi.advanceTimersByTime(100)); // "E|"
    expect(view.placeholder()).toBe('E|');

    act(() => setReduceMotion(true));
    expect(view.placeholder()).toBe(FULL_TEXT);
    act(() => vi.advanceTimersByTime(60000));
    expect(view.placeholder()).toBe(FULL_TEXT);

    act(() => setReduceMotion(false));
    // The effect re-runs: a fresh chain starts from the cursor.
    expect(view.placeholder()).toBe('|');
    act(() => vi.advanceTimersByTime(100));
    expect(view.placeholder()).toBe('E|');
    view.unmount();
  });

  it('cleans up its pending timer on unmount', () => {
    const view = renderCalculator();
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(60000)); // nothing may fire
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is StrictMode-safe: double-invoked mount effects leave one live chain', () => {
    const view = renderCalculator(INITIAL_INPUTS, { strict: true });
    // Mount effect ran setup → cleanup → setup: the first chain's timer
    // was cleared; exactly one pending tick remains.
    expect(vi.getTimerCount()).toBe(1);
    expect(view.placeholder()).toBe('|');
    act(() => vi.advanceTimersByTime(100));
    expect(view.placeholder()).toBe('E|');
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
