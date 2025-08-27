import { createConnection } from "@/lib/db.js";
import { getRedisPublisher } from "@/lib/redis.js";
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

async function getGeofenceByName(db, name) {
  if (!name) return null;

  // If we have a cached polygon for this name, return it.
  if (cachedPolygons[name]) {
    return cachedPolygons[name];
  }

  // Otherwise, fetch it from the database.
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
  
  // Update the cache for this specific geofence
  cachedPolygons[name] = polygon;
  
  return polygon;
}


export async function GET(request) {
  try {
    const db = await createConnection();
    const sql = "SELECT * FROM shuttles ORDER BY shuttle_number";
    const [shuttles] = await db.query(sql);
    return NextResponse.json({ shuttles: shuttles });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: error.message });
  }
}

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

    const db = await createConnection();
    
    // --- DUAL GEOFENCE LOGIC ---
    const locationName = process.env.EVTRAK_LOCATION;
    
    // 1. Get the geofences for the main location and the re-entry portal.
    const mainGeofence = await getGeofenceByName(db, locationName);
    const portalGeofence = await getGeofenceByName(db, 'Portal');

    let shouldPublishExitEvent = false;
    let shouldPublishReentryEvent = false;

    // 2. Get the shuttle's last known position.
    const [oldShuttleData] = await db.query(
      "SELECT latitude, longitude FROM shuttles WHERE shuttle_number = ?",
      [shuttle_number]
    );

    const newPoint = new Point(longitude, latitude);
    let wasInsideMain = false;
    let wasInsidePortal = false;

    if (oldShuttleData[0] && oldShuttleData[0].latitude && oldShuttleData[0].longitude) {
      const oldPoint = new Point(oldShuttleData[0].longitude, oldShuttleData[0].latitude);
      if (mainGeofence) wasInsideMain = isPointInsidePolygon(mainGeofence, oldPoint);
      if (portalGeofence) wasInsidePortal = isPointInsidePolygon(portalGeofence, oldPoint);
    }

    // 3. Check for an EXIT from the main geofence.
    if (mainGeofence) {
      const isNowInsideMain = isPointInsidePolygon(mainGeofence, newPoint);
      if (wasInsideMain && !isNowInsideMain) {
        shouldPublishExitEvent = true;
      }
    }

    // 4. Check for an ENTRY into the portal geofence.
    if (portalGeofence) {
      const isNowInsidePortal = isPointInsidePolygon(portalGeofence, newPoint);
      if (!wasInsidePortal && isNowInsidePortal) {
        shouldPublishReentryEvent = true;
      }
    }
    
    // --- END GEOFENCE LOGIC ---

    const updateSql = `
      UPDATE shuttles 
      SET destination = ?, available_seats = ?, remarks = ?, latitude = ?, longitude = ?, estimated_arrival = ?, updated_at = NOW()
      WHERE shuttle_number = ?
    `;

    await db.query(updateSql, [
      destination,
      available_seats,
      remarks,
      latitude,
      longitude,
      estimated_arrival,
      shuttle_number,
    ]);

    const [updatedShuttle] = await db.query(
      "SELECT * FROM shuttles WHERE shuttle_number = ?",
      [shuttle_number]
    );

    try {
      const publisher = await getRedisPublisher();

      // Always publish the general location update
      await publisher.publish(
        "shuttle-updates",
        JSON.stringify({
          type: "shuttle-location-update",
          shuttle: updatedShuttle[0],
        })
      );

      // Publish the exit event if triggered
      if (shouldPublishExitEvent) {
        console.log(`Shuttle ${shuttle_number} has exited the '${locationName}' geofence.`);
        await publisher.publish(
          "shuttle-updates",
          JSON.stringify({
            type: "shuttle-geofence-event",
            event: "exit",
            shuttle: updatedShuttle[0],
          })
        );
      }

      // Publish the re-entry event if triggered
      if (shouldPublishReentryEvent) {
        console.log(`Shuttle ${shuttle_number} has entered the 'Portal' geofence.`);
        await publisher.publish(
          "shuttle-updates",
          JSON.stringify({
            type: "shuttle-reentry-event",
            event: "enter",
            shuttle: updatedShuttle[0],
          })
        );
      }

    } catch (redisError) {
      console.warn("Redis publish failed:", redisError.message);
    }

    return NextResponse.json({ success: true, shuttle: updatedShuttle[0] });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: error.message });
  }
}
