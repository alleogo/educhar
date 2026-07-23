// ==========================================================================
// NAVBAR & HEADER MANAGEMENT (navbar.js)
// ==========================================================================
import { state } from "./state.js";
import { api } from "./api.js";
import { showToast } from "./toast.js";

/**
 * Update the navbar based on the current user session.
 */
export function updateNavbarUI() {
    const user = state.user;
    const authActions = document.getElementById("nav-auth-actions");
    const userActions = document.getElementById("nav-user-actions");
    const studentDashboardBtn = document.getElementById("nav-student-dashboard");
    const instructorDashboardBtn = document.getElementById("nav-instructor-dashboard");
    const adminDashboardBtn = document.getElementById("nav-admin-dashboard");

    if (user) {
        // Logged in
        if (authActions) authActions.classList.add("hidden");
        if (userActions) {
            userActions.classList.remove("hidden");
            document.getElementById("nav-user-avatar").src =
                user.image || `https://api.dicebear.com/5.x/initials/svg?seed=${user.firstName}`;
            document.getElementById("nav-user-name").innerText = `${user.firstName}`;
            document.getElementById("dropdown-user-fullname").innerText = `${user.firstName} ${user.lastName}`;
            document.getElementById("dropdown-user-role").innerText = user.accountType;
        }

        // Role-based nav links
        if (studentDashboardBtn) studentDashboardBtn.classList.add("hidden");
        if (instructorDashboardBtn) instructorDashboardBtn.classList.add("hidden");
        if (adminDashboardBtn) adminDashboardBtn.classList.add("hidden");

        if (user.accountType === "Student") {
            if (studentDashboardBtn) studentDashboardBtn.classList.remove("hidden");
        } else if (user.accountType === "Instructor") {
            if (instructorDashboardBtn) instructorDashboardBtn.classList.remove("hidden");
        } else if (user.accountType === "Admin") {
            if (adminDashboardBtn) adminDashboardBtn.classList.remove("hidden");
        }
    } else {
        // Logged out
        if (authActions) authActions.classList.remove("hidden");
        if (userActions) userActions.classList.add("hidden");
        if (studentDashboardBtn) studentDashboardBtn.classList.add("hidden");
        if (instructorDashboardBtn) instructorDashboardBtn.classList.add("hidden");
        if (adminDashboardBtn) adminDashboardBtn.classList.add("hidden");
    }
}

/**
 * Toggle the user profile dropdown menu.
 */
export function toggleUserMenu() {
    const dropdown = document.getElementById("user-dropdown");
    if (dropdown) dropdown.classList.toggle("hidden");
}

/**
 * Handle user logout: clear session, reset state, redirect to catalog.
 */
export function handleLogout() {
    api.clearSession();
    state.user = null;
    updateNavbarUI();
    showToast("Logged out successfully.");
    window.location.hash = "#/catalog";
}
