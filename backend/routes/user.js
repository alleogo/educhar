const express = require("express");
const router = express.Router();
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const {sendOTP, signUp, logIn, logOut, changePassword} = require("../controllers/Auth");
const {resetPasswordToken, resetPassword} = require("../controllers/ResetPassword");
const {auth} = require("../middlewares/auth");

// ---------------------------------------------------------------------------
// Rate limits: stop OTP/password brute forcing and email flooding.
// - Credential routes count only FAILED attempts (skipSuccessfulRequests), so many students
//   behind one campus/NAT IP aren't locked out by each other's normal logins.
// - Email-sending routes are capped per target email (anti email-bombing) and, more loosely,
//   per IP (anti mass-spam).
// On Vercel the default in-memory store is per serverless instance, so these are a strong
// speed bump rather than a global guarantee; a shared store (e.g. Redis) makes them strict.
// ---------------------------------------------------------------------------
const json = message => ({ success: false, message });

const failedAttempts = (limit, message) => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: json(message)
});

const perEmail = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    keyGenerator: req => `email:${String(req.body?.email || "").trim().toLowerCase()}`,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: json("Too many emails requested for this address. Please try again later.")
});
const perIpEmail = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    keyGenerator: req => `ip:${ipKeyGenerator(req.ip)}`,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: json("Too many emails requested. Please try again later.")
});

router.post("/sendotp", perIpEmail, perEmail, sendOTP);
router.post("/signup", failedAttempts(10, "Too many failed signup attempts. Please request a new OTP later."), signUp);
router.post("/login", failedAttempts(10, "Too many failed login attempts. Please try again in 15 minutes."), logIn);
router.post("/logout", logOut);
router.post("/changepassword", auth, failedAttempts(10, "Too many failed attempts. Please try again in 15 minutes."), changePassword);
router.post("/reset-password-token", perIpEmail, perEmail, resetPasswordToken);
router.post("/reset-password", failedAttempts(10, "Too many failed attempts. Please try again in 15 minutes."), resetPassword);

module.exports = router;

// user->request(route)->middleware->controller/handler->database(via model)->computation->send response->user
