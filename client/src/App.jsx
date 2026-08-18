import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import socket from "./socket";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function App() {
    // ================================
    // AUTH STATE
    // ================================
    const [token, setToken] = useState(
        localStorage.getItem("token")
    );

    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // ================================
    // AUTH FORM
    // ================================
    const [isRegister, setIsRegister] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");

    // ================================
    // APP STATE
    // ================================
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

    // ================================
    // REFERENCES
    // ================================
    const ydocRef = useRef(null);
    const ytextRef = useRef(null);
    const roomIdRef = useRef("");

    // ================================
    // AUTH CONFIG
    // ================================
    const getAuthConfig = () => {
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    };

    // ================================
    // LOAD ROOM MEMBERS
    // ================================
    const loadRoomMembers = async (currentRoomId) => {
        if (!currentRoomId) return;

        try {
            const response = await axios.get(
                `${API_URL}/rooms/${currentRoomId}`,
                getAuthConfig()
            );

            const room = response.data.room;

            const members = room?.users || [];

            // Remove duplicate users
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

    // ================================
    // SOCKET + YJS SETUP
    // ================================
    useEffect(() => {
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText("code");

        ydocRef.current = ydoc;
        ytextRef.current = ytext;

        // ================================
        // CONNECT
        // ================================
        const handleConnect = () => {
            console.log(
                "Socket Connected:",
                socket.id
            );

            setConnected(true);
        };

        // ================================
        // DISCONNECT
        // ================================
        const handleDisconnect = () => {
            console.log(
                "Socket Disconnected"
            );

            setConnected(false);
        };

        // ================================
        // ONLINE USERS
        // ================================
        
            const handleRoomUsers = async (count) => {
    console.log("Users Online:", count);

    setUsersOnline(count);

    const currentRoomId = roomIdRef.current;

    if (currentRoomId) {
        await loadRoomMembers(currentRoomId);
    }
};

        // ================================
        // ROOM CODE
        // ================================
        const handleRoomCode = (existingCode) => {
            console.log(
                "Existing room code:",
                existingCode
            );

            const receivedCode =
                existingCode || "";

            setCode(receivedCode);

            ydoc.transact(
                () => {
                    if (ytext.length > 0) {
                        ytext.delete(
                            0,
                            ytext.length
                        );
                    }

                    if (
                        receivedCode.length > 0
                    ) {
                        ytext.insert(
                            0,
                            receivedCode
                        );
                    }
                },
                "remote"
            );
        };

        // ================================
        // CODE UPDATE
        // ================================
        const handleCodeUpdate = (
            updatedCode
        ) => {
            console.log(
                "Received code update"
            );

            const receivedCode =
                updatedCode || "";

            setCode(receivedCode);

            ydoc.transact(
                () => {
                    if (ytext.length > 0) {
                        ytext.delete(
                            0,
                            ytext.length
                        );
                    }

                    if (
                        receivedCode.length > 0
                    ) {
                        ytext.insert(
                            0,
                            receivedCode
                        );
                    }
                },
                "remote"
            );
        };

        // ================================
        // YJS UPDATE
        // ================================
        const handleYjsUpdate = (
            update
        ) => {
            console.log(
                "Received Yjs update"
            );

            try {
                const uint8Array =
                    new Uint8Array(update);

                Y.applyUpdate(
                    ydoc,
                    uint8Array,
                    "remote"
                );

                setCode(
                    ytext.toString()
                );
            } catch (error) {
                console.error(
                    "YJS UPDATE ERROR:",
                    error
                );
            }
        };

        // ================================
        // LOCAL YJS UPDATE
        // ================================
        const handleYjsLocalUpdate = (
            update,
            origin
        ) => {
            if (origin !== "local") {
                return;
            }

            const currentRoom =
                roomIdRef.current;

            if (!currentRoom) {
                return;
            }

            socket.emit(
                "yjs-update",
                {
                    roomId: currentRoom,
                    update: Array.from(update),
                }
            );
        };

        // ================================
        // SOCKET LISTENERS
        // ================================
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

        socket.on(
            "yjs-update",
            handleYjsUpdate
        );

        ydoc.on(
            "update",
            handleYjsLocalUpdate
        );

        // Initial socket state
        if (socket.connected) {
            setConnected(true);
        }

        // ================================
        // CLEANUP
        // ================================
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

            socket.off(
                "yjs-update",
                handleYjsUpdate
            );

            ydoc.off(
                "update",
                handleYjsLocalUpdate
            );

            ydoc.destroy();

            ydocRef.current = null;
            ytextRef.current = null;
        };
    }, []);

    // ================================
    // REGISTER / LOGIN
    // ================================
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

    // ================================
    // LOGOUT
    // ================================
    const logout = async () => {
        const currentRoom =
            roomIdRef.current;

        // Leave socket room
        if (currentRoom) {
            socket.emit(
                "leave-room",
                currentRoom
            );

            // Remove user from MongoDB
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

        setRoomId("");
        setRoomInput("");
        setRoomName("");
        setJoinedRoom(false);
        setUsersOnline(0);
        setRoomMembers([]);
        setCode("");

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setToken(null);
        setUser(null);
    };

    // ================================
    // CREATE ROOM
    // ================================
    const createRoom = async () => {
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

            roomIdRef.current =
                newRoomId;

            setRoomId(newRoomId);
            setRoomInput(newRoomId);
            setJoinedRoom(true);
            setUsersOnline(0);
            setCode("");

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

    // ================================
    // JOIN ROOM
    // ================================
    const joinRoom = async () => {
        const enteredRoom =
            roomInput.trim();

        if (!enteredRoom) {
            setRoomError(
                "Please enter a Room ID"
            );

            return;
        }

        setRoomError("");
        setRoomLoading(true);

        try {
            // Check room
            const response =
                await axios.get(
                    `${API_URL}/rooms/${enteredRoom}`,
                    getAuthConfig()
                );

            console.log(
                "Room found:",
                response.data.room
            );

            // Add user to MongoDB room
            if (user?.id) {
                await axios.post(
                    `${API_URL}/rooms/${enteredRoom}/join`,
                    {
                        userId: user.id,
                    },
                    getAuthConfig()
                );
            }

            // Leave old socket room
            if (
                roomIdRef.current &&
                roomIdRef.current !==
                    enteredRoom
            ) {
                socket.emit(
                    "leave-room",
                    roomIdRef.current
                );
            }

            // Clear YJS
            const ytext =
                ytextRef.current;

            if (
                ytext &&
                ytext.length > 0
            ) {
                ytext.delete(
                    0,
                    ytext.length
                );
            }

            setCode("");

            roomIdRef.current =
                enteredRoom;

            setRoomId(enteredRoom);
            setJoinedRoom(true);
            setUsersOnline(0);

            socket.emit(
                "join-room",
                enteredRoom
            );

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

    // ================================
    // LEAVE ROOM
    // ================================
    const leaveRoom = async () => {
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
        // FIRST: LEAVE SOCKET ROOM
        // =================================
        socket.emit(
            "leave-room",
            currentRoom
        );

        // =================================
        // IMMEDIATELY RESET UI
        // =================================
        roomIdRef.current = "";

        setRoomId("");
        setRoomInput("");
        setRoomName("");
        setJoinedRoom(false);
        setUsersOnline(0);
        setRoomMembers([]);
        setCode("");

        // =================================
        // REMOVE USER FROM MONGODB
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

    // ================================
    // EDITOR CHANGE
    // ================================
    const handleEditorChange = (
        value
    ) => {
        const newCode =
            value || "";

        setCode(newCode);

        const ydoc =
            ydocRef.current;

        const ytext =
            ytextRef.current;

        if (!ydoc || !ytext) {
            return;
        }

        ydoc.transact(
            () => {
                if (ytext.length > 0) {
                    ytext.delete(
                        0,
                        ytext.length
                    );
                }

                if (
                    newCode.length > 0
                ) {
                    ytext.insert(
                        0,
                        newCode
                    );
                }
            },
            "local"
        );

        if (roomIdRef.current) {
            socket.emit(
                "code-change",
                {
                    roomId:
                        roomIdRef.current,
                    code: newCode,
                }
            );
        }
    };

    // ================================
    // LOGIN / REGISTER SCREEN
    // ================================
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

    // ================================
    // ROOM SELECTION
    // ================================
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
                        onClick={joinRoom}
                        disabled={
                            roomLoading
                        }
                    >
                        {roomLoading
                            ? "Please wait..."
                            : "Join Room"}
                    </button>

                    <p>OR</p>

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
                    onClick={logout}
                >
                    Logout
                </button>
            </div>
        );
    }

    // ================================
    // CODE EDITOR SCREEN
    // ================================
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

            {/* ================================
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

            <button
                onClick={leaveRoom}
                disabled={roomLoading}
            >
                Leave Room
            </button>

            <button
                onClick={logout}
                style={{
                    marginLeft: "10px",
                }}
            >
                Logout
            </button>

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