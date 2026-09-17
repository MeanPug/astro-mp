<?php

if (function_exists('acf_add_options_page')) {
    $icon_url = function_exists('get_template_directory_uri')
        ? get_template_directory_uri() . '/assets/images/icons/meanpug-head.svg'
        : '';

    acf_add_options_page(array(
        'page_title'     => 'MeanPug Theme Settings',
        'menu_title'     => 'MeanPug Theme Settings',
        'menu_slug'      => 'theme-shared-settings',
        'capability'     => 'edit_posts',
        'icon_url'       => $icon_url,
        'redirect'       => false
    ));
}
