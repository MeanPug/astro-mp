/**
 * Small site-wide behaviours: MicroModal for the lead-form popup, click-to-play video,
 * duplicated marquee tracks kept out of the tab order.
 */
import MicroModal from 'micromodal';

/* ---- modal ---- */
MicroModal.init({
    disableScroll: true,
    awaitCloseAnimation: true,
});

/* ---- video player ---- */
document.addEventListener('click', (event) => {
    const overlay = (event.target as HTMLElement).closest<HTMLElement>('.mp-video-player__overlay');
    if (!overlay) return;
    const video = overlay.closest('.mp-video-player')?.querySelector('video');
    overlay.classList.add('hidden');
    video?.classList.remove('hidden');
    void video?.play();
});

/* ---- marquee copy ---- */
const takeOutOfTabOrder = (root: Element) => {
    root.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])').forEach((el) => el.setAttribute('tabindex', '-1'));
};
document.querySelectorAll('.mp-marquee__track[aria-hidden="true"]').forEach((copy) => {
    takeOutOfTabOrder(copy);
    // third-party badges (Super Lawyers) replace their placeholder long after this runs
    new MutationObserver(() => takeOutOfTabOrder(copy)).observe(copy, { childList: true, subtree: true });
});
