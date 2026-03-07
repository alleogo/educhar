const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require("../models/User");

// auth
exports.auth = async (req, res, next) => {
    try{
        // extract token
        const token = req.cookies.token
                      || req.body.token
                      || req.header('Authorisation').replace("Bearer ", "");
        
        // token missing
        if(!token){
            return res.status(401).json({
                success: false,
                message: "Token is missing"
            });
        }

        // verify the token
        try{
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            console.log(decode);
        }
        catch(error){
            // verification issue
            console.log(error);
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }
        next();
    }
    catch(error){
        console.log(error);
        return res.status(401).json({
            success: false,
            message: "Token validation issue occured."
        }); 
    }
}

// isStudent
exports.isStudent = async (req, res, next) => {
    try{
        if(req.user.accountType != "Student"){
            return res.status(401).json({
                success: false,
                message: "This a protected route for Students only."
            });
        }
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "User role cannot be verified."
        });
    }
}

// isInstructor
exports.isInstructor = async (req, res, next) => {
    try{
        if(req.user.accountType != "Instructor"){
            return res.status(401).json({
                success: false,
                message: "This a protected route for Instructors only."
            });
        }
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "User role cannot be verified."
        });
    }
}

// isAdmin
exports.isAdmin = async (req, res, next) => {
    try{
        if(req.user.accountType != "Admin"){
            return res.status(401).json({
                success: false,
                message: "This a protected route for Admins   only."
            });
        }
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "User role cannot be verified."
        });
    }
}