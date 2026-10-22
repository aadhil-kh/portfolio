#!/usr/bin/env node
/**
 * Scaffold a changelog entry from a commit range in one of my app repos.
 *
 *   npm run release -- --repo <url|path> --from <hash> --to <hash> \
 *                      --platform windows,macos --version 9.0.2
 *
 * What it does:
 *   1. Resolves which app the repo belongs to (src/data/apps.ts `repos`).
 *   2. Reads `git log <from>..<to>` from that repo.
 *   3. Groups the commits by conventional-commit type.
 *   4. Writes src/content/changelog/<app>-<version>.md with the frontmatter
 *      the content schema expects, and the grouped commits as the body.
 *
 * It deliberately does NOT try to write prose. The commit list is a faithful,
 * reviewable starting point; turning it into release notes a user would want
 * to read is a separate editing pass (see CHANGELOG.md in the repo root).
 *
 * A private repo URL is cloned into .cache/release-repos/ using whatever git
 * credentials you already have. A local path is read in place and never
 * modified.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  CONTENT_DIR,
  PLATFORM_IDS,
  ROOT,
  entryFileName,
  normalizePlatform,
  readAppRegistry,
  repoSlug,
  sortPlatforms,
  todayLocal,
  yamlString,
} from './lib/content.mjs';

const CACHE_DIR = join(ROOT, '.cache', 'release-repos');

/* ---------------------------------------------------------------- args --- */

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq !== -1) {
      out[a.slice(2, eq)] = a.slice(eq + 1);
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      out[a.slice(2)] = argv[++i];
    } else {
      out[a.slice(2)] = true;
    }
  }
  return out;
}

/**
 * Git Bash (MSYS) rewrites an argument that looks like a POSIX absolute path
 * into a Windows path before node ever sees it, so `--image /media/x.png`
 * arrives as "C:/Program Files/Git/media/x.png". Recover the intended value
 * rather than writing a broken src into the site.
 */
function unmanglePath(value, flag) {
  if (!value) return value;
  const s = String(value);
  if (/^https?:\/\//i.test(s)) return s;

  const forward = s.split('\\').join('/');
  const m = /^[A-Za-z]:\/.*?(\/(?:media|assets)\/.*)$/.exec(forward);
  if (m) {
    console.error(
      `Note: --${flag} arrived as a Windows path ("${s}").\n` +
        `      Git Bash rewrites POSIX-looking arguments. Using "${m[1]}" instead.\n` +
        `      To avoid this, prefix the command with MSYS_NO_PATHCONV=1.`,
    );
    return m[1];
  }
  return s;
}

const USAGE = `
Usage:
  npm run release -- --repo <url|path> --from <hash> --to <hash> \\
                     --platform <list> --version <version> [options]

Required:
  --repo <url|path>   Repo URL (private is fine) or a local clone path.
  --from <hash>       First commit of the range, exclusive.
  --to <hash>         Last commit of the range, inclusive. Defaults to HEAD.
  --platform <list>   Comma-separated: windows,macos,ios,ipados,android,linux,web
                      ("mac", "win", "ipad" also accepted). Mandatory - one repo
                      can ship to several platforms, so it is never inferred.
  --version <ver>     Release version, e.g. 9.0.2

Options:
  --app <id>          Override app detection (use when --repo is not yet listed
                      in src/data/apps.ts).
  --date <YYYY-MM-DD> Release date. Defaults to today.
  --title <text>      Headline. Defaults to "<App> <version>".
  --image <path>      Screenshot for the row, e.g. /media/devtpro/hero.png
  --download <url>    Direct download or store link for this build.
  --all               Keep chore/docs/ci/test/build/style commits too.
  --draft             Write it with draft: true (hidden from the live build).
  --force             Overwrite an existing file for this app + version.
  --dry-run           Print the file instead of writing it.
`;

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  console.log(USAGE);
  process.exit(0);
}

function fail(msg) {
  console.error(`\nError: ${msg}\n${USAGE}`);
  process.exit(1);
}

/* ------------------------------------------------------------- git read --- */

