import { AuthService } from "./AuthService.js";

export class AuthController {
    constructor() {
        this.authService = new AuthService();
        this.elements = {
            $loginTab: document.getElementById("login-tab"),
            $registerTab: document.getElementById("register-tab"),
            $loginForm: document.getElementById("login-form"),
            $registerForm: document.getElementById("register-form"),
            $loginEmail: document.getElementById("login-email"),
            $loginPassword: document.getElementById("login-password"),
            $registerUsername: document.getElementById("register-username"),
            $registerEmail: document.getElementById("register-email"),
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
        const eyeOpen = `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" aria-hidden="true">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
        const eyeClosed = `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" aria-hidden="true">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path>
                <path d="M3 3l18 18"></path>
            </svg>
        `;
        document.querySelectorAll(".password-toggle").forEach((btn) => {
            btn.innerHTML = eyeOpen;
            btn.addEventListener("click", () => {
                const input = document.getElementById(btn.dataset.target);
                if (!input) return;
                const isPassword = input.type === "password";
                input.type = isPassword ? "text" : "password";
                btn.innerHTML = isPassword ? eyeClosed : eyeOpen;
                const label = isPassword ? "Hide password" : "Show password";
                btn.setAttribute("aria-label", label);
                btn.setAttribute("title", label);
            });
        });

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
        const email = this.elements.$loginEmail.value.trim();
        const password = this.elements.$loginPassword.value;

        if (!email || !password) {
            this.showLoginError("Please fill in all fields");
            return;
        }

        if (this.authService.login(email, password)) {
            window.location.href = "index.html";
        } else {
            this.showLoginError("Invalid email or password");
        }
    }


    handleRegister() {
        const username = this.elements.$registerUsername.value.trim();
        const email = this.elements.$registerEmail.value.trim();
        const password = this.elements.$registerPassword.value;
        const confirm = this.elements.$registerConfirm.value;

        if (!username ||  !email || !password || !confirm) {
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

        if (this.authService.register(username, email, password)) {
            this.showLogin();
            this.elements.$loginPassword.value = "";
            this.elements.$registerUsername.value = "";
            this.elements.$registerPassword.value = "";
            this.elements.$registerConfirm.value = "";
            this.elements.$registerEmail.value = "";
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
