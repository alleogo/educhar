const Profile = require("../models/Profile");
const User = require("../models/User");

// updateProfile
exports.updateProfile = async (req,res) => {
    try{    
        // get data
        const {dateOfBirth="", about="", contactNumber, gender} = req.body;

        // get user id  
        const id = req.user.id;

        // validation
        if(!contactNumber || !gender || !id){
            return res.status(400).json({
                success: false,
                message: "All fields required."
            });
        }

        // find profile
        const userDetails = await User.findById(id);
        const profileId = userDetails.additionalDetails;
        const profileDetails = await Profile.findById(profileId); 

        // update profile
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.contactNumber = contactNumber;
        profileDetails.about = about;
        profileDetails.gender = gender;
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

        // delete user
        await User.findByIdAndDelete({_id: id});

        // return response
        return res.status(200).json({
            success: false,
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


exports.getAllUserDetails = async (req, res) => {
    try{
        const id = req.user.id;
        const userDetails = await User.findById(id).populate("additionalDetails").exec(); 
        return res.status(200).json({
            success: true,
            message: "User data fetched successfully."
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