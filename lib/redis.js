import { createClient } from "redis";

let redisClient;
let redisPublisher;
let redisSubscriber;

export const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis client connected");
    });

    await redisClient.connect();
  }
  return redisClient;
};

export const getRedisPublisher = async () => {
  if (!redisPublisher) {
    redisPublisher = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisPublisher.on("error", (err) => {
      console.error("Redis Publisher Error:", err);
    });

    redisPublisher.on("connect", () => {
      console.log("Redis publisher connected");
    });

    await redisPublisher.connect();
  }
  return redisPublisher;
};

export const getRedisSubscriber = async () => {
  if (!redisSubscriber) {
    redisSubscriber = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisSubscriber.on("error", (err) => {
      console.error("Redis Subscriber Error:", err);
    });

    redisSubscriber.on("connect", () => {
      console.log("Redis subscriber connected");
    });

    await redisSubscriber.connect();
  }
  return redisSubscriber;
};
