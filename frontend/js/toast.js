// ==========================================================================
// TOAST NOTIFICATIONS & MODAL HELPERS (toast.js)
// ==========================================================================

/**
 * Display a toast notification.
 * @param {string} message
 * @param {"success"|"error"|"warning"} type
 */
export function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    // Icon based on type
    let iconHtml = "";
    if (type === "success") {
        iconHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-success);"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === "error") {
        iconHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-danger);"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
        iconHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-warning);"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    }

    toast.innerHTML = `${iconHtml}<span>${message}</span>`;
    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add("toast-exit");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Show a modal overlay by id.
 * @param {string} id
 */
export function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("hidden");
}

/**
 * Hide a modal overlay by id.
 * @param {string} id
 */
export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("hidden");
}
