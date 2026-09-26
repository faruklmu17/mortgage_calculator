import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/guide/
export default defineConfig({
  // Base stays "/" for the existing root custom domain (mortgagepayofflab.com).
  base: '/',
  plugins: [react()],
  // Vitest only: run chart.js + react-chartjs-2 through the transform
  // pipeline so `vi.mock('chart.js')` in PaymentChart.test.jsx can
  // intercept them (node_modules are externalized by default, which
  // would load the real Chart.js and fail in jsdom's 2D-less canvas).
  // Vite itself ignores the `test` key; dev/build are unaffected.
  test: {
    server: {
      deps: {
        inline: ['chart.js', 'react-chartjs-2'],
      },
    },
  },
});
