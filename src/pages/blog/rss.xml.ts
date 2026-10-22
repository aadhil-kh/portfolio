import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { rss } from '../../lib/rss';
import { SITE_NAME } from '../../data/site';

export const GET: APIRoute = async ({ site }) => {
  const posts = (await getCollection('blog')).filter((p) => import.meta.env.DEV || !p.data.draft);
  return rss({
    title: `${SITE_NAME} - Blog`,
    description:
      'Notes on building and shipping desktop apps, Zoho CRM development, and developer tooling.',
    link: '/blog/',
    self: '/blog/rss.xml',
    site: site!,
    items: posts.map((p) => ({
      title: p.data.title,
      link: `/blog/${p.id}/`,
      date: p.data.date,
      description: p.data.description,
      html: p.rendered?.html,
      categories: p.data.tags,
    })),
  });
};
