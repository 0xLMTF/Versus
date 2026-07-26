import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local defaults — Replit injected PORT / BASE_PATH; localhost should Just Work.
const port = Number(process.env.PORT || 5173);
const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // Replit-only plugins: load only when running inside Replit
    ...(process.env.REPL_ID
      ? [
          await import('@replit/vite-plugin-runtime-error-modal').then((m) =>
            m.default(),
          ),
          ...(process.env.NODE_ENV !== 'production'
            ? [
                await import('@replit/vite-plugin-cartographer').then((m) =>
                  m.cartographer({
                    root: path.resolve(__dirname, '..'),
                  }),
                ),
                await import('@replit/vite-plugin-dev-banner').then((m) =>
                  m.devBanner(),
                ),
              ]
            : []),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, '..', '..', 'attached_assets'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
  },
});
