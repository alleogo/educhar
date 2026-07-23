// ==========================================================================
// APPLICATION ENTRY POINT (js/app.js)
// ==========================================================================
import { state } from "./state.js";
import { api } from "./api.js";
import { handleRouting, navigateTo } from "./router.js";
import { updateNavbarUI, toggleUserMenu, handleLogout } from "./navbar.js";
import { showToast, showModal, closeModal } from "./toast.js";

// Catalog
import { filterCoursesByCat } from "./views/catalog.js";

// Course details & reviews
import {
    handleEnrollment,
    openReviewModal,
    handleRatingSubmit,
    handleReviewDelete,
} from "./views/courseDetails.js";

// Auth
import {
    handleLoginSubmit,
    handleSignupTrigger,
    submitSignupOtp,
    resendOtp,
    onRoleChange,
    handleForgotPasswordSubmit,
    handleResetPasswordSubmit,
} from "./views/auth.js";

// Instructor dashboard
import {
    openCourseCreateModal,
    handleCourseSubmit,
    openCourseEditModal,
    handleCourseEditSubmit,
    handleCourseDelete,
} from "./views/instructorDashboard.js";

// Admin dashboard
import {
    openCategoryCreateModal,
    handleCategorySubmit,
    openCategoryEditModal,
    handleCategoryEditSubmit,
    handleCategoryDelete,
} from "./views/adminDashboard.js";

// Course viewer
import {
    playLesson,
    openSectionModal,
    handleSectionSubmit,
    handleSectionDelete,
    openSectionEditModal,
    handleSectionEditSubmit,
    openSubSectionModal,
    handleSubSectionSubmit,
    handleSubSectionDelete,
    openSubSectionEditModal,
    handleSubSectionEditSubmit,
    markLessonCompleted,
    unmarkLessonCompleted,
} from "./views/courseViewer.js";

// Profile
import {
    handleProfileUpdate,
    handlePasswordChange,
    handleAccountDelete,
} from "./views/profile.js";

// ──────────────────────────────────────────────
// Initialise session state from localStorage
// ──────────────────────────────────────────────
state.user = api.getCurrentUser();

// ──────────────────────────────────────────────
// Load shared lookup data (categories)
// ──────────────────────────────────────────────
async function loadCommonData() {
    try {
        const catData = await api.getAllCategories();
        state.categories = catData.allCategories || [];
    } catch (e) {
        console.warn("Could not fetch categories:", e);
    }
}

// ──────────────────────────────────────────────
// Bootstrap
// ──────────────────────────────────────────────
function init() {
    console.log("EduChar SPA Initializing...");

    // Hash-based routing
    window.addEventListener("hashchange", handleRouting);

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        const dropdown = document.getElementById("user-dropdown");
        const profileBadge = document.querySelector(".user-profile-badge");
        if (
            dropdown &&
            !dropdown.classList.contains("hidden") &&
            profileBadge &&
            !profileBadge.contains(e.target)
        ) {
            dropdown.classList.add("hidden");
        }
    });

    updateNavbarUI();
    handleRouting();
    loadCommonData();
}

// ──────────────────────────────────────────────
// Global `window.app` — required by inline HTML onclick handlers
// in index.html and in all dynamically rendered templates.
// ──────────────────────────────────────────────
window.app = {
    // State (read-only shortcut)
    get state() { return state; },

    // Navigation
    navigateTo,

    // Navbar
    toggleUserMenu,
    handleLogout,

    // Catalog
    filterCoursesByCat,

    // Course details
    handleEnrollment,
    openReviewModal,
    handleRatingSubmit,
    handleReviewDelete,

    // Auth
    handleLoginSubmit,
    handleSignupTrigger,
    submitSignupOtp,
    resendOtp,
    onRoleChange,
    handleForgotPasswordSubmit,
    handleResetPasswordSubmit,

    // Instructor
    openCourseCreateModal,
    handleCourseSubmit,
    openCourseEditModal,
    handleCourseEditSubmit,
    handleCourseDelete,

    // Admin
    openCategoryCreateModal,
    handleCategorySubmit,
    openCategoryEditModal,
    handleCategoryEditSubmit,
    handleCategoryDelete,

    // Course viewer
    playLesson,
    openSectionModal,
    handleSectionSubmit,
    handleSectionDelete,
    openSectionEditModal,
    handleSectionEditSubmit,
    openSubSectionModal,
    handleSubSectionSubmit,
    handleSubSectionDelete,
    openSubSectionEditModal,
    handleSubSectionEditSubmit,
    markLessonCompleted,
    unmarkLessonCompleted,

    // Profile
    handleProfileUpdate,
    handlePasswordChange,
    handleAccountDelete,

    // Toasts & modals
    showToast,
    showModal,
    closeModal,
};

// Start the app once the DOM is ready
window.addEventListener("DOMContentLoaded", init);
