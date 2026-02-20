document.addEventListener("DOMContentLoaded", () => {

    const addBtn = document.querySelector(".btn.add");
    const titleInput = document.getElementById("taskTitle");
    const columnSelect = document.getElementById("taskColumn");
    const dueInput = document.getElementById("taskDue");
    const modal = document.getElementById("editModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalDue = document.getElementById("modalDue");
    const saveBtn = document.getElementById("saveTaskBtn");
    const deleteBtn = document.getElementById("deleteTaskBtn");
    const closeBtn = document.getElementById("closeModalBtn");

    let currentEditingId = null;

    // ===============================
    // LOAD TASKS ON START
    // ===============================
    renderTasks();

    // ===============================
    // ADD TASK
    // ===============================
    addBtn.addEventListener("click", () => {

        const title = titleInput.value.trim();
        const status = columnSelect.value;
        const due = dueInput.value;

        if (!title) return;

        const newTask = {
            id: Date.now().toString(),
            title: title,
            due: due,
            status: status
        };

        const tasks = getTasks();
        tasks.push(newTask);
        saveTasks(tasks);

        titleInput.value = "";
        dueInput.value = "";

        renderTasks();
    });

    // ===============================
    // GET TASKS FROM LOCALSTORAGE
    // ===============================
    function getTasks() {
        return JSON.parse(localStorage.getItem("tasks")) || [];
    }

    function saveTasks(tasks) {
        localStorage.setItem("tasks", JSON.stringify(tasks));
    }

    // ===============================
    // RENDER TASKS
    // ===============================
    function renderTasks() {

        document.querySelectorAll(".task-list").forEach(col => {
            col.innerHTML = "";
        });

        const tasks = getTasks();

        tasks.forEach(task => {
            const taskElement = createTaskElement(task);

            const column = document.querySelector(
                `.column[data-column="${task.status}"] .task-list`
            );

            column.appendChild(taskElement);
        });
    }

    // ===============================
    // CREATE TASK ELEMENT
    // ===============================
    function createTaskElement(task) {

        const div = document.createElement("div");
        div.classList.add("task");
        div.draggable = true;
        div.dataset.taskId = task.id;

        const title = document.createElement("span");
        title.textContent = task.title;
        div.appendChild(title);

        if (task.due) {
            const due = document.createElement("small");
            due.textContent = " (Due: " + task.due + ")";
            div.appendChild(due);
        }

        // CLICK TO OPEN MODAL
        div.addEventListener("click", () => {
            openModal(task);
        });

        div.addEventListener("dragstart", () => {
            div.classList.add("dragging");
        });

        div.addEventListener("dragend", () => {
            div.classList.remove("dragging");
        });

        return div;
    }
    // ===============================
    // UPDATE TASK STATUS
    // ===============================
    function updateTaskStatus(taskId, newStatus) {

        const tasks = getTasks();

        const updated = tasks.map(task => {
            if (task.id === taskId) {
                task.status = newStatus;
            }
            return task;
        });

        saveTasks(updated);
    }

    function editTask(taskId) {

        const tasks = getTasks();
        const task = tasks.find(t => t.id === taskId);

        const newTitle = prompt("Edit task title:", task.title);
        if (newTitle === null) return;

        const newDue = prompt("Edit due date (YYYY-MM-DD):", task.due);

        task.title = newTitle.trim() || task.title;
        task.due = newDue;

        saveTasks(tasks);
        renderTasks();
    }

    function deleteTask(taskId) {

        const tasks = getTasks();
        const updated = tasks.filter(task => task.id !== taskId);

        saveTasks(updated);
        renderTasks();
    }

    function openModal(task) {
        currentEditingId = task.id;
        modalTitle.value = task.title;
        modalDue.value = task.due || "";
        modal.classList.remove("hidden");
    }

    function closeModal() {
        modal.classList.add("hidden");
        currentEditingId = null;
    }

    saveBtn.addEventListener("click", () => {

        const tasks = getTasks();
        const task = tasks.find(t => t.id === currentEditingId);

        if (!task) return;

        task.title = modalTitle.value.trim();
        task.due = modalDue.value;

        saveTasks(tasks);
        renderTasks();
        closeModal();
    });

    deleteBtn.addEventListener("click", () => {

        const tasks = getTasks();
        const updated = tasks.filter(t => t.id !== currentEditingId);

        saveTasks(updated);
        renderTasks();
        closeModal();
    });

    closeBtn.addEventListener("click", closeModal);

    // ===============================
    // DRAG & DROP
    // ===============================
    document.querySelectorAll(".task-list").forEach(column => {

        column.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        column.addEventListener("drop", (e) => {
            e.preventDefault();

            const dragged = document.querySelector(".dragging");
            if (!dragged) return;

            const taskId = dragged.dataset.taskId;
            const newStatus = column.closest(".column").dataset.column;

            updateTaskStatus(taskId, newStatus);

            renderTasks();
        });
    });

});