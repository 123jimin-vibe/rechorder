import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { siteBase } from './site.config.ts';

export default defineConfig({
  appType: 'mpa',
  base: siteBase,
  build: {
    rolldownOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        chords: fileURLToPath(
          new URL('./chord-progression/index.html', import.meta.url),
        ),
        piano: fileURLToPath(new URL('./piano/index.html', import.meta.url)),
      },
    },
  },
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
