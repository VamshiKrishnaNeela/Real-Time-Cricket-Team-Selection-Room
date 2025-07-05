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

mongoose.set("strictQuery", false)

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin:"*",
    methods: ["GET", "POST","PUT","PATCH"],
  },
})

app.use(cors())
app.use(express.json())

connectDB()

initializeSocket(io)

app.use("/api/auth", authRoutes)

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

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

async function cleanupExpiredData() {
  try {
    const activeRooms = await Room.find({}, "code")
    console.log(`Active rooms: ${activeRooms.length}`)
  } catch (error) {
    console.error("Error during cleanup:", error)
  }
}

setInterval(cleanupExpiredData, 10 * 60 * 1000)

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...")
  await mongoose.connection.close()
  server.close(() => {
    console.log("Server closed")
    process.exit(0)
  })
})

app.get("/", (req, res) => {
    res.send("🚀 Welcome to Cricket-Team-Selection Backend");
});

const PORT =  5000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})