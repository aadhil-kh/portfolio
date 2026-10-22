/**
 * The canonical platform list. Everything that filters, labels, or badges a
 * platform reads from here, so adding one is a single edit.
 *
 * Ids are lowercase and stable - they are what the changelog frontmatter and
 * `npm run release -- --platform ...` accept. ALIASES maps the shorthands a
 * human would actually type ("mac", "win") onto those ids.
 */

export const PLATFORM_IDS = [
  'windows',
  'macos',
  'ios',
  'ipados',
  'android',
  'linux',
  'web',
] as const;

export type Platform = (typeof PLATFORM_IDS)[number];

export interface PlatformDef {
  id: Platform;
  /** Shown on badges and in the filter bar. */
  label: string;
  /** Inline SVG body, drawn in a 24x24 viewBox. */
  icon: string;
}

/** Shorthands accepted on input and normalised to a canonical id. */
export const PLATFORM_ALIASES: Record<string, Platform> = {
  win: 'windows',
  win32: 'windows',
  windows: 'windows',
  mac: 'macos',
  macos: 'macos',
  osx: 'macos',
  darwin: 'macos',
  ios: 'ios',
  iphone: 'ios',
  ipad: 'ipados',
  ipados: 'ipados',
  android: 'android',
  linux: 'linux',
  flathub: 'linux',
  snap: 'linux',
  web: 'web',
  browser: 'web',
};

export const PLATFORMS: Record<Platform, PlatformDef> = {
  windows: {
    id: 'windows',
    label: 'Windows',
    icon: `<path fill="currentColor" d="M3 5.6l7.2-1v7.1H3V5.6zm0 12.8l7.2 1v-7h-7.2v6zM11.1 19.5L21 21V12.7h-9.9v6.8zM11.1 3v7.7H21V1.5L11.1 3z"/>`,
  },
  macos: {
    id: 'macos',
    label: 'macOS',
    icon: `<path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-1.52-.117-2.792.818-3.61.818zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.675.805-3.544 1.818-.78.896-1.4 2.338-1.207 3.715 1.34.104 2.663-.68 3.506-1.703z"/>`,
  },
  ios: {
    id: 'ios',
    label: 'iOS',
    icon: `<rect x="7" y="2" width="10" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="11" y1="18.6" x2="13" y2="18.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  },
  ipados: {
    id: 'ipados',
    label: 'iPadOS',
    icon: `<rect x="4" y="2.5" width="16" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="18.8" r="0.9" fill="currentColor"/>`,
  },
  android: {
    id: 'android',
    label: 'Android',
    icon: `<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M5 11.5a7 7 0 0 1 14 0M7.6 7.4 6.3 5.2m10.1 2.2 1.3-2.2"/><rect x="5" y="11.5" width="14" height="8" rx="2" fill="currentColor"/><circle cx="9.3" cy="8.6" r="0.9" fill="currentColor"/><circle cx="14.7" cy="8.6" r="0.9" fill="currentColor"/>`,
  },
  linux: {
    id: 'linux',
    label: 'Linux',
    icon: `<ellipse cx="12" cy="13.6" rx="5.4" ry="7.1" fill="currentColor"/><ellipse cx="12" cy="7.6" rx="3.5" ry="4.4" fill="currentColor"/><circle cx="10.6" cy="7.2" r="1.15" fill="#fff"/><circle cx="13.4" cy="7.2" r="1.15" fill="#fff"/><path d="M12 9.1c.75 0 1.35.5 1.35 1.05S12.75 11.4 12 11.4s-1.35-.7-1.35-1.25S11.25 9.1 12 9.1z" fill="#f5a623"/>`,
  },
  web: {
    id: 'web',
    label: 'Web',
    icon: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.6 2.4 2.6 15.2 0 18M12 3c-2.6 2.4-2.6 15.2 0 18" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  },
};

/** Normalise free-form input ("Mac", " WIN ") to a canonical id, or null. */
export function normalizePlatform(input: string): Platform | null {
  const key = input.trim().toLowerCase();
  return PLATFORM_ALIASES[key] ?? null;
}

export function platformLabel(id: string): string {
  return PLATFORMS[id as Platform]?.label ?? id;
}

/** Sort platform ids into the canonical display order. */
export function sortPlatforms(ids: readonly string[]): Platform[] {
  return PLATFORM_IDS.filter((p) => ids.includes(p));
}
