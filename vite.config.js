// Vite configuration: enables React fast refresh and keeps third-party code in cacheable chunks.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;

          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/')
          ) {
            return 'react-vendor';
          }

          if (id.includes('/node_modules/@supabase/')) {
            return 'supabase-vendor';
          }

          if (id.includes('/node_modules/lucide-react/')) {
            return 'lucide-vendor';
          }

          return undefined;
        }
      }
    }
  }
});
