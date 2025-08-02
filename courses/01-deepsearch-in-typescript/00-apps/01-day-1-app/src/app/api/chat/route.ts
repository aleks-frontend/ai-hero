import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { model } from "../../../models";
import { auth } from "../../../server/auth";
import { searchSerper } from "../../../serper";
import { z } from "zod";
import { checkRateLimit, addUserRequest, isUserAdmin, upsertChat } from "../../../server/db/queries";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  
  // Check if user is admin
  const isAdmin = await isUserAdmin(userId);
  
  // If not admin, check rate limit
  if (!isAdmin) {
    const rateLimitCheck = await checkRateLimit(userId);
    
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `You have exceeded the daily limit of ${rateLimitCheck.limit} requests. You have made ${rateLimitCheck.currentCount} requests today.`,
          currentCount: rateLimitCheck.currentCount,
          limit: rateLimitCheck.limit,
        }),
        { 
          status: 429,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    language?: string;
    chatId?: string;
  };

  const { messages, chatId } = body;

  // Record the request in the database
  await addUserRequest(userId, "/api/chat");

  // Generate a chat ID if not provided
  const finalChatId = chatId ?? crypto.randomUUID();
  
  // Create a chat title from the first user message
  const firstUserMessage = messages.find(msg => msg.role === "user");
  const chatTitle = firstUserMessage?.content?.slice(0, 100) ?? "New Chat";

  // Create the chat immediately with the user's messages
  // This protects against broken streams
  await upsertChat({
    userId,
    chatId: finalChatId,
    title: chatTitle,
    messages,
  });

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const result = streamText({
        model,
        messages,
        system: `You are an AI assistant with access to a web search tool. Please follow these instructions:

1. Always use the search web tool to answer user questions.
2. Always cite your sources with inline links immediately after the relevant fact.
3. Always format any URLs or links in your responses using markdown link syntax: [title](url). Do not paste raw URLs; always use markdown formatting for links.
4. Always display the full cite URL in the markdown link so the user can see the source address.
`,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              console.log("searchWeb tool called with query:", query);
              const results = await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              );
              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
              }));
            },
          },
        },
        maxSteps: 10,
        onFinish({ text, finishReason, usage, response }) {
          const responseMessages = response.messages; // messages that were generated

          const updatedMessages = appendResponseMessages({
            messages, // from the POST body
            responseMessages,
          });

          // Save the updated messages to the database,
          // by saving over the ENTIRE chat, deleting all
          // the old messages and replacing them with the
          // new ones
          upsertChat({
            userId,
            chatId: finalChatId,
            title: chatTitle,
            messages: updatedMessages,
          }).catch((error) => {
            console.error("Failed to save chat messages:", error);
          });
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
} 