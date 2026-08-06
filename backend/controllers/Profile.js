const Profile = require("../models/Profile");
const User = require("../models/User");
const Course = require("../models/Course");
const CourseProgress = require("../models/CourseProgress");
const RatingAndReview = require("../models/RatingAndReview");
const uploadImageToCloudinary = require("../utils/cloudinaryUploader");

exports.updateDisplayPicture = async (req, res) => {
    try {
        const displayPicture = req.files?.displayPicture;
        const userId = req.user.id;
        
        if (!displayPicture) {
            return res.status(404).json({
                success: false,
                message: "No image file provided."
            });
        }
        
        const image = await uploadImageToCloudinary(
            displayPicture,
            process.env.FOLDER_NAME || "educhar"
        );
        
        const updatedProfile = await User.findByIdAndUpdate(
            { _id: userId },
            { image: image.secure_url },
            { new: true }
        );
        
        res.send({
            success: true,
            message: "Image updated successfully.",
            data: updatedProfile,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update profile picture.",
            error: error.message,
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
        if (email && email !== userDetails.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "Email is already in use." });
            }
            userDetails.email = email;
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
        if(contactNumber !== undefined) profileDetails.contactNumber = contactNumber;
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
            message: "Failed to update profile.",
            error: error.message
        });
    }
}

// Explore -> how can we schedule this deletion operation, cronjob 
// deleteAccount
exports.deleteAccount = async (req,res) => {
    try{
        // get ID
        const id = req.user.id;

        // validation
        const userDetails = await User.findById(id);
        if(!userDetails){
            return res.status(400).json({
                success: false,
                message: "User Not Found."
            });
        }

        // delete profile
        await Profile.findByIdAndDelete({_id: userDetails.additionalDetails}); 
        
        // TODO(HW): unenroll user from all enrolled courses  
        // for(const courseId of userDetails.courses){
        //     await Course.findOneAndUpdate(
        //         {_id: courseId}, 
        //         {
        //             $pull: {
        //                 enrolledStudents: _id
        //             }
        //         }
        //     );
        // }

        // unenroll user from all enrolled courses 
        if (userDetails.courses && userDetails.courses.length > 0) {
            await Course.updateMany(
                { _id: { $in: userDetails.courses } },
                { $pull: { enrolledStudents: id } }
            );
        }

        // delete all CourseProgress associated with user
        if (userDetails.courseProgress && userDetails.courseProgress.length > 0) {
            await CourseProgress.deleteMany({ _id: { $in: userDetails.courseProgress } });
        }

        // delete all Ratings and Reviews authored by the user
        await RatingAndReview.deleteMany({ user: id });

        // if user is an Instructor, their created courses should ideally be deleted as well
        // (alternatively, they could be reassigned, but for now we delete them to avoid orphaned courses)
        if (userDetails.accountType === "Instructor") {
            const instructorCourses = await Course.find({ instructor: id });
            for (const course of instructorCourses) {
                // Remove course from category
                await require("../models/Category").findByIdAndUpdate(course.category, {
                    $pull: { course: course._id }
                });
                // Delete all sections and subsections
                const sections = course.courseContent || [];
                for (const sectionId of sections) {
                    const section = await require("../models/Section").findById(sectionId);
                    if (section) {
                        if (section.subSection && section.subSection.length > 0) {
                            await require("../models/SubSection").deleteMany({ _id: { $in: section.subSection } });
                        }
                        await require("../models/Section").findByIdAndDelete(sectionId);
                    }
                }
                // Delete course progress and ratings for this course
                await CourseProgress.deleteMany({ courseID: course._id });
                await RatingAndReview.deleteMany({ course: course._id });
                // Delete the course
                await Course.findByIdAndDelete(course._id);
            }
        }

        // delete user
        await User.findByIdAndDelete(id);

        // return response
        return res.status(200).json({
            success: true,
            message: "User deleted successfully."
        })
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "Failed to delete profile.",
            error: error.message
        });
    }
}


exports.getUserDetails = async (req, res) => {
    try{
        const id = req.user.id;
        const userDetails = await User.findById(id).populate("additionalDetails").exec(); 
        console.log(userDetails);
        return res.status(200).json({
            success: true,
            message: "User data fetched successfully.",
            data: userDetails
        });
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: "Error while fetching user details.",
            error: error.message
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
                select: "courseName courseDescription price thumbnail instructor"
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
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}