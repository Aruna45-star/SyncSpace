const Room = require("../models/Room");

const createRoom = async (req, res) => {
    try {
        console.log("BODY RECEIVED:", req.body);

        const { roomName, userId } = req.body;

        const room = await Room.create({
            roomId: Date.now().toString(),
            roomName: roomName || "Untitled Room",
            createdBy: userId,
            users: userId ? [userId] : [],
            code: ""
        });

        res.status(201).json({
            message: "Room created successfully",
            room
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    createRoom
};