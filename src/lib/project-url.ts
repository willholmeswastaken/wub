import { env } from "@/env";

export function getProjectUrl(includesProtocol = true) {
    if (includesProtocol) {
        return env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL.toLowerCase().includes("localhost")
            ? `http://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/`
            : `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/`
    }
    return `${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/`
}
