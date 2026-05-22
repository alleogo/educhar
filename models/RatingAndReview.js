const mongoose = require("mongoose");

const ratingAndReviewSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: "User"
    },
    rating:{
        type: Number,
        required: true
    },
    review:{
        type: String,
        required: true,
        trim: true
    },
    course: {
        type: mongoose.Schema.ObjectId,
        ref: "Course",
        required: true
    }
});
module.exports = mongoose.model("RatingAndReview", ratingAndReviewSchema);