function git(cwd, gitArgs) {
  return execFileSync('git', gitArgs, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * Returns a working directory to run git log in. A local path is used as-is;
 * a URL is mirrored into .cache/release-repos and fetched.
 */
function resolveRepoDir(repo) {
  const asPath = resolve(ROOT, repo);
  if (existsSync(join(asPath, '.git')) || existsSync(join(asPath, 'HEAD'))) {
    // Record where the code actually lives, not the path it was read from.
    let origin = null;
    try {
      origin = git(asPath, ['remote', 'get-url', 'origin']).trim() || null;
    } catch {
      // No origin configured; the app id in the frontmatter is enough.
    }
    return { dir: asPath, local: true, origin };
  }

  const slug = repoSlug(repo);
  const cacheKey = slug.replace(/[^A-Za-z0-9._-]+/g, '-');
  const dir = join(CACHE_DIR, cacheKey);

  mkdirSync(CACHE_DIR, { recursive: true });

  if (existsSync(join(dir, 'HEAD'))) {
    console.error(`Fetching ${slug} ...`);
    git(dir, ['fetch', '--all', '--tags', '--prune']);
  } else {
    console.error(`Cloning ${slug} (this happens once) ...`);
    // A bare mirror: no working tree to check out, and every ref available.
    git(CACHE_DIR, ['clone', '--mirror', repo, dir]);
  }
  return { dir, local: false };
}

const TYPE_GROUPS = [
  { key: 'feat', heading: 'New' },
  { key: 'perf', heading: 'Improvements' },
  { key: 'refactor', heading: 'Improvements' },
  { key: 'fix', heading: 'Fixes' },
];
const NOISE_TYPES = new Set(['chore', 'ci', 'docs', 'test', 'build', 'style']);

function collectCommits(dir, from, to, keepAll) {
  const range = from ? `${from}..${to}` : to;
  const SEP = '\x1e';
  let raw;
  try {
    raw = git(dir, ['log', '--no-merges', `--pretty=format:%H${SEP}%s${SEP}%b${SEP}%an`, range]);
  } catch (e) {
    const stderr = (e.stderr || '').toString().trim();
    fail(`git log ${range} failed.\n${stderr || e.message}`);
  }

  const commits = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const [hash, subject, body, author] = line.split(SEP);
    if (!hash) continue;

    // Conventional commit: type(scope)!: description
    const m = /^(\w+)(\([^)]*\))?(!)?:\s*(.+)$/.exec(subject ?? '');
    const type = m ? m[1].toLowerCase() : null;
    const scope = m?.[2]?.slice(1, -1) ?? null;
    const breaking = Boolean(m?.[3]) || /BREAKING[ -]CHANGE/.test(body ?? '');
    const description = m ? m[4] : (subject ?? '').trim();

    if (!keepAll && type && NOISE_TYPES.has(type)) continue;

    commits.push({ hash: hash.slice(0, 8), type, scope, breaking, description, author });
  }
  return commits;
}

function groupCommits(commits) {
  const groups = new Map();
  const push = (heading, c) => {
    if (!groups.has(heading)) groups.set(heading, []);
    groups.get(heading).push(c);
  };

  for (const c of commits) {
    if (c.breaking) {
      push('Breaking changes', c);
      continue;
    }
    const g = TYPE_GROUPS.find((t) => t.key === c.type);
    push(g ? g.heading : 'Other changes', c);
  }

  // Stable, meaningful order rather than insertion order.
  const order = ['Breaking changes', 'New', 'Improvements', 'Fixes', 'Other changes'];
  return order.filter((h) => groups.has(h)).map((h) => [h, groups.get(h)]);
}

/* ------------------------------------------------------------- compose --- */

