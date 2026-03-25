import { API_BASE_URL } from "./config.js";
import { getSessionToken } from "./session.js";

function buildError(message, { status = 0, data = null, network = false } = {}) {
    const error = new Error(message);
    error.status = status;
    error.data = data;
    error.isNetworkError = network;
    return error;
}

async function readResponseBody(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();
    return text ? { message: text } : null;
}

async function request(path, { method = "GET", body, auth = true } = {}) {
    const headers = {
        Accept: "application/json"
    };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    const token = auth ? getSessionToken() : null;
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch {
        throw buildError("Network request failed.", { network: true });
    }

    const data = await readResponseBody(response);

    if (!response.ok) {
        throw buildError(data?.message || `Request failed with status ${response.status}.`, {
            status: response.status,
            data
        });
    }

    return data;
}

export const apiClient = {
    register(payload) {
        return request("/auth/register", {
            method: "POST",
            body: payload,
            auth: false
        });
    },

    login(payload) {
        return request("/auth/login", {
            method: "POST",
            body: payload,
            auth: false
        });
    },

    googleLogin(payload) {
        return request("/auth/google", {
            method: "POST",
            body: payload,
            auth: false
        });
    },

    logout() {
        return request("/auth/logout", {
            method: "POST"
        });
    },

    me() {
        return request("/auth/me");
    },

    getTasks() {
        return request("/tasks");
    },

    createTask(payload) {
        return request("/tasks", {
            method: "POST",
            body: {
                action: "create",
                ...payload
            }
        });
    },

    updateTask(payload) {
        return request("/tasks", {
            method: "POST",
            body: {
                action: "update",
                ...payload
            }
        });
    },

    deleteTask(id) {
        return request("/tasks", {
            method: "POST",
            body: {
                action: "delete",
                id
            }
        });
    }
};
