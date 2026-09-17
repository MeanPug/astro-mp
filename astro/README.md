# Astro front-end

Headless front-end (landing-page theme, `mp-*` blocks) for the WordPress theme in `../theme`. WordPress stays the CMS (Gutenberg
with the theme's ACF blocks); this app reads pages through the `astro/v1` REST endpoints
(`theme/inc/services/astro-api.php`) and renders them as a static site.
Setup, commands and the step-by-step guide for adding blocks are in the repo root
[`../README.md`](../README.md); architecture and status in
[`../docs/astro-integration-plan.md`](../docs/astro-integration-plan.md).

## Run locally

Everything runs in Docker from the repo root (Node 22 is required, the host may have an
older Node):

```bash
docker compose up -d astro
```

| URL | What |
|---|---|
| http://localhost:4321 | `astro dev`, live data from http://localhost:8000 |
| http://localhost:8000 | WordPress (content, ACF blocks, Gravity Forms) |

Useful commands (inside the container):

```bash
docker compose exec astro npm run build      # static build into astro/dist
docker compose exec astro npm run preview    # serve astro/dist on :4321
docker compose exec astro npm run gen:types  # regenerate block types from theme/acf-json
docker compose exec astro npx astro check    # type check
```

## Layout

```
src/
  lib/wp/            REST client, envelope types, generated block types (blocks.generated.ts)
  lib/gf/            Gravity Forms types
  layouts/Base.astro <head> (Yoast meta), header, footer, consult modal, site scripts
  components/
    BlockRenderer.astro   acf/<slug> -> component map + scroll-reveal rules
    blocks/Mp*.astro      one component per theme/blocks/mp-<slug>
    site/                 Header, Footer, ConsultModal, Seo
    forms/GravityForm.astro
    ui/                   Link (ACF link), WpImage, Placeholder, RichText, Carousel, InlineIcon
  pages/[...slug].astro   every published WordPress page
  scripts/                inviewport, accordion, carousel, gravity-form, site (modal, video)
  styles/                 tokens live in tailwind.config.cjs; base/forms/components.css; global.css is the entry
scripts/gen-block-types.mjs   acf-json -> TypeScript
```

## Conventions

- A block component receives `{ block, reveal }` (see `components/blocks/_shared.ts`) and
  spreads `sectionAttrs(block, reveal)` on its outermost element.
- Design tokens come from the Figma file (tailwind.config.cjs); `styles.*` selects of a block
  map to class strings inside the component.
- Blocks that need a WordPress query (`acf/posts`) get their data from a
  `mp_astro_block_fields/<slug>` filter in `astro-api.php`, never from the browser.
- Media stays on the WordPress host; internal links are site-relative and trailing-slashed.

## Environment

See `.env.example`. In Docker the values come from `docker-compose.yml`.
For the browser to submit Gravity Forms, WordPress must allow the front-end origin:
`define('MP_ASTRO_ORIGINS', 'https://www.example.com');` in `wp-config.php`
(defaults to `http://localhost:4321`). A deploy hook URL in `MP_ASTRO_DEPLOY_HOOK_URL`
makes publishing in WordPress trigger a rebuild.
