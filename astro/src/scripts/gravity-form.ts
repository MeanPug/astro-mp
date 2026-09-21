/**
 * Progressive enhancement for GravityForm.astro: posts the form as JSON to the Gravity
 * Forms REST API (POST /gf/v2/forms/{id}/submissions), paints validation messages in the
 * same places Gravity Forms would, then shows the confirmation message or redirects.
 * Redirect confirmations resolve `{embed_url}` on the client (the API has no embed page).
 *
 * Forms with data-recaptcha-* attributes are protected by reCAPTCHA v3 (Gravity Forms
 * reCAPTCHA add-on): the Google script loads once per page, a token is fetched on submit and
 * posted under the input name the add-on validates. Missing or failed tokens never submit.
 */
import type { GfSubmissionResponse } from '../lib/gf/types';

const SUBMITTING = 'is-submitting';

interface Grecaptcha {
    ready(callback: () => void): void;
    execute(siteKey: string, options: { action: string }): Promise<string>;
    enterprise?: Grecaptcha;
}

declare global {
    interface Window {
        grecaptcha?: Grecaptcha;
    }
}

/** Error whose message is safe to show to the visitor. */
class SubmitError extends Error {}

interface RecaptchaConfig {
    key: string;
    type: 'classic' | 'enterprise';
    input: string;
    action: string;
}

function recaptchaOf(form: HTMLFormElement): RecaptchaConfig | null {
    const { recaptchaKey, recaptchaType, recaptchaInput, recaptchaAction } = form.dataset;
    if (!recaptchaKey || !recaptchaInput) return null;
    return { key: recaptchaKey, type: recaptchaType === 'enterprise' ? 'enterprise' : 'classic', input: recaptchaInput, action: recaptchaAction || 'submit' };
}

let recaptchaScript: Promise<void> | null = null;

