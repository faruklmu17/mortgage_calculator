// Step 11: the payment donut, drawn with the first-party chart.js package
// via react-chartjs-2 (replaces the Chart.js CDN global + the manual
// create/destroy effect from Steps 8-10).
//
// Preserved from the original `script.js#updateChart`:
//   - type doughnut, cutout 70%
//   - labels ['P&I', 'Taxes', 'Insurance', 'HOA'] in that order
//   - dataset borderWidth 0, hoverOffset 4
//   - legend: bottom, point-style markers, #94a3b8, 12px, padding 20
//   - tooltip: "<label>: $X" (formatCurrency, 0 decimals)
//   - responsive + maintainAspectRatio: false (fills .chart-container)
//   - Segment colors: the original relied on Chart.js' default palette,
//     which its full CDN build applied via the auto-registered `colors`
//     plugin. The tree-shaken imports here do not register that plugin,
//     so the same palette is stated explicitly on the dataset (see the
//     backgroundColor comment) to reproduce the original appearance.
//
// react-chartjs-2 owns the chart lifecycle (creates on mount, updates in
// place on data change, destroys on unmount), which satisfies AGENTS.md
// "Clean up timers and chart resources" with no manual destroy calls.
//
// All-zero / no-calculation handling: the parent renders this component
// only after a successful calculation, so the all-zero doughnut case
// (which cannot occur on a valid loan — principal > 0 always yields
// P&I > 0) never paints; the canvas stays clean before the first
// calculation and after a validation error, exactly as the manual
// effect did.

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatCurrency } from '../lib/formatting.js';

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController);

const CHART_OPTIONS = Object.freeze({
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
        label: (context) => context.label + ': ' + formatCurrency(context.raw),
      },
    },
  },
  responsive: true,
  maintainAspectRatio: false,
});

/**
 * @param {object} props
 * @param {number} props.pi  Monthly principal & interest.
 * @param {number} props.tax  Monthly property tax.
 * @param {number} props.insurance  Monthly insurance.
 * @param {number} props.hoa  Monthly HOA.
 */
export default function PaymentChart({ pi, tax, insurance, hoa }) {
  const data = {
    labels: ['P&I', 'Taxes', 'Insurance', 'HOA'],
    datasets: [
      {
        data: [pi, tax, insurance, hoa],
        borderWidth: 0,
        hoverOffset: 4,
        // Explicit segment colors: the original loaded the full Chart.js
        // CDN build, whose auto-registered `colors` plugin painted the
        // default palette. The tree-shaken imports used here do NOT
        // register that plugin, so without these the arcs fall back to
        // the global default fill (rgba(0,0,0,0.1)) — invisible on this
        // dark theme. These are the first four entries of Chart.js v4's
        // default palette, i.e. exactly what the original build painted.
        backgroundColor: ['#36a2eb', '#ff6384', '#ff9f40', '#ffcd56'],
      },
    ],
  };

  return <Doughnut id="paymentChart" data={data} options={CHART_OPTIONS} />;
}
