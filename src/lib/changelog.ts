import { getCollection, type CollectionEntry } from 'astro:content';

export type ReleaseEntry = CollectionEntry<'changelog'>;

export interface Release {
  entry: ReleaseEntry;
  /** Version segment of the URL, e.g. "v1-2-0". Unique within its app. */
  version: string;
  /** /changelog/<app>/<version>/ - stable, readable, filename-independent. */
  href: string;
  data: ReleaseEntry['data'];
}

/** An app's own changelog page. This is the URL to quote in store listings. */
export function appChangelogHref(appId: string): string {
  return `/changelog/${appId}/`;
}

/**
 * Astro's glob loader derives an id by slugifying the filename, which turns
 * "9.0.1" into "901" - ambiguous against "90.1" and tied to how the file
 * happens to be named. Releases get their URL from their own frontmatter
 * instead, so renaming a file never breaks a published link.
 *
 * Dots become dashes rather than staying in the URL: a last segment like
 * "v1.2.0" reads as a file extension to Cloudflare Pages and the dev server,
 * which then skip the directory-index lookup.
 */
function baseVersion(data: ReleaseEntry['data']): string {
  const version = data.version
    .trim()
    .toLowerCase()
    .replace(/^v/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `v${version}`;
}

/**
 * Loads every release, drops drafts outside dev, sorts newest first, and
 * assigns each one a unique URL.
 *
 * Two releases of the same app and version (a Windows build and a macOS build
 * filed separately, say) would collide, so the loser gets its platforms
 * appended rather than silently overwriting the winner's route.
 */
export async function getReleases(): Promise<Release[]> {
  const entries = (await getCollection('changelog'))
    .filter((e) => import.meta.env.DEV || !e.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const used = new Set<string>();

  return entries.map((entry) => {
    const app = entry.data.app;
    let version = baseVersion(entry.data);

    if (used.has(`${app}/${version}`)) {
      version = `${version}-${[...entry.data.platforms].sort().join('-')}`;
    }
    // Still colliding means two genuinely identical releases; fall back to the
    // file id, which is unique by construction.
    if (used.has(`${app}/${version}`)) {
      version = `${version}-${entry.id}`;
    }

    used.add(`${app}/${version}`);
    return { entry, version, href: `${appChangelogHref(app)}${version}/`, data: entry.data };
  });
}
