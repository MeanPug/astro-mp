# astro-mp

WordPress (ACF blocks, Gravity Forms) as the CMS, Astro as the public front-end. Editors build
pages in Gutenberg from the theme's ACF blocks; Astro reads the block data through the
`astro/v1` REST API and renders a static site.

```
theme/      WordPress theme (headless): ACF blocks (block.json + acf-json + editor preview), REST API for Astro
astro/      Astro front-end: one component per block, design tokens, forms, build
conf/       Gravity Forms JSON templates
docker/     Dockerfile for the WordPress container (wp-cli included)
```

## 1. Requirements

- Docker Desktop (the only thing that must be installed; Node and PHP run in containers)
- Access to a WordPress dump of the site (All-in-One WP Migration `.wpress`) or a fresh install
- ACF Pro and Gravity Forms licences (both come with the dump)

## 2. First run

```bash
docker compose build
docker compose up -d
```

| URL | Service |
|---|---|
| http://localhost:8000 | WordPress (admin: `/wp-admin`) |
| http://localhost:4321 | Astro dev server, live data from WordPress |
| localhost:3306 | MySQL (`wordpress` / `wordpress`, db `wordpress`) |

The `astro` container installs its dependencies on first start (about a minute), regenerates
the block types and starts `astro dev`. WordPress itself has no public templates: opening
http://localhost:8000 shows a notice pointing to the editor and the API (or redirects to the
front-end when `MP_ASTRO_SITE_URL` is defined in `wp-config.php`).

Fresh WordPress without a dump:

```bash
docker compose exec -u www-data wordpress wp core install --url=http://localhost:8000 --title="Site" --admin_user=admin --admin_password=admin --admin_email=you@example.com --skip-email
docker compose exec -u www-data wordpress wp theme activate astro-mp-theme
```

Then install ACF Pro and Gravity Forms in the admin, or import the `.wpress` dump with
All-in-One WP Migration. The Astro origin must be allowed to call the REST API; locally
`http://localhost:4321` is allowed by default, for other origins add to `wp-config.php`:

```php
define('MP_ASTRO_ORIGINS', 'https://www.example.com,https://preview.example.com');
```

## 3. Day-to-day commands

```bash
docker compose up -d                          # start everything
docker compose logs -f astro                  # follow the Astro dev server
docker compose exec astro npm run build       # static build into astro/dist
docker compose exec astro npm run preview     # serve astro/dist on :4321
docker compose exec astro npm run gen:types   # regenerate TS types after changing theme/acf-json
docker compose exec astro npx astro check     # type check
docker compose exec -u www-data wordpress wp <command>   # wp-cli
```

The build fetches every published page listed by `GET /wp-json/astro/v1/routes` and needs
WordPress to be reachable at `WP_API_URL` (see `astro/.env.example` and the `astro` service
in `docker-compose.yml`).

## 4. How a page gets rendered

1. An editor composes a page in Gutenberg from the theme's ACF blocks and publishes it.
2. `theme/inc/services/astro-api.php` exposes it: `GET /wp-json/astro/v1/page?path=/slug/`
   returns the ordered blocks with formatted ACF values (images as objects with sizes,
   links as objects, repeaters as arrays). `globals` returns theme options, menus and the logo;
   `form/{id}` returns a Gravity Form definition.
3. `astro/src/pages/[...slug].astro` renders the page: `BlockRenderer.astro` maps each
   `acf/<slug>` to `components/blocks/<Component>.astro`.
4. Publishing in WordPress can trigger a rebuild of the static host through
   `MP_ASTRO_DEPLOY_HOOK_URL` in `wp-config.php`.

## 5. Creating a new block

A block lives in two places: its definition in the theme (so editors can use it) and its
component in Astro (so it renders). Names follow `mp-<slug>`.

### 5.1 Theme side

Create `theme/blocks/mp-<slug>/` with:

- `block.json` — copy an existing `mp-*` block and change `name`, `title`, `description`,
  `icon`, `keywords`, `renderTemplate`. `category` stays `child-theme-blocks`.
- `mp-<slug>.php` — editor preview only, the same stub as the other `mp-*` blocks
  (it calls `template-parts/blocks/mp-preview.php`, which lists the filled-in fields).
- `preview.png` — optional thumbnail for the block inserter.

Create the field group `theme/acf-json/group_<key>.json` with location
`block == acf/mp-<slug>` and a title `Block: <Title>`. The easiest way is in the admin:
Custom Fields > Field Groups > Add New, set the location rule to the new block, save. ACF writes
the JSON into `theme/acf-json` automatically (local JSON is enabled in `theme/inc/filters.php`).
Conventions that the Astro side relies on:

- image fields: any return format works, the API always returns an image object
- `link` fields: return format `array`
- variants go into a `styles` group of `select` fields with closed choice lists
- repeaters are fine; the API returns them as arrays of rows

Blocks are registered automatically: `mp_load_blocks()` in `theme/functions.php` scans
`theme/blocks/*/block.json` on every request. Check with:

