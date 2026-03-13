const express = require("express");
const router = express.Router();
const {updateProfile, deleteAccount, getAllUserDetails} = require("../controllers/Profile");
const {auth, isStudent} = require("../middlewares/auth");

router.put("/updateprofile", auth, updateProfile);
router.delete("/deleteaccount", auth, deleteAccount);
router.get("/getuserdetails", auth, getAllUserDetails);

module.exports = router;