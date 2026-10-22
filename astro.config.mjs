// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://aadhil.dev',
  base: '/',
  // Every page is built as <path>/index.html and Cloudflare Pages redirects
  // the bare path to the slashed one, so a link without the slash costs a
  // redirect hop and disagrees with the canonical tag. 'always' makes the dev
  // server refuse those links too, so they get caught before deploy.
  trailingSlash: 'always',
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
