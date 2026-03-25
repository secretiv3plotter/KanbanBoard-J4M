export class AuthService {
    constructor() {
        this.USERS_KEY = "kanban_users";
        this.CURRENT_USER_KEY = "kanban_current_user";
    }

    register(username, password) {
        const users = this.getUsers();
        if (users[username]) {
            return false; // User already exists
        }
        users[username] = { password: this.hashPassword(password) };
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        return true;
    }

    login(username, password) {
        const users = this.getUsers();
        const user = users[username];
        if (user && user.password === this.hashPassword(password)) {
            localStorage.setItem(this.CURRENT_USER_KEY, username);
            return true;
        }
        return false;
    }

    logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
    }

    isLoggedIn() {
        return localStorage.getItem(this.CURRENT_USER_KEY) !== null;
    }

    getCurrentUser() {
        return localStorage.getItem(this.CURRENT_USER_KEY);
    }

    getUsers() {
        const users = localStorage.getItem(this.USERS_KEY);
        return users ? JSON.parse(users) : {};
    }

    // Simple hash for demo purposes - in production, use proper hashing
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }
}