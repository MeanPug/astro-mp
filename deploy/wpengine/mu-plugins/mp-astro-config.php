<?php
/**
 * Plugin Name: MP Astro front-end config
 * Description: Constants the astro-mp-theme reads for the headless front-end. Upload to wp-content/mu-plugins/ on WP Engine (mu-plugins load on every request and survive theme updates; WP Engine manages wp-config.php itself).
 * Version: 1.0.0
 */

// Origins allowed to call the REST API from the browser (Gravity Forms submissions).
// Comma separated. `*.netlify.app` also allows Netlify deploy previews and branch deploys.
if (!defined('MP_ASTRO_ORIGINS')) {
    define('MP_ASTRO_ORIGINS', 'https://astro-mp.netlify.app,*.netlify.app');
}

// Netlify build hook (Site settings > Build & deploy > Build hooks). Publishing content,
// saving Theme Settings or a menu POSTs here and Netlify rebuilds the site.
if (!defined('MP_ASTRO_DEPLOY_HOOK_URL')) {
    define('MP_ASTRO_DEPLOY_HOOK_URL', 'https://api.netlify.com/build_hooks/REPLACE_ME');
}

// Public front-end URL. When set, any WordPress front-end URL redirects there
// (the WordPress install is the editor only). Leave undefined to show the notice page instead.
if (!defined('MP_ASTRO_SITE_URL')) {
    define('MP_ASTRO_SITE_URL', 'https://astro-mp.netlify.app');
}
