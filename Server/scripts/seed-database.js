const mongoose = require("mongoose")
const Room = require("../models/Room")
const connectDB = require("../config/database")

const cricketPlayers = [
  { id: 1, name: "Virat Kohli", role: "Batsman", country: "India" },
  { id: 2, name: "Rohit Sharma", role: "Batsman", country: "India" },
  { id: 3, name: "MS Dhoni", role: "Wicket Keeper", country: "India" },
  { id: 4, name: "Jasprit Bumrah", role: "Bowler", country: "India" },
  { id: 5, name: "Hardik Pandya", role: "All Rounder", country: "India" },
  { id: 6, name: "KL Rahul", role: "Batsman", country: "India" },
  { id: 7, name: "Ravindra Jadeja", role: "All Rounder", country: "India" },
  { id: 8, name: "Mohammed Shami", role: "Bowler", country: "India" },
  { id: 9, name: "Rishabh Pant", role: "Wicket Keeper", country: "India" },
  { id: 10, name: "Yuzvendra Chahal", role: "Bowler", country: "India" },
  { id: 11, name: "Shikhar Dhawan", role: "Batsman", country: "India" },
  { id: 12, name: "Bhuvneshwar Kumar", role: "Bowler", country: "India" },
  { id: 13, name: "Ravichandran Ashwin", role: "Bowler", country: "India" },
  { id: 14, name: "Shreyas Iyer", role: "Batsman", country: "India" },
  { id: 15, name: "Washington Sundar", role: "All Rounder", country: "India" },
  { id: 16, name: "Babar Azam", role: "Batsman", country: "Pakistan" },
  { id: 17, name: "Shaheen Afridi", role: "Bowler", country: "Pakistan" },
  { id: 18, name: "Mohammad Rizwan", role: "Wicket Keeper", country: "Pakistan" },
  { id: 19, name: "Kane Williamson", role: "Batsman", country: "New Zealand" },
  { id: 20, name: "Trent Boult", role: "Bowler", country: "New Zealand" },
]

async function seedDatabase() {
  try {
    await connectDB()

    // Clear existing data
    await Room.deleteMany({})
    console.log("Cleared existing rooms")

    // Create sample room
    const sampleRoom = new Room({
      code: "SAMPLE",
      host: null,
      users: [],
      availablePlayers: cricketPlayers,
      selectedPlayers: new Map(),
      turnOrder: [],
      currentTurn: 0,
      isStarted: false,
      round: 1,
    })

    await sampleRoom.save()
    console.log("✅ Sample room created with code: SAMPLE")

    console.log("✅ Database seeded successfully")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error seeding database:", error)
    process.exit(1)
  }
}

seedDatabase()
