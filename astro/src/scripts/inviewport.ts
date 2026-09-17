/**
 * Scroll reveal: toggles `is-inviewport` on [data-inviewport] elements as they enter/leave
 * the viewport. The reveal styles (styles/base.css) only hide content under the `mp-reveal`
 * class on <html>, so a blocked script leaves the page readable.
 *
 * The toggle is held back until the element is properly on screen; phones and tablets
 * scroll in short viewports, so they get a shallower margin and content shows sooner.
 */
const targets = document.querySelectorAll<HTMLElement>('[data-inviewport]');

if (targets.length && 'IntersectionObserver' in window) {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                entry.target.classList.toggle('is-inviewport', entry.isIntersecting);
            }
        },
        { rootMargin: `0px 0px ${desktop ? '-15%' : '-8%'} 0px`, threshold: 0 },
    );

    targets.forEach((el) => observer.observe(el));
    document.documentElement.classList.add('mp-reveal');
}
