# WP Engine deployment files

- `mu-plugins/mp-astro-config.php` — constants for the headless front-end (allowed origins,
  Netlify build hook, front-end URL). Upload to `wp-content/mu-plugins/` and edit the values.
- `gravity-forms/landing-free-case-review.json` — the lead form used by the landing page
  (Gravity Forms > Import/Export > Import Forms). Only needed on a fresh install; a full
  All-in-One WP Migration import already contains it. After importing, check the form id in
  the block field `form_shortcode` (`[gravityform id="7" ...]`) matches.

The theme itself is `../../theme` (upload as `wp-content/themes/astro-mp-theme`). Steps: see
section 10 of the repo README.
