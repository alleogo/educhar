const {instance} = require("../config/razorpay");
const User = require("../models/User");
const Course = require("../models/Course");
const mailSender = require("../utils/mailSender");
const courseEnrollmentEmail = require("../mail/templates/courseEnrollmentEmail");
const { mongo, default: mongoose } = require("mongoose");
const { default: webhooks } = require("razorpay/dist/types/webhooks");

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
    const currency = "INT";

    const options = {
        amount: amount*100,
        currency,
        receipt: Math.random(Date.now().toString),
        notes:{
            courseId: courseId,
            userId
        } 
    }
    try{
        // inititate the payment using razorpay
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
        console.log(error);
        res.json({
            success: false,
            message: "Could not initiate order."
        }); 
    }

}

// verifySignature
exports.verifySignature = async (req, res) => {
    const webhookSecret = "12345678";
    const signature = req.headers["x-razorpay-signature"];v
    
    crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if(signature == digest){
        console.log("Payment is authorized.");

        const {courseId, userId} = req.body.payload.payment.entity.notes; 

        try{
            // fulfil the action
            // find course and enroll student in it
            const enrolledCourse = await Course.findByIdAndUpdate({_id: courseId},
                                                                  {$push:{enrolledStudents: userId}},
                                                                  {new: true}
            );
            if(!enrolledCourse){
                return res.status(500).json({
                    success: false,
                    message: "Course no found."
                });
            }
            console.log(enrolledCourse);

            // find the student and add course in list of enrolled course
            const enrolledStudent = await User.findByIdAndUpdate({_id: userId},
                                                                 {$push:{courses: courseId}},
                                                                 {new: true}
            );
            console.log(enrolledStudent);

            //send confirmation mail
            const emailResponse = await mailSender(
                                                   enrolledStudent.email,
                                                   "Congraturations from StudyNotion!",
                                                   "You're onboarded into new StudyNotino Course!!"
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
            message: "Invalid request!"
        });
    }
}