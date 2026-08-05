const express = require("express");
const router = express.Router();
const { updateProfile, deleteAccount, getUserDetails, getEnrolledCourses, updateDisplayPicture } = require("../controllers/Profile");
const { auth, isStudent } = require("../middlewares/auth");

router.put("/updatedisplaypicture", auth, updateDisplayPicture);
router.put("/updateprofile", auth, updateProfile);  // tested
router.delete("/deleteaccount", auth, deleteAccount); // tested
router.get("/getuserdetails", auth, getUserDetails); // tested
router.get("/enrolledcourses", auth, isStudent, getEnrolledCourses); // tested

module.exports = router;