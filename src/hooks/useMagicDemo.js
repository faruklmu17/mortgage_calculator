// Step 12: the Extra Payment Magic "intro demo" — a faithful port of
// `script.js#runMagicDemo` into React state updates.
//
// Preserved from the original:
//   - the sessionStorage gate `mpl_magic_demo_v4` (same key, same
//     once-per-session behavior; set when the demo finishes, as before),
//   - the exact six demo values and their order:
//       price 600,000 → balance 450,000 → down 120,000 → rate 6.5 →
//       term 30 → extra 500,
//   - the typing cadence: 40ms per character, 200ms between fields, and a
//     recalculation every 3rd character and at each field's completion
//     (including the empty first tick, exactly like the original's
//     `calculateMagic()` calls),
//   - the finish sequence: set the flag, glow the results card (scale
//     1.02 for 500ms, ease back), then after 2s clear the six demo fields
//     WITHOUT recalculating — the results stay on screen until the user
//     types their own values, exactly as the original did.
//
// Step 12 additions (plan requirements the original did not have):
//   - The demo is aborted when the user starts interacting: typing in any
//     magic field, toggling Monthly/One-time, clicking Calculate Savings,
//     switching tabs, or clicking the magic nav link again. Aborting
//     restores the partially typed fields to their pre-demo state
//     (empty) EXCEPT fields the user has themselves edited.
//   - The demo never starts over values the user has entered: it only
//     runs when all six demo fields are blank (the original only checked
//     the price and would wipe the other five).
//   - `prefers-reduced-motion: reduce` → the demo is skipped entirely
//     (no typing animation); the session flag is deliberately NOT set, so
//     a user who later enables motion can still see it.
//   - Every timer is tracked and cleared: on abort, on tab switch away,
//     on a new nav-Extra click, and on unmount (StrictMode-safe).
//
// Note on the P&I field: like the original, the demo's recalculations run
// with `isPIOverride = false`, so the calculated (rounded) P&I is written
// into `magicMonthlyPI` while the demo plays — the original demo did the
// same via its focus-guarded auto-fill.

import { useEffect, useRef, useState } from 'react';

/** Same sessionStorage key the original used ("Renamed to force reset"). */
export const MAGIC_DEMO_KEY = 'mpl_magic_demo_v4';

/** The six demo fields, in the original's typing order. */
export const MAGIC_DEMO_SEQUENCE = Object.freeze([
  { key: 'magicPrice', val: '600,000' },
  { key: 'magicBalance', val: '450,000' },
  { key: 'magicDownPayment', val: '120,000' },
  { key: 'magicRate', val: '6.5' },
  { key: 'magicTermText', val: '30' },
  { key: 'extraAmount', val: '500' },
]);
const MAGIC_DEMO_FIELDS = MAGIC_DEMO_SEQUENCE.map((d) => d.key);

const CHAR_MS = 40;
const FIELD_GAP_MS = 200;
const GLOW_MS = 500;
const GLOW_HOLD_MS = 2000;

/**
 * @param {object} deps
 * @param {(updater: (prev) => object) => void} deps.setDraft
 *   The magicInputs state setter (functional updates only).
 * @param {(snapshot: object, isPIOverride: boolean) => void} deps.commit
 *   Commits a recalculation snapshot (maps to setSubmitted).
 * @param {boolean} deps.active  Whether the magic tab is currently visible.
 */
export function useMagicDemo({ setDraft, commit, active }) {
  const timersRef = useRef([]);
  const runningRef = useRef(false);
  const touchedRef = useRef(new Set());
  const userEditsRef = useRef(new Set());
  const [demoGlow, setDemoGlow] = useState(false);

  function schedule(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  /**
   * Abort the demo (no-op when nothing is running). Restores the partially
   * typed fields the user did not edit themselves; turns the glow off.
   */
  function stopDemo() {
    clearTimers();
    runningRef.current = false;
    setDemoGlow(false);
    const toClear = [...touchedRef.current].filter(
      (k) => !userEditsRef.current.has(k)
    );
    if (toClear.length > 0) {
      setDraft((prev) => {
        const next = { ...prev };
        toClear.forEach((k) => {
          next[k] = '';
        });
        return next;
      });
    }
    touchedRef.current = new Set();
    userEditsRef.current = new Set();
  }

  function finishDemo() {
    runningRef.current = false;
    try {
      window.sessionStorage.setItem(MAGIC_DEMO_KEY, '1');
    } catch {
      /* storage unavailable — demo simply replays next session */
    }
    setDemoGlow(true);
    schedule(() => setDemoGlow(false), GLOW_MS);
    // Keep the results on screen for a moment, then clear only the demo
    // fields without recalculating (original behavior).
    schedule(
      () => {
        setDraft((prev) => {
          const next = { ...prev };
          MAGIC_DEMO_FIELDS.forEach((k) => {
            next[k] = '';
          });
          return next;
        });
      },
      GLOW_MS + GLOW_HOLD_MS
    );
  }

  function typeField(fields, index, charIdx) {
    if (index >= MAGIC_DEMO_SEQUENCE.length) {
      finishDemo();
      return;
    }

    const { key, val } = MAGIC_DEMO_SEQUENCE[index];
    if (charIdx <= val.length) {
      const nextValue = val.substring(0, charIdx);
      const next = { ...fields, [key]: nextValue };
      touchedRef.current.add(key);
      setDraft((prev) => ({ ...prev, [key]: nextValue }));
      // The original recalculated on the empty first tick too
      // (`charIdx % 3 === 0`), and every 3rd character / at completion.
      if (charIdx === val.length || charIdx % 3 === 0) {
        commit(next, false);
      }
      schedule(() => typeField(next, index, charIdx + 1), CHAR_MS);
    } else {
      schedule(() => typeField(fields, index + 1, 0), FIELD_GAP_MS);
    }
  }

  /**
   * Start the demo only when it is eligible: never seen this session,
   * motion is allowed, and none of the six demo fields holds a value the
   * user entered.
   */
  function startIfEligible(fields) {
    if (runningRef.current) return;
    try {
      if (window.sessionStorage.getItem(MAGIC_DEMO_KEY) === '1') return;
    } catch {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (MAGIC_DEMO_FIELDS.some((k) => String(fields[k] ?? '').trim() !== '')) {
      return;
    }
    runningRef.current = true;
    touchedRef.current = new Set();
    userEditsRef.current = new Set();
    typeField(fields, 0, 0);
  }

  // Call before applying a user-initiated field change: the field is
  // recorded as user-edited so the abort keeps the user's text.
  function noteUserEdit(key) {
    if (runningRef.current) {
      userEditsRef.current.add(key);
      stopDemo();
    }
  }

  // Any other user interaction (mode toggle, Calculate, nav re-click,
  // tab switch away) aborts the demo outright. stopDemo is idempotent,
  // so this is safe to call unconditionally.
  function stopOnInteraction() {
    stopDemo();
  }

  useEffect(() => {
    if (!active) stopDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Unmount (and StrictMode's simulated remount): drop every timer.
  useEffect(
    () => () => {
      clearTimers();
      runningRef.current = false;
    },
    []
  );

  return { startIfEligible, stopOnInteraction, noteUserEdit, demoGlow };
}
