import { AuthService } from "./AuthService.js";

export class AuthController {
    constructor() {
        this.authService = new AuthService();
        this.elements = {
            $loginTab: document.getElementById("login-tab"),
            $registerTab: document.getElementById("register-tab"),
            $loginForm: document.getElementById("login-form"),
            $registerForm: document.getElementById("register-form"),
            $loginUsername: document.getElementById("login-username"),
            $loginPassword: document.getElementById("login-password"),
            $registerUsername: document.getElementById("register-username"),
            $registerPassword: document.getElementById("register-password"),
            $registerConfirm: document.getElementById("register-confirm"),
            $loginBtn: document.getElementById("login-btn"),
            $registerBtn: document.getElementById("register-btn"),
            $loginError: document.getElementById("login-error"),
            $registerError: document.getElementById("register-error")
        };
    }

    init() {
        this.elements.$loginTab.addEventListener("click", () => this.showLogin());
        this.elements.$registerTab.addEventListener("click", () => this.showRegister());
        this.elements.$loginBtn.addEventListener("click", () => this.handleLogin());
        this.elements.$registerBtn.addEventListener("click", () => this.handleRegister());

        // Check if already logged in
        if (this.authService.isLoggedIn()) {
            window.location.href = "index.html";
        }
    }

    showLogin() {
        this.elements.$loginTab.classList.add("auth-tab--active");
        this.elements.$registerTab.classList.remove("auth-tab--active");
        this.elements.$loginForm.classList.remove("auth-form--hidden");
        this.elements.$registerForm.classList.add("auth-form--hidden");
        this.clearErrors();
    }

    showRegister() {
        this.elements.$registerTab.classList.add("auth-tab--active");
        this.elements.$loginTab.classList.remove("auth-tab--active");
        this.elements.$registerForm.classList.remove("auth-form--hidden");
        this.elements.$loginForm.classList.add("auth-form--hidden");
        this.clearErrors();
    }

    handleLogin() {
        const username = this.elements.$loginUsername.value.trim();
        const password = this.elements.$loginPassword.value;

        if (!username || !password) {
            this.showLoginError("Please fill in all fields");
            return;
        }

        if (this.authService.login(username, password)) {
            window.location.href = "index.html";
        } else {
            this.showLoginError("Invalid username or password");
        }
    }

    handleRegister() {
        const username = this.elements.$registerUsername.value.trim();
        const password = this.elements.$registerPassword.value;
        const confirm = this.elements.$registerConfirm.value;

        if (!username || !password || !confirm) {
            this.showRegisterError("Please fill in all fields");
            return;
        }

        if (password !== confirm) {
            this.showRegisterError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            this.showRegisterError("Password must be at least 6 characters");
            return;
        }

        if (this.authService.register(username, password)) {
            this.showLogin();
            this.elements.$loginUsername.value = username;
            this.elements.$loginPassword.value = "";
            this.elements.$registerUsername.value = "";
            this.elements.$registerPassword.value = "";
            this.elements.$registerConfirm.value = "";
        } else {
            this.showRegisterError("Username already exists");
        }
    }

    showLoginError(message) {
        this.elements.$loginError.textContent = message;
    }

    showRegisterError(message) {
        this.elements.$registerError.textContent = message;
    }

    clearErrors() {
        this.elements.$loginError.textContent = "";
        this.elements.$registerError.textContent = "";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const authController = new AuthController();
    authController.init();
});