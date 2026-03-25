import { apiClient } from "../shared/apiClient.js";
import { clearSession, getSession, setSession } from "../shared/session.js";
import { registerServiceWorker } from "../shared/registerServiceWorker.js";
import { KanbanApp } from "./KanbanApp.js";

document.addEventListener("DOMContentLoaded", () => {
    void init();
});

function disableGoogleAutoSelect() {
    try {
        window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
        // Ignore Google session cleanup issues.
    }
}

function handlePageShow(event) {
    if (event.persisted) {
        window.location.reload();
    }
}

async function init() {
    await registerServiceWorker();
    window.addEventListener("pageshow", handlePageShow);

    const usernameElement = document.getElementById("KANBAN_USERNAME");
    const logoutButton = document.getElementById("LOGOUT_BTN");
    const session = getSession();

    if (!session?.token) {
        window.location.replace("./auth.html");
        return;
    }

    let activeSession = session;
    if (navigator.onLine) {
        try {
            const result = await apiClient.me();
            activeSession = setSession({
                token: session.token,
                user: result.user
            });
        } catch (error) {
            if (error?.status === 401) {
                clearSession();
                window.location.replace("./auth.html");
                return;
            }
        }
    }

    const app = new KanbanApp({ session: activeSession });
    await app.start();

    if (usernameElement) {
        usernameElement.textContent = activeSession.user.username || "username";
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            app.destroy();
            disableGoogleAutoSelect();
            clearSession();
            void apiClient.logout().catch(() => {
                // Client-side logout still succeeds if the backend is unreachable.
            });
        });
    }
}