function buildMarkdown({ app, appName, version, date, platforms, title, image, download, draft, repo, from, to, commits }) {
  const groups = groupCommits(commits);

  const fm = [
    '---',
    `app: ${app}`,
    `version: ${yamlString(version)}`,
    `date: ${date}`,
    `platforms: [${platforms.join(', ')}]`,
    `title: ${yamlString(title)}`,
    "summary: >-",
    '  TODO: one or two sentences on what this release is about.',
  ];
  if (image) fm.push(`image: ${yamlString(image)}`);
  if (download) fm.push(`downloadUrl: ${yamlString(download)}`);
  fm.push('highlights:');
  fm.push(`  - ${yamlString('TODO: a short bullet for the list row')}`);
  // Only record provenance we can actually act on. A local checkout with no
  // remote would otherwise bake someone's absolute path into the site.
  const sourceSlug = repo ? repoSlug(repo) : null;
  const slugLooksRemote = sourceSlug && /^[\w.-]+\/[\w.-]+$/.test(sourceSlug);
  fm.push('source:');
  if (slugLooksRemote) fm.push(`  repo: ${yamlString(sourceSlug)}`);
  if (from) fm.push(`  from: ${yamlString(from)}`);
  fm.push(`  to: ${yamlString(to)}`);
  fm.push(`  commitCount: ${commits.length}`);
  if (draft) fm.push('draft: true');
  fm.push('---');

  const body = [''];
  if (groups.length === 0) {
    body.push(`No commits found in that range for ${appName}.`, '');
  }
  for (const [heading, list] of groups) {
    body.push(`## ${heading}`, '');
    for (const c of list) {
      const scope = c.scope ? `**${c.scope}:** ` : '';
      body.push(`- ${scope}${c.description} (${c.hash})`);
    }
    body.push('');
  }

  return fm.join('\n') + '\n' + body.join('\n');
}

/* ----------------------------------------------------------------- main --- */

const repo = args.repo;
const version = args.version;
const platformArg = args.platform ?? args.platforms;

if (!repo) fail('--repo is required.');
if (!version) fail('--version is required.');
if (!platformArg || platformArg === true) fail('--platform is required (it is never inferred).');

const platforms = String(platformArg)
  .split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean)
  .map((p) => {
    const id = normalizePlatform(p);
    if (!id) fail(`Unknown platform "${p}". Known: ${PLATFORM_IDS.join(', ')}`);
    return id;
  });

const uniquePlatforms = sortPlatforms(platforms);

const registry = readAppRegistry();
const slug = repoSlug(repo);

let app;
if (args.app) {
  app = registry.find((a) => a.id === args.app);
  if (!app) {
    fail(`--app "${args.app}" is not in src/data/apps.ts. Known ids:\n  ${registry.map((a) => a.id).join('\n  ')}`);
  }
} else {
  app = registry.find(
    (a) => a.id.toLowerCase() === slug.toLowerCase() || a.repos.some((r) => r.toLowerCase() === slug.toLowerCase()),
  );
  if (!app) {
    fail(
      `Could not work out which app "${slug}" belongs to.\n` +
        `Either add it to that app's \`repos\` in src/data/apps.ts, or pass --app <id>.\n` +
        `Known ids:\n  ${registry.map((a) => a.id).join('\n  ')}`,
    );
  }
}

const to = args.to && args.to !== true ? String(args.to) : 'HEAD';
const from = args.from && args.from !== true ? String(args.from) : null;
if (!from) {
  console.error('Note: no --from given, so the whole history up to --to is used.');
}

const { dir, origin } = resolveRepoDir(repo);
const commits = collectCommits(dir, from, to, Boolean(args.all));

const date = args.date && args.date !== true ? String(args.date) : todayLocal();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`--date must be YYYY-MM-DD, got "${date}".`);

const title = args.title && args.title !== true ? String(args.title) : `${app.name} ${version}`;

const markdown = buildMarkdown({
  app: app.id,
  appName: app.name,
  version,
  date,
  platforms: uniquePlatforms,
  title,
  image: args.image && args.image !== true ? unmanglePath(args.image, 'image') : null,
  download: args.download && args.download !== true ? unmanglePath(args.download, 'download') : null,
  draft: Boolean(args.draft),
  repo: origin ?? repo,
  from,
  to,
  commits,
});

const outPath = join(CONTENT_DIR, entryFileName(app.id, version));

if (args['dry-run']) {
  console.error(`--- would write ${outPath} (${commits.length} commits) ---\n`);
  process.stdout.write(markdown);
  process.exit(0);
}

if (existsSync(outPath) && !args.force) {
  fail(`${outPath} already exists. Pass --force to overwrite.`);
}

mkdirSync(CONTENT_DIR, { recursive: true });
writeFileSync(outPath, markdown, 'utf8');

console.error(`\nWrote ${outPath}`);
console.error(`  app        ${app.id} (${app.name})`);
console.error(`  version    ${version}`);
console.error(`  platforms  ${uniquePlatforms.join(', ')}`);
console.error(`  commits    ${commits.length}`);
console.error(`\nNext: fill in the TODO summary and highlights, then rewrite the`);
console.error(`commit list into notes a user would want to read.`);
console.error(`Preview with: npm run dev\n`);
