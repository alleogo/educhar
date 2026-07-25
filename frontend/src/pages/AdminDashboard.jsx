import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, categories, setCategories } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!user || user.accountType !== 'Admin') {
      navigate('/login');
      return;
    }
    loadCategories();
  }, [user]);

  const loadCategories = async () => {
    try {
      const catData = await api.getAllCategories();
      setCategories(catData.allCategories || []);
    } catch (e) {
      toast.error('Failed to load categories.');
    }
    setLoading(false);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.request('course/createcategory', {
        method: 'POST',
        body: formData
      });
      toast.success('Category created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      loadCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to create category.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.updateCategory(editingCategory._id, editingCategory.name, editingCategory.description);
      toast.success('Category updated successfully!');
      setShowEditModal(false);
      loadCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to update category.');
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) return;
    try {
      await api.deleteCategory(categoryId);
      toast.success('Category deleted successfully!');
      loadCategories();
    } catch (e) {
      toast.error(e.message || 'Failed to delete category.');
    }
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setShowEditModal(true);
  };

  if (!user || user.accountType !== 'Admin') return null;

  return (
    <div className="container dashboard-layout" style={{ animation: 'fadeUp 0.5s ease-out forwards', opacity: 0 }}>
      <aside className="dashboard-sidebar">
        <button className="sidebar-menu-btn active">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
          Admin Portal
        </button>
        <button className="sidebar-menu-btn" onClick={() => navigate('/profile')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile Settings
        </button>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Admin Portal</h1>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Create Category</button>
        </div>

        <div className="glass-panel">
          <h2 className="mb-4">Course Categories</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" className="text-center">Loading categories...</td></tr>
                ) : categories.length === 0 ? (
                  <tr><td colSpan="3" className="text-center">No categories created yet. Click "Create Category" above.</td></tr>
                ) : (
                  categories.map(cat => (
                    <tr key={cat._id}>
                      <td style={{ fontWeight: 500 }}>{cat.name}</td>
                      <td>{cat.description || "N/A"}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(cat)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat._id)}>Delete</button>
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
          <div className="modal-card max-w-sm">
            <div className="modal-header">
              <h2>Create New Category</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateSubmit}>
                <div className="form-group">
                  <label>Category Name*</label>
                  <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description*</label>
                  <textarea className="form-input" rows="3" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary w-full" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-full">Create Category</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editingCategory && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm">
            <div className="modal-header">
              <h2>Edit Category</h2>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>Category Name*</label>
                  <input type="text" className="form-input" required value={editingCategory.name} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description*</label>
                  <textarea className="form-input" rows="3" required value={editingCategory.description} onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary w-full" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-full">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}