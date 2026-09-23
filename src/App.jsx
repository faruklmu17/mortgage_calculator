// Step 8 — React root for the interactive calculator area.
//
// Owns the two things both tabs need:
//   • activeTab  — which calculator tab is displayed
//   • mainInputs — shared loan inputs (price, down, rate, term, tax, insurance, HOA)
//
// Extra-payment-only state (magic*, extra-mode, magic result/error) stays in
// ExtraPaymentCalculator.  Main-tab-only state (downPaymentMode, main
// result/error) stays in PaymentCalculator.
//
// The static header (outside the React root) dispatches CustomEvents through
// navBridge.js; this component listens and only touches non-React DOM
// (guide sections + nav .active class).

import { useEffect, useRef, useState } from 'react';
import PaymentCalculator from './components/PaymentCalculator.jsx';
import ExtraPaymentCalculator from './components/ExtraPaymentCalculator.jsx';
import { EVENTS } from './navBridge.js';

const INITIAL_MAIN_INPUTS = {
  price: '',
  downPayment: '',
  rate: '',
  term: '30',
  tax: '',
  insurance: '',
  hoa: '',
};

export default function CalculatorApp() {
  const [activeTab, setActiveTab] = useState('calculator');
  const [seedNonce, setSeedNonce] = useState(0);
  const [mainInputs, setMainInputs] = useState(INITIAL_MAIN_INPUTS);
  const priceInputRef = useRef(null);

  function handleMainInputChange(key, value) {
    setMainInputs((prev) => ({ ...prev, [key]: value }));
  }

  function handleFocusMain() {
    if (activeTab !== 'calculator') setActiveTab('calculator');
    const el = priceInputRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }
  }

  function handleSwitchTab(tab) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (tab === 'magic') setSeedNonce((n) => n + 1);
  }

  useEffect(() => {
    const onSwitch = (e) => handleSwitchTab(e.detail && e.detail.tab);
    const onFocus = () => handleFocusMain();
    window.addEventListener(EVENTS.SWITCH_TAB, onSwitch);
    window.addEventListener(EVENTS.FOCUS_MAIN, onFocus);
    return () => {
      window.removeEventListener(EVENTS.SWITCH_TAB, onSwitch);
      window.removeEventListener(EVENTS.FOCUS_MAIN, onFocus);
    };
  }, [activeTab]);

  useEffect(() => {
    const navCalc = document.getElementById('navCalc');
    const navExtra = document.getElementById('navExtra');
    const guide = document.getElementById('guide');
    const magicGuide = document.getElementById('extra-magic-guide');
    const isCalc = activeTab === 'calculator';
    if (navCalc) navCalc.classList.toggle('active', isCalc);
    if (navExtra) navExtra.classList.toggle('active', !isCalc);
    if (guide) guide.style.display = isCalc ? 'block' : 'none';
    if (magicGuide) magicGuide.style.display = isCalc ? 'none' : 'block';
  }, [activeTab]);

  return (
    <>
      <main
        id="calculator"
        className="calculator-wrapper"
        style={{ display: activeTab === 'calculator' ? 'grid' : 'none' }}
      >
        <PaymentCalculator
          inputs={mainInputs}
          onInputChange={handleMainInputChange}
          priceInputRef={priceInputRef}
        />
      </main>

      <main
        id="extra-magic-section"
        className="calculator-wrapper"
        style={{
          display: activeTab === 'magic' ? 'grid' : 'none',
          marginTop: activeTab === 'magic' ? 0 : undefined,
        }}
      >
        <ExtraPaymentCalculator mainInputs={mainInputs} seedNonce={seedNonce} />
      </main>
    </>
  );
}
