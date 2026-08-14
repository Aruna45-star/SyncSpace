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
    socket.on("join-room", async (roomId) => {

        try {

            // ---------------------------------
            // Leave previous room if necessary
            // ---------------------------------
            if (
                socket.roomId &&
                socket.roomId !== roomId
            ) {

                const oldRoomId =
                    socket.roomId;

                socket.leave(oldRoomId);

                const oldRoomSize =
                    io.sockets.adapter.rooms.get(
                        oldRoomId
                    )?.size || 0;

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

                room = await Room.create({
                    roomId,
                    roomName: "Untitled Room",
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
            // Send existing code from MongoDB
            // ---------------------------------
            socket.emit(
                "room-code",
                room.code || ""
            );

            console.log(
                `Existing code sent for room ${roomId}`
            );

            // ---------------------------------
            // Update online users
            // ---------------------------------
            const roomSize =
                io.sockets.adapter.rooms.get(
                    roomId
                )?.size || 0;

            io.to(roomId).emit(
                "room-users",
                roomSize
            );

        } catch (error) {

            console.error(
                "JOIN ROOM ERROR:",
                error
            );
        }
    });


    // =====================================
    // LEAVE ROOM
    // =====================================
    socket.on(
        "leave-room",
        async (roomId) => {

            try {

                socket.leave(roomId);

                console.log(
                    `${socket.id} left room ${roomId}`
                );

                if (
                    socket.roomId === roomId
                ) {
                    socket.roomId = null;
                }

                // Get remaining users
                const roomSize =
                    io.sockets.adapter.rooms.get(
                        roomId
                    )?.size || 0;

                // Update remaining users
                io.to(roomId).emit(
                    "room-users",
                    roomSize
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

                console.log(
                    `Code updated in room ${roomId}`
                );

                // ---------------------------------
                // SAVE CODE TO MONGODB
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
                        code
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

            console.log(
                `Yjs update received from ${socket.id} in room ${roomId}`
            );

            // Send Yjs update to other users
            socket
                .to(roomId)
                .emit(
                    "yjs-update",
                    update
                );
        }
    );


    // =====================================
    // DISCONNECT
    // =====================================
    socket.on(
        "disconnect",
        () => {

            console.log(
                "User disconnected:",
                socket.id
            );

            const roomId =
                socket.roomId;

            if (roomId) {

                const roomSize =
                    io.sockets.adapter.rooms.get(
                        roomId
                    )?.size || 0;

                io.to(roomId).emit(
                    "room-users",
                    roomSize
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