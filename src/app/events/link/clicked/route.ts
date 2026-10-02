import { env } from "@/env";
import { recordClickOutcome } from "@/server/queue/record-click";
import { clickRecorderRuntime } from "@/server/queue/runtime";
import { logClickEventSchema, type LogClickEvent } from "@/server/queue/schema";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";

async function handler(request: Request) {
  const parsed = logClickEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const data: LogClickEvent = parsed.data;
  const outcome = await clickRecorderRuntime.runPromise(
    recordClickOutcome(data),
  );

  if (outcome === "not_found") {
    return new NextResponse("Bad Request", { status: 400 });
  }

  return Response.json({ success: true });
}

function qstashConsumer() {
  const currentSigningKey = env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) {
    return async () =>
      new NextResponse("QStash consumer is not configured", { status: 404 });
  }

  return verifySignatureAppRouter(handler, {
    currentSigningKey,
    nextSigningKey,
  });
}

export const POST = qstashConsumer();
