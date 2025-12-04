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
        chunkFileNames: (chunkInfo) => {
          // Use entry name in chunk filename to keep them separate
          const entryName = chunkInfo.name || 'chunk';
          if (chunkInfo.isEntry) {
            return '[name].js';
          }
          // Check if chunk belongs to preview or spotify-search
          const moduleIds = chunkInfo.moduleIds || [];
          const isPreview = moduleIds.some((id: string) => id.includes('preview') || id.includes('dev/preview'));
          const isSpotifySearch = moduleIds.some((id: string) => id.includes('components/spotify-search') && !id.includes('preview'));
          
          if (isPreview) {
            return 'preview-[hash].js';
          }
          if (isSpotifySearch) {
            return 'spotify-search-[hash].js';
          }
          // Shared chunks (React, etc.) - put in spotify-search since that's the production widget
          return 'spotify-search-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            return '[name][extname]';
          }
          // Check if asset belongs to preview or spotify-search
          const name = assetInfo.name || '';
          if (name.includes('preview') || name.includes('dev/preview')) {
            return 'preview-[hash][extname]';
          }
          return 'spotify-search-[hash][extname]';
        },
        // Keep preview and spotify-search chunks completely separate
        manualChunks: (id) => {
          // Separate preview code from production widget code
          if (id.includes('preview') || id.includes('dev/preview')) {
            return 'preview';
          }
          // Don't create a manual chunk for spotify-search - let Vite handle it naturally
          // This ensures spotify-search gets its own CSS and JS files
          return undefined;
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

