const Course = require("../models/Course");
const User = require("../models/User");
const Category = require("../models/Category");
const cloudinary = require("cloudinary").v2;
const uploadImageToCloudinary = require("../utils/cloudinaryUploader");
const { validateFile, deleteFromCloudinary } = require("../utils/cloudinaryUploader");
const mongoose = require("mongoose");
const { removeCourseCompletely } = require("../utils/courseCleanup");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const CourseProgress = require("../models/CourseProgress");
const RatingAndReview = require("../models/RatingAndReview");
const jwt = require("jsonwebtoken");
require('dotenv').config();

// Fields of an instructor that are safe to expose on public endpoints
const PUBLIC_USER_FIELDS = "firstName lastName image accountType";

// Razorpay's minimum order is ₹1 (100 paise), so a course must cost at least ₹1 to be purchasable
function parsePrice(price) {
    const value = Number(price);
    return Number.isFinite(value) && value >= 1 ? value : null;
}

// Optional authentication for public routes: identifies the caller if they sent a valid
// token, but never rejects the request. Header first, then cookie (same order of trust
// as an explicit login on this device).
function getOptionalUser(req) {
    const header = req.header("Authorization");
    const token = (header?.startsWith("Bearer ") ? header.slice(7) : null) || req.cookies?.token;
    if (!token) return null;
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;   // invalid/expired token -> treat as anonymous
    }
}

// createCourse handler function
exports.createCourse = async (req, res) => {
    try {
        // fetch data
        const { courseName, courseDescription, whatYouWillLearn, price, category } = req.body;

        // get thumbnail from file
        const thumbnail = req.files?.thumbnail;

        // validation
        if (!courseName || !courseDescription || !whatYouWillLearn || !price || !category || !thumbnail) {
            return res.status(400).json({
                success: false,
                message: "Fill all required fields."
            });
        }

        const numericPrice = parsePrice(price);
        if (numericPrice === null) {
            return res.status(400).json({ success: false, message: "Price must be at least ₹1." });
        }
        if (!mongoose.isValidObjectId(category)) {
            return res.status(400).json({ success: false, message: "Invalid category." });
        }
        // reject non-image thumbnails before doing any work
        validateFile(thumbnail, "image");

        // check for instructor
        const userId = req.user.id;
        const instructorDetails = await User.findById(userId);
        //***   instructor ki userId vs objectId: isko dekhna hai ***

        if (!instructorDetails) {
            return res.status(404).json({
                success: false,
                message: "Instructor details not found."
            });
        }

        // check category validity
        const categoryDetails = await Category.findById(category); // category from req.body is a reference id
        if (!categoryDetails) {
            return res.status(404).json({
                success: false,
                message: "Category details not found"
            });
        }

        // upload image to cloudinary
        const thumbnailImage = await uploadImageToCloudinary(
            thumbnail,
            process.env.FOLDER_NAME,
            null, null, "image"
        );



        // create an entry for new course
        const newCourse = await Course.create({
            courseName, courseDescription,
            instructor: instructorDetails._id,
            whatYouWillLearn: whatYouWillLearn,  // or simply whatYouWillLearn, 
            price: numericPrice,
            category: categoryDetails._id,                 //category: category
            thumbnail: thumbnailImage.secure_url,
        });

        // add new course to instructor's courses
        await User.findByIdAndUpdate(
            { _id: instructorDetails._id },
            { $push: { courses: newCourse._id } },
            { new: true }
        );

        // update Category
        await Category.findByIdAndUpdate(
            { _id: category },
            { $push: { course: newCourse._id } },
            { new: true }
        );

        // return response
        return res.status(200).json({
            success: true,
            message: "Course created successfully!",
            data: newCourse
        });
    }
    catch (error) {
        console.error("createCourse error:", error.message);
        return res.status(error.status === 400 ? 400 : 500).json({
            success: false,
            message: error.status === 400 ? error.message : "Failed to create course"
        });
    }
}

// getAllCourses handler function
exports.showAllCourses = async (req, res) => {
    try {
        const allCourses = await Course.find({})
            .populate("instructor", PUBLIC_USER_FIELDS)
            .populate("ratingAndReviews")
            .exec();

        // Compute averageRating and ratingCount for each course
        const coursesWithRatings = allCourses.map(course => {
            const courseObj = course.toObject();
            const reviews = courseObj.ratingAndReviews || [];
            if (reviews.length > 0) {
                const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
                courseObj.averageRating = parseFloat((sum / reviews.length).toFixed(1));
            } else {
                courseObj.averageRating = 0;
            }
            courseObj.ratingCount = reviews.length;
            return courseObj;
        });

        return res.status(200).json({
            success: true,
            message: "Data for all courses fetched successfully!",
            data: coursesWithRatings
        });
    }
    catch (error) {
        console.error("showAllCourses error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch course data."
        });
    }
}

