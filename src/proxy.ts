import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getEnv } from "@/lib/env";

const env = getEnv();

const tokenName = "crm_token";

const publicRoutes = ["/", "/login", "/signup"];

const isPublicRoute = (pathname: string) => {
  return publicRoutes.includes(pathname);
};

const verify = async (token: string) => {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const result = await jwtVerify(token, secret);

    const payload = result.payload as {
      sub: string;
      role: "admin" | "agent";
      email: string;
      name: string;
    };

    return payload;
  } catch {
    return null;
  }
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(tokenName)?.value;
  const payload = token ? await verify(token) : null;

  if (!payload && !isPublicRoute(pathname) && !pathname.startsWith("/api/auth")) {
    if (pathname.startsWith("/api")) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (payload && (pathname === "/login" || pathname === "/signup" || pathname === "/")) {
    const dashboardRoute = payload.role === "admin" ? "/dashboard/admin" : "/dashboard/agent";
    return NextResponse.redirect(new URL(dashboardRoute, request.url));
  }

  if (payload?.role === "agent" && pathname.startsWith("/dashboard/admin")) {
    return NextResponse.redirect(new URL("/dashboard/agent", request.url));
  }

  if (payload?.role === "admin" && pathname.startsWith("/dashboard/agent")) {
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"],
};
