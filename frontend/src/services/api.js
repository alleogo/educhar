// ==========================================================================
// API CLIENT UTILITY (api.js)
// ==========================================================================
const API_BASE_URL = "http://localhost:8888/api/v1";

export const api = {
    // Get stored authentication token
    getToken() {
        return localStorage.getItem("token");
    },

    // Save token and user details to localStorage
    setSession(token, user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
    },

    // Clear session
    clearSession() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    },

    // Get parsed user details
    getCurrentUser() {
        const userStr = localStorage.getItem("user");
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    },

    // Helper to perform HTTP requests with token
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}/${endpoint}`;

        // Setup headers
        const headers = { ...options.headers };
        const token = this.getToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        // If body is FormData, do not set Content-Type header (browser sets boundary automatically)
        if (options.body && !(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(options.body);
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // ======================================================================
    // AUTH ENDPOINTS
    // ======================================================================
    async sendOtp(email) {
        return this.request("auth/sendotp", {
            method: "POST",
            body: { email }
        });
    },

    async signUp(userData) {
        return this.request("auth/signup", {
            method: "POST",
            body: userData
        });
    },

    async logIn(email, password) {
        return this.request("auth/login", {
            method: "POST",
            body: { email, password }
        });
    },

    async changePassword(oldPassword, newPassword) {
        return this.request("auth/changepassword", {
            method: "POST",
            body: { oldPassword, newPassword }
        });
    },

    async resetPasswordToken(email) {
        return this.request("auth/reset-password-token", {
            method: "POST",
            body: { email }
        });
    },

    async resetPassword(password, confirmPassword, token) {
        return this.request("auth/reset-password", {
            method: "POST",
            body: { password, confirmPassword, token }
        });
    },

    // ======================================================================
    // COURSE ENDPOINTS
    // ======================================================================
    async getAllCourses() {
        return this.request("course/getallcourses", {
            method: "GET"
        });
    },

    async getCourseDetails(courseId) {
        return this.request(`course/getcoursedetails?courseId=${courseId}`, {
            method: "GET"
        });
    },

    async createCourse(formData) {
        return this.request("course/createcourse", {
            method: "POST",
            body: formData // This is a FormData object containing thumbnail file
        });
    },

    async updateCourse(courseId, formData) {
        return this.request(`course/updatecourse/${courseId}`, {
            method: "PUT",
            body: formData
        });
    },

    async deleteCourse(courseId) {
        return this.request(`course/deletecourse/${courseId}`, {
            method: "DELETE"
        });
    },

    async capturePayment(courseId) {
        return this.request("payment/capturepayment", {
            method: "POST",
            body: { courseId }
        });
    },

    async verifyPayment(paymentDetails) {
        return this.request("payment/verifypayment", {
            method: "POST",
            body: paymentDetails
        });
    },

    async getEnrolledCourses() {
        return this.request("profile/enrolledcourses", {
            method: "GET"
        });
    },

    async updateCourseProgress(courseId, subSectionId) {
        return this.request("course/updateCourseProgress", {
            method: "POST",
            body: { courseId, subSectionId }
        });
    },

    async unmarkCourseProgress(courseId, subSectionId) {
        return this.request("course/unmarkCourseProgress", {
            method: "POST",
            body: { courseId, subSectionId }
        });
    },

    async getCourseProgress(courseId) {
        return this.request("course/getCourseProgress", {
            method: "POST",
            body: { courseId }
        });
    },

    // ======================================================================
    // SECTION ENDPOINTS
    // ======================================================================
    async createSection(sectionName, courseId) {
        return this.request("course/createsection", {
            method: "POST",
            body: { sectionName, courseId }
        });
    },

    async updateSection(sectionName, sectionId) {
        return this.request("course/updatesection", {
            method: "PUT",
            body: { sectionName, sectionId }
        });
    },

    async deleteSection(sectionId) {
        return this.request(`course/deletesection/${sectionId}`, {
            method: "DELETE"
        });
    },

    // ======================================================================
    // SUBSECTION (LESSON) ENDPOINTS
    // ======================================================================
    async createSubSection(formData) {
        return this.request("course/createsubsection", {
            method: "POST",
            body: formData // FormData containing videoFile file
        });
    },

    async updateSubSection(formData) {
        return this.request("course/updatesubsection", {
            method: "PUT",
            body: formData // FormData
        });
    },

    async deleteSubSection(sectionId, subSectionId) {
        return this.request("course/deletesubsection", {
            method: "DELETE",
            body: { sectionId, subSectionId }
        });
    },

    // ======================================================================
    // CATEGORY ENDPOINTS
    // ======================================================================
    async getAllCategories() {
        return this.request("course/getallcategories", {
            method: "GET"
        });
    },

    async updateCategory(categoryId, name, description) {
        return this.request("course/updatecategory", {
            method: "PUT",
            body: { categoryId, name, description }
        });
    },

    async deleteCategory(categoryId) {
        return this.request(`course/deletecategory/${categoryId}`, {
            method: "DELETE"
        });
    },

    async getCategoryDetails(categoryId) {
        return this.request(`course/getcategorydetails?categoryId=${categoryId}`, {
            method: "GET"
        });
    },

    async getCategoryPageDetails(categoryId) {
        return this.request(`course/getcategorydetails?categoryId=${categoryId}`, {
            method: "GET"
        });
    },

    // ======================================================================
    // PROFILE ENDPOINTS
    // ======================================================================
    async updateProfile(profileData) {
        return this.request("profile/updateprofile", {
            method: "PUT",
            body: profileData
        });
    },

    async deleteAccount() {
        return this.request("profile/deleteaccount", {
            method: "DELETE"
        });
    },

    async getUserDetails() {
        return this.request("profile/getuserdetails", {
            method: "GET"
        });
    },

    // ======================================================================
    // RATING & REVIEW ENDPOINTS
    // ======================================================================
    async createRating(rating, review, courseId) {
        return this.request("course/createrating", {
            method: "POST",
            body: { rating, review, courseId }
        });
    },

    async getAverageRating(courseId) {
        return this.request(`course/getaveragerating?courseId=${courseId}`, {
            method: "GET"
        });
    },

    async getAllRatings() {
        return this.request("course/getallratings", {
            method: "GET"
        });
    },

    async deleteRating(reviewId) {
        return this.request(`course/deleterating/${reviewId}`, {
            method: "DELETE"
        });
    }
};
