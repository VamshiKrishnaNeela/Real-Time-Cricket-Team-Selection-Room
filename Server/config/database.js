const mongoose = require("mongoose")

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false)

    const conn = await mongoose.connect("mongodb+srv://wizardo:Kalvium%402023@cluster0.qsvns2l.mongodb.net/CricketTeamSelection")

    console.log(`MongoDB Connected 🧢: ${conn.connection.host}`)

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err)
    })

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected")
    })

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected")
    })
  } catch (error) {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  }
}

module.exports = connectDB
