/**
 * Who the site belongs to. The footer's social icons and the structured data
 * every page carries (`sameAs`) both read from here, so a new profile link is
 * one edit rather than two that drift apart.
 */

export const SITE_NAME = 'Mohammed Aadhil';

export const AUTHOR = {
  name: 'Mohammed Aadhil',
  jobTitle: 'Freelance software developer and Zoho CRM consultant',
  email: 'me@aadhil.dev',
};

export interface SocialLink {
  href: string;
  img: string;
  label: string;
  alt: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { href: 'https://x.com/aadhilkh', img: '/media/images/x-logo.svg', label: 'X / Twitter', alt: 'X' },
  {
    href: 'https://www.linkedin.com/in/aadhilkh',
    img: '/media/images/linkedin-logo.svg',
    label: 'LinkedIn',
    alt: 'LinkedIn',
  },
  {
    href: 'https://github.com/aadhil-kh',
    img: '/media/images/github-logo.svg',
    label: 'GitHub',
    alt: 'GitHub',
  },
];
