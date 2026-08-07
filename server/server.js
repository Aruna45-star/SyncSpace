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

        console.log(
            `${socket.id} joined room ${roomId}`
        );

    });


    // Code Change
    socket.on("code-change", ({ roomId, code }) => {

        socket.to(roomId).emit(
            "code-update",
            code
        );

    });


    socket.on("disconnect", () => {

        console.log(
            "User disconnected:",
            socket.id
        );

    });

});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});