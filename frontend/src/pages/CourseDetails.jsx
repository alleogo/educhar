import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

function StarRating({ rating }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<svg key={i} className="star-icon star-filled" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>);
    } else if (rating >= i - 0.5) {
      stars.push(
        <svg key={i} className="star-icon star-half" viewBox="0 0 24 24">
          <defs><linearGradient id={`detail-half-${i}`}><stop offset="50%" stopColor="currentColor"/><stop offset="50%" stopColor="transparent"/></linearGradient></defs>
          <path fill={`url(#detail-half-${i})`} stroke="currentColor" strokeWidth="1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      );
    } else {
      stars.push(<svg key={i} className="star-icon star-empty" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>);
    }
  }
  return <>{stars}</>;
}

export default function CourseDetails() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [selectedRating, setSelectedRating] = useState(5);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    setLoading(true);
    try {
      const resp = await api.getCourseDetails(courseId);
      setCourse(resp.data);

      if (user?.accountType === 'Student') {
        try {
          const enrolledResp = await api.getEnrolledCourses();
          const enrolled = enrolledResp.enrolledCourses || [];
          setIsEnrolled(enrolled.some(c => c._id === courseId));
        } catch (e) { console.log('Could not fetch enrollment status'); }
      }
    } catch (e) {
      toast.error('Failed to load course details.');
    }
    setLoading(false);
  };

  const handleEnrollment = async () => {
    if (!user) {
      toast.error('Please log in to enroll.');
      navigate('/login');
      return;
    }
    try {
      const orderData = await api.capturePayment(courseId);
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'EduChar',
        description: orderData.courseName,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              courseId
            });
            toast.success('Payment Successful! You are now enrolled.');
            loadCourse();
          } catch (err) {
            toast.error(err.message || 'Payment verification failed.');
          }
        },
        prefill: { name: `${user.firstName} ${user.lastName}`, email: user.email },
        theme: { color: '#f97316' }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => toast.error(resp.error.description || 'Payment Failed'));
      rzp.open();
    } catch (e) {
      toast.error(e.message || 'Could not initiate payment.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createRating(selectedRating, reviewText, courseId);
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      setReviewText('');
      loadCourse();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review.');
    }
  };

  const handleReviewDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await api.deleteRating(reviewId);
      toast.success('Review deleted successfully!');
      loadCourse();
    } catch (e) {
      toast.error(e.message || 'Failed to delete review.');
    }
  };

  if (loading) return <div className="view-loading"><div className="spinner"></div></div>;
  if (!course) return <div className="container mt-4 glass-panel text-center"><p className="text-danger">Course not found.</p></div>;

  const avgRating = course.averageRating || 0;
  const ratingCount = course.ratingCount || 0;
  const isInstructor = user?.accountType === 'Instructor';
  const reviews = course.ratingAndReviews || [];

  return (
    <>
      <div className="details-hero">
        <div className="container">
          <h1 className="mb-4">{course.courseName}</h1>
          <p className="hero-subtitle" style={{ margin: 0, textAlign: 'left' }}>{course.courseDescription || ''}</p>
          <div className="details-hero-rating">
            <div className="card-rating-stars"><StarRating rating={avgRating} /></div>
            <span className="details-rating-value">{avgRating > 0 ? avgRating.toFixed(1) : 'No ratings yet'}</span>
            <span className="details-rating-count">({ratingCount}{ratingCount === 1 ? ' review' : ' reviews'})</span>
            <span className="details-rating-separator">•</span>
            <span className="details-enrolled-count">{(course.enrolledStudents || []).length} student{(course.enrolledStudents || []).length !== 1 ? 's' : ''} enrolled</span>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="details-grid">
          <div className="details-main">
            <div className="glass-panel mb-4">
              <h3>What you will learn</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{course.whatYouWillLearn || 'Not specified'}</p>
            </div>

            <div className="syllabus-section">
              <h2>Course Content</h2>
              <div className="accordion-wrapper mt-4">
                {(course.courseContent || []).length === 0 ? (
                  <p className="glass-panel text-center">No syllabus chapters uploaded yet.</p>
                ) : (course.courseContent || []).map((sec, idx) => {
                  const lessons = sec.subSection || [];
                  return (
                    <div className="accordion-item" key={sec._id}>
                      <button className="accordion-header" onClick={(e) => e.currentTarget.nextElementSibling.classList.toggle('hidden')}>
                        <span>Chapter {idx + 1}: {sec.sectionName}</span>
                        <span>{lessons.length} lessons</span>
                      </button>
                      <div className={`accordion-content ${idx === 0 ? '' : 'hidden'}`}>
                        {lessons.length === 0 ? (
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No lessons inside this section.</p>
                        ) : lessons.map(les => (
                          <div className="lesson-list-item" key={les._id}>
                            <div className="lesson-info">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              <span className="lesson-title-text">{les.title}</span>
                            </div>
                            <span className="lesson-meta">{les.timeDuration || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="reviews-section mt-4">
              <div className="dashboard-header">
                <h2>Student Reviews</h2>
                {isEnrolled && <button className="btn btn-secondary btn-sm" onClick={() => setShowReviewModal(true)}>Add Review</button>}
              </div>
              <div className="reviews-list mt-4">
                {reviews.length === 0 ? (
                  <p className="glass-panel text-center">No reviews given for this course yet.</p>
                ) : reviews.map(rev => {
                  const revUser = rev.user || { firstName: 'Anonymous', lastName: '' };
                  const reviewUserId = typeof revUser === 'object' ? revUser._id : revUser;
                  const isOwner = user?._id && reviewUserId && user._id === reviewUserId;
                  return (
                    <div className="glass-panel mb-4" style={{ padding: '16px' }} key={rev._id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{revUser.firstName} {revUser.lastName || ''}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: 'var(--color-warning)', fontSize: '1.1rem' }}>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                          {isOwner && <button className="btn btn-danger btn-sm" onClick={() => handleReviewDelete(rev._id)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Delete</button>}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{rev.review || ''}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="details-sidebar">
            <div className="sidebar-sticky">
              <div className="purchase-panel">
                <img src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600'} alt={course.courseName} style={{ width: '100%', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }} />
                <div className="purchase-price">₹{course.price || 0}</div>
                {isEnrolled ? (
                  <>
                    <button className="btn btn-primary w-full" onClick={() => navigate(`/course-viewer/${courseId}`)}>Go to Course Viewer</button>
                    <p className="mt-4" style={{ color: 'var(--color-success)', fontWeight: 500 }}>You are enrolled in this course.</p>
                  </>
                ) : isInstructor ? (
                  <button className="btn btn-secondary w-full" disabled>Instructor Preview</button>
                ) : (
                  <>
                    <button className="btn btn-primary w-full" onClick={handleEnrollment}>Enroll &amp; Pay Now</button>
                    <p className="mt-4" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>30-Day Money-Back Guarantee</p>
                  </>
                )}
              </div>

              {course.instructor && (
                <div className="glass-panel mt-4" style={{ padding: '20px' }}>
                  <h4 style={{ marginBottom: '12px' }}>Instructor</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <img src={course.instructor.image || `https://ui-avatars.com/api/?name=${encodeURIComponent((course.instructor.firstName || '') + ' ' + (course.instructor.lastName || ''))}&background=f97316&color=fff`} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{course.instructor.firstName || ''} {course.instructor.lastName || ''}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Instructor</div>
                    </div>
                  </div>
                  {course.instructor.additionalDetails?.about && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{course.instructor.additionalDetails.about}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReviewModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-sm">
            <div className="modal-header">
              <h2>Add Rating & Review</h2>
              <button className="btn-close" onClick={() => setShowReviewModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleReviewSubmit}>
                <div className="form-group text-center">
                  <label className="rating-label">Your Rating*</label>
                  <div className="star-rating-selector">
                    {[5, 4, 3, 2, 1].map(r => (
                      <span key={r} className={`star-input ${r <= selectedRating ? 'active' : ''}`} data-rating={r} onClick={() => setSelectedRating(r)}>&#9733;</span>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="reviewText">Your Review*</label>
                  <textarea id="reviewText" className="form-input" rows="3" placeholder="Share your experience with this course" required value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary w-full mt-4">Submit Review</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}