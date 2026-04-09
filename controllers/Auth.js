const User = require('../models/User');
const Profile = require('../models/Profile');
const OTP = require('../models/OTP');
const otpGenerator = require('otp-generator'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

require('dotenv').config();


// sendOTP
exports.sendOTP = async (req, res) => {
    try{
        // fetch email from req.body
        const {email} = req.body;
        // check if user already exists
        const checkUserExistence = await User.findOne({email});
        // if user already exists
        if(checkUserExistence){
            return res.status(401).json({
                success: false,
                message: "User already exists!"
            });
        }

        // generate OTP
        let otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });
        console.log("OTP generated: ", otp);
        
        // check unique otp or not
        let result = await User.findOne({otp: otp}); // OR: let result = await User.findOne({otp});

        // generate otp until unique otp is obtained. bekar code hai, ese nhi krte hai, kuchh services use krte h jo hmesha unique otp dete h 
        while(result){
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false
            });
            result = await User.findOne({otp: otp});
        }

        // create DB entry of OTP
        const otpPayload = {email, otp};
        const otpBody = await OTP.create(otpPayload);   // const optBody = await OTP.create({email, otp});
        console.log(otpBody);

        // return successul response
        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            otp 
        })

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
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
            otp
        } = req.body;

        // validation
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp){
            return res.status(403).json({
                success: false,
                message: "Fill all required fields."
            });
        }

        // match the two passwords
        if(password != confirmPassword){
            return res.status(400).json({
                success: false,
                message: "Passwords don't match."
            });
        } 

        // check if user already exists
        const existingUser = await User.findOne({email}); 
        if(existingUser){
            return res.status(400).json({
                success: false,
                message: "User already exists." 
            });
        }

        // find most recent OTP in DB
        const recentOtp = await OTP.findOne({email}).sort({createdAt:-1}).limit(1);
                // .sort({created:-1}).limit(1) iska meaning dekhna hai
        console.log(recentOtp);   

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
            firstName, lastName, email, contactNumber, 
            password: hashedPassword,
            accountType,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`
        });

        // return response 
        return res.status(200).json({
            succes: true,
            message: "User is registerd successfully.",
            user
        });  
    }
    catch(error){
        console.log(error);
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
        const user = await User.findOne({email});
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
                raccountTypeole: user.accountType
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: '2h'
            });
            user.token = token;
            user.password = undefined;

            // create cookie and send response
            const options = {
                expires: new Date(Date.now() + 3*24*3600*1000),
                httpOnly: true
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
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Login Failure. Pleae try again."
        }); 
    }
}

// changePassword
exports.changePassword = async (req, res) => {
    try{
        // get data from req.body
        // get oldPassword, newPassword, confirmNewPassword
        // validation

        // update new password in DB
        // send password updated email
        // return response
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Couldn't change password. Please try again."
        });
    }
}