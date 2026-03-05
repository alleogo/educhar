const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    courseName:{
        type: String,
    },
    courseDescription:{
        type: String
    },
    instructor:{
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: "User"
    },
    whatYouWillLearn:{
        type: String
    },
    courseContent: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "Section"
        }
    ],
    ratingAndReviews:[{
        type: mongoose.Schema.ObjectId,
        ref: "RatingAndReview"
    }],
    price:{
        type: Number
    },
    thumbnail:{
        type: String
    },
    category:{
        type: mongoose.Schema.ObjectId,
        ref: "Category"
    },
    tag:{
        type: [String],
        required: true
    },  
    enrolledStudents:[
        {
            type: mongoose.Schema.ObjectId,
            required: true,
            ref: "User"
        }
    ],
    instructions: {
        type: [String]
    },
    status: {
        type: String,
        enum: ["Draft", "Published"]
    }
});
module.exports = mongoose.model("Course", courseSchema);