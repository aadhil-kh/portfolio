import type { APIRoute, GetStaticPaths } from 'astro';
import { appChangelogHref, getReleases, type Release } from '../../../lib/changelog';
import { releaseItem } from '../../../lib/releaseFeed';
import { rss } from '../../../lib/rss';
import { appName } from '../../../data/apps';

/** The same set of apps as /changelog/<app>/: only those with releases. */
export const getStaticPaths = (async () => {
  const all = await getReleases();
  const ids = [...new Set(all.map((r) => r.data.app))];
  return ids.map((id) => ({
    params: { app: id },
    props: { releases: all.filter((r) => r.data.app === id) },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params, props, site }) => {
  const id = params.app!;
  const name = appName(id);
  return rss({
    title: `${name} releases`,
    description: `Release notes for ${name}.`,
    link: appChangelogHref(id),
    self: `${appChangelogHref(id)}rss.xml`,
    site: site!,
    items: (props.releases as Release[]).map(releaseItem),
  });
};
