const Room = require("../../models/Room")
const User = require("../../models/User")
const UserSession = require("../../models/UserSession")
const { cricketPlayers } = require("../../data/players")

const roomHandlers = (io, socket) => {
  const joinRoom = async ({ roomCode, username, userId }) => {
    try {
      console.log(`\n=== JOIN ROOM REQUEST ===`)
      console.log(`User: ${username} (${userId})`)
      console.log(`Room: ${roomCode}`)
      console.log(`Socket: ${socket.id}`)

      const room = await Room.findOne({ code: roomCode })
      if (!room) {
        console.log(`❌ Room ${roomCode} not found`)
        socket.emit("error", { message: "Room not found" })
        return
      }

      console.log(`📋 Room found. Current state:`)
      console.log(`  - Users: ${room.users.length}`)
      console.log(`  - Host: ${room.host}`)
      console.log(`  - Started: ${room.isStarted}`)

      const existingUserIndex = room.users.findIndex((user) => user.userId?.toString() === userId)

      if (existingUserIndex !== -1) {
        console.log(`🔄 User ${username} reconnecting to room ${roomCode}`)

        const existingUser = room.users[existingUserIndex]
        const oldSocketId = existingUser.id
        existingUser.id = socket.id
        existingUser.disconnected = false

        if (room.selectedPlayers.has(oldSocketId)) {
          const oldPlayers = room.selectedPlayers.get(oldSocketId)
          room.selectedPlayers.delete(oldSocketId)
          room.selectedPlayers.set(socket.id, oldPlayers)
          console.log(`🔄 Moved selected players from ${oldSocketId} to ${socket.id}`)
        } else {
          room.selectedPlayers.set(socket.id, [])
        }

        if (room.isStarted && room.turnOrder) {
          const turnIndex = room.turnOrder.findIndex((id) => id === oldSocketId)
          if (turnIndex !== -1) {
            room.turnOrder[turnIndex] = socket.id
            console.log(`🔄 Updated turn order: ${oldSocketId} -> ${socket.id}`)
          }
        }

        if (room.host === oldSocketId) {
          room.host = socket.id
          console.log(`👑 Updated host: ${oldSocketId} -> ${socket.id}`)
        }
      } else {
        if (room.users.find((user) => user.username === username && user.userId?.toString() !== userId)) {
          console.log(`❌ Username ${username} already taken`)
          socket.emit("error", { message: "Username already taken" })
          return
        }

        const newUser = {
          id: socket.id,
          userId,
          username,
          selectedPlayers: [],
          disconnected: false,
        }

        room.users.push(newUser)
        room.selectedPlayers.set(socket.id, [])

        console.log(`✅ Added new user ${username} to room ${roomCode}`)
      }

      const currentHost = room.users.find((u) => u.id === room.host && !u.disconnected)
      if (!room.host || !currentHost) {
        const firstActiveUser = room.users.find((u) => !u.disconnected)
        if (firstActiveUser) {
          room.host = firstActiveUser.id
          console.log(
            `👑 ${firstActiveUser.username} is now the host of room ${roomCode} (socket: ${firstActiveUser.id})`,
          )
        }
      }

      await UserSession.findOneAndUpdate(
        { userId },
        {
          socketId: socket.id,
          userId,
          roomCode,
          username,
        },
        { upsert: true, new: true },
      )

      await room.save()
      socket.join(roomCode)

      const activeUsers = room.users.filter((u) => !u.disconnected)

      console.log(`✅ User ${username} successfully joined room ${roomCode}`)
      console.log(`📊 Room stats:`)
      console.log(`  - Active users: ${activeUsers.length}`)
      console.log(`  - Host: ${room.users.find((u) => u.id === room.host)?.username || "None"} (${room.host})`)
      console.log(`  - Current socket: ${socket.id}`)
      console.log(`  - Is host: ${room.host === socket.id}`)

      io.to(roomCode).emit("user-joined", {
        users: activeUsers,
        host: room.host,
      })

      socket.emit("room-joined", {
        room: {
          code: room.code,
          users: activeUsers,
          host: room.host,
          isStarted: room.isStarted,
          availablePlayers: room.availablePlayers,
          selectedPlayers: Object.fromEntries(room.selectedPlayers),
          currentPlayer: room.isStarted ? room.turnOrder[room.currentTurn] : null,
          turnStartTime: room.turnStartTime,
        },
      })

      console.log(`=== JOIN ROOM COMPLETE ===\n`)
    } catch (error) {
      console.error("❌ Error joining room:", error)
      socket.emit("error", { message: "Failed to join room" })
    }
  }

  const rejoinRoom = async ({ roomCode, userId }) => {
    try {
      console.log(`🔄 User ${userId} attempting to rejoin room ${roomCode}`)

      const room = await Room.findOne({ code: roomCode })
      if (!room) {
        socket.emit("error", { message: "Room not found" })
        return
      }

      const user = await User.findById(userId)
      if (!user) {
        socket.emit("error", { message: "User not found" })
        return
      }

      const existingUser = room.users.find((u) => u.userId?.toString() === userId)
      if (!existingUser) {
        socket.emit("error", { message: "You were not in this room" })
        return
      }

      await joinRoom({ roomCode, username: user.username, userId })
    } catch (error) {
      console.error("❌ Error rejoining room:", error)
      socket.emit("error", { message: "Failed to rejoin room" })
    }
  }

  return {
    joinRoom,
    rejoinRoom,
  }
}

module.exports = roomHandlers


