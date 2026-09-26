// @vitest-environment jsdom
/**
 * Step 11 — Vitest coverage for the payment donut (`PaymentChart.jsx`).
 *
 * These tests pin the Step 11 checkpoint: "The chart updates without
 * duplicate canvas instances or console errors." They render the real
 * `PaymentChart` component through the real `react-chartjs-2` wrapper and
 * assert on the contract it hands to Chart.js:
 *
 *   - One doughnut instance per canvas, created on the `<canvas
 *     id="paymentChart">` element (the original's element id is preserved).
 *   - The config matches the original script.js#updateChart byte for byte
 *     where the original was explicit (labels, data order, borderWidth 0,
 *     hoverOffset 4, cutout '70%', legend, tooltip callback, responsive,
 *     maintainAspectRatio false), and the four dataset colors are the same
 *     arcs the CDN build's `colors` plugin produced for the original
 *     colorless dataset (verified against the identical chart.js 4.5.1 the
 *     CDN URL served — see MIGRATION_STATUS.md, Step 11).
 *   - Breakdown changes UPDATE the existing instance in place (chart.js
 *     `update()`), they never construct a second instance.
 *   - `memo()` holds: a re-render with unchanged props touches the chart
 *     not at all (the original updateChart() cadence — redraw only on a
 *     real recalculation).
 *   - Before the first calculation (`hasCalc` false) and on an all-zero
 *     breakdown, no canvas and no instance are created at all.
 *   - Unmount destroys the instance; StrictMode's double-invoked effects
 *     leave exactly one LIVE instance (the first is destroyed).
 *
 * The Chart.js class itself is mocked: jsdom has no 2D context, so the
 * tests exercise the component's lifecycle and config, not pixels.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, StrictMode } from 'react';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import PaymentChart from './PaymentChart.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The instances the mocked Chart.js constructor has been asked to create,
// in order. `destroyed` flips when react-chartjs-2 tears one down.
const mockInstances = [];

vi.mock('chart.js', () => {
  class Chart {
    constructor(canvas, config) {
      this.canvas = canvas;
      this.config = config;
      this.destroyed = false;
      this.updateCalls = 0;
      mockInstances.push(this);
    }
    update(mode) {
      this.updateCalls += 1;
      this.lastUpdateMode = mode;
    }
    destroy() {
      this.destroyed = true;
    }
    static register() {}
  }
  // Every named export react-chartjs-2 (Chart, *Controller) and
  // PaymentChart.jsx (ArcElement, Tooltip, Legend) pulls from 'chart.js'.
  return {
    Chart,
    ArcElement: {},
    Tooltip: {},
    Legend: {},
    LineController: {},
    BarController: {},
    RadarController: {},
    DoughnutController: {},
    PolarAreaController: {},
    BubbleController: {},
    PieController: {},
    ScatterController: {},
  };
});

/** The A1/B4 loan's monthly breakdown (BASELINE_CASES.md §A/§B). */
const BREAKDOWN_A = { pi: 2022.6176751774892, tax: 458.3333, insurance: 100, hoa: 0 };
const BREAKDOWN_B = { pi: 1800.5, tax: 500, insurance: 120.75, hoa: 30 };

