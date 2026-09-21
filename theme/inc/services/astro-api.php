<?php

/**
 * REST endpoints consumed by the Astro front-end (see /astro and docs/astro-integration-plan.md).
 *
 * Namespace astro/v1, public, read-only, published content only:
 *   GET /routes          every public URL to prerender
 *   GET /page?path=/x/   one post/page: meta + ordered ACF blocks with formatted field values
 *   GET /globals         theme options, menus, logo, site info
 *   GET /form/{id}       Gravity Form schema for rendering the form in Astro
 *
 * Extra WP-side glue for a decoupled front-end, configured in Theme Settings > Astro Front-end
 * (constants MP_ASTRO_SITE_URL, MP_ASTRO_ORIGINS, MP_ASTRO_DEPLOY_HOOK_URL in wp-config.php override):
 *   - CORS: the Astro origin(s) may call wp-json (Gravity Forms submissions run in the browser)
 *   - rebuild webhook: publishing content pings the static host's deploy hook
 *
 * @package astro-mp-theme
 */

define('MP_ASTRO_API_NAMESPACE', 'astro/v1');

/** Post types that get their own public URL in the Astro build. */
function mp_astro_route_post_types()
{
    return apply_filters('mp_astro_route_post_types', array('page', 'post', 'team', 'testimonials'));
}

/**
 * A front-end setting: a constant in wp-config.php wins, otherwise the value from
 * Theme Settings > Astro Front-end (ACF options page), otherwise the default.
 */
function mp_astro_setting($option_name, $constant, $default = '')
{
    if (defined($constant) && constant($constant)) {
        return constant($constant);
    }
    if (function_exists('get_field')) {
        $value = get_field($option_name, 'option');
        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }
    }
    return $default;
}

/** Public URL of the Astro front-end, or '' when not configured. */
function mp_astro_site_url()
{
    return untrailingslashit(mp_astro_setting('astro_site_url', 'MP_ASTRO_SITE_URL'));
}

/**
 * Origins allowed to call the REST API from the browser (Gravity Forms submissions). One per
 * line or comma separated; `*.example.com` matches any https subdomain. The local `astro dev`
 * origin is always included on local/development installs.
 */
function mp_astro_allowed_origins()
{
    $raw = mp_astro_setting('astro_allowed_origins', 'MP_ASTRO_ORIGINS');
    // an Origin header is scheme://host[:port] with no path, so trailing slashes are dropped
    $origins = array_filter(array_map(function ($origin) {
        return rtrim(trim($origin), '/');
    }, preg_split('/[\s,]+/', (string) $raw)));

    if (in_array(wp_get_environment_type(), array('local', 'development'), true)) {
        $origins[] = 'http://localhost:4321';
    }

    return array_values(array_unique($origins));
}

add_filter('allowed_http_origins', function ($origins) {
    $exact = array_filter(mp_astro_allowed_origins(), function ($origin) {
        return strpos($origin, '*') === false;
    });
    return array_values(array_unique(array_merge($origins, $exact)));
});

/**
 * Wildcard entries (`*.netlify.app`) match any https origin on that domain, so deploy
 * previews and branch deploys can submit forms without listing each URL.
 */
add_filter('allowed_http_origin', function ($allowed, $origin) {
    if ($allowed || !$origin) {
        return $allowed;
    }
    $host = wp_parse_url($origin, PHP_URL_HOST);
    $scheme = wp_parse_url($origin, PHP_URL_SCHEME);
    if (!$host || $scheme !== 'https') {
        return $allowed;
    }
    foreach (mp_astro_allowed_origins() as $pattern) {
        if (strpos($pattern, '*.') === 0) {
            $suffix = substr($pattern, 1); // ".netlify.app"
            if (substr($host, -strlen($suffix)) === $suffix && strlen($host) > strlen($suffix)) {
                return $origin;
            }
        }
    }
    return $allowed;
}, 10, 2);

