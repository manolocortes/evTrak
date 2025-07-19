import { createConnection } from "@/lib/db.js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = await createConnection();
    const sql = "SELECT * FROM shuttles";
    const [shuttles] = await db.query(sql);
    return NextResponse.json({ shuttles: shuttles });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: error.message });
  }
}
