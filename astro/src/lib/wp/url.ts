/**
 * Port of llf_trailingslashit_url() (theme/inc/template_functions.php): internal links
 * entered without a trailing slash would cost a redirect, so they are normalised where
 * they render. External URLs, anchors, mailto/tel and file paths are left alone.
 */
export function trailingSlashUrl(url: string | undefined | null): string {
    if (!url) return '';
    if (url.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(url)) return url;

    // the API already made internal links site-relative; anything with a host is external
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url) || url.startsWith('//')) return url;
    if (!url.startsWith('/')) return url;

    const [pathAndQuery, fragment] = url.split('#');
    const [path, query] = pathAndQuery.split('?');

    if (path === '/' || path.endsWith('/') || /\.[a-z0-9]{2,5}$/i.test(path)) return url;

    return `${path}/${query !== undefined ? `?${query}` : ''}${fragment !== undefined ? `#${fragment}` : ''}`;
}

/** Same normalisation for every href inside a chunk of HTML (llf_trailingslash_links). */
export function trailingSlashLinks(html: string | undefined | null): string {
    if (!html || !/href=/i.test(html)) return html ?? '';
    return html.replace(/\bhref=(["'])([^"']*)\1/gi, (_m, q, href) => `href=${q}${trailingSlashUrl(href)}${q}`);
}

/** Only the id of the Gravity Form is needed: `[gravityform id="5" title="false"]` -> 5. */
export function gravityFormIdFromShortcode(shortcode: string | undefined | null): number | null {
    if (!shortcode) return null;
    const match = shortcode.match(/\[gravityforms?\b[^\]]*\bid=["']?(\d+)/i);
    return match ? Number(match[1]) : null;
}
