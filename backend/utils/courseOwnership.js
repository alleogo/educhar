const mongoose = require("mongoose");
const Course = require("../models/Course");

/**
 * Finds the course matching `filter` and checks that `userId` is its instructor.
 * Sends the error response itself and returns null when the check fails, so callers can do:
 *
 *     if (!(await findOwnedCourse({ _id: courseId }, req.user.id, res))) return;
 *
 * Runs BEFORE any write or upload, so a non-owner can't modify data or burn Cloudinary storage.
 */
async function findOwnedCourse(filter, userId, res) {
    const course = await Course.findOne(filter).select("instructor courseContent");
    if (!course) {
        res.status(404).json({ success: false, message: "Course not found." });
        return null;
    }
    if (String(course.instructor) !== String(userId)) {
        res.status(403).json({ success: false, message: "You can only modify your own courses." });
        return null;
    }
    return course;
}

/** Sends a 400 and returns false if any of the given values isn't a valid ObjectId. */
function validIds(res, ...ids) {
    if (ids.every(id => mongoose.isValidObjectId(id))) return true;
    res.status(400).json({ success: false, message: "Invalid ID." });
    return false;
}

module.exports = { findOwnedCourse, validIds };
