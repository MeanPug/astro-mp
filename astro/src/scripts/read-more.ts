/**
 * "Read more" for clamped text: `.mp-read-more` wraps a `.mp-read-more__text` (CSS line clamp)
 * and a `.mp-read-more__toggle` button. The button only shows when the text actually
 * overflows its clamp, so short texts render without a control; clicking toggles the full text.
 */
const EXPANDED = 'is-expanded';

function setup(root: HTMLElement) {
    const text = root.querySelector<HTMLElement>('.mp-read-more__text');
    const toggle = root.querySelector<HTMLButtonElement>('.mp-read-more__toggle');
    if (!text || !toggle) return;

    const update = () => {
        if (root.classList.contains(EXPANDED)) return;
        toggle.hidden = text.scrollHeight <= text.clientHeight + 1;
    };

    toggle.addEventListener('click', () => {
        const expanded = root.classList.toggle(EXPANDED);
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.textContent = expanded ? toggle.dataset.lessText || 'Read less' : toggle.dataset.moreText || 'Read more';
    });

    update();
    new ResizeObserver(update).observe(text);
}

document.querySelectorAll<HTMLElement>('.mp-read-more').forEach(setup);

// module scope, so `setup` does not collide with the other script files
export {};
