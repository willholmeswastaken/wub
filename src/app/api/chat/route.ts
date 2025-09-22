import { xai } from "@ai-sdk/xai";
import { streamText, type UIMessage, convertToModelMessages } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: xai("grok-4-fast-non-reasoning"),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
