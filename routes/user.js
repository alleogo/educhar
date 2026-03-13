const express = require("express");
const router = express.Router();
const {sendOTP, signUp, logIn, changePassword} = require("../controllers/Auth");
const {resetPasswordToken, resetPassword} = require("../controllers/ResetPassword");
const {auth} = require("../middlewares/auth");

router.post("/sendotp", sendOTP);
router.post("/signup", signUp);
router.post("/login", logIn);
router.post("/changepassword", auth, changePassword);
router.post("/reset-password-token", resetPasswordToken);
router.post("/reset-password", resetPassword);

module.exports = router;