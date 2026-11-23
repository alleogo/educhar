const { instance } = require("../config/razorpay");
const User = require("../models/User");
const Course = require("../models/Course");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const crypto = require("crypto");
const mongoose = require("mongoose");

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
    if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({ success: false, message: "Invalid course id." });
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
        if (course.enrolledStudents.some(id => id.toString() === userId.toString())) {
            return res.status(409).json({
                success: false,
                message: "Student already enrolled in this course."
            });
        }
        // Razorpay's minimum order is 100 paise (₹1); a ₹0 order can never be created
        if (!(course.price >= 1)) {
            return res.status(400).json({
                success: false,
                message: "This course can't be purchased right now (invalid price)."
            });
        }
    }
    catch (error) {
        console.error("capturePayment error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not load course."
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
            message: "Could not initiate order."
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
        // 1. Signature: proves Razorpay issued this payment for this order (constant-time compare)
        const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");
        const expected = Buffer.from(expectedSignature);
        const received = Buffer.from(String(razorpay_signature));
        if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        // 2. The order must be one WE created for THIS user and THIS course.
        //    Notes are written server-side in capturePayment and can't be altered by the client,
        //    so a cheap course's payment can't be replayed against a different courseId.
        const order = await instance.orders.fetch(razorpay_order_id);
        if (String(order?.notes?.userId) !== String(userId) || String(order?.notes?.courseId) !== String(courseId)) {
            return res.status(400).json({ success: false, message: "Order does not match this user or course" });
        }

        // 3. The payment must belong to that order, have succeeded, and cover the full order amount
        const payment = await instance.payments.fetch(razorpay_payment_id);
        if (payment.order_id !== razorpay_order_id
            || !["authorized", "captured"].includes(payment.status)
            || payment.amount !== order.amount) {
            return res.status(400).json({ success: false, message: "Payment not successful" });
        }

        // Enroll using the course recorded on the order, never the client-supplied value.
        // Enrollment is idempotent ($addToSet), so replaying a valid request is harmless.
        await enrollStudent(order.notes.courseId, userId);
        return res.status(200).json({ success: true, message: "Payment verified and student enrolled" });
    } catch (error) {
        console.error("Verification Error:", error.message);
        return res.status(500).json({ success: false, message: "Could not verify payment." });
    }
}

// verifySignature - Razorpay webhook handler (server-to-server safety net:
// enrolls the student even if their browser closed before verifyPayment ran)
// NOTE: index.js mounts express.raw() for this route, so req.body is the exact raw Buffer
// Razorpay signed. Re-serialising parsed JSON would not reproduce the same bytes.
exports.verifySignature = async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!webhookSecret) {
        console.error("RAZORPAY_WEBHOOK_SECRET missing in environment variables");
        return res.status(500).json({ success: false, message: "Server configuration error" });
    }
    if (!signature || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({ success: false, message: "Invalid webhook request" });
    }

    const digest = crypto.createHmac("sha256", webhookSecret).update(req.body).digest("hex");
    const expected = Buffer.from(digest);
    const received = Buffer.from(String(signature));
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        return res.status(400).json({ success: false, message: "Invalid request! Signature mismatch!" });
    }

    let event;
    try {
        event = JSON.parse(req.body.toString("utf8"));
    } catch {
        return res.status(400).json({ success: false, message: "Invalid JSON payload" });
    }

    // Only successful-payment events may enroll. Every other event (e.g. payment.failed carries
    // the same notes!) is acknowledged with 200 so Razorpay doesn't keep retrying it.
    if (!["payment.captured", "order.paid"].includes(event.event)) {
        return res.status(200).json({ success: true, message: `Ignored event ${event.event}` });
    }

    // Prefer the order's notes (written by capturePayment); fall back to the payment's
    const notes = event.payload?.order?.entity?.notes || event.payload?.payment?.entity?.notes || {};
    const { courseId, userId } = notes;
    if (!courseId || !userId) {
        return res.status(400).json({ success: false, message: "Missing course or user info in notes" });
    }

    try {
        // Idempotent ($addToSet): duplicate/retried webhooks and the client-side
        // verifyPayment can both run for the same payment without side effects
        await enrollStudent(courseId, userId);
        return res.status(200).json({ success: true, message: "Signature verified and course added." });
    } catch (error) {
        console.error("Webhook enrollment error:", error.message);
        // 500 -> Razorpay retries later
        return res.status(500).json({ success: false, message: "Enrollment failed" });
    }
}

// Helper: the actual database enrollment.
// Both writes are idempotent ($addToSet), so if the second one fails, a retry (webhook
// redelivery or the client calling verifyPayment again) safely completes the enrollment.
// We deliberately don't use a multi-document transaction: it would require a replica set,
// which local development databases often aren't, and idempotency already makes retries safe.
const enrollStudent = async (courseId, userId) => {
    if (!courseId || !userId) {
        throw new Error("Missing course or user id");
    }

    const enrolledCourse = await Course.findByIdAndUpdate(courseId,
        { $addToSet: { enrolledStudents: userId } },
        { returnDocument: 'after' }
    );
    if (!enrolledCourse) {
        throw new Error("Course not found");
    }

    const enrolledStudent = await User.findByIdAndUpdate(userId,
        { $addToSet: { courses: courseId } },
        { returnDocument: 'after' }
    );
    if (!enrolledStudent) {
        throw new Error("Student not found");
    }

    // Email is best-effort: a paid enrollment must never fail because SMTP is down
    try {
        await mailSender(
            enrolledStudent.email,
            "Course Enrollment Successful - EduChar",
            courseEnrollmentEmail(enrolledCourse.courseName, enrolledStudent.firstName)
        );
    } catch (error) {
        console.error("Enrollment email failed:", error.message);
    }
}
