const express = require("express");
const router = express.Router();

const { 
    createRoom,
    getAllRooms,
    getRoomById,
    joinRoom,
    updateRoomCode,
    deleteRoom,
    leaveRoom
} = require("../controllers/roomController");


// Create Room
router.post("/create", createRoom);


// Get All Rooms
router.get("/", getAllRooms);


// Get Single Room
router.get("/:roomId", getRoomById);


// Join Room
router.post("/:roomId/join", joinRoom);


// Update Room Code
router.put("/:roomId/code", updateRoomCode);


// Delete Room
router.delete("/:roomId", deleteRoom);


// Leave Room
router.delete("/:roomId/leave", leaveRoom);


module.exports = router;