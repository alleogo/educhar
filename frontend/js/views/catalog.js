// ==========================================================================
// CATALOG VIEW (views/catalog.js)
// ==========================================================================
import { state } from "../state.js";
import { api } from "../api.js";

/**
 * Render the main course catalog page.
 */
export async function renderCatalog() {
    const container = document.getElementById("app-view");
    container.innerHTML = `
        <section class="hero-section" style="position: relative; overflow: hidden;">
            <!-- Geometric Elements -->
            <div style="position: absolute; top: -50px; right: -50px; opacity: 0.1; transform: rotate(15deg); pointer-events: none; animation: spin 60s linear infinite;">
                <svg width="300" height="300" viewBox="0 0 100 100">
                    <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="var(--color-primary)" stroke-width="2"/>
                </svg>
            </div>
            <div style="position: absolute; bottom: -30px; left: -20px; opacity: 0.15; transform: rotate(-25deg); pointer-events: none;">
                <svg width="200" height="200" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-secondary)" stroke-width="4"/>
                </svg>
            </div>
            
            <div class="container" style="position: relative; z-index: 1;">
                <h1 class="gradient-text">Master New Skills with EduChar</h1>
                <p class="hero-subtitle">High-quality development courses taught by experienced industry professionals. Start learning coding today.</p>
            </div>
        </section>

        <section class="container mb-4" style="animation: fadeUp 0.6s ease-out forwards; animation-delay: 0.2s; opacity: 0;">
            <div class="catalog-filters" id="category-filters-container">
                <button class="filter-chip active" onclick="app.filterCoursesByCat('all')">All Courses</button>
                <!-- Categories will load here -->
            </div>
            <div id="catalog-content-container">
                <div class="view-loading"><div class="spinner"></div></div>
            </div>
        </section>
    `;

    try {
        const filtersContainer = document.getElementById("category-filters-container");
        if (state.categories.length === 0) {
            const catData = await api.getAllCategories();
            state.categories = catData.allCategories || [];
        }

        filtersContainer.innerHTML =
            `<button class="filter-chip active" id="cat-filter-all" onclick="app.filterCoursesByCat('all')">All Courses</button>` +
            state.categories.map(cat =>
                `<button class="filter-chip" id="cat-filter-${cat._id}" onclick="app.filterCoursesByCat('${cat._id}')">${cat.name}</button>`
            ).join("");

        // Load "All Courses" by default
        await filterCoursesByCat("all");
    } catch (error) {
        container.innerHTML = `<div class="container mt-4 glass-panel text-center"><p class="text-danger">Failed to load categories: ${error.message}</p></div>`;
    }
}

/**
 * Filter the displayed courses by category id or show Advanced Category Storefront.
 * @param {string} catId  — "all" or a category _id
 */
