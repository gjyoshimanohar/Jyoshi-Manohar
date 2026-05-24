import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('recharts') || id.includes('d3')) return 'charts';
              if (id.includes('suneditor')) return 'editor';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('@dnd-kit')) return 'dnd';
              if (id.includes('@google/genai')) return 'genai';
              if (id.includes('axios')) return 'axios';
              if (id.includes('motion')) return 'motion';
              if (id.includes('react-dom') || id.includes('react-router') || id.includes('react/')) return 'react-vendor';
              if (id.includes('react-day-picker') || id.includes('date-fns')) return 'date-vendor';
              return 'vendor';
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
