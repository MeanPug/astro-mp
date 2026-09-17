/** Value shapes the astro/v1 endpoint returns for ACF field types. */

export interface AcfImageSize {
    url: string;
    width: number;
    height: number;
}

export interface AcfImage {
    id: number;
    url: string;
    width: number;
    height: number;
    alt: string;
    mime: string;
    srcset: string;
    sizes: Partial<Record<'thumbnail' | 'medium' | 'medium_large' | 'large' | 'full', AcfImageSize>>;
}

export interface AcfFile {
    id?: number;
    url: string;
    mime_type?: string;
    title?: string;
    filesize?: number;
}

export interface AcfLink {
    title: string;
    url: string;
    target: '' | '_blank' | '_self';
}

export interface AcfGoogleMap {
    address: string;
    lat: number | string;
    lng: number | string;
    zoom?: number | string;
    place_id?: string;
    name?: string;
}

/** post_object / relationship fields come back as WP_Post-like objects (return format "object"). */
export interface AcfPostRef {
    ID: number;
    post_title: string;
    post_name: string;
    post_type: string;
    post_excerpt?: string;
    guid?: string;
    [key: string]: unknown;
}

export interface AcfTermRef {
    term_id: number;
    name: string;
    slug: string;
    taxonomy: string;
}
