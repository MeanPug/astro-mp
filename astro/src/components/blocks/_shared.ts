import type { AcfBlock } from '../../lib/wp/types';

/** Props every block component receives from BlockRenderer. */
export interface BlockProps<N extends AcfBlock['name']> {
    block: AcfBlock<N>;
    /** Whether the block takes part in the scroll reveal (data-inviewport, scripts/inviewport.ts). */
    reveal: boolean;
}

/** Attributes for the block's outermost element: anchor id + reveal marker. */
export function sectionAttrs(block: { anchor: string | null }, reveal: boolean): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (block.anchor) attrs.id = block.anchor;
    if (reveal) attrs['data-inviewport'] = 'up';
    return attrs;
}

/** Style select with a fallback for empty/missing values. */
export function styleOf(styles: Record<string, unknown> | undefined | null, key: string, fallback: string): string {
    const value = styles?.[key];
    return typeof value === 'string' && value !== '' ? value : fallback;
}
