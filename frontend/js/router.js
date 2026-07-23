// ==========================================================================
// HASH-BASED SPA ROUTER (router.js)
// ==========================================================================
import { state } from "./state.js";
import { renderCatalog } from "./views/catalog.js";
import { renderCourseDetails } from "./views/courseDetails.js";
import { renderLogin, renderSignup, renderForgotPassword, renderResetPassword } from "./views/auth.js";
import { renderStudentDashboard } from "./views/studentDashboard.js";
import { renderInstructorDashboard } from "./views/instructorDashboard.js";
import { renderAdminDashboard } from "./views/adminDashboard.js";
import { renderProfile } from "./views/profile.js";
import { renderCourseViewer } from "./views/courseViewer.js";

/**
 * Parse the current URL hash and dispatch to the correct view renderer.
 */
export function handleRouting() {
    const hash = window.location.hash || "#/catalog";
    const parts = hash.split("/");
    const route = parts[1] || "catalog";
    const param = parts[2] || null;

    console.log(`Routing to: ${route} with param: ${param}`);
    state.activePage = route;
    state.activeParams = param;

    // Highlight the active nav button
    document.querySelectorAll(".nav-link-btn").forEach(btn => btn.classList.remove("active"));
    const activeNavBtn = document.getElementById(`nav-${route}`);
    if (activeNavBtn) activeNavBtn.classList.add("active");

    switch (route) {
        case "catalog":
            renderCatalog();
            break;
        case "course-details":
            renderCourseDetails(param);
            break;
        case "login":
            renderLogin();
            break;
        case "signup":
            renderSignup();
            break;
        case "forgot-password":
            renderForgotPassword();
            break;
        case "reset-password":
            renderResetPassword(param);
            break;
        case "student-dashboard":
            renderStudentDashboard();
            break;
        case "instructor-dashboard":
            renderInstructorDashboard();
            break;
        case "admin-dashboard":
            renderAdminDashboard();
            break;
        case "profile":
            renderProfile();
            break;
        case "course-viewer":
            renderCourseViewer(param);
            break;
        default:
            renderCatalog();
    }
}

/**
 * Navigate to a SPA route programmatically.
 * @param {string} page
 * @param {string|null} param
 */
export function navigateTo(page, param = null) {
    if (param) {
        window.location.hash = `#/${page}/${param}`;
    } else {
        window.location.hash = `#/${page}`;
    }
}
