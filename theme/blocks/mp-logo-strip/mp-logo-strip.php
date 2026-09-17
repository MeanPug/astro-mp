<?php
/**
 * MP Logo Strip (acf/mp-logo-strip) — editor preview only.
 * The public front-end is rendered by Astro: astro/src/components/blocks/LogoStrip.astro
 */
if (isset($block['data']['is_preview'])) :
    echo '<img src="' . get_template_directory_uri() . '/blocks/mp-logo-strip/preview.png" style="width:100%; height:auto;">';
else :
    get_template_part('template-parts/blocks/mp-preview', null, array('block' => $block, 'title' => 'MP Logo Strip'));
endif;
