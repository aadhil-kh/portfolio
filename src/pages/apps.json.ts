import type { APIRoute } from 'astro';
import { APPS, type AppDef } from '../data/apps';
import type { Platform } from '../data/platforms';

/**
 * The "more apps from me" catalog, served at https://aadhil.dev/apps.json.
 *
 * ## This file is consumed by my shipped Windows apps
 *
 * Every Windows app embeds `FluentKit.Controls.MyApps`, whose dialog fetches
 * this URL over https and caches it for 24 hours. The URL is hardcoded in the
 * kit, so editing `src/data/apps.ts` and redeploying updates the dialog in
 * every app already on the Store - no rebuild, no resubmission.
 *
 * **`id` values are permanent.** Each app passes its own id to the dialog to
 * exclude itself from its own list, so a shipped id that changes here makes
 * that app list itself. Renaming an app is fine; renaming its `id` is not.
 *
 * ## Why an endpoint rather than a file in public/
 *
 * Same reason as robots.txt.ts: it is generated from `apps.ts` on every build
 * and every dev request, so it cannot drift from the registry, and the icon
 * URLs follow `site` instead of being hardcoded. There is no second copy of
 * the app list to maintain.
 *
 * ## The consumer is strict about three things
 *
 * - `uri` must be the platform's own deep-link scheme. A URI in the wrong
 *   scheme is dropped along with the whole listing.
 * - `webUri` must be https, and every non-Windows listing needs one: on a
 *   Windows machine only `ms-windows-store://` resolves, so the other five
 *   platforms are reached through their web page, which is also what the
 *   dialog's QR code carries.
 * - `icon` must be https. An http icon is silently dropped.
 *
 * Rows it cannot use are dropped silently, so STORES below derives every deep
 * link from the store URL already in `apps.ts` and throws on a URL it does not
 * recognise. A Store listing moving to a new URL shape fails the build here
 * rather than going quietly missing from the dialog.
 */

/** The only platform ids the dialog accepts. */
type CatalogPlatform = 'windows' | 'android' | 'ios' | 'macos' | 'snap' | 'flatpak';

interface Listing {
  platform: CatalogPlatform;
  uri: string;
  webUri?: string;
}

/** Emission order within an app's `listings`; the dialog shows them as given. */
const PLATFORM_ORDER: CatalogPlatform[] = ['windows', 'macos', 'ios', 'android', 'flatpak', 'snap'];

/**
 * How each `links.stores` key in apps.ts becomes a catalog listing.
 *
 * Note `ipados` and `ios` both map to the iOS App Store - one listing per
 * platform is allowed, so whichever comes first in PLATFORM_ORDER terms wins
 * and the duplicate is dropped (they share an App Store id anyway).
 *
 * `linux` dispatches on the host, because Flathub and the Snap Store are two
 * different platforms to the dialog but share one key here.
 */
