const Course = require("../models/Course");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const uploadImageToCloudinary = require("../utils/cloudinaryUploader");
const { validateFile, deleteFromCloudinary } = require("../utils/cloudinaryUploader");
const { findOwnedCourse, validIds } = require("../utils/courseOwnership");
require("dotenv").config();

// createSubSection
exports.createSubsection = async (req, res) => {
    try {
        // fetch data form req.body
        const { sectionId, title, timeDuration, description } = req.body;

        // extract file/video
        const video = req.files?.videoFile;

        // validation
        if (!sectionId || !title || !timeDuration || !description || !video) {
            return res.status(400).json({
                success: false,
                message: "Missing properties."
            });
        }

        if (!validIds(res, sectionId)) return;

        // the section must belong to a course owned by this instructor (checked BEFORE uploading)
        if (!(await findOwnedCourse({ courseContent: sectionId }, req.user.id, res))) return;

        // reject non-video files before spending time on an upload
        validateFile(video, "video");

        // upload file/video to cloudinary
        const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME, null, null, "video");

        // crate a sub-section
        const subSectionDetails = await SubSection.create({
            title: title,
            description: description,
            timeDuration: timeDuration,
            videoUrl: uploadDetails.secure_url
        });

        // update section with sub-section ObjectID
        const updatedSection = await Section.findByIdAndUpdate(sectionId,
            {
                $push: {
                    subSection: subSectionDetails._id
                }
            },
            { returnDocument: 'after' }
        ).populate("subSection");
        // TODO: log updated section here, after adding populate query

        // return response
        return res.status(200).json({
            success: true,
            message: "Sub-Section created successfully",
            updatedSection
        });
    }
    catch (error) {
        console.error("SubSection creation error:", error.message);
        return res.status(error.status === 400 ? 400 : 500).json({
            success: false,
            message: error.status === 400 ? error.message : "Failed to create sub-section."
        });
    }
}


// updateSubSection
exports.updateSubSection = async (req, res) => {
    try {

        // fetch data
        const {
            subSectionId,
            title,
            description,
            timeDuration
        } = req.body;

        const video = req.files?.videoFile;

        // validation
        if (!subSectionId) {
            return res.status(400).json({
                success: false,
                message: "SubSection ID is required."
            });
        }

        if (!validIds(res, subSectionId)) return;

        // subsection -> its section -> its course, which this instructor must own
        const parentSection = await Section.findOne({ subSection: subSectionId }).select("_id");
        if (!parentSection) {
            return res.status(404).json({
                success: false,
                message: "SubSection not found."
            });
        }
        if (!(await findOwnedCourse({ courseContent: parentSection._id }, req.user.id, res))) return;

        // get existing subsection
        const subSection =
            await SubSection.findById(subSectionId);

        if (!subSection) {
            return res.status(404).json({
                success: false,
                message: "SubSection not found."
            });
        }

        // update only provided fields
        if (title)
            subSection.title = title;

        if (description)
            subSection.description = description;

        if (timeDuration)
            subSection.timeDuration = timeDuration;

        // upload new video if exists
        let oldVideoUrl = null;
        if (video) {
            const uploadDetails = await uploadImageToCloudinary(
                video, process.env.FOLDER_NAME, null, null, "video"
            );
            oldVideoUrl = subSection.videoUrl;
            subSection.videoUrl = uploadDetails.secure_url;
        }

        await subSection.save();

        // remove the replaced video only after the new one is saved
        if (oldVideoUrl) await deleteFromCloudinary(oldVideoUrl);

        return res.status(200).json({
            success: true,
            message:
                "SubSection updated successfully.",
            data: subSection
        });

    }
    catch (error) {
        console.error("updateSubSection error:", error.message);
        return res.status(error.status === 400 ? 400 : 500).json({
            success: false,
            message: error.status === 400 ? error.message : "Failed to update sub-section."
        });
    }
};



// deleteSubSection
exports.deleteSubSection = async (req, res) => {
    try {

        // fetch data
        const {
            sectionId,
            subSectionId
        } = req.body;

        // validation
        if (
            !sectionId ||
            !subSectionId
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Missing properties."
            });
        }

        if (!validIds(res, sectionId, subSectionId)) return;

        // the subsection must really be in this section, and the section in a course this instructor owns
        const parentSection = await Section.findOne({ _id: sectionId, subSection: subSectionId }).select("_id");
        if (!parentSection) {
            return res.status(404).json({
                success: false,
                message: "SubSection not found in this section."
            });
        }
        if (!(await findOwnedCourse({ courseContent: sectionId }, req.user.id, res))) return;

        // remove subsection id
        // from section
        await Section.findByIdAndUpdate(
            sectionId,
            {
                $pull: {
                    subSection:
                        subSectionId
                }
            },
            { returnDocument: 'after' }
        );

        // delete subsection
        const deletedSubSection =
            await SubSection.findByIdAndDelete(
                subSectionId
            );

        if (!deletedSubSection) {
            return res.status(404).json({
                success: false,
                message:
                    "SubSection not found."
            });
        }

        await deleteFromCloudinary(deletedSubSection.videoUrl);

        return res.status(200).json({
            success: true,
            message:
                "SubSection deleted successfully."
        });

    }
    catch (error) {
        console.error("deleteSubSection error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to delete sub-section."
        });
    }
};