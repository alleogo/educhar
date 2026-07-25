import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function Auth({ type }) {
  const navigate = useNavigate();
  const { token } = useParams();
  const { setUser, signupPayload, setSignupPayload } = useAppContext();
  
  const [loading, setLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    contactNumber: '',
    accountType: 'Student',
    adminSecret: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const key = e.target.name || e.target.id.replace(/^(login-|sign-|forgot-|reset-)/, '');
    setFormData({ ...formData, [key]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.logIn(formData.email, formData.password);
      api.setSession(resp.token, resp.user);
      setUser(resp.user);
      toast.success("Logged in successfully!");
      if (resp.user.accountType === "Instructor") navigate("/instructor-dashboard");
      else if (resp.user.accountType === "Admin") navigate("/admin-dashboard");
      else navigate("/student-dashboard");
    } catch (error) {
      toast.error(error.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupTrigger = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (formData.accountType === "Admin" && !formData.adminSecret) {
      toast.error("Admin secret code is required.");
      return;
    }
    
    setSignupPayload(formData);
    setLoading(true);
    try {
      await api.sendOtp(formData.email);
      toast.success("OTP sent to your email!");
      setShowOtpModal(true);
    } catch (error) {
      toast.error(error.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const submitSignupOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP code.");
      return;
    }
    setLoading(true);
    try {
      await api.signUp({ ...signupPayload, otp: otpCode });
      toast.success("Signed up successfully! Please log in.");
      setShowOtpModal(false);
      navigate("/login");
    } catch (error) {
      toast.error(error.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!signupPayload) return;
    try {
      await api.sendOtp(signupPayload.email);
      toast.success("Verification code resent successfully!");
    } catch (error) {
      toast.error(error.message || "Resend failed.");
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.resetPasswordToken(formData.email);
      toast.success("Reset link sent! Please check your email.");
    } catch (error) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(formData.password, formData.confirmPassword, token);
      toast.success("Password reset successfully! Please login.");
      navigate("/login");
    } catch (error) {
      toast.error(error.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (type === 'login') {
    return (
      <div className="auth-view-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Log in to access your dashboard</p>
          </div>
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <input type="email" id="login-email" className="form-input" placeholder="you@example.com" required onChange={handleChange} value={formData.email} />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Forgot Password?</Link>
              </div>
              <input type="password" id="login-password" className="form-input" placeholder="••••••••" required onChange={handleChange} value={formData.password} />
            </div>
            <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
          <div className="auth-footer">
            Don't have an account? <Link to="/signup" className="link-btn">Sign Up</Link>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'signup') {
    return (
      <>
        <div className="auth-view-wrapper">
          <div className="auth-card">
            <div className="auth-header">
              <h1>Create Account</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Start your learning journey today</p>
            </div>
            <form onSubmit={handleSignupTrigger}>
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="sign-first">First Name*</label>
                  <input type="text" id="sign-first" name="firstName" className="form-input" placeholder="John" required onChange={handleChange} value={formData.firstName} />
                </div>
                <div className="form-group">
                  <label htmlFor="sign-last">Last Name*</label>
                  <input type="text" id="sign-last" name="lastName" className="form-input" placeholder="Doe" required onChange={handleChange} value={formData.lastName} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="sign-email">Email Address*</label>
                <input type="email" id="sign-email" name="email" className="form-input" placeholder="you@example.com" required onChange={handleChange} value={formData.email} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="sign-phone">Contact Number</label>
                  <input type="tel" id="sign-phone" name="contactNumber" className="form-input" placeholder="9876543210" onChange={handleChange} value={formData.contactNumber} />
                </div>
                <div className="form-group">
                  <label htmlFor="sign-role">Account Type*</label>
                  <select id="sign-role" name="accountType" className="form-input" required onChange={handleChange} value={formData.accountType}>
                    <option value="Student">Student</option>
                    <option value="Instructor">Instructor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>
              {formData.accountType === "Admin" && (
                <div className="form-group" id="admin-secret-group">
                  <label htmlFor="sign-admin-secret">Admin Secret Code*</label>
                  <input type="password" id="sign-admin-secret" name="adminSecret" className="form-input" placeholder="Enter the platform admin secret key" required onChange={handleChange} value={formData.adminSecret} />
                </div>
              )}
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="sign-password">Password*</label>
                  <input type="password" id="sign-password" name="password" className="form-input" placeholder="••••••••" required onChange={handleChange} value={formData.password} />
                </div>
                <div className="form-group">
                  <label htmlFor="sign-confirm">Confirm Password*</label>
                  <input type="password" id="sign-confirm" name="confirmPassword" className="form-input" placeholder="••••••••" required onChange={handleChange} value={formData.confirmPassword} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP & Register"}
              </button>
            </form>
            <div className="auth-footer">
              Already have an account? <Link to="/login" className="link-btn">Log In</Link>
            </div>
          </div>
        </div>

        {showOtpModal && (
          <div className="modal-overlay" id="otp-modal">
            <div className="modal-card max-w-sm">
              <div className="modal-header">
                <h2>Verify Email</h2>
                <button className="btn-close" onClick={() => setShowOtpModal(false)}>&times;</button>
              </div>
              <div className="modal-body text-center">
                <p>We've sent a 6-digit OTP verification code to your email. Please enter it below:</p>
                <div className="otp-inputs-wrapper">
                  <input 
                    type="text" 
                    maxLength="6" 
                    id="otp-code-input" 
                    className="form-input otp-field" 
                    placeholder="123456" 
                    autoComplete="one-time-code" 
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary w-full mt-4" onClick={submitSignupOtp} disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Sign Up"}
                </button>
                <p className="resend-text mt-4">Didn't receive the OTP? <button className="link-btn" onClick={resendOtp}>Resend OTP</button></p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (type === 'forgot-password') {
    return (
      <div className="auth-view-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Forgot Password</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Enter your email to receive a reset link</p>
          </div>
          <form onSubmit={handleForgotPasswordSubmit}>
            <div className="form-group">
              <label htmlFor="forgot-email">Email Address</label>
              <input type="email" id="forgot-email" className="form-input" placeholder="you@example.com" required onChange={handleChange} value={formData.email} />
            </div>
            <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
          <div className="auth-footer">
            Remember your password? <Link to="/login" className="link-btn">Log In</Link>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'reset-password') {
    if (!token) {
      return <div className="container mt-4 glass-panel text-center"><p className="text-danger">Invalid or missing reset token.</p></div>;
    }
    return (
      <div className="auth-view-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Reset Password</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Enter your new password below</p>
          </div>
          <form onSubmit={handleResetPasswordSubmit}>
            <div className="form-group">
              <label htmlFor="reset-password">New Password*</label>
              <input type="password" id="reset-password" className="form-input" placeholder="••••••••" required onChange={handleChange} value={formData.password} />
            </div>
            <div className="form-group">
              <label htmlFor="reset-confirm">Confirm New Password*</label>
              <input type="password" id="reset-confirm" name="confirmPassword" className="form-input" placeholder="••••••••" required onChange={handleChange} value={formData.confirmPassword} />
            </div>
            <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}