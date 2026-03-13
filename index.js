const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const { connect } = require("./config/database");
require("dotenv").config();

// middleware
app.use(express.json());
app.use(cookieParser());

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