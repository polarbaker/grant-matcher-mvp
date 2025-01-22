declare module 'redis' {
  export interface RedisClientOptions {
    url?: string;
  }

  export interface RedisClient {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
  }

  export function createClient(options?: RedisClientOptions): RedisClient;
}
