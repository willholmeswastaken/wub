import { EventSchemas, Inngest } from "inngest";
import { LogClickEvent } from "./functions/log-click";

type Events = {
    "link/log-click": LogClickEvent;
};

export const inngest = new Inngest({
    id: "wub",
    schemas: new EventSchemas().fromRecord<Events>()
});
