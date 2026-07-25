// ==========================================================================
// AUTH VIEWS — LOGIN / SIGNUP / OTP (views/auth.js)
// ==========================================================================
import { state } from "../state.js";
import { api } from "../api.js";
import { showToast, showModal, closeModal } from "../toast.js";
import { updateNavbarUI } from "../navbar.js";

// ──────────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────────

export function renderLogin() {
    const container = document.getElementById("app-view");
    container.innerHTML = `
        <div class="auth-view-wrapper">
            <div class="auth-card">
                <div class="auth-header">
                    <h1>Welcome Back</h1>
                    <p style="color: var(--text-secondary);">Log in to access your dashboard</p>
                </div>

                <form onsubmit="app.handleLoginSubmit(event)">
                    <div class="form-group">
                        <label for="login-email">Email Address</label>
                        <input type="email" id="login-email" class="form-input" placeholder="you@example.com" required>
                    </div>
                    <div class="form-group">
                        <div style="display: flex; justify-content: space-between;">
                            <label for="login-password">Password</label>
                            <a href="#/forgot-password" style="font-size: 0.8rem; color: var(--color-primary); text-decoration: none;">Forgot Password?</a>
                        </div>
                        <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-full mt-4">Sign In</button>
                </form>

                <div class="auth-footer">
                    Don't have an account? <button class="link-btn" onclick="app.navigateTo('signup')">Sign Up</button>
                </div>
            </div>
        </div>
    `;
}

export async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        const resp = await api.logIn(email, password);
        api.setSession(resp.token, resp.user);
        state.user = resp.user;
        updateNavbarUI();
        showToast("Logged in successfully!");

        if (resp.user.accountType === "Instructor") {
            window.location.hash = "#/instructor-dashboard";
        } else if (resp.user.accountType === "Admin") {
            window.location.hash = "#/admin-dashboard";
        } else {
            window.location.hash = "#/student-dashboard";
        }
    } catch (error) {
        showToast(error.message || "Login failed.", "error");
    }
}

// ──────────────────────────────────────────────
// SIGNUP
// ──────────────────────────────────────────────

export function renderSignup() {
    const container = document.getElementById("app-view");
    container.innerHTML = `
        <div class="auth-view-wrapper">
            <div class="auth-card">
                <div class="auth-header">
                    <h1>Create Account</h1>
                    <p style="color: var(--text-secondary);">Start your learning journey today</p>
                </div>

                <form onsubmit="app.handleSignupTrigger(event)">
                    <div class="grid-2">
                        <div class="form-group">
                            <label for="sign-first">First Name*</label>
                            <input type="text" id="sign-first" class="form-input" placeholder="John" required>
                        </div>
                        <div class="form-group">
                            <label for="sign-last">Last Name*</label>
                            <input type="text" id="sign-last" class="form-input" placeholder="Doe" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="sign-email">Email Address*</label>
                        <input type="email" id="sign-email" class="form-input" placeholder="you@example.com" required>
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label for="sign-phone">Contact Number</label>
                            <input type="tel" id="sign-phone" class="form-input" placeholder="9876543210">
                        </div>
                        <div class="form-group">
                            <label for="sign-role">Account Type*</label>
                            <select id="sign-role" class="form-input" required onchange="app.onRoleChange(this.value)">
                                <option value="Student">Student</option>
                                <option value="Instructor">Instructor</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group" id="admin-secret-group" style="display:none;">
                        <label for="sign-admin-secret">Admin Secret Code*</label>
                        <input type="password" id="sign-admin-secret" class="form-input" placeholder="Enter the platform admin secret key">
                    </div>
                    <div class="grid-2">
                        <div class="form-group">
                            <label for="sign-password">Password*</label>
                            <input type="password" id="sign-password" class="form-input" placeholder="••••••••" required>
                        </div>
                        <div class="form-group">
                            <label for="sign-confirm">Confirm Password*</label>
                            <input type="password" id="sign-confirm" class="form-input" placeholder="••••••••" required>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary w-full mt-4" id="signup-submit-btn">Send OTP &amp; Register</button>
                </form>

                <div class="auth-footer">
                    Already have an account? <button class="link-btn" onclick="app.navigateTo('login')">Log In</button>
                </div>
            </div>
        </div>
    `;
}

export function onRoleChange(value) {
    const adminGroup = document.getElementById("admin-secret-group");
    const adminInput = document.getElementById("sign-admin-secret");
    if (!adminGroup) return;
    if (value === "Admin") {
        adminGroup.style.display = "block";
        if (adminInput) adminInput.setAttribute("required", "required");
    } else {
        adminGroup.style.display = "none";
        if (adminInput) {
            adminInput.removeAttribute("required");
            adminInput.value = "";
        }
    }
}