function renderChart(ui) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    rerender(nextUi) {
      act(() => {
        root.render(nextUi);
      });
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const liveInstances = () => mockInstances.filter((c) => !c.destroyed);

beforeEach(() => {
  mockInstances.length = 0;
});

describe('PaymentChart (Step 11 donut)', () => {
  it('creates one doughnut instance on the #paymentChart canvas with the original config', () => {
    const view = renderChart(h(PaymentChart, { hasCalc: true, ...BREAKDOWN_A }));

    expect(mockInstances).toHaveLength(1);
    const chart = mockInstances[0];

    // The canvas is the original element id, and the instance lives on it.
    const canvas = document.getElementById('paymentChart');
    expect(canvas).not.toBeNull();
    expect(chart.canvas).toBe(canvas);

    // Type + data: same labels, same order, raw numbers, as the original.
    expect(chart.config.type).toBe('doughnut');
    expect(chart.config.data.labels).toEqual(['P&I', 'Taxes', 'Insurance', 'HOA']);
    expect(chart.config.data.datasets).toHaveLength(1);
    const dataset = chart.config.data.datasets[0];
    expect(dataset.data).toEqual([
      BREAKDOWN_A.pi,
      BREAKDOWN_A.tax,
      BREAKDOWN_A.insurance,
      BREAKDOWN_A.hoa,
    ]);
    expect(dataset.borderWidth).toBe(0);
    expect(dataset.hoverOffset).toBe(4);
    // The arcs the CDN build's `colors` plugin painted on the original
    // colorless dataset (chart.js 4.5.1, identical to the installed build).
    expect(dataset.backgroundColor).toEqual([
      'rgb(54, 162, 235)',
      'rgb(255, 99, 132)',
      'rgb(255, 159, 64)',
      'rgb(255, 205, 86)',
    ]);

    // Options carried over unchanged from script.js#updateChart.
    const options = chart.config.options;
    expect(options.cutout).toBe('70%');
    expect(options.responsive).toBe(true);
    expect(options.maintainAspectRatio).toBe(false);
    expect(options.plugins.legend).toMatchObject({
      display: true,
      position: 'bottom',
      labels: {
        color: '#94a3b8',
        usePointStyle: true,
        padding: 20,
        font: { size: 12 },
      },
    });
    // Tooltip: "label: $X" with the shared 0-decimal currency formatter.
    const tooltipLabel = options.plugins.tooltip.callbacks.label;
    expect(tooltipLabel({ label: 'P&I', raw: BREAKDOWN_A.pi })).toBe('P&I: $2,023');
    expect(tooltipLabel({ label: 'Taxes', raw: BREAKDOWN_A.tax })).toBe('Taxes: $458');
    view.unmount();
  });

  it('updates the existing instance in place when the breakdown changes — no second instance', () => {
    const view = renderChart(h(PaymentChart, { hasCalc: true, ...BREAKDOWN_A }));
    expect(mockInstances).toHaveLength(1);
    const chart = mockInstances[0];

    view.rerender(h(PaymentChart, { hasCalc: true, ...BREAKDOWN_B }));

    // Same instance, refreshed in place — never a duplicate.
    expect(mockInstances).toHaveLength(1);
    expect(chart.updateCalls).toBe(1);
    expect(chart.config.data.datasets[0].data).toEqual([
      BREAKDOWN_B.pi,
      BREAKDOWN_B.tax,
      BREAKDOWN_B.insurance,
      BREAKDOWN_B.hoa,
    ]);
    view.unmount();
  });

  it('memoizes: an unchanged re-render does not touch the chart', () => {
    const view = renderChart(h(PaymentChart, { hasCalc: true, ...BREAKDOWN_A }));
    const chart = mockInstances[0];

    view.rerender(h(PaymentChart, { hasCalc: true, ...BREAKDOWN_A }));

    expect(chart.updateCalls).toBe(0);
    expect(mockInstances).toHaveLength(1);
    view.unmount();
  });

  it('renders nothing (no canvas, no instance) before the first calculation', () => {
    const view = renderChart(h(PaymentChart, { hasCalc: false, ...BREAKDOWN_A }));

    expect(mockInstances).toHaveLength(0);
    expect(document.getElementById('paymentChart')).toBeNull();
    view.unmount();
  });

  it('handles an all-zero breakdown cleanly (no degenerate empty ring)', () => {
    const view = renderChart(
      h(PaymentChart, { hasCalc: true, pi: 0, tax: 0, insurance: 0, hoa: 0 }),
    );

    expect(mockInstances).toHaveLength(0);
    expect(document.getElementById('paymentChart')).toBeNull();
    view.unmount();
  });

  it('destroys the instance on unmount', () => {
    const view = renderChart(h(PaymentChart, { hasCalc: true, ...BREAKDOWN_A }));
    const chart = mockInstances[0];

    view.unmount();

    expect(chart.destroyed).toBe(true);
    expect(liveInstances()).toHaveLength(0);
  });

  it('toggling hasCalc destroys the old instance before a new one is created', () => {
    const view = renderChart(h(PaymentChart, { hasCalc: true, ...BREAKDOWN_A }));
    view.rerender(h(PaymentChart, { hasCalc: false, ...BREAKDOWN_A }));
    expect(mockInstances[0].destroyed).toBe(true);
    expect(liveInstances()).toHaveLength(0);

    view.rerender(h(PaymentChart, { hasCalc: true, ...BREAKDOWN_A }));
    expect(mockInstances).toHaveLength(2);
    expect(liveInstances()).toHaveLength(1);
    view.unmount();
  });

  it('is StrictMode-safe: double-invoked effects leave exactly one live instance', () => {
    const view = renderChart(
      h(StrictMode, null, h(PaymentChart, { hasCalc: true, ...BREAKDOWN_A })),
    );

    // Mount effect ran setup → cleanup → setup: two constructions, one survivor.
    expect(mockInstances).toHaveLength(2);
    expect(mockInstances[0].destroyed).toBe(true);
    expect(liveInstances()).toHaveLength(1);

    // An in-place update after StrictMode still hits the single survivor.
    view.rerender(
      h(StrictMode, null, h(PaymentChart, { hasCalc: true, ...BREAKDOWN_B })),
    );
    expect(mockInstances).toHaveLength(2);
    expect(liveInstances()).toHaveLength(1);
    expect(liveInstances()[0].updateCalls).toBe(1);
    view.unmount();
  });
});
