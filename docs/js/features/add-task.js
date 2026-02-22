export class AddTaskController {
    constructor({ elements, taskService, onChange }) {
        this.$taskForm = elements.$taskForm;
        this.$addTaskButton = elements.$addTaskButton;
        this.$taskTitleInput = elements.$taskTitleInput;
        this.$taskColumnSelect = elements.$taskColumnSelect;
        this.$taskDueInput = elements.$taskDueInput;
        this.taskService = taskService;
        this.onChange = onChange;
    }

    init() {
        this.$taskForm.addEventListener("submit", event => this.handleTaskFormSubmit(event));
        this.$addTaskButton.addEventListener("click", () => this.handleAddTaskClick());
    }

    handleTaskFormSubmit(event) {
        event.preventDefault();
    }

    handleAddTaskClick() {
        if (!this.$taskTitleInput.value.trim()) {
            return;
        }

        this.taskService.addTask({
            title: this.$taskTitleInput.value,
            status: this.$taskColumnSelect.value,
            due: this.$taskDueInput.value
        });

        this.$taskTitleInput.value = "";
        this.$taskDueInput.value = "";
        this.onChange();
    }
}
