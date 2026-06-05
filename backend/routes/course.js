const express = require("express");
const router = express.Router();
const {createCourse, showAllCourses, getCourseDetails} = require("../controllers/Courses");
const {createSection, updateSection, deleteSection} = require("../controllers/Section");
const {createSubsection, deleteSubSection, updateSubSection} = require("../controllers/SubSection");
const {createCategory, showAllCategories, categoryPageDetails} = require("../controllers/Categories");
const {createRating, getAverageRating, getAllRatingAndReviews} = require("../controllers/RatingAndReview");
const {auth, isInstructor, isStudent, isAdmin} = require("../middlewares/auth");

// Course
router.post("/createcourse", auth, isInstructor, createCourse); // tested
router.get("/getallcourses", showAllCourses);                   // tested
router.get("/getcoursedetails", getCourseDetails);              // tested

// Section
router.post("/createsection", auth, isInstructor, createSection);   // testd
router.put("/updatesection", auth, isInstructor, updateSection);   // tested
router.delete("/deletesection/:sectionId", auth, isInstructor, deleteSection);  // tested

// SubSection
router.post("/createsubsection", auth, isInstructor, createSubsection);  // tested
router.put("/updatesubsection", auth, isInstructor, updateSubSection);
router.delete("/deletesubsection", auth, isInstructor, deleteSubSection);

// Category
router.post("/createcategory", auth, isAdmin, createCategory);  // tested
router.get("/getallcategories", showAllCategories);            // tested
router.get("/getcategorydetails", categoryPageDetails);        // tested

// Rating and Review
router.post("/createrating", auth, isStudent, createRating);    // tested
router.get("/getaveragerating", getAverageRating);              // tested
router.get("/getallratings", getAllRatingAndReviews);           // tested

module.exports = router;