const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { HumanMessage } = require("@langchain/core")
const agent = require("./../agent/agent")


async function initSocketServer(httpserver) {
    const io = new Server(httpserver)

    io.use((socket, next) => {

        const cookies = socket.handshake.headers?.cookie;
        if (!cookies) {
            return next(new Error("Authentication error"))
        }

        const parsedCookies = cookie.parse(cookies || "");
        const accessToken = parsedCookies.accessToken;


        if (!accessToken) {
            return next(new Error("Authentication error"))
        }
        try {
            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
            if (!decoded) {
                return next(new Error("Authentication error"))
            }


            socket.user = decoded;
            socket.user.accessToken = accessToken

            next();
        } catch (err) {
            console.error("JWT verification error:", err);
            return next(new Error("Authentication error"))
        }
    })


    io.on("connection", (socket) => {
        socket.on("message", async (data) => {
            const respone = await agent.invoke({
                messages: [{

                    role: "user",
                    content: data

                }
                ]
            }, {
                metadata: {
                    accessToken: socket.user.accessToken
                }, configurable: {
                    thread_id: socket.user.id
                }
            })

            socket.emit("Airesponse", respone.messages[respone.messages.length - 1].content);


        })
    })

}

module.exports = {
    initSocketServer
}
