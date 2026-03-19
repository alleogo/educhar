const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require('bcrypt');

// resetPasswordToken
exports.resetPasswordToken = async (req, res) => {
    try{
        // get email from req.body
        const email = req.body.email;
  
        // check user for this email, email validation
        const user = await User.findOne({email: email});
        if(!user){
            return res.json({
                success: false,
                message: "User not registered."
            });
        }

        // generate token
        const token = crypto.randomUUID();

        // update user by adding token and expiration time
        const updatedDetails = await User.findOneAndUpdate({email: email},
                                                        {
                                                            token: token,
                                                            resetPasswordExpires: Date.now() + 5*60*1000
                                                        }, 
                                                        {new: true});    // {new: true} return updated details

        // create URL
        const url = `http://localhost:3000/reset-password/${token}`;
        
        // send mail containing the url
        await mailSender(email,
                        "Reset Password Link",
                        `Reset Password Link: ${url}`)
        
        // return response
        return res.json({
            success: true,
            message: "Reset password email sent successfully."
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while sending reset password email"
        });
    }
}

// resetPassword
exports.resetPassword = async (req, res) => {
    try{
        // data fetch from req.body
        const {password, confirmPassword, toke} = req.body();

        // validation
        if(password != confirmPassword){
            return res.json({
                success: false,
                message: "Passwords don't match"
            });
        }

        // get user details from DB using token
        const userDetails = await User.findOne({token: token});

        // if no entry present -> invalid token
        if(!userDetails){
            return res.json({
                success: false,
                message: "Token is invalid"
            });
        }

        // check token expiration
        if(userDetails.resetPasswordExpires < Date.now()){
            return res.json({
                success: false, 
                message: "Token expired."
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // update password 
        await User.findOneAndReplace({token: token},
                                    {password: hashedPassword},
                                    {new: true});

        // return response
        return res.status(200).json({
            success: true,
            message: "Password reset successful"
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Someting went wrong while sending password reset email"
        });
    }
}