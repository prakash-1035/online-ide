import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import ACTIONS from "../Actions/Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../Actions/socket";
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from "react-router-dom";

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);

    const [stdin, setStdin] = useState("");
    const [stdout, setStdout] = useState("");

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on("connect_error", (err) => handleErrors(err));
            socketRef.current.on("connect_failed", (err) => handleErrors(err));

            function handleErrors(e) {
                console.log("socket error", e);
                toast.error("Socket connection failed, try again later.");
                reactNavigator("/");
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                        console.log(`${username} joined`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
        };
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
        };
    }, []);

    const RunCode = async () => {
        const codeInfo = {
            stdin: stdin,
            files: [
                {
                    name: "main.cpp",
                    content: codeRef.current,
                },
            ],
        };
        const { data } = await axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/runCode`,
            codeInfo,
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        console.log(data);

        if (data.error === "") {
            setStdout(data?.stdout);
        } else {
            setStdout(data?.stderr);
        }
    };
    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success("Room ID has been copied to your clipboard");
        } catch (err) {
            toast.error("Could not copy the Room ID");
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator("/");
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap row me-2">
            <div className="col-6 col-md-4 col-lg-3 col-xl-2">
                <div className="aside">
                    <div className="asideInner">
                        <div className="logo">
                            <img
                                className="logoImage"
                                src="/code-logo.png"
                                alt="logo"
                            />
                        </div>
                        <div className="row">
                            <button
                                className="btn btn-info ms-2 mb-3"
                                style={{ display: "inline", width: "120px" }}
                                onClick={RunCode}
                            >
                                Run Code
                            </button>
                        </div>
                        <h3>Connected</h3>
                        <div className="clientsList">
                            {clients.map((client) => (
                                <Client
                                    key={client.socketId}
                                    username={client.username}
                                />
                            ))}
                        </div>
                    </div>
                    <button className="btn copyBtn" onClick={copyRoomId}>
                        Copy ROOM ID
                    </button>
                    <button className="btn leaveBtn" onClick={leaveRoom}>
                        Leave
                    </button>
                </div>
            </div>
            <div className="col-6 col-md-8 col-lg-9 col-xl-10">
                <div className="row">
                    <div className="col-12 col-lg-8 editor">
                        {/*Alert for language support*/}

                        <div
                            className="alert alert-warning alert-dismissible fade show"
                            role="alert"
                        >
                            <strong>Note: </strong>Currently Our Website only
                            support C++ Code to run.
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="alert"
                                aria-label="Close"
                            ></button>
                        </div>
                        <p
                            className="fw-bold ms-2 mt-2"
                            style={{ color: "white" }}
                        >
                            Lanuage : C++
                        </p>
                        <Editor
                            socketRef={socketRef}
                            roomId={roomId}
                            onCodeChange={(code) => {
                                codeRef.current = code;
                            }}
                        />
                    </div>
                    <div className="col-12 col-lg-4 stdio">
                        <div className="row stdin-stdout">
                        <div className="stdin-box">
                            <p style={{ color: "white" }}>Input</p>
                            <textarea
                                name=""
                                id=""
                                style={{
                                    width: "100%",
                                    height: "80%",
                                    fontFamily: "Consolas",
                                }}
                                value={stdin}
                                onChange={(e) => {
                                    setStdin(e.target.value);
                                }}
                            ></textarea>
                        </div>
                        <div className="stdout-box">
                            <p style={{ color: "white" }}>Output</p>
                            <textarea
                                name=""
                                id=""
                                readOnly
                                style={{
                                    width: "100%",
                                    height: "80%",
                                    fontFamily: "Consolas",
                                }}
                                value={stdout}
                                onChange={(e) => {
                                    setStdout(e.target.value);
                                }}
                            ></textarea>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorPage;
