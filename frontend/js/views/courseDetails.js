// ==========================================================================
// COURSE DETAILS VIEW (views/courseDetails.js)
// ==========================================================================
import { state } from "../state.js";
import { api } from "../api.js";
import { showToast, showModal, closeModal } from "../toast.js";

export async function renderCourseDetails(courseId) {
    const container = document.getElementById("app-view");
    container.innerHTML = `<div class="view-loading"><div class="spinner"></div></div>`;

    try {
        const detailsData = await api.getCourseDetails(courseId);
        const course = detailsData.data;

        // Check enrollment status for students
        let isUserEnrolled = false;
        if (state.user && state.user.accountType === "Student") {
            try {
                const enrolledResp = await api.getEnrolledCourses();
                const enrolled = enrolledResp.enrolledCourses || [];
                isUserEnrolled = enrolled.some(c => c._id === courseId);
            } catch (e) {
                console.log("Could not fetch user enrollment status", e);
            }
        }

        const isInstructor = state.user && state.user.accountType === "Instructor";

        // Build star rating for details hero
        const avgRating = course.averageRating || 0;
        const ratingCount = course.ratingCount || 0;
        const detailStarsHtml = buildDetailStarHtml(avgRating);

        container.innerHTML = `
            <div class="details-hero">
                <div class="container">
                    <h1 class="mb-4">${course.courseName}</h1>
                    <p class="hero-subtitle" style="margin: 0; text-align: left;">${course.courseDescription || ''}</p>
                    <div class="details-hero-rating">
                        <div class="card-rating-stars">${detailStarsHtml}</div>
                        <span class="details-rating-value">${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings yet'}</span>
                        <span class="details-rating-count">(${ratingCount}${ratingCount === 1 ? ' review' : ' reviews'})</span>
                        <span class="details-rating-separator">•</span>
                        <span class="details-enrolled-count">${(course.enrolledStudents || []).length} student${(course.enrolledStudents || []).length !== 1 ? 's' : ''} enrolled</span>
                    </div>
                </div>
            </div>

            <div class="container">
                <div class="details-grid">
                    <div class="details-main">
                        <div class="glass-panel mb-4">
                            <h3>What you will learn</h3>
                            <p style="white-space: pre-line;">${course.whatYouWillLearn || 'Not specified'}</p>
                        </div>

                        <div class="syllabus-section">
                            <h2>Course Content</h2>
                            <div class="accordion-wrapper mt-4" id="syllabus-accordion">
                                ${buildSyllabusAccordion(course.courseContent || [])}
                            </div>
                        </div>

                        <div class="reviews-section mt-4">
                            <div class="dashboard-header">
                                <h2>Student Reviews</h2>
                                ${isUserEnrolled ? `<button class="btn btn-secondary btn-sm" onclick="app.openReviewModal('${courseId}')">Add Review</button>` : ''}
                            </div>
                            <div class="reviews-list mt-4" id="reviews-list-container">
                                ${buildReviewsHtml(course.ratingAndReviews || [], courseId)}
                            </div>
                        </div>
                    </div>

                    <div class="details-sidebar">
                        <div class="sidebar-sticky">
                            <div class="purchase-panel">
                                <img src="${course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600'}" alt="${course.courseName}" style="width: 100%; border-radius: var(--radius-sm); margin-bottom: 16px;">
                                <div class="purchase-price">₹${course.price || 0}</div>

                                ${isUserEnrolled ? `
                                    <button class="btn btn-primary w-full" onclick="app.navigateTo('course-viewer', '${courseId}')">Go to Course Viewer</button>
                                    <p class="mt-4" style="color: var(--color-success); font-weight: 500;">You are enrolled in this course.</p>
                                ` : isInstructor ? `
                                    <button class="btn btn-secondary w-full" disabled>Instructor Preview</button>
                                ` : `
                                    <button class="btn btn-primary w-full" onclick="app.handleEnrollment('${courseId}')">Enroll &amp; Pay Now</button>
                                    <p class="mt-4" style="font-size: 0.8rem; color: var(--text-secondary);">30-Day Money-Back Guarantee</p>
                                `}
                            </div>

                            ${course.instructor ? `
                            <div class="glass-panel mt-4" style="padding: 20px;">
                                <h4 style="margin-bottom: 12px;">Instructor</h4>
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <img src="${course.instructor.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent((course.instructor.firstName || '') + ' ' + (course.instructor.lastName || '')) + '&background=6366f1&color=fff'}" alt="" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                                    <div>
                                        <div style="font-weight: 600;">${course.instructor.firstName || ''} ${course.instructor.lastName || ''}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary);">Instructor</div>
                                    </div>
                                </div>
                                ${course.instructor.additionalDetails?.about ? `<p style="font-size: 0.85rem; color: var(--text-secondary);">${course.instructor.additionalDetails.about}</p>` : ''}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="container mt-4 glass-panel text-center"><p class="text-danger">Failed to load course details: ${error.message}</p></div>`;
    }
}

export function buildSyllabusAccordion(sections) {
    if (sections.length === 0) {
        return `<p class="glass-panel text-center">No syllabus chapters uploaded yet.</p>`;
    }

    return sections.map((sec, idx) => {
        const lessons = sec.subSection || [];
        return `
            <div class="accordion-item">
                <button class="accordion-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <span>Chapter ${idx + 1}: ${sec.sectionName}</span>
                    <span>${lessons.length} lessons</span>
                </button>
                <div class="accordion-content ${idx === 0 ? '' : 'hidden'}">
                    ${lessons.length === 0
                        ? '<p style="font-size: 0.85rem; color: var(--text-secondary);">No lessons inside this section.</p>'
                        : lessons.map(les => `
                            <div class="lesson-list-item">
                                <div class="lesson-info">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    <span class="lesson-title-text">${les.title}</span>
                                </div>
                                <span class="lesson-meta">${les.timeDuration || ''}</span>
                            </div>
                        `).join("")}
                </div>
            </div>
        `;
    }).join("");
}

export function buildReviewsHtml(reviews, courseId) {
    if (reviews.length === 0) {
        return `<p class="glass-panel text-center">No reviews given for this course yet.</p>`;
    }

    const currentUserId = state.user ? state.user._id : null;

    return reviews.map(rev => {
        const user = rev.user || { firstName: "Anonymous", lastName: "" };
        const reviewUserId = typeof user === 'object' ? user._id : user;
        const isOwner = currentUserId && reviewUserId && currentUserId === reviewUserId;
        const ratingStars = "&#9733;".repeat(rev.rating) + "&#9734;".repeat(5 - rev.rating);
        return `
            <div class="glass-panel mb-4" style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600;">${user.firstName} ${user.lastName || ''}</span>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="color: var(--color-warning); font-size: 1.1rem;">${ratingStars}</span>
                        ${isOwner ? `<button class="btn btn-danger btn-sm" onclick="app.handleReviewDelete('${rev._id}', '${courseId}')" style="padding: 4px 10px; font-size: 0.75rem;">Delete</button>` : ''}
                    </div>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-secondary);">${rev.review || ''}</p>
            </div>
        `;
    }).join("");
}

export async function handleEnrollment(courseId) {
    if (!state.user) {
        showToast("Please log in to enroll.", "error");
        window.location.hash = "#/login";
        return;
    }

    try {
        // 1. Initiate order creation
        const orderData = await api.capturePayment(courseId);
        
        // 2. Setup Razorpay options
        const options = {
            key: orderData.key,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "EduChar",
            description: orderData.courseName,
            image: orderData.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=200",
            order_id: orderData.orderId,
            handler: async function (response) {
                // 3. Verify payment signature on the backend
                try {
                    await api.verifyPayment({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        courseId: courseId
                    });
                    showToast("Payment Successful! You are now enrolled.");
                    renderCourseDetails(courseId);
                } catch (verifyError) {
                    showToast(verifyError.message || "Payment verification failed.", "error");
                }
            },
            prefill: {
                name: state.user.firstName + " " + state.user.lastName,
                email: state.user.email,
            },
            theme: {
                color: "#6366f1"
            }
        };

        // 4. Open Razorpay Checkout Modal
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
            showToast(response.error.description || "Payment Failed", "error");
        });
        rzp.open();
        
    } catch (e) {
        showToast(e.message || "Could not initiate payment.", "error");
    }
}

// ──────────────────────────────────────────────
// RATING / REVIEW MODAL
// ──────────────────────────────────────────────

export function openReviewModal(courseId) {
    state.activeRatingCourseId = courseId;
    state.selectedRatingValue = 5;

    document.getElementById("rating-form").reset();
    setStarUI(5);

    document.querySelectorAll(".star-input").forEach(star => {
        star.onclick = () => {
            const rating = parseInt(star.getAttribute("data-rating"));
            state.selectedRatingValue = rating;
            setStarUI(rating);
        };
    });

    showModal("rating-modal");
}

export function setStarUI(rating) {
    document.querySelectorAll(".star-input").forEach(s => {
        const r = parseInt(s.getAttribute("data-rating"));
        s.classList.toggle("active", r <= rating);
    });
}

export async function handleRatingSubmit(event) {
    event.preventDefault();
    const reviewText = document.getElementById("reviewText").value;

    try {
        await api.createRating(state.selectedRatingValue, reviewText, state.activeRatingCourseId);
        showToast("Review submitted successfully!");
        closeModal("rating-modal");
        renderCourseDetails(state.activeRatingCourseId);
    } catch (e) {
        showToast(e.message || "Failed to submit review.", "error");
    }
}

export async function handleReviewDelete(reviewId, courseId) {
    if (!confirm("Are you sure you want to delete your review?")) return;

    try {
        await api.deleteRating(reviewId);
        showToast("Review deleted successfully!");
        renderCourseDetails(courseId);
    } catch (e) {
        showToast(e.message || "Failed to delete review.", "error");
    }
}

/**
 * Build HTML for star rating display on course details page.
 */
function buildDetailStarHtml(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (rating >= i) {
            html += `<svg class="star-icon star-filled" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        } else if (rating >= i - 0.5) {
            html += `<svg class="star-icon star-half" viewBox="0 0 24 24">
                <defs><linearGradient id="detail-half-${i}"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs>
                <path fill="url(#detail-half-${i})" stroke="currentColor" stroke-width="1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>`;
        } else {
            html += `<svg class="star-icon star-empty" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        }
    }
    return html;
}
