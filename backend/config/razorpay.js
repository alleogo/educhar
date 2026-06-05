const Razorpay = require("razorpay");
require("dotenv").config();

exports.instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY || "rzp_test_dummykey",
    key_secret: process.env.RAZORPAY_SECRET || "dummysecret",
});