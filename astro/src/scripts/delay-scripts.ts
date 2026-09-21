/**
 * Delayed third-party scripts, the way WP Rocket's "delay JavaScript" works: Base.astro
 * renders GTM, CallRail, ApexChat and Clarity as `<script type="text/plain" data-mp-delay>`
 * so the browser ignores them. On the first user interaction (pointer, key, wheel, scroll,
 * touch), or a few seconds after the page has loaded, each one is swapped for a real script
 * tag with the same attributes and runs. First paint and LCP no longer compete with them.
 */
const DELAY_AFTER_LOAD_MS = 4000;
const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;
const LISTENER: AddEventListenerOptions = { passive: true, capture: true };

const pending = [...document.querySelectorAll<HTMLScriptElement>('script[type="text/plain"][data-mp-delay]')];

function release() {
    EVENTS.forEach((event) => window.removeEventListener(event, release, LISTENER));
    for (const placeholder of pending) {
        const script = document.createElement('script');
        for (const { name, value } of [...placeholder.attributes]) {
            if (name !== 'type' && name !== 'data-mp-delay') script.setAttribute(name, value);
        }
        if (!placeholder.src) script.textContent = placeholder.textContent;
        placeholder.replaceWith(script);
    }
    pending.length = 0;
}

if (pending.length) {
    EVENTS.forEach((event) => window.addEventListener(event, release, LISTENER));
    const arm = () => window.setTimeout(release, DELAY_AFTER_LOAD_MS);
    if (document.readyState === 'complete') arm();
    else window.addEventListener('load', arm, { once: true });
}

export {};
