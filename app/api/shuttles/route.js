import { createConnection } from "@/lib/db.js";
import { getRedisPublisher } from "@/lib/redis.js";
import { NextResponse } from "next/server";

export async function GET() {
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
    } = await request.json();

    const db = await createConnection();
    const sql = `
      UPDATE shuttles 
      SET destination = ?, available_seats = ?, remarks = ?, latitude = ?, longitude = ?, last_updated = NOW()
      WHERE shuttle_number = ?
    `;

    await db.query(sql, [
      destination,
      available_seats,
      remarks,
      latitude,
      longitude,
      shuttle_number,
    ]);

    // Get updated shuttle data
    const [updatedShuttle] = await db.query(
      "SELECT * FROM shuttles WHERE shuttle_number = ?",
      [shuttle_number]
    );

    // Publish to Redis for real-time updates
    try {
      const publisher = await getRedisPublisher();
      await publisher.publish(
        "shuttle-updates",
        JSON.stringify({
          type: "shuttle-location-update",
          shuttle: updatedShuttle[0],
        })
      );
    } catch (redisError) {
      console.warn("Redis publish failed:", redisError.message);
    }

    return NextResponse.json({ success: true, shuttle: updatedShuttle[0] });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: error.message });
  }
}
