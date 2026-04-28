import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { comparePassword, createAuthResponse, toSafeUser } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid request payload", 422);
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user) {
    return apiError("Invalid credentials", 401);
  }

  const isValidPassword = await comparePassword(parsed.data.password, user.password);
  if (!isValidPassword) {
    return apiError("Invalid credentials", 401);
  }

  const safeUser = toSafeUser({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });

  const response = apiSuccess({ user: safeUser });
  return createAuthResponse(response, {
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
  });
}
