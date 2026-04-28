import { Schema, model, models, type InferSchemaType } from "mongoose";
import { LEAD_PRIORITY, LEAD_STATUS } from "@/types";
import { getLeadPriority } from "@/lib/scoring";

const leadSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    propertyInterest: {
      type: String,
      required: true,
      trim: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        LEAD_STATUS.NEW,
        LEAD_STATUS.CONTACTED,
        LEAD_STATUS.ASSIGNED,
        LEAD_STATUS.IN_PROGRESS,
        LEAD_STATUS.CLOSED,
      ],
      default: LEAD_STATUS.NEW,
    },
    notes: {
      type: String,
      default: "",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: String,
      enum: [LEAD_PRIORITY.HIGH, LEAD_PRIORITY.MEDIUM, LEAD_PRIORITY.LOW],
      default: LEAD_PRIORITY.LOW,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

leadSchema.pre("save", function setScoreAndActivity() {
  if (this.isModified("budget") || this.isNew) {
    this.score = getLeadPriority(this.budget);
  }

  if (!this.lastActivityAt || this.isModified()) {
    this.lastActivityAt = new Date();
  }
});

export type LeadDocument = InferSchemaType<typeof leadSchema> & {
  _id: string;
};

export const LeadModel = models.Lead || model("Lead", leadSchema);
