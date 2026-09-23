// Step 8: static-header → React bridge.
//
// The header and "Get Started" button live outside the React root (static
// HTML). They need to drive React-owned state (active tab) and focus (first
// price input). Rather than let legacy imperative code reach into React nodes,
// these buttons simply dispatch CustomEvents that the React app (CalculatorApp)
// listens for. This keeps a single source of truth (React) with no duplicated
// imperative listeners.

export const EVENTS = {
  SWITCH_TAB: 'mpl:switch-tab',
  FOCUS_MAIN: 'mpl:focus-main',
};

export function initNavBridge() {
  function attach() {
    // Run against the already-present document. main.jsx runs as a module at
    // the end of <body>, so header nodes exist, but we still guard for safety.
    const navCalc = document.getElementById('navCalc');
    const navExtra = document.getElementById('navExtra');
    const getStarted = document.getElementById('getStartedBtn');

    navCalc?.addEventListener('click', (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent(EVENTS.SWITCH_TAB, { detail: { tab: 'calculator' } })
      );
    });

    navExtra?.addEventListener('click', (e) => {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent(EVENTS.SWITCH_TAB, { detail: { tab: 'magic' } })
      );
    });

    // "Get Started" focuses/follows the main price field (behavior preserved
    // from the original getStartedBtn handler).
    getStarted?.addEventListener('click', (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent(EVENTS.FOCUS_MAIN));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
}
