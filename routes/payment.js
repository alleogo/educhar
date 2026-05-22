const express = require("express");
const router = express.Router();
const {capturePayment, verifySignature, enrollCourse, getEnrolledCourses} = require("../controllers/Payments");
const {auth, isStudent} = require("../middlewares/auth");

router.post("/capturepayment", auth, isStudent, capturePayment);
router.post("/verifysignature", verifySignature);

// Manual enrollment
router.post("/enrollcourse", auth, isStudent, enrollCourse);  
// Get enrolled courses
router.get("/enrolledcourses", auth, isStudent, getEnrolledCourses);  

module.exports = router;