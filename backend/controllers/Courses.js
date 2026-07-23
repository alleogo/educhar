const Course = require("../models/Course");
const User = require("../models/User");
const Category = require("../models/Category");
const cloudinary = require("cloudinary").v2;
const uploadImageToCloudinary = require("../utils/cloudinaryUploader");
require('dotenv').config();

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

        // check for instructor
        const userId = req.user.id;
        const instructorDetails = await User.findById(userId);
        //***   instructor ki userId vs objectId: isko dekhna hai ***

        console.log("Instructor details: ", instructorDetails);

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
            300,  // height
            80    // quality
        );



        // create an entry for new course
        const newCourse = await Course.create({
            courseName, courseDescription,
            instructor: instructorDetails._id,
            whatYouWillLearn: whatYouWillLearn,  // or simply whatYouWillLearn, 
            price,
            category: categoryDetails._id,                 //category: category
            thumbnail: thumbnailImage.secure_url,

            instructions: parsedInstructions
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
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to create course",
            error: error.message
        });
    }
}

// getAllCourses handler function
exports.showAllCourses = async (req, res) => {
    try {
        const allCourses = await Course.find({})
            .populate("instructor")
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
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch course data.",
            error: error.message
        });
    }
}

// getCourseDetails
exports.getCourseDetails = async (req, res) => {
    try {
        // get id
        const courseId = req.body?.courseId || req.query?.courseId;

        // find course details
        const courseDetails = await Course.findById(courseId)
            .populate({
                path: "instructor",
                populate: {
                    path: "additionalDetails"
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
                message: `Could not find a course with course id: ${courseId}`
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

        // return response
        return res.status(200).json({
            success: true,
            message: "Course details fetched successfully!",
            data: courseObj
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// updateCourse
exports.updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { courseName, courseDescription, whatYouWillLearn, price, category, instructions } = req.body;

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
        if (price !== undefined) course.price = price;

        // Update Category if changed
        if (category !== undefined && category !== course.category.toString()) {
            // Remove from old category
            await Category.findByIdAndUpdate(course.category, { $pull: { course: courseId } });
            course.category = category;
            // Add to new category
            await Category.findByIdAndUpdate(category, { $push: { course: courseId } });
        }

        // Upload new thumbnail if provided
        if (req.files?.thumbnail) {
            const thumbnailImage = await uploadImageToCloudinary(
                req.files.thumbnail,
                process.env.FOLDER_NAME,
                300,
                80
            );
            course.thumbnail = thumbnailImage.secure_url;
        }

        await course.save();

        return res.status(200).json({
            success: true,
            message: "Course updated successfully",
            data: course
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update course",
            error: error.message
        });
    }
}

// deleteCourse
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");

exports.deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

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

        // Unenroll all enrolled students
        const enrolledStudents = course.enrolledStudents || [];
        for (const studentId of enrolledStudents) {
            await User.findByIdAndUpdate(studentId, {
                $pull: { courses: courseId }
            });
        }

        // Delete all subsections and sections belonging to this course
        const sections = course.courseContent || [];
        for (const sectionId of sections) {
            const section = await Section.findById(sectionId);
            if (section) {
                // Delete all subsections in this section
                if (section.subSection && section.subSection.length > 0) {
                    await SubSection.deleteMany({ _id: { $in: section.subSection } });
                }
                await Section.findByIdAndDelete(sectionId);
            }
        }

        // Remove course from its category
        if (course.category) {
            await Category.findByIdAndUpdate(course.category, {
                $pull: { course: courseId }
            });
        }

        // Remove course from instructor's courses list
        await User.findByIdAndUpdate(course.instructor, {
            $pull: { courses: courseId }
        });

        // Finally, delete the course itself
        await Course.findByIdAndDelete(courseId);

        return res.status(200).json({
            success: true,
            message: "Course deleted successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}