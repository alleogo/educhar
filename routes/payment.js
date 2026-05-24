const express = require("express");
const router = express.Router();
const {capturePayment, verifySignature, enrollCourse, getEnrolledCourses} = require("../controllers/Payments");
const {auth, isStudent} = require("../middlewares/auth");

router.post("/capturepayment", auth, isStudent, capturePayment);    // tested using dummy data
router.post("/verifysignature", verifySignature);   // tested using dummy data

// Manual enrollment
router.post("/enrollcourse", auth, isStudent, enrollCourse);    // tested
router.get("/enrolledcourses", auth, isStudent, getEnrolledCourses);    // tested

module.exports = router;