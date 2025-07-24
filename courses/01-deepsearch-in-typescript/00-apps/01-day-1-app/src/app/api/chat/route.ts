import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
} from "ai";
import { model } from "../../../models";
import { auth } from "../../../server/auth";
import { searchSerper } from "../../../serper";
import { z } from "zod";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = (await request.json()) as {
    messages: Array<Message>;
    language?: string;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages, language } = body;
      const lang = language ?? "Serbian";

      const result = streamText({
        model,
        messages,
        system: `You are an AI assistant with access to a web search tool. Please follow these instructions:

1. Always use the search web tool to answer user questions.
2. Always cite your sources with inline links immediately after the relevant fact.
3. Always format any URLs or links in your responses using markdown link syntax: [title](url). Do not paste raw URLs; always use markdown formatting for links.
4. Always display the full cite URL in the markdown link so the user can see the source address.
`,
        // Removed tools and maxSteps, as search grounding is now native
      });

      result.mergeIntoDataStream(dataStream, { sendSources: true });
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
} 