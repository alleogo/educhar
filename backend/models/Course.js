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
    enrolledStudents:[
        {
            type: mongoose.Schema.ObjectId,
            required: true,
            ref: "User"
        }
    ]
});
module.exports = mongoose.model("Course", courseSchema);