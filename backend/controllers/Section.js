const Section = require("../models/Section");
const Course = require("../models/Course");
const SubSection = require("../models/SubSection");
const { findOwnedCourse, validIds } = require("../utils/courseOwnership");
const { deleteFromCloudinary } = require("../utils/cloudinaryUploader");

// createSection handler
exports.createSection = async (req, res) => {
    try {
        // fetch data
        const { sectionName, courseId } = req.body;
        // validation
        if (!sectionName || !courseId) {
            return res.status(400).json({
                success: false,
                message: "Missing Properties"
            });
        }
        if (!validIds(res, courseId)) return;

        // only the course's instructor may add sections (also rejects non-existent courses)
        if (!(await findOwnedCourse({ _id: courseId }, req.user.id, res))) return;

        // create Section
        const newSection = await Section.create({ sectionName });

        // update Course with sectionId ObjectID
        const updatedCourseDetails = await Course.findByIdAndUpdate(courseId,
            {
                $push: {
                    courseContent: newSection._id
                }
            },
            { new: true }
        ).populate({
            path: 'courseContent',
            populate: {
                path: 'subSection'
            }
        });
        // TODO: use populate to replace sections/sub-sections both in updatedCourseDetails

        // return response
        return res.status(200).json({
            success: true,
            message: "Section created successfully.",
            updatedCourseDetails
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to create section",
        });
    }
}

// updateSection
exports.updateSection = async (req, res) => {
    try {
        // fetch data
        const { sectionName, sectionId } = req.body;

        // validation
        if (!sectionName || !sectionId) {
            return res.status(400).json({
                success: false,
                message: "Missing Properties"
            });
        }
        if (!validIds(res, sectionId)) return;

        // the section must belong to a course owned by this instructor
        if (!(await findOwnedCourse({ courseContent: sectionId }, req.user.id, res))) return;

        // update section
        const section = await Section.findByIdAndUpdate(sectionId, { sectionName }, { new: true });

        // return response
        return res.status(200).json({
            success: true,
            message: "Section details updated successfully."
        })
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update section",
        });
    }
}

// deletesection
exports.deleteSection = async (req, res) => {
    try {
        const { sectionId } = req.params;

        if (!sectionId) {
            return res.status(400).json({
                success: false,
                message: "Section ID is required.",
            });
        }

        if (!validIds(res, sectionId)) return;

        // the section must belong to a course owned by this instructor
        if (!(await findOwnedCourse({ courseContent: sectionId }, req.user.id, res))) return;

        // Find the section first
        const section = await Section.findById(sectionId);

        if (!section) {
            return res.status(404).json({
                success: false,
                message: "Section not found.",
            });
        }

        // Delete all subsections of this section (and their videos on Cloudinary)
        const lessons = await SubSection.find({ _id: { $in: section.subSection } }).select("videoUrl");
        await SubSection.deleteMany({
            _id: { $in: section.subSection },
        });
        await Promise.all(lessons.map(l => deleteFromCloudinary(l.videoUrl)));

        // Remove section reference from course
        await Course.findOneAndUpdate(
            { courseContent: sectionId },
            {
                $pull: {
                    courseContent: sectionId,
                },
            }
        );

        // Delete the section
        await Section.findByIdAndDelete(sectionId);

        return res.status(200).json({
            success: true,
            message: "Section and all its subsections deleted successfully.",
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete section",
        });
    }
};