add_action('rest_api_init', function () {
    register_rest_route(MP_ASTRO_API_NAMESPACE, '/routes', array(
        'methods' => 'GET',
        'callback' => 'mp_astro_rest_routes',
        'permission_callback' => '__return_true',
    ));

    register_rest_route(MP_ASTRO_API_NAMESPACE, '/page', array(
        'methods' => 'GET',
        'callback' => 'mp_astro_rest_page',
        'permission_callback' => '__return_true',
        'args' => array(
            'path' => array('type' => 'string', 'required' => false),
            'id' => array('type' => 'integer', 'required' => false),
        ),
    ));

    register_rest_route(MP_ASTRO_API_NAMESPACE, '/globals', array(
        'methods' => 'GET',
        'callback' => 'mp_astro_rest_globals',
        'permission_callback' => '__return_true',
    ));

    register_rest_route(MP_ASTRO_API_NAMESPACE, '/form/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'mp_astro_rest_form',
        'permission_callback' => '__return_true',
    ));
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Site-relative path of a permalink, always with a trailing slash. */
function mp_astro_path($url)
{
    $path = wp_parse_url($url, PHP_URL_PATH);
    if (empty($path)) {
        return '/';
    }
    return trailingslashit($path);
}

function mp_astro_image($attachment_id, $size = 'full')
{
    if (empty($attachment_id) || !is_numeric($attachment_id)) {
        return null;
    }
    $attachment_id = (int) $attachment_id;
    $src = wp_get_attachment_image_src($attachment_id, $size);
    if (!$src) {
        return null;
    }

    $sizes = array();
    foreach (array('thumbnail', 'medium', 'medium_large', 'large', 'full') as $size_name) {
        if ($candidate = wp_get_attachment_image_src($attachment_id, $size_name)) {
            $sizes[$size_name] = array('url' => $candidate[0], 'width' => $candidate[1], 'height' => $candidate[2]);
        }
    }

    return array(
        'id' => $attachment_id,
        'url' => $src[0],
        'width' => $src[1],
        'height' => $src[2],
        'alt' => get_post_meta($attachment_id, '_wp_attachment_image_alt', true) ?: '',
        'mime' => get_post_mime_type($attachment_id) ?: '',
        'srcset' => wp_get_attachment_image_srcset($attachment_id, 'large') ?: '',
        'sizes' => $sizes,
    );
}

/**
 * While the API serializes a block, image/file/gallery fields resolve to full objects no
 * matter which return format the field group chose (the PHP templates mostly ask for ids).
 */
$GLOBALS['mp_astro_serializing'] = false;

add_filter('acf/format_value/type=image', function ($value) {
    if (empty($GLOBALS['mp_astro_serializing'])) {
        return $value;
    }
    if (is_array($value) && isset($value['ID'])) {
        return mp_astro_image($value['ID']);
    }
    return mp_astro_image($value);
}, 20);

add_filter('acf/format_value/type=gallery', function ($value) {
    if (empty($GLOBALS['mp_astro_serializing']) || !is_array($value)) {
        return $value;
    }
    return array_values(array_filter(array_map(function ($item) {
        return mp_astro_image(is_array($item) ? ($item['ID'] ?? 0) : $item);
    }, $value)));
}, 20);

add_filter('acf/format_value/type=file', function ($value) {
    if (empty($GLOBALS['mp_astro_serializing'])) {
        return $value;
    }
    $id = is_array($value) ? ($value['ID'] ?? 0) : (is_numeric($value) ? (int) $value : 0);
    if (!$id) {
        return is_string($value) ? array('url' => $value) : $value;
    }
    return array(
        'id' => $id,
        'url' => wp_get_attachment_url($id),
        'mime_type' => get_post_mime_type($id) ?: '',
        'title' => get_the_title($id),
        'filesize' => (int) filesize(get_attached_file($id)) ?: 0,
    );
}, 20);

/**
 * Internal links become site-relative so the Astro build works on any origin; media and
 * REST URLs keep pointing at WordPress.
 */
function mp_astro_relativize($value)
{
    static $pattern = null;
    if ($pattern === null) {
        $home = untrailingslashit(home_url());
        $pattern = '#' . preg_quote($home, '#') . '(?=/(?!wp-content/|wp-json/|wp-includes/|wp-admin/))#i';
    }

    if (is_string($value)) {
        return preg_replace($pattern, '', $value);
    }
    if (is_array($value)) {
        foreach ($value as $key => $item) {
            $value[$key] = mp_astro_relativize($item);
        }
    }
    return $value;
}

/**
 * Formatted ACF values of one parsed acf/* block.
 * Mirrors what ACF does before running a block's render template: the block's stored
 * attributes become local meta for a synthetic post id, then get_fields() formats them
 * (images -> arrays, links -> arrays, repeaters -> rows...).
 */
function mp_astro_block_fields(array $block)
{
    $data = $block['attrs']['data'] ?? array();
    if (empty($data) || !function_exists('acf_setup_meta')) {
        return array();
    }

    $block_id = $block['attrs']['id'] ?? ('block_' . md5(wp_json_encode($data)));

    $GLOBALS['mp_astro_serializing'] = true;
    acf_setup_meta($data, $block_id, true);
    $fields = get_fields($block_id);
    acf_reset_meta($block_id);
    $GLOBALS['mp_astro_serializing'] = false;

    return is_array($fields) ? $fields : array();
}

/** One block as the API exposes it. */
function mp_astro_serialize_block(array $block, WP_Post $post)
{
    $name = $block['blockName'];

    if (strpos($name, 'acf/') !== 0) {
        // the editor only allows core/embed besides ACF blocks: ship its rendered HTML
        return array(
            'name' => $name,
            'anchor' => $block['attrs']['anchor'] ?? null,
            'html' => render_block($block),
        );
    }

    $fields = mp_astro_block_fields($block);

    /**
     * Blocks that query WordPress themselves (latest posts, team members, locations...)
     * attach their query results here so the static build has everything in one call.
     *
     * @param array   $fields formatted ACF values of the block
     * @param array   $block  parsed block
     * @param WP_Post $post   the post being serialized
     */
    $fields = apply_filters('mp_astro_block_fields', $fields, $block, $post);
    $fields = apply_filters('mp_astro_block_fields/' . substr($name, 4), $fields, $block, $post);

    return array(
        'name' => $name,
        'anchor' => $block['attrs']['anchor'] ?? null,
        'fields' => $fields,
    );
}

function mp_astro_blocks(WP_Post $post)
{
    $out = array();

    foreach (parse_blocks($post->post_content) as $block) {
        if (empty($block['blockName'])) {
            continue; // whitespace between blocks
        }
        $out[] = mp_astro_serialize_block($block, $post);
    }

    return $out;
}

function mp_astro_seo(WP_Post $post)
{
    if (!function_exists('YoastSEO')) {
        return null;
    }

    $meta = YoastSEO()->meta->for_post($post->ID);
    if (!$meta) {
        return null;
    }

    $head = $meta->get_head();

    return array(
        'html' => $head->html,
        'json' => $head->json,
    );
}

function mp_astro_menu_tree($location)
{
    $locations = get_nav_menu_locations();
    if (empty($locations[$location])) {
        return array();
    }

    $items = wp_get_nav_menu_items($locations[$location]);
    if (!$items) {
        return array();
    }

    $by_parent = array();
    foreach ($items as $item) {
        $by_parent[(int) $item->menu_item_parent][] = $item;
    }

    $build = function ($parent_id) use (&$build, &$by_parent) {
        $out = array();
        foreach ($by_parent[$parent_id] ?? array() as $item) {
            $out[] = array(
                'id' => (int) $item->ID,
                'title' => $item->title,
                'url' => $item->url,
                'target' => $item->target ?: '',
                'classes' => array_values(array_filter((array) $item->classes)),
                'children' => $build((int) $item->ID),
            );
        }
        return $out;
    };

    return $build(0);
}

function mp_astro_post_summary(WP_Post $post)
{
    return array(
        'id' => $post->ID,
        'type' => $post->post_type,
        'title' => get_the_title($post),
        'path' => mp_astro_path(get_permalink($post)),
        'modified' => get_post_modified_time('c', true, $post),
    );
}

/* -------------------------------------------------------------------------- */
/* Block resolvers: blocks that query WordPress ship their results             */
/* -------------------------------------------------------------------------- */

/** Post summary used by listing blocks (mirrors template-parts/posts/card.php). */
function mp_astro_post_card(WP_Post $post)
{
    $author_id = (int) $post->post_author;
    $author = trim(get_the_author_meta('first_name', $author_id) . ' ' . get_the_author_meta('last_name', $author_id)) ?: get_the_author_meta('display_name', $author_id);

    $excerpt = has_excerpt($post) ? get_the_excerpt($post) : '';
    if (!$excerpt) {
        foreach (parse_blocks($post->post_content) as $block) {
            if (($block['blockName'] ?? '') === 'acf/post-raw-content' && !empty($block['attrs']['data']['content'])) {
                $excerpt = wp_trim_words(wp_strip_all_tags($block['attrs']['data']['content']), 16, null);
                break;
            }
        }
    }

    return array(
        'id' => $post->ID,
        'title' => get_the_title($post),
        'path' => mp_astro_path(get_permalink($post)),
        'date' => get_the_date('F j, Y', $post),
        'date_iso' => get_the_date('Y-m-d', $post),
        'author' => $author,
        'excerpt' => $excerpt,
        'image' => mp_astro_image(get_post_thumbnail_id($post)),
        'categories' => array_map(function ($term) {
            return array('name' => $term->name, 'slug' => $term->slug, 'path' => mp_astro_path(get_category_link($term)));
        }, get_the_category($post->ID) ?: array()),
    );
}

# acf/posts: hand-picked override_items or the three latest posts (theme/blocks/posts/posts.php)
add_filter('mp_astro_block_fields/posts', function ($fields) {
    $items = !empty($fields['override_items']) ? $fields['override_items'] : get_posts(array('numberposts' => 3));
    $posts = array();
    foreach ((array) $items as $item) {
        $post = $item instanceof WP_Post ? $item : get_post(is_array($item) ? ($item['ID'] ?? 0) : $item);
        if ($post && $post->post_status === 'publish') {
            $posts[] = mp_astro_post_card($post);
        }
    }
    $fields['posts'] = $posts;
    unset($fields['override_items']);
    return $fields;
});

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                   */
/* -------------------------------------------------------------------------- */

function mp_astro_rest_routes()
{
    $posts = get_posts(array(
        'post_type' => mp_astro_route_post_types(),
        'post_status' => 'publish',
        'posts_per_page' => -1,
        'orderby' => 'ID',
        'order' => 'ASC',
        'no_found_rows' => true,
        'update_post_meta_cache' => false,
        'update_post_term_cache' => false,
    ));

    $routes = array_map('mp_astro_post_summary', $posts);

    // WordPress generates the posts index from page_for_posts; Astro renders it from its own listing
    $blog_page = (int) get_option('page_for_posts');
    foreach ($routes as &$route) {
        if ($blog_page && $route['id'] === $blog_page) {
            $route['type'] = 'blog-index';
        }
    }
    unset($route);

    return rest_ensure_response(mp_astro_relativize(array(
        'generated' => current_time('c', true),
        'routes' => $routes,
    )));
}

function mp_astro_resolve_post(WP_REST_Request $request)
{
    if ($id = (int) $request->get_param('id')) {
        return get_post($id);
    }

    $path = $request->get_param('path') ?: '/';
    $path = '/' . ltrim($path, '/');

    if ($path === '/') {
        $front = (int) get_option('page_on_front');
        return $front ? get_post($front) : null;
    }

    $post_id = url_to_postid(home_url($path));
    return $post_id ? get_post($post_id) : null;
}

function mp_astro_rest_page(WP_REST_Request $request)
{
    $post = mp_astro_resolve_post($request);

    if (!$post || $post->post_status !== 'publish' || !in_array($post->post_type, mp_astro_route_post_types(), true)) {
        return new WP_Error('mp_astro_not_found', 'No published content at this path.', array('status' => 404));
    }

    // block render templates and ACF formatting expect the global post to be set
    $GLOBALS['post'] = $post;
    setup_postdata($post);

    $blog_page = (int) get_option('page_for_posts');

    $response = array_merge(mp_astro_post_summary($post), array(
        'type' => $blog_page && $post->ID === $blog_page ? 'blog-index' : $post->post_type,
        'slug' => $post->post_name,
        'date' => get_post_time('c', true, $post),
        'excerpt' => has_excerpt($post) ? get_the_excerpt($post) : '',
        'featured_image' => mp_astro_image(get_post_thumbnail_id($post)),
        'template' => get_page_template_slug($post) ?: 'default',
        'parent' => $post->post_parent ? mp_astro_post_summary(get_post($post->post_parent)) : null,
        'acf' => function_exists('get_fields') ? (get_fields($post->ID) ?: array()) : array(),
        'seo' => mp_astro_seo($post),
        'blocks' => mp_astro_blocks($post),
    ));

    if ($post->post_type === 'post') {
        $response['categories'] = array_map(function ($term) {
            return array('id' => $term->term_id, 'name' => $term->name, 'slug' => $term->slug, 'path' => mp_astro_path(get_term_link($term)));
        }, get_the_category($post->ID));
        $response['author'] = get_the_author_meta('display_name', $post->post_author);
    }

    wp_reset_postdata();

    return rest_ensure_response(mp_astro_relativize(apply_filters('mp_astro_page_response', $response, $post)));
}

function mp_astro_rest_globals()
{
    $logo_id = (int) get_theme_mod('custom_logo');

    $GLOBALS['mp_astro_serializing'] = true;
    $options = function_exists('get_fields') ? (get_fields('option') ?: array()) : array();
    $GLOBALS['mp_astro_serializing'] = false;

    // plugin toggles and secrets stay in WordPress
    foreach (array_keys($options) as $key) {
        if (strpos($key, 'mpd_') === 0 || strpos($key, 'technical_') === 0) {
            unset($options[$key]);
        }
    }

    return rest_ensure_response(mp_astro_relativize(apply_filters('mp_astro_globals', array(
        'site' => array(
            'name' => wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES),
            'description' => wp_specialchars_decode(get_bloginfo('description'), ENT_QUOTES),
            'url' => home_url('/'),
            'language' => get_bloginfo('language'),
        ),
        'logo' => mp_astro_image($logo_id),
        'menus' => array(
            'nav' => mp_astro_menu_tree('nav'),
            'footer' => mp_astro_menu_tree('footer'),
            'footer-1' => mp_astro_menu_tree('footer-1'),
        ),
        'options' => $options,
    ))));
}

