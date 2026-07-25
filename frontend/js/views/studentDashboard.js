// ==========================================================================
// STUDENT DASHBOARD VIEW (views/studentDashboard.js)
// ==========================================================================
import { state } from "../state.js";
import { api } from "../api.js";

export async function renderStudentDashboard() {
    if (!state.user || state.user.accountType !== "Student") {
        window.location.hash = "#/login";
        return;
    }

    const container = document.getElementById("app-view");
    container.innerHTML = `
        <div class="container dashboard-layout" style="animation: fadeUp 0.5s ease-out forwards; opacity: 0;">
            <aside class="dashboard-sidebar">
                <button class="sidebar-menu-btn active">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                    Enrolled Courses
                </button>
                <button class="sidebar-menu-btn" onclick="app.navigateTo('catalog')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Browse Courses
                </button>
                <button class="sidebar-menu-btn" onclick="app.navigateTo('profile')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profile Settings
                </button>
            </aside>

            <main class="dashboard-main">
                <div class="dashboard-header">
                    <h1>My Learning</h1>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" id="stat-enrolled-count">0</div>
                            <div class="stat-label">Enrolled Courses</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(249, 115, 22, 0.15); color: #fb923c;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </div>
                        <div>
                            <div class="stat-num" id="stat-certificates">—</div>
                            <div class="stat-label">Certificates</div>
                        </div>
                    </div>
                </div>

                <div class="course-grid" id="student-courses-grid">
                    <div class="view-loading"><div class="spinner"></div></div>
                </div>
            </main>
        </div>
    `;

    try {
        const enrolledResp = await api.getEnrolledCourses();
        const enrolled = enrolledResp.enrolledCourses || [];

        document.getElementById("stat-enrolled-count").innerText = enrolled.length;
        const grid = document.getElementById("student-courses-grid");

        if (enrolled.length === 0) {
            grid.innerHTML = `
                <div class="glass-panel text-center w-full" style="grid-column: 1/-1; padding: 48px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 16px;"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                    <h3>No enrolled courses yet</h3>
                    <p style="color: var(--text-secondary); margin: 12px 0 20px;">Explore our catalog and kickstart your learning journey today.</p>
                    <button class="btn btn-primary" onclick="app.navigateTo('catalog')">Browse Courses</button>
                </div>
            `;
            return;
        }

        const htmlPromises = enrolled.map(async course => {
            const instructorName = course.instructor?.firstName
                ? `${course.instructor.firstName} ${course.instructor.lastName || ''}`
                : 'Instructor';

            let totalLessons = 0;
            const sections = course.courseContent || [];
            sections.forEach(sec => totalLessons += (sec.subSection || []).length);

            let completedCount = 0;
            try {
                const progResp = await api.getCourseProgress(course._id);
                if (progResp.completedVideos) {
                    completedCount = progResp.completedVideos.length;
                }
            } catch (err) {
                console.warn("Could not fetch progress for", course._id);
            }

            const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

            return `
            <div class="course-card" onclick="app.navigateTo('course-viewer', '${course._id}')">
                <div class="card-img-wrapper">
                    <img class="card-img" src="${course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600'}" alt="${course.courseName}">
                    <div class="card-badge">Enrolled</div>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${course.courseName}</h3>
                    <p class="card-desc">${course.courseDescription || ''}</p>
                    <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        ${instructorName}
                    </div>

                    ${totalLessons > 0 ? `
                        <div style="margin-top: 12px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px;">
                                <span>Progress</span>
                                <span>${progressPercentage}%</span>
                            </div>
                            <div style="width: 100%; height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden;">
                                <div style="height: 100%; width: ${progressPercentage}%; background: var(--color-success); transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="card-footer" style="margin-top: ${totalLessons > 0 ? '12px' : 'auto'};">
                        <button class="btn btn-primary btn-sm w-full">Continue Learning →</button>
                    </div>
                </div>
            </div>
        `});

        const cardsHtml = await Promise.all(htmlPromises);
        grid.innerHTML = cardsHtml.join("");

    } catch (e) {
        document.getElementById("student-courses-grid").innerHTML =
            `<div class="glass-panel text-center w-full" style="grid-column: 1/-1;"><p class="text-danger">Failed to load enrolled courses: ${e.message}</p></div>`;
    }
}
