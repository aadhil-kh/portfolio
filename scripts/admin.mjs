#!/usr/bin/env node
/**
 * A local-only editor for this site's content.
 *
 *   npm run admin
 *
 * Opens a form at http://127.0.0.1:4330 for creating and editing the markdown
 * in src/content/ - changelog releases and blog posts - with the app list, the
 * platform list, existing tags and the media folder offered as suggestions
 * rather than typed from memory. The body is a split pane: markdown on the
 * left, live preview on the right.
 *
 * Collections are defined in scripts/lib/content.mjs. Both the form and the
 * serializer are driven from that one field list, so adding a collection is a
 * data change rather than a UI change.
 *
 * This is a dev tool, not part of the site: it lives in scripts/, never in
 * src/pages/, so it cannot be built or deployed. It binds to the loopback
 * interface only and writes nothing outside src/content/.
 *
 * It does not validate - `npm run build` does, against the zod schemas in
 * src/content.config.ts, and that remains the thing that has to pass.
 */

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COLLECTIONS,
  PLATFORM_IDS,
  PLATFORM_LABELS,
  ROOT,
  getCollection,
  isSafeEntryName,
  listEntries,
  listMediaImages,
  listTags,
  parseEntry,
  readAppRegistry,
  serializeEntry,
  todayLocal,
} from './lib/content.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = join(HERE, 'editor', 'index.html');
const PORT = Number(process.env.PORT ?? 4330);

/**
 * The preview pane renders markdown in the browser rather than round-tripping
 * every keystroke, so marked's ESM build is served straight out of
 * node_modules. prose.css is the site's own stylesheet, served verbatim, so
 * the preview tracks the real pages instead of drifting from them.
 */
const STATIC_FILES = {
  '/vendor/marked.esm.js': {
    path: join(ROOT, 'node_modules', 'marked', 'lib', 'marked.esm.js'),
    type: 'text/javascript; charset=utf-8',
  },
  '/site/prose.css': {
    path: join(ROOT, 'src', 'styles', 'prose.css'),
    type: 'text/css; charset=utf-8',
  },
};

/* ---------------------------------------------------------------- utils --- */

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // These are posts and release notes, not uploads; anything this large is a
    // mistake.
    if (size > 2 * 1024 * 1024) throw new Error('Request body too large.');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/**
 * Resolve a filename from the request to a path inside the collection's
 * directory, or throw. Belt and braces: the name is pattern-checked, then the
 * resolved path is confirmed to still be inside that directory.
 */
function entryPath(collection, name) {
  if (!isSafeEntryName(name)) throw new Error(`Refusing to touch "${name}".`);
  const full = resolve(collection.dir, name);
  if (dirname(full) !== resolve(collection.dir)) throw new Error(`Refusing to touch "${name}".`);
  return full;
}

/** The fields the form owns. Anything marked `preserved` survives untouched. */
function entryFromPayload(collection, payload, existing) {
  const data = {};

  for (const field of collection.fields) {
    if (field.kind === 'preserved') {
      data[field.name] = existing?.[field.name];
      continue;
    }

    let value = payload[field.name];

    if (field.kind === 'bool') {
      data[field.name] = Boolean(value);
      continue;
    }

    if (field.kind === 'platforms') {
      value = (Array.isArray(value) ? value : []).filter((p) => PLATFORM_IDS.includes(p));
      if (field.required && value.length === 0) throw new Error(`Pick at least one ${field.name.replace(/s$/, '')}.`);
      data[field.name] = value;
      continue;
    }

    if (field.kind === 'flowlist' || field.kind === 'blocklist') {
      data[field.name] = (Array.isArray(value) ? value : [])
        .map((v) => String(v).trim())
        .filter(Boolean);
      continue;
    }

    if (field.kind === 'date') {
      const s = String(value ?? '').trim();
      if (!s) {
        if (field.required) data[field.name] = todayLocal();
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`${field.name} must be YYYY-MM-DD, got "${s}".`);
      data[field.name] = s;
      continue;
    }

    const s = String(value ?? '').trim();
    if (field.required && !s) throw new Error(`${field.label ?? field.name} is required.`);
    data[field.name] = s === '' ? undefined : s;
  }

  return data;
}

