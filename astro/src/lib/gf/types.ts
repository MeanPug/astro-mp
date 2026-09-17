/** Gravity Form definition as returned by GET /astro/v1/form/{id}. */

export interface GfChoice {
    text: string;
    value: string;
    isSelected: boolean;
}

export interface GfInput {
    id: string; // "1.3"
    label: string;
    name: string;
    isHidden: boolean;
    placeholder: string;
}

export interface GfField {
    id: number;
    type: string;
    inputType: string;
    label: string;
    adminLabel: string;
    description: string;
    descriptionPlacement: string;
    placeholder: string;
    defaultValue: string;
    isRequired: boolean;
    cssClass: string;
    size: string;
    maxLength: string | number;
    phoneFormat: string;
    labelPlacement: string;
    layoutGridColumnSpan: string | number;
    choices: GfChoice[] | null;
    inputs: GfInput[] | null;
    content: string | null;
    checkboxLabel: string | null;
    conditionalLogic: unknown | null;
}

export interface GfConfirmation {
    id: string;
    name: string;
    isDefault: boolean;
    type: 'message' | 'redirect' | 'page';
    message: string;
    url: string;
    pageId: number;
    pagePath: string;
}

export interface GfForm {
    id: number;
    title: string;
    description: string;
    labelPlacement: string;
    descriptionPlacement: string;
    button: { text: string };
    honeypot: boolean;
    requiredIndicator: string;
    fields: GfField[];
    confirmations: GfConfirmation[];
    submitUrl: string;
}

/** Response of POST /gf/v2/forms/{id}/submissions */
export interface GfSubmissionResponse {
    is_valid: boolean;
    validation_messages?: Record<string, string>;
    page_number?: number;
    source_page_number?: number;
    confirmation_message?: string;
    confirmation_type?: 'message' | 'redirect';
    confirmation_redirect?: string;
    entry_id?: number;
    resume_token?: string;
}
