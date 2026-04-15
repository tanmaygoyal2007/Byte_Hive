import { createClient } from "redis";

type ByteHiveRedisClient = {
  isReady: boolean;
  connect: () => Promise<ByteHiveRedisClient>;
  disconnect: () => Promise<void>;
  on: (event: string, listener: (error: unknown) => void) => void;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<string | null>;
  setEx: (key: string, seconds: number, value: string) => Promise<string | null>;
  expire: (key: string, seconds: number) => Promise<number>;
  del: (key: string) => Promise<number>;
};

type ByteHiveRedisGlobal = typeof globalThis & {
  __bytehiveRedisClient?: ByteHiveRedisClient;
  __bytehiveRedisPromise?: Promise<ByteHiveRedisClient>;
  __bytehiveRedisFallbackStore?: Map<string, { value: string; expiresAt: number | null }>;
};

const globalRedis = globalThis as ByteHiveRedisGlobal;

function createFallbackRedisClient(): ByteHiveRedisClient {
  if (!globalRedis.__bytehiveRedisFallbackStore) {
    globalRedis.__bytehiveRedisFallbackStore = new Map();
  }

  const store = globalRedis.__bytehiveRedisFallbackStore;

  const readRecord = (key: string) => {
    const record = store.get(key);

    if (!record) {
      return null;
    }

    if (record.expiresAt !== null && record.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }

    return record;
  };

  const writeRecord = (key: string, value: string, expiresAt: number | null) => {
    store.set(key, { value, expiresAt });
  };

  return {
    isReady: true,
    async connect() {
      return this;
    },
    async disconnect() {
      return;
    },
    on() {
      return;
    },
    async get(key) {
      return readRecord(key)?.value ?? null;
    },
    async set(key, value) {
      writeRecord(key, value, readRecord(key)?.expiresAt ?? null);
      return "OK";
    },
    async setEx(key, seconds, value) {
      writeRecord(key, value, Date.now() + seconds * 1000);
      return "OK";
    },
    async expire(key, seconds) {
      const record = readRecord(key);
      if (!record) return 0;

      writeRecord(key, record.value, Date.now() + seconds * 1000);
      return 1;
    },
    async del(key) {
      return store.delete(key) ? 1 : 0;
    },
  };
}

export async function getRedisClient() {
  if (globalRedis.__bytehiveRedisClient?.isReady) {
    return globalRedis.__bytehiveRedisClient;
  }

  if (!globalRedis.__bytehiveRedisPromise) {
    const url = process.env.REDIS_URL;

    if (!url) {
      const fallbackClient = createFallbackRedisClient();
      globalRedis.__bytehiveRedisClient = fallbackClient;
      globalRedis.__bytehiveRedisPromise = Promise.resolve(fallbackClient);
      return fallbackClient;
    }

    const client = createClient({ url });
    client.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    globalRedis.__bytehiveRedisPromise = client.connect().then(() => {
      globalRedis.__bytehiveRedisClient = client;
      return client;
    }).catch((error) => {
      globalRedis.__bytehiveRedisPromise = undefined;
      throw error;
    });
  }

  return globalRedis.__bytehiveRedisPromise as Promise<ByteHiveRedisClient>;
}
