require("dotenv").config();
global.crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const { connect } = require("./config/database");

// Behind Vercel's proxy: trust the first hop so req.ip / rate limiting see the real client IP
app.set("trust proxy", 1);
app.disable("x-powered-by");

// CORS allowlist. In production the frontend and API share one origin (educhar.vercel.app),
// so browsers don't even send CORS checks for normal use; this only blocks other sites.
// FRONTEND_URL may hold several comma-separated origins.
const allowedOrigins = (process.env.FRONTEND_URL || "")
    .split(",").map(o => o.trim().replace(/\/+$/, "")).filter(Boolean);
if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push("http://localhost:3000", "http://localhost:5173");
}

// middleware
app.use(cors({
    origin: (origin, callback) => {
        // No Origin header: same-origin requests, server-to-server calls (Razorpay webhook), curl
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        // Unknown origin: respond without CORS headers so the browser blocks it (not a 500)
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
// Razorpay webhook signatures are computed over the exact raw bytes, so this route must get
// the unparsed Buffer. Registered BEFORE express.json(), which then skips the already-read body.
app.use("/api/v1/payment/verifysignature", express.raw({ type: "application/json", limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    // Hard cap on any single upload; per-type limits are enforced in utils/cloudinaryUploader.js
    limits: { fileSize: 100 * 1024 * 1024 },
    abortOnLimit: true,
    responseOnLimit: JSON.stringify({ success: false, message: "File too large (max 100 MB)." }),
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

// On Vercel the app is exported as a serverless handler (see /api/index.js)
if (require.main === module) {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;