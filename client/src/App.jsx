import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import socket from "./socket";
import "./App.css";

function App() {
    const [connected, setConnected] = useState(false);
    const [code, setCode] = useState("");
    const [usersOnline, setUsersOnline] = useState(0);

    const [roomId, setRoomId] = useState("");
    const [roomInput, setRoomInput] = useState("");
    const [joinedRoom, setJoinedRoom] = useState(false);

    const ydocRef = useRef(null);
    const ytextRef = useRef(null);
    const roomIdRef = useRef("");

    // =====================================
    // CREATE YJS DOCUMENT
    // =====================================
    useEffect(() => {
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText("code");

        ydocRef.current = ydoc;
        ytextRef.current = ytext;

        // =====================================
        // SOCKET CONNECT
        // =====================================
        const handleConnect = () => {
            console.log(
                "Socket Connected:",
                socket.id
            );

            setConnected(true);
        };

        // =====================================
        // SOCKET DISCONNECT
        // =====================================
        const handleDisconnect = () => {
            console.log(
                "Socket Disconnected"
            );

            setConnected(false);
        };

        // =====================================
        // USERS ONLINE
        // =====================================
        const handleRoomUsers = (count) => {
            console.log(
                "Users Online:",
                count
            );

            setUsersOnline(count);
        };

        // =====================================
        // NORMAL CODE UPDATE
        // =====================================
        const handleCodeUpdate = (updatedCode) => {
            console.log(
                "Received Code:",
                updatedCode
            );

            setCode(updatedCode);
        };

        // =====================================
        // RECEIVE YJS UPDATE
        // =====================================
        const handleYjsUpdate = (update) => {
            console.log(
                "Received Yjs update"
            );

            const uint8Array =
                new Uint8Array(update);

            // Apply remote update.
            // "remote" prevents it from being
            // sent back to the server.
            Y.applyUpdate(
                ydoc,
                uint8Array,
                "remote"
            );

            setCode(
                ytext.toString()
            );
        };

        // =====================================
        // SEND LOCAL YJS UPDATE
        // =====================================
        const handleYjsLocalUpdate = (
            update,
            origin
        ) => {
            // Ignore updates received
            // from another user.
            if (origin !== "local") {
                return;
            }

            const currentRoomId =
                roomIdRef.current;

            if (!currentRoomId) {
                return;
            }

            const updateArray =
                Array.from(update);

            socket.emit(
                "yjs-update",
                {
                    roomId: currentRoomId,
                    update: updateArray
                }
            );

            console.log(
                "Yjs update sent"
            );
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
            "code-update",
            handleCodeUpdate
        );

        socket.on(
            "yjs-update",
            handleYjsUpdate
        );

        // =====================================
        // YJS LISTENER
        // =====================================
        ydoc.on(
            "update",
            handleYjsLocalUpdate
        );

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

    // =====================================
    // JOIN ROOM
    // =====================================
    const joinRoom = () => {
        const trimmedRoomId =
            roomInput.trim();

        if (!trimmedRoomId) {
            alert(
                "Please enter a Room ID"
            );

            return;
        }

        // Leave previous room
        if (roomId) {
            socket.emit(
                "leave-room",
                roomId
            );
        }

        // Store current room
        roomIdRef.current =
            trimmedRoomId;

        // Join new room
        socket.emit(
            "join-room",
            trimmedRoomId
        );

        setRoomId(
            trimmedRoomId
        );

        setJoinedRoom(true);

        setUsersOnline(0);

        console.log(
            "Joined Room:",
            trimmedRoomId
        );
    };

    // =====================================
    // CREATE ROOM
    // =====================================
    const createRoom = () => {
        const newRoomId =
            Date.now().toString();

        setRoomInput(
            newRoomId
        );

        // Store current room
        roomIdRef.current =
            newRoomId;

        setRoomId(
            newRoomId
        );

        setJoinedRoom(true);

        setUsersOnline(0);

        socket.emit(
            "join-room",
            newRoomId
        );

        console.log(
            "Created Room:",
            newRoomId
        );
    };

    // =====================================
    // EDITOR CHANGE
    // =====================================
    const handleEditorChange = (
        value
    ) => {
        const newCode =
            value || "";

        setCode(
            newCode
        );

        const ydoc =
            ydocRef.current;

        const ytext =
            ytextRef.current;

        if (!ydoc || !ytext) {
            return;
        }

        // Update Yjs document
        ydoc.transact(
            () => {
                // Remove old text
                ytext.delete(
                    0,
                    ytext.length
                );

                // Insert new text
                if (newCode.length > 0) {
                    ytext.insert(
                        0,
                        newCode
                    );
                }
            },
            "local"
        );
    };

    // =====================================
    // ROOM SELECTION SCREEN
    // =====================================
    if (!joinedRoom) {
        return (
            <div className="container">

                <h1>
                    SyncSpace 🚀
                </h1>

                <p>
                    Real-Time Collaborative
                    Code Editor
                </p>

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
                        onChange={(e) =>
                            setRoomInput(
                                e.target.value
                            )
                        }
                    />

                    <button
                        onClick={joinRoom}
                    >
                        Join Room
                    </button>

                    <p>
                        OR
                    </p>

                    <button
                        onClick={createRoom}
                    >
                        Create New Room
                    </button>

                </div>

            </div>
        );
    }

    // =====================================
    // CODE EDITOR SCREEN
    // =====================================
    return (
        <div className="container">

            <h1>
                SyncSpace 🚀
            </h1>

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
                        enabled: false
                    },
                    fontSize: 16,
                    automaticLayout: true
                }}
            />

        </div>
    );
}

export default App;