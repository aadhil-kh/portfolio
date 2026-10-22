---
title: Rebuilding aadhil.dev on Astro
description: >-
  Why I moved a hand-written index.html to an Astro static build - and why the
  interesting part was not the framework, but keeping every existing URL alive.
date: 2026-10-22
tags: [astro, cloudflare, web]
---

For years this site was a single `index.html` I edited by hand. It did the job
while it was only a profile page, but it quietly limited what I could do. Every
app release meant either writing no release notes at all, or putting them
somewhere nobody would find them.

## What I actually wanted

Not a framework. Two things: a [changelog](/changelog) I would keep up to date,
and somewhere to write. Both are content problems, and hand-written HTML is a
poor place to keep content.

Astro turned out to be the right size for the job. The built site is still a
pile of static files - no server, no client-side router, no JavaScript shipped
to pages that do not need any. What changed is that releases and posts are now
markdown files with a schema in front of them.

## The schema is the point

Every release and every post has its frontmatter validated at build time. A
missing date, or an app id that does not exist, fails the build and names the
offending field - rather than rendering a broken row I notice three weeks
later.

That sounds like a small thing. It is the difference between a changelog I
trust and one I have to proofread.

## Not breaking anything on the way

The real constraint was that every existing URL had to keep working. The
Flatpak manifests for my Linux builds fetch their release archives straight off
this domain, and several store listings point at privacy pages here. A broken
URL in that set is a broken install, not a 404 someone shrugs at.

So the old paths moved across untouched, and I diffed the built output against
the old site before shipping - rather than assuming a reorganisation had been
harmless.

## Where it runs

Cloudflare Pages, built on push. Deliberately boring.
