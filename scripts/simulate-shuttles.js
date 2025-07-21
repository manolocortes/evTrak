import mysql from "mysql2/promise";
import { createClient } from "redis";

// Database connection
const createConnection = async () => {
  return await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "100103",
    database: process.env.DB_NAME || "evTrak_testing",
    port: Number.parseInt(process.env.DB_PORT || "3306"),
  });
};

// Redis connection
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Handle Redis connection errors
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

// USC TC campus coordinates (approximate bounds)
const CAMPUS_BOUNDS = {
  north: 10.356,
  south: 10.351,
  east: 123.914,
  west: 123.908,
};

// Predefined routes for shuttles based on your destinations
const SHUTTLE_ROUTES = {
  1: [
    { lat: 10.3542, lng: 123.9131, destination: "SAFAD", seats: 8 },
    { lat: 10.3543, lng: 123.9132, destination: "SAFAD", seats: 6 },
    { lat: 10.3544, lng: 123.9133, destination: "SAFAD", seats: 4 },
    { lat: 10.3545, lng: 123.9134, destination: "SAFAD", seats: 2 },
    { lat: 10.3546, lng: 123.9135, destination: "SAFAD", seats: 0 },
  ],
  2: [
    { lat: 10.354, lng: 123.9118, destination: "BUNZEL", seats: 10 },
    { lat: 10.3541, lng: 123.9119, destination: "BUNZEL", seats: 8 },
    { lat: 10.3542, lng: 123.912, destination: "BUNZEL", seats: 6 },
    { lat: 10.3543, lng: 123.9121, destination: "BUNZEL", seats: 4 },
    { lat: 10.3544, lng: 123.9122, destination: "BUNZEL", seats: 2 },
  ],
  3: [
    { lat: 10.3547, lng: 123.9127, destination: "SAS", seats: 12 },
    { lat: 10.3548, lng: 123.9128, destination: "SAS", seats: 10 },
    { lat: 10.3549, lng: 123.9129, destination: "SAS", seats: 8 },
    { lat: 10.355, lng: 123.913, destination: "SAS", seats: 6 },
    { lat: 10.3551, lng: 123.9131, destination: "SAS", seats: 4 },
  ],
  4: [
    { lat: 10.3548, lng: 123.913, destination: "BUNZEL", seats: 8 },
    { lat: 10.3547, lng: 123.9129, destination: "BUNZEL", seats: 6 },
    { lat: 10.3546, lng: 123.9128, destination: "BUNZEL", seats: 4 },
    { lat: 10.3545, lng: 123.9127, destination: "BUNZEL", seats: 2 },
    { lat: 10.3544, lng: 123.9126, destination: "BUNZEL", seats: 0 },
  ],
  5: [
    { lat: 10.355, lng: 123.9135, destination: "SAS", seats: 15 },
    { lat: 10.3549, lng: 123.9134, destination: "SAS", seats: 12 },
    { lat: 10.3548, lng: 123.9133, destination: "SAS", seats: 10 },
    { lat: 10.3547, lng: 123.9132, destination: "SAS", seats: 8 },
    { lat: 10.3546, lng: 123.9131, destination: "SAS", seats: 5 },
  ],
};

const REMARKS_OPTIONS = [
  "En Route",
  "Loading",
  "Departed",
  "Arrived",
  "Boarding",
  "Waiting",
  "Maintenance",
];

// Get available seats (only numbers now)
const getAvailableSeats = (baseSeats) => {
  return Math.max(0, baseSeats + Math.floor(Math.random() * 5) - 2);
};

