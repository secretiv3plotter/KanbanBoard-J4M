export class TaskModalController {
    constructor({ elements, taskService, onChange }) {
        this.$editModal = elements.$editModal;
        this.$modalTitleInput = elements.$modalTitleInput;
        this.$modalDueInput = elements.$modalDueInput;
        this.$modalStatusSelect = elements.$modalStatusSelect;
        this.$saveTaskButton = elements.$saveTaskButton;
        this.$deleteTaskButton = elements.$deleteTaskButton;
        this.$closeModalButton = elements.$closeModalButton;
        this.taskService = taskService;
        this.onChange = onChange;
        this.currentEditingId = null;
    }

    init() {
        this.$saveTaskButton.addEventListener("click", () => this.handleSaveClick());
        this.$deleteTaskButton.addEventListener("click", () => this.handleDeleteClick());
        this.$closeModalButton.addEventListener("click", () => this.handleCloseClick());
        this.$editModal.addEventListener("click", event => this.handleBackdropClick(event));
    }

    openModal(task) {
        this.currentEditingId = task.id;
        this.$modalTitleInput.value = task.title;
        this.$modalDueInput.value = task.due || "";
        this.$modalStatusSelect.value = task.status;
        this.$editModal.classList.remove("task-modal--hidden");
        this.$editModal.dataset.taskId = task.id;

        setTimeout(() => {
            this.$modalTitleInput.focus();
            this.$modalTitleInput.select();
        }, 0);
    }

    closeModal() {
        this.$editModal.classList.add("task-modal--hidden");
        this.currentEditingId = null;
        delete this.$editModal.dataset.taskId;
    }

    isOpen() {
        return !this.$editModal.classList.contains("task-modal--hidden");
    }

    handleSaveClick() {
        const taskId = this.currentEditingId || this.$editModal.dataset.taskId;
        if (!taskId) return;

        this.taskService.updateTask(taskId, {
            title: this.$modalTitleInput.value,
            due: this.$modalDueInput.value,
            status: this.$modalStatusSelect.value
        });
        this.onChange();
        this.closeModal();
    }

    handleDeleteClick() {
        const taskId = this.currentEditingId || this.$editModal.dataset.taskId;
        if (!taskId) return;

        this.taskService.deleteTask(taskId, true);
        this.onChange();
        this.closeModal();
    }

    handleCloseClick() {
        this.closeModal();
    }

    handleBackdropClick(event) {
        if (event.target !== this.$editModal) return;
        this.closeModal();
    }
}
