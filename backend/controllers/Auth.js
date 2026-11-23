const User = require('../models/User');
const Profile = require('../models/Profile');
const OTP = require('../models/OTP');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mailSender = require('../utils/mailSender');
const { authCookieOptions } = require('../middlewares/auth');
const otpTemplate = require('../mail/templates/emailVerificationTemplate');

require('dotenv').config();

// sendOTP
exports.sendOTP = async (req, res) => {
    try{
        // fetch email from req.body
        const email = req.body.email?.trim().toLowerCase();
        if(!email){
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }
        // check if user already exists
        const checkUserExistence = await User.findOne({email});
        // if user already exists
        if(checkUserExistence){
            return res.status(409).json({
                success: false,
                message: "User already exists!"
            });
        }

        // Cryptographically secure 6-digit code. Global uniqueness isn't needed:
        // an OTP is always looked up together with its email.
        const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");

        // Only the newest code for this email should be valid
        await OTP.deleteMany({ email });
        await OTP.create({ email, otp });

        // send verification email; if it fails, don't leave an unusable code behind
        try {
            await mailSender(email, "Verification Email from EduChar", otpTemplate(otp));
        } catch (mailError) {
            await OTP.deleteMany({ email });
            throw mailError;
        }

        // The OTP is NEVER returned to the client: it must only be readable from the user's inbox
        return res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });

    }
    catch(error){
        console.error("sendOTP error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not send OTP. Please try again."
        })
    }
}


// signUp
exports.signUp = async (req, res) => {
    try{
        // data fetch from req.body
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber,
            otp,
            adminSecret
        } = req.body;

        // validation
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp){
            return res.status(403).json({
                success: false,
                message: "Fill all required fields."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // check if user already exists
        const existingUser = await User.findOne({email: normalizedEmail}); 
        if(existingUser){
            return res.status(400).json({
                success: false,
                message: "User already exists." 
            });
        }

        // match the two passwords
        if(password != confirmPassword){
            return res.status(400).json({
                success: false,
                message: "Passwords don't match."
            });
        } 

        // validate admin secret if trying to register as Admin
        if(accountType === "Admin"){
            if(!adminSecret || adminSecret !== process.env.ADMIN_SECRET){
                return res.status(403).json({
                    success: false,
                    message: "Invalid admin secret code. Admin registration denied."
                });
            }
        }

        // find most recent OTP in DB
        const recentOtpArray = await OTP.find({email: normalizedEmail}).sort({createdAt:-1}).limit(1);
        const recentOtp = recentOtpArray.length > 0 ? recentOtpArray[0] : null;

        // validate OTP
        if(!recentOtp){
            // OTP not found
            return res.status(400).json({
                success: false,
                message: "OTP not found"
            });
        }
        else if(recentOtp.otp != otp){
            // Invalid OTP
            return res.status(400).json({
                success: false,
                message: "OTP is not matching."
            });
        } 
        // MongoDB's TTL cleanup runs only every ~60s, so enforce the 5-minute expiry here too
        else if(Date.now() - new Date(recentOtp.createdAt).getTime() > 5 * 60 * 1000){
            return res.status(400).json({
                success: false,
                message: "OTP expired. Please request a new one."
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // create entry in DB
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null
        });

        const user = await User.create({
            firstName, lastName, email: normalizedEmail, contactNumber, 
            password: hashedPassword,
            accountType,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        });

        // Delete used OTPs for this email
        await OTP.deleteMany({ email: normalizedEmail });

        // never send the password hash back to the client
        user.password = undefined;

        // return response 
        return res.status(200).json({
            success: true,
            message: "User is registerd successfully.",
            user
        });  
    }
    catch(error){
        console.error(error.message);
        return res.status(500).json({
            success: false,
            message: "User cannot be registered. Please try again."
        });
    }
}


// logIn
exports.logIn = async (req, res) => {
    try{
        // get data from req.body
        const {email,password} = req.body;

        // validate data
        if(!email || !password){
            return res.status(403).json({
                success: false,
                message: "Fill all required fields."
            });
        }

        // check user exists or not
        const user = await User.findOne({email: email.trim().toLowerCase()}).select("+password").populate("additionalDetails");
        if(!user){
            return res.status(401).json({
                success: false,
                message: "User doesn't exist. Please SignUp first."
            });
        }

        // match password, generate JWT
        if(await bcrypt.compare(password, user.password)){
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: '2h'
            });
            user.token = token;
            user.password = undefined;

            // create cookie and send response
            const options = {
                ...authCookieOptions(),
                expires: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours, same as the JWT
            }
            res.cookie("token", token, options).status(200).json({  // res.cookie("cookieName, cookie, options")
                success: true,
                token,
                user,
                message: "Logged In successfully."
            });
        }
        else{
            return res.status(401).json({
                success: false,
                message: "Incorrect Password."
            });
        }
    }
    catch(error){
        console.error(error.message);
        return res.status(500).json({
            success: false,
            message: "Login Failure. Pleae try again."
        }); 
    }
}

// logOut: clears the httpOnly auth cookie (JavaScript can't remove it itself)
exports.logOut = async (req, res) => {
    res.clearCookie("token", authCookieOptions());
    return res.status(200).json({
        success: true,
        message: "Logged out successfully."
    });
}

// changePassword
exports.changePassword = async (req, res) => {
    try{
        // fetch data
        const {oldPassword, newPassword, confirmNewPassword} = req.body;

        if(!oldPassword || !newPassword){
            return res.status(400).json({
                success: false,
                message: "Please provide both old and new passwords."
            });
        }

        // check new password and confirm password if confirmNewPassword is provided
        if(confirmNewPassword && newPassword !== confirmNewPassword){
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });
        }

        // get user details from auth middleware
        const userDetails = await User.findById(req.user.id).select("+password");

        // check old password
        const isPasswordMatch = await bcrypt.compare(
            oldPassword,
            userDetails.password
        );

        if(!isPasswordMatch){
            return res.status(401).json({
                success: false,
                message: "Old password is incorrect."
            });
        }

        // hash new password
        const encryptedPassword = await bcrypt.hash(newPassword, 10);

        // update password
        const updatedUserDetails = await User.findByIdAndUpdate(
            req.user.id,
            {password: encryptedPassword},
            {new: true}
        );

        // send mail
        try{
            await mailSender(
                updatedUserDetails.email,
                "Password Updated",
                "Your password has been changed successfully <3 "
            );
        }
        catch(error){
            console.error("Password-change email failed:", error.message);
        }

        // return response
        return res.status(200).json({
            success: true,
            message: "Password updated successfully."
        });

    }
    catch(error){
        console.error(error.message);

        return res.status(500).json({
            success: false,
            message: "Couldn't change password. Please try again."
        });
    }
}