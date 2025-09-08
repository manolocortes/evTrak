// This script now uses fetch to call the API endpoint, just like a real device would.
// Make sure you are running this in a recent version of Node.js (v18+) that has fetch built-in.

// We no longer need direct DB or Redis connections in this script.
// import mysql from "mysql2/promise"
// import { createClient } from "redis"

const API_URL = "http://localhost:3000/api/shuttles";

const CAMPUS_ROUTE = [
  {lat: 10.35294515637823, lng: 123.91392448412024},
  {lat: 10.353097441595814, lng: 123.91398215682702},
  {lat: 10.353285558725476, lng: 123.91403072341699},
  {lat: 10.353592287189404, lng: 123.9141034806474},
  {lat: 10.353697829057515, lng: 123.91401496744434},
  {lat: 10.353734767863104, lng: 123.91389426838803},
  {lat: 10.353803369975605, lng: 123.91364213997018},
  {lat: 10.353858779335216, lng: 123.91347047792193},
  {lat: 10.353903634461027, lng: 123.91327467577636},
  {lat: 10.353945851106438, lng: 123.91317006901166},
  {lat: 10.353985429186107, lng: 123.91304936883945},
  {lat: 10.354009175330779, lng: 123.91301986684866},
  {lat: 10.354088331475317, lng: 123.91284015798531},
  {lat: 10.354233450132568, lng: 123.91257998431274},
  {lat: 10.354389123658235, lng: 123.91224738848479},
  {lat: 10.35445772506969, lng: 123.91206499974848},
  {lat: 10.354539519560394, lng: 123.9118879729296},
  {lat: 10.354637575797746, lng: 123.91168313071587},
  {lat: 10.354703650474882, lng: 123.91157277923858},
  {lat: 10.354871107594711, lng: 123.9114247533095},
  {lat: 10.355029463892567, lng: 123.91135629111565},
  {lat: 10.355131394170332, lng: 123.91129523098917},
  {lat: 10.355202381418199, lng: 123.91123972124656},
  {lat: 10.355253346628492, lng: 123.91119901407869},
  {lat: 10.355338895350014, lng: 123.91106949124485},
  {lat: 10.355411090675082, lng: 123.9108014641178},
  {lat: 10.35534355367237, lng: 123.91059717243986},
  {lat: 10.355216715725893, lng: 123.9104648852957},
  {lat: 10.354971276001315, lng: 123.91033762191677},
  {lat: 10.354717599808222, lng: 123.91020868371459},
  {lat: 10.354519929757126, lng: 123.91006802417867},
  {lat: 10.354094939349643, lng: 123.90984196372261},
  {lat: 10.353975203210819, lng: 123.90983647427028},
  {lat: 10.353814858659527, lng: 123.90992538357779},
  {lat: 10.353672735139462, lng: 123.90999947457247},
  {lat: 10.353559765353673, lng: 123.91012913310138},
  {lat: 10.353330181577713, lng: 123.91038104064543},
  {lat: 10.3532317886897, lng: 123.91062924298873},
  {lat: 10.353209923668047, lng: 123.91081076391312},
  {lat: 10.353118818876753, lng: 123.91102192085152},
  {lat: 10.3529584742818, lng: 123.911207146088},
  {lat: 10.35265965018465, lng: 123.9113590304998},
  {lat: 10.352302518770694, lng: 123.91144052917436},
  {lat: 10.351809959519146, lng: 123.91221252527407},
  {lat: 10.351524367499515, lng: 123.91344006174437},
  {lat: 10.351719935477215, lng: 123.91362939903424},
  {lat: 10.352623274062209, lng: 123.91384398317005},
  {lat: 10.352643505497413, lng: 123.9138495651839},
  {lat: 10.35288399327097, lng: 123.91391031345759},
  {lat: 10.352886914345923, lng: 123.91391475844372},
];

class ShuttleSimulator {
  constructor() {
    this.shuttleStates = {};
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log("Initializing shuttle simulator...");

      // Get initial shuttle data from the API to know which shuttles to simulate
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch initial shuttle data: ${response.statusText}`);
      }
      const { shuttles } = await response.json();

      if (!shuttles || shuttles.length === 0) {
        console.log("No active shuttles found via API.");
        process.exit(1);
      }

      // Initialize each shuttle with staggered positions on the same route
      shuttles.forEach((shuttle, index) => {
        const staggeredIndex = Math.floor((index * CAMPUS_ROUTE.length) / shuttles.length);
        this.shuttleStates[shuttle.shuttle_number] = {
          currentRouteIndex: staggeredIndex,
          route: CAMPUS_ROUTE,
          lastUpdate: Date.now(),
          timingOffset: index * 1000, // 1 second offset between shuttles
        };
      });

      console.log("Shuttle simulator initialized");
      console.log(`Simulating ${shuttles.length} shuttles on fixed campus route`);
    } catch (error) {
      console.error("Error initializing simulator:", error.message);
      process.exit(1);
    }
  }

  async updateShuttleLocation(shuttleNumber) {
    try {
      const state = this.shuttleStates[shuttleNumber];
      if (!state) return;

      const currentPoint = state.route[state.currentRouteIndex];

      // This is the payload we will send to the API
      const updatePayload = {
        shuttle_number: shuttleNumber,
        latitude: currentPoint.lat,
        longitude: currentPoint.lng,
        // You can add mock data for other fields if needed
        available_seats: Math.floor(Math.random() * 10) + 1,
        estimated_arrival: "5 mins",
      };

      // *** THE FIX: Send a PUT request to the API endpoint ***
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        console.warn(`API update failed for shuttle ${shuttleNumber}: ${response.statusText}`);
      }

      // Move to the next point in the route for the next update
      state.currentRouteIndex = (state.currentRouteIndex + 1) % state.route.length;

      console.log(`Shuttle ${shuttleNumber} -> Sent update: ${currentPoint.lat.toFixed(6)}, ${currentPoint.lng.toFixed(6)}`);
    } catch (error) {
      console.error(`Error updating shuttle ${shuttleNumber}:`, error.message);
    }
  }

  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("Starting shuttle simulation...");
    console.log("Sending updates via API endpoint...");
    console.log("Press Ctrl+C to stop\n");

    const updateInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(updateInterval);
        return;
      }

      const shuttleNumbers = Object.keys(this.shuttleStates);
      for (const shuttleNumber of shuttleNumbers) {
        const state = this.shuttleStates[shuttleNumber];
        setTimeout(async () => {
          if (this.isRunning) {
            await this.updateShuttleLocation(Number.parseInt(shuttleNumber));
          }
        }, state.timingOffset);
      }
    }, 2000); // Update every 2 seconds to make it easier to see changes

    process.on("SIGINT", async () => {
      console.log("\nStopping shuttle simulation...");
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    this.isRunning = false;
    console.log("Shuttle simulation stopped");
  }
}

// Initialize and start the simulator
const simulator = new ShuttleSimulator();
simulator.initialize().then(() => {
  simulator.start();
});
