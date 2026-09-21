import type { AcfImage } from './acf';
import type { BlockFieldsByName, BlockName } from './blocks.generated';

export type { BlockFieldsByName, BlockName };

export interface WpRoute {
    id: number;
    type: 'page' | 'post' | 'team' | 'testimonials' | 'blog-index' | string;
    title: string;
    path: string;
    modified: string;
}

export interface WpRoutesResponse {
    generated: string;
    routes: WpRoute[];
}

/** An ACF block with formatted field values. */
export interface AcfBlock<N extends BlockName = BlockName> {
    name: N;
    anchor: string | null;
    fields: BlockFieldsByName[N] & Record<string, unknown>;
}

/** Any non-ACF block (only core/embed is allowed in the editor) arrives pre-rendered. */
export interface HtmlBlock {
    name: string;
    anchor: string | null;
    html: string;
}

export type WpBlock = AcfBlock | HtmlBlock;

export const isAcfBlock = (block: WpBlock): block is AcfBlock => 'fields' in block;

export interface WpSeo {
    html: string;
    json: Record<string, unknown>;
}

export interface WpCategory {
    id: number;
    name: string;
    slug: string;
    path: string;
}

export interface WpPage extends WpRoute {
    slug: string;
    date: string;
    excerpt: string;
    featured_image: AcfImage | null;
    template: string;
    parent: WpRoute | null;
    acf: Record<string, unknown>;
    seo: WpSeo | null;
    blocks: WpBlock[];
    categories?: WpCategory[];
    author?: string;
}

export interface WpMenuItem {
    id: number;
    title: string;
    url: string;
    target: string;
    classes: string[];
    children: WpMenuItem[];
}

export interface WpGlobals {
    site: {
        name: string;
        description: string;
        url: string;
        language: string;
    };
    logo: AcfImage | null;
    menus: {
        nav: WpMenuItem[];
        footer: WpMenuItem[];
        'footer-1': WpMenuItem[];
    };
    options: ThemeOptions & Record<string, unknown>;
}

/** MeanPug Theme Settings (theme/acf-json/group_612fdf47d2f22.json), the parts the layout uses. */
export interface ThemeOptions {
    contact_phone?: { title: string; url: string; target: string } | null;
    contact_email?: string;
    navigation_cta?: { title: string; url: string; target: string } | null;
    header_phone_icon?: AcfImage | null;
    footer_logo?: AcfImage | null;
    footer_background?: AcfImage | null;
    footer_tagline?: string;
    footer_attorney_advertising?: string;
    social_profiles?: { site: string; url: string }[];
    footer_menu?: {
        footer_menu_heading_1?: string;
        footer_menu_heading_url_1?: string;
        footer_menu_heading_2?: string;
        footer_menu_heading_url_2?: string;
    };
    global_modal_form?: {
        caption?: string;
        content?: string;
        form_shortcode?: string;
    };
    /** Theme Settings > Integrations: ApexChat company slug; empty disables the widget. */
    apexchat_company?: string;
    /** Theme Settings > Integrations: Google Tag Manager container, e.g. GTM-XXXXXXX. */
    gtm_id?: string;
    /** Theme Settings > Integrations: src of CallRail's swap.js (number swapping + form tracking). */
    callrail_script_url?: string;
    /** Theme Settings > Astro Front-end: false sends noindex and a blocking robots.txt (test deploys). */
    astro_indexable?: boolean;
}
