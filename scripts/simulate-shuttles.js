import mysql from "mysql2/promise"
import { createClient } from "redis"

// Database connection
const createConnection = async () => {
  return await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "100103",
    database: process.env.DB_NAME || "evTrak_testing",
    port: Number.parseInt(process.env.DB_PORT || "3306"),
  })
}

// Redis connection
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
})

// Handle Redis connection errors
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err)
})

redisClient.on("connect", () => {
  console.log("Connected to Redis")
})

// SHUTTLE ROUTE
const CAMPUS_ROUTE = [
  { lat: 10.353147665203336, lng: 123.91399718741029 },
  { lat: 10.353352882148299, lng: 123.91406871264653 },
  { lat: 10.35368122964047, lng: 123.91411937708102 },
  { lat: 10.35383660681564, lng: 123.91359486280655 },
  { lat: 10.353941792379402, lng: 123.9131309351763 },
  { lat: 10.354651500306714, lng: 123.91164631948152 },
  { lat: 10.35527095575209, lng: 123.9111792498617 },
  { lat: 10.354877129601329, lng: 123.91027430155039 },
  { lat: 10.354610476641195, lng: 123.91009498024735 },
  { lat: 10.353572579998584, lng: 123.91012000175729 },
  { lat: 10.35324028775663, lng: 123.91074137173182 },
  { lat: 10.352665955970444, lng: 123.91134606057048 },
  { lat: 10.351701895146949, lng: 123.91267637552393 },
  { lat: 10.353147665203336, lng: 123.91399718741029 },
]

class ShuttleSimulator {
  constructor() {
    this.shuttleStates = {}
    this.db = null
    this.isRunning = false
  }

  async initialize() {
    try {
      console.log("Initializing shuttle simulator...")

      // Test database connection
      this.db = await createConnection()
      console.log("Connected to database")

      // Test Redis connection
      await redisClient.connect()

      // Initialize shuttle states for active shuttles
      const [shuttles] = await this.db.query(
        "SELECT shuttle_number FROM shuttles WHERE latitude IS NOT NULL AND longitude IS NOT NULL",
      )

      if (shuttles.length === 0) {
        console.log("No active shuttles found in database.")
        process.exit(1)
      }

      // Initialize each shuttle with staggered positions on the same route
      shuttles.forEach((shuttle, index) => {
        // Stagger shuttles evenly around the route
        const staggeredIndex = Math.floor((index * CAMPUS_ROUTE.length) / shuttles.length)

        this.shuttleStates[shuttle.shuttle_number] = {
          currentRouteIndex: staggeredIndex,
          route: CAMPUS_ROUTE,
          lastUpdate: Date.now(),
          // Add individual timing offset for each shuttle
          timingOffset: index * 1000, // 1 second offset between shuttles
        }
      })

      console.log("Shuttle simulator initialized")
      console.log(`Simulating ${shuttles.length} shuttles on fixed campus route`)
      console.log(`Route has ${CAMPUS_ROUTE.length} stops`)
    } catch (error) {
      console.error("Error initializing simulator:", error.message)

      if (error.code === "ER_BAD_DB_ERROR") {
        console.log("Database doesn't exist. Please check your database name.")
      }

      process.exit(1)
    }
  }

  async updateShuttleLocation(shuttleNumber) {
    try {
      const state = this.shuttleStates[shuttleNumber]
      if (!state) return

      const currentPoint = state.route[state.currentRouteIndex]

      const position = {
        lat: currentPoint.lat,
        lng: currentPoint.lng,
      }

      // Update database
      const sql = `
        UPDATE shuttles 
        SET latitude = ?, longitude = ?, updated_at = NOW()
        WHERE shuttle_number = ?
      `

      await this.db.query(sql, [position.lat, position.lng, shuttleNumber])

      // Get updated shuttle data
      const [updatedShuttle] = await this.db.query("SELECT * FROM shuttles WHERE shuttle_number = ?", [shuttleNumber])

      // Publish to Redis
      try {
        await redisClient.publish(
          "shuttle-updates",
          JSON.stringify({
            type: "shuttle-location-update",
            shuttle: updatedShuttle[0],
          }),
        )
      } catch (redisError) {
        console.warn(`Redis publish failed for shuttle ${shuttleNumber}:`, redisError.message)
      }

      // Move to next point
      state.currentRouteIndex = (state.currentRouteIndex + 1) % state.route.length

      console.log(`Shuttle ${shuttleNumber} -> Location: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`)
    } catch (error) {
      console.error(`Error updating shuttle ${shuttleNumber}:`, error.message)
    }
  }

  async start() {
    if (this.isRunning) return

    this.isRunning = true
    console.log("Starting shuttle simulation...")
    console.log("Location-only updates with staggered shuttle timing")
    console.log("Press Ctrl+C to stop\n")

    const updateInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(updateInterval)
        return
      }

      // Update all shuttles with staggered timing
      const shuttleNumbers = Object.keys(this.shuttleStates)
      for (let i = 0; i < shuttleNumbers.length; i++) {
        const shuttleNumber = shuttleNumbers[i]
        const state = this.shuttleStates[shuttleNumber]

        // Apply timing offset for staggered updates
        setTimeout(async () => {
          if (this.isRunning) {
            await this.updateShuttleLocation(Number.parseInt(shuttleNumber))
          }
        }, state.timingOffset)
      }
    }, 1000) // Update every 1 second

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\nStopping shuttle simulation...")
      await this.stop()
      process.exit(0)
    })
  }

  async stop() {
    this.isRunning = false

    try {
      if (this.db) {
        await this.db.end()
        console.log("Database connection closed")
      }

      if (redisClient.isOpen) {
        await redisClient.quit()
        console.log("Redis connection closed")
      }
    } catch (error) {
      console.error("Error during cleanup:", error.message)
    }

    console.log("Shuttle simulation stopped")
  }
}

// Initialize and start the simulator
const simulator = new ShuttleSimulator()

simulator
  .initialize()
  .then(() => {
    simulator.start()
  })
  .catch((error) => {
    console.error("Failed to start simulator:", error.message)
    process.exit(1)
  })
