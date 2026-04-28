import { Schema, model, models, type InferSchemaType } from "mongoose";
import { USER_ROLES } from "@/types";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [USER_ROLES.ADMIN, USER_ROLES.AGENT],
      default: USER_ROLES.AGENT,
    },
  },
  {
    timestamps: true,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: string;
};

export const UserModel = models.User || model("User", userSchema);
