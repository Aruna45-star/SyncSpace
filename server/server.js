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
        origin:
            process.env.CLIENT_URL ||
            "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
    },
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
// Supports:
// "1787000000000"
// and
// { roomId, userId }
// =====================================

function normalizeJoinPayload(payload) {
    if (typeof payload === "string") {
        return {
            roomId: payload,
            userId: null,
        };
    }

    if (
        payload &&
        typeof payload === "object"
    ) {
        return {
            roomId: payload.roomId || "",
            userId: payload.userId || null,
        };
    }

    return {
        roomId: "",
        userId: null,
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
            code: "",
        };
    }

    return {
        roomId: payload.roomId || "",
        userId: payload.userId || null,
        code:
            typeof payload.code === "string"
                ? payload.code
                : "",
    };
}

// =====================================
// CHECK USER MEMBERSHIP
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
                    userId,
                } =
                    normalizeJoinPayload(
                        payload
                    );

                if (!roomId) {
                    console.log(
                        "JOIN REJECTED: Room ID is required"
                    );

                    return;
                }

                // ---------------------------------
                // STORE USER ID ON SOCKET
                // ---------------------------------

                if (userId) {
                    socket.userId =
                        String(userId);
                }

                // ---------------------------------
                // LEAVE PREVIOUS ROOM
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
                // FIND ROOM
                // ---------------------------------

                let room =
                    await Room.findOne({
                        roomId,
                    });

                // ---------------------------------
                // CREATE ROOM IF MISSING
                // ---------------------------------

                if (!room) {
                    room =
                        await Room.create({
                            roomId,

                            roomName:
                                "Untitled Room",

                            users: [],

                            code: "",

                            memberCodes: {},
                        });

                    console.log(
                        `Room created in MongoDB: ${roomId}`
                    );
                }

                // ---------------------------------
                // MAKE SURE MEMBER CODES EXISTS
                // ---------------------------------

                if (!room.memberCodes) {
                    room.memberCodes =
                        new Map();

                    await room.save();
                }

                // ---------------------------------
                // VERIFY ROOM MEMBERSHIP
                // ---------------------------------

                if (userId) {
                    const memberId =
                        String(userId);

                    const isMember =
                        roomHasUser(
                            room,
                            memberId
                        );

                    if (!isMember) {
                        console.log(
                            `JOIN REJECTED: User ${memberId} is not a member of room ${roomId}`
                        );

                        socket.emit(
                            "room-error",
                            {
                                message:
                                    "You are not a member of this room.",
                            }
                        );

                        return;
                    }
                }

                // ---------------------------------
                // JOIN SOCKET.IO ROOM
                // ---------------------------------

                socket.join(
                    roomId
                );

                socket.roomId =
                    roomId;

                console.log(
                    `${socket.id} joined room ${roomId}`
                );

                // ---------------------------------
                // SEND ONLY THIS USER'S CODE
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
                                existingCode,
                        }
                    );

                    console.log(
                        `Personal code sent to ${memberId} for room ${roomId}`
                    );
                }

                // ---------------------------------
                // ONLINE USERS
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
                    socket.roomId = null;
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
    // WITH BASIC SECURITY
    // =====================================

    socket.on(
        "code-change",
        async (payload) => {
            try {
                const {
                    roomId,
                    userId,
                    code,
                } =
                    normalizeCodePayload(
                        payload
                    );

                // ---------------------------------
                // ROOM ID REQUIRED
                // ---------------------------------

                if (!roomId) {
                    console.log(
                        "CODE CHANGE REJECTED: Room ID is required"
                    );

                    return;
                }

                // ---------------------------------
                // ACTUAL SOCKET USER
                // ---------------------------------

                const socketUserId =
                    socket.userId
                        ? String(
                              socket.userId
                          )
                        : "";

                // ---------------------------------
                // USER FROM FRONTEND
                // ---------------------------------

                const requestedUserId =
                    userId
                        ? String(userId)
                        : "";

                // ---------------------------------
                // USER ID VALIDATION
                // ---------------------------------

                if (!socketUserId) {
                    console.log(
                        `CODE CHANGE REJECTED: Socket user not identified for ${socket.id}`
                    );

                    return;
                }

                if (!requestedUserId) {
                    console.log(
                        `CODE CHANGE REJECTED: User ID missing for room ${roomId}`
                    );

                    return;
                }

                // ---------------------------------
                // ONLY OWN WORKSPACE CAN BE EDITED
                // ---------------------------------

                if (
                    requestedUserId !==
                    socketUserId
                ) {
                    console.log(
                        `CODE CHANGE REJECTED: User ${socketUserId} attempted to modify workspace ${requestedUserId}`
                    );

                    socket.emit(
                        "code-change-rejected",
                        {
                            message:
                                "You can edit only your own workspace.",
                        }
                    );

                    return;
                }

                // ---------------------------------
                // SOCKET MUST BE IN THIS ROOM
                // ---------------------------------

                if (
                    socket.roomId !==
                    roomId
                ) {
                    console.log(
                        `CODE CHANGE REJECTED: Socket ${socket.id} is not in room ${roomId}`
                    );

                    socket.emit(
                        "code-change-rejected",
                        {
                            message:
                                "You are not connected to this room.",
                        }
                    );

                    return;
                }

                // ---------------------------------
                // FIND ROOM
                // ---------------------------------

                const room =
                    await Room.findOne({
                        roomId,
                    });

                if (!room) {
                    console.log(
                        `CODE CHANGE REJECTED: Room not found ${roomId}`
                    );

                    return;
                }

                // ---------------------------------
                // VERIFY ROOM MEMBERSHIP
                // ---------------------------------

                if (
                    !roomHasUser(
                        room,
                        socketUserId
                    )
                ) {
                    console.log(
                        `CODE CHANGE REJECTED: User ${socketUserId} is not a member of room ${roomId}`
                    );

                    socket.emit(
                        "code-change-rejected",
                        {
                            message:
                                "You are not a member of this room.",
                        }
                    );

                    return;
                }

                // ---------------------------------
                // MAKE SURE MEMBER CODES EXISTS
                // ---------------------------------

                if (!room.memberCodes) {
                    room.memberCodes =
                        new Map();
                }

                // ---------------------------------
                // NORMALIZE CODE
                // ---------------------------------

                const safeCode =
                    typeof code === "string"
                        ? code
                        : "";

                // ---------------------------------
                // SAVE ONLY CURRENT USER CODE
                // ---------------------------------

                room.memberCodes.set(
                    socketUserId,
                    safeCode
                );

                // ---------------------------------
                // DO NOT UPDATE room.code
                // ---------------------------------
                //
                // memberCodes is now the source
                // of truth for individual workspaces.
                //
                // room.code remains only for old
                // database compatibility.
                // ---------------------------------

                await room.save();

                console.log(
                    `Code saved for user ${socketUserId} in room ${roomId}`
                );

                // ---------------------------------
                // BROADCAST ONLY THAT USER'S UPDATE
                // ---------------------------------

                socket
                    .to(roomId)
                    .emit(
                        "member-code-update",
                        {
                            userId:
                                socketUserId,

                            code:
                                safeCode,
                        }
                    );

                console.log(
                    `Member code update broadcast for user ${socketUserId}`
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
            userId,
        } = {}) => {
            try {
                if (
                    !roomId ||
                    !userId
                ) {
                    return;
                }

                // ---------------------------------
                // SOCKET ROOM CHECK
                // ---------------------------------

                if (
                    socket.roomId !==
                    roomId
                ) {
                    return;
                }

                // ---------------------------------
                // SOCKET USER CHECK
                // ---------------------------------

                if (
                    socket.userId &&
                    String(
                        socket.userId
                    ) !==
                        String(
                            userId
                        )
                ) {
                    return;
                }

                const room =
                    await Room.findOne({
                        roomId,
                    });

                if (!room) {
                    return;
                }

                // ---------------------------------
                // ROOM MEMBERSHIP CHECK
                // ---------------------------------

                if (
                    !roomHasUser(
                        room,
                        userId
                    )
                ) {
                    return;
                }

                const memberId =
                    String(
                        userId
                    );

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
                            personalCode,
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
            roomId,
        } = {}) => {
            try {
                if (!roomId) {
                    return;
                }

                // ---------------------------------
                // SOCKET MUST BE IN ROOM
                // ---------------------------------

                if (
                    socket.roomId !==
                    roomId
                ) {
                    console.log(
                        `GET MEMBER CODES REJECTED: Socket ${socket.id} is not in room ${roomId}`
                    );

                    return;
                }

                // ---------------------------------
                // FIND ROOM
                // ---------------------------------

                const room =
                    await Room.findOne({
                        roomId,
                    });

                if (!room) {
                    return;
                }

                // ---------------------------------
                // USER MEMBERSHIP CHECK
                // ---------------------------------

                if (
                    socket.userId &&
                    !roomHasUser(
                        room,
                        socket.userId
                    )
                ) {
                    console.log(
                        `GET MEMBER CODES REJECTED: User ${socket.userId} is not a member`
                    );

                    return;
                }

                // ---------------------------------
                // BUILD MEMBER CODE OBJECT
                // ---------------------------------

                const memberCodes = {};

                if (
                    room.memberCodes
                ) {
                    for (
                        const [
                            memberUserId,
                            memberCode,
                        ] of room.memberCodes.entries()
                    ) {
                        memberCodes[
                            String(
                                memberUserId
                            )
                        ] =
                            memberCode || "";
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
            update,
        } = {}) => {
            try {
                if (!roomId) {
                    return;
                }

                // Only allow updates from
                // a socket currently in the room.
                if (
                    socket.roomId !==
                    roomId
                ) {
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