# aadhil.dev

Portfolio, changelog, and blog. Astro static build, deployed to Cloudflare
Pages at <https://aadhil.dev>.

## Running it

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on <http://localhost:4321>. Drafts are visible here. |
| `npm run build` | Static build into `dist/`. Drafts are excluded. |
| `npm run preview` | Serve the built `dist/` locally. |
| `npm run check` | Type-check the Astro + TypeScript sources. |
| `npm run admin` | Local editor for changelog entries and blog posts. See below. |
| `npm run release -- ...` | Scaffold a changelog entry from a commit range. See below. |

**Node 22.12 or newer** is required (Astro 7.3). Astro 7.4+ wants 22.23.4, so
once you upgrade Node you can move `astro` in `package.json` from `~7.3.8` to
`^7.4.0`.

## Layout

```
public/           Served as-is at the site root: media/ (screenshots and
                  the Linux release archives), favicon, resume, _headers,
                  .well-known/, and the standalone per-app privacy pages.
                  Paths here are live URLs - moving one breaks a Flatpak
                  manifest or a store listing.
src/
  data/apps.ts         The app registry. One entry per app.
  data/platforms.ts    The platform list (windows, macos, ios, ...).
  content.config.ts    Frontmatter schemas. A bad field fails the build.
  content/changelog/   One markdown file per release.
  content/blog/        One markdown file per post.
  lib/changelog.ts     Loads releases and assigns their URL slugs.
  components/          Rows, filters, artwork, nav, footer.
  layouts/             BaseLayout (head + booking script), PageLayout.
  pages/               index, changelog/, blog/.
  styles/              global.css (site-wide), changelog.css, prose.css.
```

## Adding a release

### The quick way

```bash
npm run release -- --repo https://github.com/aadhil-kh/SoliPDF --from v2.3.0 --to v2.4.0 --platform windows --version 2.4.0
```

`--platform` is mandatory and never inferred, because one repo can ship to
several platforms. Pass several with a comma: `--platform windows,macos`.
Shorthands `mac`, `win`, `ipad` are accepted.

The script resolves which app the repo belongs to, reads `git log <from>..<to>`,
groups the commits by conventional-commit type, and writes
`src/content/changelog/<app>-<version>.md` with `TODO` placeholders for the
summary and highlights. **It does not write prose** - the commit list is a
starting point you then edit into notes a user would want to read.

A private repo URL is cloned once into `.cache/release-repos/` (gitignored)
using your existing git credentials. A local clone path is read in place and
never modified.

Useful flags: `--dry-run` prints instead of writing, `--draft` hides the entry
from the live build, `--image /media/app/shot.png` sets the row screenshot,
`--app <id>` overrides repo detection, `--all` keeps chore/docs/ci commits.
Run `npm run release -- --help` for the rest.

> Running from Git Bash: it rewrites arguments that look like POSIX paths, so
> `--image /media/x.png` arrives mangled. The script detects and corrects this,
> but you can avoid it entirely with `MSYS_NO_PATHCONV=1` in front of the
> command.

### The admin editor

```bash
npm run admin
```

Opens a form at <http://127.0.0.1:4330> for creating and editing everything in
`src/content/` - changelog releases and blog posts, picked with the tabs at the
top. The app list, the platform list, the tags already in use and everything
under `public/media/` are offered as suggestions rather than typed from memory.
The body is a split pane: markdown on the left, live preview on the right,
rendered with the site's own `prose.css` so it looks like the page it will
become.

It is a dev tool, not part of the site - it lives in `scripts/`, never in
`src/pages/`, so it cannot be built or deployed, and it binds to the loopback
interface only. It writes nothing outside `src/content/`.

**Adding a collection** is a data change, not a UI change: add an entry to
`COLLECTIONS` in `scripts/lib/content.mjs` listing its fields, and the form,
the serializer and the validator all pick it up.

**Renaming on save differs by collection, because the two derive their URLs
differently.** A release's URL comes from its frontmatter (see
`src/lib/changelog.ts`), so changing the app or version renames the file to
match and breaks nothing. A post's URL *is* its filename, so its filename is
fixed when it is created and changing the title afterwards leaves the file -
and the published link - alone. The editor says which happened.

Fields the form does not show - the changelog `source` block in particular -
are preserved across an edit.

Saving normalises the frontmatter to a consistent shape, so a file written by
hand may come back with its `summary` wrapped at a different column the first
time it is saved. No parsed value changes, and a second save is a no-op.

