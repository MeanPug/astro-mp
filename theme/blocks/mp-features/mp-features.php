<?php
/**
 * MP Features (acf/mp-features) — editor preview only.
 * The public front-end is rendered by Astro: astro/src/components/blocks/Features.astro
 */
if (isset($block['data']['is_preview'])) :
    echo '<img src="' . get_template_directory_uri() . '/blocks/mp-features/preview.png" style="width:100%; height:auto;">';
else :
    get_template_part('template-parts/blocks/mp-preview', null, array('block' => $block, 'title' => 'MP Features'));
endif;