function writeEntry(collection, payload, { currentFile }) {
  let existing;
  if (currentFile) {
    const { data } = parseEntry(readFileSync(entryPath(collection, currentFile), 'utf8'));
    existing = data;
  }

  const data = entryFromPayload(collection, payload, existing);

  // Renaming is a per-collection decision. A release's URL comes from its
  // frontmatter, so its file can be renamed freely; a post's URL *is* its
  // filename, so renaming one would break the published link.
  const renaming =
    collection.renameOnChange &&
    Boolean(existing) &&
    collection.fileName(existing) !== collection.fileName(data);

  const target = currentFile && !renaming ? currentFile : collection.fileName(data);
  if (!target || target === '.md') throw new Error('Could not work out a filename - is the title empty?');

  const targetPath = entryPath(collection, target);
  if ((!currentFile || renaming) && existsSync(targetPath)) {
    throw new Error(`${target} already exists.`);
  }

  mkdirSync(collection.dir, { recursive: true });
  writeFileSync(targetPath, serializeEntry(collection.id, data, payload.body ?? ''), 'utf8');

  if (renaming) rmSync(entryPath(collection, currentFile), { force: true });

  return {
    file: target,
    renamedFrom: renaming ? currentFile : null,
    // Surfaced in the UI: the title changed but the URL deliberately did not.
    filenameFixed:
      !collection.renameOnChange && Boolean(currentFile) && collection.fileName(data) !== currentFile,
  };
}

/* -------------------------------------------------------------- routing --- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  try {
    if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
      const html = readFileSync(PAGE);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': html.length,
        'Cache-Control': 'no-store',
      });
      return res.end(html);
    }

    const asset = req.method === 'GET' ? STATIC_FILES[path] : undefined;
    if (asset) {
      const file = readFileSync(asset.path);
      res.writeHead(200, {
        'Content-Type': asset.type,
        'Content-Length': file.length,
        'Cache-Control': 'no-store',
      });
      return res.end(file);
    }

    if (req.method === 'GET' && path === '/api/meta') {
      return json(res, 200, {
        collections: Object.values(COLLECTIONS).map((c) => ({
          id: c.id,
          label: c.label,
          renameOnChange: c.renameOnChange,
          fields: c.fields.filter((f) => f.kind !== 'preserved'),
        })),
        apps: readAppRegistry().map(({ id, name }) => ({ id, name })),
        platforms: PLATFORM_IDS.map((id) => ({ id, label: PLATFORM_LABELS[id] })),
        images: listMediaImages(),
        tags: listTags(),
        today: todayLocal(),
      });
    }

    const list = /^\/api\/([a-z]+)\/entries$/.exec(path);
    if (list) {
      const collection = getCollection(list[1]);

      if (req.method === 'GET') return json(res, 200, { entries: listEntries(collection.id) });

      if (req.method === 'POST') {
        const payload = await readBody(req);
        return json(res, 201, writeEntry(collection, payload, { currentFile: null }));
      }
    }

    const one = /^\/api\/([a-z]+)\/entries\/(.+)$/.exec(path);
    if (one) {
      const collection = getCollection(one[1]);
      const name = decodeURIComponent(one[2]);

      if (req.method === 'GET') {
        const full = entryPath(collection, name);
        if (!existsSync(full)) return json(res, 404, { error: `${name} not found.` });
        const { data, body } = parseEntry(readFileSync(full, 'utf8'));
        return json(res, 200, { file: name, data, body });
      }

      if (req.method === 'PUT') {
        const payload = await readBody(req);
        return json(res, 200, writeEntry(collection, payload, { currentFile: name }));
      }
    }

    return json(res, 404, { error: 'Not found.' });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
});

// Loopback only. This writes to the working tree, so it has no business being
// reachable from the network.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\nContent admin   http://127.0.0.1:${PORT}`);
  console.log(`Collections     ${Object.keys(COLLECTIONS).join(', ')}`);
  console.log(`\nValidate with   npm run build`);
  console.log(`Stop with       Ctrl+C\n`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Try: PORT=4331 npm run admin\n`);
    process.exit(1);
  }
  throw e;
});
