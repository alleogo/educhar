const Course = require("../models/Course");
const User = require("../models/User");
const Category = require("../models/Category");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const CourseProgress = require("../models/CourseProgress");
const RatingAndReview = require("../models/RatingAndReview");
const { deleteFromCloudinary } = require("./cloudinaryUploader");

/**
 * Deletes a course and everything that hangs off it: sections, lessons, progress, reviews,
 * category/instructor/student references, and its thumbnail + lesson videos on Cloudinary.
 * Used by both deleteCourse and instructor account deletion so the two can't drift apart.
 */
async function removeCourseCompletely(course) {
    const courseId = course._id;

    // Collect lesson video URLs before the documents are gone
    const sections = await Section.find({ _id: { $in: course.courseContent || [] } }).select("subSection");
    const lessonIds = sections.flatMap(s => s.subSection || []);
    const lessons = await SubSection.find({ _id: { $in: lessonIds } }).select("videoUrl");

    // Progress docs for this course, so their IDs can be removed from users too
    const progressIds = (await CourseProgress.find({ courseID: courseId }).select("_id")).map(p => p._id);

    await Promise.all([
        // unenroll students, drop dangling progress references, remove from instructor's list
        User.updateMany(
            { $or: [{ courses: courseId }, { courseProgress: { $in: progressIds } }] },
            { $pull: { courses: courseId, courseProgress: { $in: progressIds } } }
        ),
        SubSection.deleteMany({ _id: { $in: lessonIds } }),
        Section.deleteMany({ _id: { $in: course.courseContent || [] } }),
        CourseProgress.deleteMany({ courseID: courseId }),
        RatingAndReview.deleteMany({ course: courseId }),
        course.category ? Category.findByIdAndUpdate(course.category, { $pull: { course: courseId } }) : null,
    ]);

    await Course.findByIdAndDelete(courseId);

    // Media cleanup last and best-effort (never throws)
    await Promise.all([
        deleteFromCloudinary(course.thumbnail),
        ...lessons.map(l => deleteFromCloudinary(l.videoUrl)),
    ]);
}

module.exports = { removeCourseCompletely };
