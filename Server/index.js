const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")
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

// Configure Socket.IO for Vercel
const io = socketIo(server, {
  cors: {
    origin: ["https://cricket-team-two.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Vercel-specific configuration
  transports: ["polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8,
  allowRequest: (req, callback) => {
    const origin = req.headers.origin
    const allowedOrigins = ["https://cricket-team-two.vercel.app", "http://localhost:3000"]

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.log("❌ Origin not allowed:", origin)
      callback(new Error("Not allowed by CORS"), false)
    }
  },
})

app.use(
  cors({
    origin: ["https://cricket-team-two.vercel.app", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

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
    transport: "polling",
    socketConnections: io.engine.clientsCount,
  })
})

// Socket.IO health check
app.get("/socket-health", (req, res) => {
  res.json({
    socketIO: "active",
    connectedClients: io.engine.clientsCount,
    transport: "polling",
    timestamp: new Date().toISOString(),
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

    // Generate unique room code
    do {
      roomCode = generateRoomCode()
      attempts++

      if (attempts > maxAttempts) {
        throw new Error("Failed to generate unique room code")
      }
    } while (await Room.findOne({ code: roomCode }))

    const room = new Room({
      code: roomCode,
      host: null, // Will be set when first user joins
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

// Cleanup function for expired data
async function cleanupExpiredData() {
  try {
    const activeRooms = await Room.find({}, "code")
    console.log(`Active rooms: ${activeRooms.length}`)
  } catch (error) {
    console.error("Error during cleanup:", error)
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredData, 10 * 60 * 1000)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err)
  res.status(500).json({ error: "Internal server error" })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...")
  await mongoose.connection.close()
  server.close(() => {
    console.log("Server closed")
    process.exit(0)
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🔗 Socket.IO configured for polling transport`)
  console.log(`🌐 CORS enabled for production client`)
})

// Export for Vercel
module.exports = app
