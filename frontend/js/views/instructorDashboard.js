// ==========================================================================
// INSTRUCTOR DASHBOARD VIEW (views/instructorDashboard.js)
// ==========================================================================
import { state } from "../state.js";
import { api } from "../api.js";
import { showToast, showModal, closeModal } from "../toast.js";

export async function renderInstructorDashboard() {
    if (!state.user || state.user.accountType !== "Instructor") {
        window.location.hash = "#/login";
        return;
    }

    const container = document.getElementById("app-view");
    container.innerHTML = `
        <div class="container dashboard-layout" style="animation: fadeUp 0.5s ease-out forwards; opacity: 0;">
            <aside class="dashboard-sidebar">
                <button class="sidebar-menu-btn active">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
                    Instructor Portal
                </button>
                <button class="sidebar-menu-btn" onclick="app.navigateTo('profile')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profile Settings
                </button>
            </aside>

            <main class="dashboard-main">
                <div class="dashboard-header">
                    <h1>Instructor Portal</h1>
                    <button class="btn btn-primary" onclick="app.openCourseCreateModal()">Create New Course</button>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" id="inst-courses-count">0</div>
                            <div class="stat-label">Published Courses</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(249, 115, 22, 0.15); color: #fb923c;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" id="inst-students-count">0</div>
                            <div class="stat-label">Total Students</div>
                        </div>
                    </div>

                </div>

                <div class="glass-panel">
                    <h2 class="mb-4">My Created Courses</h2>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Course Name</th>
                                    <th>Price</th>
                                    <th>Students</th>
                                    <th style="text-align: center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="instructor-courses-table-body">
                                <tr>
                                    <td colspan="4" class="text-center">Loading courses...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    `;

    try {
        const coursesResp = await api.getAllCourses();
        // Handle instructor being a populated object OR a plain string id
        const courses = (coursesResp.data || []).filter(c => {
            const cInstructorId = c.instructor?._id || c.instructor;
            return cInstructorId === state.user._id;
        });

        // Calculate stats
        const totalStudents = courses.reduce((sum, c) => sum + (c.enrolledStudents?.length || 0), 0);

        document.getElementById("inst-courses-count").innerText = courses.length;
        document.getElementById("inst-students-count").innerText = totalStudents;

        const tBody = document.getElementById("instructor-courses-table-body");
        if (courses.length === 0) {
            tBody.innerHTML = `<tr><td colspan="4" class="text-center">No courses created yet. Click "Create New Course" above.</td></tr>`;
            return;
        }

        tBody.innerHTML = courses.map(course => {
            const studentCount = course.enrolledStudents?.length || 0;

            return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=100'}" alt="" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                        <span style="font-weight: 500;">${course.courseName}</span>
                    </div>
                </td>
                <td>₹${course.price || 0}</td>
                <td>${studentCount}</td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button class="btn btn-secondary btn-sm" onclick="app.navigateTo('course-viewer', '${course._id}')" title="Manage Lessons">Curriculum</button>
                        <button class="btn btn-secondary btn-sm" onclick='app.openCourseEditModal(${JSON.stringify(course).replace(/'/g, "&#39;")})' title="Edit Details">Edit Info</button>
                        <button class="btn btn-secondary btn-sm" onclick="app.navigateTo('course-details', '${course._id}')" title="Preview Course">Preview</button>
                        <button class="btn btn-danger btn-sm" onclick="app.handleCourseDelete('${course._id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `}).join("");

    } catch (e) {
        showToast("Failed to load instructor courses.", "error");
    }
}

// ──────────────────────────────────────────────
// COURSE CREATION MODAL
// ──────────────────────────────────────────────

export function openCourseCreateModal() {
    document.getElementById("course-form").reset();
    document.getElementById("course-modal-title").innerText = "Create New Course";
    document.getElementById("course-form-submit-btn").innerText = "Create Course";

    // Populate category dropdown
    const selectEl = document.getElementById("courseCategory");
    if (selectEl) {
        selectEl.innerHTML =
            `<option value="" disabled selected>Select category</option>` +
            state.categories.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join("");
    }

    showModal("course-modal");
}

