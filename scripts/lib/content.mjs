/**
 * Shared plumbing for the content tooling: the app and platform registries,
 * the collection definitions, and reading/writing an entry file.
 *
 * `npm run release`, `npm run admin` and the changelog skill all go through
 * here, so a change to the file format lands in one place rather than drifting
 * between them.
 *
 * Adding a collection is a matter of adding an entry to COLLECTIONS below: the
 * serializer, the validator and the editor's form are all driven from the same
 * field list.
 *
 * The real validator is still src/content.config.ts - whatever is written here
 * has to survive `npm run build`, which fails with the offending field named.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT_ROOT = join(ROOT, 'src', 'content');
export const CONTENT_DIR = join(CONTENT_ROOT, 'changelog');
export const PUBLIC_DIR = join(ROOT, 'public');

/* ----------------------------------------------------------- registries --- */

/**
 * apps.ts and platforms.ts are TypeScript, so rather than adding a build step
 * just to read them, the few fields needed here are pulled out textually.
 */
export function readAppRegistry() {
  const src = readFileSync(join(ROOT, 'src', 'data', 'apps.ts'), 'utf8');
  const apps = [];

  // Each entry starts with `id: '...'` and may carry name/icon/accent/repos.
  const blocks = src.split(/\n  \{\n/).slice(1);
  for (const block of blocks) {
    const id = block.match(/id:\s*'([^']+)'/)?.[1];
    if (!id) continue;
    const name = block.match(/name:\s*'([^']+)'/)?.[1] ?? id;
    const icon = block.match(/icon:\s*'([^']+)'/)?.[1] ?? null;
    const accent = block.match(/accent:\s*'([^']+)'/)?.[1] ?? '#2563eb';
    const reposRaw = block.match(/repos:\s*\[([^\]]*)\]/)?.[1] ?? '';
    const repos = [...reposRaw.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    apps.push({ id, name, icon, accent, repos });
  }
  return apps;
}

export const PLATFORM_IDS = ['windows', 'macos', 'ios', 'ipados', 'android', 'linux', 'web'];

export const PLATFORM_LABELS = {
  windows: 'Windows',
  macos: 'macOS',
  ios: 'iOS',
  ipados: 'iPadOS',
  android: 'Android',
  linux: 'Linux',
  web: 'Web',
};

/** Shorthands a human would actually type, mapped onto a canonical id. */
export const PLATFORM_ALIASES = {
  win: 'windows', win32: 'windows', windows: 'windows',
  mac: 'macos', macos: 'macos', osx: 'macos', darwin: 'macos',
  ios: 'ios', iphone: 'ios',
  ipad: 'ipados', ipados: 'ipados',
  android: 'android',
  linux: 'linux', flathub: 'linux', snap: 'linux',
  web: 'web', browser: 'web',
};

export function normalizePlatform(input) {
  return PLATFORM_ALIASES[String(input).trim().toLowerCase()] ?? null;
}

/** Canonical display order, duplicates dropped. */
export function sortPlatforms(ids) {
  const set = new Set(ids);
  return PLATFORM_IDS.filter((p) => set.has(p));
}

