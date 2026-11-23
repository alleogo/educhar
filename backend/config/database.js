const mongoose = require('mongoose');
require('dotenv').config();

exports.connect = () => {
    mongoose.connect(process.env.MONGODB_URL, {
    //     useNewUrlParser: true,  // not used nowadays
    //     useUnifiedTopology: true    // not used nowadays
    })
    .then( () => console.log("DB connected successfully!"))
    .catch((error) => {
        console.log("DB connection failed.");
        console.error(error);
        // Don't kill the serverless runtime; only exit when running as a standalone server
        if (!process.env.VERCEL) process.exit(1)
    })
};