---
name: changelog-entry
description: Write a client-facing changelog entry for one of Aadhil's apps from a commit range, and file it into src/content/changelog/. Use when asked to write release notes, a changelog entry, or "what shipped" for a release - typically phrased with an app name, a version, and two commit hashes or tags. Handles GitHub repos (cloned to a temp directory and deleted) and local clones.
---

# Changelog entry from a commit range

Turn a range of commits in one of Aadhil's app repos into a release note a
customer would want to read, and write it into this repo as a markdown file.

This skill lives in the portfolio repo and is invoked from it, so it always has
`src/data/apps.ts`, the content schema, and the previously published entries to
hand. Everything it writes lands in `src/content/changelog/`.

## What you need before you start

Four things. Take whatever the user gave you in their message and ask - once,
in one message - only for what is genuinely missing.

| What | How to resolve it |
| --- | --- |
| **Repo** | **Mandatory, never guessed.** A GitHub URL, an `owner/name`, or a path to a local clone. |
| **Commit range** | Two hashes or tags. "Since the last release" is resolvable - see below. |
| **Platforms** | **Mandatory, never inferred** - one repo ships to several. Accepts "windows and mac", "flathub", "the Linux build". |
| **Version** | Ask if absent. Do not invent one or read it out of a manifest. |

Optional, only if the user mentions them: a title (otherwise you write one), a
screenshot path under `/media/...`, a download URL.

**Resolving "since the last release":** read the most recent entry for that app
in `src/content/changelog/` and use its `source.to` as the `from`. If no entry
has a `source` block, say so and ask for the starting hash rather than guessing.

**Resolving the app id:** match the repo against the `repos` arrays in
`src/data/apps.ts`. If nothing matches, ask which app it is and list the ids -
do not file a release against the wrong app. Note that several `repos` entries
in that file are unverified guesses.

## Getting the commits

**Local path** - read it in place, never modify it:

```bash
git -C <path> log --no-merges --pretty=format:'%H%x1e%s%x1e%b' <from>..<to>
```

**GitHub repo** - clone into the OS temp directory, and delete it when you are
done, including when something fails partway:

```bash
git clone --filter=blob:none "<repo-url>" "$TMPDIR/changelog-<app>-$$"
git -C "$TMPDIR/changelog-<app>-$$" log --no-merges --pretty=format:'%H%x1e%s%x1e%b' <from>..<to>
rm -rf "$TMPDIR/changelog-<app>-$$"
```

`--filter=blob:none` skips file contents, which you never need for a changelog
and which make these repos slow to clone. Never clone into this repo - nothing
should end up in the working tree but the entry file.

If `git log` fails because a hash is unknown, the range is probably the wrong
way round or the hash is from a different repo. Say which, rather than writing
an entry from an empty commit list.

## Writing the note

Read the last two or three published entries for that app in
`src/content/changelog/` before you write anything. Match their voice. That is
the point of running this from the portfolio repo.

**House style:**

- Write for someone who uses the app, not someone who works on it. "Large JSON
  files no longer freeze the window" - not "refactored the parser to stream".
- No commit hashes, branch names, file paths, or issue numbers in the body.
- Group under `## New`, `## Improvements`, `## Fixes`, `## Breaking changes`.
  Omit any heading with nothing under it. Breaking changes go first.
- Lead a bullet with what changed, in bold, then the detail. One or two
  sentences each.
- `summary` is one or two sentences for the list row - the single thing this
  release is about. `highlights` is three or four short bullets, also for the
  row, not full sentences.
- Auto-generate the `title`: a short phrase naming the headline change ("Split
  by file size"), not "Version 2.5.0". The version is already displayed beside
  it.
- Internal churn - dependency bumps, CI, refactors with no user-visible effect,
  test changes - does not appear at all.

**If the commits do not say what shipped** (bare subjects like "fix", "wip",
"update", or forty commits of noise), do not invent a narrative. Write what you
can actually support, then tell the user plainly which commits were unreadable
and ask them what those changed. A confident wrong release note is worse than a
short one.

## Filing it

Do not hand-write the markdown. Write a JSON file to a temp path and run:

```bash
node scripts/write-entry.mjs <path-to.json>
```

That goes through `scripts/lib/content.mjs`, so field order, YAML quoting and
the folded `summary` block come out identical to what the editor writes. The
accepted shape is documented at the top of `scripts/write-entry.mjs`.

Always include a `source` block - `repo` as `owner/name`, `from`, `to`, and
`commitCount`. That is what makes "since the last release" work next time.

**Write it as `draft: true`** (the default). These are public writing in
Aadhil's voice; he reads them before they ship. Never publish on his behalf.

## Finishing

Run `npm run build`. The zod schema in `src/content.config.ts` is the real
validator and will fail with the offending field named. Fix anything it reports
before you report success.

Then tell the user: the file you wrote, how many commits it covered, anything
you could not interpret, and that it is a draft they need to review and flip to
`draft: false`.

For small follow-up edits to the metadata, point them at `npm run admin`,
which opens a form with a live markdown preview.
