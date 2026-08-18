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
// HELPER
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
// NORMALIZE JOIN PAYLOAD
// =====================================

function normalizeJoinPayload(payload) {
    if (typeof payload === "string") {
        return {
            roomId: payload,
            userId: null
        };
    }

    if (
        payload &&
        typeof payload === "object"
    ) {
        return {
            roomId: payload.roomId || "",
            userId: payload.userId || null
        };
    }

    return {
        roomId: "",
        userId: null
    };
}

// =====================================
// NORMALIZE CODE PAYLOAD
// =====================================

function normalizeCodePayload(payload) {
    if (
        !payload ||
        typeof payload !== "object"
    ) {
        return {
            roomId: "",
            userId: null,
            code: ""
        };
    }

    return {
        roomId: payload.roomId || "",
        userId: payload.userId || null,
        code:
            typeof payload.code === "string"
                ? payload.code
                : ""
    };
}

// =====================================
// CHECK WHETHER USER BELONGS TO ROOM
// =====================================

function roomHasUser(room, userId) {
    if (!room || !userId) {
        return false;
    }

    return room.users.some(
        (user) =>
            String(user) ===
            String(userId)
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
        async (payload) => {
            try {
                const {
                    roomId,
                    userId
                } = normalizeJoinPayload(
                    payload
                );

                if (!roomId) {
                    console.log(
                        "Room ID is required"
                    );
                    return;
                }

                // ---------------------------------
                // Store user ID on socket
                // ---------------------------------

                if (userId) {
                    socket.userId =
                        String(userId);
                }

                // ---------------------------------
                // Leave old room if necessary
                // ---------------------------------

                if (
                    socket.roomId &&
                    socket.roomId !== roomId
                ) {
                    const oldRoomId =
                        socket.roomId;

                    socket.leave(
                        oldRoomId
                    );

                    socket.roomId = null;

                    await new Promise(
                        (resolve) =>
                            setImmediate(
                                resolve
                            )
                    );

                    const oldRoomSize =
                        getRoomSize(
                            oldRoomId
                        );

                    io.to(
                        oldRoomId
                    ).emit(
                        "room-users",
                        oldRoomSize
                    );

                    console.log(
                        `${socket.id} left old room ${oldRoomId}`
                    );
                }

                // ---------------------------------
                // Find room
                // ---------------------------------

                let room =
                    await Room.findOne({
                        roomId
                    });

                // ---------------------------------
                // Create room if missing
                // ---------------------------------

                if (!room) {
                    room =
                        await Room.create({
                            roomId,

                            roomName:
                                "Untitled Room",

                            users: [],

                            // Kept only for
                            // backward DB compatibility.
                            code: "",

                            memberCodes: {}
                        });

                    console.log(
                        `Room created in MongoDB: ${roomId}`
                    );
                }

                // ---------------------------------
                // Make sure memberCodes exists
                // ---------------------------------

                if (!room.memberCodes) {
                    room.memberCodes =
                        new Map();

                    await room.save();
                }

                // ---------------------------------
                // Join socket room
                // ---------------------------------

                socket.join(roomId);

                socket.roomId =
                    roomId;

                console.log(
                    `${socket.id} joined room ${roomId}`
                );

                // ---------------------------------
                // SEND ONLY THIS USER'S CODE
                //
                // IMPORTANT:
                // Never fall back to room.code.
                // Every member gets their own code.
                // ---------------------------------

                if (userId) {
                    const memberId =
                        String(userId);

                    const existingCode =
                        room.memberCodes.get(
                            memberId
                        ) || "";

                    socket.emit(
                        "member-code",
                        {
                            userId:
                                memberId,

                            code:
                                existingCode
                        }
                    );

                    console.log(
                        `Personal code sent to ${memberId} for room ${roomId}`
                    );
                }

                // ---------------------------------
                // Current online users
                // ---------------------------------

                const roomSize =
                    getRoomSize(
                        roomId
                    );

                io.to(
                    roomId
                ).emit(
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
                if (!roomId) {
                    return;
                }

                socket.leave(
                    roomId
                );

                console.log(
                    `${socket.id} left room ${roomId}`
                );

                if (
                    socket.roomId ===
                    roomId
                ) {
                    socket.roomId =
                        null;
                }

                await new Promise(
                    (resolve) =>
                        setImmediate(
                            resolve
                        )
                );

                const roomSize =
                    getRoomSize(
                        roomId
                    );

                io.to(
                    roomId
                ).emit(
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
    // INDIVIDUAL MEMBER WORKSPACE
    // =====================================

    socket.on(
        "code-change",
        async (payload) => {
            try {
                const {
                    roomId,
                    userId,
                    code
                } = normalizeCodePayload(
                    payload
                );

                if (!roomId) {
                    return;
                }

                // ---------------------------------
                // Resolve actual user
                // ---------------------------------

                const resolvedUserId =
                    userId ||
                    socket.userId ||
                    null;

                if (!resolvedUserId) {
                    console.log(
                        "CODE CHANGE ERROR: User ID is required"
                    );
                    return;
                }

                // ---------------------------------
                // Find room
                // ---------------------------------

                const room =
                    await Room.findOne({
                        roomId
                    });

                if (!room) {
                    console.log(
                        `Room not found in MongoDB: ${roomId}`
                    );
                    return;
                }

                // ---------------------------------
                // Security / membership check
                // ---------------------------------

                if (
                    !roomHasUser(
                        room,
                        resolvedUserId
                    )
                ) {
                    console.log(
                        `User ${resolvedUserId} is not a member of room ${roomId}`
                    );

                    return;
                }

                // ---------------------------------
                // Make sure memberCodes exists
                // ---------------------------------

                if (!room.memberCodes) {
                    room.memberCodes =
                        new Map();
                }

                // ---------------------------------
                // SAVE ONLY THIS USER'S CODE
                // ---------------------------------

                room.memberCodes.set(
                    String(
                        resolvedUserId
                    ),
                    code
                );

                /*
                    IMPORTANT:

                    Do NOT update room.code here.

                    room.code is the old shared-code
                    field. The new system uses only
                    memberCodes.
                */

                await room.save();

                console.log(
                    `Code saved for user ${resolvedUserId} in room ${roomId}`
                );

                // ---------------------------------
                // SEND ONLY MEMBER-SPECIFIC UPDATE
                // ---------------------------------

                socket
                    .to(roomId)
                    .emit(
                        "member-code-update",
                        {
                            userId:
                                String(
                                    resolvedUserId
                                ),

                            code
                        }
                    );

                console.log(
                    `Member code update broadcast for user ${resolvedUserId}`
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
    // GET ONE MEMBER CODE
    // =====================================

    socket.on(
        "get-member-code",
        async ({
            roomId,
            userId
        } = {}) => {
            try {
                if (
                    !roomId ||
                    !userId
                ) {
                    return;
                }

                const room =
                    await Room.findOne({
                        roomId
                    });

                if (!room) {
                    return;
                }

                const memberId =
                    String(userId);

                const personalCode =
                    room.memberCodes?.get(
                        memberId
                    ) || "";

                socket.emit(
                    "member-code",
                    {
                        userId:
                            memberId,

                        code:
                            personalCode
                    }
                );
            } catch (error) {
                console.error(
                    "GET MEMBER CODE ERROR:",
                    error
                );
            }
        }
    );

    // =====================================
    // GET ALL MEMBER CODES
    // =====================================

    socket.on(
        "get-room-member-codes",
        async ({
            roomId
        } = {}) => {
            try {
                if (!roomId) {
                    return;
                }

                const room =
                    await Room.findOne({
                        roomId
                    });

                if (!room) {
                    return;
                }

                const memberCodes = {};

                if (
                    room.memberCodes
                ) {
                    for (
                        const [
                            userId,
                            code
                        ] of room.memberCodes.entries()
                    ) {
                        memberCodes[
                            String(
                                userId
                            )
                        ] = code || "";
                    }
                }

                socket.emit(
                    "room-member-codes",
                    memberCodes
                );

                console.log(
                    `Sent all member codes for room ${roomId}`
                );
            } catch (error) {
                console.error(
                    "GET ROOM MEMBER CODES ERROR:",
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
        ({
            roomId,
            update
        } = {}) => {
            try {
                if (!roomId) {
                    return;
                }

                console.log(
                    `Yjs update received from ${socket.id} in room ${roomId}`
                );

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

                await new Promise(
                    (resolve) =>
                        setImmediate(
                            resolve
                        )
                );

                const roomSize =
                    getRoomSize(
                        roomId
                    );

                console.log(
                    `Remaining users after disconnect in ${roomId}: ${roomSize}`
                );

                io.to(
                    roomId
                ).emit(
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