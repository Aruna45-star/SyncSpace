const Room = require("../models/Room");

// ================================
// CREATE ROOM
// ================================
const createRoom = async (req, res) => {
    try {
        console.log("BODY RECEIVED:", req.body);

        const { roomName, userId } = req.body;

        const room = await Room.create({
            roomId: Date.now().toString(),
            roomName: roomName?.trim() || "Untitled Room",
            createdBy: userId || null,
            users: userId ? [userId] : [],
            code: ""
        });

        // Populate users for response
        await room.populate("users", "name email");

        console.log("ROOM CREATED:", room);

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


// ================================
// GET ALL ROOMS
// ================================
const getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find()
            .populate("users", "name email")
            .populate("createdBy", "name email");

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


// ================================
// GET SINGLE ROOM
// ================================
const getRoomById = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findOne({ roomId })
            .populate("users", "name email")
            .populate("createdBy", "name email");

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        console.log("ROOM USERS:", room.users);

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


// ================================
// JOIN ROOM
// ================================
const joinRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId } = req.body;

        console.log("JOIN ROOM ID:", roomId);
        console.log("JOIN USER ID:", userId);

        if (!userId) {
            return res.status(400).json({
                message: "UserId is required"
            });
        }

        // IMPORTANT:
        // Don't populate before modifying users.
        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        // Check whether user already joined
        const alreadyJoined = room.users.some(
            (user) => user.toString() === userId.toString()
        );

        if (!alreadyJoined) {
            room.users.push(userId);

            await room.save();

            console.log(
                "User added to room:",
                userId
            );
        } else {
            console.log(
                "User already belongs to room:",
                userId
            );
        }

        // Populate ONLY after save
        await room.populate("users", "name email");
        await room.populate("createdBy", "name email");

        console.log(
            "UPDATED ROOM USERS:",
            room.users
        );

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


// ================================
// UPDATE ROOM CODE
// ================================
const updateRoomCode = async (req, res) => {
    try {
        console.log(
            "UPDATE BODY RECEIVED:",
            req.body
        );

        console.log(
            "ROOM ID:",
            req.params.roomId
        );

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
        )
            .populate("users", "name email")
            .populate("createdBy", "name email");

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
        console.error(
            "UPDATE CODE ERROR:",
            error
        );

        res.status(500).json({
            message: error.message
        });
    }
};


// ================================
// DELETE ROOM
// ================================
const deleteRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room =
            await Room.findOneAndDelete({
                roomId
            });

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        res.status(200).json({
            message: "Room deleted successfully"
        });

    } catch (error) {
        console.error(
            "DELETE ROOM ERROR:",
            error
        );

        res.status(500).json({
            message: error.message
        });
    }
};


// ================================
// LEAVE ROOM
// ================================
const leaveRoom = async (req, res) => {
    try {
        console.log(
            "LEAVE BODY:",
            req.body
        );

        console.log(
            "LEAVE ROOM ID:",
            req.params.roomId
        );

        const { roomId } = req.params;
        const { userId } = req.body || {};

        if (!userId) {
            return res.status(400).json({
                message: "UserId is required",
                receivedBody: req.body
            });
        }

        const room =
            await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        // Remove user from room
        room.users = room.users.filter(
            (user) =>
                user &&
                user.toString() !== userId.toString()
        );

        await room.save();

        // Populate response
        await room.populate(
            "users",
            "name email"
        );

        await room.populate(
            "createdBy",
            "name email"
        );

        console.log(
            "USERS AFTER LEAVE:",
            room.users
        );

        res.status(200).json({
            message: "Left room successfully",
            room
        });

    } catch (error) {
        console.error(
            "LEAVE ROOM ERROR:",
            error
        );

        res.status(500).json({
            message: error.message
        });
    }
};


// ================================
// EXPORT
// ================================
module.exports = {
    createRoom,
    getAllRooms,
    getRoomById,
    joinRoom,
    updateRoomCode,
    deleteRoom,
    leaveRoom
};