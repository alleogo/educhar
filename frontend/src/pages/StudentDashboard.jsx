import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

function EnrolledCourseCard({ course }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);

  useEffect(() => {
    let total = 0;
    (course.courseContent || []).forEach(sec => total += (sec.subSection || []).length);
    setTotalLessons(total);

    if (total > 0) {
      api.getCourseProgress(course._id)
        .then(resp => {
          if (resp.completedVideos) {
            setProgress(Math.round((resp.completedVideos.length / total) * 100));
          }
        })
        .catch(console.warn);
    }
  }, [course]);

  const instructorName = course.instructor?.firstName
    ? `${course.instructor.firstName} ${course.instructor.lastName || ''}`
    : 'Instructor';

  return (
    <div className="course-card" onClick={() => navigate(`/course-viewer/${course._id}`)}>
      <div className="card-img-wrapper">
        <img className="card-img" src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600'} alt={course.courseName} />
        <div className="card-badge">Enrolled</div>
      </div>
      <div className="card-body">
        <h3 className="card-title">{course.courseName}</h3>
        <p className="card-desc">{course.courseDescription || ''}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {instructorName}
        </div>
        {totalLessons > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-success)', transition: 'width 0.3s ease' }}></div>
            </div>
          </div>
        )}
        <div className="card-footer" style={{ marginTop: totalLessons > 0 ? '12px' : 'auto' }}>
          <button className="btn btn-primary btn-sm w-full">Continue Learning →</button>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.accountType !== 'Student') {
      navigate('/login');
      return;
    }
    loadEnrolledCourses();
  }, [user]);

  const loadEnrolledCourses = async () => {
    try {
      const resp = await api.getEnrolledCourses();
      setEnrolledCourses(resp.enrolledCourses || []);
    } catch (e) {
      console.warn(e);
    }
    setLoading(false);
  };

  if (!user || user.accountType !== 'Student') return null;

  return (
    <div className="container dashboard-layout" style={{ animation: 'fadeUp 0.5s ease-out forwards', opacity: 0 }}>
      <aside className="dashboard-sidebar">
        <button className="sidebar-menu-btn active">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
          Enrolled Courses
        </button>
        <button className="sidebar-menu-btn" onClick={() => navigate('/catalog')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Browse Courses
        </button>
        <button className="sidebar-menu-btn" onClick={() => navigate('/profile')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile Settings
        </button>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>My Learning</h1>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
            </div>
            <div>
              <div className="stat-num">{enrolledCourses.length}</div>
              <div className="stat-label">Enrolled Courses</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
              <div className="stat-num">—</div>
              <div className="stat-label">Certificates</div>
            </div>
          </div>
        </div>

        <div className="course-grid">
          {loading ? (
            <div className="view-loading"><div className="spinner"></div></div>
          ) : enrolledCourses.length === 0 ? (
            <div className="glass-panel text-center w-full" style={{ gridColumn: '1/-1', padding: '48px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)', marginBottom: '16px' }}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
              <h3>No enrolled courses yet</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '12px 0 20px' }}>Explore our catalog and kickstart your learning journey today.</p>
              <button className="btn btn-primary" onClick={() => navigate('/catalog')}>Browse Courses</button>
            </div>
          ) : (
            enrolledCourses.map(course => <EnrolledCourseCard key={course._id} course={course} />)
          )}
        </div>
      </main>
    </div>
  );
}