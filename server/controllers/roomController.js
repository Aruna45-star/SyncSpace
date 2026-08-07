const Room = require("../models/Room");

// Create Room
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
        console.error("CREATE ROOM ERROR:", error);

        res.status(500).json({
            message: error.message
        });
    }
};


// Get All Rooms
const getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find();

        res.status(200).json({
            message: "Rooms fetched successfully",
            count: rooms.length,
            rooms
        });

    } catch (error) {
        console.error("GET ALL ROOMS ERROR:", error);

        res.status(500).json({
            message: error.message
        });
    }
};


// Get Single Room
const getRoomById = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        res.status(200).json({
            message: "Room fetched successfully",
            room
        });

    } catch (error) {
        console.error("GET ROOM ERROR:", error);

        res.status(500).json({
            message: error.message
        });
    }
};


// Join Room
const joinRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId } = req.body;

        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        if (!userId) {
            return res.status(400).json({
                message: "UserId is required"
            });
        }

        if (!room.users.some(user => user.toString() === userId)) {
            room.users.push(userId);
            await room.save();
        }

        res.status(200).json({
            message: "Joined room successfully",
            room
        });

    } catch (error) {
        console.error("JOIN ROOM ERROR:", error);

        res.status(500).json({
            message: error.message
        });
    }
};


// Update Room Code
const updateRoomCode = async (req, res) => {
    try {
        console.log("UPDATE BODY RECEIVED:", req.body);
        console.log("ROOM ID:", req.params.roomId);

        const { roomId } = req.params;
        const { code } = req.body;

        if (code === undefined) {
            return res.status(400).json({
                message: "Code is required",
                receivedBody: req.body
            });
        }

        const room = await Room.findOneAndUpdate(
            { roomId },
            { code },
            { new: true }
        );

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        res.status(200).json({
            message: "Room code updated successfully",
            room
        });

    } catch (error) {
        console.error("UPDATE CODE ERROR:", error);

        res.status(500).json({
            message: error.message
        });
    }
};

// Delete Room
const deleteRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findOneAndDelete({ roomId });

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        res.status(200).json({
            message: "Room deleted successfully"
        });

    } catch (error) {
        console.error("DELETE ROOM ERROR:", error);

        res.status(500).json({
            message: error.message
        });
    }
};
// Leave Room
const leaveRoom = async (req, res) => {
    try {
        console.log("LEAVE BODY:", req.body);
        console.log("LEAVE ROOM ID:", req.params.roomId);

        const { roomId } = req.params;
        const { userId } = req.body || {};

        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        if (!userId) {
            return res.status(400).json({
                message: "UserId is required",
                receivedBody: req.body
            });
        }

        room.users = room.users.filter(
    user => user && user.toString() !== userId
);

        await room.save();

        res.status(200).json({
            message: "Left room successfully",
            room
        });

    } catch (error) {
        console.error("LEAVE ROOM ERROR:", error);

        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    createRoom,
    getAllRooms,
    getRoomById,
    joinRoom,
    updateRoomCode,
    deleteRoom,
    leaveRoom
};