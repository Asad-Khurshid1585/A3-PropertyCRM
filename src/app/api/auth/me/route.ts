import { getServerUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api";

export async function GET() {
  const user = await getServerUser();

  if (!user) {
    return apiError("Unauthorized", 401);
  }

  return apiSuccess({ user });
}
