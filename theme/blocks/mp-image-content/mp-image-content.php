<?php
/**
 * MP Image Content (acf/mp-image-content) — editor preview only.
 * The public front-end is rendered by Astro: astro/src/components/blocks/ImageContent.astro
 */
if (isset($block['data']['is_preview'])) :
    echo '<img src="' . get_template_directory_uri() . '/blocks/mp-image-content/preview.png" style="width:100%; height:auto;">';
else :
    get_template_part('template-parts/blocks/mp-preview', null, array('block' => $block, 'title' => 'MP Image Content'));
endif;
