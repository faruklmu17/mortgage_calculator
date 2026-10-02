import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/guide/
export default defineConfig({
  // Base stays "/" for the existing root custom domain (mortgagepayofflab.com).
  base: '/',
  plugins: [react()],
});
