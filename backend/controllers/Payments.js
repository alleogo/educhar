const { instance } = require("../config/razorpay");
const User = require("../models/User");
const Course = require("../models/Course");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const crypto = require("crypto");
const { mongo, default: mongoose } = require("mongoose");

// capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
    // get courseId and userId
    const { courseId } = req.body;
    const userId = req.user.id;
    // validation
    if (!courseId) {
        return res.status(400).json({
            success: false,
            message: "Please provide valid course id."
        });
    }
    // valid course details
    let course;
    try {
        course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: "Couldn't find the course."
            });
        }
        // user already paid for the course
        // const uid = new mongoose.Types.ObjectId(userId);
        // if (course.enrolledStudents.includes(uid)) {

        // fix bug: convert to strings for checking inclusion
        if (course.enrolledStudents.some(id => id.toString() === userId.toString())) {    // understand it a bit
            return res.status(200).json({
                success: false,
                message: "Student already enrolled in this course."
            });
        }
    }
    catch (error) {
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
        amount: amount * 100,
        currency,
        //receipt: Math.random(Date.now().toString()),
        receipt: `receipt_${Date.now()}`,   // without .toString(), it failed while POSTMAN testing
        notes: {
            courseId: courseId,
            // userId
            userId: userId
        }
    }
    try {
        // initiate the payment using razorpay
        const paymentResponse = await instance.orders.create(options);
        // return response
        return res.status(200).json({
            success: true,
            courseName: course.courseName,
            courseDescription: course.courseDescription,
            thumbnail: course.thumbnail,
            orderId: paymentResponse.id,
            currency: paymentResponse.currency,
            amount: paymentResponse.amount,
            key: process.env.RAZORPAY_KEY || "rzp_test_dummykey"
        });
    }
    catch (error) {
        console.error("Razorpay Error:", error);
        return res.status(500).json({
            success: false,
            message: "Could not initiate order.",
            error: error.message
        });
    }
}

// verifyPayment - For Frontend Synchronous Callback
exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId || !userId) {
        return res.status(400).json({ success: false, message: "Payment details missing" });
    }

    try {
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            // Enroll student
            await enrollStudent(courseId, userId, res);
            return res.status(200).json({ success: true, message: "Payment verified and student enrolled" });
        }
        return res.status(400).json({ success: false, message: "Payment failed" });
    } catch (error) {
        console.error("Verification Error:", error);
        return res.status(500).json({ success: false, message: "Could not verify payment." });
    }
}

// verifySignature - For Razorpay Webhook Handler
exports.verifySignature = async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!webhookSecret) {
        console.error("RAZORPAY_WEBHOOK_SECRET missing in environment variables");
        return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (signature === digest) {
        console.log("Payment is authorized.");

        // Safe extraction
        const paymentPayload = req.body?.payload?.payment?.entity;
        if (!paymentPayload) {
            return res.status(400).json({ success: false, message: "Invalid payload structure" });
        }

        const { courseId, userId } = paymentPayload.notes;

        if (!courseId || !userId) {
            return res.status(400).json({ success: false, message: "Missing course or user info in notes" });
        }

        try {
            await enrollStudent(courseId, userId, res);
            return res.status(200).json({
                success: true,
                message: "Signature verified and course added."
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
    else {
        return res.status(400).json({
            success: false,
            message: "Invalid request! Signature mismatch!"
        });
    }
}

// Helper function to handle the actual database enrollment logic
const enrollStudent = async (courseId, userId, res) => {
    if (!courseId || !userId) {
        throw new Error("Missing course or user id");
    }

    // find course and enroll student in it
    const enrolledCourse = await Course.findByIdAndUpdate(courseId,
        { $push: { enrolledStudents: userId } },
        { new: true }
    );
    if (!enrolledCourse) {
        throw new Error("Course not found");
    }

    // find the student and add course in list of enrolled course
    const enrolledStudent = await User.findByIdAndUpdate(userId,
        { $push: { courses: courseId } },
        { new: true }
    );

    if (!enrolledStudent) {
        throw new Error("Student not found");
    }

    // send confirmation mail using the proper HTML template
    await mailSender(
        enrolledStudent.email,
        "Course Enrollment Successful - EduChar",
        courseEnrollmentEmail(enrolledCourse.courseName, enrolledStudent.firstName)
    );
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