const Room = require("../../models/Room")
const User = require("../../models/User")
const UserSession = require("../../models/UserSession")

const gameHandlers = (io, socket) => {
  const startSelection = async () => {
    try {
      const session = await UserSession.findOne({ socketId: socket.id })
      if (!session) return

      const room = await Room.findOne({ code: session.roomCode })
      if (!room || room.host !== socket.id || room.isStarted) return

      room.isStarted = true
      room.turnOrder = shuffleArray(room.users.map((u) => u.id))
      room.currentTurn = 0
      room.turnStartTime = new Date()

      await room.save()

      io.to(session.roomCode).emit("selection-started", {
        turnOrder: room.turnOrder.map((id) => {
          const user = room.users.find((u) => u.id === id)
          return { id, username: user.username }
        }),
        currentPlayer: room.turnOrder[0],
        turnStartTime: room.turnStartTime,
      })

      startTurnTimer(session.roomCode, room.turnOrder[0])
    } catch (error) {
      console.error("Error starting selection:", error)
    }
  }

  const selectPlayer = async ({ playerId }) => {
    try {
      const session = await UserSession.findOne({ socketId: socket.id })
      if (!session) {
        console.log("No session found for socket:", socket.id)
        return
      }

      const room = await Room.findOne({ code: session.roomCode })
      if (!room || !room.isStarted) {
        console.log("Room not found or not started")
        return
      }

      const currentPlayerId = room.turnOrder[room.currentTurn]
      if (currentPlayerId !== socket.id) {
        console.log("Not current player's turn")
        return
      }

      const userSelectedPlayers = room.selectedPlayers.get(socket.id) || []
      if (userSelectedPlayers.length >= room.maxPlayersPerUser) {
        socket.emit("error", { message: `You have already selected ${room.maxPlayersPerUser} players` })
        console.log(`User ${socket.id} tried to select more than ${room.maxPlayersPerUser} players`)
        return
      }

      const player = room.availablePlayers.find((p) => p.id === playerId)
      if (!player) {
        console.log("Player not found in available players")
        return
      }

      // Remove player from available pool
      room.availablePlayers = room.availablePlayers.filter((p) => p.id !== playerId)

      // Add to user's selected players
      const currentSelected = room.selectedPlayers.get(socket.id) || []
      room.selectedPlayers.set(socket.id, [...currentSelected, player])

      // Clear timer
      await clearTurnTimer(session.roomCode)

      await room.save()

      console.log(`Player ${player.name} selected by ${socket.id}`)

      io.to(session.roomCode).emit("player-selected", {
        player,
        selectedBy: socket.id,
        selectedPlayers: Object.fromEntries(room.selectedPlayers),
        availablePlayers: room.availablePlayers,
      })

      // Move to next turn
      nextTurn(session.roomCode)
    } catch (error) {
      console.error("Error selecting player:", error)
    }
  }

  const startTurnTimer = async (roomCode, currentPlayerId) => {
    try {
      const timerId = setTimeout(async () => {
        await autoSelectPlayer(roomCode, currentPlayerId)
      }, 10000) // 10 seconds

      // Store timer reference
      global.roomTimers = global.roomTimers || new Map()
      global.roomTimers.set(roomCode, timerId)
    } catch (error) {
      console.error("Error starting timer:", error)
    }
  }

  const clearTurnTimer = async (roomCode) => {
    try {
      global.roomTimers = global.roomTimers || new Map()
      const timerId = global.roomTimers.get(roomCode)
      if (timerId) {
        clearTimeout(timerId)
        global.roomTimers.delete(roomCode)
      }
    } catch (error) {
      console.error("Error clearing timer:", error)
    }
  }

  const autoSelectPlayer = async (roomCode, expectedPlayerId) => {
    try {
      const room = await Room.findOne({ code: roomCode })
      if (!room || room.availablePlayers.length === 0) return

      const currentPlayerId = room.turnOrder[room.currentTurn]

      // Verify this is still the correct player's turn
      if (currentPlayerId !== expectedPlayerId) return

      // Check if user already has maximum players
      const userSelectedPlayers = room.selectedPlayers.get(currentPlayerId) || []
      if (userSelectedPlayers.length >= room.maxPlayersPerUser) {
        nextTurn(roomCode)
        return
      }

      const randomPlayer = room.availablePlayers[Math.floor(Math.random() * room.availablePlayers.length)]

      // Remove player from available pool
      room.availablePlayers = room.availablePlayers.filter((p) => p.id !== randomPlayer.id)

      // Add to user's selected players
      const currentSelected = room.selectedPlayers.get(currentPlayerId) || []
      room.selectedPlayers.set(currentPlayerId, [...currentSelected, randomPlayer])

      await room.save()

      io.to(roomCode).emit("auto-selected", {
        player: randomPlayer,
        selectedBy: currentPlayerId,
        selectedPlayers: Object.fromEntries(room.selectedPlayers),
        availablePlayers: room.availablePlayers,
      })

      nextTurn(roomCode)
    } catch (error) {
      console.error("Error auto-selecting player:", error)
    }
  }

  const nextTurn = async (roomCode) => {
    try {
      const room = await Room.findOne({ code: roomCode })
      if (!room) return

      // Check if all users have maximum players
      const allUsersComplete = room.users.every((user) => {
        const userSelected = room.selectedPlayers.get(user.id) || []
        return userSelected.length >= room.maxPlayersPerUser
      })

      if (allUsersComplete) {
        room.isStarted = false
        await room.save()

        // Update user game history
        for (const user of room.users) {
          if (user.userId) {
            await User.findByIdAndUpdate(user.userId, {
              $inc: { gamesPlayed: 1 },
              $push: {
                gameHistory: {
                  roomCode: room.code,
                  players: room.users.map((u) => u.username),
                  selectedPlayers: room.selectedPlayers.get(user.id) || [],
                  completedAt: new Date(),
                },
              },
            })
          }
        }

        io.to(roomCode).emit("selection-ended", {
          finalTeams: Object.fromEntries(room.selectedPlayers),
        })
        return
      }

      // Move to next player
      room.currentTurn = (room.currentTurn + 1) % room.turnOrder.length
      room.turnStartTime = new Date()

      await room.save()

      const nextPlayerId = room.turnOrder[room.currentTurn]
      const nextUser = room.users.find((u) => u.id === nextPlayerId)

      io.to(roomCode).emit("turn-changed", {
        currentPlayer: nextPlayerId,
        username: nextUser.username,
        turnStartTime: room.turnStartTime,
      })

      startTurnTimer(roomCode, nextPlayerId)
    } catch (error) {
      console.error("Error moving to next turn:", error)
    }
  }

  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  return {
    startSelection,
    selectPlayer,
    startTurnTimer,
    clearTurnTimer,
    autoSelectPlayer,
    nextTurn,
  }
}

module.exports = gameHandlers
