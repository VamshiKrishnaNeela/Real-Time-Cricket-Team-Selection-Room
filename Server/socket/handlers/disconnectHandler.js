const Room = require("../../models/Room")
const UserSession = require("../../models/UserSession")

const disconnectHandler = (io, socket) => {
  return async () => {
    try {
      console.log(`User ${socket.id} disconnected`)

      const session = await UserSession.findOne({ socketId: socket.id })
      if (session) {
        const room = await Room.findOne({ code: session.roomCode })
        if (room) {
          // Mark user as disconnected but don't remove them
          const user = room.users.find((u) => u.id === socket.id)
          if (user) {
            user.disconnected = true
            console.log(`Marked user ${user.username} as disconnected in room ${session.roomCode}`)
          }

          // Clear any active timers for this room if the disconnected user was the current player
          if (room.isStarted && room.turnOrder[room.currentTurn] === socket.id) {
            global.roomTimers = global.roomTimers || new Map()
            const timerId = global.roomTimers.get(session.roomCode)
            if (timerId) {
              clearTimeout(timerId)
              global.roomTimers.delete(session.roomCode)
              console.log(`Cleared timer for room ${session.roomCode}`)
            }
          }

          await room.save()

          // Notify other users about disconnection
          io.to(session.roomCode).emit("user-disconnected", {
            userId: socket.id,
            username: user?.username,
          })

          // Clean up room if all users are disconnected for more than 10 minutes
          const allDisconnected = room.users.every((u) => u.disconnected)
          if (allDisconnected) {
            console.log(`All users disconnected from room ${session.roomCode}, scheduling cleanup`)
            setTimeout(
              async () => {
                try {
                  const roomCheck = await Room.findOne({ code: session.roomCode })
                  if (roomCheck && roomCheck.users.every((u) => u.disconnected)) {
                    await Room.findOneAndDelete({ code: session.roomCode })
                    await UserSession.deleteMany({ roomCode: session.roomCode })
                    console.log(`Cleaned up empty room ${session.roomCode}`)
                  }
                } catch (error) {
                  console.error("Error during room cleanup:", error)
                }
              },
              10 * 60 * 1000,
            ) 
          }
        }

      }
    } catch (error) {
      console.error("Error handling disconnect:", error)
    }
  }
}

module.exports = disconnectHandler
