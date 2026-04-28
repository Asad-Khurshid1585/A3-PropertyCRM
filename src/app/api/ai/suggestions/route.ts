import { LeadModel } from "@/models/Lead";
import { ActivityLogModel } from "@/models/ActivityLog";
import { USER_ROLES, LEAD_PRIORITY, LEAD_STATUS } from "@/types";
import { connectToDatabase } from "@/lib/db";
import { apiSuccess } from "@/lib/api";
import { requireRole, applyRoleRateLimit } from "@/lib/request-helpers";

interface Suggestion {
  leadId: string;
  leadName: string;
  priority: "high" | "medium" | "low";
  reason: string;
  suggestedAction: string;
  urgency: "immediate" | "this_week" | "this_month";
}

const DAYS = 24 * 60 * 60 * 1000;

const scoreToPriority = (score: number): "high" | "medium" | "low" => {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
};

export async function GET(request: Request) {
  const auth = requireRole(request as never, [USER_ROLES.ADMIN, USER_ROLES.AGENT]);
  if (!auth.payload) {
    return auth.error;
  }

  const rateErr = applyRoleRateLimit({
    request: request as never,
    role: auth.payload.role,
    userId: auth.payload.sub,
  });
  if (rateErr) return rateErr;

  await connectToDatabase();

  const baseQuery: Record<string, unknown> = {
    status: { $ne: LEAD_STATUS.CLOSED },
  };
  if (auth.payload.role === USER_ROLES.AGENT) {
    baseQuery.assignedTo = auth.payload.sub;
  }

  const leads = await LeadModel.find(baseQuery).lean();
  const now = new Date();

  const suggestions: Suggestion[] = [];

  for (const lead of leads) {
    const activities = await ActivityLogModel.find({ leadId: lead._id.toString() })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    const lastActivity = activities[0];
    const daysSinceActivity = lastActivity
      ? (now.getTime() - new Date(lastActivity.createdAt).getTime()) / DAYS
      : 999;

    const isOverdueFollowUp =
      lead.followUpDate && new Date(lead.followUpDate) < now;

    const isHighPriorityLead = lead.score === LEAD_PRIORITY.HIGH;
    const hasHighBudget = (lead.budget as number) > 20_000_000;

    if (isOverdueFollowUp) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "high",
        reason: "Follow-up date has passed",
        suggestedAction: "Contact lead immediately to reschedule",
        urgency: "immediate",
      });
      continue;
    }

    if (isHighPriorityLead && daysSinceActivity > 3) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "high",
        reason: "High priority lead with no recent activity",
        suggestedAction: "Schedule a call or follow-up meeting",
        urgency: "this_week",
      });
      continue;
    }

    if (hasHighBudget && daysSinceActivity > 7) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "medium",
        reason: "High budget lead going stale",
        suggestedAction: "Send property updates or schedule viewing",
        urgency: "this_week",
      });
      continue;
    }

    if (lead.status === LEAD_STATUS.IN_PROGRESS && daysSinceActivity > 5) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "medium",
        reason: "Lead in progress but no recent updates",
        suggestedAction: "Update lead status or schedule next step",
        urgency: "this_week",
      });
      continue;
    }

    if (lead.status === LEAD_STATUS.ASSIGNED && daysSinceActivity > 10) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "low",
        reason: "Assigned lead needs attention",
        suggestedAction: "Review and update lead status",
        urgency: "this_month",
      });
    }
  }

  suggestions.sort((a, b) => {
    const urgencyOrder = { immediate: 0, this_week: 1, this_month: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  return apiSuccess({ suggestions });
}