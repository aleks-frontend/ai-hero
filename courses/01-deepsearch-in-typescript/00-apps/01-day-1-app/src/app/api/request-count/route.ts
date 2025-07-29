import { auth } from "../../../server/auth";
import { checkRateLimit, isUserAdmin } from "../../../server/db/queries";

export async function GET() {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const rateLimitInfo = await checkRateLimit(userId);
  const adminStatus = await isUserAdmin(userId);

  return new Response(
    JSON.stringify({
      currentCount: rateLimitInfo.currentCount,
      limit: rateLimitInfo.limit,
      isAdmin: adminStatus,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
} 