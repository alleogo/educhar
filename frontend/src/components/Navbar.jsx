import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { ChevronDown, User, LogOut, ArrowLeft } from 'lucide-react';

export default function Navbar() {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    api.clearSession();
    setUser(null);
    setMenuOpen(false);
    toast.success("Logged out successfully.");
    navigate('/catalog');
  };

  const isActive = (path) => location.pathname === path || (path === '/catalog' && location.pathname === '/');

  return (
    <header className="navbar-wrapper">
      <nav className="navbar container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {location.pathname !== '/catalog' && location.pathname !== '/' && (
            <button 
              onClick={() => navigate(-1)} 
              className="btn btn-secondary btn-sm" 
              style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--color-border)' }}
              title="Go Back"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="nav-brand" onClick={() => navigate('/catalog')} style={{ cursor: 'pointer' }}>
            <span className="logo-text">Edu<span className="gradient-text">Char</span></span>
          </div>
        </div>

        <div className="nav-links">
          <button 
            className={`nav-link-btn ${isActive('/catalog') ? 'active' : ''}`} 
            onClick={() => navigate('/catalog')}
          >
            Explore Courses
          </button>
          
          {user?.accountType === "Student" && (
            <button 
              className={`nav-link-btn ${isActive('/student-dashboard') ? 'active' : ''}`} 
              onClick={() => navigate('/student-dashboard')}
            >
              My Learning
            </button>
          )}
          
          {user?.accountType === "Instructor" && (
            <button 
              className={`nav-link-btn ${isActive('/instructor-dashboard') ? 'active' : ''}`} 
              onClick={() => navigate('/instructor-dashboard')}
            >
              Instructor Portal
            </button>
          )}
          
          {user?.accountType === "Admin" && (
            <button 
              className={`nav-link-btn ${isActive('/admin-dashboard') ? 'active' : ''}`} 
              onClick={() => navigate('/admin-dashboard')}
            >
              Admin Portal
            </button>
          )}
        </div>

        {!user ? (
          <div className="nav-actions" id="nav-auth-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>Log In</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>Sign Up</button>
          </div>
        ) : (
          <div className="nav-actions" id="nav-user-actions" ref={dropdownRef}>
            <div className="user-profile-badge" onClick={() => setMenuOpen(!menuOpen)}>
              <img 
                id="nav-user-avatar" 
                src={user.image || `https://api.dicebear.com/5.x/initials/svg?seed=${user.firstName}`} 
                alt="User Avatar" 
                className="avatar-sm" 
              />
              <span id="nav-user-name" className="username">{user.firstName}</span>
              <ChevronDown size={16} className="chevron-icon" />
            </div>
            
            {menuOpen && (
              <div className="dropdown-menu" id="user-dropdown">
                <div className="dropdown-header">
                  <p id="dropdown-user-fullname" className="dropdown-name">{user.firstName} {user.lastName}</p>
                  <p id="dropdown-user-role" className="dropdown-role">{user.accountType}</p>
                </div>
                <hr className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>
                  <User size={16} />
                  Edit Profile
                </button>
                <button className="dropdown-item logout-item" onClick={handleLogout}>
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
