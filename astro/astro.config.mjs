// @ts-check
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    // the public URL of the deployed front-end; canonical/OG tags are rewritten to it
    // SITE_URL wins. On Netlify: production uses the site URL, previews/branches their own origin
    // (DEPLOY_PRIME_URL is the `main--site` alias in production, so it must not win there).
    site:
        process.env.SITE_URL ||
        (process.env.CONTEXT === 'production' ? process.env.URL : process.env.DEPLOY_PRIME_URL) ||
        process.env.URL ||
        'http://localhost:4321',
    output: 'static',
    trailingSlash: 'always',
    build: {
        format: 'directory',
    },
    env: {
        schema: {
            // WordPress origin the build reads from (server side only)
            WP_API_URL: envField.string({ context: 'server', access: 'public', default: 'http://localhost:8000' }),
            // WordPress origin the browser talks to (Gravity Forms submissions)
            PUBLIC_WP_URL: envField.string({ context: 'client', access: 'public', default: 'http://localhost:8000' }),
            PUBLIC_GTM_ID: envField.string({ context: 'client', access: 'public', optional: true }),
            PUBLIC_CLARITY_ID: envField.string({ context: 'client', access: 'public', optional: true }),
        },
    },
    vite: {
        server: {
            // the Docker service is reached through the published port
            allowedHosts: true,
        },
    },
});
