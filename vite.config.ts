import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: './',
  build: {
    outDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'spotify-search': resolve(__dirname, 'src/components/spotify-search.html'),
        'preview': resolve(__dirname, 'src/dev/preview.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            return '[name][extname]';
          }
          return '[name]-[hash][extname]';
        },
        // Keep preview and spotify-search chunks separate to avoid including mock data
        manualChunks: (id) => {
          // Separate preview code from production widget code
          if (id.includes('preview') || id.includes('dev/preview')) {
            return 'preview';
          }
          // Keep spotify-search components together
          if (id.includes('components/spotify-search')) {
            return 'spotify-search';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    open: '/src/dev/preview.html',
  }
});

