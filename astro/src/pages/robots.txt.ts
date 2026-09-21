/**
 * robots.txt follows Theme Settings > Astro Front-end > "Allow search engines": off (the
 * default, used on test deploys) blocks every crawler so a staging copy never competes with
 * the client's live site; on, crawlers are allowed and pointed at the sitemap.
 */
import type { APIRoute } from 'astro';
import { getGlobals } from '../lib/wp/client';

export const GET: APIRoute = async ({ site }) => {
    const { options } = await getGlobals();
    const sitemap = new URL('/sitemap-index.xml', site ?? 'http://localhost:4321').toString();

    const body = options.astro_indexable
        ? `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`
        : `User-agent: *\nDisallow: /\n`;

    return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
