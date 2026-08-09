require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");

connectDB();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Socket connection
io.on("connection", (socket) => {

    console.log(
        "User connected:",
        socket.id
    );


    // =========================
    // JOIN ROOM
    // =========================
    socket.on("join-room", (roomId) => {

        socket.join(roomId);

        // Remember current room
        socket.roomId = roomId;

        console.log(
            `${socket.id} joined room ${roomId}`
        );

        // Get current room user count
        const roomSize =
            io.sockets.adapter.rooms.get(roomId)?.size || 0;

        // Send count to everyone in room
        io.to(roomId).emit(
            "room-users",
            roomSize
        );

    });


    // =========================
    // LEAVE ROOM
    // =========================
    socket.on("leave-room", (roomId) => {

        socket.leave(roomId);

        console.log(
            `${socket.id} left room ${roomId}`
        );

        // If this was the current room,
        // clear stored room ID
        if (socket.roomId === roomId) {
            socket.roomId = null;
        }

        // Get remaining users in old room
        const roomSize =
            io.sockets.adapter.rooms.get(roomId)?.size || 0;

        // Update remaining users
        io.to(roomId).emit(
            "room-users",
            roomSize
        );

    });


    // =========================
    // CODE CHANGE
    // =========================
    socket.on(
        "code-change",
        ({ roomId, code }) => {

            socket
                .to(roomId)
                .emit(
                    "code-update",
                    code
                );

        }
    );


    // =========================
    // YJS UPDATE
    // =========================
    socket.on(
        "yjs-update",
        ({ roomId, update }) => {

            console.log(
                `Yjs update received from ${socket.id} in room ${roomId}`
            );

            socket
                .to(roomId)
                .emit(
                    "yjs-update",
                    update
                );

        }
    );


    // =========================
    // DISCONNECT
    // =========================
    socket.on("disconnect", () => {

        console.log(
            "User disconnected:",
            socket.id
        );

        const roomId = socket.roomId;

        if (roomId) {

            const roomSize =
                io.sockets.adapter.rooms.get(roomId)?.size || 0;

            io.to(roomId).emit(
                "room-users",
                roomSize
            );

        }

    });

});


// =========================
// START SERVER
// =========================
server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});