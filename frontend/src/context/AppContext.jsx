import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [instructor, setInstructor] = useState({ activeTab: "my-courses" });
  const [signupPayload, setSignupPayload] = useState(null);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeRatingCourseId, setActiveRatingCourseId] = useState(null);
  const [selectedRatingValue, setSelectedRatingValue] = useState(5);

  useEffect(() => {
    const savedUser = api.getUser();
    if (savedUser) {
      setUser(savedUser);
    }
    async function loadCommonData() {
      try {
        const catData = await api.getAllCategories();
        setCategories(catData.allCategories || []);
      } catch (e) {
        console.warn("Could not fetch categories:", e);
      }
    }
    loadCommonData();
  }, []);

  const value = {
    user, setUser,
    categories, setCategories,
    courses, setCourses,
    enrolledCourses, setEnrolledCourses,
    instructor, setInstructor,
    signupPayload, setSignupPayload,
    activeCourseId, setActiveCourseId,
    activeSectionId, setActiveSectionId,
    activeRatingCourseId, setActiveRatingCourseId,
    selectedRatingValue, setSelectedRatingValue
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
