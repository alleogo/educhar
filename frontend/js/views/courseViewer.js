// ==========================================================================
// COURSE VIEWER & CONTENT MANAGEMENT (views/courseViewer.js)
// ==========================================================================
import { state } from "../state.js";
import { api } from "../api.js";
import { showToast, showModal, closeModal } from "../toast.js";

export async function renderCourseViewer(courseId) {
    const container = document.getElementById("app-view");
    container.innerHTML = `<div class="view-loading"><div class="spinner"></div></div>`;

    if (!courseId) {
        container.innerHTML = `<div class="container mt-4 glass-panel text-center"><p class="text-danger">No course ID provided.</p></div>`;
        return;
    }

    try {
        const detailsData = await api.getCourseDetails(courseId);
        const course = detailsData.data;

        if (!course) {
            container.innerHTML = `<div class="container mt-4 glass-panel text-center"><p class="text-danger">Course not found.</p></div>`;
            return;
        }

        // instructor may be a populated object or a plain id string
        const instructorId = course.instructor?._id || course.instructor;
        // Fetch course progress if student
        let completedVideos = [];
        let isStudent = state.user && state.user.accountType === "Student";
        if (isStudent) {
            try {
                const progResp = await api.getCourseProgress(courseId);
                if (progResp.completedVideos) {
                    completedVideos = progResp.completedVideos;
                }
            } catch (err) {
                console.warn("Could not fetch course progress:", err);
            }
        }

        const isInstructor =
            state.user &&
            state.user.accountType === "Instructor" &&
            instructorId === state.user._id;

        container.innerHTML = `
            <div class="container mt-4" style="flex: 1; display: grid; grid-template-columns: 320px 1fr; gap: 24px; padding-bottom: 48px;">
                <aside class="glass-panel" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; max-height: 80vh; overflow-y: auto;">
                    <h3 style="padding-bottom: 8px; border-bottom: 1px solid var(--border-color);">${course.courseName}</h3>

                    ${isInstructor ? `
                        <button class="btn btn-primary btn-sm w-full" onclick="app.openSectionModal('${courseId}')">+ Add Section</button>
                    ` : ''}

                    <div class="accordion-wrapper" id="viewer-sections-list">
                        ${buildViewerSidebarHtml(course, isInstructor, completedVideos, isStudent)}
                    </div>
                </aside>

                <main class="glass-panel" id="viewer-main-content" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 450px;">
                    <div class="text-center" style="max-width: 400px;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted); margin-bottom: 16px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        <h3>Start Learning</h3>
                        <p style="color: var(--text-secondary); margin-top: 8px;">Select a lesson from the sidebar to begin watching lectures.</p>
                    </div>
                </main>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div class="container mt-4 glass-panel text-center"><p class="text-danger">Failed to load course viewer: ${e.message}</p></div>`;
    }
}

