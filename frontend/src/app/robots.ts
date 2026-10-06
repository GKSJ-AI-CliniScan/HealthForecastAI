/**
 * robots.ts — tells search engines NOT to crawl anything.
 * WHY: this app shows hospital patient data behind a login; nothing in it
 * should ever appear in Google. (A public sitemap would be wrong for the same reason.)
 */
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
