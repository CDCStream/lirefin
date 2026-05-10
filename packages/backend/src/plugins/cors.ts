import fastifyCors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";

export async function registerCors(app: FastifyInstance) {
  await app.register(fastifyCors, {
    origin(origin, cb) {
      if (!origin) {
        return cb(null, true);
      }

      if (origin.startsWith("chrome-extension://")) {
        return cb(null, true);
      }

      if (config.allowedOrigins.length === 0) {
        if (config.nodeEnv !== "production") {
          return cb(null, true);
        }
        return cb(new Error("Origin not allowed"), false);
      }

      if (config.allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      return cb(new Error("Origin not allowed"), false);
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
    maxAge: 86400,
  });
}
