// ==========================================================================
// ADMIN DASHBOARD VIEW (views/adminDashboard.js)
// ==========================================================================
import { state } from "../state.js";
import { api } from "../api.js";
import { showToast, showModal, closeModal } from "../toast.js";

export async function renderAdminDashboard() {
    if (!state.user || state.user.accountType !== "Admin") {
        window.location.hash = "#/login";
        return;
    }

    const container = document.getElementById("app-view");
    container.innerHTML = `
        <div class="container dashboard-layout" style="animation: fadeUp 0.5s ease-out forwards; opacity: 0;">
            <aside class="dashboard-sidebar">
                <button class="sidebar-menu-btn active">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
                    Admin Portal
                </button>
                <button class="sidebar-menu-btn" onclick="app.navigateTo('profile')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profile Settings
                </button>
            </aside>

            <main class="dashboard-main">
                <div class="dashboard-header">
                    <h1>Admin Portal</h1>
                    <button class="btn btn-primary" onclick="app.openCategoryCreateModal()">Create Category</button>
                </div>

                <div class="glass-panel">
                    <h2 class="mb-4">Course Categories</h2>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Category Name</th>
                                    <th>Description</th>
                                    <th style="width: 150px; text-align: center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="admin-categories-table-body">
                                <tr>
                                    <td colspan="2" class="text-center">Loading categories...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    `;

    try {
        const catData = await api.getAllCategories();
        const categories = catData.allCategories || [];

        const tBody = document.getElementById("admin-categories-table-body");
        if (categories.length === 0) {
            tBody.innerHTML = `<tr><td colspan="2" class="text-center">No categories created yet. Click "Create Category" above.</td></tr>`;
            return;
        }

        tBody.innerHTML = categories.map(cat => `
            <tr>
                <td style="font-weight: 500;">${cat.name}</td>
                <td>${cat.description || "N/A"}</td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button class="btn btn-secondary btn-sm" onclick="app.openCategoryEditModal('${cat._id}', '${cat.name.replace(/'/g, "\\'")}', '${(cat.description || '').replace(/'/g, "\\'")}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="app.handleCategoryDelete('${cat._id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");

    } catch (e) {
        showToast("Failed to load categories.", "error");
    }
}

// ──────────────────────────────────────────────
// CATEGORY CREATION MODAL
// ──────────────────────────────────────────────

export function openCategoryCreateModal() {
    let modal = document.getElementById("category-modal");
    if (!modal) {
        // Create modal dynamically if it doesn't exist
        modal = document.createElement("div");
        modal.id = "category-modal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="category-modal-title">Create New Category</h2>
                    <button class="close-btn" onclick="app.closeModal('category-modal')">&times;</button>
                </div>
                <form id="category-form" onsubmit="app.handleCategorySubmit(event)">
                    <div class="form-group">
                        <label for="categoryName">Category Name*</label>
                        <input type="text" id="categoryName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="categoryDescription">Description*</label>
                        <textarea id="categoryDescription" class="form-input" rows="3" required></textarea>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 1rem;">
                        <button type="button" class="btn btn-secondary w-full" onclick="app.closeModal('category-modal')">Cancel</button>
                        <button type="submit" class="btn btn-primary w-full" id="category-form-submit-btn">Create Category</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        document.getElementById("category-form").reset();
        document.getElementById("category-form-submit-btn").innerText = "Create Category";
    }

    showModal("category-modal");
}

export async function handleCategorySubmit(event) {
    event.preventDefault();

    const name = document.getElementById("categoryName").value;
    const description = document.getElementById("categoryDescription").value;

    const btn = document.getElementById("category-form-submit-btn");
    btn.disabled = true;
    btn.innerText = "Creating...";

    try {
        await api.request("course/createcategory", {
            method: "POST",
            body: { name, description }
        });
        showToast("Category created successfully!");
        closeModal("category-modal");
        
        // Refresh categories globally and in the view
        const catData = await api.getAllCategories();
        state.categories = catData.allCategories || [];
        renderAdminDashboard();
    } catch (e) {
        showToast(e.message || "Failed to create category.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Create Category";
    }
}

// ──────────────────────────────────────────────
// EDIT & DELETE CATEGORY
// ──────────────────────────────────────────────

export function openCategoryEditModal(id, name, description) {
    let modal = document.getElementById("category-edit-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "category-edit-modal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Category</h2>
                    <button class="close-btn" onclick="app.closeModal('category-edit-modal')">&times;</button>
                </div>
                <form id="category-edit-form" onsubmit="app.handleCategoryEditSubmit(event)">
                    <input type="hidden" id="editCategoryId">
                    <div class="form-group">
                        <label for="editCategoryName">Category Name*</label>
                        <input type="text" id="editCategoryName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="editCategoryDescription">Description*</label>
                        <textarea id="editCategoryDescription" class="form-input" rows="3" required></textarea>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 1rem;">
                        <button type="button" class="btn btn-secondary w-full" onclick="app.closeModal('category-edit-modal')">Cancel</button>
                        <button type="submit" class="btn btn-primary w-full" id="category-edit-form-submit-btn">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Populate form
    document.getElementById("editCategoryId").value = id;
    document.getElementById("editCategoryName").value = name;
    document.getElementById("editCategoryDescription").value = description;
    document.getElementById("category-edit-form-submit-btn").innerText = "Save Changes";

    showModal("category-edit-modal");
}

export async function handleCategoryEditSubmit(event) {
    event.preventDefault();

    const categoryId = document.getElementById("editCategoryId").value;
    const name = document.getElementById("editCategoryName").value;
    const description = document.getElementById("editCategoryDescription").value;

    const btn = document.getElementById("category-edit-form-submit-btn");
    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        await api.updateCategory(categoryId, name, description);
        showToast("Category updated successfully!");
        closeModal("category-edit-modal");
        
        // Refresh categories
        const catData = await api.getAllCategories();
        state.categories = catData.allCategories || [];
        renderAdminDashboard();
    } catch (e) {
        showToast(e.message || "Failed to update category.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Changes";
    }
}

export async function handleCategoryDelete(categoryId) {
    if (!confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
        return;
    }

    try {
        await api.deleteCategory(categoryId);
        showToast("Category deleted successfully!");
        
        // Refresh categories
        const catData = await api.getAllCategories();
        state.categories = catData.allCategories || [];
        renderAdminDashboard();
    } catch (e) {
        showToast(e.message || "Failed to delete category.", "error");
    }
}
