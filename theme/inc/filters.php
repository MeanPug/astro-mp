<?php

##-- ACF: field groups live in acf-json (local JSON), the single source of truth for the Astro types
add_filter('acf/settings/save_json', function () {
    return get_stylesheet_directory() . '/acf-json';
});

add_filter('acf/settings/load_json', function ($paths) {
    $paths[] = get_template_directory() . '/acf-json';

    if (is_child_theme()) {
        $paths[] = get_stylesheet_directory() . '/acf-json';
    }

    return $paths;
});

##-- Gravity Forms: the front-end renders forms itself, WordPress ships no form CSS
add_filter('gform_disable_css', '__return_true');

##-- Media: SVG icons/logos and vCards may be uploaded
add_filter('upload_mimes', function ($mimes) {
    $mimes['svg'] = 'image/svg+xml';
    $mimes['svgz'] = 'image/svg+xml';
    $mimes['vcf'] = 'text/vcard';
    $mimes['vcard'] = 'text/vcard';
    return $mimes;
});

##-- Block editor: only the theme's ACF blocks (plus core/embed) can be inserted
add_filter('allowed_block_types_all', function ($allowed_blocks) {
    $allowed_core = array('core/embed');
    $final = array();

    foreach (WP_Block_Type_Registry::get_instance()->get_all_registered() as $block_name => $block_type) {
        if (!isset($block_type->category) || $block_type->category === 'uncategorized') {
            continue;
        }

        if (strpos($block_name, 'core/') === 0) {
            if (in_array($block_name, $allowed_core, true)) {
                $final[] = $block_name;
            }
        } else {
            $final[] = $block_name;
        }
    }

    return $final;
});

add_filter('block_categories_all', function ($categories) {
    $remove = array('widgets', 'embed', 'uncategorized');

    return array_values(array_filter($categories, function ($category) use ($remove) {
        return !in_array($category['slug'], $remove, true);
    }));
}, 10, 2);

##-- MeanPug Legal Post Types: classic editor for the data-only post types
add_filter('use_block_editor_for_post_type', function ($use_block_editor, $post_type) {
    if (in_array($post_type, array('testimonials', 'result', 'faq'), true)) {
        return false;
    }

    return $use_block_editor;
}, 10, 2);
