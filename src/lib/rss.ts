/**
 * RSS 2.0, written by hand. @astrojs/rss would do the same job; it is worth
 * switching to if a feed ever needs enclosures, custom elements or an XSL
 * stylesheet, none of which these plain item lists use.
 */

export interface FeedItem {
  title: string;
  /** Site-relative path. */
  link: string;
  date: Date;
  /** Plain text, shown by readers that do not render HTML. */
  description: string;
  /** Full HTML body. Root-relative links in it are made absolute. */
  html?: string;
  categories?: string[];
}

export interface Feed {
  title: string;
  description: string;
  /** Site-relative path of the page the feed mirrors. */
  link: string;
  /** Site-relative path of the feed itself. */
  self: string;
  site: URL;
  items: FeedItem[];
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** A body that itself contains "]]>" would close the section early. */
function cdata(s: string): string {
  return `<![CDATA[${s.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

/** Feed readers resolve nothing against the site, so "/media/x.png" must carry the host. */
function absolutize(html: string, site: URL): string {
  return html.replace(/(\s(?:src|href))="\/(?!\/)/g, `$1="${new URL('/', site).href}`);
}

export function rss(feed: Feed): Response {
  const abs = (p: string) => new URL(p, feed.site).href;
  const items = [...feed.items].sort((a, b) => b.date.valueOf() - a.date.valueOf());

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${esc(feed.title)}</title>
<description>${esc(feed.description)}</description>
<link>${abs(feed.link)}</link>
<atom:link href="${abs(feed.self)}" rel="self" type="application/rss+xml"/>
<language>en</language>
${items[0] ? `<lastBuildDate>${items[0].date.toUTCString()}</lastBuildDate>` : ''}
${items
  .map(
    (i) => `<item>
<title>${esc(i.title)}</title>
<link>${abs(i.link)}</link>
<guid isPermaLink="true">${abs(i.link)}</guid>
<pubDate>${i.date.toUTCString()}</pubDate>
<description>${esc(i.description)}</description>
${(i.categories ?? []).map((c) => `<category>${esc(c)}</category>`).join('\n')}
${i.html ? `<content:encoded>${cdata(absolutize(i.html, feed.site))}</content:encoded>` : ''}
</item>`,
  )
  .join('\n')}
</channel>
</rss>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
