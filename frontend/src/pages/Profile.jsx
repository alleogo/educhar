import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useAppContext();
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    gender: 'Male',
    dateOfBirth: '',
    contactNumber: '',
    about: ''
  });
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
  const [loadingImage, setLoadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const resp = await api.getUserDetails();
      const userData = resp.data || {};
      const p = userData.additionalDetails || {};
      setProfile({
        firstName: userData.firstName || user?.firstName || '',
        lastName: userData.lastName || user?.lastName || '',
        email: userData.email || user?.email || '',
        gender: p.gender || 'Male',
        dateOfBirth: p.dateOfBirth || '',
        contactNumber: p.contactNumber || '',
        about: p.about || ''
      });
    } catch (e) {
      console.warn('Could not load profile details.', e);
      // Fallback: populate from user context so inputs aren't frozen
      setProfile(prev => ({
        ...prev,
        firstName: prev.firstName || user?.firstName || '',
        lastName: prev.lastName || user?.lastName || '',
        email: prev.email || user?.email || '',
      }));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateProfile(profile);
      toast.success('Profile details updated successfully!');
      
      // Update global user state with new name/email
      if (res.user) {
        const updatedUser = { ...user, ...res.user };
        setUser(updatedUser);
        api.setSession(api.getToken(), updatedUser);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile details.');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoadingImage(true);
    try {
      const formData = new FormData();
      formData.append('displayPicture', file);
      
      const res = await api.updateDisplayPicture(formData);
      toast.success('Profile picture updated successfully!');
      
      if (res.data) {
        const updatedUser = { ...user, image: res.data.image };
        setUser(updatedUser);
        api.setSession(api.getToken(), updatedUser);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile picture.');
    } finally {
      setLoadingImage(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    try {
      await api.changePassword(passwords.oldPassword, passwords.newPassword);
      toast.success('Password updated successfully!');
      setPasswords({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    }
  };

  const handleAccountDelete = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) return;
    try {
      await api.deleteAccount();
      toast.success('Account deleted successfully!');
      api.clearSession();
      setUser(null);
      navigate('/catalog');
    } catch (err) {
      toast.error(err.message || 'Failed to delete account.');
    }
  };

  if (!user) return null;

  return (
    <div className="container mt-4" style={{ maxWidth: '600px', paddingBottom: '48px', animation: 'fadeUp 0.5s ease-out forwards', opacity: 0 }}>
      
      <div className="glass-panel mb-4" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <img 
          src={user.image} 
          alt={`profile-${user.firstName}`} 
          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', opacity: loadingImage ? 0.5 : 1 }}
        />
        <div>
          <h3>Profile Picture</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>PNG, JPG, or GIF up to 5MB.</p>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            accept="image/png, image/gif, image/jpeg"
          />
          <button 
            className="btn btn-outline"
            onClick={() => fileInputRef.current.click()}
            disabled={loadingImage}
          >
            {loadingImage ? 'Uploading...' : 'Upload New Picture'}
          </button>
        </div>
      </div>

      <div className="glass-panel mb-4">
        <h2>Edit Profile</h2>
        <form onSubmit={handleProfileUpdate}>
          <div className="grid-2">
            <div className="form-group">
              <label>First Name*</label>
              <input type="text" className="form-input" required value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Last Name*</label>
              <input type="text" className="form-input" required value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Email Address*</label>
            <input type="email" className="form-input" required value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Gender</label>
              <select className="form-input" value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" className="form-input" value={profile.dateOfBirth} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Contact Number*</label>
            <input type="tel" className="form-input" placeholder="e.g. 9876543210" required value={profile.contactNumber} onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })} />
          </div>
          <div className="form-group">
            <label>About Me</label>
            <textarea className="form-input" rows="3" placeholder="Tell us about yourself..." value={profile.about} onChange={(e) => setProfile({ ...profile, about: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4">Save Changes</button>
        </form>
      </div>

      <div className="glass-panel">
        <h2 className="mb-4">Change Password</h2>
        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label>Old Password*</label>
            <input type="password" className="form-input" required value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} />
          </div>
          <div className="form-group">
            <label>New Password*</label>
            <input type="password" className="form-input" required value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Confirm New Password*</label>
            <input type="password" className="form-input" required value={passwords.confirmNewPassword} onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4">Update Password</button>
        </form>
      </div>

      <div className="glass-panel" style={{ border: '1px solid var(--color-danger)', marginTop: '24px' }}>
        <h2 className="mb-4" style={{ color: 'var(--color-danger)' }}>Delete Account</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Once you delete your account, there is no going back. Please be certain.</p>
        <button type="button" className="btn btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={handleAccountDelete}>Delete My Account</button>
      </div>
    </div>
  );
}