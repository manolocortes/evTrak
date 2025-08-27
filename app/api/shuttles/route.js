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
    const publisher = await getRedisPublisher();
    
    // --- LOCATION-SPECIFIC GEOFENCE LOGIC ---
    
    // NEW: Define your primary destination locations and the re-entry portal
    const destinationNames = ['SAS', 'SAFAD']; 
    const portalGeofenceName = 'Portal';

    // Get the shuttle's last known position BEFORE updating it
    const [oldShuttleData] = await db.query(
      "SELECT latitude, longitude FROM shuttles WHERE shuttle_number = ?",
      [shuttle_number]
    );

    // Update the shuttle's data in the database first
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

    // Get the fully updated shuttle object to include in the payload
    const [updatedShuttle] = await db.query(
      "SELECT * FROM shuttles WHERE shuttle_number = ?",
      [shuttle_number]
    );
    const shuttlePayload = updatedShuttle[0];

    // Always publish the general location update
    await publisher.publish(
      "shuttle-updates",
      JSON.stringify({
        type: "shuttle-location-update",
        shuttle: shuttlePayload,
      })
    );

    const newPoint = new Point(longitude, latitude);

    // Check for events only if we have a previous location to compare against
    if (oldShuttleData[0] && oldShuttleData[0].latitude && oldShuttleData[0].longitude) {
      const oldPoint = new Point(oldShuttleData[0].longitude, oldShuttleData[0].latitude);

      // MODIFIED: Check for an EXIT from ANY of the main destination geofences
      for (const name of destinationNames) {
        const geofence = await getGeofenceByName(db, name);
        if (geofence) {
          const wasInside = isPointInsidePolygon(geofence, oldPoint);
          const isNowInside = isPointInsidePolygon(geofence, newPoint);

          if (wasInside && !isNowInside) {
            console.log(`Shuttle ${shuttle_number} has exited the '${name}' geofence.`);
            await publisher.publish(
              "shuttle-updates",
              JSON.stringify({
                type: "shuttle-geofence-event",
                event: "exit",
                location: name, // KEY CHANGE: Include the specific location name
                shuttle: shuttlePayload,
              })
            );
          }
        }
      }

      // Check for an ENTRY into the portal geofence (for re-entry)
      const portalGeofence = await getGeofenceByName(db, portalGeofenceName);
      if (portalGeofence) {
        const wasInsidePortal = isPointInsidePolygon(portalGeofence, oldPoint);
        const isNowInsidePortal = isPointInsidePolygon(portalGeofence, newPoint);
        if (!wasInsidePortal && isNowInsidePortal) {
          console.log(`Shuttle ${shuttle_number} has entered the '${portalGeofenceName}' geofence.`);
          await publisher.publish(
            "shuttle-updates",
            JSON.stringify({
              type: "shuttle-reentry-event",
              event: "enter",
              shuttle: shuttlePayload,
            })
          );
        }
      }
    }
    
    return NextResponse.json({ success: true, shuttle: shuttlePayload });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: error.message });
  }
}