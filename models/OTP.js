const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender")
const otpTemplate = require('../mail/templates/emailVerificationTemplate');

const otpSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true
    },
    otp:{
        type: String,
        required: true
    },
    createdAt:{
        type: Date,
        default: Date.now(),
        expires: 5*60   // 5 minutes
    }
});

// a function to send OTP emails
async function sendVerificationEmail(email, otp){
    try{
        const  mailResponse = await mailSender(email, "Verification Email from EduChar", otpTemplate(otp));
        console.log("Email sent successfully: ", mailResponse);
    }
    catch(error){
        console.log("Error occured while sending email: ", error);
        throw error;
    }
}

otpSchema.pre("save", async function(next) {
    sendVerificationEmail(this.email, this.otp)
        .then(() => next())
        .catch(next);
}); 


module.exports = mongoose.model("OTP", otpSchema); 