function buildViewerSidebarHtml(course, isInstructor, completedVideos = [], isStudent = false) {
    const sections = course.courseContent || [];
    if (sections.length === 0) {
        return `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; margin-top: 16px;">Syllabus is empty.</p>`;
    }

    let totalLessons = 0;
    sections.forEach(sec => totalLessons += (sec.subSection || []).length);
    let progressPercentage = totalLessons > 0 ? Math.round((completedVideos.length / totalLessons) * 100) : 0;

    let html = '';
    if (isStudent && totalLessons > 0) {
        html += `
            <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm);">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
                    <span>Course Progress</span>
                    <span style="font-weight: bold; color: var(--color-success);">${progressPercentage}%</span>
                </div>
                <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${progressPercentage}%; background: var(--color-success); transition: width 0.3s ease;"></div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; text-align: right;">${completedVideos.length} / ${totalLessons} completed</div>
            </div>
        `;
    }

    html += sections.map((sec, idx) => {
        const lessons = sec.subSection || [];
        return `
            <div class="accordion-item" style="border-radius: var(--radius-sm); margin-bottom: 8px;">
                <div style="display: flex; align-items: center; justify-content: space-between; background-color: rgba(255,255,255,0.01);">
                    <button class="accordion-header" style="flex: 1; border: none; background: none; font-size: 0.85rem;" onclick="this.parentElement.nextElementSibling.classList.toggle('hidden')">
                        <span>${sec.sectionName}</span>
                    </button>
                    ${isInstructor ? `
                        <div style="padding-right: 8px; display: flex; gap: 4px;">
                            <button onclick="app.openSubSectionModal('${sec._id}')" title="Add Lesson" style="color: var(--color-success); font-size: 1.1rem; padding: 4px;">+</button>
                            <button onclick="app.openSectionEditModal('${sec._id}', '${sec.sectionName.replace(/'/g, '&apos;')}')" title="Edit Section" style="color: var(--color-primary); font-size: 0.85rem; padding: 4px;">✎</button>
                            <button onclick="app.handleSectionDelete('${sec._id}', '${course._id}')" title="Delete Section" style="color: var(--color-danger); font-size: 1.1rem; padding: 4px;">&times;</button>
                        </div>
                    ` : ''}
                </div>
                <div class="accordion-content ${idx === 0 ? '' : 'hidden'}" style="padding: 4px;">
                    ${lessons.length === 0
                        ? '<p style="font-size: 0.8rem; color: var(--text-muted); padding: 8px;">No lessons yet.</p>'
                        : lessons.map(les => {
                            const isCompleted = completedVideos.includes(les._id);
                            return `
                            <div class="sidebar-menu-btn" style="padding: 8px; font-size: 0.8rem; cursor: pointer; display: flex; justify-content: space-between;" onclick="app.playLesson('${les.title}', '${les.videoUrl}', '${les.description.replace(/'/g, "&#39;")}', '${les._id}', '${course._id}', ${isCompleted})">
                                <span style="display: flex; align-items: center; gap: 6px;">
                                    ${isCompleted ? 
                                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : 
                                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
                                    }
                                    ${les.title}
                                </span>
                                ${isInstructor ? `
                                    <div onclick="event.stopPropagation()" style="display: flex; gap: 4px;">
                                        <button onclick="app.openSubSectionEditModal('${les._id}', '${les.title.replace(/'/g, '&apos;')}', '${(les.description || '').replace(/'/g, '&apos;')}', '${les.timeDuration || ''}', '${course._id}')" style="color: var(--color-primary); font-size: 0.8rem;">✎</button>
                                        <button onclick="app.handleSubSectionDelete('${sec._id}', '${les._id}', '${course._id}')" style="color: var(--color-danger); font-weight: bold;">&times;</button>
                                    </div>
                                ` : ''}
                            </div>
                            `;
                        }).join("")}
                </div>
            </div>
        `;
    }).join("");

    return html;
}