/**
 * reCAPTCHA v3 details for a form, or null when the Gravity Forms reCAPTCHA add-on is not
 * active, has no keys, or is disabled in the form's settings. The front-end executes
 * reCAPTCHA with `action` and posts the token under `inputName`, the name the add-on reads
 * on validation, so scoring and spam marking happen in Gravity Forms as on a classic page.
 */
function mp_astro_form_recaptcha(array $form)
{
    if (!function_exists('gf_recaptcha')) {
        return null;
    }

    $addon = gf_recaptcha();
    if ('1' === rgar($addon->get_form_settings($form), 'disable-recaptchav3')) {
        return null;
    }

    $type = $addon->get_connection_type() === 'enterprise' ? 'enterprise' : 'classic';
    $site_key = $addon->get_plugin_settings_instance()->get_recaptcha_key($type === 'enterprise' ? 'site_key_v3_enterprise' : 'site_key_v3');
    if (!$site_key) {
        return null;
    }

    return array(
        'type' => $type,
        'siteKey' => $site_key,
        // the add-on's field class is only loaded on some requests; its name scheme is version-bound
        'inputName' => class_exists('GF_Field_RECAPTCHA')
            ? (new GF_Field_RECAPTCHA())->get_input_name((int) $form['id'])
            : 'input_' . md5('recaptchav3' . $addon->get_version() . (int) $form['id']),
        'action' => 'submit',
    );
}

