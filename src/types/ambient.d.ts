declare module "cloudflare:workers" {
  export const env: {
    CLICK_QUEUE: {
      send(body: unknown): Promise<unknown>;
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
