import { clearAuthCookie } from "@/lib/auth";
import { apiSuccess } from "@/lib/api";

export async function POST() {
  const response = apiSuccess({ message: "Logged out" });
  return clearAuthCookie(response);
}