```bash
docker compose exec -u www-data wordpress wp eval 'print_r(array_filter(array_keys(WP_Block_Type_Registry::get_instance()->get_all_registered()), fn($n) => str_starts_with($n, "acf/mp-")));'
```

### 5.2 Astro side

```bash
docker compose exec astro npm run gen:types
```

This turns the field group into `Mp<Slug>Fields` in `astro/src/lib/wp/blocks.generated.ts`
(selects become string unions, repeaters arrays, images `AcfImage | null`).

Create `astro/src/components/blocks/Mp<Slug>.astro`:

```astro
---
/** acf/mp-<slug> — one line on what it shows */
import RichText from '../ui/RichText.astro';
import { sectionAttrs, styleOf, type BlockProps } from './_shared';

const { block, reveal } = Astro.props as BlockProps<'acf/mp-<slug>'>;
const { heading, content, styles } = block.fields;
const background = styleOf(styles, 'background', 'white');
---

<section {...sectionAttrs(block, reveal)} class:list={['mp-section', background === 'gray' ? 'bg-surface' : 'bg-white']}>
    <div class="container py-14 lg:py-20">
        {heading && <h2 class="mp-h2">{heading}</h2>}
        <RichText html={content} class="mp-prose pt-6" />
    </div>
</section>
```

Register it in `astro/src/components/BlockRenderer.astro` (import + entry in `components`).
Building blocks available in `astro/src/components/ui/`: `Link` (ACF link field), `WpImage`
(image object with srcset), `Placeholder` (image or labelled box while assets are missing),
`RichText` (WYSIWYG HTML with link normalisation), `Carousel` (scroll-snap slides),
`forms/LeadFormCard` (Gravity Form in a white card, takes the shortcode string).

Semantic classes (`mp-h1`, `mp-h2`, `mp-label`, `mp-prose`, `mp-button--primary`, ...) are
defined in `astro/src/styles/base.css`; colours, fonts and sizes in
`astro/tailwind.config.cjs`. Interactive pieces (carousel, accordion, modal, header, footer)
are in `styles/components.css` and `src/scripts/`.

### 5.3 Blocks that need a WordPress query

If a block has to list posts or other content, resolve it in PHP so the static build gets it
in one request: add a filter `mp_astro_block_fields/mp-<slug>` in
`theme/inc/services/astro-api.php` that appends the query result to `$fields` (see the
`acf/posts` resolver there for the pattern).

### 5.4 Test it

Add the block to a page in Gutenberg, publish, reload http://localhost:4321/<page>/. The dev
server does not cache API responses, so edits in WordPress show on reload. Check the data the
component receives with:

```bash
curl -s "http://localhost:8000/wp-json/astro/v1/page?path=/<page>/" | python3 -m json.tool
```

### 5.5 Changing or removing a block

A block's fields, its component and the generated types have to stay in sync:

1. Change the field group in the ACF admin (writes `theme/acf-json`), then
   `docker compose exec astro npm run gen:types`; `npx astro check` shows which components
   read fields that no longer exist.
2. Renaming a block (`name` in `block.json`) breaks every page that uses the old name:
   Gutenberg shows "block unavailable" and Astro renders nothing for it. Add the new block,
   move the content over, then delete the old one.
3. Removing a block: delete `theme/blocks/mp-<slug>`, the JSON in `theme/acf-json`, the
   component and its line in `BlockRenderer.astro`. Content that still references it renders
   as nothing (in dev a `<!-- TODO block -->` comment marks the spot).

## 6. Forms

Forms are Gravity Forms. A block stores the shortcode string (`[gravityform id="7"]`); Astro
reads the form definition from `/wp-json/astro/v1/form/7`, renders the fields and posts
submissions to `/wp-json/gf/v2/forms/7/submissions` from the browser. Notifications,
confirmations, spam protection and entries stay in Gravity Forms. Reusable form configurations
live in `conf/form-templates` (import them in Gravity Forms > Import/Export).

Notes for new forms:

- Supported field types in `GravityForm.astro`: text, email, phone, website, number, date,
  hidden, textarea, select, radio, checkbox, consent, name, address, html, section. reCAPTCHA
  fields are not rendered (spam protection runs server-side in Gravity Forms).
- Two half-width fields side by side: set the field's CSS class to `gfield--width-half` or a
  layout grid span of 6.
- The phone field uses the "international" format so any number passes; "standard" enforces
  the US `(###) ###-####` mask.
- Redirect confirmations with `{embed_url}` are resolved in the browser to the page the form
  is on, because the API has no embed page.
- Test a form from the front-end (not from wp-admin): the submission must succeed from the
  Astro origin, which is what `MP_ASTRO_ORIGINS` allows.

## 7. Theme options used by the layout

Theme Settings (ACF options page): `contact_phone` (header phone), `footer_tagline`
(copyright line), `footer_attorney_advertising` (disclaimer), `footer_logo`,
`footer_background` (photo behind the footer), `global_modal_form` (popup form shortcode).
Menu location `footer-1` holds the footer links. The site logo is the WordPress custom logo
(Appearance > Customize); without one the site name is shown as text. The front page is
whatever Settings > Reading sets as the static homepage.

