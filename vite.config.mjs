import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/bp-listings.js',
      name: 'ListingsMap',
      formats: ['iife'],
      fileName: () => 'bp-listings.min.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'bp-listings.css';
          }

          return assetInfo.name ?? '[name][extname]';
        },
      },
    },
  },
});
