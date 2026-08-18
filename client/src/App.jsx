import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import { Toaster, toast } from "sonner";
import socket from "./socket";
import "./App.css";

const API_URL = "http://localhost:5000/api";

const LANGUAGES = [
    {
        id: "javascript",
        label: "JavaScript",
    },
    {
        id: "python",
        label: "Python",
    },
    {
        id: "java",
        label: "Java",
    },
    {
        id: "cpp",
        label: "C++",
    },
    {
        id: "html",
        label: "HTML",
    },
    {
        id: "css",
        label: "CSS",
    },
    {
        id: "json",
        label: "JSON",
    },
];

function App() {
    // =========================================
    // AUTH STATE
    // =========================================

    const [token, setToken] = useState(
        localStorage.getItem("token")
    );

    const [user, setUser] = useState(() => {
        const savedUser =
            localStorage.getItem("user");

        return savedUser
            ? JSON.parse(savedUser)
            : null;
    });

    // =========================================
    // AUTH FORM
    // =========================================

    const [isRegister, setIsRegister] =
        useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [authLoading, setAuthLoading] =
        useState(false);

    const [authError, setAuthError] =
        useState("");

    // =========================================
    // ROOM STATE
    // =========================================

    const [connected, setConnected] =
        useState(false);

    const [roomId, setRoomId] =
        useState("");

    const [roomInput, setRoomInput] =
        useState("");

    const [roomNameInput, setRoomNameInput] =
        useState("");

    const [roomName, setRoomName] =
        useState("");

    const [joinedRoom, setJoinedRoom] =
        useState(false);

    // =========================================
    // INDIVIDUAL MEMBER CODES
    // =========================================

    const [memberCodes, setMemberCodes] =
        useState({});

    const [activeMemberId, setActiveMemberId] =
        useState("");

    // =========================================
    // INDIVIDUAL MEMBER LANGUAGES
    // =========================================

    const [memberLanguages, setMemberLanguages] =
        useState({});

    // =========================================
    // ROOM PRESENCE
    // =========================================

    const [usersOnline, setUsersOnline] =
        useState(0);

    const [roomMembers, setRoomMembers] =
        useState([]);

    const [roomError, setRoomError] =
        useState("");

    const [roomLoading, setRoomLoading] =
        useState(false);

    // =========================================
    // REFS
    // =========================================

    const roomIdRef = useRef("");

    const tokenRef = useRef(token);

    const userIdRef = useRef(
        user?.id ||
        user?._id ||
        ""
    );

    const activeMemberIdRef =
        useRef("");

    // =========================================
    // KEEP REFS UPDATED
    // =========================================

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    useEffect(() => {
        const currentUserId =
            user?.id ||
            user?._id ||
            "";

        userIdRef.current =
            String(currentUserId);
    }, [user]);

    useEffect(() => {
        activeMemberIdRef.current =
            String(activeMemberId || "");
    }, [activeMemberId]);

    // =========================================
    // AUTH CONFIG
    // =========================================

    const getAuthConfig = () => {
        return {
            headers: {
                Authorization:
                    `Bearer ${tokenRef.current}`,
            },
        };
    };

    // =========================================
    // CURRENT USER ID
    // =========================================

    const getCurrentUserId = () => {
        return String(
            user?.id ||
            user?._id ||
            ""
        );
    };

    // =========================================
    // LOAD ROOM MEMBERS
    // =========================================

    const loadRoomMembers = async (
        currentRoomId
    ) => {
        if (!currentRoomId) {
            return null;
        }

        try {
            const response =
                await axios.get(
                    `${API_URL}/rooms/${currentRoomId}`,
                    getAuthConfig()
                );

            const room =
                response.data.room;

            const members =
                room?.users || [];

            const uniqueMembers =
                Array.from(
                    new Map(
                        members.map(
                            (member) => [
                                String(
                                    member._id ||
                                    member.id
                                ),
                                member,
                            ]
                        )
                    ).values()
                );

            setRoomMembers(
                uniqueMembers
            );

            return room;
        } catch (error) {
            console.error(
                "LOAD ROOM MEMBERS ERROR:",
                error
            );

            return null;
        }
    };

    // =========================================
    // SELECT MEMBER
    // =========================================

    const selectMember = (
        memberId
    ) => {
        const id =
            String(memberId);

        setActiveMemberId(id);

        activeMemberIdRef.current =
            id;

        setMemberLanguages(
            (previous) => {
                if (previous[id]) {
                    return previous;
                }

                return {
                    ...previous,
                    [id]: "javascript",
                };
            }
        );
    };

    // =========================================
    // CHANGE PROGRAMMING LANGUAGE
    // =========================================

    const handleLanguageChange = (
        event
    ) => {
        const language =
            event.target.value;

        const currentMemberId =
            String(
                activeMemberIdRef.current ||
                ""
            );

        if (!currentMemberId) {
            return;
        }

        setMemberLanguages(
            (previous) => ({
                ...previous,
                [currentMemberId]:
                    language,
            })
        );

        const selectedLanguage =
            LANGUAGES.find(
                (item) =>
                    item.id ===
                    language
            );

        if (selectedLanguage) {
            toast.success(
                `Language changed to ${selectedLanguage.label}`
            );
        }
    };

    // =========================================
    // SOCKET SETUP
    // =========================================

    useEffect(() => {
        const handleConnect = () => {
            console.log(
                "Socket Connected:",
                socket.id
            );

            setConnected(true);

            const currentRoom =
                roomIdRef.current;

            const currentUserId =
                userIdRef.current;

            if (
                currentRoom &&
                currentUserId
            ) {
                socket.emit(
                    "join-room",
                    {
                        roomId:
                            currentRoom,

                        userId:
                            currentUserId,
                    }
                );

                socket.emit(
                    "get-room-member-codes",
                    {
                        roomId:
                            currentRoom,
                    }
                );
            }
        };

        const handleDisconnect = () => {
            console.log(
                "Socket Disconnected"
            );

            setConnected(false);
        };

        const handleRoomUsers = async (
            count
        ) => {
            setUsersOnline(count);

            const currentRoom =
                roomIdRef.current;

            if (currentRoom) {
                await loadRoomMembers(
                    currentRoom
                );
            }
        };

        const handleMemberCode = (
            payload
        ) => {
            if (
                !payload ||
                !payload.userId
            ) {
                return;
            }

            const memberId =
                String(
                    payload.userId
                );

            const memberCode =
                payload.code || "";

            setMemberCodes(
                (previous) => ({
                    ...previous,
                    [memberId]:
                        memberCode,
                })
            );
        };

        const handleRoomMemberCodes = (
            codes
        ) => {
            if (
                !codes ||
                typeof codes !==
                    "object"
            ) {
                return;
            }

            const normalizedCodes =
                Object.fromEntries(
                    Object.entries(
                        codes
                    ).map(
                        ([
                            userId,
                            userCode,
                        ]) => [
                            String(
                                userId
                            ),
                            userCode || "",
                        ]
                    )
                );

            setMemberCodes(
                normalizedCodes
            );

            const currentActiveMember =
                String(
                    activeMemberIdRef.current ||
                    ""
                );

            const currentUserId =
                String(
                    userIdRef.current ||
                    ""
                );

            if (
                currentActiveMember &&
                Object.prototype.hasOwnProperty.call(
                    normalizedCodes,
                    currentActiveMember
                )
            ) {
                return;
            }

            if (currentUserId) {
                setActiveMemberId(
                    currentUserId
                );

                activeMemberIdRef.current =
                    currentUserId;

                setMemberLanguages(
                    (previous) => ({
                        ...previous,
                        [currentUserId]:
                            previous[
                                currentUserId
                            ] ||
                            "javascript",
                    })
                );
            }
        };

        const handleMemberCodeUpdate = (
            payload
        ) => {
            if (
                !payload ||
                !payload.userId
            ) {
                return;
            }

            const memberId =
                String(
                    payload.userId
                );

            const updatedCode =
                payload.code || "";

            setMemberCodes(
                (previous) => ({
                    ...previous,
                    [memberId]:
                        updatedCode,
                })
            );
        };

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
            "member-code",
            handleMemberCode
        );

        socket.on(
            "room-member-codes",
            handleRoomMemberCodes
        );

        socket.on(
            "member-code-update",
            handleMemberCodeUpdate
        );

        if (socket.connected) {
            setConnected(true);
        }

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
                "member-code",
                handleMemberCode
            );

            socket.off(
                "room-member-codes",
                handleRoomMemberCodes
            );

            socket.off(
                "member-code-update",
                handleMemberCodeUpdate
            );
        };
    }, []);

    // =========================================
    // AUTH
    // =========================================

    const handleAuth = async (
        e
    ) => {
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

                toast.success(
                    response.data.message ||
                    "Registration successful"
                );

                setIsRegister(
                    false
                );

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

                const receivedUserId =
                    String(
                        receivedUser.id ||
                        receivedUser._id ||
                        ""
                    );

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

                userIdRef.current =
                    receivedUserId;

                setToken(
                    receivedToken
                );

                setUser(
                    receivedUser
                );

                setPassword("");

                toast.success(
                    "Login successful"
                );
            }
        } catch (error) {
            console.error(
                "AUTH ERROR:",
                error
            );

            const message =
                error.response?.data
                    ?.message ||
                "Something went wrong";

            setAuthError(
                message
            );

            toast.error(
                message
            );
        } finally {
            setAuthLoading(
                false
            );
        }
    };

    // =========================================
    // LOGOUT
    // =========================================

    const logout = async () => {
        const currentRoom =
            roomIdRef.current;

        const currentUserId =
            getCurrentUserId();

        if (currentRoom) {
            socket.emit(
                "leave-room",
                currentRoom
            );

            try {
                if (currentUserId) {
                    await axios.delete(
                        `${API_URL}/rooms/${currentRoom}/leave`,
                        {
                            ...getAuthConfig(),
                            data: {
                                userId:
                                    currentUserId,
                            },
                        }
                    );
                }
            } catch (error) {
                console.error(
                    "LOGOUT ROOM LEAVE ERROR:",
                    error
                );

                toast.error(
                    "Unable to leave room cleanly"
                );
            }
        }

        roomIdRef.current = "";
        userIdRef.current = "";
        activeMemberIdRef.current =
            "";

        setRoomId("");
        setRoomInput("");
        setRoomNameInput("");
        setRoomName("");
        setJoinedRoom(false);
        setUsersOnline(0);
        setRoomMembers([]);
        setMemberCodes({});
        setMemberLanguages({});
        setActiveMemberId("");

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "user"
        );

        tokenRef.current = null;

        setToken(null);
        setUser(null);

        toast.success(
            "Logged out successfully"
        );
    };

    // =========================================
    // CREATE ROOM
    // =========================================

    const createRoom = async (
        e
    ) => {
        if (e) {
            e.preventDefault();
        }

        setRoomError("");
        setRoomLoading(true);

        try {
            const currentUserId =
                getCurrentUserId();

            if (!currentUserId) {
                const message =
                    "User information is missing. Please login again.";

                setRoomError(
                    message
                );

                toast.error(
                    message
                );

                return;
            }

            const nameToCreate =
                roomNameInput.trim() ||
                "Untitled Room";

            const response =
                await axios.post(
                    `${API_URL}/rooms/create`,
                    {
                        roomName:
                            nameToCreate,

                        userId:
                            currentUserId,
                    },
                    getAuthConfig()
                );

            const createdRoom =
                response.data.room;

            const newRoomId =
                createdRoom.roomId;

            const createdRoomName =
                createdRoom.roomName ||
                createdRoom.name ||
                nameToCreate;

            roomIdRef.current =
                newRoomId;

            setRoomId(
                newRoomId
            );

            setRoomInput(
                newRoomId
            );

            setRoomName(
                createdRoomName
            );

            setRoomNameInput("");

            setJoinedRoom(
                true
            );

            setUsersOnline(0);
            setRoomMembers([]);
            setMemberCodes({});
            setMemberLanguages({});

            setActiveMemberId(
                currentUserId
            );

            activeMemberIdRef.current =
                currentUserId;

            setMemberLanguages({
                [currentUserId]:
                    "javascript",
            });

            socket.emit(
                "join-room",
                {
                    roomId:
                        newRoomId,

                    userId:
                        currentUserId,
                }
            );

            socket.emit(
                "get-room-member-codes",
                {
                    roomId:
                        newRoomId,
                }
            );

            await loadRoomMembers(
                newRoomId
            );

            toast.success(
                "Room created successfully"
            );
        } catch (error) {
            console.error(
                "CREATE ROOM ERROR:",
                error
            );

            const message =
                error.response?.data
                    ?.message ||
                "Unable to create room";

            setRoomError(
                message
            );

            toast.error(
                message
            );
        } finally {
            setRoomLoading(
                false
            );
        }
    };

    // =========================================
    // JOIN ROOM
    // =========================================

    const joinRoom = async (
        e
    ) => {
        if (e) {
            e.preventDefault();
        }

        const enteredRoom =
            roomInput.trim();

        const currentUserId =
            getCurrentUserId();

        if (!enteredRoom) {
            const message =
                "Please enter a Room ID";

            setRoomError(
                message
            );

            toast.error(
                message
            );

            return;
        }

        if (!currentUserId) {
            const message =
                "User information is missing. Please login again.";

            setRoomError(
                message
            );

            toast.error(
                message
            );

            return;
        }

        setRoomError("");
        setRoomLoading(true);

        try {
            const response =
                await axios.get(
                    `${API_URL}/rooms/${enteredRoom}`,
                    getAuthConfig()
                );

            const foundRoom =
                response.data.room;

            const foundRoomName =
                foundRoom.roomName ||
                foundRoom.name ||
                "Untitled Room";

            await axios.post(
                `${API_URL}/rooms/${enteredRoom}/join`,
                {
                    userId:
                        currentUserId,
                },
                getAuthConfig()
            );

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

            roomIdRef.current =
                enteredRoom;

            setRoomId(
                enteredRoom
            );

            setRoomName(
                foundRoomName
            );

            setJoinedRoom(
                true
            );

            setUsersOnline(0);
            setRoomMembers([]);
            setMemberCodes({});
            setMemberLanguages({});

            setActiveMemberId(
                currentUserId
            );

            activeMemberIdRef.current =
                currentUserId;

            setMemberLanguages({
                [currentUserId]:
                    "javascript",
            });

            socket.emit(
                "join-room",
                {
                    roomId:
                        enteredRoom,

                    userId:
                        currentUserId,
                }
            );

            socket.emit(
                "get-room-member-codes",
                {
                    roomId:
                        enteredRoom,
                }
            );

            await loadRoomMembers(
                enteredRoom
            );

            toast.success(
                "Joined room successfully"
            );
        } catch (error) {
            console.error(
                "JOIN ROOM ERROR:",
                error
            );

            let message =
                "Unable to join room";

            if (
                error.response?.status ===
                404
            ) {
                message =
                    "Room not found";
            } else {
                message =
                    error.response?.data
                        ?.message ||
                    message;
            }

            setRoomError(
                message
            );

            toast.error(
                message
            );
        } finally {
            setRoomLoading(
                false
            );
        }
    };

    // =========================================
    // LEAVE ROOM
    // =========================================

    const leaveRoom = async (
        e
    ) => {
        if (e) {
            e.preventDefault();
        }

        const currentRoom =
            roomIdRef.current;

        const currentUserId =
            getCurrentUserId();

        if (!currentRoom) {
            return;
        }

        socket.emit(
            "leave-room",
            currentRoom
        );

        try {
            if (currentUserId) {
                await axios.delete(
                    `${API_URL}/rooms/${currentRoom}/leave`,
                    {
                        ...getAuthConfig(),
                        data: {
                            userId:
                                currentUserId,
                        },
                    }
                );
            }

            toast.success(
                "Left room successfully"
            );
        } catch (error) {
            console.error(
                "LEAVE ROOM DATABASE ERROR:",
                error
            );

            toast.error(
                "Unable to leave room cleanly"
            );
        }

        roomIdRef.current = "";
        activeMemberIdRef.current =
            "";

        setRoomId("");
        setRoomInput("");
        setRoomNameInput("");
        setRoomName("");
        setJoinedRoom(false);
        setUsersOnline(0);
        setRoomMembers([]);
        setMemberCodes({});
        setMemberLanguages({});
        setActiveMemberId("");
    };

    // =========================================
    // EDITOR CHANGE
    // =========================================

    const handleEditorChange = (
        value
    ) => {
        const newCode =
            value || "";

        const currentRoom =
            roomIdRef.current;

        const currentUserId =
            getCurrentUserId();

        const activeId =
            String(
                activeMemberIdRef.current ||
                ""
            );

        if (!currentRoom) {
            return;
        }

        if (!currentUserId) {
            return;
        }

        if (
            activeId !==
            String(currentUserId)
        ) {
            return;
        }

        setMemberCodes(
            (previous) => ({
                ...previous,

                [String(
                    currentUserId
                )]:
                    newCode,
            })
        );

        socket.emit(
            "code-change",
            {
                roomId:
                    currentRoom,

                userId:
                    String(
                        currentUserId
                    ),

                code:
                    newCode,
            }
        );
    };

    // =========================================
    // LOGIN / REGISTER SCREEN
    // =========================================

    if (!token || !user) {
        return (
            <>
                <Toaster
                    position="top-right"
                    theme="dark"
                    richColors
                    closeButton
                    toastOptions={{
                        style: {
                            background:
                                "#17120f",
                            border:
                                "1px solid rgba(253, 186, 116, 0.2)",
                            color:
                                "#fff7ed",
                        },
                    }}
                />

                <div className="container">
                    <h1>
                        SyncSpace
                    </h1>

                    <p>
                        Real-Time
                        Collaborative Code
                        Editor
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
                                    onChange={(
                                        e
                                    ) =>
                                        setName(
                                            e.target
                                                .value
                                        )
                                    }
                                    required
                                />
                            )}

                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(
                                    e
                                ) =>
                                    setEmail(
                                        e.target
                                            .value
                                    )
                                }
                                required
                            />

                            <input
                                type="password"
                                placeholder="Password"
                                value={
                                    password
                                }
                                onChange={(
                                    e
                                ) =>
                                    setPassword(
                                        e.target
                                            .value
                                    )
                                }
                                required
                            />

                            {authError && (
                                <p
                                    style={{
                                        color:
                                            "red",
                                    }}
                                >
                                    {
                                        authError
                                    }
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

                                setAuthError(
                                    ""
                                );
                            }}
                        >
                            {isRegister
                                ? "Login"
                                : "Create Account"}
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // =========================================
    // ROOM SELECTION SCREEN
    // =========================================

    if (!joinedRoom) {
        return (
            <>
                <Toaster
                    position="top-right"
                    theme="dark"
                    richColors
                    closeButton
                    toastOptions={{
                        style: {
                            background:
                                "#17120f",
                            border:
                                "1px solid rgba(253, 186, 116, 0.2)",
                            color:
                                "#fff7ed",
                        },
                    }}
                />

                <div className="container">
                    <h1>
                        SyncSpace
                    </h1>

                    <h2>
                        Welcome,{" "}
                        {user.name}
                    </h2>

                    <p>
                        Status:
                        {connected
                            ? " Connected"
                            : " Disconnected"}
                    </p>

                    <div className="room-box">
                        <h2>
                            Join a Room
                        </h2>

                        <form
                            onSubmit={
                                joinRoom
                            }
                        >
                            <input
                                type="text"
                                placeholder="Enter Room ID"
                                value={
                                    roomInput
                                }
                                onChange={(
                                    e
                                ) => {
                                    setRoomInput(
                                        e.target
                                            .value
                                    );

                                    setRoomError(
                                        ""
                                    );
                                }}
                                required
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

                        <input
                            type="text"
                            placeholder="Room Name (optional)"
                            value={
                                roomNameInput
                            }
                            onChange={(
                                e
                            ) => {
                                setRoomNameInput(
                                    e.target
                                        .value
                                );

                                setRoomError(
                                    ""
                                );
                            }}
                        />

                        <button
                            type="button"
                            onClick={
                                createRoom
                            }
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
                                    color:
                                        "red",
                                }}
                            >
                                {
                                    roomError
                                }
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={
                            logout
                        }
                    >
                        Logout
                    </button>
                </div>
            </>
        );
    }

    // =========================================
    // CURRENT USER / ACTIVE MEMBER
    // =========================================

    const currentUserId =
        getCurrentUserId();

    const activeMember =
        roomMembers.find(
            (member) =>
                String(
                    member._id ||
                    member.id
                ) ===
                String(
                    activeMemberId
                )
        );

    const isOwnWorkspace =
        String(
            activeMemberId
        ) ===
        String(
            currentUserId
        );

    // =========================================
    // ACTIVE EDITOR CODE
    // =========================================

    const activeEditorCode =
        memberCodes[
            String(
                activeMemberId
            )
        ] || "";

    // =========================================
    // ACTIVE LANGUAGE
    // =========================================

    const activeLanguage =
        memberLanguages[
            String(
                activeMemberId
            )
        ] ||
        "javascript";

    // =========================================
    // EDITOR SCREEN
    // =========================================

    return (
        <>
            <Toaster
                position="top-right"
                theme="dark"
                richColors
                closeButton
                toastOptions={{
                    style: {
                        background:
                            "#17120f",
                        border:
                            "1px solid rgba(253, 186, 116, 0.2)",
                        color:
                            "#fff7ed",
                    },
                }}
            />

            <div className="container">
                <h1>
                    SyncSpace
                </h1>

                <h3>
                    Welcome,{" "}
                    {user.name}
                </h3>

                <h3>
                    Room Name:{" "}
                    {roomName ||
                        "Untitled Room"}
                </h3>

                <div className="room-header">
                    <h3>
                        Room ID:{" "}
                        {roomId}
                    </h3>

                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(
                                    roomId
                                );

                                toast.success(
                                    "Room ID copied"
                                );
                            } catch (error) {
                                console.error(
                                    "COPY ROOM ID ERROR:",
                                    error
                                );

                                toast.error(
                                    "Unable to copy Room ID"
                                );
                            }
                        }}
                    >
                        Copy Room ID
                    </button>
                </div>

                <p>
                    Status:
                    {connected
                        ? " Connected"
                        : " Disconnected"}
                </p>

                <p>
                    Users Online:{" "}
                    {usersOnline}
                </p>

                <div
                    className="member-tabs"
                    style={{
                        display:
                            "flex",
                        gap: "8px",
                        flexWrap:
                            "wrap",
                        margin:
                            "16px 24px",
                    }}
                >
                    {roomMembers.map(
                        (member) => {
                            const memberId =
                                String(
                                    member._id ||
                                    member.id
                                );

                            const isActive =
                                memberId ===
                                String(
                                    activeMemberId
                                );

                            const isCurrentUser =
                                memberId ===
                                String(
                                    currentUserId
                                );

                            return (
                                <button
                                    key={
                                        memberId
                                    }
                                    type="button"
                                    onClick={() =>
                                        selectMember(
                                            memberId
                                        )
                                    }
                                    style={{
                                        background:
                                            isActive
                                                ? "linear-gradient(135deg, #f97316, #fb923c)"
                                                : "#211712",

                                        borderColor:
                                            isActive
                                                ? "#fb923c"
                                                : "rgba(253,186,116,0.13)",

                                        color:
                                            "#fff7ed",
                                    }}
                                >
                                    {
                                        member.name ||
                                        "Member"
                                    }

                                    {isCurrentUser &&
                                        " (You)"}
                                </button>
                            );
                        }
                    )}
                </div>

                <h3
                    style={{
                        margin:
                            "8px 24px",
                        color:
                            "#fdba74",
                    }}
                >
                    {
                        activeMember?.name ||
                        "Member"
                    }'s Workspace
                </h3>

                <p
                    style={{
                        margin:
                            "0 24px 12px",
                        color:
                            "#a8a29e",
                    }}
                >
                    {isOwnWorkspace
                        ? "You can edit this workspace."
                        : "This workspace is read-only."}
                </p>

                <div
                    className="editor-toolbar"
                >
                    <div
                        className="editor-toolbar-left"
                    >
                        <label
                            htmlFor="language-select"
                        >
                            Language
                        </label>

                        <select
                            id="language-select"
                            value={
                                activeLanguage
                            }
                            onChange={
                                handleLanguageChange
                            }
                            disabled={
                                !activeMemberId
                            }
                        >
                            {LANGUAGES.map(
                                (
                                    language
                                ) => (
                                    <option
                                        key={
                                            language.id
                                        }
                                        value={
                                            language.id
                                        }
                                    >
                                        {
                                            language.label
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div
                        className="editor-toolbar-right"
                    >
                        <span>
                            {
                                LANGUAGES.find(
                                    (
                                        language
                                    ) =>
                                        language.id ===
                                        activeLanguage
                                )?.label ||
                                "JavaScript"
                            }
                        </span>
                    </div>
                </div>

                <div className="room-members">
                    <h3>
                        Room Members
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
                                    String(
                                        member._id ||
                                        member.id
                                    );

                                const isCurrentUser =
                                    memberId ===
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
                                        onClick={() =>
                                            selectMember(
                                                memberId
                                            )
                                        }
                                        style={{
                                            cursor:
                                                "pointer",
                                        }}
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
                    type="button"
                    onClick={
                        leaveRoom
                    }
                    disabled={
                        roomLoading
                    }
                >
                    Leave Room
                </button>

                <button
                    type="button"
                    onClick={
                        logout
                    }
                    style={{
                        marginLeft:
                            "10px",
                    }}
                >
                    Logout
                </button>

                <Editor
                    height="500px"
                    language={
                        activeLanguage
                    }
                    value={
                        activeEditorCode
                    }
                    onChange={
                        isOwnWorkspace
                            ? handleEditorChange
                            : undefined
                    }
                    theme="vs-dark"
                    options={{
                        minimap: {
                            enabled:
                                false,
                        },
                        fontSize: 16,
                        automaticLayout:
                            true,
                        readOnly:
                            !isOwnWorkspace,
                        smoothScrolling:
                            true,
                        scrollBeyondLastLine:
                            false,
                        padding: {
                            top: 12,
                            bottom: 12,
                        },
                    }}
                />
            </div>
        </>
    );
}

export default App;