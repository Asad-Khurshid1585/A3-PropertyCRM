import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { createAuthResponse, hashPassword, toSafeUser } from "@/lib/auth";
import { signupSchema } from "@/lib/validators";
import { UserModel } from "@/models/User";
import { USER_ROLES } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || "Invalid request payload", 422);
  }

  await connectToDatabase();

  const existing = await UserModel.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    return apiError("Email already registered", 409);
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  const shouldCreateAdmin = (await UserModel.countDocuments()) === 0;
  const user = await UserModel.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    password: hashedPassword,
    role: shouldCreateAdmin
      ? USER_ROLES.ADMIN
      : parsed.data.role || USER_ROLES.AGENT,
  });

  const safeUser = toSafeUser({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });

  const response = apiSuccess({ user: safeUser }, 201);
  return createAuthResponse(response, {
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
  });
}
