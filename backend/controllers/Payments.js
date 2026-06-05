const {instance} = require("../config/razorpay");
const User = require("../models/User");
const Course = require("../models/Course");
const mailSender = require("../utils/mailSender");
const courseEnrollmentEmail = require("../mail/templates/courseEnrollmentEmail");
const crypto = require("crypto");
const {mongo, default: mongoose} = require("mongoose");


// capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
    // get courseId and userId
    const {courseId} = req.body;
    const userId = req.user.id;
    // validation
    // valid courseId
    if(!courseId){
        return res.json({
            success: false,
            message: "Please provide valid course id."
        });
    }
    // valid course details
    let course;
    try{
        course = await Course.findById(courseId);
        if(!course){
            return res.json({
                success: false,
                message: "Couldn't find the course."
            });
        }
        // user already paid for the course
        const uid = new mongoose.Types.ObjectId(userId);
        if(course.enrolledStudents.includes(uid)){
            return res.status(200).json({
                success: false,
                message: "Student already enrolled in this course."
            }); 
        }
    }
    catch(error){
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        }); 
    }
    
    // order create 
    const amount = course.price;
    const currency = "INR";

    const options = {
        amount: amount*100,
        currency,
        //receipt: Math.random(Date.now().toString()),
        receipt: `receipt_${Date.now()}`,
        notes:{
            courseId: courseId,
            userId
        } 
    }
    try{
        // initiate the payment using razorpay
        const paymentResponse = await instance.orders.create(options);
        console.log(paymentResponse);
        // return response
        return res.status(200).json({
            success: true,
            courseName: course.courseName,
            courseDescription: course.courseDescription,
            thumbnail: course.thumbnail,
            orderId: paymentResponse.id,
            currency: paymentResponse.currency,
            amount: paymentResponse.amount
        }); 
    }
    catch(error){
        console.log("Razorpay Error:", error);
        return res.status(500).json({
            success: false,
            message: "Could not initiate order.",
            error: error.message
        }); 
    }

}

// verifySignature  - webhook handler
exports.verifySignature = async (req, res) => {
    const webhookSecret = "12345678";
    const signature = req.headers["x-razorpay-signature"];
    
    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if(signature === digest){
        console.log("Payment is authorized.");

        const {courseId, userId} = req.body.payload.payment.entity.notes; 

        try{
            // Add error handling for missing notes
            // const {courseId, userId} = req.body.payload.payment.entity.notes;
            
            // if(!courseId || !userId){
            //     return res.status(400).json({
            //         success: false,
            //         message: "Missing course or user information."
            //     });
            // }

            // fulfil the action
            // find course and enroll student in it
            const enrolledCourse = await Course.findByIdAndUpdate({_id: courseId},
                                                                  {$push:{enrolledStudents: userId}},
                                                                  {new: true}
            );
            if(!enrolledCourse){
                return res.status(500).json({
                    success: false,
                    message: "Course not found."
                });
            }
            console.log(enrolledCourse);

            // find the student and add course in list of enrolled course
            const enrolledStudent = await User.findByIdAndUpdate({_id: userId},
                                                                 {$push:{courses: courseId}},
                                                                 {new: true}
            );

            if(!enrolledStudent){
                return res.status(500).json({
                    success: false,
                    message: "Student not found."
                });
            }
            console.log(enrolledStudent);

            //send confirmation mail
            const emailResponse = await mailSender(
                                                   enrolledStudent.email,
                                                   "Congratulations from EduChar!",
                                                   "You're onboarded into new EduChar Course!!"
            );

            console.log(emailResponse);
            return res.status(200).json({
                success: true,
                message: "Signature verified and course added."
            });
        }   
        catch(error){
            console.log(error);
            return res.status(500).json({
                success: false,
                message: error.message
            }); 
        }
    }
    else{
        return res.status(400).json({
            success: false,
            message: "Invalid request! Signature mismatch!"
        });
    }
}

// enrollCourse - Manual enrollment (for testing without payment)
exports.enrollCourse = async (req, res) => {
    try {
        const {courseId} = req.body;
        const userId = req.user.id;

        // Validation
        if(!courseId){
            return res.status(400).json({
                success: false,
                message: "Please provide a valid course ID."
            });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if(!course){
            return res.status(404).json({
                success: false,
                message: "Course not found."
            });
        }

        // Check if already enrolled
        const uid = new mongoose.Types.ObjectId(userId);
        if(course.enrolledStudents.includes(uid)){
            return res.status(400).json({
                success: false,
                message: "Student already enrolled in this course."
            });
        }

        // Enroll student in course
        const updatedCourse = await Course.findByIdAndUpdate(
            {_id: courseId},
            {$push: {enrolledStudents: userId}},
            {new: true}
        );

        // Add course to student's courses array
        const updatedStudent = await User.findByIdAndUpdate(
            {_id: userId},
            {$push: {courses: courseId}},
            {new: true}
        ).populate("courses");  // Populate to show enrolled courses

        // Send enrollment confirmation email
        await mailSender(
            updatedStudent.email,
            "Successfully Enrolled in Course!",
            `You have been successfully enrolled in ${course.courseName}`
        );

        return res.status(200).json({
            success: true,
            message: "Student enrolled successfully in the course.",
            course: updatedCourse,
            enrolledCourses: updatedStudent.courses
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// getEnrolledCourses - Get all courses enrolled by student
exports.getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get student with populated courses
        const student = await User.findById(userId)
            .populate({
                path: "courses",
                select: "courseName courseDescription price thumbnail instructor"
            });

        if(!student){
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        return res.status(200).json({
            success: true,
            enrolledCourses: student.courses,
            totalCourses: student.courses.length
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}