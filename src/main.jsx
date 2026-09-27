// React entry for the interactive calculator area (a single React root).
//
// The rest of the page (header, footer, FAQ, educational sections, metadata,
// JSON-LD) remains static HTML in index.html and is intentionally NOT part of
// this root.
//
// The calculator region is mounted into <div id="calculator-root">, which
// replaced the two former <main> calculator blocks of the original vanilla
// implementation (script.js, removed in Step 16 after parity was confirmed).
// No legacy script is loaded here — React owns these DOM nodes.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CalculatorApp from './App.jsx';
import { initNavBridge } from './navBridge.js';

// The header (static HTML) drives the React tabs and the "Get Started"
// affordance. initNavBridge attaches listeners to those static header nodes
// and forwards them to the React app as CustomEvents, so no React-managed
// element is touched by legacy imperative code.
initNavBridge();

createRoot(document.getElementById('calculator-root')).render(
  <StrictMode>
    <CalculatorApp />
  </StrictMode>
);
