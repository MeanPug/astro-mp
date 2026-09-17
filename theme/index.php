<?php

/**
 * The only template of the theme. WordPress does not serve the public site: the Astro
 * front-end does (see /astro). Anyone hitting a WordPress URL gets a short notice, or a redirect
 * to the front-end when its URL is set in Theme Settings > Astro Front-end (or MP_ASTRO_SITE_URL).
 *
 * @package astro-mp-theme
 */

if ($site_url = mp_astro_site_url()) {
    $target = $site_url . ($_SERVER['REQUEST_URI'] ?? '/');
    wp_redirect($target, 302);
    exit;
}

status_header(200);
nocache_headers();
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title><?php echo esc_html(get_bloginfo('name')); ?></title>
    <style>
        body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1d1d1f; background: #f2f2f2; }
        main { max-width: 32rem; padding: 2rem; text-align: center; }
        h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
        p { margin: 0 0 1rem; color: #666; }
        a { color: #d0112b; }
    </style>
</head>
<body>
    <main>
        <h1><?php echo esc_html(get_bloginfo('name')); ?></h1>
        <p><?php esc_html_e('This WordPress installation is the content editor for the site. The public pages are served by the Astro front-end.', 'mp'); ?></p>
        <p>
            <a href="<?php echo esc_url(admin_url()); ?>"><?php esc_html_e('Open the editor', 'mp'); ?></a>
            &middot;
            <a href="<?php echo esc_url(rest_url('astro/v1/routes')); ?>"><?php esc_html_e('API routes', 'mp'); ?></a>
        </p>
    </main>
</body>
</html>
