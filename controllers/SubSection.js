const Course = require("../models/Course");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const uploadToCloudinary = require("../utils/cloudinaryUploader");
require("dotenv").config();

// createSubSection
exports.createSubsection = async (req, res) => {
    try{
        // fetch data form req.body
        const {sectionId, title, timeDuration, description} = req.body;

        // extract file/video
        const video = req.files.videoFile;

        // validation
        if(!sectionId || !title || !timeDuration || !description || !video){
            return res.status(400).json({
                success: false,
                message: "Missing properties."
            }); 
        }

        // upload file/video to cloudinary
        const uploadDetails = await uploadToCloudinary(video, process.env.FOLDER_NAME);

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
        return res.status(500).json({
            success: false,
            message: "Internal server error: Failed to create sub-section.",
            error: error.message
        });
    }
}

// updateSubSection

// deleteSubSection