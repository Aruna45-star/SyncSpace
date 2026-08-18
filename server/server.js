require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const Room = require("./models/Room");

connectDB();

const PORT = process.env.PORT || 5000;

// =====================================
// CREATE HTTP SERVER
// =====================================

const server = http.createServer(app);

// =====================================
// SOCKET.IO SETUP
// =====================================

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// =====================================
// HELPER FUNCTION
// =====================================

function getRoomSize(roomId) {
    if (!roomId) {
        return 0;
    }

    return (
        io.sockets.adapter.rooms.get(roomId)?.size || 0
    );
}

// =====================================
// SOCKET CONNECTION
// =====================================

io.on("connection", (socket) => {

    console.log(
        "User connected:",
        socket.id
    );

    // =====================================
    // JOIN ROOM
    // =====================================

    socket.on(
        "join-room",
        async (roomId) => {

            try {

                if (!roomId) {
                    console.log(
                        "Room ID is required"
                    );
                    return;
                }

                // ---------------------------------
                // Leave previous room
                // ---------------------------------

                if (
                    socket.roomId &&
                    socket.roomId !== roomId
                ) {

                    const oldRoomId =
                        socket.roomId;

                    socket.leave(oldRoomId);

                    socket.roomId = null;

                    const oldRoomSize =
                        getRoomSize(oldRoomId);

                    io.to(oldRoomId).emit(
                        "room-users",
                        oldRoomSize
                    );

                    console.log(
                        `${socket.id} left old room ${oldRoomId}`
                    );
                }

                // ---------------------------------
                // Find room in MongoDB
                // ---------------------------------

                let room =
                    await Room.findOne({
                        roomId
                    });

                // ---------------------------------
                // Create room if it doesn't exist
                // ---------------------------------

                if (!room) {

                    room =
                        await Room.create({
                            roomId,
                            roomName:
                                "Untitled Room",
                            users: [],
                            code: ""
                        });

                    console.log(
                        `Room created in MongoDB: ${roomId}`
                    );
                }

                // ---------------------------------
                // Join Socket.IO room
                // ---------------------------------

                socket.join(roomId);

                socket.roomId = roomId;

                console.log(
                    `${socket.id} joined room ${roomId}`
                );

                // ---------------------------------
                // Send existing code
                // ---------------------------------

                socket.emit(
                    "room-code",
                    room.code || ""
                );

                console.log(
                    `Existing code sent for room ${roomId}`
                );

                // ---------------------------------
                // Get current online users
                // ---------------------------------

                const roomSize =
                    getRoomSize(roomId);

                // ---------------------------------
                // Notify ALL users
                // ---------------------------------

                io.to(roomId).emit(
                    "room-users",
                    roomSize
                );

                console.log(
                    `Room ${roomId} now has ${roomSize} online users`
                );

            } catch (error) {

                console.error(
                    "JOIN ROOM ERROR:",
                    error
                );
            }
        }
    );

    // =====================================
    // LEAVE ROOM
    // =====================================

    socket.on(
        "leave-room",
        async (roomId) => {

            try {

                // ---------------------------------
                // Validate room
                // ---------------------------------

                if (!roomId) {
                    return;
                }

                // ---------------------------------
                // Leave Socket.IO room
                // ---------------------------------

                socket.leave(roomId);

                console.log(
                    `${socket.id} left room ${roomId}`
                );

                // ---------------------------------
                // Clear current room
                // ---------------------------------

                if (
                    socket.roomId === roomId
                ) {

                    socket.roomId = null;
                }

                // ---------------------------------
                // IMPORTANT:
                // Wait until Socket.IO updates
                // the room membership
                // ---------------------------------

                await new Promise(
                    (resolve) =>
                        setImmediate(resolve)
                );

                // ---------------------------------
                // Get remaining users
                // ---------------------------------

                const roomSize =
                    getRoomSize(roomId);

                console.log(
                    `Remaining users in ${roomId}: ${roomSize}`
                );

                // ---------------------------------
                // Notify remaining users
                // ---------------------------------

                io.to(roomId).emit(
                    "room-users",
                    roomSize
                );

                console.log(
                    `Updated room-users for ${roomId}: ${roomSize}`
                );

            } catch (error) {

                console.error(
                    "LEAVE ROOM ERROR:",
                    error
                );
            }
        }
    );

    // =====================================
    // CODE CHANGE
    // =====================================

    socket.on(
        "code-change",
        async ({ roomId, code }) => {

            try {

                if (!roomId) {
                    return;
                }

                console.log(
                    `Code updated in room ${roomId}`
                );

                // ---------------------------------
                // Save code to MongoDB
                // ---------------------------------

                const room =
                    await Room.findOneAndUpdate(
                        { roomId },
                        {
                            code: code || ""
                        },
                        {
                            new: true
                        }
                    );

                if (!room) {

                    console.log(
                        `Room not found in MongoDB: ${roomId}`
                    );

                    return;
                }

                console.log(
                    `Code saved to MongoDB for room ${roomId}`
                );

                // ---------------------------------
                // Send code to other users
                // ---------------------------------

                socket
                    .to(roomId)
                    .emit(
                        "code-update",
                        code || ""
                    );

            } catch (error) {

                console.error(
                    "CODE UPDATE ERROR:",
                    error
                );
            }
        }
    );

    // =====================================
    // YJS UPDATE
    // =====================================

    socket.on(
        "yjs-update",
        ({ roomId, update }) => {

            try {

                if (!roomId) {
                    return;
                }

                console.log(
                    `Yjs update received from ${socket.id} in room ${roomId}`
                );

                // Send update to other users

                socket
                    .to(roomId)
                    .emit(
                        "yjs-update",
                        update
                    );

            } catch (error) {

                console.error(
                    "YJS UPDATE ERROR:",
                    error
                );
            }
        }
    );

    // =====================================
    // DISCONNECT
    // =====================================

    socket.on(
        "disconnect",
        async () => {

            try {

                console.log(
                    "User disconnected:",
                    socket.id
                );

                const roomId =
                    socket.roomId;

                if (!roomId) {
                    return;
                }

                // ---------------------------------
                // Give Socket.IO time to update
                // room membership
                // ---------------------------------

                await new Promise(
                    (resolve) =>
                        setImmediate(resolve)
                );

                // ---------------------------------
                // Get remaining users
                // ---------------------------------

                const roomSize =
                    getRoomSize(roomId);

                console.log(
                    `Remaining users after disconnect in ${roomId}: ${roomSize}`
                );

                // ---------------------------------
                // Notify remaining users
                // ---------------------------------

                io.to(roomId).emit(
                    "room-users",
                    roomSize
                );

            } catch (error) {

                console.error(
                    "DISCONNECT ERROR:",
                    error
                );
            }
        }
    );

});

// =====================================
// START SERVER
// =====================================

server.listen(
    PORT,
    () => {

        console.log(
            `Server running on port ${PORT}`
        );
    }
);