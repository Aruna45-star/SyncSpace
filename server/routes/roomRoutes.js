const express = require("express");
const router = express.Router();

const { createRoom } = require("../controllers/roomController");


router.post("/create", createRoom);


router.get("/", (req, res) => {
    res.json({
        message: "Room API Working"
    });
});


module.exports = router;