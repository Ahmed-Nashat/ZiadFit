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
