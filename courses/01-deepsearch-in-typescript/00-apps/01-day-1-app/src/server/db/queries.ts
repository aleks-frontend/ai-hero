import { and, count, eq, gte, desc } from "drizzle-orm";
import { db } from "./index";
import { users, userRequests, chats, messages } from "./schema";
import type { Message } from "ai";

const DAILY_REQUEST_LIMIT = 2; // Adjust this number as needed

export async function getUserRequestCountToday(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: count() })
    .from(userRequests)
    .where(
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.requestDate, today)
      )
    );

  return result[0]?.count ?? 0;
}

export async function addUserRequest(userId: string, endpoint: string) {
  return await db.insert(userRequests).values({
    userId,
    endpoint,
    requestDate: new Date(),
  });
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const result = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId));

  return result[0]?.isAdmin ?? false;
}

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const currentCount = await getUserRequestCountToday(userId);
  const allowed = currentCount < DAILY_REQUEST_LIMIT;

  return {
    allowed,
    currentCount,
    limit: DAILY_REQUEST_LIMIT,
  };
}

export async function upsertChat(opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}) {
  const { userId, chatId, title, messages: messageList } = opts;

  // First, check if the chat exists and belongs to the user
  const existingChat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId)));

  if (existingChat.length > 0) {
    if (existingChat[0]?.userId !== userId) {
      throw new Error("Chat does not belong to the user");
    }

    // Chat exists, delete all existing messages and replace them
    await db.delete(messages).where(eq(messages.chatId, chatId));
  } else {
    // Chat doesn't exist, create a new one
    await db.insert(chats).values({
      id: chatId,
      userId,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Insert all messages
  if (messageList.length > 0) {
    const messageValues = messageList.map((message, index) => ({
      id: message.id,
      chatId,
      role: message.role,
      parts: message.parts,
      order: index,
    }));

    await db.insert(messages).values(messageValues);
  }

  return { chatId };
}

export async function getChat(chatId: string, userId: string) {
  const chat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

  if (chat.length === 0) {
    return null;
  }

  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.order);

  const messagesWithParts = chatMessages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts,
  }));

  return {
    ...chat[0],
    messages: messagesWithParts,
  };
}

export async function getChats(userId: string) {
  return await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
} 