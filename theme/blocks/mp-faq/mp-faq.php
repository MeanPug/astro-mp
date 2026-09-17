<?php
/**
 * MP FAQ (acf/mp-faq) — editor preview only.
 * The public front-end is rendered by Astro: astro/src/components/blocks/Faq.astro
 */
if (isset($block['data']['is_preview'])) :
    echo '<img src="' . get_template_directory_uri() . '/blocks/mp-faq/preview.png" style="width:100%; height:auto;">';
else :
    get_template_part('template-parts/blocks/mp-preview', null, array('block' => $block, 'title' => 'MP FAQ'));
endif;
