/**
 * Progressive enhancement for GravityForm.astro: posts the form as JSON to the Gravity
 * Forms REST API (POST /gf/v2/forms/{id}/submissions), paints validation messages in the
 * same places Gravity Forms would, then shows the confirmation message or redirects.
 * Redirect confirmations resolve `{embed_url}` on the client (the API has no embed page).
 */
import type { GfSubmissionResponse } from '../lib/gf/types';

const SUBMITTING = 'is-submitting';

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

function showErrors(form: HTMLFormElement, messages: Record<string, string>) {
    const summary = form.querySelector<HTMLElement>('.gform_validation_errors');
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

    if (summary) {
        summary.textContent = 'There was a problem with your submission. Please review the fields below.';
        summary.hidden = false;
        summary.focus();
    }
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
        const response = await fetch(form.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(collect(form)),
        });
        const payload = (await response.json()) as Partial<GfSubmissionResponse> & { message?: string };

        if (!response.ok && payload.is_valid === undefined) {
            throw new Error(payload.message || response.statusText);
        }

        if (payload.is_valid) {
            showConfirmation(form, payload);
        } else {
            showErrors(form, payload.validation_messages ?? {});
        }
    } catch (error) {
        const summary = form.querySelector<HTMLElement>('.gform_validation_errors');
        if (summary) {
            summary.textContent = 'Something went wrong while sending the form. Please try again or call us.';
            summary.hidden = false;
        }
        console.error('[gravity-form]', error);
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
