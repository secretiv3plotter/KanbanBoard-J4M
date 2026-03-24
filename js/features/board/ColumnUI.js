export class ColumnUI {
    getTaskLists() {
        return Array.from(document.querySelectorAll(".kanban-board__task-list"));
    }

    getColumns() {
        return Array.from(document.querySelectorAll(".kanban-board__column"));
    }

    getTasksInColumn($column) {
        return Array.from($column.querySelectorAll(".kanban-task"));
    }

    getTaskListByStatus(status) {
        return document.querySelector(`.kanban-board__column[data-column="${status}"] .kanban-board__task-list`);
    }
}
