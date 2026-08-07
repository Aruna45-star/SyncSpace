import { useEffect, useState } from "react";
import socket from "./socket";
import "./App.css";


function App() {

  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState("");

  const roomId = "1786112169244";


  useEffect(() => {

    // Socket connect
    socket.on("connect", () => {

      console.log(
        "Socket Connected:",
        socket.id
      );

      setConnected(true);


      // Join Room
      socket.emit(
        "join-room",
        roomId
      );

    });


    // Receive code from other users
    socket.on(
      "code-update",
      (updatedCode) => {

        console.log(
          "Received Code:",
          updatedCode
        );

        setCode(updatedCode);

      }
    );


    // Cleanup
    return () => {

      socket.off("connect");

      socket.off(
        "code-update"
      );

    };


  }, []);



  const handleCodeChange = (e) => {

    const value = e.target.value;

    setCode(value);


    // Send code to room
    socket.emit(
      "code-change",
      {
        roomId,
        code: value
      }
    );

  };



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
        {
          connected
          ? " 🟢 Connected"
          : " 🔴 Disconnected"
        }
      </p>



      <textarea

        value={code}

        onChange={
          handleCodeChange
        }

        placeholder="Write code here..."

        rows="20"

        cols="80"

      />

    </div>

  );

}


export default App;