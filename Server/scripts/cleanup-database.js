const mongoose = require("mongoose")
const connectDB = require("../config/database")

async function cleanupDatabase() {
  try {
    await connectDB()
    console.log("Connected to MongoDB for cleanup...")

    const db = mongoose.connection.db

    // List all collections
    const collections = await db.listCollections().toArray()
    console.log(
      "Found collections:",
      collections.map((c) => c.name),
    )

    // Drop problematic collections and their indexes
    const collectionsToClean = ["users", "usersessions", "rooms", "timers"]

    for (const collectionName of collectionsToClean) {
      try {
        const collection = db.collection(collectionName)

        // Drop all indexes except _id
        const indexes = await collection.listIndexes().toArray()
        console.log(
          `Indexes in ${collectionName}:`,
          indexes.map((i) => i.name),
        )

        for (const index of indexes) {
          if (index.name !== "_id_") {
            try {
              await collection.dropIndex(index.name)
              console.log(`✅ Dropped index ${index.name} from ${collectionName}`)
            } catch (error) {
              console.log(`⚠️  Could not drop index ${index.name}:`, error.message)
            }
          }
        }

        // Optionally clear the collection data
        const result = await collection.deleteMany({})
        console.log(`✅ Cleared ${result.deletedCount} documents from ${collectionName}`)
      } catch (error) {
        if (error.message.includes("ns not found")) {
          console.log(`ℹ️  Collection ${collectionName} doesn't exist, skipping...`)
        } else {
          console.log(`⚠️  Error cleaning ${collectionName}:`, error.message)
        }
      }
    }

    console.log("✅ Database cleanup completed successfully")
    console.log("ℹ️  Restart your server to recreate indexes properly")

    process.exit(0)
  } catch (error) {
    console.error("❌ Database cleanup failed:", error)
    process.exit(1)
  }
}

cleanupDatabase()