function loadRecaptcha({ key, type }: RecaptchaConfig): Promise<void> {
    recaptchaScript ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/${type === 'enterprise' ? 'enterprise' : 'api'}.js?render=${encodeURIComponent(key)}`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            recaptchaScript = null; // allow a retry on the next submit
            reject(new Error('reCAPTCHA script failed to load'));
        };
        document.head.append(script);
    });
    return recaptchaScript;
}

async function recaptchaToken(config: RecaptchaConfig): Promise<string> {
    try {
        await loadRecaptcha(config);
        const api = config.type === 'enterprise' ? window.grecaptcha?.enterprise : window.grecaptcha;
        if (!api) throw new Error('grecaptcha is not available');
        await new Promise<void>((ready) => api.ready(ready));
        return await api.execute(config.key, { action: config.action });
    } catch (error) {
        console.error('[gravity-form] reCAPTCHA', error);
        throw new SubmitError('We could not verify your browser. Please allow google.com scripts and try again, or call us.');
    }
}

function collect(form: HTMLFormElement): Record<string, string | string[]> {
    const data: Record<string, string | string[]> = {};
    const formData = new FormData(form);
    for (const [key, value] of formData.entries()) {
        if (typeof value !== 'string') continue;
        const name = key.replace(/\[\]$/, '');
        if (key.endsWith('[]')) {
            const list = (data[name] as string[] | undefined) ?? [];
            list.push(value);
            data[name] = list;
        } else {
            data[name] = value;
        }
    }
    return data;
}

function clearErrors(form: HTMLFormElement) {
    form.querySelectorAll<HTMLElement>('.validation_message').forEach((el) => {
        el.textContent = '';
        el.hidden = true;
    });
    form.querySelectorAll('.gfield_error').forEach((el) => el.classList.remove('gfield_error'));
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.setAttribute('aria-invalid', 'false'));
    const summary = form.querySelector<HTMLElement>('.gform_validation_errors');
    if (summary) {
        summary.textContent = '';
        summary.hidden = true;
    }
}

function showSummary(form: HTMLFormElement, message: string) {
    const summary = form.querySelector<HTMLElement>('.gform_validation_errors');
    if (!summary) return;
    summary.textContent = message;
    summary.hidden = false;
    summary.focus();
}

function showErrors(form: HTMLFormElement, messages: Record<string, string>) {
    let first: HTMLElement | null = null;

    for (const [fieldId, message] of Object.entries(messages)) {
        const wrapper = form.querySelector<HTMLElement>(`[data-field-id="${fieldId}"]`);
        if (!wrapper) continue;
        wrapper.classList.add('gfield_error');
        wrapper.querySelectorAll('input, select, textarea').forEach((el) => el.setAttribute('aria-invalid', 'true'));
        const slot = wrapper.querySelector<HTMLElement>('.validation_message');
        if (slot) {
            slot.textContent = message;
            slot.hidden = false;
        }
        first ??= wrapper;
    }

    // no field to point at: the failure is form-level, in practice a rejected reCAPTCHA token
    showSummary(form, first ? 'There was a problem with your submission. Please review the fields below.' : 'We could not verify your submission. Please reload the page and try again, or call us.');
    first?.querySelector<HTMLElement>('input, select, textarea')?.focus();
}

function resolveRedirect(form: HTMLFormElement, response: Partial<GfSubmissionResponse>): string {
    const template = form.dataset.confirmationUrl || response.confirmation_redirect || '';
    const embedUrl = `${location.origin}${location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`}`;
    return template.replace(/\{embed_url\}/gi, embedUrl).replace(/\{embed_post:ID\}/gi, '');
}

function showConfirmation(form: HTMLFormElement, response: Partial<GfSubmissionResponse>) {
    const type = form.dataset.confirmationType || response.confirmation_type || 'message';

    if (type === 'redirect' || type === 'page') {
        const url = resolveRedirect(form, response);
        if (url) {
            location.assign(url);
            return;
        }
    }

    const box = form.querySelector<HTMLElement>('.gform_confirmation_message');
    const message = response.confirmation_message || '<p>Thank you. Your submission has been received.</p>';
    form.querySelectorAll<HTMLElement>('.gform_body, .gform_footer').forEach((el) => (el.hidden = true));
    if (box) {
        box.innerHTML = message;
        box.hidden = false;
        box.focus();
    }
}

async function submit(form: HTMLFormElement) {
    if (form.classList.contains(SUBMITTING)) return;
    clearErrors(form);

    if (!form.checkValidity()) {
        // let the browser show native messages for required/format problems first
        form.reportValidity();
        return;
    }

    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const idleText = button?.textContent ?? '';
    form.classList.add(SUBMITTING);
    if (button) {
        button.disabled = true;
        button.textContent = button.dataset.submittingText ?? idleText;
    }

    try {
        const data = collect(form);
        const recaptcha = recaptchaOf(form);
        if (recaptcha) {
            data[recaptcha.input] = await recaptchaToken(recaptcha);
        }

        const response = await fetch(form.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data),
        });
        const payload = (await response.json()) as Partial<GfSubmissionResponse> & { code?: string; message?: string };

        if (!response.ok && payload.is_valid === undefined) {
            // errors raised by the theme (mp_astro_*) carry a visitor-facing message
            if (payload.code?.startsWith('mp_astro_') && payload.message) throw new SubmitError(payload.message);
            throw new Error(payload.message || response.statusText);
        }

        if (payload.is_valid) {
            showConfirmation(form, payload);
        } else {
            showErrors(form, payload.validation_messages ?? {});
        }
    } catch (error) {
        showSummary(form, error instanceof SubmitError ? error.message : 'Something went wrong while sending the form. Please try again or call us.');
        if (!(error instanceof SubmitError)) console.error('[gravity-form]', error);
    } finally {
        form.classList.remove(SUBMITTING);
        if (button) {
            button.disabled = false;
            button.textContent = idleText;
        }
    }
}

document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement | null;
    if (!form?.matches('form[data-gravity-form]')) return;
    event.preventDefault();
    void submit(form);
});

// v3 scores browsing behaviour, so the script should be on the page before the visitor
// submits; load it once the page has finished loading rather than on the first submit
const protectedForm = document.querySelector<HTMLFormElement>('form[data-gravity-form][data-recaptcha-key]');
if (protectedForm) {
    const config = recaptchaOf(protectedForm);
    const warmUp = () => config && loadRecaptcha(config).catch(() => undefined);
    if (document.readyState === 'complete') warmUp();
    else window.addEventListener('load', warmUp, { once: true });
}
