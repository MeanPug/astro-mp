import { WP_API_URL } from 'astro:env/server';
import type { GfForm } from '../gf/types';
import type { WpGlobals, WpPage, WpRoutesResponse } from './types';

/** `example.wpengine.com` and `https://example.wpengine.com/` both become `https://example.wpengine.com`. */
export function normalizeOrigin(value: string): string {
    const trimmed = value.trim().replace(/\/+$/, '');
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const API_BASE = `${normalizeOrigin(WP_API_URL)}/wp-json/astro/v1`;

/** One fetch per URL per build/dev process: pages share globals, forms repeat across pages. */
const cache = new Map<string, Promise<unknown>>();

class WpApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly url: string,
        message: string,
    ) {
        super(`${message} (${status} ${url})`);
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${API_BASE}${path}`;
    let response: Response;
    try {
        response = await fetch(url, { ...init, headers: { Accept: 'application/json', ...init?.headers } });
    } catch (error) {
        // a network-level failure (DNS, refused connection) means WordPress is not reachable from here
        const hint = /localhost|127\.0\.0\.1|wordpress/.test(WP_API_URL)
            ? 'WP_API_URL still points at the local Docker WordPress. Set WP_API_URL (and PUBLIC_WP_URL) to the public WordPress URL in the build environment.'
            : 'Check that the WordPress site is up and reachable from the build machine (no HTTP auth / IP allow-list on the REST API).';
        throw new Error(`Cannot reach WordPress at ${url}: ${(error as Error).message}. ${hint}`);
    }
    if (!response.ok) {
        let message = response.statusText;
        try {
            const body = (await response.json()) as { message?: string };
            if (body?.message) message = body.message;
        } catch {
            /* non-JSON error body */
        }
        throw new WpApiError(response.status, url, message);
    }
    return (await response.json()) as T;
}

function cached<T>(path: string): Promise<T> {
    // the dev server keeps one process across reloads: skip the cache so WordPress edits show up
    if (import.meta.env.DEV) return request<T>(path);
    if (!cache.has(path)) {
        const pending = request<T>(path).catch((error) => {
            cache.delete(path); // let the next caller retry a transient failure
            throw error;
        });
        cache.set(path, pending);
    }
    return cache.get(path) as Promise<T>;
}

export const getRoutes = () => cached<WpRoutesResponse>('/routes');

export const getGlobals = () => cached<WpGlobals>('/globals');

export const getPageByPath = (path: string) => cached<WpPage>(`/page?path=${encodeURIComponent(normalizePath(path))}`);

export const getPageById = (id: number) => cached<WpPage>(`/page?id=${id}`);

export const getForm = (id: number) => cached<GfForm>(`/form/${id}`);

/** Missing/inactive forms render nothing instead of failing the build. */
export async function findForm(id: number): Promise<GfForm | null> {
    try {
        return await getForm(id);
    } catch (error) {
        if (error instanceof WpApiError && (error.status === 404 || error.status === 501)) return null;
        throw error;
    }
}

/** Absent pages resolve to null instead of throwing (404 pages, optional lookups). */
export async function findPageByPath(path: string): Promise<WpPage | null> {
    try {
        return await getPageByPath(path);
    } catch (error) {
        if (error instanceof WpApiError && error.status === 404) return null;
        throw error;
    }
}

/** `/a/b` and `a/b/` both become `/a/b/`; the root stays `/`. */
export function normalizePath(path: string): string {
    const trimmed = path.replace(/^\/+|\/+$/g, '');
    return trimmed ? `/${trimmed}/` : '/';
}

export { WpApiError };
