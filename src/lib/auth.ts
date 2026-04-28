import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { UserModel } from "@/models/User";
import { connectToDatabase } from "@/lib/db";
import { signAuthToken, verifyAuthToken } from "@/lib/jwt";
import type { SafeUser } from "@/types";

const AUTH_COOKIE = "crm_token";

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const toSafeUser = (user: {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  createdAt: Date;
}): SafeUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
});

export const createAuthResponse = (
  response: NextResponse,
  payload: { sub: string; role: "admin" | "agent"; email: string; name: string },
) => {
  const token = signAuthToken(payload);
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
};

export const clearAuthCookie = (response: NextResponse) => {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
};

export const getTokenFromRequest = (request: NextRequest) => {
  return request.cookies.get(AUTH_COOKIE)?.value || null;
};

export const getAuthPayloadFromRequest = (request: NextRequest) => {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return verifyAuthToken(token);
};

export const getServerUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  await connectToDatabase();
  const user = await UserModel.findById(payload.sub);

  if (!user) {
    return null;
  }

  return toSafeUser({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  });
};

export const getAuthCookieName = () => AUTH_COOKIE;
