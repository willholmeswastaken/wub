import { ClickService } from "@/server/domain/click-service";
import { type LogClickEvent } from "@/server/qstash";
import { runApp } from "@/server/run-app";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import { Effect, Exit } from "effect";
import { NextResponse } from "next/server";

async function handler(request: Request) {
  const data = (await request.json()) as LogClickEvent;
  const messageId =
    request.headers.get("upstash-message-id") ?? crypto.randomUUID();

  const exit = await runApp(
    Effect.flatMap(ClickService, (service) =>
      service.persistClick({ event: data, messageId }),
    ),
  );

  if (Exit.isFailure(exit)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  return Response.json({
    success: true,
    duplicate: exit.value.duplicate,
  });
}

export async function POST(request: Request) {
  return verifySignatureAppRouter(handler)(request);
}
