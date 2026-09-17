/**
 * FAQ accordion.
 * Markup: .mp-accordion-container > .mp-accordion > .mp-accordion__trigger + .mp-accordion__body
 * Only one item per container stays open; the body animates through max-height.
 */
class Accordion {
    private readonly body: HTMLElement | null;
    private readonly trigger: HTMLElement | null;
    isOpen: boolean;
    readonly duration: number;

    constructor(readonly root: HTMLElement) {
        this.body = root.querySelector<HTMLElement>('.mp-accordion__body');
        this.trigger = root.querySelector<HTMLElement>('.mp-accordion__trigger');
        this.isOpen = root.classList.contains('open');
        this.duration = this.body ? parseFloat(getComputedStyle(this.body).transitionDuration) * 1000 || 500 : 500;

        if (this.isOpen && this.body) this.body.style.maxHeight = `${this.body.scrollHeight}px`;
        this.trigger?.addEventListener('click', () => this.toggle());
    }

    toggle() {
        if (this.isOpen) {
            this.close();
            return;
        }

        const container = this.root.closest('.mp-accordion-container');
        const open = container?.querySelector<HTMLElement>('.mp-accordion.open');
        const openInstance = open ? instances.get(open) : undefined;

        if (openInstance && openInstance !== this) {
            openInstance.close();
            window.setTimeout(() => this.open(), openInstance.duration / 2);
        } else {
            this.open();
        }
    }

    open() {
        if (!this.body) return;
        this.root.classList.add('open');
        this.trigger?.setAttribute('aria-expanded', 'true');
        this.body.style.maxHeight = `${this.body.scrollHeight}px`;

        const onEnd = (event: TransitionEvent) => {
            if (event.target !== this.body || event.propertyName !== 'max-height') return;
            if (this.root.classList.contains('open') && this.body) this.body.style.maxHeight = 'none';
            this.body?.removeEventListener('transitionend', onEnd);
        };
        this.body.addEventListener('transitionend', onEnd);
        this.isOpen = true;
    }

    close() {
        if (!this.body) return;
        this.body.style.maxHeight = `${this.body.scrollHeight}px`;
        requestAnimationFrame(() => {
            if (this.body) this.body.style.maxHeight = '0px';
        });
        this.root.classList.remove('open');
        this.trigger?.setAttribute('aria-expanded', 'false');
        this.isOpen = false;
    }
}

const instances = new WeakMap<HTMLElement, Accordion>();

document.querySelectorAll<HTMLElement>('.mp-accordion').forEach((root) => {
    instances.set(root, new Accordion(root));
});
