const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const axios = require('axios');
const dotenv = require('dotenv');
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions/Actions");

const server = http.createServer(app);
const io = new Server(server);

dotenv.config({ path: "./config.env" });
// Body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


// app.use(express.static("build"));
// app.use((req, res, next) => {
//     res.sendFile(path.join(__dirname, "build", "index.html"));
// });

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on("connection", (socket) => {
    // console.log("socket connected", socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on("disconnecting", () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

app.post("/runCode", async (req, res) => {
    const payload = req.body;
    // console.log(payload);
    const output_of_code = await RunCode(payload)
    res.status(200).json(output_of_code);
});

app.get("/runCode",  (req, res) => {
    
    res.status(200).json({name:"bharat"});
});


// for deployment 

app.use(express.static(path.join(__dirname, "./build")));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "./build/index.html"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));





const RunCode = async (codeInfo) => {

    const options = {
        headers: {
            Authorization: `Token ${process.env.GLOT_TOKEN}`,
            "content-type": "application/json",
        },
    };
    try{
        const { data } = await axios.post(
            "https://glot.io/api/run/cpp/latest",
            codeInfo,
            options
        );
        return data;
    }
    catch(err){
        console.log(err);
        return {error:err};
    }
    /*
    {
        "stdout": "",
        "error": "Exit code: 1",
        "stderr": "Traceback (most recent call last):\n  File \"/home/glot/main.py\", line 1, in <module>\n    pint('the Input is :', input('Number from stdin: '))\nNameError: name 'pint' is not defined\n"
    },
    {
        "stdout": "Number from stdin: the Input is : 55\n",
        "error": "",
        "stderr": ""
    }
    */
};
