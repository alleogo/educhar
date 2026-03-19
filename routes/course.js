const express = require("express");
const router = express.Router();
const {createCourse, showAllCourses, getCourseDetails} = require("../controllers/Courses");
const {createSection, updateSection, deleteSection} = require("../controllers/Section");
const {createSubsection} = require("../controllers/SubSection");
const {createCategory, showAllCategories, categoryPageDetails} = require("../controllers/Categories");
const {createRating, getAverageRating, getAllRatingAndReviews} = require("../controllers/RatingAndReview");
const {auth, isInstructor, isStudent, isAdmin} = require("../middlewares/auth");

// Course
router.post("/createcourse", auth, isInstructor, createCourse);
router.get("/getallcourses", showAllCourses);
router.get("/getcoursedetails", getCourseDetails);

// Section
router.post("/createsection", auth, isInstructor, createSection);
router.put("/updatesection", auth, isInstructor, updateSection);
router.delete("/deletesection", auth, isInstructor, deleteSection);

// SubSection
router.post("/createsubsection", auth, isInstructor, createSubsection);

// Category
router.post("/createcategory", auth, isAdmin, createCategory);
router.get("/getallcategories", showAllCategories);
router.get("/getcategorydetails", categoryPageDetails);

// Rating and Review
router.post("/createrating", auth, isStudent, createRating);
router.get("/getaveragerating", getAverageRating);
router.get("/getallratings", getAllRatingAndReviews);

module.exports = router;