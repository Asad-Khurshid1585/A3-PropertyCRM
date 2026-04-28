import jwt from "jsonwebtoken";
import { getEnv } from "@/lib/env";
import type { AuthTokenPayload } from "@/types";

const env = getEnv();

export const TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh",
} as const;

export const TOKEN_EXPIRY = {
  [TOKEN_TYPES.ACCESS]: "15m",
  [TOKEN_TYPES.REFRESH]: "7d",
} as const;

export const signAuthToken = (
  payload: AuthTokenPayload,
  tokenType: (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES] = TOKEN_TYPES.ACCESS,
) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY[tokenType],
  });
};

export const verifyAuthToken = (token: string): AuthTokenPayload | null => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
};

export const decodeToken = (token: string): AuthTokenPayload | null => {
  try {
    return jwt.decode(token) as AuthTokenPayload | null;
  } catch {
    return null;
  }
};

export const getTokenExpiry = (token: string): Date | null => {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
};