export async function handleCourseSubmit(event) {
    event.preventDefault();

    const courseName = document.getElementById("courseName").value;
    const courseDescription = document.getElementById("courseDescription").value;
    const whatYouWillLearn = document.getElementById("whatYouWillLearn").value;
    const price = document.getElementById("coursePrice").value;
    const category = document.getElementById("courseCategory").value;
    const thumbnailFile = document.getElementById("courseThumbnail").files[0];

    const formData = new FormData();
    formData.append("courseName", courseName);
    formData.append("courseDescription", courseDescription);
    formData.append("whatYouWillLearn", whatYouWillLearn);
    formData.append("price", price);
    formData.append("category", category);
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

    const btn = document.getElementById("course-form-submit-btn");
    btn.disabled = true;
    btn.innerText = "Creating Course...";

    try {
        await api.createCourse(formData);
        showToast("Course created successfully!");
        closeModal("course-modal");
        renderInstructorDashboard();
    } catch (e) {
        showToast(e.message || "Failed to create course.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Create Course";
    }
}

// ──────────────────────────────────────────────
// COURSE EDIT MODAL
// ──────────────────────────────────────────────

export function openCourseEditModal(course) {
    let modal = document.getElementById("course-edit-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "course-edit-modal";
        modal.className = "modal-overlay hidden";
        modal.innerHTML = `
            <div class="modal-card max-w-md">
                <div class="modal-header">
                    <h2>Edit Course Info</h2>
                    <button class="btn-close" onclick="app.closeModal('course-edit-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="course-edit-form" onsubmit="app.handleCourseEditSubmit(event)">
                        <input type="hidden" id="editCourseId">
                        <div class="form-group">
                            <label for="editCourseName">Course Title*</label>
                            <input type="text" id="editCourseName" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="editCourseDescription">Course Description*</label>
                            <textarea id="editCourseDescription" class="form-input" rows="3" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="editWhatYouWillLearn">What You Will Learn*</label>
                            <textarea id="editWhatYouWillLearn" class="form-input" rows="2" required></textarea>
                        </div>
                        <div class="grid-2">
                            <div class="form-group">
                                <label for="editCoursePrice">Price (INR)*</label>
                                <input type="number" id="editCoursePrice" class="form-input" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="editCourseCategory">Category*</label>
                                <select id="editCourseCategory" class="form-input" required>
                                    <!-- populated dynamically -->
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="editCourseThumbnail">Thumbnail Image (Leave blank to keep existing)</label>
                            <input type="file" id="editCourseThumbnail" class="form-input" accept="image/*">
                        </div>
                        <button type="submit" class="btn btn-primary w-full mt-4" id="course-edit-form-submit-btn">Save Changes</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Populate form
    document.getElementById("editCourseId").value = course._id;
    document.getElementById("editCourseName").value = course.courseName;
    document.getElementById("editCourseDescription").value = course.courseDescription;
    document.getElementById("editWhatYouWillLearn").value = course.whatYouWillLearn || '';
    document.getElementById("editCoursePrice").value = course.price || 0;

    // Populate category dropdown
    const selectEl = document.getElementById("editCourseCategory");
    selectEl.innerHTML = state.categories.map(cat =>
        `<option value="${cat._id}" ${course.category === cat._id ? 'selected' : ''}>${cat.name}</option>`
    ).join("");

    showModal("course-edit-modal");
}

export async function handleCourseEditSubmit(event) {
    event.preventDefault();

    const courseId = document.getElementById("editCourseId").value;
    const courseName = document.getElementById("editCourseName").value;
    const courseDescription = document.getElementById("editCourseDescription").value;
    const whatYouWillLearn = document.getElementById("editWhatYouWillLearn").value;
    const price = document.getElementById("editCoursePrice").value;
    const category = document.getElementById("editCourseCategory").value;
    const thumbnailFile = document.getElementById("editCourseThumbnail").files[0];

    const formData = new FormData();
    formData.append("courseName", courseName);
    formData.append("courseDescription", courseDescription);
    formData.append("whatYouWillLearn", whatYouWillLearn);
    formData.append("price", price);
    formData.append("category", category);
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

    const btn = document.getElementById("course-edit-form-submit-btn");
    btn.disabled = true;
    btn.innerText = "Saving Changes...";

    try {
        await api.updateCourse(courseId, formData);
        showToast("Course updated successfully!");
        closeModal("course-edit-modal");
        renderInstructorDashboard();
    } catch (e) {
        showToast(e.message || "Failed to update course.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Changes";
    }
}

// ──────────────────────────────────────────────
// DELETE COURSE
// ──────────────────────────────────────────────

export async function handleCourseDelete(courseId) {
    if (!confirm("Are you sure you want to delete this course? All sections, lessons, and student enrollments will be permanently removed.")) {
        return;
    }

    try {
        await api.deleteCourse(courseId);
        showToast("Course deleted successfully!");
        renderInstructorDashboard();
    } catch (e) {
        showToast(e.message || "Failed to delete course.", "error");
    }
}
