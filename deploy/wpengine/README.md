# WP Engine deployment files

- `gravity-forms/landing-free-case-review.json` — the lead form used by the landing page
  (Gravity Forms > Import/Export > Import Forms). Only needed on a fresh install; a full
  All-in-One WP Migration import already contains it. After importing, check the form id in
  the block field `form_shortcode` (`[gravityform id="7" ...]`) matches.

The theme itself is `../../theme` (upload as `wp-content/themes/astro-mp-theme`). Its
environment settings (front-end URL, allowed origins, deploy hook) are entered in wp-admin:
MeanPug Theme Settings > Astro Front-end. Steps: section 10 of the repo README.
