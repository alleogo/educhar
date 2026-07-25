import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export default function Catalog() {
  const navigate = useNavigate();
  const { categories, setCategories } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [categoryDetails, setCategoryDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        if (categories.length === 0) {
          const catData = await api.getAllCategories();
          setCategories(catData.allCategories || []);
        }
        await fetchCoursesByCategory('all');
      } catch (e) {
        setError(e.message || "Failed to load categories.");
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const fetchCoursesByCategory = async (catId) => {
    setActiveCategory(catId);
    setLoading(true);
    setCategoryDetails(null);
    try {
      if (catId === 'all') {
        const coursesData = await api.getAllCourses();
        setCourses(coursesData.data || []);
      } else {
        const res = await api.getCategoryPageDetails(catId);
        setCategoryDetails(res.data);
      }
    } catch (e) {
      setError(e.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    let html = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        html.push(
          <svg key={i} className="star-icon star-filled" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      } else if (rating >= i - 0.5) {
        html.push(
          <svg key={i} className="star-icon star-half" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="currentColor"/>
                <stop offset="50%" stopColor="transparent"/>
              </linearGradient>
            </defs>
            <path fill={`url(#half-${i})`} stroke="currentColor" strokeWidth="1" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      } else {
        html.push(
          <svg key={i} className="star-icon star-empty" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
      }
    }
    return html;
  };

  const renderCourseGrid = (coursesList) => {
    if (!coursesList || coursesList.length === 0) {
      return (
        <div className="glass-panel text-center w-full" style={{ gridColumn: '1/-1', padding: '32px' }}>
          <p>No courses found.</p>
        </div>
      );
    }

    return coursesList.map(course => {
      let catName = "Coding";
      if (typeof course.category === 'object' && course.category?.name) {
        catName = course.category.name;
      } else {
        const categoryObj = categories.find(c => c._id === course.category);
        if (categoryObj) catName = categoryObj.name;
      }

      let instructorName = "Instructor";
      if (course.instructor && typeof course.instructor === 'object' && course.instructor.firstName) {
        instructorName = `${course.instructor.firstName} ${course.instructor.lastName || ''}`.trim();
      }

      const avgRating = course.averageRating || 0;
      const ratingCount = course.ratingCount || 0;

      return (
        <div key={course._id} className="course-card" onClick={() => navigate(`/course-details/${course._id}`)}>
          <div className="card-img-wrapper">
            <img className="card-img" src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600'} alt={course.courseName} />
            <span className="card-badge">{catName}</span>
          </div>
          <div className="card-body">
            <h3 className="card-title">{course.courseName}</h3>
            <p className="card-desc">{course.courseDescription || ''}</p>
            <div className="card-rating">
              <div className="card-rating-stars">{renderStars(avgRating)}</div>
              <span className="card-rating-value">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
              <span className="card-rating-count">({ratingCount}{ratingCount === 1 ? ' review' : ' reviews'})</span>
            </div>
            <div className="card-footer">
              <span className="card-price">₹{course.price || 0}</span>
              <span className="card-instructor">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {instructorName}
              </span>
            </div>
          </div>
        </div>
      );
    });
  };

  if (error) {
    return <div className="container mt-4 glass-panel text-center"><p className="text-danger">{error}</p></div>;
  }

  return (
    <>
      <section className="hero-section" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', opacity: 0.1, transform: 'rotate(15deg)', pointerEvents: 'none', animation: 'spin 60s linear infinite' }}>
          <svg width="300" height="300" viewBox="0 0 100 100">
            <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="var(--color-primary)" strokeWidth="2"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: '-30px', left: '-20px', opacity: 0.15, transform: 'rotate(-25deg)', pointerEvents: 'none' }}>
          <svg width="200" height="200" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-secondary)" strokeWidth="4"/>
          </svg>
        </div>
        
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="gradient-text">Master New Skills with EduChar</h1>
          <p className="hero-subtitle">High-quality development courses taught by experienced industry professionals. Start learning coding today.</p>
        </div>
      </section>

      <section className="container mb-4" style={{ animation: 'fadeUp 0.6s ease-out forwards', animationDelay: '0.2s', opacity: 0 }}>
        <div className="catalog-filters" id="category-filters-container">
          <button 
            className={`filter-chip ${activeCategory === 'all' ? 'active' : ''}`} 
            onClick={() => fetchCoursesByCategory('all')}
          >
            All Courses
          </button>
          {categories.map(cat => (
            <button 
              key={cat._id}
              className={`filter-chip ${activeCategory === cat._id ? 'active' : ''}`} 
              onClick={() => fetchCoursesByCategory(cat._id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
        
        <div id="catalog-content-container">
          {loading ? (
            <div className="view-loading"><div className="spinner"></div></div>
          ) : activeCategory === 'all' ? (
            <>
              <h3 className="mb-4">All Courses</h3>
              <div className="course-grid">
                {renderCourseGrid(courses)}
              </div>
            </>
          ) : categoryDetails ? (
            <>
              <div className="glass-panel mb-4" style={{ padding: '24px' }}>
                <h2 className="gradient-text">{categoryDetails.selectedCategory.name} Courses</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>{categoryDetails.selectedCategory.description}</p>
              </div>

              <h3 className="mb-4">Courses to get you started</h3>
              <div className="course-grid mb-4">
                {renderCourseGrid(categoryDetails.selectedCategory.course || [])}
              </div>

              {categoryDetails.topSellingCourses && categoryDetails.topSellingCourses.length > 0 && (
                <div className="glass-panel mb-4" style={{ padding: '24px', border: '1px solid var(--color-primary)' }}>
                  <h3 className="mb-4" style={{ color: 'var(--color-primary)' }}>🔥 Top Selling Courses Across Platform</h3>
                  <div className="course-grid">
                    {renderCourseGrid(categoryDetails.topSellingCourses)}
                  </div>
                </div>
              )}

              {categoryDetails.differentCategories && categoryDetails.differentCategories.length > 0 && (
                <>
                  <h3 className="mb-4 mt-4">Explore More Categories</h3>
                  <div className="course-grid">
                    {renderCourseGrid(categoryDetails.differentCategories.flatMap(cat => cat.course || []).slice(0, 8))}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-danger">Failed to load category details.</p>
          )}
        </div>
      </section>
    </>
  );
}