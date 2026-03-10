const Course = require("../models/Course");
const User = require("../models/User");
const Category = require("../models/Category");
const cloudinary = require("cloudinary").v2;
const uploadImageToCloudinary = require("../utils/cloudinaryUploader");
require('dotenv').config();

// createCourse handler function
exports.createCourse = async (req, res) => {
    try{
        // fetch data
        const {courseName, courseDescription, whatYouWillLearn, price, category} = req.body;

        // get thumbnail
        const thumbnail = req.body.thumbnail;

        // validation
        if(!courseName || !courseDescription || !whatYouWillLearn || !price || !category || !thumbnail){
            return res.status(400).json({
                success: false,
                message: "Fill all required fields."
            });
        }

        // check for instructor
        const userId = req.user.id;
        const instructorDetails = await User.findById(useId);
        //***   instructor ki userId vs objectId: isko dekhna hai ***
        // TODO: verify that userID and instructorDetails._id are same or different 
        console.log("Instructor details: ", instructorDetails);

        if(!instructorDetails){
            return res.status(404).json({
                success: false,
                message: "Instuctor details not found."
            });
        }
        // check category validity
        const categoryDetails = await Category.findById(category); // category from req.body is a reference id
        if(!categoryDetails){
            return res.statu(404).json({
                success: false,
                message: "Category details not found"
            });
        }

        // Upload image to cloudinary
        const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

        // create an entry for new course
        const newCourse = await Course.create({
            courseName, courseDescription,
            instructor: instructorDetails._id,
            whatYouWillLearn: whatYouWillLearn,  // or simply whatYouWillLearn, 
            price, 
            category: categoryDetails._id,                 //category: category
            thumbnail: thumbnailImage.secure_url
        });

        // add new course to user schema of instructor
        await User.findByIdAndUpdate({_id: instructorDetails._id},
            {
                $push: {
                    courses: newCourse._id
                }
            },
            {new: true}
        );  

        // update Category schema
        await Category.findByIdAndUpdate({_id: category},
            {
                $push: {
                    course: newCourse._id
                }
            },
            {new: true}
        );

        // return response
        return res.status(200).json({
            success: true,
            message: "Course created successfully!",
            data: newCourse
        }); 
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to create course",
            error: error.message
        }); 
    }
}

// getAllCourses handler function
const showAllCourses = async (req, res) => {
    try{
        // TODO: change below line incrementally
        const allCourses = await Course.find({}, )  // {courseName:true,price:true,thumbnail:true,instructor:true,ratingAndReviews:true,enrolledStudents:true} .populate("instructor").exec(); -> isse kya hota hai? 
        return res.status(200).json({
            success: true,
            message: "Data for all courses fetched successfully!",
            data: allCourses
        });
    }
    catch(error){
        console.log(error);
        return res.statu(500).json({
            success: false,
            message: "Failed to fetch course data.",
            error: error.message
        });
    }
}

// getCourseDetails
exports.getCourseDetails = async (req, res) => {
    try{
        // get id
        const {courseId} = req.body;

        // find course details
        const courseDetails = await Course.findById(courseId)
                                                .populate({
                                                    path:"instructor",
                                                    populate:{
                                                        path: "additionalDetails"
                                                    }
                                                })
                                                .populate("category")
                                                .populate("ratingAndReviews")
                                                .populate({
                                                    path: "courseContent",
                                                    populate:{
                                                        path:"subSection"
                                                    }
                                                })
                                                .exec();
                                                
        // validation
        if(!courseDetails){
            return res.status(404).json({
                success: false,
                message: `Could not find a course with course id: ${courseId}`
            });
        }

        // return response
        return res.status(200).json({
            success: true,
            messasge: "Course detials fetched successfully!",
            data: courseDetails
        }); 
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message: error.message
        });
    }
}