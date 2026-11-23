const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;   // 15 minutes

// Only a SHA-256 hash of the reset token is stored. If the DB (or an API response)
// ever leaks, the stored value can't be used to reset anyone's password.
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// resetPasswordToken
exports.resetPasswordToken = async (req, res) => {
    try{
        const email = req.body.email?.trim().toLowerCase();
        if(!email){
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        // The link must point at the deployed frontend. Never derive it from request
        // headers (e.g. Origin/Host): an attacker could make us email a link to their own domain.
        const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, "");
        if(!frontendUrl){
            console.error("FRONTEND_URL is not configured");
            return res.status(500).json({
                success: false,
                message: "Password reset is temporarily unavailable."
            });
        }

        const user = await User.findOne({email});
        if(user){
            const token = crypto.randomBytes(32).toString("hex");
            await User.updateOne({_id: user._id}, {
                token: hashToken(token),
                resetPasswordExpires: Date.now() + RESET_TOKEN_TTL_MS
            });

            const url = `${frontendUrl}/reset-password/${token}`;
            await mailSender(email,
                            "Reset Password Link",
                            `<p>We received a request to reset your EduChar password.</p>
                             <p><a href="${url}">Reset your password</a> (valid for 15 minutes)</p>
                             <p>If you didn't request this, you can ignore this email.</p>`);
        }

        // Same response whether or not the email is registered, so this endpoint
        // can't be used to discover who has an account
        return res.status(200).json({
            success: true,
            message: "If that email is registered, a reset link has been sent."
        });
    }
    catch(error){
        console.error("resetPasswordToken error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not send reset email. Please try again."
        });
    }
}

// resetPassword
exports.resetPassword = async (req, res) => {
    try{
        const {password, confirmPassword, token} = req.body;

        if(!password || !confirmPassword || !token){
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }
        if(password !== confirmPassword){
            return res.status(400).json({
                success: false,
                message: "Passwords don't match"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Atomic single-use: matches only an unexpired token and clears it in the same write.
        // $unset is required: Mongoose silently drops `field: undefined` from updates,
        // which previously left the token valid after use.
        const user = await User.findOneAndUpdate(
            { token: hashToken(String(token)), resetPasswordExpires: { $gt: Date.now() } },
            { $set: { password: hashedPassword }, $unset: { token: 1, resetPasswordExpires: 1 } }
        );

        if(!user){
            return res.status(400).json({
                success: false,
                message: "Reset link is invalid or has expired."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Password reset successful"
        });
    }
    catch(error){
        console.error("resetPassword error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not reset password. Please try again."
        });
    }
}
