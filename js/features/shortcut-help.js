export class ShortcutHelpController {
    constructor({ elements }) {
        this.$shortcutHelpOpenButton = elements.$shortcutHelpOpenButton;
        this.$shortcutHelpModal = elements.$shortcutHelpModal;
        this.$shortcutHelpCloseButton = elements.$shortcutHelpCloseButton;
    }

    init() {
        this.$shortcutHelpOpenButton.addEventListener("click", () => this.handleOpenClick());
        this.$shortcutHelpCloseButton.addEventListener("click", () => this.handleCloseClick());
        this.$shortcutHelpModal.addEventListener("click", event => this.handleModalBackdropClick(event));
        document.addEventListener("keydown", event => this.handleEscapeKeydown(event));
    }

    handleOpenClick() {
        this.$shortcutHelpModal.classList.remove("shortcut-help-modal--hidden");
    }

    handleCloseClick() {
        this.$shortcutHelpModal.classList.add("shortcut-help-modal--hidden");
    }

    handleModalBackdropClick(event) {
        if (event.target !== this.$shortcutHelpModal) return;
        this.handleCloseClick();
    }

    handleEscapeKeydown(event) {
        if (event.key !== "Escape") return;
        if (this.$shortcutHelpModal.classList.contains("shortcut-help-modal--hidden")) return;
        this.handleCloseClick();
    }
}
