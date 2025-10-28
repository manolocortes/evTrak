// simulate-shuttles.js

const https = require('https');
const axios = require('axios');

const API_URL = 'http://192.168.50.176:5001/api/shuttles'; // Ensure this URL and port are correct
const AUTH_USER = 'admin';
const AUTH_PASS = 'admin';

const agent = new https.Agent({
  rejectUnauthorized: false
});

const authToken = Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString('base64');
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Basic ${authToken}`
};

const CAMPUS_ROUTE = [
  {lat: 10.352279, lng: 123.914104},
  {lat: 10.352295, lng: 123.914080},
  {lat: 10.352362, lng: 123.913959},
  {lat: 10.352390, lng: 123.913926},
  {lat: 10.352487, lng: 123.913783},
  {lat: 10.352562, lng: 123.913783},
  {lat: 10.352605, lng: 123.913764},
  {lat: 10.352696, lng: 123.913789},
  {lat: 10.352747, lng: 123.913783},
  {lat: 10.352818, lng: 123.913800},
  {lat: 10.352872, lng: 123.913829},
  {lat: 10.352904, lng: 123.913862},
  {lat: 10.352995, lng: 123.913863},
  {lat: 10.353028, lng: 123.913879},
  {lat: 10.353055, lng: 123.913846},
  {lat: 10.353195, lng: 123.913842},
  {lat: 10.353213, lng: 123.913902},
  {lat: 10.353298, lng: 123.913965},
  {lat: 10.353344, lng: 123.913968},
  {lat: 10.353432, lng: 123.913985},
  {lat: 10.353525, lng: 123.914019},
  {lat: 10.353542, lng: 123.914035},
  {lat: 10.353579, lng: 123.914043},
  {lat: 10.353611, lng: 123.914034},
  {lat: 10.353655, lng: 123.914012},
  {lat: 10.353693, lng: 123.913962},
  {lat: 10.353713, lng: 123.913940},
  {lat: 10.353720, lng: 123.913847},
  {lat: 10.353742, lng: 123.913802},
  {lat: 10.353740, lng: 123.913694},
  {lat: 10.353763, lng: 123.913638},
  {lat: 10.353773, lng: 123.913614},
  {lat: 10.353792, lng: 123.913560},
  {lat: 10.353791, lng: 123.913532},
  {lat: 10.353787, lng: 123.913429},
  {lat: 10.353838, lng: 123.913330},
  {lat: 10.353859, lng: 123.913283},
  {lat: 10.353902, lng: 123.913190},
  {lat: 10.353929, lng: 123.913140},
  {lat: 10.353961, lng: 123.913071},
  {lat: 10.354014, lng: 123.912981},
  {lat: 10.354034, lng: 123.912932},
  {lat: 10.354089, lng: 123.912827},
  {lat: 10.354108, lng: 123.912778},
  {lat: 10.354159, lng: 123.912654},
  {lat: 10.354189, lng: 123.912571},
  {lat: 10.354223, lng: 123.912520},
  {lat: 10.354241, lng: 123.912468},
  {lat: 10.354246, lng: 123.912417},
  {lat: 10.354218, lng: 123.912331},
  {lat: 10.354285, lng: 123.912230},
  {lat: 10.354260, lng: 123.912177},
  {lat: 10.354434, lng: 123.912102},
  {lat: 10.354472, lng: 123.912042},
  {lat: 10.354487, lng: 123.911957},
  {lat: 10.354533, lng: 123.911854},
  {lat: 10.354558, lng: 123.911814},
  {lat: 10.354588, lng: 123.911712},
  {lat: 10.354615, lng: 123.911666},
  {lat: 10.354659, lng: 123.911580},
  {lat: 10.354750, lng: 123.911490},
  {lat: 10.354808, lng: 123.911456},
  {lat: 10.354859, lng: 123.911359},
  {lat: 10.354885, lng: 123.911320},
  {lat: 10.354946, lng: 123.911230},
  {lat: 10.355009, lng: 123.911148},
  {lat: 10.355047, lng: 123.911125},
  {lat: 10.355072, lng: 123.911073},
  {lat: 10.355118, lng: 123.911059},
  {lat: 10.355164, lng: 123.910963},
  {lat: 10.355239, lng: 123.910848},
  {lat: 10.355227, lng: 123.910802},
  {lat: 10.355248, lng: 123.910744},
  {lat: 10.355293, lng: 123.910721},
  {lat: 10.355297, lng: 123.910692},
  {lat: 10.355211, lng: 123.910692},
  {lat: 10.355189, lng: 123.910639},
  {lat: 10.355082, lng: 123.910542},
  {lat: 10.355041, lng: 123.910534},
  {lat: 10.354961, lng: 123.910417},
  {lat: 10.354839, lng: 123.910387},
  {lat: 10.354790, lng: 123.910414},
  {lat: 10.354676, lng: 123.910407},
  {lat: 10.354567, lng: 123.910392},
  {lat: 10.354507, lng: 123.910372},
  {lat: 10.354420, lng: 123.910205},
  {lat: 10.354372, lng: 123.910240},
  {lat: 10.354270, lng: 123.910141},
  {lat: 10.354204, lng: 123.909926},
  {lat: 10.354143, lng: 123.909817},
  {lat: 10.354031, lng: 123.909793},
  {lat: 10.353980, lng: 123.909794},
  {lat: 10.353874, lng: 123.909831},
  {lat: 10.353802, lng: 123.909768},
  {lat: 10.353760, lng: 123.909709},
  {lat: 10.353685, lng: 123.909538},
  {lat: 10.353656, lng: 123.909484},
  {lat: 10.353474, lng: 123.909433},
  {lat: 10.353406, lng: 123.909301},
  {lat: 10.353451, lng: 123.909291},
  {lat: 10.353469, lng: 123.909255},
  {lat: 10.353517, lng: 123.909173},
  {lat: 10.353604, lng: 123.909183},
  {lat: 10.353592, lng: 123.909130},
  {lat: 10.353619, lng: 123.909104},
  {lat: 10.353647, lng: 123.909125},
  {lat: 10.353631, lng: 123.909175},
  {lat: 10.353659, lng: 123.909325},
  {lat: 10.353681, lng: 123.909420},
  {lat: 10.353699, lng: 123.909485},
  {lat: 10.353732, lng: 123.909577},
  {lat: 10.353760, lng: 123.909621},
  {lat: 10.353837, lng: 123.909698},
  {lat: 10.353910, lng: 123.909773},
  {lat: 10.353903, lng: 123.909812},
  {lat: 10.353893, lng: 123.909872},
  {lat: 10.353861, lng: 123.909907},
  {lat: 10.353809, lng: 123.909958},
  {lat: 10.353702, lng: 123.910037},
  {lat: 10.353638, lng: 123.910057},
  {lat: 10.353564, lng: 123.910142},
  {lat: 10.353525, lng: 123.910164},
  {lat: 10.353462, lng: 123.910248},
  {lat: 10.353385, lng: 123.910341},
  {lat: 10.353346, lng: 123.910373},
  {lat: 10.353266, lng: 123.910450},
  {lat: 10.353218, lng: 123.910499},
  {lat: 10.353148, lng: 123.910529},
  {lat: 10.353115, lng: 123.910532},
  {lat: 10.353073, lng: 123.910529},
  {lat: 10.352976, lng: 123.910555},
  {lat: 10.352932, lng: 123.910555},
  {lat: 10.352904, lng: 123.910562},
  {lat: 10.352866, lng: 123.910627},
  {lat: 10.352856, lng: 123.910637},
  {lat: 10.352860, lng: 123.910674},
  {lat: 10.352878, lng: 123.910693},
  {lat: 10.352912, lng: 123.910725},
  {lat: 10.352968, lng: 123.910748},
  {lat: 10.353009, lng: 123.910749},
  {lat: 10.353093, lng: 123.910746},
  {lat: 10.353129, lng: 123.910759},
  {lat: 10.353171, lng: 123.910825},
  {lat: 10.353103, lng: 123.910923},
  {lat: 10.353094, lng: 123.910984},
  {lat: 10.353063, lng: 123.911080},
  {lat: 10.353003, lng: 123.911155},
  {lat: 10.352934, lng: 123.911257},
  {lat: 10.352866, lng: 123.911352},
  {lat: 10.352831, lng: 123.911388},
  {lat: 10.352753, lng: 123.911497},
  {lat: 10.352736, lng: 123.911517},
  {lat: 10.352676, lng: 123.911506},
  {lat: 10.352501, lng: 123.911374},
  {lat: 10.352432, lng: 123.911421},
  {lat: 10.352319, lng: 123.911435},
  {lat: 10.352239, lng: 123.911370},
  {lat: 10.352132, lng: 123.911345},
  {lat: 10.351994, lng: 123.911443},
  {lat: 10.351952, lng: 123.911479},
  {lat: 10.351926, lng: 123.911636},
  {lat: 10.351884, lng: 123.911636},
  {lat: 10.351892, lng: 123.911843},
  {lat: 10.351882, lng: 123.911948},
  {lat: 10.351861, lng: 123.911998},
  {lat: 10.351833, lng: 123.912092},
  {lat: 10.351813, lng: 123.912139},
  {lat: 10.351773, lng: 123.912291},
  {lat: 10.351771, lng: 123.912355},
  {lat: 10.351742, lng: 123.912378},
  {lat: 10.351722, lng: 123.912492},
  {lat: 10.351718, lng: 123.912543},
  {lat: 10.351703, lng: 123.912622},
  {lat: 10.351684, lng: 123.912698},
  {lat: 10.351668, lng: 123.912783},
  {lat: 10.351632, lng: 123.912824},
  {lat: 10.351644, lng: 123.912879},
  {lat: 10.351635, lng: 123.912997},
  {lat: 10.351591, lng: 123.913074},
  {lat: 10.351589, lng: 123.913108},
  {lat: 10.351557, lng: 123.913178},
  {lat: 10.351545, lng: 123.913226},
  {lat: 10.351511, lng: 123.913339},
  {lat: 10.351516, lng: 123.913461},
  {lat: 10.351515, lng: 123.913483},
  {lat: 10.351558, lng: 123.913554},
  {lat: 10.351565, lng: 123.913591},
  {lat: 10.351679, lng: 123.913593},
  {lat: 10.351778, lng: 123.913604},
  {lat: 10.351798, lng: 123.913617},
  {lat: 10.351814, lng: 123.913638},
  {lat: 10.351858, lng: 123.913653},
  {lat: 10.351952, lng: 123.913676},
  {lat: 10.352002, lng: 123.913677},
  {lat: 10.352046, lng: 123.913674},
  {lat: 10.352130, lng: 123.913676},
  {lat: 10.352163, lng: 123.913688},
  {lat: 10.352295, lng: 123.913800},
  {lat: 10.352339, lng: 123.913813},
  {lat: 10.352346, lng: 123.913803},
  {lat: 10.352446, lng: 123.913814},
  {lat: 10.352483, lng: 123.913807},
];
class ShuttleSimulator {
  constructor() {
    this.shuttleStates = {};
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log("Initializing shuttle simulator...");
      const response = await axios.get(API_URL, { headers, httpsAgent: agent });
      const { shuttles } = response.data;

      if (!shuttles || shuttles.length === 0) {
        console.log("No active shuttles found via API. Make sure shuttles exist in your database.");
        process.exit(1);
      }

      shuttles.forEach((shuttle, index) => {
        const staggeredIndex = Math.floor((index * CAMPUS_ROUTE.length) / shuttles.length);
        this.shuttleStates[shuttle.shuttle_id] = {
          currentRouteIndex: staggeredIndex,
          route: CAMPUS_ROUTE,
          max_capacity: shuttle.max_capacity || 17,
        };
      });

      console.log("Shuttle simulator initialized");
    } catch (error) {
      console.error("Error initializing simulator:", error.message);
      process.exit(1);
    }
  }

  async updateShuttleLocation(shuttleId) {
    try {
      const state = this.shuttleStates[shuttleId];
      if (!state) return;

      const currentPoint = state.route[state.currentRouteIndex];
      const updatePayload = {
        shuttle_id: shuttleId,
        latitude: currentPoint.lat,
        longitude: currentPoint.lng,
        // The simulator will send a random capacity with each location update as well
        current_capacity: Math.floor(Math.random() * state.max_capacity),
      };

      await axios.put(API_URL, updatePayload, { headers, httpsAgent: agent });
      
      state.currentRouteIndex = (state.currentRouteIndex + 1) % state.route.length;
      console.log(`Shuttle ${shuttleId} -> Sent LOCATION update: ${currentPoint.lat.toFixed(6)}, ${currentPoint.lng.toFixed(6)}`);
    } catch (error) {
      if (error.response) {
        console.warn(`API location update failed for shuttle ${shuttleId}: ${error.response.status} ${error.response.statusText}`);
      } else {
        console.error(`Error updating shuttle location ${shuttleId}:`, error.message);
      }
    }
  }

  async simulateCapacityChange() {
    try {
      const shuttleIds = Object.keys(this.shuttleStates);
      if (shuttleIds.length === 0) return;

      const randomShuttleId = shuttleIds[Math.floor(Math.random() * shuttleIds.length)];
      const state = this.shuttleStates[randomShuttleId];
      if (!state) return;

      const newCapacity = Math.floor(Math.random() * (state.max_capacity + 1));
      
      const capacityUpdatePayload = {
        current_capacity: newCapacity,
      };
      
      const capacityApiUrl = `${API_URL}/${randomShuttleId}/capacity`;
      await axios.put(capacityApiUrl, capacityUpdatePayload, { headers, httpsAgent: agent });
      
      console.log(`Shuttle ${randomShuttleId} -> Sent CAPACITY update: ${newCapacity}`);
    } catch (error) {
      console.warn(`API capacity update failed: ${error.message}`);
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("Starting shuttle simulation...");

    const locationInterval = setInterval(async () => {
      const shuttleIds = Object.keys(this.shuttleStates);
      for (const shuttleId of shuttleIds) {
        await this.updateShuttleLocation(shuttleId);
      }
    }, 500);

    const capacityInterval = setInterval(async () => {
      await this.simulateCapacityChange();
    }, 7000);

    process.on("SIGINT", () => {
      console.log("\nStopping simulation...");
      clearInterval(locationInterval);
      clearInterval(capacityInterval);
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    this.isRunning = false;
    console.log("Shuttle simulation stopped");
  }
}

const simulator = new ShuttleSimulator();
simulator.initialize().then(() => {
  simulator.start();
});