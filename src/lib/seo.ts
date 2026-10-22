import type { AppDef } from '../data/apps';
import { platformLabel, sortPlatforms } from '../data/platforms';
import { AUTHOR, SITE_NAME, SOCIAL_LINKS } from '../data/site';

/**
 * schema.org builders for the JSON-LD each page carries. Everything here is
 * derived from data the pages already render - apps.ts, frontmatter, site.ts -
 * so structured data cannot claim something the visible page does not.
 *
 * Deliberately absent: `offers` and ratings on SoftwareApplication. Google
 * wants one of them before it shows an app rich result, but a price or rating
 * written here would go stale the moment the store changed.
 */

export type JsonLd = Record<string, unknown>;

export function absolute(path: string, site: URL): string {
  return new URL(path, site).href;
}

export function person(site: URL): JsonLd {
  return {
    '@type': 'Person',
    '@id': `${absolute('/', site)}#person`,
    name: AUTHOR.name,
    url: absolute('/', site),
    jobTitle: AUTHOR.jobTitle,
    email: `mailto:${AUTHOR.email}`,
    sameAs: SOCIAL_LINKS.map((s) => s.href),
  };
}

/** The page's own person node, for `author` fields in the same graph. */
export function personRef(site: URL): JsonLd {
  return { '@id': `${absolute('/', site)}#person` };
}

export function website(site: URL): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': `${absolute('/', site)}#website`,
    name: SITE_NAME,
    url: absolute('/', site),
    author: personRef(site),
  };
}

/** Crumbs are [name, path] pairs, root first, ending on the current page. */
export function breadcrumbs(crumbs: [string, string][], site: URL): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: absolute(path, site),
    })),
  };
}

/** Where the app is actually got: its own site, else its first store page. */
function appUrl(app: AppDef): string | undefined {
  return app.links.web ?? Object.values(app.links.stores ?? {}).find(Boolean);
}

export function softwareApplication(
  app: AppDef,
  site: URL,
  latest?: { version: string; href: string },
): JsonLd {
  const platforms = sortPlatforms(Object.keys(app.links.stores ?? {}));
  return {
    '@type': 'SoftwareApplication',
    name: app.title,
    description: app.description,
    url: appUrl(app),
    image: app.icon ? absolute(app.icon, site) : undefined,
    screenshot: app.screenshots?.map((s) => absolute(s.src, site)),
    operatingSystem: platforms.length ? platforms.map(platformLabel).join(', ') : undefined,
    author: personRef(site),
    softwareVersion: latest?.version,
    releaseNotes: latest ? absolute(latest.href, site) : undefined,
  };
}

/**
 * Wraps one or more nodes into a single document for a <script> tag. Google
 * does not follow an @id to another page, so every page carries the person
 * and website nodes itself rather than pointing at the homepage's.
 */
export function graph(nodes: JsonLd[]): JsonLd {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