const STORES: Partial<Record<Platform, (url: string) => Listing>> = {
  // https://apps.microsoft.com/detail/9PG1FWD0JRFM -> ms-windows-store://pdp/?productid=9PG1FWD0JRFM
  windows: (url) => ({
    platform: 'windows',
    uri: `ms-windows-store://pdp/?productid=${match(url, /^https:\/\/apps\.microsoft\.com\/detail\/([0-9a-z]+)/i, 'a Microsoft Store product URL').toUpperCase()}`,
    webUri: url,
  }),

  // https://apps.apple.com/us/app/json-tools/id1526081216 -> macappstore://apps.apple.com/app/id1526081216
  macos: (url) => ({
    platform: 'macos',
    uri: `macappstore://apps.apple.com/app/id${appleId(url)}`,
    webUri: url,
  }),
  ios: (url) => ({ platform: 'ios', uri: `itms-apps://apps.apple.com/app/id${appleId(url)}`, webUri: url }),
  ipados: (url) => ({ platform: 'ios', uri: `itms-apps://apps.apple.com/app/id${appleId(url)}`, webUri: url }),

  // https://play.google.com/store/apps/details?id=dev.aadhil.x -> market://details?id=dev.aadhil.x
  android: (url) => {
    const pkg = match(
      url,
      /^https:\/\/play\.google\.com\/store\/apps\/details\?id=([A-Za-z0-9._]+)/,
      'a Google Play listing URL',
    );
    return { platform: 'android', uri: `market://details?id=${pkg}`, webUri: url };
  },

  linux: (url) => {
    // https://flathub.org/en/apps/dev.aadhil.devtpro -> appstream://dev.aadhil.devtpro
    if (/^https:\/\/flathub\.org\//.test(url)) {
      const appId = match(url, /^https:\/\/flathub\.org\/(?:[a-z]{2}\/)?apps\/([A-Za-z0-9._-]+)/, 'a Flathub app URL');
      // The locale segment is dropped: /apps/<id> redirects to the visitor's own.
      return { platform: 'flatpak', uri: `appstream://${appId}`, webUri: `https://flathub.org/apps/${appId}` };
    }
    if (/^https:\/\/snapcraft\.io\//.test(url)) return snapListing(url);
    throw new Error(`apps.json: links.stores.linux is neither a Flathub nor a Snap Store URL: ${url}`);
  },
};

/** https://snapcraft.io/webrendie -> snap://webrendie */
function snapListing(url: string): Listing {
  const name = match(url, /^https:\/\/snapcraft\.io\/([a-z0-9-]+)\/?$/, 'a Snap Store URL');
  return { platform: 'snap', uri: `snap://${name}`, webUri: `https://snapcraft.io/${name}` };
}

function match(url: string, re: RegExp, expected: string): string {
  const m = re.exec(url);
  if (!m) throw new Error(`apps.json: ${url} is not ${expected}. Update STORES in apps.json.ts.`);
  return m[1];
}

const appleId = (url: string) =>
  match(url, /^https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/[^/]+\/id(\d+)/, 'an App Store listing URL');

function listingsFor(app: AppDef): Listing[] {
  const found: Listing[] = [];
  for (const [key, url] of Object.entries(app.links.stores ?? {})) {
    const build = STORES[key as Platform];
    if (build && url) found.push(build(url));
  }
  if (app.links.snap) found.push(snapListing(app.links.snap));

  // One listing per platform - a second for the same platform is dropped by
  // the dialog anyway, so drop it here where it is visible.
  const seen = new Set<CatalogPlatform>();
  return PLATFORM_ORDER.flatMap((p) => {
    const hit = found.find((l) => l.platform === p);
    if (!hit || seen.has(p)) return [];
    seen.add(p);
    return [hit];
  });
}

export const GET: APIRoute = ({ site }) => {
  const apps = APPS.map((app) => {
    const listings = listingsFor(app);
    if (app.id.trim() !== app.id || /\s/.test(app.id)) {
      throw new Error(`apps.json: id "${app.id}" contains whitespace; the dialog requires a stable, unbroken id.`);
    }
    return { app, listings };
  })
    // An app with nowhere to install it from is not something the dialog can
    // offer, so it is left out rather than shown as an unopenable row.
    .filter(({ listings }) => listings.length > 0)
    .map(({ app, listings }) => ({
      id: app.id,
      // The short `name`, not `title` - the dialog row is narrow and the
      // description already carries what the long title would say.
      name: app.name,
      description: app.description,
      // apps.ts stores icons site-relative; the dialog needs an absolute https
      // URL. `site` is https://aadhil.dev, so this is https by construction.
      ...(app.icon ? { icon: new URL(app.icon, site).href } : {}),
      listings,
    }));

  return new Response(
    JSON.stringify(
      {
        title: 'More from Aadhil',
        subtitle: 'Small, fast apps for every device you own.',
        apps,
      },
      null,
      2,
    ) + '\n',
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // The dialog caches for 24h of its own accord; this keeps an edge cache
        // from holding a stale list for longer than that.
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
};
