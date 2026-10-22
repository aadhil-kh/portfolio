import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';
import { APP_IDS } from './data/apps';
import { PLATFORM_IDS } from './data/platforms';

/**
 * Content schemas. These are the contract the release script writes against -
 * if a generated file is wrong, the build fails here with the field named,
 * rather than rendering a broken row.
 */

const changelog = defineCollection({
  loader: glob({ base: './src/content/changelog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    /** Which app this release belongs to - must be an id from src/data/apps.ts. */
    app: z.enum(APP_IDS as [string, ...string[]]),
    /** Release version, e.g. "9.0.1". Kept a string so "1.2.0-beta" works. */
    version: z.string().min(1),
    /** Release date. Drives sorting. */
    date: z.coerce.date(),
    /** One release can ship to several platforms at once. */
    platforms: z
      .array(z.enum(PLATFORM_IDS as unknown as [string, ...string[]]))
      .min(1),
    /** Headline for the release. Falls back to "<App> <version>". */
    title: z.string().optional(),
    /** One or two sentences shown on the list row. */
    summary: z.string().optional(),
    /** Screenshot for the row. Omitted means a generated SVG card is drawn. */
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    /** Short bullets shown on the row under the summary. */
    highlights: z.array(z.string()).default([]),
    /** Direct download or store link for this build. */
    downloadUrl: z.string().optional(),
    /** Where this release came from, recorded by the release script. */
    source: z
      .object({
        repo: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        commitCount: z.number().optional(),
      })
      .optional(),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** Cover image for the list row. Omitted means a generated SVG card. */
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    /** Optional link back to one of my apps. */
    app: z.enum(APP_IDS as [string, ...string[]]).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { changelog, blog };
