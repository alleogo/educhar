const express = require("express");
const router = express.Router();
const {capturePayment, verifySignature, verifyPayment} = require("../controllers/Payments");
const {auth, isStudent} = require("../middlewares/auth");

router.post("/capturepayment", auth, isStudent, capturePayment);    // tested using dummy data
router.post("/verifysignature", verifySignature);   // tested using dummy data
router.post("/verifypayment", auth, isStudent, verifyPayment);  // Frontend callback handler

module.exports = router;