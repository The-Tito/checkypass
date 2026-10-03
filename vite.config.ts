import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import { parseGlobalHeaders } from './scripts/headers.ts';

/** Aplica public/_headers (bloque `/*`) en `vite preview` para probar con la CSP real. */
function previewHeaders(): Plugin {
  return {
    name: 'verifica-preview-headers',
    configurePreviewServer(server) {
      const headers = parseGlobalHeaders(readFileSync('public/_headers', 'utf8'));
      server.middlewares.use((_req, res, next) => {
        for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [previewHeaders()],
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
