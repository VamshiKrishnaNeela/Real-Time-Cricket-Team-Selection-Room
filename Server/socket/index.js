const jwt = require("jsonwebtoken")
const roomHandlers = require("./handlers/roomHandlers")
const gameHandlers = require("./handlers/gameHandlers")
const disconnectHandler = require("./handlers/disconnectHandler")
// require('dotenv').config();

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) {
      console.log("❌ No token provided in socket auth")
      return next(new Error("Authentication error"))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret")
    socket.userId = decoded.userId
    console.log(`✅ Socket authenticated for user: ${decoded.userId}`)
    next()
  } catch (error) {
    console.log("❌ Socket authentication failed:", error.message)
    next(new Error("Authentication error"))
  }
}

const initializeSocket = (io) => {
  io.use(socketAuth)

  io.on("connection", (socket) => {
    console.log(`\n🔌 User connected: ${socket.id} | User ID: ${socket.userId}`)

    const roomHandler = roomHandlers(io, socket)
    const gameHandler = gameHandlers(io, socket)
    const handleDisconnect = disconnectHandler(io, socket)

    // Room events
    socket.on("join-room", (data) => {
      console.log(`📥 join-room event received from ${socket.id}:`, data)
      roomHandler.joinRoom(data)
    })

    socket.on("rejoin-room", (data) => {
      console.log(`📥 rejoin-room event received from ${socket.id}:`, data)
      roomHandler.rejoinRoom(data)
    })

    // Game events
    socket.on("start-selection", (data) => {
      console.log(`📥 start-selection event received from ${socket.id}`)
      gameHandler.startSelection(data)
    })

    socket.on("select-player", (data) => {
      console.log(`📥 select-player event received from ${socket.id}:`, data)
      gameHandler.selectPlayer(data)
    })

    // Disconnect event
    socket.on("disconnect", (reason) => {
      console.log(`❌ User ${socket.id} disconnected: ${reason}`)
      handleDisconnect()
    })

    // Error handling
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error)
    })
  })

  io.on("connect_error", (error) => {
    console.error("❌ Socket.IO connection error:", error)
  })
}

module.exports = initializeSocket
