<?php

/**
 * Editor-side preview for the landing-page (mp-*) blocks. The public markup lives in the
 * Astro front-end; in Gutenberg the block just shows its field values so editors can see
 * what they filled in.
 *
 * @param array  $args['block'] the ACF block
 * @param string $args['title'] block title
 */
$block = $args['block'] ?? array();
$title = $args['title'] ?? ($block['title'] ?? '');
$fields = get_fields() ?: array();

$render_value = function ($value) use (&$render_value) {
    if (is_array($value)) {
        if (isset($value['url']) && isset($value['title'])) {
            return '<a href="' . esc_url($value['url']) . '">' . esc_html($value['title'] ?: $value['url']) . '</a>';
        }
        $items = array();
        foreach ($value as $k => $v) {
            $inner = $render_value($v);
            $items[] = '<li>' . (is_string($k) ? '<strong>' . esc_html($k) . ':</strong> ' : '') . $inner . '</li>';
        }
        return '<ul style="margin:0 0 0 1em;padding:0;">' . implode('', $items) . '</ul>';
    }
    if (is_numeric($value) && wp_attachment_is_image((int) $value)) {
        return wp_get_attachment_image((int) $value, 'thumbnail');
    }
    if (is_bool($value)) {
        return $value ? 'yes' : 'no';
    }
    return wp_kses_post((string) $value);
};
?>
<div <?php echo mp_block_anchor_id_attr($block); ?> style="border:1px dashed #c8102e;padding:16px;margin:8px 0;font:14px/1.5 sans-serif;background:#fff;">
    <div style="font-weight:700;color:#c8102e;margin-bottom:8px;"><?php echo esc_html($title); ?></div>
    <?php if ($fields) : ?>
        <?php echo $render_value($fields); ?>
    <?php else : ?>
        <em>Fill in the block fields in the sidebar.</em>
    <?php endif; ?>
</div>
