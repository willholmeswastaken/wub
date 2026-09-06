import { ClickService } from "@/server/domain/click-service";
import { runApp } from "@/server/run-app";
import { geolocation, ipAddress } from "@vercel/functions";
import { Effect, Exit } from "effect";
import { redirect } from "next/navigation";
import { type NextRequest, userAgent } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string[] }> },
) {
  const { code } = await params;
  const shortCode = code.join("/");
  const ua = userAgent(request);
  const geo = geolocation(request);

  const exit = await runApp(
    Effect.flatMap(ClickService, (service) =>
      service.resolveAndEnqueue({
        shortCode,
        event: ua.isBot
          ? undefined
          : {
              short_code: shortCode,
              ipAddress: ipAddress(request) ?? "",
              userAgent: ua.ua,
              country: geo.country ?? "unknown",
              city: geo.city ?? "unknown",
              region: geo.countryRegion ?? "unknown",
              latitude: geo.latitude ?? "unknown",
              longitude: geo.longitude ?? "unknown",
              device: ua.device.type ?? "desktop",
              device_vendor: ua.device.vendor ?? "unknown",
              device_model: ua.device.model ?? "unknown",
              browser: ua.browser.name ?? "unknown",
              browser_version: ua.browser.version ?? "unknown",
              engine: ua.engine.name ?? "unknown",
              engine_version: ua.engine.version ?? "unknown",
              os: ua.os.name ?? "unknown",
              os_version: ua.os.version ?? "unknown",
              cpu_architecture: ua.cpu.architecture ?? "unknown",
            },
      }),
    ),
  );

  if (Exit.isFailure(exit)) {
    redirect("/");
  }
  redirect(exit.value.url);
}