/**
 * The add-on skips REST submissions that carry no token, which would let a bot bypass it by
 * omitting the field. Reject those before Gravity Forms processes them.
 */
add_filter('rest_request_before_callbacks', function ($response, $handler, WP_REST_Request $request) {
    if ($request->get_method() !== 'POST' || !preg_match('#^/gf/v2/forms/(\d+)/submissions$#', $request->get_route(), $m)) {
        return $response;
    }

    if (!class_exists('GFAPI') || !($form = GFAPI::get_form((int) $m[1])) || !($recaptcha = mp_astro_form_recaptcha($form))) {
        return $response;
    }

    $params = $request->get_json_params() ?: $request->get_body_params();
    if (empty($params[$recaptcha['inputName']])) {
        return new WP_Error('mp_astro_recaptcha_missing', __('We could not verify that you are human. Please reload the page and try again, or call us.', 'mp'), array('status' => 400));
    }

    return $response;
}, 10, 3);

/** Gravity Form definition trimmed to what a renderer needs. */
function mp_astro_rest_form(WP_REST_Request $request)
{
    if (!class_exists('GFAPI')) {
        return new WP_Error('mp_astro_no_gf', 'Gravity Forms is not active.', array('status' => 501));
    }

    $form = GFAPI::get_form((int) $request['id']);
    if (!$form || empty($form['is_active']) || !empty($form['is_trash'])) {
        return new WP_Error('mp_astro_not_found', 'Form not found.', array('status' => 404));
    }

    $fields = array();
    foreach ($form['fields'] as $field) {
        $field = is_object($field) ? $field : (object) $field;
        if (!empty($field->visibility) && $field->visibility === 'administrative') {
            continue;
        }

        $fields[] = array(
            'id' => (int) $field->id,
            'type' => $field->type,
            'inputType' => $field->inputType ?: $field->type,
            'label' => $field->label,
            'adminLabel' => $field->adminLabel ?? '',
            'description' => $field->description ?? '',
            'descriptionPlacement' => $field->descriptionPlacement ?? '',
            'placeholder' => $field->placeholder ?? '',
            'defaultValue' => $field->defaultValue ?? '',
            'isRequired' => !empty($field->isRequired),
            'cssClass' => $field->cssClass ?? '',
            'size' => $field->size ?? 'large',
            'maxLength' => $field->maxLength ?? '',
            'phoneFormat' => $field->phoneFormat ?? '',
            'labelPlacement' => $field->labelPlacement ?? '',
            'layoutGridColumnSpan' => $field->layoutGridColumnSpan ?? '',
            'choices' => is_array($field->choices ?? null) ? array_values(array_map(function ($choice) {
                return array('text' => $choice['text'], 'value' => $choice['value'], 'isSelected' => !empty($choice['isSelected']));
            }, $field->choices)) : null,
            'inputs' => is_array($field->inputs ?? null) ? array_values(array_map(function ($input) {
                return array(
                    'id' => (string) $input['id'],
                    'label' => $input['label'] ?? '',
                    'name' => $input['name'] ?? '',
                    'isHidden' => !empty($input['isHidden']),
                    'placeholder' => $input['placeholder'] ?? '',
                );
            }, $field->inputs)) : null,
            'content' => $field->type === 'html' ? $field->content : null,
            'checkboxLabel' => $field->checkboxLabel ?? null,
            'conditionalLogic' => !empty($field->conditionalLogic) ? $field->conditionalLogic : null,
        );
    }

    $confirmations = array_values(array_map(function ($confirmation) {
        return array(
            'id' => $confirmation['id'],
            'name' => $confirmation['name'],
            'isDefault' => !empty($confirmation['isDefault']),
            'type' => $confirmation['type'],
            'message' => $confirmation['type'] === 'message' ? wp_kses_post(wpautop($confirmation['message'])) : '',
            'url' => $confirmation['type'] === 'redirect' ? $confirmation['url'] : '',
            'pageId' => $confirmation['type'] === 'page' ? (int) $confirmation['pageId'] : 0,
            'pagePath' => $confirmation['type'] === 'page' && !empty($confirmation['pageId']) ? mp_astro_path(get_permalink((int) $confirmation['pageId'])) : '',
        );
    }, $form['confirmations'] ?? array()));

    return rest_ensure_response(mp_astro_relativize(array(
        'id' => (int) $form['id'],
        'title' => $form['title'],
        'description' => $form['description'] ?? '',
        'labelPlacement' => $form['labelPlacement'] ?? 'top_label',
        'descriptionPlacement' => $form['descriptionPlacement'] ?? 'below',
        'button' => array(
            'text' => $form['button']['text'] ?? __('Submit', 'mp'),
        ),
        'honeypot' => !empty($form['enableHoneypot']),
        'requiredIndicator' => $form['requiredIndicator'] ?? 'asterisk',
        'fields' => $fields,
        'confirmations' => $confirmations,
        'submitUrl' => rest_url('gf/v2/forms/' . (int) $form['id'] . '/submissions'),
        'recaptcha' => mp_astro_form_recaptcha($form),
    )));
}

