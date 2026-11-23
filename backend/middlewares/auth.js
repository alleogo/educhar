const jwt = require('jsonwebtoken');
require('dotenv').config();

// Options for the auth cookie. Used both when setting it (login) and clearing it (logout):
// clearCookie only works if path/sameSite/secure match the original cookie.
exports.authCookieOptions = () => ({
    httpOnly: true,                                    // not readable by JavaScript
    secure: process.env.NODE_ENV === "production",     // HTTPS only in production
    sameSite: "strict",                                // never sent on cross-site requests (CSRF)
    path: "/"
});

// auth
exports.auth = async (req, res, next) => {
    try{
        // Explicit Authorization header first (what the frontend sends), then the cookie.
        // Preferring the header means a stale cookie can't override the session the client chose.
        const header = req.header('Authorization') || req.header('Authorisation');
        const token = (header?.startsWith("Bearer ") ? header.slice(7) : null)
                      || req.cookies?.token
                      || req.body?.token;

        // token missing
        if(!token){
            return res.status(401).json({
                success: false,
                message: "Token is missing",
                code: "TOKEN_INVALID"
            });
        }

        // verify the token
        try{
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        }
        catch(error){
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
                code: "TOKEN_INVALID"
            });
        }
        next();
    }
    catch(error){
        console.error("auth middleware error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Token validation issue occured."
        });
    }
}

// Role checks. The caller IS authenticated but lacks permission -> 403 Forbidden (not 401).
const requireRole = (role, label) => async (req, res, next) => {
    if(req.user?.accountType !== role){
        return res.status(403).json({
            success: false,
            message: `This is a protected route for ${label} only.`
        });
    }
    next();
};

// isStudent
exports.isStudent = requireRole("Student", "Students");

// isInstructor
exports.isInstructor = requireRole("Instructor", "Instructors");

// isAdmin
exports.isAdmin = requireRole("Admin", "Admins");
