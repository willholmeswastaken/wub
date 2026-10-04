declare module "cloudflare:workers" {
  export const env: {
    CLICK_QUEUE: {
      send(body: unknown): Promise<unknown>;
    };
    LINK_RATE_LIMITER: {
      limit(options: { key: string }): Promise<{ success: boolean }>;
    };
    REDIRECT_RATE_LIMITER: {
      limit(options: { key: string }): Promise<{ success: boolean }>;
    };
    LINKS: {
      get(
        key: string,
        type: "json",
      ): Promise<{ url: string; expiresAt: number | null } | null>;
      put(key: string, value: string): Promise<void>;
      delete(key: string): Promise<void>;
    };
    CLICK_ANALYTICS: {
      writeDataPoint(event: {
        indexes?: string[];
        doubles?: number[];
        blobs?: string[];
      }): void;
    };
    ANALYTICS: {
      query(request: {
        query: string;
        params?: Record<string, string>;
      }): Promise<{ data: unknown[] }>;
    };
    DB: {
      exec(query: string): Promise<unknown>;
      prepare(query: string): {
        bind(...values: unknown[]): {
          all<T>(): Promise<{ results?: T[] }>;
          first<T>(): Promise<T | null>;
          run(): Promise<unknown>;
        };
      };
      batch(statements: unknown[]): Promise<unknown[]>;
      withSession?(constraint: string): {
        prepare(query: string): unknown;
        batch(statements: unknown[]): Promise<unknown[]>;
      };
    };
    DATABASE_PROVIDER?: string;
  };
}

declare module "virtual:vinext-worker-entry" {
  const handler: {
    fetch(
      request: Request,
      env?: unknown,
      ctx?: unknown,
    ): Response | Promise<Response>;
  };
  export default handler;
}
