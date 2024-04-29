import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import { logClick } from "@/server/inngest/functions/log-click";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        /* your functions will be passed here later! */
        logClick
    ],
});
