import { createConnection } from "@/lib/db.js";
import { getRedisClient, getRedisPublisher } from "@/lib/redis.js";
import { NextResponse } from "next/server";
import { isPointInsidePolygon } from "@/lib/geofence.js";

// Helper Point class to match the geofence utility
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

// --- Cache for multiple geofence polygons ---
let cachedPolygons = {};

// This function still needs the database to fetch geofence shapes.
async function getGeofenceByName(db, name) {
  if (!name) return null;

  if (cachedPolygons[name]) {
    return cachedPolygons[name];
  }

  console.log(`Fetching geofence for location: ${name}`);
  const [geofenceData] = await db.query(
    "SELECT coordinates FROM geofences WHERE name = ?",
    [name]
  );

  if (!geofenceData || geofenceData.length === 0) {
    console.error(`No geofence found in database for location: ${name}`);
    return null;
  }

  const polygonCoords = JSON.parse(geofenceData[0].coordinates);
  const polygon = polygonCoords.map(p => new Point(p.x, p.y));
  
  cachedPolygons[name] = polygon;
  
  return polygon;
}

// MODIFIED: This GET request now combines data from the database and Redis.
export async function GET(request) {
  try {
    const db = await createConnection();
    const redis = await getRedisClient();

    // 1. Fetch the base shuttle data from the database
    const [dbShuttles] = await db.query("SELECT shuttle_number, available_seats, estimated_arrival FROM shuttles ORDER BY shuttle_number");

    // 2. "Hydrate" the database data with live location data from Redis
    const hydratedShuttles = await Promise.all(
        dbShuttles.map(async (shuttle) => {
            const shuttleKey = `shuttle:${shuttle.shuttle_number}`;
            const liveData = await redis.hGetAll(shuttleKey);
            
            // Merge the live data (from Redis) into the base data (from DB)
            return {
                ...shuttle, // Contains shuttle_number, available_seats, etc.
                ...liveData, // Contains latitude, longitude, remarks, etc.
            };
        })
    );

    return NextResponse.json({ shuttles: hydratedShuttles });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: error.message });
  }
}

// The GET function and helper functions remain the same.
// Only the PUT function needs to be modified.

export async function PUT(request) {
  try {
    const {
      shuttle_number,
      latitude,
      longitude,
      destination,
      available_seats,
      remarks,
      estimated_arrival,
    } = await request.json();

    const redis = await getRedisClient();
    const publisher = await getRedisPublisher();
    const shuttleKey = `shuttle:${shuttle_number}`;
    
    const oldShuttleData = await redis.hGetAll(shuttleKey);

    // --- FIX: Ensure every value is a defined string before saving to Redis ---
    // Use the nullish coalescing operator (??) to provide default values for optional fields.
    const newShuttleState = {
      shuttle_number: String(shuttle_number ?? 'Unknown'),
      latitude: String(latitude ?? '0'),
      longitude: String(longitude ?? '0'),
      destination: String(destination ?? 'N/A'),
      available_seats: String(available_seats ?? '0'),
      remarks: String(remarks ?? ''),
      estimated_arrival: String(estimated_arrival ?? 'N/A'),
      updated_at: new Date().toISOString(),
    };

    // --- Geofence Logic (no changes needed here) ---
    if (oldShuttleData.latitude && oldShuttleData.longitude) {
        const db = await createConnection(); 
        const destinationNames = ['SAS', 'SAFAD']; 
        const portalGeofenceName = 'Portal';

        const oldPoint = new Point(parseFloat(oldShuttleData.longitude), parseFloat(oldShuttleData.latitude));
        const newPoint = new Point(longitude, latitude);

        for (const name of destinationNames) {
            const geofence = await getGeofenceByName(db, name);
            if (geofence) {
                const wasInside = isPointInsidePolygon(geofence, oldPoint);
                const isNowInside = isPointInsidePolygon(geofence, newPoint);
                if (wasInside && !isNowInside) {
                    await publisher.publish("shuttle-updates", JSON.stringify({
                        type: "shuttle-geofence-event", event: "exit", location: name, shuttle: newShuttleState,
                    }));
                }
            }
        }

        const portalGeofence = await getGeofenceByName(db, portalGeofenceName);
        if (portalGeofence) {
            const wasInsidePortal = isPointInsidePolygon(portalGeofence, oldPoint);
            const isNowInsidePortal = isPointInsidePolygon(portalGeofence, newPoint);
            if (!wasInsidePortal && isNowInsidePortal) {
                await publisher.publish("shuttle-updates", JSON.stringify({
                    type: "shuttle-reentry-event", event: "enter", shuttle: newShuttleState,
                }));
            }
        }
    }

    // --- Publish and Save (no changes needed here) ---
    await publisher.publish(
      "shuttle-updates",
      JSON.stringify({
        type: "shuttle-location-update",
        shuttle: newShuttleState,
      })
    );

    await redis.hSet(shuttleKey, newShuttleState);

    return NextResponse.json({ success: true, shuttle: newShuttleState });
  } catch (error) {
    console.error("Error in PUT /api/shuttles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}