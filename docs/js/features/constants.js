export const STORAGE_KEY = "tasks";

export const MODES = Object.freeze({
    NORMAL: "normal",
    ADD: "add",
    EDIT: "edit",
    MOVE: "move"
});

export const STATUS = Object.freeze({
    TODO: "todo",
    DOING: "doing",
    DONE: "done"
});

export const STATUS_BY_SHORTCUT = Object.freeze({
    "1": STATUS.TODO,
    "2": STATUS.DOING,
    "3": STATUS.DONE
});
