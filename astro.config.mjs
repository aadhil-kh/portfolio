// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://aadhil.dev',
  base: '/',
  trailingSlash: 'ignore',
  build: {
    // /changelog/index.html rather than /changelog.html, so the live URLs
    // keep the trailing-slash shape the rest of the site already uses.
    format: 'directory',
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
});
