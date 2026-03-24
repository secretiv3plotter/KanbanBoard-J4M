import { createElement } from "../../shared/createElement.js";

export class TaskCardUI {
    createTaskElement(task) {
        const $title = createElement("span", {
            className: "kanban-task__title",
            textContent: task.title
        });

        const $task = createElement("div", {
            className: "kanban-task",
            draggable: true,
            tabIndex: 0,
            role: "button",
            dataset: {
                taskId: task.id
            },
            children: [$title]
        });

        this.appendDueDate($task, task.due);
        return $task;
    }

    appendDueDate($task, dueDate) {
        if (!dueDate) return;

        const $due = createElement("span", {
            className: "kanban-task__due",
            textContent: `Due: ${this.formatDueDate(dueDate)}`
        });

        $task.appendChild($due);
    }

    formatDueDate(dueDate) {
        const parsedDate = new Date(`${dueDate}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
            return dueDate;
        }

        const day = parsedDate.getDate();
        const month = parsedDate.toLocaleString("en-US", { month: "long" });
        const year = parsedDate.getFullYear();
        return `${day} ${month}, ${year}`;
    }
}
