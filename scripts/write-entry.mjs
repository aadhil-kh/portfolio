#!/usr/bin/env node
/**
 * Write one changelog entry from a JSON file.
 *
 *   node scripts/write-entry.mjs <entry.json> [--force]
 *
 * This exists so the skill in .claude/skills/changelog-entry never hand-writes
 * YAML. Quoting a title with an apostrophe, folding a summary to the right
 * width, ordering the fields - all of that is already solved in
 * scripts/lib/content.mjs, and an entry composed by hand would drift from the
 * one the editor writes. Passing a JSON file (rather than a shell argument)
 * also keeps backslashes and newlines intact on Windows.
 *
 * Expected shape - app, version, platforms and body are required:
 *
 *   {
 *     "app": "solipdf",
 *     "version": "2.5.0",
 *     "date": "2026-10-22",
 *     "platforms": ["windows"],
 *     "title": "Split by file size",
 *     "summary": "...",
 *     "highlights": ["...", "..."],
 *     "image": "/media/solipdf/split-size.webp",
 *     "imageAlt": "...",
 *     "downloadUrl": "https://...",
 *     "source": { "repo": "owner/name", "from": "abc1234", "to": "def5678", "commitCount": 12 },
 *     "draft": true,
 *     "body": "## New\n\n- ..."
 *   }
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  CONTENT_DIR,
  PLATFORM_IDS,
  entryFileName,
  normalizePlatform,
  readAppRegistry,
  serializeEntry,
  sortPlatforms,
  todayLocal,
} from './lib/content.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const input = args.find((a) => !a.startsWith('--'));

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

if (!input) fail('Pass the path to a JSON file describing the entry.');

let payload;
try {
  payload = JSON.parse(readFileSync(resolve(input), 'utf8'));
} catch (e) {
  fail(`Could not read ${input}: ${e.message}`);
}

/* ------------------------------------------------------------ validate --- */

const apps = readAppRegistry();
if (!payload.app) fail('"app" is required.');
if (!apps.some((a) => a.id === payload.app)) {
  fail(`"${payload.app}" is not in src/data/apps.ts. Known ids:\n  ${apps.map((a) => a.id).join('\n  ')}`);
}

if (!String(payload.version ?? '').trim()) fail('"version" is required.');

const rawPlatforms = payload.platforms ?? [];
if (!Array.isArray(rawPlatforms) || rawPlatforms.length === 0) {
  fail('"platforms" is required and is never inferred - one repo can ship to several.');
}
const platforms = sortPlatforms(
  rawPlatforms.map((p) => {
    const id = normalizePlatform(p);
    if (!id) fail(`Unknown platform "${p}". Known: ${PLATFORM_IDS.join(', ')}`);
    return id;
  }),
);

const date = String(payload.date ?? '').trim() || todayLocal();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`"date" must be YYYY-MM-DD, got "${date}".`);

if (!String(payload.body ?? '').trim()) fail('"body" is required - that is the release note itself.');

/* --------------------------------------------------------------- write --- */

const data = {
  app: payload.app,
  version: String(payload.version).trim(),
  date,
  platforms,
  title: payload.title,
  summary: payload.summary,
  image: payload.image,
  imageAlt: payload.imageAlt,
  highlights: payload.highlights ?? [],
  downloadUrl: payload.downloadUrl,
  source: payload.source,
  draft: payload.draft !== false,
};

const file = entryFileName(data.app, data.version);
const outPath = join(CONTENT_DIR, file);

if (existsSync(outPath) && !force) {
  fail(`${outPath} already exists. Pass --force to overwrite.`);
}

mkdirSync(CONTENT_DIR, { recursive: true });
writeFileSync(outPath, serializeEntry(data, payload.body), 'utf8');

console.log(`Wrote src/content/changelog/${file}`);
console.log(`  app        ${data.app}`);
console.log(`  version    ${data.version}`);
console.log(`  platforms  ${platforms.join(', ')}`);
console.log(`  draft      ${data.draft}`);
console.log(`\nValidate with: npm run build`);
