import { and, count, eq, gte } from "drizzle-orm";
import { db } from "./index";
import { users, userRequests } from "./schema";

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