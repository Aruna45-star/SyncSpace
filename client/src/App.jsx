import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import socket from "./socket";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function App() {
    // =========================================
    // AUTH STATE
    // =========================================

    const [token, setToken] = useState(
        localStorage.getItem("token")
    );

    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // =========================================
    // AUTH FORM
    // =========================================

    const [isRegister, setIsRegister] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");

    // =========================================
    // APP STATE
    // =========================================

    const [connected, setConnected] = useState(false);

    const [roomId, setRoomId] = useState("");
    const [roomInput, setRoomInput] = useState("");
    const [roomName, setRoomName] = useState("");

    const [joinedRoom, setJoinedRoom] = useState(false);

    const [code, setCode] = useState("");

    const [usersOnline, setUsersOnline] = useState(0);

    const [roomMembers, setRoomMembers] = useState([]);

    const [roomError, setRoomError] = useState("");
    const [roomLoading, setRoomLoading] = useState(false);

    // =========================================
    // REFS
    // =========================================

    const roomIdRef = useRef("");
    const tokenRef = useRef(token);
    const joinedRoomRef = useRef(false);

    // =========================================
    // KEEP REFS UPDATED
    // =========================================

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    useEffect(() => {
        joinedRoomRef.current = joinedRoom;
    }, [joinedRoom]);

    // =========================================
    // AUTH CONFIG
    // =========================================

    const getAuthConfig = () => {
        return {
            headers: {
                Authorization: `Bearer ${tokenRef.current}`,
            },
        };
    };

    // =========================================
    // LOAD ROOM MEMBERS
    // =========================================

    const loadRoomMembers = async (currentRoomId) => {
        if (!currentRoomId) {
            return;
        }

        try {
            const response = await axios.get(
                `${API_URL}/rooms/${currentRoomId}`,
                getAuthConfig()
            );

            const room = response.data.room;

            const members = room?.users || [];

            const uniqueMembers = Array.from(
                new Map(
                    members.map((member) => [
                        String(member._id || member.id),
                        member,
                    ])
                ).values()
            );

            console.log(
                "ROOM MEMBERS:",
                uniqueMembers
            );

            setRoomMembers(uniqueMembers);
        } catch (error) {
            console.error(
                "LOAD ROOM MEMBERS ERROR:",
                error
            );
        }
    };

    // =========================================
    // SOCKET SETUP
    // =========================================

    useEffect(() => {
        // =====================================
        // CONNECT
        // =====================================

        const handleConnect = () => {
            console.log(
                "Socket Connected:",
                socket.id
            );

            setConnected(true);

            const currentRoom =
                roomIdRef.current;

            if (currentRoom) {
                console.log(
                    "Rejoining room after reconnect:",
                    currentRoom
                );

                socket.emit(
                    "join-room",
                    currentRoom
                );
            }
        };

        // =====================================
        // DISCONNECT
        // =====================================

        const handleDisconnect = () => {
            console.log(
                "Socket Disconnected"
            );

            setConnected(false);
        };

        // =====================================
        // ROOM USERS
        // =====================================

        const handleRoomUsers = async (count) => {
            console.log(
                "Users Online:",
                count
            );

            setUsersOnline(count);

            const currentRoom =
                roomIdRef.current;

            if (currentRoom) {
                await loadRoomMembers(
                    currentRoom
                );
            }
        };

        // =====================================
        // INITIAL ROOM CODE
        // =====================================

        const handleRoomCode = (existingCode) => {
            console.log(
                "Existing room code:",
                existingCode
            );

            // Ignore events from old room
            if (!roomIdRef.current) {
                return;
            }

            setCode(existingCode || "");
        };

        // =====================================
        // REAL-TIME CODE UPDATE
        // =====================================

        const handleCodeUpdate = (updatedCode) => {
            console.log(
                "Received code update:",
                updatedCode
            );

            if (!roomIdRef.current) {
                return;
            }

            setCode(updatedCode || "");
        };

        // =====================================
        // SOCKET LISTENERS
        // =====================================

        socket.on(
            "connect",
            handleConnect
        );

        socket.on(
            "disconnect",
            handleDisconnect
        );

        socket.on(
            "room-users",
            handleRoomUsers
        );

        socket.on(
            "room-code",
            handleRoomCode
        );

        socket.on(
            "code-update",
            handleCodeUpdate
        );

        // =====================================
        // INITIAL STATUS
        // =====================================

        if (socket.connected) {
            setConnected(true);
        }

        // =====================================
        // CLEANUP
        // =====================================

        return () => {
            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "room-users",
                handleRoomUsers
            );

            socket.off(
                "room-code",
                handleRoomCode
            );

            socket.off(
                "code-update",
                handleCodeUpdate
            );
        };
    }, []);

    // =========================================
    // REGISTER / LOGIN
    // =========================================

    const handleAuth = async (e) => {
        e.preventDefault();

        setAuthError("");
        setAuthLoading(true);

        try {
            if (isRegister) {
                const response =
                    await axios.post(
                        `${API_URL}/users/register`,
                        {
                            name,
                            email,
                            password,
                        }
                    );

                alert(
                    response.data.message ||
                        "Registration successful"
                );

                setIsRegister(false);
                setName("");
                setEmail("");
                setPassword("");
            } else {
                const response =
                    await axios.post(
                        `${API_URL}/users/login`,
                        {
                            email,
                            password,
                        }
                    );

                const receivedToken =
                    response.data.token;

                const receivedUser =
                    response.data.user;

                localStorage.setItem(
                    "token",
                    receivedToken
                );

                localStorage.setItem(
                    "user",
                    JSON.stringify(
                        receivedUser
                    )
                );

                tokenRef.current =
                    receivedToken;

                setToken(receivedToken);
                setUser(receivedUser);

                setPassword("");
            }
        } catch (error) {
            console.error(
                "AUTH ERROR:",
                error
            );

            setAuthError(
                error.response?.data
                    ?.message ||
                    "Something went wrong"
            );
        } finally {
            setAuthLoading(false);
        }
    };

    // =========================================
    // LOGOUT
    // =========================================

    const logout = async () => {
        const currentRoom =
            roomIdRef.current;

        if (currentRoom) {
            socket.emit(
                "leave-room",
                currentRoom
            );

            try {
                if (user?.id) {
                    await axios.delete(
                        `${API_URL}/rooms/${currentRoom}/leave`,
                        {
                            ...getAuthConfig(),
                            data: {
                                userId: user.id,
                            },
                        }
                    );
                }
            } catch (error) {
                console.error(
                    "LOGOUT ROOM LEAVE ERROR:",
                    error
                );
            }
        }

        roomIdRef.current = "";
        joinedRoomRef.current = false;

        setRoomId("");
        setRoomInput("");
        setRoomName("");
        setJoinedRoom(false);
        setUsersOnline(0);
        setRoomMembers([]);
        setCode("");

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        tokenRef.current = null;

        setToken(null);
        setUser(null);
    };

    // =========================================
    // CREATE ROOM
    // =========================================

    const createRoom = async (e) => {
        if (e) {
            e.preventDefault();
        }

        console.log(
            "🚨 CREATE ROOM FUNCTION CALLED"
        );

        setRoomError("");
        setRoomLoading(true);

        try {
            const response =
                await axios.post(
                    `${API_URL}/rooms/create`,
                    {
                        roomName:
                            roomName.trim() ||
                            "Untitled Room",

                        userId: user?.id,
                    },
                    getAuthConfig()
                );

            const createdRoom =
                response.data.room;

            const newRoomId =
                createdRoom.roomId;

            console.log(
                "MongoDB Room Created:",
                createdRoom
            );

            // =================================
            // IMPORTANT:
            // Set ONLY CREATED room ID
            // =================================

            roomIdRef.current =
                newRoomId;

            joinedRoomRef.current = true;

            setRoomId(newRoomId);
            setRoomInput(newRoomId);
            setJoinedRoom(true);
            setUsersOnline(0);
            setRoomMembers([]);
            setCode("");

            // =================================
            // JOIN SOCKET ROOM
            // =================================

            socket.emit(
                "join-room",
                newRoomId
            );

            await loadRoomMembers(
                newRoomId
            );

            console.log(
                "Joined created room:",
                newRoomId
            );
        } catch (error) {
            console.error(
                "CREATE ROOM ERROR:",
                error
            );

            setRoomError(
                error.response?.data
                    ?.message ||
                    "Unable to create room"
            );
        } finally {
            setRoomLoading(false);
        }
    };

    // =========================================
    // JOIN EXISTING ROOM
    // =========================================

    const joinRoom = async (e) => {
        if (e) {
            e.preventDefault();
        }

        console.log(
            "🔥 JOIN ROOM FUNCTION CALLED"
        );

        const enteredRoom =
            roomInput.trim();

        console.log(
            "🔥 ENTERED ROOM ID:",
            enteredRoom
        );

        if (!enteredRoom) {
            setRoomError(
                "Please enter a Room ID"
            );

            return;
        }

        setRoomError("");
        setRoomLoading(true);

        try {
            // =================================
            // CHECK THAT ROOM EXISTS
            // =================================

            const response =
                await axios.get(
                    `${API_URL}/rooms/${enteredRoom}`,
                    getAuthConfig()
                );

            console.log(
                "Room found:",
                response.data.room
            );

            // =================================
            // ADD USER TO ROOM
            // =================================

            if (user?.id) {
                await axios.post(
                    `${API_URL}/rooms/${enteredRoom}/join`,
                    {
                        userId: user.id,
                    },
                    getAuthConfig()
                );
            }

            // =================================
            // LEAVE OLD SOCKET ROOM
            // =================================

            const previousRoom =
                roomIdRef.current;

            if (
                previousRoom &&
                previousRoom !== enteredRoom
            ) {
                socket.emit(
                    "leave-room",
                    previousRoom
                );
            }

            // =================================
            // SET EXACT ENTERED ROOM
            // =================================

            roomIdRef.current =
                enteredRoom;

            joinedRoomRef.current = true;

            setRoomId(enteredRoom);
            setJoinedRoom(true);
            setUsersOnline(0);
            setRoomMembers([]);
            setCode("");

            // =================================
            // JOIN EXACT SAME ROOM
            // =================================

            console.log(
                "Joining socket room:",
                enteredRoom
            );

            socket.emit(
                "join-room",
                enteredRoom
            );

            // =================================
            // LOAD MEMBERS
            // =================================

            await loadRoomMembers(
                enteredRoom
            );

            console.log(
                "Joined room:",
                enteredRoom
            );
        } catch (error) {
            console.error(
                "JOIN ROOM ERROR:",
                error
            );

            if (
                error.response?.status ===
                404
            ) {
                setRoomError(
                    "Room not found"
                );
            } else {
                setRoomError(
                    error.response?.data
                        ?.message ||
                        "Unable to join room"
                );
            }
        } finally {
            setRoomLoading(false);
        }
    };

    // =========================================
    // LEAVE ROOM
    // =========================================

    const leaveRoom = async (e) => {
        if (e) {
            e.preventDefault();
        }

        const currentRoom =
            roomIdRef.current;

        if (!currentRoom) {
            return;
        }

        console.log(
            "Leaving room:",
            currentRoom
        );

        // =================================
        // SOCKET LEAVE
        // =================================

        socket.emit(
            "leave-room",
            currentRoom
        );

        // =================================
        // RESET STATE
        // =================================

        roomIdRef.current = "";
        joinedRoomRef.current = false;

        setRoomId("");
        setRoomInput("");
        setRoomName("");
        setJoinedRoom(false);
        setUsersOnline(0);
        setRoomMembers([]);
        setCode("");

        // =================================
        // DATABASE LEAVE
        // =================================

        try {
            if (user?.id) {
                const response =
                    await axios.delete(
                        `${API_URL}/rooms/${currentRoom}/leave`,
                        {
                            ...getAuthConfig(),
                            data: {
                                userId: user.id,
                            },
                        }
                    );

                console.log(
                    "MongoDB leave response:",
                    response.data
                );
            }
        } catch (error) {
            console.error(
                "LEAVE ROOM DATABASE ERROR:",
                error
            );
        }

        console.log(
            "Successfully left room:",
            currentRoom
        );
    };

    // =========================================
    // EDITOR CHANGE
    // =========================================

    const handleEditorChange = (value) => {
        const newCode = value || "";

        // =================================
        // UPDATE LOCAL EDITOR
        // =================================

        setCode(newCode);

        const currentRoom =
            roomIdRef.current;

        if (!currentRoom) {
            return;
        }

        // =================================
        // SEND TO SERVER
        // =================================

        console.log(
            "Sending code update:",
            {
                roomId: currentRoom,
                length: newCode.length,
            }
        );

        socket.emit(
            "code-change",
            {
                roomId: currentRoom,
                code: newCode,
            }
        );
    };

    // =========================================
    // LOGIN / REGISTER SCREEN
    // =========================================

    if (!token || !user) {
        return (
            <div className="container">
                <h1>
                    SyncSpace 🚀
                </h1>

                <p>
                    Real-Time Collaborative
                    Code Editor
                </p>

                <div className="room-box">
                    <h2>
                        {isRegister
                            ? "Create Account"
                            : "Login"}
                    </h2>

                    <form
                        onSubmit={
                            handleAuth
                        }
                    >
                        {isRegister && (
                            <input
                                type="text"
                                placeholder="Name"
                                value={name}
                                onChange={(e) =>
                                    setName(
                                        e.target.value
                                    )
                                }
                                required
                            />
                        )}

                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                            required
                        />

                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) =>
                                setPassword(
                                    e.target.value
                                )
                            }
                            required
                        />

                        {authError && (
                            <p
                                style={{
                                    color: "red",
                                }}
                            >
                                {authError}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={
                                authLoading
                            }
                        >
                            {authLoading
                                ? "Please wait..."
                                : isRegister
                                ? "Create Account"
                                : "Login"}
                        </button>
                    </form>

                    <p>
                        {isRegister
                            ? "Already have an account?"
                            : "Don't have an account?"}
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setIsRegister(
                                !isRegister
                            );

                            setAuthError("");
                        }}
                    >
                        {isRegister
                            ? "Login"
                            : "Create Account"}
                    </button>
                </div>
            </div>
        );
    }

    // =========================================
    // ROOM SELECTION SCREEN
    // =========================================

    if (!joinedRoom) {
        return (
            <div className="container">
                <h1>
                    SyncSpace 🚀
                </h1>

                <h2>
                    Welcome, {user.name}
                </h2>

                <p>
                    Status:
                    {connected
                        ? " 🟢 Connected"
                        : " 🔴 Disconnected"}
                </p>

                <div className="room-box">
                    <h2>
                        Join a Room
                    </h2>

                    {/* =================================
                        JOIN EXISTING ROOM FORM
                    ================================= */}

                    <form
                        onSubmit={joinRoom}
                    >
                        <input
                            type="text"
                            placeholder="Enter Room ID"
                            value={roomInput}
                            onChange={(e) => {
                                setRoomInput(
                                    e.target.value
                                );

                                setRoomError("");
                            }}
                        />

                        <button
                            type="submit"
                            disabled={
                                roomLoading
                            }
                        >
                            {roomLoading
                                ? "Please wait..."
                                : "Join Room"}
                        </button>
                    </form>

                    <p>
                        OR
                    </p>

                    {/* =================================
                        CREATE NEW ROOM
                    ================================= */}

                    <input
                        type="text"
                        placeholder="Room Name (optional)"
                        value={roomName}
                        onChange={(e) =>
                            setRoomName(
                                e.target.value
                            )
                        }
                    />

                    <button
                        type="button"
                        onClick={createRoom}
                        disabled={
                            roomLoading
                        }
                    >
                        {roomLoading
                            ? "Creating..."
                            : "Create New Room"}
                    </button>

                    {roomError && (
                        <p
                            style={{
                                color: "red",
                            }}
                        >
                            {roomError}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={logout}
                >
                    Logout
                </button>
            </div>
        );
    }

    // =========================================
    // CODE EDITOR SCREEN
    // =========================================

    return (
        <div className="container">
            <h1>
                SyncSpace 🚀
            </h1>

            <h3>
                Welcome, {user.name}
            </h3>

            <h3>
                Room ID: {roomId}
            </h3>

            <p>
                Status:
                {connected
                    ? " 🟢 Connected"
                    : " 🔴 Disconnected"}
            </p>

            <p>
                👥 Users Online:{" "}
                {usersOnline}
            </p>

            {/* =================================
                ROOM MEMBERS
            ================================= */}

            <div className="room-members">
                <h3>
                    👥 Room Members
                </h3>

                {roomMembers.length ===
                0 ? (
                    <p>
                        No members found
                    </p>
                ) : (
                    roomMembers.map(
                        (member) => {
                            const memberId =
                                member._id ||
                                member.id;

                            const currentUserId =
                                user.id ||
                                user._id;

                            const isCurrentUser =
                                String(
                                    memberId
                                ) ===
                                String(
                                    currentUserId
                                );

                            const firstLetter =
                                member.name
                                    ? member.name
                                          .charAt(
                                              0
                                          )
                                          .toUpperCase()
                                    : "?";

                            return (
                                <div
                                    key={
                                        memberId
                                    }
                                    className="member"
                                >
                                    <div className="avatar">
                                        {
                                            firstLetter
                                        }
                                    </div>

                                    <div>
                                        <strong>
                                            {
                                                member.name
                                            }

                                            {isCurrentUser &&
                                                " (You)"}
                                        </strong>

                                        <small>
                                            {
                                                member.email
                                            }
                                        </small>
                                    </div>
                                </div>
                            );
                        }
                    )
                )}
            </div>

            {/* =================================
                ROOM BUTTONS
            ================================= */}

            <button
                type="button"
                onClick={leaveRoom}
                disabled={roomLoading}
            >
                Leave Room
            </button>

            <button
                type="button"
                onClick={logout}
                style={{
                    marginLeft: "10px",
                }}
            >
                Logout
            </button>

            {/* =================================
                MONACO EDITOR
            ================================= */}

            <Editor
                height="500px"
                defaultLanguage="javascript"
                value={code}
                onChange={
                    handleEditorChange
                }
                theme="vs-dark"
                options={{
                    minimap: {
                        enabled: false,
                    },
                    fontSize: 16,
                    automaticLayout: true,
                }}
            />
        </div>
    );
}

export default App;