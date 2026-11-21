import { createClient, RedisClientType } from "redis";
import { redis_uri } from "../../config/config.service.js";

export class CacheService {
  private readonly client: RedisClientType;
  constructor() {
    this.client = createClient({ url: redis_uri });

    this.client.on("error", (error) => {
      console.error("Redis client error:", error.message);
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.info("Redis connected");
    } catch (e) {
      console.info("Redis connection failed");
      throw e;
    }
  }

  async incrementWithExpiry(key: string, ttl: number): Promise<number> {
    return Number(await this.client.eval(`
      local count = redis.call('INCR', KEYS[1])
      if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
      return count
    `, { keys: [key], arguments: [String(ttl)] }));
  }

  async revokeOnce(key: string, ttl: number): Promise<boolean> {
    return (await this.client.set(key, "1", { NX: true, EX: ttl })) === "OK";
  }

  async reserveOtp(
    key: string,
    limitKey: string,
    otp: string,
    limit: number,
    pendingPasswordHash?: string,
  ): Promise<number> {
    return Number(
      await this.client.eval(
        `
      if redis.call('EXISTS', KEYS[1]) == 1 then return -1 end
      local count = tonumber(redis.call('GET', KEYS[2]) or '0')
      if count >= tonumber(ARGV[2]) then return -2 end
      count = redis.call('INCR', KEYS[2])
      if count == 1 then redis.call('EXPIRE', KEYS[2], 600) end
      redis.call('SET', KEYS[1], ARGV[1], 'EX', 300)
      if ARGV[3] ~= '' then redis.call('SET', KEYS[3], ARGV[3], 'EX', 300) end
      return count
    `,
        { keys: [key, limitKey, `${key}::password`], arguments: [otp, String(limit), pendingPasswordHash ?? ""] },
      ),
    );
  }

  async releaseOtp(key: string, otp: string): Promise<void> {
    await this.client.eval(
      `
      if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1], KEYS[2]) end
      return 0
    `,
      { keys: [key, `${key}::password`], arguments: [otp] },
    );
  }

  async consumePasswordReset(key: string, attemptsKey: string, otp: string, maxAttempts: number): Promise<string | number> {
    const result = await this.client.eval(`
      local stored = redis.call('GET', KEYS[1])
      local password = redis.call('GET', KEYS[3])
      if not stored or not password then return 0 end
      local attempts = tonumber(redis.call('GET', KEYS[2]) or '0')
      if attempts >= tonumber(ARGV[2]) then return -1 end
      if stored ~= ARGV[1] then
        attempts = redis.call('INCR', KEYS[2])
        if attempts == 1 then redis.call('EXPIRE', KEYS[2], 300) end
        if attempts >= tonumber(ARGV[2]) then return -1 end
        return 0
      end
      redis.call('DEL', KEYS[1], KEYS[2], KEYS[3])
      return password
    `, { keys: [key, attemptsKey, `${key}::password`], arguments: [otp, String(maxAttempts)] });
    if (typeof result !== "string" && typeof result !== "number") throw new Error("Invalid password reset response");
    return result;
  }

  async consumeOtp(
    key: string,
    attemptsKey: string,
    otp: string,
    maxAttempts: number,
  ): Promise<number> {
    return Number(
      await this.client.eval(
        `
      local stored = redis.call('GET', KEYS[1])
      if not stored then return 0 end
      local attempts = tonumber(redis.call('GET', KEYS[2]) or '0')
      if attempts >= tonumber(ARGV[2]) then return -1 end
      if stored ~= ARGV[1] then
        attempts = redis.call('INCR', KEYS[2])
        if attempts == 1 then redis.call('EXPIRE', KEYS[2], 300) end
        if attempts >= tonumber(ARGV[2]) then return -1 end
        return 0
      end
      redis.call('DEL', KEYS[1], KEYS[2])
      return 1
    `,
        { keys: [key, attemptsKey], arguments: [otp, String(maxAttempts)] },
      ),
    );
  }

  async set({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: any;
    ttl: number;
  }): Promise<string | null> {
    if (typeof value != "string") value = JSON.stringify(value);
    return await this.client.set(key, value, { ...(ttl ? { EX: ttl } : {}) });
  }

  async get<T = string>({ key }: { key: string }): Promise<T | null> {
    const data: string | null = await this.client.get(key);
    let result;
    try {
      result = JSON.parse(data!);
    } catch (error) {
      result = data;
    }
    return result as T | null;
  }

  async exists({ key }: { key: string }): Promise<number> {
    return this.client.exists(key);
  }

  async del({ key }: { key: string[] }): Promise<number> {
    return await this.client.del(key);
  }

  async ttl({ key }: { key: string }): Promise<number> {
    return this.client.ttl(key);
  }

  async keys({ prefix }: { prefix: string }): Promise<string[]> {
    return this.client.keys(`${prefix}`);
  }

  async incr({ key }: { key: string }): Promise<number> {
    return this.client.incr(key);
  }
}

export const cacheService = new CacheService();
