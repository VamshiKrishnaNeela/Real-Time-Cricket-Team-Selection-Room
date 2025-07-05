const mongoose = require("mongoose")

const timerSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
  },
  timerId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 15, // 15 seconds - this automatically creates TTL index
  },
})


module.exports = mongoose.model("Timer", timerSchema)
