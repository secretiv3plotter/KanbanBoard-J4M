const SESSION_KEY = "kanban.session";
const LEGACY_USERNAME_KEY = "kanbanUsername";
const LEGACY_EMAIL_KEY = "kanbanEmail";
const LEGACY_RAW_USERNAME_KEY = "username";
const LEGACY_RAW_EMAIL_KEY = "email";

function safeParse(value) {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export function normalizeUser(user = {}) {
    const userId = user.userId || user.id || user.user_id || null;
    return {
        userId: userId ? String(userId) : null,
        email: String(user.email || "").trim(),
        username: String(user.username || "").trim(),
        role: String(user.role || "user")
    };
}

export function setSession({ token, user }) {
    if (!token) {
        throw new Error("Token is required.");
    }

    const session = {
        token: String(token),
        user: normalizeUser(user),
        savedAt: new Date().toISOString()
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    if (session.user.username) {
        localStorage.setItem(LEGACY_USERNAME_KEY, session.user.username);
        localStorage.setItem(LEGACY_RAW_USERNAME_KEY, session.user.username);
    }

    if (session.user.email) {
        localStorage.setItem(LEGACY_EMAIL_KEY, session.user.email);
        localStorage.setItem(LEGACY_RAW_EMAIL_KEY, session.user.email);
    }

    return session;
}

export function getSession() {
    const stored = safeParse(localStorage.getItem(SESSION_KEY));
    if (!stored || !stored.token) {
        return null;
    }

    return {
        token: stored.token,
        user: normalizeUser(stored.user)
    };
}

export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_USERNAME_KEY);
    localStorage.removeItem(LEGACY_EMAIL_KEY);
    localStorage.removeItem(LEGACY_RAW_USERNAME_KEY);
    localStorage.removeItem(LEGACY_RAW_EMAIL_KEY);
}

export function getSessionToken() {
    return getSession()?.token || null;
}

export function getSessionUser() {
    return getSession()?.user || null;
}
