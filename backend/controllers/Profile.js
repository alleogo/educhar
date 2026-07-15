const Profile = require("../models/Profile");
const User = require("../models/User");
const Course = require("../models/Course");
const CourseProgress = require("../models/CourseProgress");

// updateProfile
exports.updateProfile = async (req,res) => {
    try{    
        // get data
        const {dateOfBirth, about, contactNumber, gender} = req.body;

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
            profileDetails
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
        if (userDetails.courses.length > 0) {
            await Course.updateMany(
                { _id: { $in: userDetails.courses } },
                { $pull: { enrolledStudents: id } }
            );
        }

        // delete user
        await User.findByIdAndDelete({_id: id});

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