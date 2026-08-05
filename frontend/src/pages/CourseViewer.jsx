import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function CourseViewer() {
  const { id: courseId } = useParams();
  const { user } = useAppContext();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedVideos, setCompletedVideos] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);

  // Modals
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showSectionEditModal, setShowSectionEditModal] = useState(false);
  const [showSubSectionModal, setShowSubSectionModal] = useState(false);
  const [showSubSectionEditModal, setShowSubSectionEditModal] = useState(false);

  // Form State
  const [sectionForm, setSectionForm] = useState({ name: '' });
  const [editSectionForm, setEditSectionForm] = useState({ id: '', name: '' });
  const [subSectionForm, setSubSectionForm] = useState({ sectionId: '', title: '', description: '', timeDuration: '' });
  const [editSubSectionForm, setEditSubSectionForm] = useState({ id: '', title: '', description: '', timeDuration: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadCourseViewer();
  }, [courseId]);

  const loadCourseViewer = async () => {
    setLoading(true);
    try {
      const resp = await api.getCourseDetails(courseId);
      setCourse(resp.data);

      if (user?.accountType === 'Student') {
        const progResp = await api.getCourseProgress(courseId);
        setCompletedVideos(progResp.completedVideos || []);
      }
    } catch (e) {
      toast.error('Failed to load course viewer.');
    }
    setLoading(false);
  };

  const isInstructor = user?.accountType === 'Instructor' && (course?.instructor?._id === user?._id || course?.instructor === user?._id);
  const isStudent = user?.accountType === 'Student';

  // Section Handlers
  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createSection(sectionForm.name, courseId);
      toast.success('Section created successfully!');
      setShowSectionModal(false);
      setSectionForm({ name: '' });
      loadCourseViewer();
    } catch (err) { 
        console.error("Create Section Error:", err);
        toast.error(err.message || 'Failed to create section.'); 
    }
  };

  const handleSectionEdit = async (e) => {
    e.preventDefault();
    try {
      await api.updateSection(editSectionForm.name, editSectionForm.id);
      toast.success('Section updated successfully!');
      setShowSectionEditModal(false);
      loadCourseViewer();
    } catch (err) { toast.error('Failed to update section.'); }
  };

  const handleSectionDelete = async (sectionId) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;
    try {
      await api.deleteSection(sectionId);
      toast.success('Section deleted successfully!');
      loadCourseViewer();
    } catch (err) { toast.error('Failed to delete section.'); }
  };

  // Lesson Handlers
  const handleSubSectionSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('sectionId', subSectionForm.sectionId);
    fd.append('title', subSectionForm.title);
    fd.append('description', subSectionForm.description);
    fd.append('timeDuration', subSectionForm.timeDuration);
    if (fileInputRef.current?.files[0]) fd.append('videoFile', fileInputRef.current.files[0]);

    try {
      await api.createSubSection(fd);
      toast.success('Lesson uploaded successfully!');
      setShowSubSectionModal(false);
      setSubSectionForm({ sectionId: '', title: '', description: '', timeDuration: '' });
      loadCourseViewer();
    } catch (err) { toast.error('Failed to upload lesson.'); }
  };

  const handleSubSectionEdit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('subSectionId', editSubSectionForm.id);
    fd.append('title', editSubSectionForm.title);
    fd.append('description', editSubSectionForm.description);
    if (editSubSectionForm.timeDuration) fd.append('timeDuration', editSubSectionForm.timeDuration);
    if (fileInputRef.current?.files[0]) fd.append('videoFile', fileInputRef.current.files[0]);

    try {
      await api.updateSubSection(fd);
      toast.success('Lesson updated successfully!');
      setShowSubSectionEditModal(false);
      loadCourseViewer();
    } catch (err) { toast.error('Failed to update lesson.'); }
  };

  const handleSubSectionDelete = async (sectionId, subSectionId) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await api.deleteSubSection(sectionId, subSectionId);
      toast.success('Lesson deleted successfully!');
      loadCourseViewer();
    } catch (err) { toast.error('Failed to delete lesson.'); }
  };

  const markLessonComplete = async (subSectionId) => {
    try {
      await api.updateCourseProgress(courseId, subSectionId);
      toast.success('Lesson marked as completed!');
      loadCourseViewer();
    } catch (err) { toast.error('Failed to mark lesson completed'); }
  };

  const unmarkLessonComplete = async (subSectionId) => {
    try {
      await api.unmarkCourseProgress(courseId, subSectionId);
      toast.success('Lesson unmarked!');
      loadCourseViewer();
    } catch (err) { toast.error('Failed to unmark lesson'); }
  };

  if (loading) return <div className="view-loading"><div className="spinner"></div></div>;
  if (!course) return <div className="container mt-4 glass-panel text-center"><p className="text-danger">Course not found.</p></div>;

  let totalLessons = 0;
  (course.courseContent || []).forEach(sec => totalLessons += (sec.subSection || []).length);
  const progressPercentage = totalLessons > 0 ? Math.round((completedVideos.length / totalLessons) * 100) : 0;

  return (
    <div className="container mt-4" style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', paddingBottom: '48px' }}>
      <aside className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>{course.courseName}</h3>
        {isInstructor && <button className="btn btn-primary btn-sm w-full" onClick={() => setShowSectionModal(true)}>+ Add Section</button>}

        {isStudent && totalLessons > 0 && (
          <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
              <span>Course Progress</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>{progressPercentage}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPercentage}%`, background: 'var(--color-success)', transition: 'width 0.3s ease' }}></div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>{completedVideos.length} / {totalLessons} completed</div>
          </div>
        )}

        <div className="accordion-wrapper">
          {(course.courseContent || []).map((sec, idx) => (
            <div className="accordion-item" key={sec._id} style={{ borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <button className="accordion-header" style={{ flex: 1, border: 'none', background: 'none', fontSize: '0.85rem' }} onClick={(e) => e.currentTarget.parentElement.nextElementSibling.classList.toggle('hidden')}>
                  <span>{sec.sectionName}</span>
                </button>
                {isInstructor && (
                  <div style={{ paddingRight: '8px', display: 'flex', gap: '4px' }}>
                    <button onClick={() => { setSubSectionForm({ ...subSectionForm, sectionId: sec._id }); setShowSubSectionModal(true); }} style={{ color: 'var(--color-success)', fontSize: '1.1rem', padding: '4px' }}>+</button>
                    <button onClick={() => { setEditSectionForm({ id: sec._id, name: sec.sectionName }); setShowSectionEditModal(true); }} style={{ color: 'var(--color-primary)', fontSize: '0.85rem', padding: '4px' }}>✎</button>
                    <button onClick={() => handleSectionDelete(sec._id)} style={{ color: 'var(--color-danger)', fontSize: '1.1rem', padding: '4px' }}>&times;</button>
                  </div>
                )}
              </div>
              <div className={`accordion-content ${idx === 0 ? '' : 'hidden'}`} style={{ padding: '4px' }}>
                {(sec.subSection || []).length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px' }}>No lessons yet.</p>
                ) : (sec.subSection || []).map(les => {
                  const isCompleted = completedVideos.includes(les._id);
                  return (
                    <div key={les._id} className="sidebar-menu-btn" style={{ padding: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }} onClick={() => setActiveLesson({ ...les, isCompleted })}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isCompleted ? 
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : 
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        }
                        {les.title}
                      </span>
                      {isInstructor && (
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => { setEditSubSectionForm({ id: les._id, title: les.title, description: les.description || '', timeDuration: les.timeDuration || '' }); setShowSubSectionEditModal(true); }} style={{ color: 'var(--color-primary)', fontSize: '0.8rem' }}>✎</button>
                          <button onClick={() => handleSubSectionDelete(sec._id, les._id)} style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>&times;</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '450px', justifyContent: activeLesson ? 'flex-start' : 'center', alignItems: activeLesson ? 'stretch' : 'center' }}>
        {!activeLesson ? (
          <div className="text-center" style={{ maxWidth: '400px', margin: 'auto' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', marginBottom: '16px' }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <h3>Start Learning</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Select a lesson from the sidebar to begin watching lectures.</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.3rem' }}>{activeLesson.title}</h2>
              {isStudent && !activeLesson.isCompleted ? (
                <button className="btn btn-secondary btn-sm" onClick={() => markLessonComplete(activeLesson._id)}>Mark as Completed</button>
              ) : isStudent && activeLesson.isCompleted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--color-success)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Completed
                  </span>
                  <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }} onClick={() => unmarkLessonComplete(activeLesson._id)}>Unmark</button>
                </div>
              ) : null}
            </div>
            <div className="video-container" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <video src={activeLesson.videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }}></video>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <h4 style={{ marginBottom: '4px' }}>Lesson Description</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{activeLesson.description}</p>
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      {showSectionModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm">
            <div className="modal-header">
              <h2>Add Section</h2>
              <button className="btn-close" onClick={() => setShowSectionModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSectionSubmit}>
                <div className="form-group">
                  <label>Section Name*</label>
                  <input type="text" className="form-input" required value={sectionForm.name} onChange={e => setSectionForm({ name: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary w-full">Create Section</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSectionEditModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm">
            <div className="modal-header">
              <h2>Edit Section</h2>
              <button className="btn-close" onClick={() => setShowSectionEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSectionEdit}>
                <div className="form-group">
                  <label>Section Name*</label>
                  <input type="text" className="form-input" required value={editSectionForm.name} onChange={e => setEditSectionForm({ ...editSectionForm, name: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary w-full">Save Changes</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSubSectionModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm">
            <div className="modal-header">
              <h2>Add Lesson</h2>
              <button className="btn-close" onClick={() => setShowSubSectionModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubSectionSubmit}>
                <div className="form-group">
                  <label>Lesson Title*</label>
                  <input type="text" className="form-input" required value={subSectionForm.title} onChange={e => setSubSectionForm({ ...subSectionForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Duration*</label>
                  <input type="text" className="form-input" required placeholder="e.g. 12 mins" value={subSectionForm.timeDuration} onChange={e => setSubSectionForm({ ...subSectionForm, timeDuration: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description*</label>
                  <textarea className="form-input" rows="2" required value={subSectionForm.description} onChange={e => setSubSectionForm({ ...subSectionForm, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Video File*</label>
                  <input type="file" className="form-input" accept="video/*" ref={fileInputRef} required />
                </div>
                <button type="submit" className="btn btn-primary w-full">Upload Lesson</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSubSectionEditModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm">
            <div className="modal-header">
              <h2>Edit Lesson</h2>
              <button className="btn-close" onClick={() => setShowSubSectionEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubSectionEdit}>
                <div className="form-group">
                  <label>Lesson Title*</label>
                  <input type="text" className="form-input" required value={editSubSectionForm.title} onChange={e => setEditSubSectionForm({ ...editSubSectionForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Duration*</label>
                  <input type="text" className="form-input" required placeholder="e.g. 12 mins" value={editSubSectionForm.timeDuration} onChange={e => setEditSubSectionForm({ ...editSubSectionForm, timeDuration: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description*</label>
                  <textarea className="form-input" rows="2" required value={editSubSectionForm.description} onChange={e => setEditSubSectionForm({ ...editSubSectionForm, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Video File (Leave blank to keep existing)</label>
                  <input type="file" className="form-input" accept="video/*" ref={fileInputRef} />
                </div>
                <button type="submit" className="btn btn-primary w-full">Save Changes</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}