// getCourseDetails
exports.getCourseDetails = async (req, res) => {
    try {
        // get id
        const courseId = req.body?.courseId || req.query?.courseId;
        if (!mongoose.isValidObjectId(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid course id." });
        }

        // find course details
        const courseDetails = await Course.findById(courseId)
            .populate({
                path: "instructor",
                select: `${PUBLIC_USER_FIELDS} additionalDetails`,   // needed for the nested "about" populate
                populate: {
                    path: "additionalDetails",
                    select: "about"
                }
            })
            .populate("category")
            .populate({
                path: "ratingAndReviews",
                populate: {
                    path: "user",
                    select: "firstName lastName image"
                }
            })
            .populate({
                path: "courseContent",
                populate: {
                    path: "subSection"
                }
            })
            .exec();

        // validation
        if (!courseDetails) {
            return res.status(404).json({
                success: false,
                message: "Course not found."
            });
        }

        // Compute average rating
        const courseObj = courseDetails.toObject();
        const reviews = courseObj.ratingAndReviews || [];
        if (reviews.length > 0) {
            const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
            courseObj.averageRating = parseFloat((sum / reviews.length).toFixed(1));
        } else {
            courseObj.averageRating = 0;
        }
        courseObj.ratingCount = reviews.length;

        // Paid content: lesson video URLs are only sent to the course's instructor
        // and to enrolled students. Everyone else still sees the syllabus (titles, durations).
        const caller = getOptionalUser(req);
        const callerId = caller?.id ? String(caller.id) : null;
        const isOwner = !!callerId && String(courseObj.instructor?._id) === callerId;
        const isEnrolled = !!callerId && (courseObj.enrolledStudents || []).some(id => String(id) === callerId);

        if (!isOwner && !isEnrolled) {
            courseObj.courseContent = (courseObj.courseContent || []).map(section => ({
                ...section,
                subSection: (section.subSection || []).map(({ videoUrl, ...lesson }) => lesson)
            }));
        }

        // Publish a count, not the list of student IDs
        courseObj.enrolledCount = (courseObj.enrolledStudents || []).length;
        delete courseObj.enrolledStudents;
        courseObj.isEnrolled = isEnrolled;
        courseObj.canAccessContent = isOwner || isEnrolled;

        // return response
        return res.status(200).json({
            success: true,
            message: "Course details fetched successfully!",
            data: courseObj
        });
    }
    catch (error) {
        console.error("getCourseDetails error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not load course details."
        });
    }
}

// updateCourse
exports.updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { courseName, courseDescription, whatYouWillLearn, price, category } = req.body;

        if (!mongoose.isValidObjectId(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid course id." });
        }
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        // Check if user is the instructor
        const userId = req.user.id;
        if (course.instructor.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Unauthorized to update this course" });
        }

        // Update fields if provided
        if (courseName !== undefined) course.courseName = courseName;
        if (courseDescription !== undefined) course.courseDescription = courseDescription;
        if (whatYouWillLearn !== undefined) course.whatYouWillLearn = whatYouWillLearn;
        if (price !== undefined) {
            const numericPrice = parsePrice(price);
            if (numericPrice === null) {
                return res.status(400).json({ success: false, message: "Price must be at least ₹1." });
            }
            course.price = numericPrice;
        }

        // Update Category if changed (and only to a category that exists)
        if (category !== undefined && category !== String(course.category)) {
            if (!mongoose.isValidObjectId(category) || !(await Category.exists({ _id: category }))) {
                return res.status(400).json({ success: false, message: "Invalid category." });
            }
            // Remove from old category
            await Category.findByIdAndUpdate(course.category, { $pull: { course: courseId } });
            course.category = category;
            // Add to new category
            await Category.findByIdAndUpdate(category, { $addToSet: { course: courseId } });
        }

        // Upload new thumbnail if provided
        let oldThumbnail = null;
        if (req.files?.thumbnail) {
            const thumbnailImage = await uploadImageToCloudinary(
                req.files.thumbnail,
                process.env.FOLDER_NAME,
                null, null, "image"
            );
            oldThumbnail = course.thumbnail;
            course.thumbnail = thumbnailImage.secure_url;
        }

        await course.save();

        // remove the replaced thumbnail only after the new one is saved
        if (oldThumbnail) await deleteFromCloudinary(oldThumbnail);

        return res.status(200).json({
            success: true,
            message: "Course updated successfully",
            data: course
        });
    } catch (error) {
        console.error("updateCourse error:", error.message);
        return res.status(error.status === 400 ? 400 : 500).json({
            success: false,
            message: error.status === 400 ? error.message : "Failed to update course"
        });
    }
}

// deleteCourse
exports.deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!mongoose.isValidObjectId(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid course id." });
        }

        // Find the course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Course not found"
            });
        }

        // Only the course instructor (or admin) may delete
        const userId = req.user.id;
        if (course.instructor.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this course"
            });
        }

        // Remove the course and all dependent data + media (shared with account deletion)
        await removeCourseCompletely(course);

        return res.status(200).json({
            success: true,
            message: "Course deleted successfully"
        });
    } catch (error) {
        console.error("deleteCourse error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to delete course."
        });
    }
}