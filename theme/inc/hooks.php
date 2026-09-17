<?php

##-- Block editor: the category the theme's blocks (blocks/*/block.json) register under
add_filter('block_categories_all', function ($categories) {
  return array_merge(
    $categories,
    array(
      array(
        'slug'  => 'child-theme-blocks',
        'title' => __('Landing Page Blocks', 'mp'),
      ),
    )
  );
}, 5);

##-- Admin: SVG attachments have no intrinsic size, keep them inside their thumbnail box
add_action('admin_head', function () {
  echo '<style type="text/css">
        .attachment-266x266, .thumbnail img {
             width: 100% !important;
             height: auto !important;
        }
        </style>';
});

##-- MeanPug integrations (meanpug-legal-pi-core plugin events)
add_action('mpdcontent/ask-question/submission', function ($data) {
  GFAPI::add_entry(array(
    '1' => $data['question'],
    '4' => $data['name'],
    '6' => $data['email'],
    '7' => $data['content'],
    'form_id'   => get_field('ask_a_question_form_id', 'option'),
  ));
});

add_action('mpdcontent/ask-question/submission', function ($data) {
  GFAPI::submit_form(
    get_field('ask_a_question_form_id', 'option'),
    array(
      'input_1' => $data['question'],
      'input_4' => $data['name'],
      'input_6' => $data['email'],
      'input_7' => $data['content']
    )
  );
});

add_action('mpdreviews/new-reviews', function ($new_reviews) {
  foreach ($new_reviews as $review) {
    $post_id = wp_insert_post(array(
      'post_title'    => $review['title'],
      'post_content'  => $review['body'],
      'post_status'   => 'publish',
      'post_type'     => 'testimonials',
    ));

    update_field('rating', $review['rating'], $post_id);
    update_field('reviewer_name', $review['reviewer']['name'], $post_id);
  }
});
