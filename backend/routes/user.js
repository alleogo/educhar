const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {sendOTP, signUp, logIn, logOut, changePassword} = require("../controllers/Auth");
const {resetPasswordToken, resetPassword} = require("../controllers/ResetPassword");
const {auth} = require("../middlewares/auth");

// Rate limits (per client IP). They stop OTP/password brute forcing and email flooding.
// Note: on Vercel the default in-memory store is per serverless instance, so these are a
// strong speed bump rather than a global guarantee; a shared store (e.g. Redis) makes them strict.
const limiter = (windowMinutes, limit, message) => rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message }
});
const credentialLimiter = limiter(15, 10, "Too many attempts. Please try again in 15 minutes.");
const emailLimiter = limiter(60, 5, "Too many emails requested. Please try again later.");

router.post("/sendotp", emailLimiter, sendOTP);
router.post("/signup", credentialLimiter, signUp);
router.post("/login", credentialLimiter, logIn);
router.post("/logout", logOut);
router.post("/changepassword", auth, credentialLimiter, changePassword);
router.post("/reset-password-token", emailLimiter, resetPasswordToken);
router.post("/reset-password", credentialLimiter, resetPassword);

module.exports = router;

// user->request(route)->middleware->controller/handler->database(via model)->computation->send response->user
