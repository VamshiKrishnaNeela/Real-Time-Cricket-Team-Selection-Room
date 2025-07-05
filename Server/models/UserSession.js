const mongoose = require("mongoose")

const userSessionSchema = new mongoose.Schema({
  socketId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  roomCode: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // 1 hour
  },
})

// Only create compound indexes that aren't automatically created
userSessionSchema.index({ userId: 1, roomCode: 1 })

module.exports = mongoose.model("UserSession", userSessionSchema)
