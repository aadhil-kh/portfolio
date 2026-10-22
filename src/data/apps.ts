import type { Platform } from './platforms';

/**
 * The single registry of my apps. The homepage app list, the changelog filter
 * bar, and `npm run release` all read from here.
 *
 * To plug in a new app: add an entry. Nothing else needs touching - the
 * changelog picks it up as soon as a release file references its `id`.
 */

export interface Screenshot {
  src: string;
  title: string;
}

export interface AppDef {
  /** Stable slug. Changelog frontmatter and release filenames use this. */
  id: string;
  /** Short name, used on changelog rows and filter chips. */
  name: string;
  /** Full name, used on the homepage card. */
  title: string;
  description: string;
  icon?: string;
  /** Icon art already carries its own padding/rounding - skip the frame. */
  borderlessIcon?: boolean;
  /** Tints the generated release artwork when a release has no screenshot. */
  accent: string;
  /**
   * Source repos for this app, as "owner/name". `npm run release` matches the
   * --repo URL against these to work out which app a commit range belongs to.
   *
   * Only `aadhil-kh/WebRendie` is confirmed; the rest are guesses from the app
   * names. Correct them to the real private repo slugs - until you do, pass
   * `--app <id>` to the release script instead.
   */
  repos?: string[];
  /** Show on the homepage app list. False keeps it changelog-only. */
  listed?: boolean;
  screenshots?: Screenshot[];
  links: {
    web?: string;
    stores?: Partial<Record<Platform, string>>;
  };
}

