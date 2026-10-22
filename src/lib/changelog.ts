import { getCollection, type CollectionEntry } from 'astro:content';

export type ReleaseEntry = CollectionEntry<'changelog'>;

export interface Release {
  entry: ReleaseEntry;
  /** URL segment under /changelog/. Stable, readable, and filename-independent. */
  slug: string;
  data: ReleaseEntry['data'];
}

/**
 * Astro's glob loader derives an id by slugifying the filename, which turns
 * "9.0.1" into "901" - ambiguous against "90.1" and tied to how the file
 * happens to be named. Releases get their URL from their own frontmatter
 * instead, so renaming a file never breaks a published link.
 */
function baseSlug(data: ReleaseEntry['data']): string {
  const version = data.version
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${data.app}-${version}`;
}

/**
 * Loads every release, drops drafts outside dev, sorts newest first, and
 * assigns each one a unique slug.
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
    let slug = baseSlug(entry.data);

    if (used.has(slug)) {
      slug = `${slug}-${[...entry.data.platforms].sort().join('-')}`;
    }
    // Still colliding means two genuinely identical releases; fall back to the
    // file id, which is unique by construction.
    if (used.has(slug)) {
      slug = `${slug}-${entry.id}`;
    }

    used.add(slug);
    return { entry, slug, data: entry.data };
  });
}
