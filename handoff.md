## What's there

**Astro at the root**, `site: https://aadhil.dev`, `base: /`. Your old `index.html` is now [src/pages/index.astro](src/pages/index.astro) — a faithful migration, verified by counting: 6 app cards, 10 store badges, 35 screenshot thumbs, identical experience durations (`10 yrs 5 mos total`), cal.com rewriting, and the carousel driven end to end (open at index 3 of 9, next, arrow keys, Escape, body-scroll restore). The app list now renders at build time instead of client JS.

**Changelog** ([src/pages/changelog/index.astro](src/pages/changelog/index.astro)) — filter by app, filter by platform, sort asc/desc, all client-side over statically rendered rows. State lives in the URL (`?app=…&platform=…&sort=asc`) so a filtered view is shareable and survives reload. Verified: every filter combination, sort flip, clear, and URL restore.

**Card rows** alternate artwork left/right. The alternation is recomputed over *visible* rows by the filter script, so filtering never leaves a gap in the zig-zag.

**Artwork** ([CardArtwork.astro](src/components/CardArtwork.astro)) — your screenshot if `image:` is set, otherwise a generated SVG card with app name + version tinted by the app's accent. I hit a real bug here: SVG `<text>` doesn't wrap, so long titles were clipped mid-word. It now word-wraps at build time with a 3-line cap and ellipsis, and centres the block so the `slice` crop can't eat it. Re-verified: zero clipped text across every card.

**Pluggability** is one registry, [src/data/apps.ts](src/data/apps.ts). Adding an app feeds the homepage card, the filter chips, and the release script's repo detection. Adding a release is one markdown file; [content.config.ts](src/content.config.ts) fails the build with the offending field named rather than rendering broken.

## The script

```bash
npm run release -- --repo https://github.com/aadhil-kh/SoliPDF --from v2.3.0 --to v2.4.0 --platform windows,macos --version 2.4.0
```

`--platform` is mandatory and never inferred. Private URLs clone once into gitignored `.cache/`; local paths are read in place. Tested against a synthetic repo: `feat!`/`BREAKING-CHANGE` → Breaking changes, `feat` → New, `perf`/`refactor` → Improvements, `fix` → Fixes, `chore`/`docs`/`ci` dropped, scopes bolded. Three bugs found and fixed by testing rather than assuming — bare `TODO:` parsed as a YAML mapping, Git Bash mangling `--image /media/x.png` into `C:/Program Files/Git/media/x.png`, and absolute local paths leaking into `source.repo`.

## On the agent skill — yes, but a thin one

The script deliberately stops at a commit list and writes `TODO` placeholders. It will never write prose, because grouping commits is mechanical and summarising a release is judgment. That judgment pass is exactly the seam for a skill:

> run the script → read the generated file → read the last 2–3 entries for that app to match tone → rewrite summary/highlights/body → `npm run build` to validate.

A **skill**, not a subagent. It's a repeatable procedure with a house style that you invoke on demand, and living in this repo it gets `apps.ts` and your prior entries as tone reference for free. A subagent would start cold and re-derive all of that. Keep the editing pass reviewable — release notes are public writing in your voice, and you'll want to read them before they ship anyway. Say the word and I'll build it.

## Three things need you

1. **Repo settings → Pages → Source → GitHub Actions.** Until you flip this the site keeps serving old branch-root content and nothing I did goes live. This is the only step I can't do.
2. **The repo slugs in `apps.ts` are guesses** except `aadhil-kh/WebRendie`, which I confirmed from your WebRendie privacy page. Correct them or pass `--app <id>`. I flagged this in the code and the README rather than letting it look authoritative.
3. **A cal.com discrepancy I didn't resolve:** your `index.html` used `data-book-call="zoho-audit"`, but my note from your earlier work says the slug is `zoho-crm-audit`. I preserved the HTML verbatim — migration shouldn't silently change behaviour — but one of them is wrong and only you know which.

Also: all sample content is `draft: true`, so it renders in `npm run dev` but is excluded from the production build — nothing I invented can reach your live site. `npm run build` currently emits 3 pages for that reason. Node note: `astro@7.4` wants Node ≥22.23.4 and you're on 22.19.0, so I pinned `~7.3.8` — the earliest release patching a critical advisory, needing only ≥22.12. Upgrade Node and you can move to `^7.4.0`.

Everything is staged but **not committed** — `git status` to review, and the dev server is still up on :4321.