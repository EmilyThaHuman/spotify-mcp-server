import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: './',
  build: {
    outDir: 'assets',
    emptyOutDir: false, // Don't empty on first build
    rollupOptions: {
      input: {
        'spotify-search': resolve(__dirname, 'src/components/spotify-search.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'spotify-search-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            return '[name][extname]';
          }
          return 'spotify-search-[hash][extname]';
        },
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
});