export const APPS: AppDef[] = [
  {
    id: 'devt-pro',
    name: 'DevT Pro',
    title: 'DevT Pro',
    description:
      'All-in-one developer utilities: JSON formatter, API tester, regex helper, and more.',
    icon: '/media/images/devt-pro.jpg',
    accent: '#2563eb',
    repos: ['aadhil-kh/DeveloperToolsPro'],
    screenshots: [
      { src: '/media/devtpro/hero.png', title: 'macOS - Dark' },
      { src: '/media/devtpro/hero-light.png', title: 'macOS - Light' },
      { src: '/media/devtpro/editor.png', title: 'Editor' },
      { src: '/media/devtpro/tab.png', title: 'Tabs' },
      { src: '/media/devtpro/keyboard.png', title: 'Keyboard Shortcuts' },
      { src: '/media/devtpro/palette.png', title: 'Color Palette' },
      { src: '/media/devtpro/hero-ipad.png', title: 'iPadOS - Dark' },
      { src: '/media/devtpro/hero-ipad-light.png', title: 'iPadOS - Light' },
      { src: '/media/devtpro/hero-windows.png', title: 'Windows - Dark' },
      { src: '/media/devtpro/hero-windows-light.png', title: 'Windows - Light' },
    ],
    links: {
      web: 'https://devtpro.app/',
      stores: {
        macos: 'https://apps.apple.com/us/app/developer-tools-pro/id6755523203',
        ipados: 'https://apps.apple.com/us/app/developer-tools-pro/id6755523203',
        windows: 'https://apps.microsoft.com/detail/9pfjq9nkgwd0',
        linux: 'https://flathub.org/en/apps/dev.aadhil.devtpro',
      },
    },
  },
  {
    id: 'solipdf',
    name: 'SoliPDF',
    title: 'SoliPDF',
    description:
      'Merge, split, and organize PDFs on Windows. Rearrange, rotate, and extract pages, add page numbers and watermarks, or split by page range, page count, or file size.',
    icon: '/media/images/solipdf.png',
    borderlessIcon: true,
    accent: '#dc2626',
    repos: ['aadhil-kh/SoliPDF'],
    screenshots: [
      { src: '/media/solipdf/home.webp', title: 'Home' },
      { src: '/media/solipdf/playground.webp', title: 'Playground: merge and arrange pages' },
      { src: '/media/solipdf/select.webp', title: 'Select, rotate, and remove pages' },
      { src: '/media/solipdf/add-pages.webp', title: 'Add pages from another PDF' },
      { src: '/media/solipdf/page-numbers.webp', title: 'Page numbers' },
      { src: '/media/solipdf/watermark.webp', title: 'Watermark' },
      { src: '/media/solipdf/split-size.webp', title: 'Split by file size' },
      { src: '/media/solipdf/extract.webp', title: 'Extract picked pages' },
      { src: '/media/solipdf/home-dark.webp', title: 'Home - Dark' },
    ],
    links: {
      web: 'https://apps.microsoft.com/detail/9mtdvkg8t2rh',
      stores: { windows: 'https://apps.microsoft.com/detail/9mtdvkg8t2rh' },
    },
  },
  {
    id: 'splitbrowse',
    name: 'SplitBrowse',
    title: 'SplitBrowse',
    description:
      'A web browser built for side-by-side work. Open several sites as splits in one tab, keep work and personal browsing in separate profiles, and reach every action from a command palette.',
    icon: '/media/images/splitbrowse.png',
    borderlessIcon: true,
    accent: '#7c3aed',
    repos: ['aadhil-kh/SplitBrowse'],
    screenshots: [
      { src: '/media/splitbrowse/splits-dark.webp', title: 'Three splits in one tab' },
      { src: '/media/splitbrowse/splits-light.webp', title: 'Splits - Light' },
      { src: '/media/splitbrowse/command-palette.webp', title: 'Command palette' },
      { src: '/media/splitbrowse/tab-actions.webp', title: 'Command palette: tab actions' },
      { src: '/media/splitbrowse/profiles.webp', title: 'Browsing profiles' },
      { src: '/media/splitbrowse/new-tab.webp', title: 'New tab' },
      { src: '/media/splitbrowse/menu.webp', title: 'Menu' },
      { src: '/media/splitbrowse/settings.webp', title: 'Settings' },
    ],
    links: {
      web: 'https://apps.microsoft.com/detail/9nsnjh73mvhx',
      stores: { windows: 'https://apps.microsoft.com/detail/9nsnjh73mvhx' },
    },
  },
  {
    id: 'webrendie',
    name: 'WebRendie',
    title: 'WebRendie - HTML Playground',
    description:
      'Build and test HTML, CSS, JavaScript, TypeScript, SCSS, and Sass in one offline Windows app with live preview, responsive testing, console tools, project management, assets, and an offline mock API.',
    icon: '/media/images/html.png',
    borderlessIcon: true,
    accent: '#ea580c',
    repos: ['aadhil-kh/WebRendie'],
    screenshots: [
      { src: '/media/webrendie/screenshot-1.png', title: 'Live preview and console' },
      { src: '/media/webrendie/screenshot-2.png', title: 'Project management' },
      { src: '/media/webrendie/screenshot-3.png', title: 'Add CDN libraries' },
      { src: '/media/webrendie/screenshot-4.png', title: 'General settings' },
      { src: '/media/webrendie/screenshot-5.png', title: 'Editor settings' },
      { src: '/media/webrendie/screenshot-6.png', title: 'Offline mock API' },
      { src: '/media/webrendie/screenshot-7.png', title: 'TypeScript task board' },
      { src: '/media/webrendie/screenshot-8.png', title: 'Responsive mobile preview' },
    ],
    links: {
      web: 'https://apps.microsoft.com/detail/9pg1fwd0jrfm',
      stores: { windows: 'https://apps.microsoft.com/detail/9pg1fwd0jrfm' },
    },
  },
  {
    id: 'qr-generator-pro',
    name: 'QR Code Generator Pro',
    title: 'QR Code Generator Pro',
    description:
      'Fast, flexible QR code generator with custom styling options, right from your Windows desktop.',
    icon: '/media/images/qr.png',
    accent: '#0f766e',
    repos: ['aadhil-kh/QRCodeGeneratorPro'],
    links: {
      web: 'https://apps.microsoft.com/detail/9nbxjxz6vr72',
      stores: { windows: 'https://apps.microsoft.com/detail/9nbxjxz6vr72' },
    },
  },
  {
    id: 'json-tools',
    name: 'JSON Tools',
    title: 'JSON Tools',
    description:
      'Fast, offline JSON editor with validation, pretty-print, tree view, and conversion to XML, YAML, CSV, and more.',
    icon: '/media/images/json.webp',
    accent: '#ca8a04',
    repos: ['aadhil-kh/JSONTools'],
    links: {
      web: 'https://apps.microsoft.com/detail/9n57qzdj1bcg',
      stores: {
        windows: 'https://apps.microsoft.com/detail/9n57qzdj1bcg',
        ipados: 'https://apps.apple.com/us/app/json-tools/id1526081216',
      },
    },
  },

  // Not on the homepage yet, but releases can already be filed against them.
  // Flip `listed` to true to publish the homepage card.
  {
    id: 'xml-tools',
    name: 'XML Tools',
    title: 'XML Tools',
    description:
      'Professional XML editor featuring validation, pretty-printing, tree view, and seamless conversion to JSON, YAML, and CSV.',
    icon: '/media/images/xml.webp',
    accent: '#0369a1',
    listed: true,
    repos: ['aadhil-kh/XMLTools'],
    links: {
      stores: {
        windows: 'https://apps.microsoft.com/detail/9mtcwsvf98ds',
        ipados: 'https://apps.apple.com/us/app/xml-tools/id6758571472',
      },
    },
  },
  {
    id: 'yaml-tools',
    name: 'YAML Tools',
    title: 'YAML Tools',
    description:
      'Powerful YAML editor with real-time validation, formatting, tree view, and one-click conversion to JSON, XML, and CSV.',
    icon: '/media/images/yaml.webp',
    accent: '#be185d',
    listed: true,
    repos: ['aadhil-kh/YAMLTools'],
    links: {
      stores: {
        windows: 'https://apps.microsoft.com/detail/9p75wcwvlxqn',
        ipados: 'https://apps.apple.com/us/app/yaml-tools/id6758571420',
      },
    },
  },
];

