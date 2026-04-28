import { Schema, model, models, type InferSchemaType } from "mongoose";
import { ACTIVITY_TYPES } from "@/types";

const activityLogSchema = new Schema(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        ACTIVITY_TYPES.CREATED,
        ACTIVITY_TYPES.UPDATED,
        ACTIVITY_TYPES.STATUS_CHANGED,
        ACTIVITY_TYPES.ASSIGNED,
        ACTIVITY_TYPES.REASSIGNED,
        ACTIVITY_TYPES.NOTE_UPDATED,
        ACTIVITY_TYPES.FOLLOW_UP_SET,
        ACTIVITY_TYPES.PRIORITY_CHANGED,
        ACTIVITY_TYPES.DELETED,
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export type ActivityLogDocument = InferSchemaType<typeof activityLogSchema> & {
  _id: string;
};

export const ActivityLogModel =
  models.ActivityLog || model("ActivityLog", activityLogSchema);
