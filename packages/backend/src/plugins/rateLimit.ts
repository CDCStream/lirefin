import fastifyRateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";

function userKey(req: FastifyRequest): string {
  if (req.user?.id) return `user:${req.user.id}`;
  return `ip:${req.ip}`;
}

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    global: false,
    keyGenerator: userKey,
    enableDraftSpec: true,
  });
}

export const hourlyLimitConfig = {
  max: () => config.rateLimitPerHour,
  timeWindow: "1 hour",
  keyGenerator: userKey,
  errorResponseBuilder: (
    _req: FastifyRequest,
    ctx: { after: string; ttl: number },
  ) => ({
    error: `Rate limit exceeded. Please try again in ${ctx.after}.`,
    code: "RATE_LIMITED_HOURLY",
    retryAfter: Math.ceil(ctx.ttl / 1000),
  }),
};

export const dailyLimitConfig = {
  max: () => config.rateLimitPerDay,
  timeWindow: "1 day",
  keyGenerator: userKey,
  errorResponseBuilder: (
    _req: FastifyRequest,
    ctx: { after: string; ttl: number },
  ) => ({
    error: `Daily rate limit exceeded. Please try again in ${ctx.after}.`,
    code: "RATE_LIMITED_DAILY",
    retryAfter: Math.ceil(ctx.ttl / 1000),
  }),
};
