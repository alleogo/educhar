const mongoose = require("mongoose");
const CourseProgress = require("../models/CourseProgress");
const Course = require("../models/Course");
const Section = require("../models/Section");
const User = require("../models/User");

/**
 * Shared guard for all progress endpoints. Validates IDs, requires the caller to be enrolled
 * in the course and (when a lesson is given) the lesson to belong to that course.
 * Sends the error response itself and returns null on failure.
 */
async function checkAccess(req, res, { requireSubSection }) {
    const { courseId, subSectionId } = req.body;
    const userId = req.user.id;

    if (!courseId || (requireSubSection && !subSectionId)) {
        res.status(400).json({
            success: false,
            message: requireSubSection ? "Course ID and Subsection ID are required." : "Course ID is required."
        });
        return null;
    }
    if (!mongoose.isValidObjectId(courseId) || (subSectionId && !mongoose.isValidObjectId(subSectionId))) {
        res.status(400).json({ success: false, message: "Invalid ID." });
        return null;
    }

    const course = await Course.findOne({ _id: courseId, enrolledStudents: userId }).select("courseContent");
    if (!course) {
        res.status(403).json({ success: false, message: "You are not enrolled in this course." });
        return null;
    }

    if (subSectionId) {
        const lessonInCourse = await Section.exists({ _id: { $in: course.courseContent }, subSection: subSectionId });
        if (!lessonInCourse) {
            res.status(400).json({ success: false, message: "This lesson does not belong to the course." });
            return null;
        }
    }

    const user = await User.findById(userId).select("courseProgress");
    if (!user) {
        res.status(404).json({ success: false, message: "User not found." });
        return null;
    }
    return { courseId, subSectionId, user };
}

const findProgress = (courseId, user) =>
    CourseProgress.findOne({ courseID: courseId, _id: { $in: user.courseProgress || [] } });

exports.updateCourseProgress = async (req, res) => {
    try {
        const access = await checkAccess(req, res, { requireSubSection: true });
        if (!access) return;
        const { courseId, subSectionId, user } = access;

        let progressDoc = await findProgress(courseId, user);

        if (!progressDoc) {
            progressDoc = await CourseProgress.create({
                courseID: courseId,
                completedVideos: [subSectionId]
            });
            // $addToSet (not push+save) so concurrent requests can't clobber each other's writes
            await User.updateOne({ _id: user._id }, { $addToSet: { courseProgress: progressDoc._id } });
        } else {
            progressDoc = await CourseProgress.findByIdAndUpdate(
                progressDoc._id,
                { $addToSet: { completedVideos: subSectionId } },
                { returnDocument: 'after' }
            );
        }

        return res.status(200).json({
            success: true,
            message: "Course progress updated successfully.",
            data: progressDoc
        });
    } catch (error) {
        console.error("updateCourseProgress error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not update course progress."
        });
    }
};

exports.unmarkCourseProgress = async (req, res) => {
    try {
        const access = await checkAccess(req, res, { requireSubSection: true });
        if (!access) return;
        const { courseId, subSectionId, user } = access;

        const progressDoc = await findProgress(courseId, user);
        if (!progressDoc) {
            return res.status(404).json({
                success: false,
                message: "Course progress not found."
            });
        }

        const updatedProgress = await CourseProgress.findByIdAndUpdate(
            progressDoc._id,
            { $pull: { completedVideos: subSectionId } },
            { returnDocument: 'after' }
        );

        return res.status(200).json({
            success: true,
            message: "Course progress removed successfully.",
            data: updatedProgress
        });
    } catch (error) {
        console.error("unmarkCourseProgress error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not update course progress."
        });
    }
};

exports.getCourseProgress = async (req, res) => {
    try {
        const access = await checkAccess(req, res, { requireSubSection: false });
        if (!access) return;
        const { courseId, user } = access;

        const progressDoc = await findProgress(courseId, user);

        return res.status(200).json({
            success: true,
            data: progressDoc || { courseID: courseId, completedVideos: [] }
        });
    } catch (error) {
        console.error("getCourseProgress error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not load course progress."
        });
    }
};
