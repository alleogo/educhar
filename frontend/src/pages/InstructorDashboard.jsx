import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const { user, categories } = useAppContext();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [formData, setFormData] = useState({
    courseName: '', courseDescription: '', whatYouWillLearn: '', price: '', category: ''
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user || user.accountType !== 'Instructor') {
      navigate('/login');
      return;
    }
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    try {
      const resp = await api.getAllCourses();
      const myCourses = (resp.data || []).filter(c => {
        const cInstructorId = c.instructor?._id || c.instructor;
        return cInstructorId === user._id;
      });
      setCourses(myCourses);
    } catch (e) {
      toast.error('Failed to load instructor courses.');
    }
    setLoading(false);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('courseName', formData.courseName);
    fd.append('courseDescription', formData.courseDescription);
    fd.append('whatYouWillLearn', formData.whatYouWillLearn);
    fd.append('price', formData.price);
    fd.append('category', formData.category);
    if (fileInputRef.current?.files[0]) {
      fd.append('thumbnail', fileInputRef.current.files[0]);
    }

    try {
      await api.createCourse(fd);
      toast.success('Course created successfully!');
      setShowCreateModal(false);
      setFormData({ courseName: '', courseDescription: '', whatYouWillLearn: '', price: '', category: '' });
      loadCourses();
    } catch (err) {
      toast.error(err.message || 'Failed to create course.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('courseName', editingCourse.courseName);
    fd.append('courseDescription', editingCourse.courseDescription);
    fd.append('whatYouWillLearn', editingCourse.whatYouWillLearn);
    fd.append('price', editingCourse.price);
    fd.append('category', editingCourse.category);
    if (fileInputRef.current?.files[0]) {
      fd.append('thumbnail', fileInputRef.current.files[0]);
    }

    try {
      await api.updateCourse(editingCourse._id, fd);
      toast.success('Course updated successfully!');
      setShowEditModal(false);
      loadCourses();
    } catch (err) {
      toast.error(err.message || 'Failed to update course.');
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? All sections, lessons, and student enrollments will be permanently removed.')) return;
    try {
      await api.deleteCourse(courseId);
      toast.success('Course deleted successfully!');
      loadCourses();
    } catch (e) {
      toast.error(e.message || 'Failed to delete course.');
    }
  };

  const openEditModal = (course) => {
    setEditingCourse({ ...course, category: typeof course.category === 'object' ? course.category._id : course.category });
    setShowEditModal(true);
  };

  if (!user || user.accountType !== 'Instructor') return null;

  const totalStudents = courses.reduce((sum, c) => sum + (c.enrolledStudents?.length || 0), 0);

  return (
    <div className="container dashboard-layout" style={{ animation: 'fadeUp 0.5s ease-out forwards', opacity: 0 }}>
      <aside className="dashboard-sidebar">
        <button className="sidebar-menu-btn active">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
          Instructor Portal
        </button>
        <button className="sidebar-menu-btn" onClick={() => navigate('/profile')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile Settings
        </button>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Instructor Portal</h1>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Create New Course</button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
            </div>
            <div>
              <div className="stat-num">{courses.length}</div>
              <div className="stat-label">Published Courses</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <div className="stat-num">{totalStudents}</div>
              <div className="stat-label">Total Students</div>
            </div>
          </div>
        </div>

        <div className="glass-panel">
          <h2 className="mb-4">My Created Courses</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Name</th>
                  <th>Price</th>
                  <th>Students</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center">Loading courses...</td></tr>
                ) : courses.length === 0 ? (
                  <tr><td colSpan="4" className="text-center">No courses created yet. Click "Create New Course" above.</td></tr>
                ) : (
                  courses.map(course => (
                    <tr key={course._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=100'} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} />
                          <span style={{ fontWeight: 500 }}>{course.courseName}</span>
                        </div>
                      </td>
                      <td>₹{course.price || 0}</td>
                      <td>{course.enrolledStudents?.length || 0}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/course-viewer/${course._id}`)}>Curriculum</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(course)}>Edit Info</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/course-details/${course._id}`)}>Preview</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(course._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md">
            <div className="modal-header">
              <h2>Create New Course</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateSubmit}>
                <div className="form-group">
                  <label>Course Title*</label>
                  <input type="text" className="form-input" required value={formData.courseName} onChange={e => setFormData({ ...formData, courseName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Course Description*</label>
                  <textarea className="form-input" rows="3" required value={formData.courseDescription} onChange={e => setFormData({ ...formData, courseDescription: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>What You Will Learn*</label>
                  <textarea className="form-input" rows="2" required value={formData.whatYouWillLearn} onChange={e => setFormData({ ...formData, whatYouWillLearn: e.target.value })} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Price (INR)*</label>
                    <input type="number" className="form-input" min="0" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Category*</label>
                    <select className="form-input" required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      <option value="" disabled>Select category</option>
                      {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Thumbnail Image</label>
                  <input type="file" className="form-input" accept="image/*" ref={fileInputRef} required />
                </div>
                <button type="submit" className="btn btn-primary w-full mt-4">Create Course</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editingCourse && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md">
            <div className="modal-header">
              <h2>Edit Course Info</h2>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>Course Title*</label>
                  <input type="text" className="form-input" required value={editingCourse.courseName} onChange={e => setEditingCourse({ ...editingCourse, courseName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Course Description*</label>
                  <textarea className="form-input" rows="3" required value={editingCourse.courseDescription} onChange={e => setEditingCourse({ ...editingCourse, courseDescription: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>What You Will Learn*</label>
                  <textarea className="form-input" rows="2" required value={editingCourse.whatYouWillLearn} onChange={e => setEditingCourse({ ...editingCourse, whatYouWillLearn: e.target.value })} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Price (INR)*</label>
                    <input type="number" className="form-input" min="0" required value={editingCourse.price} onChange={e => setEditingCourse({ ...editingCourse, price: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Category*</label>
                    <select className="form-input" required value={editingCourse.category} onChange={e => setEditingCourse({ ...editingCourse, category: e.target.value })}>
                      <option value="" disabled>Select category</option>
                      {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Thumbnail Image (Leave blank to keep existing)</label>
                  <input type="file" className="form-input" accept="image/*" ref={fileInputRef} />
                </div>
                <button type="submit" className="btn btn-primary w-full mt-4">Save Changes</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}