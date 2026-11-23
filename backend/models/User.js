const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName:{
        type: String,
        required: true,
        trim: true, 
    },
    lastName:{
        type: String,
        required: true,
        trim: true, 
    },
    email:{
        type: String,
        required: true,
    },
    password:{
        type:String,
        required:true,
        select: false      // never returned unless explicitly requested with .select("+password")
    },
    accountType:{
        type: String,
        required: true,
        enum: ["Admin", "Student", "Instructor"]
    }, 
    additionalDetails:{
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: "Profile"
    },
    courses:[{
        type: mongoose.Schema.ObjectId,
        ref: "Course"
    }],
    image:{
        type: String,        // URL hoga
        required: true
    },
    token:{
        type: String,
        select: false      // password-reset token: must never leave the server
    },
    resetPasswordExpires:{
        type: Date,
        select: false
    },
    courseProgress:[{
        type: mongoose.Schema.ObjectId,
        ref: "CourseProgress"
    }] 
})

module.exports = mongoose.model("User", userSchema);