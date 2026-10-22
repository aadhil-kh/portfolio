import type { APIRoute } from 'astro';
import { getReleases } from '../../lib/changelog';
import { releaseItem } from '../../lib/releaseFeed';
import { rss } from '../../lib/rss';
import { SITE_NAME } from '../../data/site';

export const GET: APIRoute = async ({ site }) =>
  rss({
    title: `${SITE_NAME} - Changelog`,
    description: 'Release notes for every app I ship.',
    link: '/changelog/',
    self: '/changelog/rss.xml',
    site: site!,
    items: (await getReleases()).map(releaseItem),
  });
