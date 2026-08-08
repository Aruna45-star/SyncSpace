import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import socket from "./socket";
import "./App.css";

function App() {
    const [connected, setConnected] = useState(false);
    const [code, setCode] = useState("");
    const [usersOnline, setUsersOnline] = useState(0);

    const roomId = "1786112169244";

    useEffect(() => {
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText("code");

        // Socket connected
        socket.on("connect", () => {
            console.log("Socket Connected:", socket.id);

            setConnected(true);

            socket.emit("join-room", roomId);
        });

        // Users online count
        socket.on("room-users", (count) => {
            console.log("Users Online:", count);

            setUsersOnline(count);
        });

        // Receive code from another user
        socket.on("code-update", (updatedCode) => {
            console.log("Received Code:", updatedCode);

            ytext.delete(0, ytext.length);
            ytext.insert(0, updatedCode);

            setCode(updatedCode);
        });

        // Receive Yjs update
        socket.on("yjs-update", (update) => {
            console.log("Received Yjs update");

            const uint8Array = new Uint8Array(update);

            Y.applyUpdate(ydoc, uint8Array);

            setCode(ytext.toString());
        });

        // Send Yjs updates
        const updateHandler = (update) => {
            const updateArray = Array.from(update);

            socket.emit("yjs-update", {
                roomId,
                update: updateArray
            });

            setCode(ytext.toString());
        };

        ydoc.on("update", updateHandler);

        return () => {
            socket.off("connect");
            socket.off("room-users");
            socket.off("code-update");
            socket.off("yjs-update");

            ydoc.off("update", updateHandler);
            ydoc.destroy();
        };
    }, []);

    const handleEditorChange = (value) => {
        const newCode = value || "";

        setCode(newCode);

        // Update Yjs document
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText("code");

        ytext.insert(0, newCode);

        // Existing Socket.io code synchronization
        socket.emit("code-change", {
            roomId,
            code: newCode
        });

        ydoc.destroy();
    };

    return (
        <div className="container">

            <h1>SyncSpace 🚀</h1>

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