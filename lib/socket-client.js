import { io } from "socket.io-client";

let socket;

export const getSocket = () => {
  if (!socket) {
    console.log("Creating Socket.io client connection...");

    socket = io({
      path: "/socket.io/",
      transports: ["polling", "websocket"],
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

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
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
