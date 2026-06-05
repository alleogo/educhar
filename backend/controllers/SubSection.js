const Course = require("../models/Course");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const uploadImageToCloudinary = require("../utils/cloudinaryUploader");
require("dotenv").config();

// createSubSection
exports.createSubsection = async (req, res) => {
    try{
        // fetch data form req.body
        const {sectionId, title, timeDuration, description} = req.body;

        // extract file/video
        const video = req.files?.videoFile;

        // Debug logging
        console.log("Request body:", {sectionId, title, timeDuration, description});
        console.log("Video file:", video?.name || "NOT FOUND");
        console.log("All files received:", Object.keys(req.files || {}));
        console.log("req.files content:", req.files);

        // validation
        if(!sectionId || !title || !timeDuration || !description || !video){
            return res.status(400).json({
                success: false,
                message: "Missing properties.",
                debug: {
                    sectionId: !!sectionId,
                    title: !!title,
                    timeDuration: !!timeDuration,
                    description: !!description,
                    video: !!video
                }
            }); 
        }

        // upload file/video to cloudinary
        const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);

        // crate a sub-section
        const subSectionDetails = await SubSection.create({
            title: title,
            description: description,
            timeDuration: timeDuration,
            videoUrl: uploadDetails.secure_url
        });

        // update section with sub-section ObjectID
        const updatedSection = await Section.findByIdAndUpdate({_id:sectionId},
                                                               {
                                                                $push: {
                                                                    subSection: subSectionDetails._id
                                                                }
                                                               },
                                                               {new: true}
                                                            );
        // TODO: log updated section here, after adding populate query
        
        // return response
        return res.status(200).json({
            success: true,
            message: "Sub-Section created successfully",
            updatedSection
        });
    }
    catch(error){
        console.error("SubSection creation error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error: Failed to create sub-section.",
            error: error?.message || error?.toString() || "Unknown error"
        });
    }
}


// updateSubSection
exports.updateSubSection = async (req, res) => {
    try{

        // fetch data
        const {
            subSectionId,
            title,
            description,
            timeDuration
        } = req.body;

        const video = req.files?.videoFile;

        // validation
        if(!subSectionId){
            return res.status(400).json({
                success:false,
                message:"SubSection ID is required."
            });
        }

        // get existing subsection
        const subSection =
            await SubSection.findById(subSectionId);

        if(!subSection){
            return res.status(404).json({
                success:false,
                message:"SubSection not found."
            });
        }

        // update only provided fields
        if(title)
            subSection.title = title;

        if(description)
            subSection.description = description;

        if(timeDuration)
            subSection.timeDuration = timeDuration;

        // upload new video if exists
        if(video){

            const uploadDetails =
                await uploadImageToCloudinary(
                    video,
                    process.env.FOLDER_NAME
                );

            subSection.videoUrl =
                uploadDetails.secure_url;
        }

        await subSection.save();

        return res.status(200).json({
            success:true,
            message:
            "SubSection updated successfully.",
            data:subSection
        });

    }
    catch(error){

        console.log(error);

        return res.status(500).json({
            success:false,
            message:error.message
        });
    }
};



// deleteSubSection
exports.deleteSubSection = async (req,res)=>{
    try{

        // fetch data
        const {
            sectionId,
            subSectionId
        } = req.body;

        // validation
        if(
            !sectionId ||
            !subSectionId
        ){
            return res.status(400).json({
                success:false,
                message:
                "Missing properties."
            });
        }

        // remove subsection id
        // from section
        await Section.findByIdAndUpdate(
            sectionId,
            {
                $pull:{
                    subSection:
                    subSectionId
                }
            },
            {new:true}
        );

        // delete subsection
        const deletedSubSection =
            await SubSection.findByIdAndDelete(
                subSectionId
            );

        if(!deletedSubSection){

            return res.status(404).json({
                success:false,
                message:
                "SubSection not found."
            });
        }

        return res.status(200).json({
            success:true,
            message:
            "SubSection deleted successfully."
        });

    }
    catch(error){

        console.log(error);

        return res.status(500).json({
            success:false,
            message:error.message
        });
    }
};