const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const userRoutes = require("./routes/userRoutes");
const roomRoutes = require("./routes/roomRoutes");

app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/", (req, res) => {
    res.send("SyncSpace Server Running");
});

module.exports = app;