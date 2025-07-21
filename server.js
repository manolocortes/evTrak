import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { getRedisSubscriber } from "./lib/redis.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Create Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

let redisSetup = false;

app.prepare().then(() => {
  const httpServer = createServer(handler);

  // Initialize Socket.io
  const io = new Server(httpServer, {
    path: "/socket.io/",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  io.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);

    socket.emit("welcome", {
      message: "Connected to evTrak server",
      timestamp: new Date().toISOString(),
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Client disconnected:", socket.id, "Reason:", reason);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socket.on("ping", (data) => {
      console.log("Received ping from client:", data);
      socket.emit("pong", {
        message: "Server received ping",
        timestamp: new Date().toISOString(),
      });
    });
  });

  // Set up Redis subscriber
  if (!redisSetup) {
    setupRedisSubscriber(io);
    redisSetup = true;
  }

  httpServer
    .once("error", (err) => {
      console.error("Server error:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`✅ Server ready on http://${hostname}:${port}`);
      console.log("✅ Socket.io server initialized");
    });
});

const setupRedisSubscriber = async (io) => {
  try {
    console.log("🔧 Setting up Redis subscriber...");
    const subscriber = await getRedisSubscriber();

    await subscriber.subscribe("shuttle-updates", (message) => {
      try {
        const data = JSON.parse(message);
        io.emit("shuttle-update", data);
        console.log(
          "📡 Broadcasted shuttle update to",
          io.engine.clientsCount,
          "clients"
        );
      } catch (error) {
        console.error("Error broadcasting update:", error);
      }
    });

    console.log("✅ Redis subscriber set up successfully");
  } catch (error) {
    console.error("❌ Redis subscriber setup failed:", error);
    console.log("⚠️  Continuing without Redis - real-time updates disabled");
  }
};
