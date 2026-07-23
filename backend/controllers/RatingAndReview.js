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

        console.log("req.user = ", req.user);
        console.log("userId = ", userId);
        console.log(typeof userId);

        // check if user is enrolled or not
        const courseDetails = await Course.findOne( // {$elemMatch: {$eq: userId}}
                                                   {_id: courseId,
                                                    enrolledStudents: userId
                                                   }
                                                  );
        
        if(!courseDetails){
            return res.status(404).json({
                success: false,
                message: "Studend is not enrolled in the course."
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
        const ratingReviewId = await RatingAndReview.create({rating, review,
                                                          course: courseId,
                                                          user: userId});

        // update course with rating review
        const updatedCourseDetails = await Course.findByIdAndUpdate({_id: courseId},
                                       {
                                        $push:{
                                            ratingAndReviews: ratingReviewId
                                        }
                                       },
                                       {new: true} );
        console.log(updatedCourseDetails); 

        // return response
        return res.status(200).json({
            success: true,
            message: "Rating and Review added successfully!"
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

// getAverageRating
exports.getAverageRating = async (req, res) => {
    try{
        // get courseId 
        const courseId = req.body?.courseId || req.query?.courseId;

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

        // if no review/rating exists
        return res.status(200).json({
            success: false,
            message: "Average rating is 0, no ratings given till now.",
            averageRating: 0
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
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        }); 
    }
}

// deleteRating
exports.deleteRating = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

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
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}