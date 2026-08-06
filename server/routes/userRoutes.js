const express = require("express");
const router = express.Router();

const { registerUser, loginUser } = require("../controllers/userController");


// Register User API
router.post("/register", registerUser);


// Login User API
router.post("/login", loginUser);


// Test User API
router.get("/", (req, res) => {
    res.json({
        message: "User API Working"
    });
});


module.exports = router;