export async function handleSignupTrigger(event) {
    event.preventDefault();

    const firstName = document.getElementById("sign-first").value;
    const lastName = document.getElementById("sign-last").value;
    const email = document.getElementById("sign-email").value;
    const contactNumber = document.getElementById("sign-phone").value;
    const accountType = document.getElementById("sign-role").value;
    const password = document.getElementById("sign-password").value;
    const confirmPassword = document.getElementById("sign-confirm").value;
    const adminSecret = document.getElementById("sign-admin-secret")?.value?.trim() || "";

    if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
    }

    if (accountType === "Admin" && !adminSecret) {
        showToast("Admin secret code is required.", "error");
        return;
    }

    state.signupPayload = { firstName, lastName, email, contactNumber, accountType, password, confirmPassword, adminSecret };

    const submitBtn = document.getElementById("signup-submit-btn");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Sending OTP..."; }

    try {
        await api.sendOtp(email);
        showToast("OTP sent to your email!");
        showModal("otp-modal");
    } catch (error) {
        showToast(error.message || "Failed to send OTP.", "error");
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Send OTP & Register"; }
    }
}

// ──────────────────────────────────────────────
// OTP
// ──────────────────────────────────────────────

export async function submitSignupOtp() {
    const otpVal = document.getElementById("otp-code-input").value;
    if (!otpVal || otpVal.length !== 6) {
        showToast("Please enter a valid 6-digit OTP code.", "error");
        return;
    }

    const submitBtn = document.getElementById("btn-submit-otp");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Verifying..."; }

    try {
        await api.signUp({ ...state.signupPayload, otp: otpVal });
        showToast("Signed up successfully! Please log in.");
        closeModal("otp-modal");
        window.location.hash = "#/login";
    } catch (error) {
        showToast(error.message || "OTP verification failed.", "error");
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Verify & Sign Up"; }
    }
}

export async function resendOtp() {
    if (!state.signupPayload) return;
    try {
        await api.sendOtp(state.signupPayload.email);
        showToast("Verification code resent successfully!");
    } catch (error) {
        showToast(error.message || "Resend failed.", "error");
    }
}

// ──────────────────────────────────────────────
// FORGOT & RESET PASSWORD
// ──────────────────────────────────────────────

export function renderForgotPassword() {
    const container = document.getElementById("app-view");
    container.innerHTML = `
        <div class="auth-view-wrapper">
            <div class="auth-card">
                <div class="auth-header">
                    <h1>Forgot Password</h1>
                    <p style="color: var(--text-secondary);">Enter your email to receive a reset link</p>
                </div>

                <form onsubmit="app.handleForgotPasswordSubmit(event)">
                    <div class="form-group">
                        <label for="forgot-email">Email Address</label>
                        <input type="email" id="forgot-email" class="form-input" placeholder="you@example.com" required>
                    </div>
                    <button type="submit" id="forgot-submit-btn" class="btn btn-primary w-full mt-4">Send Reset Link</button>
                </form>

                <div class="auth-footer">
                    Remember your password? <button class="link-btn" onclick="app.navigateTo('login')">Log In</button>
                </div>
            </div>
        </div>
    `;
}

export async function handleForgotPasswordSubmit(event) {
    event.preventDefault();
    const email = document.getElementById("forgot-email").value;
    const btn = document.getElementById("forgot-submit-btn");

    if (btn) { btn.disabled = true; btn.innerText = "Sending..."; }
    try {
        await api.resetPasswordToken(email);
        showToast("Reset link sent! Please check your email.");
    } catch (error) {
        showToast(error.message || "Failed to send reset link", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Send Reset Link"; }
    }
}

export function renderResetPassword(token) {
    const container = document.getElementById("app-view");
    if (!token) {
        container.innerHTML = `<div class="container mt-4 glass-panel text-center"><p class="text-danger">Invalid or missing reset token.</p></div>`;
        return;
    }
    
    // Store token in state for submit handler
    state.resetPasswordToken = token;

    container.innerHTML = `
        <div class="auth-view-wrapper">
            <div class="auth-card">
                <div class="auth-header">
                    <h1>Reset Password</h1>
                    <p style="color: var(--text-secondary);">Enter your new password below</p>
                </div>

                <form onsubmit="app.handleResetPasswordSubmit(event)">
                    <div class="form-group">
                        <label for="reset-password">New Password*</label>
                        <input type="password" id="reset-password" class="form-input" placeholder="••••••••" required>
                    </div>
                    <div class="form-group">
                        <label for="reset-confirm">Confirm New Password*</label>
                        <input type="password" id="reset-confirm" class="form-input" placeholder="••••••••" required>
                    </div>
                    <button type="submit" id="reset-submit-btn" class="btn btn-primary w-full mt-4">Update Password</button>
                </form>
            </div>
        </div>
    `;
}

export async function handleResetPasswordSubmit(event) {
    event.preventDefault();
    const password = document.getElementById("reset-password").value;
    const confirmPassword = document.getElementById("reset-confirm").value;
    const token = state.resetPasswordToken;

    if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
    }

    const btn = document.getElementById("reset-submit-btn");
    if (btn) { btn.disabled = true; btn.innerText = "Updating..."; }

    try {
        await api.resetPassword(password, confirmPassword, token);
        showToast("Password reset successfully! Please login.");
        window.location.hash = "#/login";
    } catch (error) {
        showToast(error.message || "Failed to reset password.", "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Update Password"; }
    }
}
