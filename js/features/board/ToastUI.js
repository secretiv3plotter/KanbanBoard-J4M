import { createElement } from "../../shared/createElement.js";

export class ToastUI {
    showUndoToast() {
        const $toast = createElement("div", {
            className: "undo-toast",
            textContent: "Task deleted. Press Ctrl+Z to undo."
        });

        document.body.appendChild($toast);
        setTimeout(() => $toast.remove(), 5000);
    }
}
