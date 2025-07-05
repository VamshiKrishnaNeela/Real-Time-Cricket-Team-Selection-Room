const express = require("express")
const http = require("server")
const socketIo = require("socket.io")
const mongoose = require("mongoose")
const connectDB = require("./config/database")
const initializeSocket = require("./socket")
const authRoutes = require("./routes/auth")
const Room = require("./models/Room")
const { cricketPlayers } = require("./data/players")

// Disable mongoose warnings
mongoose.set("strictQuery", false)

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: ["https://cricket-team-two.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://cricket-team-two.vercel.app")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
  res.header("Access-Control-Allow-Credentials", "true")

  if (req.method === "OPTIONS") {
    res.sendStatus(200)
  } else {
    next()
  }
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Connect to MongoDB
connectDB()

// Initialize Socket.IO
initializeSocket(io)

// Routes
app.use("/api/auth", authRoutes)

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🏏 Cricket Team Selection Server is running!",
    status: "healthy",
    timestamp: new Date().toISOString(),
    socketConnections: io.engine.clientsCount,
    platform: "Railway/Render",
  })
})

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// REST API endpoints
app.post("/api/create-room", async (req, res) => {
  try {
    let roomCode
    let attempts = 0
    const maxAttempts = 10

    do {
      roomCode = generateRoomCode()
      attempts++
      if (attempts > maxAttempts) {
        throw new Error("Failed to generate unique room code")
      }
    } while (await Room.findOne({ code: roomCode }))

    const room = new Room({
      code: roomCode,
      host: null,
      users: [],
      availablePlayers: [...cricketPlayers],
      selectedPlayers: new Map(),
      turnOrder: [],
      currentTurn: 0,
      isStarted: false,
      round: 1,
      maxPlayersPerUser: 5,
    })

    await room.save()
    console.log(`Room created successfully: ${roomCode}`)

    res.json({
      success: true,
      roomCode,
      message: "Room created successfully",
    })
  } catch (error) {
    console.error("Error creating room:", error)
    res.status(500).json({
      success: false,
      error: "Failed to create room",
      details: error.message,
    })
  }
})

app.get("/api/room/:code", async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code })
    if (!room) {
      return res.status(404).json({ error: "Room not found" })
    }

    res.json({
      code: room.code,
      users: room.users,
      isStarted: room.isStarted,
      availablePlayers: room.availablePlayers,
      selectedPlayers: Object.fromEntries(room.selectedPlayers),
    })
  } catch (error) {
    console.error("Error fetching room:", error)
    res.status(500).json({ error: "Failed to fetch room" })
  }
})

app.get("/api/active-rooms", async (req, res) => {
  try {
    const rooms = await Room.find({}, "code users isStarted")
    const roomsData = rooms.map((room) => ({
      code: room.code,
      userCount: room.users.length,
      isStarted: room.isStarted,
    }))

    res.json(roomsData)
  } catch (error) {
    console.error("Error fetching active rooms:", error)
    res.status(500).json({ error: "Failed to fetch active rooms" })
  }
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🔗 Socket.IO enabled with WebSocket and polling`)
  console.log(`🌐 CORS enabled for production client`)
})
