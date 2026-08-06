const express = require("express");
const router = express.Router();

router.get("/", (req,res)=>{
    res.json({
        message:"Room API Working"
    });
});

module.exports = router;