/** "git@github.com:o/n.git", "https://github.com/o/n", "o/n" -> "o/n" */
export function repoSlug(repo) {
  return String(repo)
    .trim()
    .replace(/^git@[^:]+:/, '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '');
}

export function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ----------------------------------------------------------- collections --- */

/**
 * `kind` drives both how a field is written to YAML and what control the
 * editor renders for it:
 *
 *   text      a quoted-if-needed scalar
 *   folded    a `>-` block, used for prose that would otherwise need escaping
 *   date      YYYY-MM-DD, written bare
 *   app       an app id from apps.ts, rendered as a select
 *   platforms the platform id list, rendered as toggles, written [a, b]
 *   flowlist  a free-form list written inline: [a, b]
 *   blocklist a free-form list written as `- item` lines
 *   image     a path under /media, rendered with a suggestion list
 *   bool      written only when true
 *   preserved never shown in the form; carried across an edit untouched
 */
export const COLLECTIONS = {
  changelog: {
    id: 'changelog',
    label: 'Changelog',
    dir: join(CONTENT_ROOT, 'changelog'),
    /**
     * A release's URL is derived from its frontmatter (see
     * src/lib/changelog.ts), so the filename is cosmetic and renaming it when
     * the app or version changes breaks no published link.
     */
    renameOnChange: true,
    fileName: (d) => `${d.app}-${String(d.version).replace(/[^a-zA-Z0-9]+/g, '-')}.md`,
    titleOf: (d) => d.title || `${d.app} ${d.version}`,
    fields: [
      { name: 'app', kind: 'app', required: true, width: 'half' },
      { name: 'version', kind: 'text', required: true, width: 'half', placeholder: '9.0.2' },
      { name: 'date', kind: 'date', required: true, width: 'half' },
      { name: 'platforms', kind: 'platforms', required: true, width: 'half' },
      { name: 'title', kind: 'text', width: 'full', placeholder: 'Defaults to "App version"' },
      { name: 'summary', kind: 'folded', width: 'full', rows: 2, placeholder: 'One or two sentences shown on the list row.' },
      // Order follows content.config.ts, so a generated file and a hand-written
      // one are diffable against each other.
      { name: 'image', kind: 'image', width: 'half' },
      { name: 'imageAlt', kind: 'text', width: 'half', label: 'Image alt' },
      { name: 'highlights', kind: 'blocklist', width: 'full', placeholder: 'A short bullet for the list row' },
      { name: 'downloadUrl', kind: 'text', width: 'half', label: 'Download URL' },
      { name: 'source', kind: 'preserved' },
      { name: 'draft', kind: 'bool', width: 'half', hint: 'Hidden from the live build' },
    ],
  },

  blog: {
    id: 'blog',
    label: 'Blog',
    dir: join(CONTENT_ROOT, 'blog'),
    /**
     * A post's URL *is* its filename - src/pages/blog/[...slug].astro routes on
     * the glob loader's id. Renaming a published post would break its link and
     * anything pointing at it, so the filename is fixed at creation and the
     * title is free to change afterwards.
     */
    renameOnChange: false,
    fileName: (d) => `${slugify(d.title)}.md`,
    titleOf: (d) => d.title,
    fields: [
      { name: 'title', kind: 'text', required: true, width: 'full' },
      { name: 'description', kind: 'folded', required: true, width: 'full', rows: 2, placeholder: 'One or two sentences shown on the list row and as the meta description.' },
      { name: 'date', kind: 'date', required: true, width: 'half' },
      { name: 'updated', kind: 'date', width: 'half', hint: 'Optional' },
      { name: 'tags', kind: 'flowlist', width: 'full', placeholder: 'astro' },
      { name: 'image', kind: 'image', width: 'half' },
      { name: 'imageAlt', kind: 'text', width: 'half', label: 'Image alt' },
      { name: 'app', kind: 'app', width: 'half', hint: 'Optional - links the post to an app' },
      { name: 'draft', kind: 'bool', width: 'half', hint: 'Hidden from the live build' },
    ],
  },
};

export function getCollection(id) {
  const c = COLLECTIONS[id];
  if (!c) throw new Error(`Unknown collection "${id}". Known: ${Object.keys(COLLECTIONS).join(', ')}`);
  return c;
}

/** Kept for the release script and the skill, which only ever write releases. */
export function entryFileName(app, version) {
  return COLLECTIONS.changelog.fileName({ app, version });
}

/** Guards an untrusted filename from the editor's HTTP layer. */
export function isSafeEntryName(name) {
  return typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/.test(name) && !name.includes('..');
}

/* ------------------------------------------------------------- compose --- */

/** Quote a YAML scalar only when it needs it. */
export function yamlString(value) {
  const s = String(value);
  if (s === '') return "''";
  if (/^[\w.][\w .,/-]*$/.test(s) && !/^\d+(\.\d+)?$/.test(s)) return s;
  return `'${s.replace(/'/g, "''")}'`;
}

/**
 * A folded block scalar, which is how the prose fields are written: it keeps
 * long text readable in the file and sidesteps every quoting question, since
 * nothing inside a folded block is special.
 */
function yamlFolded(value, indent = '  ') {
  const words = String(value).replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    // 76 content characters, so an indented line lands at 78 - the width the
    // existing hand-written entries use. Narrower and every file reflows the
    // first time it is saved.
    if (line && (line + ' ' + w).length > 76) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return ['>-', ...lines.map((l) => indent + l)].join('\n');
}

function asList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (value == null || value === '') return [];
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Entry object -> file text. Field order follows the collection definition,
 * which follows content.config.ts, so a hand-edited file and a generated one
 * look the same.
 */
export function serializeEntry(collectionId, data, body) {
  const collection = getCollection(collectionId);
  const fm = ['---'];

  for (const field of collection.fields) {
    const value = data[field.name];

    switch (field.kind) {
      case 'bool':
        if (value) fm.push(`${field.name}: true`);
        break;

      case 'preserved': {
        const map = value ?? {};
        const keys = Object.keys(map).filter((k) => map[k] !== undefined && map[k] !== null);
        if (keys.length === 0) break;
        fm.push(`${field.name}:`);
        for (const k of keys) {
          fm.push(`  ${k}: ${typeof map[k] === 'number' ? map[k] : yamlString(map[k])}`);
        }
        break;
      }

      case 'platforms': {
        const list = sortPlatforms(asList(value));
        if (list.length > 0) fm.push(`${field.name}: [${list.join(', ')}]`);
        break;
      }

      case 'flowlist': {
        const list = asList(value);
        if (list.length > 0) fm.push(`${field.name}: [${list.map(yamlString).join(', ')}]`);
        break;
      }

      case 'blocklist': {
        const list = asList(value);
        if (list.length === 0) break;
        fm.push(`${field.name}:`);
        for (const item of list) fm.push(`  - ${yamlString(item)}`);
        break;
      }

      case 'folded':
        if (value) fm.push(`${field.name}: ${yamlFolded(value)}`);
        break;

      case 'date':
        if (value) fm.push(`${field.name}: ${value}`);
        break;

      default:
        if (value !== undefined && value !== null && String(value) !== '') {
          fm.push(`${field.name}: ${yamlString(value)}`);
        }
    }
  }

  fm.push('---');

  const text = String(body ?? '').replace(/\r\n/g, '\n').trim();
  return `${fm.join('\n')}\n\n${text}\n`;
}

/* --------------------------------------------------------------- parse --- */

/**
 * File text -> { data, body }. Parsing goes through a real YAML parser rather
 * than a regex: these files get hand-edited, and a half-understood frontmatter
 * block would silently drop a field on the next save.
 */
export function parseEntry(text) {
  const normalized = String(text).replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(normalized);
  if (!m) throw new Error('No frontmatter block found (the file must start with ---).');

  const data = parseYaml(m[1]) ?? {};
  const body = normalized.slice(m[0].length).trim();

  // The YAML core schema leaves an unquoted date as a string, which is what the
  // editor wants in an <input type="date">. Normalise the other shapes anyway.
  for (const key of ['date', 'updated']) {
    if (data[key] instanceof Date) data[key] = data[key].toISOString().slice(0, 10);
    else if (data[key] != null) data[key] = String(data[key]).slice(0, 10);
  }
  if (data.version != null) data.version = String(data.version);
  for (const key of ['platforms', 'highlights', 'tags']) {
    if (key in data && !Array.isArray(data[key])) data[key] = data[key] ? [data[key]] : [];
  }

  return { data, body };
}

/* ------------------------------------------------------------ listings --- */

export function listEntries(collectionId) {
  const collection = getCollection(collectionId);
  if (!existsSync(collection.dir)) return [];

  const out = [];
  for (const file of readdirSync(collection.dir)) {
    if (!file.endsWith('.md')) continue;
    try {
      const { data } = parseEntry(readFileSync(join(collection.dir, file), 'utf8'));
      out.push({
        file,
        title: collection.titleOf(data) ?? file,
        app: data.app ?? null,
        version: data.version ?? null,
        date: data.date ?? null,
        draft: Boolean(data.draft),
      });
    } catch (e) {
      // A broken file should still be listed, so it can be opened and fixed
      // rather than disappearing from the editor.
      out.push({ file, title: file, app: null, version: null, date: null, draft: false, error: e.message });
    }
  }

  // Newest first, matching the site.
  return out.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
}

/** Image paths under public/, as site-absolute URLs, for the editor's picker. */
export function listMediaImages() {
  const exts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);
  const found = [];

  const walk = (dir, rel) => {
    let items;
    try {
      items = readdirSync(dir);
    } catch {
      return;
    }
    for (const item of items) {
      const full = join(dir, item);
      const relPath = `${rel}/${item}`;
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full, relPath);
      } else {
        const dot = item.lastIndexOf('.');
        if (dot !== -1 && exts.has(item.slice(dot).toLowerCase())) found.push(relPath);
      }
    }
  };

  walk(join(PUBLIC_DIR, 'media'), '/media');
  return found.sort();
}

/** Every tag already used across the blog, for the editor's suggestions. */
export function listTags() {
  const tags = new Set();
  for (const entry of listEntries('blog')) {
    try {
      const { data } = parseEntry(readFileSync(join(COLLECTIONS.blog.dir, entry.file), 'utf8'));
      for (const t of data.tags ?? []) tags.add(String(t));
    } catch {
      // Already surfaced by listEntries.
    }
  }
  return [...tags].sort();
}
