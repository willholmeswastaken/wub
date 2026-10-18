function unavailable(name: string): never {
  throw new Error(`${name} is not included in the Cloudflare Worker bundle`);
}

export function neon(): never {
  unavailable("Neon");
}

export function Client(): never {
  unavailable("QStash");
}

export function Redis(): never {
  unavailable("Upstash");
}

export const Ratelimit = Object.assign(
  function Ratelimit(): never {
    unavailable("Upstash");
  },
  {
    slidingWindow(): never {
      unavailable("Upstash");
    },
  },
);

function removedLayer(name: string) {
  return new Proxy(
    {},
    {
      get(_target, property) {
        // Not a thenable: Promise.resolve must not treat the stub as one and
        // call a throwing `then`.
        if (property === "then" || typeof property === "symbol")
          return undefined;
        return () => unavailable(name);
      },
    },
  );
}

export const NeonAppDatabaseLive = removedLayer("Neon");

export const UpstashRateLimiterLive = removedLayer("Upstash");

export const QStashClickQueueLive = removedLayer("QStash");

export function verifySignatureAppRouter() {
  return () =>
    new Response(
      "QStash consumer is not included in the Cloudflare Worker bundle",
      {
        status: 404,
      },
    );
}
