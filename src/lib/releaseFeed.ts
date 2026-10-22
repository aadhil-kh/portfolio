import type { Release } from './changelog';
import type { FeedItem } from './rss';
import { appName } from '../data/apps';
import { platformLabel, sortPlatforms } from '../data/platforms';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * One release as a feed item. The body repeats what the release page shows
 * above its notes - summary and highlights - so a reader gets the whole entry
 * without clicking through.
 */
export function releaseItem(r: Release): FeedItem {
  const d = r.data;
  const name = appName(d.app);
  const platforms = sortPlatforms(d.platforms).map(platformLabel);

  const html = [
    d.summary && `<p>${esc(d.summary)}</p>`,
    d.highlights.length > 0 && `<ul>${d.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>`,
    r.entry.rendered?.html,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    title: d.title ? `${name} ${d.version}: ${d.title}` : `${name} ${d.version}`,
    link: r.href,
    date: d.date,
    description: d.summary ?? `Release notes for ${name} ${d.version}.`,
    html,
    categories: [name, ...platforms],
  };
}
