declare module 'micromodal' {
    interface MicroModalConfig {
        onShow?: (modal: HTMLElement, trigger?: HTMLElement, event?: Event) => void;
        onClose?: (modal: HTMLElement, trigger?: HTMLElement, event?: Event) => void;
        openTrigger?: string;
        closeTrigger?: string;
        openClass?: string;
        disableScroll?: boolean;
        disableFocus?: boolean;
        awaitOpenAnimation?: boolean;
        awaitCloseAnimation?: boolean;
        debugMode?: boolean;
    }
    const MicroModal: {
        init(config?: MicroModalConfig): void;
        show(id: string, config?: MicroModalConfig): void;
        close(id?: string): void;
    };
    export default MicroModal;
}
