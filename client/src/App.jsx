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

    // Create Yjs document only once
    useEffect(() => {
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText("code");

        ydocRef.current = ydoc;
        ytextRef.current = ytext;

        // Socket connected
        const handleConnect = () => {
            console.log("Socket Connected:", socket.id);
            setConnected(true);
        };

        // Socket disconnected
        const handleDisconnect = () => {
            console.log("Socket Disconnected");
            setConnected(false);
        };

        // Users online count
        const handleRoomUsers = (count) => {
            console.log("Users Online:", count);
            setUsersOnline(count);
        };

        // Receive normal code update
        const handleCodeUpdate = (updatedCode) => {
            console.log("Received Code:", updatedCode);

            setCode(updatedCode);
        };

        // Receive Yjs update
        const handleYjsUpdate = (update) => {
            console.log("Received Yjs update");

            const uint8Array = new Uint8Array(update);

            Y.applyUpdate(ydoc, uint8Array);

            setCode(ytext.toString());
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("room-users", handleRoomUsers);
        socket.on("code-update", handleCodeUpdate);
        socket.on("yjs-update", handleYjsUpdate);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("room-users", handleRoomUsers);
            socket.off("code-update", handleCodeUpdate);
            socket.off("yjs-update", handleYjsUpdate);

            ydoc.destroy();
        };
    }, []);

    // Join a room
  const joinRoom = () => {
    const trimmedRoomId = roomInput.trim();

    if (!trimmedRoomId) {
        alert("Please enter a Room ID");
        return;
    }

    // Leave previous room if already joined
    if (roomId) {
        socket.emit("leave-room", roomId);
    }

    // Join new room
    socket.emit("join-room", trimmedRoomId);

    setRoomId(trimmedRoomId);
    setJoinedRoom(true);
    setUsersOnline(0);

    console.log(
        "Joined Room:",
        trimmedRoomId
    );
};

    // Create a new room
    const createRoom = () => {
        const newRoomId =
            Date.now().toString();

        setRoomInput(newRoomId);
        setRoomId(newRoomId);
        setJoinedRoom(true);
        setUsersOnline(0);

        socket.emit("join-room", newRoomId);

        console.log(
            "Created Room:",
            newRoomId
        );
    };

    // Editor change
    const handleEditorChange = (value) => {
        const newCode = value || "";

        setCode(newCode);

        // Update Yjs document
        const ydoc = ydocRef.current;
        const ytext = ytextRef.current;

        if (ydoc && ytext) {
            ydoc.transact(() => {
                ytext.delete(
                    0,
                    ytext.length
                );

                ytext.insert(
                    0,
                    newCode
                );
            });
        }

        // Send code update to room
        if (roomId) {
            socket.emit("code-change", {
                roomId,
                code: newCode
            });
        }
    };

    // Room selection screen
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

    // Code editor screen
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
                👥 Users Online: {usersOnline}
            </p>

            <Editor
                height="500px"
                defaultLanguage="javascript"
                value={code}
                onChange={handleEditorChange}
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