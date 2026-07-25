// ==========================================================================
// PROFILE VIEW (views/profile.js)
// ==========================================================================
import { state } from "../state.js";
import { api } from "../api.js";
import { showToast } from "../toast.js";

export async function renderProfile() {
    if (!state.user) {
        window.location.hash = "#/login";
        return;
    }

    const container = document.getElementById("app-view");
    const details = state.user;

    container.innerHTML = `
        <div class="container mt-4" style="max-width: 600px; padding-bottom: 48px;">
            <div class="glass-panel mb-4">
                <h2>Edit Profile</h2>
                <form onsubmit="app.handleProfileUpdate(event)">
                    <div class="grid-2">
                        <div class="form-group">
                            <label>First Name</label>
                            <input type="text" class="form-input" value="${details.firstName}" disabled>
                        </div>
                        <div class="form-group">
                            <label>Last Name</label>
                            <input type="text" class="form-input" value="${details.lastName}" disabled>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="text" class="form-input" value="${details.email}" disabled>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label for="prof-gender">Gender</label>
                            <select id="prof-gender" class="form-input">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="prof-dob">Date of Birth</label>
                            <input type="date" id="prof-dob" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="prof-phone">Contact Number*</label>
                        <input type="tel" id="prof-phone" class="form-input" placeholder="e.g. 9876543210" required>
                    </div>
                    <div class="form-group">
                        <label for="prof-about">About Me</label>
                        <textarea id="prof-about" class="form-input" rows="3" placeholder="Tell us about yourself..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary w-full mt-4">Save Changes</button>
                </form>
            </div>

            <div class="glass-panel">
                <h2 class="mb-4">Change Password</h2>
                <form onsubmit="app.handlePasswordChange(event)">
                    <div class="form-group">
                        <label for="old-pwd">Old Password*</label>
                        <input type="password" id="old-pwd" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="new-pwd">New Password*</label>
                        <input type="password" id="new-pwd" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="confirm-new-pwd">Confirm New Password*</label>
                        <input type="password" id="confirm-new-pwd" class="form-input" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-full mt-4">Update Password</button>
                </form>
            </div>

            <div class="glass-panel" style="border: 1px solid var(--color-danger); margin-top: 24px;">
                <h2 class="mb-4" style="color: var(--color-danger);">Delete Account</h2>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">
                    Once you delete your account, there is no going back. Please be certain.
                </p>
                <button type="button" class="btn btn-outline" style="color: var(--color-danger); border-color: var(--color-danger);" onclick="app.handleAccountDelete()">
                    Delete My Account
                </button>
            </div>
        </div>
    `;

    try {
        console.log("Fetching user details...");
        const userDetails = await api.getUserDetails();
        console.log("Response from getUserDetails:", userDetails);
        const profile = userDetails.data?.additionalDetails || {};
        console.log("Extracted profile:", profile);

        if (profile.gender) document.getElementById("prof-gender").value = profile.gender;
        if (profile.dateOfBirth) document.getElementById("prof-dob").value = profile.dateOfBirth;
        if (profile.contactNumber) document.getElementById("prof-phone").value = profile.contactNumber;
        if (profile.about) document.getElementById("prof-about").value = profile.about;
        console.log("Form fields populated successfully.");
    } catch (e) {
        console.warn("Could not load additional user profile details.", e);
    }
}

export async function handleProfileUpdate(event) {
    event.preventDefault();
    const gender = document.getElementById("prof-gender").value;
    const dateOfBirth = document.getElementById("prof-dob").value;
    const contactNumber = document.getElementById("prof-phone").value;
    const about = document.getElementById("prof-about").value;

    try {
        await api.updateProfile({ gender, dateOfBirth, contactNumber, about });
        showToast("Profile details updated successfully!");
    } catch (e) {
        showToast("Failed to update profile details.", "error");
    }
}

export async function handlePasswordChange(event) {
    event.preventDefault();
    const oldPassword = document.getElementById("old-pwd").value;
    const newPassword = document.getElementById("new-pwd").value;
    const confirmNewPassword = document.getElementById("confirm-new-pwd").value;

    if (newPassword !== confirmNewPassword) {
        showToast("New passwords do not match.", "error");
        return;
    }

    try {
        await api.changePassword(oldPassword, newPassword, confirmNewPassword);
        showToast("Password updated successfully!");
        event.target.reset();
    } catch (e) {
        showToast(e.message || "Failed to update password.", "error");
    }
}

export async function handleAccountDelete() {
    if (!confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) {
        return;
    }

    try {
        await api.deleteAccount();
        showToast("Account deleted successfully!");
        api.clearSession();
        // Redirect to home/catalog page after deletion
        window.location.hash = "#/catalog";
    } catch (e) {
        showToast(e.message || "Failed to delete account.", "error");
    }
}