/** Apps shown on the homepage, in order. */
export const LISTED_APPS = APPS.filter((a) => a.listed !== false);

export const APP_IDS = APPS.map((a) => a.id);

export function getApp(id: string): AppDef | undefined {
  return APPS.find((a) => a.id === id);
}

/** Display name for an app id, falling back to the raw id if unknown. */
export function appName(id: string): string {
  return getApp(id)?.name ?? id;
}

/** Resolve "owner/name", a full URL, or an app id to an app. */
export function appFromRepo(repo: string): AppDef | undefined {
  const slug = repo
    .trim()
    .replace(/^git@github\.com:/, '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .toLowerCase();

  return APPS.find(
    (a) =>
      a.id.toLowerCase() === slug ||
      (a.repos ?? []).some((r) => r.toLowerCase() === slug),
  );
}

export interface StoreBadge {
  /** Store keys this badge covers; the first one the app has wins. */
  keys: Platform[];
  img: string;
  alt: string;
  title: string;
  /** Extra class for badges whose artwork needs different sizing. */
  cls?: string;
}

/**
 * One badge per store, in display order. An app shows a badge when its
 * links.stores has any of the badge's keys (first match wins).
 */
export const STORE_BADGES: StoreBadge[] = [
  {
    keys: ['windows'],
    img: '/media/images/ms-store.svg',
    alt: 'Microsoft Store',
    title: 'Get it from Microsoft Store',
  },
  {
    keys: ['macos'],
    img: '/media/images/mac-store.svg',
    alt: 'Mac App Store',
    title: 'Download on the Mac App Store',
  },
  {
    keys: ['ios', 'ipados'],
    img: '/media/images/app-store.svg',
    alt: 'App Store',
    title: 'Download on the App Store',
  },
  {
    keys: ['linux'],
    img: 'https://devtpro.app/assets/media/flathub.svg',
    alt: 'Flathub',
    title: 'Get it on Flathub',
    cls: 'badge-flathub',
  },
];
