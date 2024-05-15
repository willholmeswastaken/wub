import { env } from "@/env";

export function getProjectUrl() {
    return env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL.toLowerCase().includes("localhost")
        ? `http://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/`
        : `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/`
}
