import { defineConfig } from 'vite';
import { siteBase } from './site.config.ts';

export default defineConfig({
  appType: 'mpa',
  base: siteBase,
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'preact',
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
