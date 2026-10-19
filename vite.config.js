// Vite configuration: enables React fast refresh during development and optimized production bundling.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()]
});
