const express = require("express");
const router = express.Router();
const {sendOTP, signUp, logIn, changePassword} = require("../controllers/Auth");
const {resetPasswordToken, resetPassword} = require("../controllers/ResetPassword");
const {auth} = require("../middlewares/auth");

router.post("/sendotp", sendOTP);   // tested
router.post("/signup", signUp);     // tested
router.post("/login", logIn);       // tested
router.post("/changepassword", auth, changePassword); // tested
router.post("/reset-password-token", resetPasswordToken); // tested
router.post("/reset-password", resetPassword); // tested

module.exports = router;

// user->request(route)->middleware->controller/handler->database(via model)->computation->send response->user