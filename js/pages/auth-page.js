import { apiClient } from "../shared/apiClient.js";
import { GOOGLE_CLIENT_ID } from "../shared/config.js";
import { clearSession, setSession } from "../shared/session.js";
import { registerServiceWorker } from "../shared/registerServiceWorker.js";

const authCard = document.getElementById("AUTH_CARD");
const authTitle = document.getElementById("AUTH_TITLE");
const authSubtitle = document.getElementById("AUTH_SUBTITLE");
const footnoteText = document.getElementById("AUTH_FOOTNOTE_TEXT");
const footnoteButton = document.getElementById("AUTH_FOOTNOTE_BUTTON");
const registerForm = document.getElementById("REGISTER_FORM");
const loginForm = document.getElementById("LOGIN_FORM");
const switchButtons = document.querySelectorAll(".auth-switch__button");
const googleRegisterButton = document.getElementById("GOOGLE_REGISTER_BTN");
const googleLoginButton = document.getElementById("GOOGLE_LOGIN_BTN");
const passwordToggles = document.querySelectorAll("[data-password-toggle]");

let googleInitialized = false;
let googleButtonRendered = false;
let googleRenderRetryTimer = null;
let googleResizeTimer = null;

function setMessage(message = "", tone = "") {
    authSubtitle.textContent = message;
    authSubtitle.dataset.tone = tone;
}

function setMode(mode) {
    authCard.dataset.mode = mode;
    setMessage("");

    if (mode === "login") {
        authTitle.textContent = "Welcome back";
        footnoteText.textContent = "Need an account?";
        footnoteButton.textContent = "Sign up";
        return;
    }

    authTitle.textContent = "Create your account";
    footnoteText.textContent = "Already have an account?";
    footnoteButton.textContent = "Log in";
}

function normalizeAuthError(error, fallbackMessage) {
    if (!error) {
        return fallbackMessage;
    }

    if (error.isNetworkError) {
        return "Network unavailable. Please try again when you are online.";
    }

    return error.message || fallbackMessage;
}

function saveAndRedirect(result) {
    clearSession();
    setSession({
        token: result.token,
        user: result.user
    });
    window.location.replace("./index.html");
}

function getGoogleButtonWidth(container) {
    const measuredWidth = Math.floor(container?.getBoundingClientRect().width || container?.clientWidth || 0);
    return Math.max(measuredWidth, 240);
}

async function submitRegister(event) {
    event.preventDefault();

    const email = document.getElementById("register-email").value.trim();
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value;

    setMessage("Creating your account...", "");

    try {
        const result = await apiClient.register({ email, username, password });
        saveAndRedirect(result);
    } catch (error) {
        setMessage(normalizeAuthError(error, "Failed to sign up."), "error");
    }
}

async function submitLogin(event) {
    event.preventDefault();

    const identifier = document.getElementById("login-identifier").value.trim();
    const password = document.getElementById("login-password").value;

    setMessage("Signing you in...", "");

    try {
        const result = await apiClient.login({ identifier, password });
        saveAndRedirect(result);
    } catch (error) {
        setMessage(normalizeAuthError(error, "Failed to log in."), "error");
    }
}

async function handleGoogleCredential(response) {
    if (!response?.credential) {
        setMessage("Google sign-in did not return a credential.", "error");
        return;
    }

    try {
        const result = await apiClient.googleLogin({ idToken: response.credential });
        saveAndRedirect(result);
    } catch (error) {
        setMessage(normalizeAuthError(error, "Google authentication failed."), "error");
    }
}

async function ensureGoogleClient() {
    if (googleInitialized || !GOOGLE_CLIENT_ID) {
        return googleInitialized;
    }

    if (!window.google?.accounts?.id) {
        return false;
    }

    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential
    });

    googleInitialized = true;
    return true;
}

function renderGoogleButton(container, mode) {
    if (!container || !window.google?.accounts?.id) {
        return false;
    }

    container.innerHTML = "";
    window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: getGoogleButtonWidth(container),
        text: mode === "register" ? "signup_with" : "signin_with",
        logo_alignment: "left"
    });

    return true;
}

async function renderGoogleButtons(force = false) {
    const initialized = await ensureGoogleClient();
    if (!initialized || (googleButtonRendered && !force)) {
        return;
    }

    if (force) {
        googleButtonRendered = false;
        googleRegisterButton.innerHTML = "";
        googleLoginButton.innerHTML = "";
    }

    const didRenderRegister = renderGoogleButton(googleRegisterButton, "register");
    const didRenderLogin = renderGoogleButton(googleLoginButton, "login");
    googleButtonRendered = didRenderRegister || didRenderLogin;

    if (!googleButtonRendered) {
        setMessage("Google sign-in is unavailable right now.", "error");
    }
}

function retryRenderGoogleButtons() {
    if (googleButtonRendered) {
        return;
    }

    if (googleRenderRetryTimer) {
        clearInterval(googleRenderRetryTimer);
    }

    googleRenderRetryTimer = setInterval(() => {
        if (googleButtonRendered) {
            clearInterval(googleRenderRetryTimer);
            googleRenderRetryTimer = null;
            return;
        }

        if (window.google?.accounts?.id) {
            void renderGoogleButtons();
        }
    }, 250);

    if (window.google?.accounts?.id) {
        void renderGoogleButtons();
    }
}

function handleResize() {
    if (googleResizeTimer) {
        clearTimeout(googleResizeTimer);
    }

    googleResizeTimer = setTimeout(() => {
        if (window.google?.accounts?.id) {
            void renderGoogleButtons(true);
        }
    }, 150);
}

function handlePageShow(event) {
    if (event.persisted) {
        googleButtonRendered = false;
        retryRenderGoogleButtons();
    }
}

function initPasswordToggle(button) {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        const isHidden = input.type === "password";

        input.type = isHidden ? "text" : "password";
        button.dataset.visible = isHidden ? "true" : "false";
        button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    });
}

async function init() {
    await registerServiceWorker();

    authSubtitle.dataset.tone = "";
    setMode(authCard.dataset.mode || "register");

    switchButtons.forEach(button => {
        button.addEventListener("click", () => setMode(button.dataset.mode));
    });

    footnoteButton.addEventListener("click", () => {
        setMode(authCard.dataset.mode === "register" ? "login" : "register");
    });

    registerForm.addEventListener("submit", submitRegister);
    loginForm.addEventListener("submit", submitLogin);
    passwordToggles.forEach(initPasswordToggle);

    retryRenderGoogleButtons();
    window.addEventListener("load", retryRenderGoogleButtons, { once: true });
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("resize", handleResize);
}

init();
