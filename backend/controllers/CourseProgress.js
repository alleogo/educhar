const CourseProgress = require("../models/CourseProgress");
const User = require("../models/User");

exports.updateCourseProgress = async (req, res) => {
    try {
        const { courseId, subSectionId } = req.body;
        const userId = req.user.id;

        if (!courseId || !subSectionId) {
            return res.status(400).json({
                success: false,
                message: "Course ID and Subsection ID are required."
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        let progressDoc = await CourseProgress.findOne({
            courseID: courseId,
            _id: { $in: user.courseProgress || [] }
        });

        if (!progressDoc) {
            progressDoc = await CourseProgress.create({
                courseID: courseId,
                completedVideos: []
            });
            user.courseProgress.push(progressDoc._id);
            await user.save();
        }

        if (!progressDoc.completedVideos.some((id) => id.toString() === subSectionId.toString())) {
            progressDoc.completedVideos.push(subSectionId);
            await progressDoc.save();
        }

        return res.status(200).json({
            success: true,
            message: "Course progress updated successfully.",
            data: progressDoc
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.unmarkCourseProgress = async (req, res) => {
    try {
        const { courseId, subSectionId } = req.body;
        const userId = req.user.id;

        if (!courseId || !subSectionId) {
            return res.status(400).json({
                success: false,
                message: "Course ID and Subsection ID are required."
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const progressDoc = await CourseProgress.findOne({
            courseID: courseId,
            _id: { $in: user.courseProgress || [] }
        });

        if (!progressDoc) {
            return res.status(404).json({
                success: false,
                message: "Course progress not found."
            });
        }

        progressDoc.completedVideos = progressDoc.completedVideos.filter(
            (id) => id.toString() !== subSectionId.toString()
        );
        await progressDoc.save();

        return res.status(200).json({
            success: true,
            message: "Course progress removed successfully.",
            data: progressDoc
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: "Course ID is required."
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const progressDoc = await CourseProgress.findOne({
            courseID: courseId,
            _id: { $in: user.courseProgress || [] }
        });

        return res.status(200).json({
            success: true,
            data: progressDoc || { courseID: courseId, completedVideos: [] }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
