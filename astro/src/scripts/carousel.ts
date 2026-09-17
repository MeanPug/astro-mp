/**
 * Scroll-snap carousel (ui/Carousel.astro): arrows scroll one viewport width, dots reflect
 * the current page. Native scrolling and snapping do the heavy lifting; this only wires the
 * controls, so the markup works without JS as a horizontal scroller.
 */
function setup(root: HTMLElement) {
    const viewport = root.querySelector<HTMLElement>('[data-carousel-viewport]');
    const prev = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
    const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
    const dots = root.querySelector<HTMLElement>('[data-carousel-dots]');
    if (!viewport) return;

    // the trailing gap must not count as an extra page (6 slides of 1/3 width are 2 pages, not 3)
    const pages = () => Math.max(1, Math.ceil(viewport.scrollWidth / viewport.clientWidth - 0.1));
    const page = () => Math.round(viewport.scrollLeft / viewport.clientWidth);

    const renderDots = () => {
        if (!dots) return;
        dots.innerHTML = '';
        for (let i = 0; i < pages(); i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'mp-carousel__dot';
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', `Page ${i + 1}`);
            dot.addEventListener('click', () => viewport.scrollTo({ left: i * viewport.clientWidth, behavior: 'smooth' }));
            dots.appendChild(dot);
        }
        update();
    };

    const update = () => {
        const current = page();
        const last = pages() - 1;
        dots?.querySelectorAll('.mp-carousel__dot').forEach((dot, i) => {
            dot.classList.toggle('is-active', i === current);
            dot.setAttribute('aria-selected', String(i === current));
        });
        if (prev) prev.disabled = current <= 0;
        if (next) next.disabled = current >= last;
        root.classList.toggle('is-scrollable', last > 0);
    };

    prev?.addEventListener('click', () => viewport.scrollBy({ left: -viewport.clientWidth, behavior: 'smooth' }));
    next?.addEventListener('click', () => viewport.scrollBy({ left: viewport.clientWidth, behavior: 'smooth' }));
    viewport.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', renderDots);
    renderDots();
}

document.querySelectorAll<HTMLElement>('[data-carousel]').forEach(setup);