The editor does not validate. `npm run build` does, and that is still the thing
that has to pass.

### The skill

`.claude/skills/changelog-entry/` writes a client-facing entry from a commit
range. Ask for it in plain language from this repo - "changelog for SoliPDF
2.5.0, windows, from abc123 to def456" - and it resolves the app, reads the
commits, matches the voice of the last few published entries for that app, and
files the result as a draft.

It lives in this repo rather than in `~/.claude/skills/` so it versions
alongside the schema it writes against and arrives on every machine with a
`git pull`.

A GitHub repo is cloned to a temp directory and deleted afterwards; a local
clone is read in place. Platforms are never inferred. The entry is always
written `draft: true` - release notes are public writing, so nothing publishes
without you reading it first.

It files entries through `scripts/write-entry.mjs`, which takes a JSON file and
goes through the same serializer the editor uses, so a generated entry and a
hand-edited one come out in the same shape.

### By hand

Drop a file into `src/content/changelog/`. The filename does not affect the URL
- that comes from `app` and `version`.

```yaml
---
app: solipdf              # must be an id from src/data/apps.ts
version: "2.4.0"
date: 2026-08-19
platforms: [windows]      # one or more
title: Split by file size # optional; defaults to "<App> <version>"
summary: >-               # optional; shown on the list row
  Split a PDF so each output lands under a size limit.
image: /media/solipdf/split-size.webp   # optional; a generated SVG card if omitted
imageAlt: Split by file size dialog
highlights:               # optional; up to 4 show on the row
  - Split a PDF to a target file size
downloadUrl: https://...  # optional
draft: false
---

## New

Markdown release notes go here.
```

Only `app`, `version`, `date`, and `platforms` are required. Anything else that
is wrong fails the build with the field named, rather than rendering broken.

## Adding a blog post

Drop a file into `src/content/blog/`. The filename is the URL slug.

```yaml
---
title: Shipping a WinUI 3 app to the Microsoft Store
description: One or two sentences, shown on the list row and in search results.
date: 2026-09-20
tags: [winui, windows]
image: /media/...        # optional; a generated SVG card if omitted
app: solipdf             # optional; links the post to an app
draft: false
---
```

## Adding an app

Add an entry to `APPS` in `src/data/apps.ts`. That one edit feeds the homepage
card, the changelog filter chips, and the release script's repo detection.

- `id` is the stable slug used by changelog frontmatter and URLs.
- `accent` tints the generated SVG artwork for releases with no screenshot.
- `repos` lets `npm run release` work out the app from a repo URL. Only
  `aadhil-kh/WebRendie` is confirmed; **the other repo slugs are guesses** -
  correct them, or pass `--app <id>` until you do.
- `listed: false` keeps an app off the homepage while still letting releases be
  filed against it.

## Adding a platform

Add it to `PLATFORM_IDS`, `PLATFORMS`, and `PLATFORM_ALIASES` in
`src/data/platforms.ts`, and mirror the id into `PLATFORM_ALIASES` in
`scripts/new-release.mjs`. Nothing else needs touching - filters, badges, and
validation all read from that list.

## Deployment

Cloudflare Pages builds this repo on every push to `main` through its GitHub
integration. There is no workflow file - adding one would only build the site
a second time.

Project settings:

| Setting                | Value           |
| ---------------------- | --------------- |
| Framework preset       | Astro           |
| Build command          | `npm run build` |
| Build output directory | `dist`          |
| Root directory         | `/`             |

`.nvmrc` pins Node 22 for the build image; Astro 7.3 needs >= 22.12 and an
older default would fail the install.

The custom domain is set in the Pages dashboard, not in the repo - Cloudflare
has no use for a `CNAME` file, and the apex record is managed in Cloudflare DNS.

`public/_headers` sets caching and a couple of security headers. Everything
under `/_astro/` and `/media/releases/` is content-addressed or version-named,
so both are immutable; `/.well-known/` is kept short-lived because Flathub
re-reads it.

Note that Cloudflare Pages serves `.html` files at their extensionless path and
308-redirects the `.html` URL to it, so `/solipdf/privacy.html` becomes
`/solipdf/privacy`. Existing store and Flathub links still resolve through the
redirect.

## Sample content

Everything currently in `src/content/` is sample data marked `draft: true`. It
renders in `npm run dev` so you can see the UI, and is excluded from the live
build. Delete it once your real entries land.
