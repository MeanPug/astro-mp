<?php

function mp_register_menus() {
		// This theme uses wp_nav_menu() in one location.
		register_nav_menus( array(
			'nav' => esc_html__( 'Nav', 'mp' ),
			'footer' => esc_html__( 'Footer', 'mp' ),
			'footer-1' => esc_html__( 'Footer Resources', 'mp' )
		) );
}
add_action( 'after_setup_theme', 'mp_register_menus' );
