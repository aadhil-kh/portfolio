import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { appChangelogHref, getReleases } from '../lib/changelog';

/**
 * The sitemap, built from the same sources as the pages so it cannot drift:
 *
 * - Static .astro pages are discovered by globbing this folder. A new page is
 *   listed without anyone touching this file.
 * - Dynamic routes are listed from their collections below. A *new* dynamic
 *   route fails the build until it is added here, rather than going missing
 *   from the sitemap unnoticed.
 * - Hand-written HTML under public/ (the app landing and privacy pages) is
 *   found by walking the folder; one carrying a noindex meta is skipped.
 *
 * `lastmod` is given only where it is a real content date. Google ignores the
 * field site-wide once it catches it lying, and file mtimes on a fresh CI
 * checkout are all the build time.
 */

const DYNAMIC_ROUTES = new Set([
  './blog/[...slug].astro',
  './changelog/[app]/index.astro',
  './changelog/[app]/[version].astro',
]);

const day = (d: Date) => d.toISOString().slice(0, 10);
const newest = (dates: Date[]) =>
  dates.length ? new Date(Math.max(...dates.map((d) => d.valueOf()))) : undefined;

function staticPages(): string[] {
  const files = Object.keys(import.meta.glob('./**/*.astro'));
  const unknown = files.filter((f) => f.includes('[') && !DYNAMIC_ROUTES.has(f));
  if (unknown.length) {
    throw new Error(
      `sitemap.xml.ts does not know how to list ${unknown.join(', ')}. ` +
        'Add the route to DYNAMIC_ROUTES and list its pages below.',
    );
  }
  return files
    .filter((f) => !f.includes('[') && !/\/(_|404\.|500\.)/.test(f))
    .map((f) => `/${f.slice(2).replace(/\.astro$/, '').replace(/(^|\/)index$/, '')}/`.replace('//', '/'));
}

function publicPages(): string[] {
  const files = import.meta.glob<string>('/public/**/*.html', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  return Object.entries(files)
    .filter(([, html]) => !/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html))
    .map(([f]) => f.slice('/public'.length).replace(/(^|\/)index\.html$/, '$1'));
}

export const GET: APIRoute = async ({ site }) => {
  const releases = await getReleases();
  const posts = (await getCollection('blog')).filter((p) => import.meta.env.DEV || !p.data.draft);

  const lastmod = new Map<string, Date | undefined>();
  const add = (path: string, date?: Date) => lastmod.set(path, date);

  for (const path of staticPages()) add(path);
  add('/changelog/', newest(releases.map((r) => r.data.date)));
  add('/blog/', newest(posts.map((p) => p.data.updated ?? p.data.date)));

  for (const app of new Set(releases.map((r) => r.data.app))) {
    add(appChangelogHref(app), newest(releases.filter((r) => r.data.app === app).map((r) => r.data.date)));
  }
  for (const r of releases) add(r.href, r.data.date);
  for (const p of posts) add(`/blog/${p.id}/`, p.data.updated ?? p.data.date);

  for (const path of publicPages()) if (!lastmod.has(path)) add(path);

  const urls = [...lastmod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([path, date]) =>
        `<url><loc>${new URL(path, site).href}</loc>${date ? `<lastmod>${day(date)}</lastmod>` : ''}</url>`,
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