## 8. Pages and content

- A landing page is a normal WordPress page built from the `MP *` blocks; its slug is its
  URL on the front-end (`/landing/` for slug `landing`). The block editor shows each block as
  a list of its field values, not a design preview; the design lives in Astro.
- To make a variant, use Duplicate Page (plugin is installed) or copy the content via
  wp-cli: `wp post get <id> --field=post_content | wp post create - --post_type=page ...`.
  The dev server reads the route list on start, so after creating a page run
  `docker compose restart astro` (on the static host every publish rebuilds anyway).
- Images: upload to the media library and pick them in the block fields; SVG is allowed.
  Media is always served from the WordPress host.
- Scripting content: never write block markup with `wp_update_post()` from PHP without
  `wp_slash()`, it strips the `\u0022`/`\u003c` escapes inside block JSON and breaks the
  blocks. `wp post update <id> -` (reads stdin) and the editor are safe.
- The Site Audit Trail plugin (MeanPug core) locks the Save button on published pages until
  the change summary in the Page sidebar ("Site Audit Trail" panel) is filled in. Switching a
  block to Edit mode already counts as a change.

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| New page is 404 on :4321 | Route list is read when `astro dev` starts. `docker compose restart astro`. |
| Astro container exits with "Another astro dev server is already running" | Stale `astro/.astro/dev.json` lock. The compose command removes it; if it persists, delete the file. |
| A block renders nothing on the front-end | Its name is missing in `BlockRenderer.astro`, or the block was renamed. In dev the HTML has a `<!-- TODO block acf/... -->` comment. |
| Form is missing on a page | The `form_shortcode` field is empty or its quotes got mangled (see "Scripting content"). Check `curl .../astro/v1/page?path=/...` for the field. |
| Form submits but browser shows a network error | Front-end origin not in `MP_ASTRO_ORIGINS` (CORS). |
| Save button greyed out in the editor | Site Audit Trail summary required (Page sidebar). |
| Section looks blank right after scrolling in screenshots | Scroll reveal animation (`data-inviewport`); content fades in 0.7s later. |
| Type errors after editing fields | Run `npm run gen:types`, then fix the component. |

## 10. Deploy

Two hosts: WordPress (editor + API) on WP Engine, the static Astro output on Netlify.

### 10.1 WordPress on WP Engine

1. Install ACF Pro and Gravity Forms (with the reCAPTCHA add-on if used) on the WP Engine
   install, or migrate the local site with All-in-One WP Migration (it carries theme, plugins,
   content and media in one archive).
2. Upload `theme/` as `wp-content/themes/astro-mp-theme` (SFTP or WP Engine's Git Push) and
   activate it. Permalinks: post name.
3. Upload `deploy/wpengine/mu-plugins/mp-astro-config.php` to `wp-content/mu-plugins/` and
   fill in the constants: `MP_ASTRO_ORIGINS` (Netlify URL, `*.netlify.app` for deploy previews),
   `MP_ASTRO_DEPLOY_HOOK_URL` (Netlify build hook), `MP_ASTRO_SITE_URL` (front-end URL, makes
   WordPress redirect visitors there). WP Engine manages `wp-config.php`, so constants go in
   the mu-plugin.
4. Check `https://<install>.wpengine.com/wp-json/astro/v1/routes` answers and lists the pages.

### 10.2 Front-end on Netlify

`netlify.toml` in the repo root configures the build: base directory `astro`, command
`npm run gen:types && npm run build`, publish `dist`, Node 22.

1. Netlify > Add new site > Import from Git > this repository. The `netlify.toml` settings are
   picked up; keep the branch that should deploy.
2. Environment variables: `WP_API_URL` and `PUBLIC_WP_URL` = the WP Engine URL,
   `SITE_URL` = the Netlify URL (or leave it out to use each deploy's own URL, useful for
   previews), optional `PUBLIC_GTM_ID`, `PUBLIC_CLARITY_ID`.
3. Deploy. The build fetches every route from WP Engine, so the API must be reachable from
   Netlify's build servers (no HTTP auth / IP allow-list on the WP Engine environment, or add
   Netlify's ranges).
4. Site settings > Build & deploy > Build hooks > add one named "WordPress publish", copy its
   URL into `MP_ASTRO_DEPLOY_HOOK_URL` on WP Engine. From then on publishing a page, saving
   Theme Settings or a menu rebuilds the site.
5. Test a form submission on the Netlify URL: the browser posts to WP Engine; a CORS error
   means the origin is missing in `MP_ASTRO_ORIGINS`.

Media is served from WP Engine (the `srcset` URLs point there); `dist/404.html` is used by
Netlify for unknown paths.

## 11. Fonts

The Astro front-end loads Poppins and Montserrat from Google Fonts for now
(`astro/src/styles/fonts.css`). Before launch self-host them: convert with Google's
[woff2 compressor](https://github.com/google/woff2) (`woff2_compress <FONT_PATH>`), put the
files in `astro/public/fonts` and replace the `@import` with `@font-face` rules.
