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

    console.log("User connected:", socket.id);


    // Join Room
    socket.on("join-room", (roomId) => {

        socket.join(roomId);

        // Remember which room this user joined
        socket.roomId = roomId;

        console.log(
            `${socket.id} joined room ${roomId}`
        );

        // Get number of users currently in the room
        const roomSize =
            io.sockets.adapter.rooms.get(roomId)?.size || 0;

        // Send user count to everyone in the room
        io.to(roomId).emit(
            "room-users",
            roomSize
        );

    });


    // Code Change
    socket.on("code-change", ({ roomId, code }) => {

        socket.to(roomId).emit(
            "code-update",
            code
        );

    });


    // Yjs Update
    socket.on("yjs-update", ({ roomId, update }) => {

        console.log(
            `Yjs update received from ${socket.id} in room ${roomId}`
        );

        socket.to(roomId).emit(
            "yjs-update",
            update
        );

    });


    // Disconnect
    socket.on("disconnect", () => {

        console.log(
            "User disconnected:",
            socket.id
        );

        // Get the room this user was in
        const roomId = socket.roomId;

        if (roomId) {

            // Get remaining users in the room
            const roomSize =
                io.sockets.adapter.rooms.get(roomId)?.size || 0;

            // Send updated count to remaining users
            io.to(roomId).emit(
                "room-users",
                roomSize
            );

        }

    });

});


server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});