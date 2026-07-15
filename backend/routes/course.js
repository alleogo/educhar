const express = require("express");
const router = express.Router();
const { createCourse, showAllCourses, getCourseDetails, updateCourse, deleteCourse } = require("../controllers/Courses");
const { createSection, updateSection, deleteSection } = require("../controllers/Section");
const { createSubsection, deleteSubSection, updateSubSection } = require("../controllers/SubSection");
const { createCategory, showAllCategories, categoryPageDetails, updateCategory, deleteCategory } = require("../controllers/Categories");
const { createRating, getAverageRating, getAllRatingAndReviews, deleteRating } = require("../controllers/RatingAndReview");
const { updateCourseProgress, unmarkCourseProgress, getCourseProgress } = require("../controllers/CourseProgress");
const { auth, isInstructor, isStudent, isAdmin } = require("../middlewares/auth");

// Course
router.post("/createcourse", auth, isInstructor, createCourse);             // tested
router.put("/updatecourse/:courseId", auth, isInstructor, updateCourse);    // tested
router.get("/getallcourses", showAllCourses);                               // tested
router.get("/getcoursedetails", getCourseDetails);                          // tested
router.delete("/deletecourse/:courseId", auth, isInstructor, deleteCourse); // tested

// Section
router.post("/createsection", auth, isInstructor, createSection);              // tested
router.put("/updatesection", auth, isInstructor, updateSection);               // tested
router.delete("/deletesection/:sectionId", auth, isInstructor, deleteSection); // tested

// SubSection
router.post("/createsubsection", auth, isInstructor, createSubsection);    // tested
router.put("/updatesubsection", auth, isInstructor, updateSubSection);     // tested
router.delete("/deletesubsection", auth, isInstructor, deleteSubSection);  // tested

// Category
router.post("/createcategory", auth, isAdmin, createCategory);                  // tested
router.put("/updatecategory", auth, isAdmin, updateCategory);                   // tested
router.delete("/deletecategory/:categoryId", auth, isAdmin, deleteCategory);    // tested
router.get("/getallcategories", showAllCategories);                             // tested
router.get("/getcategorydetails", categoryPageDetails);                         // tested

// Rating and Review
router.post("/createrating", auth, isStudent, createRating);              // tested
router.get("/getaveragerating", getAverageRating);                        // tested
router.get("/getallratings", getAllRatingAndReviews);                     // tested
router.delete("/deleterating/:reviewId", auth, isStudent, deleteRating);  // tested

// Course Progress
router.post("/updateCourseProgress", auth, isStudent, updateCourseProgress);    // tested
router.post("/unmarkCourseProgress", auth, isStudent, unmarkCourseProgress);    // tested
router.post("/getCourseProgress", auth, isStudent, getCourseProgress);          // tested

module.exports = router;