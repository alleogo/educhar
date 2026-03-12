const RatingAndReview = require("../models/RatingAndReview");
const User = require("../models/User");
const Course = require("../models/Course");

// createRating
exports.createRating = async (req, res) => {
    try{
        // get data
        const userId = req.user.id;

        // fetch data from req.body
        const {rating, review, courseId} = req.body;

        // check if user is enrolled or not
        const courseDetails = await Course.findOne(
                                                   {_id: courseId,
                                                    enrolledStudents: {$elemMathc: {$eq: userId}}
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
        if(!alreadyReviewed){
            return res.status(403).json({
                success: false,
                message: "Course is already reviewed by the user."
            });
        }

        // create rating and review  
        const ratingReview = await RatingAndReview.create({rating, review,
                                                          course: courseId,
                                                          user: userId});

        // update course with rating review
        const updatedCourseDetails = await Course.findByIdAndUpdate({_id: courseId},
                                       {
                                        $push:{
                                            ratingAndReviews: ratingReview
                                        }
                                       },
                                       {new: true} );
        console.log(updatedCourseDetails); 

        // return response
        return res.status(200).json({
            succcess: true,
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
        const courseId = req.body.courseId;

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

// getRatingAndReviews