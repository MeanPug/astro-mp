<?php

/**
 * astro-mp-theme: WordPress side of the headless setup.
 *
 * WordPress is the CMS only. Editors compose pages from the ACF blocks in blocks/,
 * the Astro app in /astro renders the public site through the astro/v1 REST API
 * (inc/services/astro-api.php). No public templates or front-end assets live here.
 *
 * @package astro-mp-theme
 */

define('ACF_EARLY_ACCESS', '5');

/**
 * Theme supports the editor and the API rely on.
 */
function mp_setup()
{
	load_theme_textdomain('mp', get_template_directory() . '/languages');

	// Yoast builds the title tag; the API ships it to Astro
	add_theme_support('title-tag');
	add_theme_support('post-thumbnails');
	add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));

	// site logo (Appearance > Customize); the API exposes it as globals.logo
	add_theme_support('custom-logo', array(
		'height'      => 250,
		'width'       => 250,
		'flex-width'  => true,
		'flex-height' => true,
	));
}
add_action('after_setup_theme', 'mp_setup');

/**
 * Every folder in blocks/ with a block.json is an ACF block. The list is cached in an
 * option on production; other environments rescan on every request so new blocks show up
 * without a cache flush.
 */
function mp_get_blocks()
{
	$theme = wp_get_theme();
	$blocks = get_option('mp_wp_blocks');
	$version = get_option('mp_wp_blocks_version');

	if (empty($blocks) || version_compare($theme->get('Version'), $version) || (function_exists('wp_get_environment_type') && 'production' !== wp_get_environment_type())) {
		$blocks = scandir(get_template_directory() . '/blocks/');
		$blocks = array_values(array_diff($blocks, array('..', '.', '.DS_Store')));

		update_option('mp_wp_blocks', $blocks);
		update_option('mp_wp_blocks_version', $theme->get('Version'));
	}

	return $blocks;
}

function mp_load_blocks()
{
	foreach (mp_get_blocks() as $block) {
		$block_json = get_template_directory() . '/blocks/' . $block . '/block.json';
		if (file_exists($block_json)) {
			register_block_type($block_json);
		}
	}
}
add_action('init', 'mp_load_blocks');

/**
 * `id="..."` attribute from a block's anchor (block.json supports.anchor), used by the
 * editor preview and mirrored by the Astro components.
 */
function mp_block_anchor_id_attr($block)
{
	$anchor = $block['anchor'] ?? ($block['attrs']['anchor'] ?? '');

	return $anchor ? 'id="' . esc_attr($anchor) . '"' : '';
}

require_once __DIR__ . '/inc/filters.php';
require_once __DIR__ . '/inc/hooks.php';
require_once __DIR__ . '/inc/menus/all.php';
require_once __DIR__ . '/inc/settings/all.php';
require_once __DIR__ . '/inc/services/all.php';
