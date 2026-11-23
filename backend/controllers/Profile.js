const Profile = require("../models/Profile");
const User = require("../models/User");
const Course = require("../models/Course");
const CourseProgress = require("../models/CourseProgress");
const RatingAndReview = require("../models/RatingAndReview");
const uploadImageToCloudinary = require("../utils/cloudinaryUploader");
const { deleteFromCloudinary } = require("../utils/cloudinaryUploader");
const { removeCourseCompletely } = require("../utils/courseCleanup");
const { authCookieOptions } = require("../middlewares/auth");

exports.updateDisplayPicture = async (req, res) => {
    try {
        const displayPicture = req.files?.displayPicture;
        const userId = req.user.id;
        
        if (!displayPicture) {
            return res.status(400).json({
                success: false,
                message: "No image file provided."
            });
        }
        
        // validates type (jpeg/png/gif/webp) and size (5 MB) before uploading
        const image = await uploadImageToCloudinary(
            displayPicture,
            process.env.FOLDER_NAME || "educhar",
            null, null, "image"
        );
        
        // {new: false} returns the previous document, so the old picture can be cleaned up
        const previous = await User.findByIdAndUpdate(
            { _id: userId },
            { image: image.secure_url }
        );
        if (previous?.image) await deleteFromCloudinary(previous.image);   // no-op for dicebear avatars
        
        return res.status(200).json({
            success: true,
            message: "Image updated successfully.",
            data: { image: image.secure_url },
        });
    } catch (error) {
        console.error("updateDisplayPicture error:", error.message);
        return res.status(error.status === 400 ? 400 : 500).json({
            success: false,
            message: error.status === 400 ? error.message : "Failed to update profile picture."
        });
    }
};

// updateProfile
exports.updateProfile = async (req,res) => {
    try{    
        // get data
        const {dateOfBirth, about, contactNumber, gender, firstName, lastName, email} = req.body;

        // get user id  
        const id = req.user.id;

        // validation — only id is strictly required
        if(!id){
            return res.status(400).json({
                success: false,
                message: "User ID is required."
            });
        }

        // find profile
        const userDetails = await User.findById(id);
        if(!userDetails){
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }
        
        // update User specific fields
        let userUpdated = false;
        // Stored lowercase (like signup), otherwise login by email would stop matching
        const newEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address." });
        }
        if (newEmail && newEmail !== userDetails.email) {
            const existingUser = await User.findOne({ email: newEmail });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "Email is already in use." });
            }
            userDetails.email = newEmail;
            userUpdated = true;
        }
        if (firstName !== undefined && firstName.trim() !== "") {
            userDetails.firstName = firstName;
            userUpdated = true;
        }
        if (lastName !== undefined && lastName.trim() !== "") {
            userDetails.lastName = lastName;
            userUpdated = true;
        }
        if (userUpdated) {
            await userDetails.save();
        }

        const profileId = userDetails.additionalDetails;
        const profileDetails = await Profile.findById(profileId); 

        // update only provided fields
        if(dateOfBirth !== undefined) profileDetails.dateOfBirth = dateOfBirth;
        if(contactNumber !== undefined){
            // Schema stores a Number: accept "+91 98765-43210" style input, reject anything else
            const digits = String(contactNumber).replace(/[\s()+-]/g, "");
            if(digits === "") profileDetails.contactNumber = null;
            else if(/^\d{7,15}$/.test(digits)) profileDetails.contactNumber = Number(digits);
            else return res.status(400).json({ success: false, message: "Please enter a valid contact number." });
        }
        if(about !== undefined) profileDetails.about = about;
        if(gender !== undefined) profileDetails.gender = gender;
        await profileDetails.save();

        // return response  
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            profileDetails,
            user: {
                firstName: userDetails.firstName,
                lastName: userDetails.lastName,
                email: userDetails.email
            }
        });
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: error.code === 11000 ? "Email is already in use." : "Failed to update profile."
        });
    }
}

// deleteAccount
exports.deleteAccount = async (req,res) => {
    try{
        const id = req.user.id;

        const userDetails = await User.findById(id);
        if(!userDetails){
            return res.status(404).json({
                success: false,
                message: "User Not Found."
            });
        }

        // Instructors: delete their courses and everything attached (incl. Cloudinary media)
        if (userDetails.accountType === "Instructor") {
            const instructorCourses = await Course.find({ instructor: id });
            for (const course of instructorCourses) {
                await removeCourseCompletely(course);
            }
        }

        // Unenroll from every course (covers students and stale references)
        await Course.updateMany(
            { enrolledStudents: id },
            { $pull: { enrolledStudents: id } }
        );

        // Remove this user's reviews from the courses that reference them, then delete them
        const reviews = await RatingAndReview.find({ user: id }).select("_id");
        if (reviews.length > 0) {
            const reviewIds = reviews.map(r => r._id);
            await Course.updateMany(
                { ratingAndReviews: { $in: reviewIds } },
                { $pull: { ratingAndReviews: { $in: reviewIds } } }
            );
            await RatingAndReview.deleteMany({ _id: { $in: reviewIds } });
        }

        // Progress, profile, then the user
        if (userDetails.courseProgress?.length > 0) {
            await CourseProgress.deleteMany({ _id: { $in: userDetails.courseProgress } });
        }
        await Profile.findByIdAndDelete(userDetails.additionalDetails);
        await User.findByIdAndDelete(id);

        // Uploaded profile picture (no-op for generated avatars)
        await deleteFromCloudinary(userDetails.image);

        // Log the session out server-side too
        res.clearCookie("token", authCookieOptions());
        return res.status(200).json({
            success: true,
            message: "User deleted successfully."
        })
    }
    catch(error){
        console.error("deleteAccount error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to delete account."
        });
    }
}


exports.getUserDetails = async (req, res) => {
    try{
        const id = req.user.id;
        const userDetails = await User.findById(id).populate("additionalDetails").exec(); 
        return res.status(200).json({
            success: true,
            message: "User data fetched successfully.",
            data: userDetails
        });
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "Error while fetching user details."
        });
    }
}

// getEnrolledCourses - Get all courses enrolled by student
exports.getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get student with populated courses
        const student = await User.findById(userId)
            .populate({
                path: "courses",
                select: "courseName courseDescription price thumbnail instructor courseContent",
                populate: [
                    {
                        path: "courseContent",
                        populate: {
                            path: "subSection"
                        }
                    },
                    {
                        path: "instructor",
                        select: "firstName lastName image"
                    }
                ]
            });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        return res.status(200).json({
            success: true,
            enrolledCourses: student.courses,
            totalCourses: student.courses.length
        });
    }
    catch (error) {
        console.error("getEnrolledCourses error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not load enrolled courses."
        });
    }
}