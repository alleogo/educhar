require("dotenv").config();
global.crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const { connect } = require("./config/database");

// middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow any localhost / 127.0.0.1 origin (any port) and requests with no origin (e.g. curl, Postman)
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked for origin: ${origin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
}));

// connect DB
connect();

// routes
app.use("/api/v1/auth", require("./routes/user"));
app.use("/api/v1/profile", require("./routes/profile"));
app.use("/api/v1/course", require("./routes/course"));
app.use("/api/v1/payment", require("./routes/payment"));

// default route
app.get("/", (req, res) => {
    res.send("<h1>EduChar API is running...</h1>");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;