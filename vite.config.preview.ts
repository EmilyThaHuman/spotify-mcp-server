import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: './',
  build: {
    outDir: 'assets',
    emptyOutDir: false, // Don't empty - spotify-search was already built
    rollupOptions: {
      input: {
        'preview': resolve(__dirname, 'src/dev/preview.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'preview-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            return '[name][extname]';
          }
          return 'preview-[hash][extname]';
        },
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

