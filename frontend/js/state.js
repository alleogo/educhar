// ==========================================================================
// SHARED APPLICATION STATE (state.js)
// ==========================================================================

export const state = {
    activePage: "catalog",
    activeParams: null,
    user: null,         // Set during init from api.getCurrentUser()
    categories: [],
    courses: [],
    enrolledCourses: [],

    // Instructor dashboard transient state
    instructor: {
        activeTab: "my-courses",
    },

    // Signup OTP flow transient payload
    signupPayload: null,

    // Course viewer transient state
    activeCourseId: null,
    activeSectionId: null,

    // Rating/review transient state
    activeRatingCourseId: null,
    selectedRatingValue: 5,
};
