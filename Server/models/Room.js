const mongoose = require("mongoose")

const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  host: {
    type: String,
    required: false,
  },
  users: [
    {
      id: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      username: String,
      selectedPlayers: [Object],
      disconnected: {
        type: Boolean,
        default: false,
      },
    },
  ],
  availablePlayers: [
    {
      id: Number,
      name: String,
      role: String,
      country: String,
    },
  ],
  selectedPlayers: {
    type: Map,
    of: [Object],
    default: new Map(),
  },
  turnOrder: [String],
  currentTurn: {
    type: Number,
    default: 0,
  },
  isStarted: {
    type: Boolean,
    default: false,
  },
  round: {
    type: Number,
    default: 1,
  },
  turnStartTime: {
    type: Date,
    default: null,
  },
  maxPlayersPerUser: {
    type: Number,
    default: 5,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // 24 hours - this automatically creates TTL index
  },
})


module.exports = mongoose.model("Room", roomSchema)
