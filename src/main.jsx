// Step 8: React entry for the interactive calculator area (a single React root).
//
// The rest of the page (header, footer, FAQ, educational sections, metadata,
// JSON-LD) remains static HTML in index.html and is intentionally NOT part of
// this root (per Step 8: "Keep the header, footer, FAQ, educational sections,
// metadata, and JSON-LD outside that root initially").
//
// The calculator region is mounted into <div id="calculator-root">, which
// replaces the two former <main> calculator blocks. The legacy script.js is
// deliberately NOT loaded here: it owned these same DOM nodes and would create
// duplicate handlers. The file itself is kept in the repo for the Step 14
// parity checks (Step 16 removes it).
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