export async function filterCoursesByCat(catId) {
    document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.remove("active"));
    const activeChip = document.getElementById(`cat-filter-${catId}`);
    if (activeChip) activeChip.classList.add("active");

    const contentContainer = document.getElementById("catalog-content-container");
    if (!contentContainer) return;

    contentContainer.innerHTML = `<div class="view-loading"><div class="spinner"></div></div>`;

    if (catId === "all") {
        try {
            const coursesData = await api.getAllCourses();
            state.courses = coursesData.data || [];
            
            contentContainer.innerHTML = `
                <h3 class="mb-4">All Courses</h3>
                <div class="course-grid">
                    ${buildCourseCardsHtml(state.courses)}
                </div>
            `;
        } catch (e) {
            contentContainer.innerHTML = `<p class="text-danger">Failed to load courses.</p>`;
        }
    } else {
        // Fetch specific category page details
        try {
            const res = await api.getCategoryPageDetails(catId);
            const { selectedCategory, differentCategories, topSellingCourses } = res.data;

            const selectedCourses = selectedCategory?.course || [];
            
            // Flatten different categories courses
            let exploreMoreCourses = [];
            if (differentCategories && differentCategories.length > 0) {
                differentCategories.forEach(cat => {
                    exploreMoreCourses = exploreMoreCourses.concat(cat.course || []);
                });
            }
            // limit to 8 for display
            exploreMoreCourses = exploreMoreCourses.slice(0, 8);

            contentContainer.innerHTML = `
                <div class="glass-panel mb-4" style="padding: 24px;">
                    <h2 class="gradient-text">${selectedCategory.name} Courses</h2>
                    <p style="color: var(--text-secondary); margin-top: 8px;">${selectedCategory.description}</p>
                </div>

                <h3 class="mb-4">Courses to get you started</h3>
                <div class="course-grid mb-4">
                    ${buildCourseCardsHtml(selectedCourses)}
                </div>

                ${topSellingCourses && topSellingCourses.length > 0 ? `
                <div class="glass-panel mb-4" style="padding: 24px; border: 1px solid var(--color-primary);">
                    <h3 class="mb-4" style="color: var(--color-primary);">🔥 Top Selling Courses Across Platform</h3>
                    <div class="course-grid">
                        ${buildCourseCardsHtml(topSellingCourses)}
                    </div>
                </div>
                ` : ''}

                ${exploreMoreCourses.length > 0 ? `
                <h3 class="mb-4 mt-4">Explore More Categories</h3>
                <div class="course-grid">
                    ${buildCourseCardsHtml(exploreMoreCourses)}
                </div>
                ` : ''}
            `;
        } catch (e) {
            contentContainer.innerHTML = `<p class="text-danger">Failed to load category details: ${e.message}</p>`;
        }
    }
}

/**
 * Helper to build the course cards HTML string.
 */
function buildCourseCardsHtml(coursesList) {
    if (!coursesList || coursesList.length === 0) {
        return `<div class="glass-panel text-center w-full" style="grid-column: 1/-1; padding: 32px;"><p>No courses found.</p></div>`;
    }

    return coursesList.map(course => {
        // Find category name safely
        let catName = "Coding";
        if (typeof course.category === 'object' && course.category.name) {
            catName = course.category.name;
        } else {
            const categoryObj = state.categories.find(c => c._id === course.category);
            if (categoryObj) catName = categoryObj.name;
        }

        // Find instructor name
        let instructorName = "Instructor";
        if (course.instructor && typeof course.instructor === 'object' && course.instructor.firstName) {
            instructorName = `${course.instructor.firstName} ${course.instructor.lastName || ''}`.trim();
        }

        // Build star rating display
        const avgRating = course.averageRating || 0;
        const ratingCount = course.ratingCount || 0;
        const starsHtml = buildStarRatingHtml(avgRating);

        return `
            <div class="course-card" onclick="app.navigateTo('course-details', '${course._id}')">
                <div class="card-img-wrapper">
                    <img class="card-img" src="${course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600'}" alt="${course.courseName}">
                    <span class="card-badge">${catName}</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${course.courseName}</h3>
                    <p class="card-desc">${course.courseDescription || ''}</p>
                    <div class="card-rating">
                        <div class="card-rating-stars">${starsHtml}</div>
                        <span class="card-rating-value">${avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
                        <span class="card-rating-count">(${ratingCount}${ratingCount === 1 ? ' review' : ' reviews'})</span>
                    </div>
                    <div class="card-footer">
                        <span class="card-price">₹${course.price || 0}</span>
                        <span class="card-instructor">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            ${instructorName}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

/**
 * Build HTML for star rating display (supports half stars).
 * @param {number} rating - Rating value (0 to 5)
 * @returns {string} HTML string with star SVGs
 */
function buildStarRatingHtml(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (rating >= i) {
            // Full star
            html += `<svg class="star-icon star-filled" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        } else if (rating >= i - 0.5) {
            // Half star
            html += `<svg class="star-icon star-half" viewBox="0 0 24 24">
                <defs><linearGradient id="half-${i}"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="transparent"/></linearGradient></defs>
                <path fill="url(#half-${i})" stroke="currentColor" stroke-width="1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>`;
        } else {
            // Empty star
            html += `<svg class="star-icon star-empty" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        }
    }
    return html;
}

