import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess } from "@/lib/api";
import { applyRoleRateLimit, requireRole } from "@/lib/request-helpers";
import { USER_ROLES } from "@/types";
import { LeadModel } from "@/models/Lead";

const ANALYTICS_PERIODS = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
} as const;

const getDateFilter = (period: string) => {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case ANALYTICS_PERIODS.DAY:
      start.setDate(now.getDate() - 1);
      break;
    case ANALYTICS_PERIODS.WEEK:
      start.setDate(now.getDate() - 7);
      break;
    case ANALYTICS_PERIODS.MONTH:
      start.setMonth(now.getMonth() - 1);
      break;
    case ANALYTICS_PERIODS.YEAR:
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return {};
  }

  return { createdAt: { $gte: start } };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";

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

  const dateFilter = getDateFilter(period);

  const [totalLeads, statusDistribution, priorityDistribution, agentPerformance, recentTrend] =
    await Promise.all([
      LeadModel.countDocuments(dateFilter),
      LeadModel.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      LeadModel.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$score", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      LeadModel.aggregate([
        {
          $match: {
            assignedTo: { $ne: null },
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: {
              agent: "$assignedTo",
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.agent",
            totalHandled: { $sum: "$count" },
            statuses: {
              $push: {
                status: "$_id.status",
                count: "$count",
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "agent",
          },
        },
        {
          $project: {
            _id: 0,
            agentId: "$_id",
            totalHandled: 1,
            statuses: 1,
            agentName: { $arrayElemAt: ["$agent.name", 0] },
            agentEmail: { $arrayElemAt: ["$agent.email", 0] },
          },
        },
        {
          $sort: {
            totalHandled: -1,
          },
        },
      ]),
      LeadModel.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
    ]);

  return apiSuccess({
    totalLeads,
    statusDistribution: statusDistribution.map((item) => ({
      status: item._id,
      count: item.count,
    })),
    priorityDistribution: priorityDistribution.map((item) => ({
      priority: item._id,
      count: item.count,
    })),
    agentPerformance: agentPerformance.map((item) => ({
      ...item,
      agentId: item.agentId.toString(),
    })),
    recentTrend: recentTrend.map((item) => ({
      date: item._id,
      count: item.count,
    })),
  });
}