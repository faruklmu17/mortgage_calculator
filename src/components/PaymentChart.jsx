// Step 11: payment donut chart, migrated from the original
// script.js#updateChart (Chart.js loaded via CDN global) to the bundled
// `chart.js` + `react-chartjs-2` packages.
//
// Segment colors: the original chart specified NO colors on its dataset;
// Chart.js's built-in "colors" plugin (auto-registered when using the
// full CDN build) colorized a colorless doughnut dataset arc-by-arc with
// its default palette — for the first four segments: rgb(54, 162, 235),
// rgb(255, 99, 132), rgb(255, 159, 64), rgb(255, 205, 86). The
// tree-shaken `chart.js` import used here does NOT auto-register that
// plugin, so the same four colors are set explicitly on the dataset —
// the rendered chart is pixel-identical to the CDN version.
//
// Categories, cutout, legend (bottom, point-style, #94a3b8), the currency
// tooltip callback, borderWidth 0, hoverOffset 4, and responsiveness are
// all carried over unchanged from script.js#updateChart.
//
// Lifecycle: react-chartjs-2 creates one Chart.js instance per canvas on
// mount, calls chart.update() in place when the data props change, and
// destroys the instance on unmount — so there is never more than one
// live instance per canvas (AGENTS.md: "Clean up timers and chart
// resources"). The component is wrapped in memo() so unrelated
// re-renders (e.g. typing in a draft field) don't rebuild the data
// objects or trigger a chart update at all — matching the original
// updateChart() cadence, which only ran on an actual recalculation.

import { memo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatCurrency } from '../lib/formatting.js';

// Required Chart.js components for a doughnut chart with legend + tooltip.
ChartJS.register(ArcElement, Tooltip, Legend);

const LABELS = ['P&I', 'Taxes', 'Insurance', 'HOA'];

// The first four entries of Chart.js's default colors-plugin palette
// (see the file header) — the colors the CDN build produced for this
// colorless dataset.
const SEGMENT_COLORS = [
  'rgb(54, 162, 235)', // P&I
  'rgb(255, 99, 132)', // Taxes
  'rgb(255, 159, 64)', // Insurance
  'rgb(255, 205, 86)', // HOA
];

/**
 * The payment-breakdown donut.
 *
 * @param {boolean} hasCalc  True after a successful calculation.
 * @param {number} pi        Monthly principal & interest (raw, unformatted).
 * @param {number} tax       Monthly property tax (raw, unformatted).
 * @param {number} insurance Monthly homeowners insurance (raw, unformatted).
 * @param {number} hoa       Monthly HOA fee (raw, unformatted).
 */
function PaymentChart({ hasCalc, pi, tax, insurance, hoa }) {
  // No successful calculation yet, or an all-zero breakdown: render
  // nothing. A doughnut with four zero arcs would be a degenerate empty
  // ring, so the canvas is simply absent (the chart-container keeps its
  // min-height, exactly as the original blank canvas did).
  if (!hasCalc || pi + tax + insurance + hoa <= 0) {
    return null;
  }

  return (
    <Doughnut
      id="paymentChart"
      aria-label="Payment breakdown: P&I, taxes, insurance, and HOA"
      data={{
        labels: LABELS,
        datasets: [
          {
            data: [pi, tax, insurance, hoa],
            backgroundColor: SEGMENT_COLORS,
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      }}
      options={{
        cutout: '70%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              usePointStyle: true,
              padding: 20,
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                context.label + ': ' + formatCurrency(context.raw),
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      }}
    />
  );
}

export default memo(PaymentChart);