/* -------------------------------------------------------------------------- */
/* Rebuild webhook                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Publishing, updating or unpublishing content pings the static host so it rebuilds.
 * Hook URL: Theme Settings > Astro Front-end > Deploy hook URL (or MP_ASTRO_DEPLOY_HOOK_URL).
 * The transient prevents bursts from bulk edits.
 */
function mp_astro_trigger_rebuild()
{
    $hook = mp_astro_setting('astro_deploy_hook_url', 'MP_ASTRO_DEPLOY_HOOK_URL');
    if (!$hook) {
        return;
    }

    if (get_transient('mp_astro_rebuild_queued')) {
        return;
    }
    set_transient('mp_astro_rebuild_queued', 1, 30);

    wp_remote_post($hook, array(
        'timeout' => 5,
        'blocking' => false,
        'body' => wp_json_encode(array('source' => 'wordpress', 'site' => home_url('/'))),
        'headers' => array('Content-Type' => 'application/json'),
    ));
}

add_action('transition_post_status', function ($new_status, $old_status, $post) {
    if (wp_is_post_revision($post) || wp_is_post_autosave($post)) {
        return;
    }
    if (!in_array($post->post_type, mp_astro_route_post_types(), true)) {
        return;
    }
    if ($new_status !== 'publish' && $old_status !== 'publish') {
        return;
    }
    mp_astro_trigger_rebuild();
}, 10, 3);

add_action('acf/save_post', function ($post_id) {
    if ($post_id === 'options' || strpos((string) $post_id, 'options') === 0) {
        mp_astro_trigger_rebuild();
    }
}, 20);

add_action('wp_update_nav_menu', 'mp_astro_trigger_rebuild');
