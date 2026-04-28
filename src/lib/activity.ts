import { ActivityLogModel } from "@/models/ActivityLog";
import type { ActivityType } from "@/types";

export const ACTIVITY_TYPES = {
  CREATED: "created",
  UPDATED: "updated",
  ASSIGNED: "assigned",
  CONTACTED: "contacted",
  FOLLOWUP_SCHEDULED: "followup_scheduled",
  STATUS_CHANGED: "status_changed",
  NOTE_ADDED: "note_added",
} as const;

export const logLeadActivity = async ({
  leadId,
  actorId,
  type,
  description,
  metadata,
}: {
  leadId: string;
  actorId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}) => {
  return ActivityLogModel.create({
    leadId,
    actorId,
    type,
    description,
    metadata: metadata || {},
  });
};

export const getLeadActivities = async (leadId: string) => {
  return ActivityLogModel.find({ leadId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("actorId", "name email");
};
