// lib/socket-client.js

import { io } from "socket.io-client";

let socket;

export const getSocket = () => {
  if (!socket) {
    console.log("Creating Socket.io client connection...");

    // This URL points to your backend server. It's loaded from your .env.local file.
    const URL = process.env.NEXT_PUBLIC_API_URL;

    // The URL is now passed as the first argument to the io() function.
    socket = io(URL, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: false,
      timeout: 10000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Socket.io connected successfully!");
      console.log("Connection ID:", socket.id);
      console.log("Transport:", socket.io.engine.transport.name);
      socket.emit("ping", {
        message: "Client connected",
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("welcome", (data) => {
      console.log("Received welcome message:", data);
    });

    socket.on("pong", (data) => {
      console.log("Received pong:", data);
    });

    // Updated error handler for better debugging
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      console.error("Is your backend server running at", URL, "?");
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
    });

    socket.io.on("upgrade", () => {
      console.log("Transport upgraded to:", socket.io.engine.transport.name);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log("Disconnecting socket...");
    socket.disconnect();
    socket = null;
  }
};