export function playLesson(title, videoUrl, description, subSectionId, courseId, isCompleted) {
    const main = document.getElementById("viewer-main-content");
    if (!main) return;

    let isStudent = state.user && state.user.accountType === "Student";

    main.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2 style="font-size: 1.3rem;">${title}</h2>
                ${isStudent && !isCompleted ? `
                    <button class="btn btn-secondary btn-sm" id="mark-complete-btn-${subSectionId}" onclick="app.markLessonCompleted('${courseId}', '${subSectionId}')">Mark as Completed</button>
                ` : isStudent && isCompleted ? `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: var(--color-success); font-size: 0.9rem; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Completed
                        </span>
                        <button class="btn btn-outline btn-sm" style="border-color: var(--text-secondary); color: var(--text-secondary);" id="unmark-complete-btn-${subSectionId}" onclick="app.unmarkLessonCompleted('${courseId}', '${subSectionId}')">Unmark</button>
                    </div>
                ` : ''}
            </div>
            <div class="video-container" style="position: relative; width: 100%; aspect-ratio: 16/9; background-color: #000; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-color);">
                <video src="${videoUrl}" controls style="width: 100%; height: 100%; object-fit: contain;"></video>
            </div>
            <div style="padding: 12px; background-color: rgba(255,255,255,0.02); border-radius: var(--radius-sm);">
                <h4 style="margin-bottom: 4px;">Lesson Description</h4>
                <p style="font-size: 0.9rem; color: var(--text-secondary); white-space: pre-line;">${description}</p>
            </div>
        </div>
    `;
}

export async function markLessonCompleted(courseId, subSectionId) {
    const btn = document.getElementById(`mark-complete-btn-${subSectionId}`);
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Marking...";
    }
    try {
        await api.updateCourseProgress(courseId, subSectionId);
        showToast("Lesson marked as completed!");
        // Re-render viewer to update progress bar and side menu
        renderCourseViewer(courseId);
    } catch (e) {
        showToast(e.message || "Failed to mark lesson completed", "error");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Mark as Completed";
        }
    }
}

export async function unmarkLessonCompleted(courseId, subSectionId) {
    const btn = document.getElementById(`unmark-complete-btn-${subSectionId}`);
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Unmarking...";
    }
    try {
        await api.unmarkCourseProgress(courseId, subSectionId);
        showToast("Lesson unmarked!");
        // Re-render viewer to update progress bar and side menu
        renderCourseViewer(courseId);
    } catch (e) {
        showToast(e.message || "Failed to unmark lesson", "error");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Unmark";
        }
    }
}

// ──────────────────────────────────────────────
// SECTION CRUD
// ──────────────────────────────────────────────

export function openSectionModal(courseId) {
    state.activeCourseId = courseId;
    document.getElementById("section-form").reset();
    showModal("section-modal");
}

export async function handleSectionSubmit(event) {
    event.preventDefault();
    const sectionName = document.getElementById("sectionName").value;
    try {
        await api.createSection(sectionName, state.activeCourseId);
        showToast("Section created successfully!");
        closeModal("section-modal");
        renderCourseViewer(state.activeCourseId);
    } catch (e) {
        showToast("Failed to create section.", "error");
    }
}

export async function handleSectionDelete(sectionId, courseId) {
    if (!confirm("Are you sure you want to delete this section?")) return;
    try {
        await api.deleteSection(sectionId);
        showToast("Section deleted successfully!");
        renderCourseViewer(courseId);
    } catch (e) {
        showToast("Failed to delete section.", "error");
    }
}

export function openSectionEditModal(sectionId, currentName) {
    document.getElementById("editSectionId").value = sectionId;
    document.getElementById("editSectionName").value = currentName;
    document.getElementById("section-edit-submit-btn").innerText = "Save Changes";
    document.getElementById("section-edit-submit-btn").disabled = false;
    showModal("section-edit-modal");
}

export async function handleSectionEditSubmit(event) {
    event.preventDefault();
    const sectionId = document.getElementById("editSectionId").value;
    const sectionName = document.getElementById("editSectionName").value;
    const btn = document.getElementById("section-edit-submit-btn");
    btn.disabled = true;
    btn.innerText = "Saving...";
    try {
        await api.updateSection(sectionName, sectionId);
        showToast("Section updated successfully!");
        closeModal("section-edit-modal");
        renderCourseViewer(state.activeParams);
    } catch (e) {
        showToast(e.message || "Failed to update section.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Changes";
    }
}

// ──────────────────────────────────────────────
// SUBSECTION CRUD
// ──────────────────────────────────────────────

export function openSubSectionModal(sectionId) {
    state.activeSectionId = sectionId;
    document.getElementById("subsection-form").reset();
    showModal("subsection-modal");
}

export async function handleSubSectionSubmit(event) {
    event.preventDefault();
    const title = document.getElementById("subTitle").value;
    const timeDuration = document.getElementById("subDuration").value;
    const description = document.getElementById("subDescription").value;
    const videoFile = document.getElementById("subVideo").files[0];

    const formData = new FormData();
    formData.append("sectionId", state.activeSectionId);
    formData.append("title", title);
    formData.append("timeDuration", timeDuration);
    formData.append("description", description);
    formData.append("videoFile", videoFile);

    try {
        await api.createSubSection(formData);
        showToast("Lesson uploaded successfully!");
        closeModal("subsection-modal");
        renderCourseViewer(state.activeParams);
    } catch (e) {
        showToast("Failed to upload lesson.", "error");
    }
}

export async function handleSubSectionDelete(sectionId, subSectionId, courseId) {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
        await api.deleteSubSection(sectionId, subSectionId);
        showToast("Lesson deleted successfully!");
        renderCourseViewer(courseId);
    } catch (e) {
        showToast("Failed to delete lesson.", "error");
    }
}

export function openSubSectionEditModal(subSectionId, title, description, timeDuration, courseId) {
    document.getElementById("editSubSectionId").value = subSectionId;
    document.getElementById("editSubSectionCourseId").value = courseId;
    document.getElementById("editSubTitle").value = title;
    document.getElementById("editSubDescription").value = description;
    document.getElementById("editSubDuration").value = timeDuration;
    document.getElementById("editSubVideo").value = "";
    document.getElementById("subsection-edit-submit-btn").innerText = "Save Changes";
    document.getElementById("subsection-edit-submit-btn").disabled = false;
    showModal("subsection-edit-modal");
}

export async function handleSubSectionEditSubmit(event) {
    event.preventDefault();
    const subSectionId = document.getElementById("editSubSectionId").value;
    const courseId = document.getElementById("editSubSectionCourseId").value;
    const title = document.getElementById("editSubTitle").value;
    const description = document.getElementById("editSubDescription").value;
    const timeDuration = document.getElementById("editSubDuration").value;
    const videoFile = document.getElementById("editSubVideo").files[0];

    const formData = new FormData();
    formData.append("subSectionId", subSectionId);
    formData.append("title", title);
    formData.append("description", description);
    if (timeDuration) formData.append("timeDuration", timeDuration);
    if (videoFile) formData.append("videoFile", videoFile);

    const btn = document.getElementById("subsection-edit-submit-btn");
    btn.disabled = true;
    btn.innerText = "Saving...";
    try {
        await api.updateSubSection(formData);
        showToast("Lesson updated successfully!");
        closeModal("subsection-edit-modal");
        renderCourseViewer(courseId);
    } catch (e) {
        showToast(e.message || "Failed to update lesson.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Changes";
    }
}
