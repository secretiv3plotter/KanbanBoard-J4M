const CACHE_NAME = "kanban-board-shell-v2026-03-26-2";
const APP_SHELL_URLS = [
    "/pages/index.html",
    "/pages/auth.html",
    "/css/app/styles.css",
    "/css/shared/kanban.css",
    "/css/features/forms.css",
    "/css/features/board.css",
    "/css/features/task-modal.css",
    "/css/features/footer.css",
    "/css/features/feedback.css",
    "/css/features/shortcut-help.css",
    "/js/app/main.js",
    "/js/app/KanbanApp.js",
    "/js/pages/auth-page.js",
    "/js/shared/apiClient.js",
    "/js/shared/config.js",
    "/js/shared/constants.js",
    "/js/shared/createElement.js",
    "/js/shared/registerServiceWorker.js",
    "/js/shared/session.js",
    "/js/features/board/BoardUI.js",
    "/js/features/board/ColumnUI.js",
    "/js/features/board/TaskCardUI.js",
    "/js/features/board/ToastUI.js",
    "/js/features/keyboard/KeyboardController.js",
    "/js/features/shortcut-help/ShortcutHelpController.js",
    "/js/features/tasks/AddTaskController.js",
    "/js/features/tasks/OfflineTaskStore.js",
    "/js/features/tasks/TaskModalController.js",
    "/js/features/tasks/TaskService.js",
    "/assets/fonts/Quicksand-VariableFont_wght.ttf",
    "/assets/images/bg.png"
];

function cacheFirst(request) {
    return caches.match(request).then(cached => {
        if (cached) {
            return cached;
        }

        return fetch(request).then(response => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
            return response;
        });
    });
}

function networkFirst(request, fallbackUrl) {
    return fetch(request)
        .then(response => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
            return response;
        })
        .catch(async () => {
            const cached = await caches.match(request);
            if (cached) {
                return cached;
            }

            return caches.match(fallbackUrl);
        });
}

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.map(key => {
                    if (key === CACHE_NAME) {
                        return null;
                    }

                    return caches.delete(key);
                })
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);

    if (event.request.mode === "navigate") {
        const fallbackUrl = url.pathname === "/pages/auth.html" ? "/pages/auth.html" : "/pages/index.html";
        event.respondWith(networkFirst(event.request, fallbackUrl));
        return;
    }

    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(event.request));
    }
});
