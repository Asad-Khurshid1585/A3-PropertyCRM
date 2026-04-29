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
    status: { $nin: [LEAD_STATUS.CLOSED_WON, LEAD_STATUS.CLOSED_LOST] },
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
      .limit(10)
      .lean();

    const lastActivity = activities[0];
    const daysSinceActivity = lastActivity
      ? (now.getTime() - new Date(lastActivity.createdAt).getTime()) / DAYS
      : 999;

    const contactAttempts = activities.filter(a => a.type === "status_changed" && a.newStatus === "contacted").length;
    const isOverdueFollowUp = lead.followUpDate && new Date(lead.followUpDate) < now;
    const isHighPriorityLead = lead.score === LEAD_PRIORITY.HIGH;
    const isMediumPriorityLead = lead.score === LEAD_PRIORITY.MEDIUM;
    const hasHighBudget = (lead.budget as number) > 20_000_000;
    const isUnassigned = !lead.assignedTo;
    const isNewLead = lead.status === LEAD_STATUS.NEW;
    const isAssigned = lead.status === LEAD_STATUS.ASSIGNED;
    const isInProgress = lead.status === LEAD_STATUS.IN_PROGRESS;
    const isContacted = lead.status === LEAD_STATUS.CONTACTED;

    if (isOverdueFollowUp) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "high",
        reason: `Follow-up was due on ${new Date(lead.followUpDate!).toLocaleDateString()}`,
        suggestedAction: "Contact lead immediately to reschedule or close the deal",
        urgency: "immediate",
      });
      continue;
    }

    if (isHighPriorityLead && isAssigned && daysSinceActivity > 1) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "high",
        reason: "High priority lead assigned to you - needs immediate attention",
        suggestedAction: "Call or WhatsApp now. High priority leads require daily contact.",
        urgency: "immediate",
      });
      continue;
    }

    if (isHighPriorityLead && isUnassigned) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "high",
        reason: "High priority lead is unassigned - not being worked on",
        suggestedAction: "Assign to an agent immediately to avoid losing this lead",
        urgency: "immediate",
      });
      continue;
    }

    if (contactAttempts >= 3 && daysSinceActivity > 3) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "high",
        reason: `Contacted ${contactAttempts} times but no progress in ${Math.floor(daysSinceActivity)} days`,
        suggestedAction: "Either convert to closed/lost or try a different approach",
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
        suggestedAction: "Schedule a call or follow-up meeting today",
        urgency: "this_week",
      });
      continue;
    }

    if (hasHighBudget && daysSinceActivity > 7) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "medium",
        reason: `High budget lead (PKR ${((lead.budget as number) / 10000000).toFixed(1)} Cr) going stale`,
        suggestedAction: "Send property updates, schedule viewing, or offer exclusive deals",
        urgency: "this_week",
      });
      continue;
    }

    if (isMediumPriorityLead && daysSinceActivity > 5) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "medium",
        reason: "Medium priority lead needs attention",
        suggestedAction: "Follow up with property options matching their budget",
        urgency: "this_week",
      });
      continue;
    }

    if (isInProgress && daysSinceActivity > 5) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "medium",
        reason: "Lead is in progress but no updates in 5+ days",
        suggestedAction: "Update status or schedule next step with the lead",
        urgency: "this_week",
      });
      continue;
    }

    if (isAssigned && daysSinceActivity > 10) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "low",
        reason: "Lead assigned but no activity in over 10 days",
        suggestedAction: "Review lead status - consider re-assigning or closing",
        urgency: "this_month",
      });
      continue;
    }

    if (isNewLead && daysSinceActivity > 2) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "medium",
        reason: "New lead not yet contacted",
        suggestedAction: "First contact is critical - call or WhatsApp immediately",
        urgency: "this_week",
      });
      continue;
    }

    if (isContacted && daysSinceActivity > 7) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "medium",
        reason: "Lead contacted but no follow-up in over a week",
        suggestedAction: "Send property matches or schedule a property visit",
        urgency: "this_week",
      });
      continue;
    }

    if (isUnassigned && isMediumPriorityLead && daysSinceActivity > 3) {
      suggestions.push({
        leadId: lead._id.toString(),
        leadName: lead.name,
        priority: "medium",
        reason: "Medium priority lead unassigned",
        suggestedAction: "Assign to an agent to start working the lead",
        urgency: "this_week",
      });
      continue;
    }
  }

  suggestions.sort((a, b) => {
    const urgencyOrder = { immediate: 0, this_week: 1, this_month: 2 };
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return apiSuccess({ suggestions });
}