class ShuttleSimulator {
  constructor() {
    this.shuttleStates = {};
    this.db = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log("Initializing shuttle simulator...");

      // Test database connection
      this.db = await createConnection();
      console.log("Connected to database");

      // Test Redis connection
      await redisClient.connect();

      // Initialize shuttle states for active shuttles (those with coordinates)
      const [shuttles] = await this.db.query(
        "SELECT shuttle_number FROM shuttles WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
      );

      if (shuttles.length === 0) {
        console.log("No active shuttles found in database.");
        console.log(
          "Make sure some shuttles have latitude and longitude coordinates."
        );
        process.exit(1);
      }

      shuttles.forEach((shuttle) => {
        const routePoints =
          SHUTTLE_ROUTES[shuttle.shuttle_number] || SHUTTLE_ROUTES[1];
        this.shuttleStates[shuttle.shuttle_number] = {
          currentRouteIndex: 0,
          route: routePoints,
          direction: 1, // 1 for forward, -1 for backward
          lastUpdate: Date.now(),
        };
      });

      console.log("Shuttle simulator initialized");
      console.log(`Simulating ${shuttles.length} active shuttles`);
    } catch (error) {
      console.error("Error initializing simulator:", error.message);

      if (error.code === "ER_BAD_DB_ERROR") {
        console.log("Database doesn't exist. Please check your database name.");
      }

      process.exit(1);
    }
  }

  generateRandomMovement(currentLat, currentLng) {
    // Small random movement within campus bounds
    const latChange = (Math.random() - 0.5) * 0.0003; // ~30 meters
    const lngChange = (Math.random() - 0.5) * 0.0003;

    let newLat = currentLat + latChange;
    let newLng = currentLng + lngChange;

    // Keep within campus bounds
    newLat = Math.max(
      CAMPUS_BOUNDS.south,
      Math.min(CAMPUS_BOUNDS.north, newLat)
    );
    newLng = Math.max(CAMPUS_BOUNDS.west, Math.min(CAMPUS_BOUNDS.east, newLng));

    return { lat: newLat, lng: newLng };
  }

  async updateShuttleLocation(shuttleNumber) {
    try {
      const state = this.shuttleStates[shuttleNumber];
      if (!state) return;

      const currentPoint = state.route[state.currentRouteIndex];
      const randomRemarks =
        REMARKS_OPTIONS[Math.floor(Math.random() * REMARKS_OPTIONS.length)];

      // Add some randomness to the exact position
      const position = this.generateRandomMovement(
        currentPoint.lat,
        currentPoint.lng
      );

      // Get available seats (only numbers now)
      const availableSeats = getAvailableSeats(currentPoint.seats);

      // Update database with correct column order
      const sql = `
      UPDATE shuttles 
      SET destination = ?, available_seats = ?, remarks = ?, latitude = ?, longitude = ?, last_updated = NOW()
      WHERE shuttle_number = ?
    `;

      await this.db.query(sql, [
        currentPoint.destination,
        availableSeats,
        randomRemarks,
        position.lat,
        position.lng,
        shuttleNumber,
      ]);

      // Get updated shuttle data
      const [updatedShuttle] = await this.db.query(
        "SELECT * FROM shuttles WHERE shuttle_number = ?",
        [shuttleNumber]
      );

      // Publish to Redis (with error handling)
      try {
        await redisClient.publish(
          "shuttle-updates",
          JSON.stringify({
            type: "shuttle-location-update",
            shuttle: updatedShuttle[0],
          })
        );
      } catch (redisError) {
        console.warn(
          `Redis publish failed for shuttle ${shuttleNumber}:`,
          redisError.message
        );
      }

      // Move to next point in route
      state.currentRouteIndex += state.direction;

      // Reverse direction at route ends
      if (state.currentRouteIndex >= state.route.length) {
        state.currentRouteIndex = state.route.length - 2;
        state.direction = -1;
      } else if (state.currentRouteIndex < 0) {
        state.currentRouteIndex = 1;
        state.direction = 1;
      }

      console.log(
        `Shuttle ${shuttleNumber} -> ${currentPoint.destination} | Seats: ${availableSeats} | ${randomRemarks}`
      );
    } catch (error) {
      console.error(`Error updating shuttle ${shuttleNumber}:`, error.message);
    }
  }

  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("Starting shuttle simulation...");
    console.log("Updates every 4 seconds");
    console.log("Press Ctrl+C to stop\n");

    const updateInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(updateInterval);
        return;
      }

      // Update all shuttles
      const shuttleNumbers = Object.keys(this.shuttleStates);
      for (const shuttleNumber of shuttleNumbers) {
        await this.updateShuttleLocation(Number.parseInt(shuttleNumber));
        // Small delay between shuttle updates
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }, 4000); // Update every 4 seconds

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\nStopping shuttle simulation...");
      await this.stop();
      process.exit(0);
    });
  }

  async stop() {
    this.isRunning = false;

    try {
      if (this.db) {
        await this.db.end();
        console.log("Database connection closed");
      }

      if (redisClient.isOpen) {
        await redisClient.quit();
        console.log("Redis connection closed");
      }
    } catch (error) {
      console.error("Error during cleanup:", error.message);
    }

    console.log("Shuttle simulation stopped");
  }
}

// Initialize and start the simulator
const simulator = new ShuttleSimulator();

simulator
  .initialize()
  .then(() => {
    simulator.start();
  })
  .catch((error) => {
    console.error("Failed to start simulator:", error.message);
    process.exit(1);
  });
