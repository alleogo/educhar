const RatingAndReview = require("../models/RatingAndReview");
const User = require("../models/User");
const Course = require("../models/Course");
const mongoose = require("mongoose");

// createRating
exports.createRating = async (req, res) => {
    try{
        // get data
        const userId = req.user.id;

        // fetch data from req.body
        const {rating, review, courseId} = req.body;

        // Validate input: an out-of-range rating used to be stored and then crashed the
        // course page for every visitor ('☆'.repeat(negative) throws a RangeError)
        const numericRating = Number(rating);
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ success: false, message: "Rating must be a whole number from 1 to 5." });
        }
        if (typeof review !== "string" || !review.trim() || review.length > 2000) {
            return res.status(400).json({ success: false, message: "Please write a review (up to 2000 characters)." });
        }
        if (!mongoose.isValidObjectId(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid course id." });
        }

        // check if user is enrolled or not
        const courseDetails = await Course.findOne( // {$elemMatch: {$eq: userId}}
                                                   {_id: courseId,
                                                    enrolledStudents: userId
                                                   }
                                                  );
        
        if(!courseDetails){
            return res.status(404).json({
                success: false,
                message: "Student is not enrolled in the course."
            }); 
        }

        // check if user already reviewed
        const alreadyReviewed = await RatingAndReview.findOne({user:userId, course:courseId});
        if(alreadyReviewed){
            return res.status(403).json({
                success: false,
                message: "Course is already reviewed by the user."
            });
        }

        // create rating and review  
        const ratingReviewId = await RatingAndReview.create({rating: numericRating, review: review.trim(),
                                                          course: courseId,
                                                          user: userId});

        // update course with rating review
        const updatedCourseDetails = await Course.findByIdAndUpdate(courseId,
                                       {
                                        $push:{
                                            ratingAndReviews: ratingReviewId
                                        }
                                       },
                                       {new: true} );

        // return response
        return res.status(200).json({
            success: true,
            message: "Rating and Review added successfully!"
        });
    }
    catch(error){
        console.error("rating error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
}

// getAverageRating
exports.getAverageRating = async (req, res) => {
    try{
        // get courseId 
        const courseId = req.body?.courseId || req.query?.courseId;

        if (!mongoose.isValidObjectId(courseId)) {
            return res.status(400).json({ success: false, message: "Invalid course id." });
        }

        // calculate avg rating
        const result = await RatingAndReview.aggregate([
            {
                $match:{
                    course: new mongoose.Types.ObjectId(courseId),
                },
            },
            {
                $group:{
                    _id:null,
                    averageRating: { $avg: "$rating"}
                }
            }
        ])

        // return response
        if(result.length > 0){
            return res.status(200).json({
                success: true,
                averageRating: result[0].averageRating
            }); 
        }

        // if no review/rating exists (not an error: the average is simply 0)
        return res.status(200).json({
            success: true,
            message: "Average rating is 0, no ratings given till now.",
            averageRating: 0
        }); 
    }
    catch(error){
        console.error("rating error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        }); 
    }
}

// getAllRatingAndReviews
exports.getAllRatingAndReviews = async (req, res) => {
    try{
        const allReviews = await RatingAndReview.find({})
                                .sort({rating: "desc"})
                                .populate({
                                    path:"user",
                                    select: "firstName lastName image"
                                })
                                .populate({
                                    path: "course",
                                    select: "courseName"
                                })
                                .exec();
        
        return res.status(200).json({
            success: true,
            message: "All reviews and ratings fetched successfully.",
            data: allReviews
        });
    }
    catch(error){
        console.error("rating error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        }); 
    }
}

// deleteRating
exports.deleteRating = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;
        if (!mongoose.isValidObjectId(reviewId)) {
            return res.status(400).json({ success: false, message: "Invalid review id." });
        }

        // Find the review
        const review = await RatingAndReview.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found."
            });
        }

        // Ensure the user owns this review
        if (review.user.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "You can only delete your own reviews."
            });
        }

        // Remove review reference from the course
        await Course.findByIdAndUpdate(review.course, {
            $pull: { ratingAndReviews: reviewId }
        });

        // Delete the review
        await RatingAndReview.findByIdAndDelete(reviewId);

        return res.status(200).json({
            success: true,
            message: "Review deleted successfully."
        });
    } catch (error) {
        console.error("rating error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
}