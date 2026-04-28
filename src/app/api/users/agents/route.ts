import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess } from "@/lib/api";
import { requireRole, applyRoleRateLimit } from "@/lib/request-helpers";
import { UserModel } from "@/models/User";
import { USER_ROLES } from "@/types";

export async function GET(request: NextRequest) {
  const auth = requireRole(request, [USER_ROLES.ADMIN]);
  if (!auth.payload) {
    return auth.error;
  }

  const rateErr = applyRoleRateLimit({
    request,
    role: auth.payload.role,
    userId: auth.payload.sub,
  });
  if (rateErr) {
    return rateErr;
  }

  await connectToDatabase();

  const agents = await UserModel.find({ role: USER_ROLES.AGENT })
    .select("name email role createdAt")
    .sort({ createdAt: -1 });

  return apiSuccess({
    agents: agents.map((agent) => ({
      id: agent._id.toString(),
      name: agent.name,
      email: agent.email,
      role: agent.role,
      createdAt: agent.createdAt.toISOString(),
    })),
  });
}
