declare module "cloudflare:workers" {
  export const env: {
    CLICK_QUEUE: {
      send(body: unknown): Promise<unknown>;
    };
    LINK_RATE_LIMITER: {
      limit(options: { key: string }): Promise<{ success: boolean }>;
    };
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
