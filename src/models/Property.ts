import { Schema, model, models, type InferSchemaType } from "mongoose";
import { PROPERTY_STATUS, PROPERTY_TYPE } from "@/types";

const propertySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        PROPERTY_TYPE.HOUSE,
        PROPERTY_TYPE.APARTMENT,
        PROPERTY_TYPE.PLOT,
        PROPERTY_TYPE.COMMERCIAL,
      ],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    area: {
      type: Number,
      required: true,
    },
    bedrooms: {
      type: Number,
      default: 0,
    },
    bathrooms: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        PROPERTY_STATUS.AVAILABLE,
        PROPERTY_STATUS.SOLD,
        PROPERTY_STATUS.RENTED,
      ],
      default: PROPERTY_STATUS.AVAILABLE,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export type PropertyDocument = InferSchemaType<typeof propertySchema> & {
  _id: string;
};

export const PropertyModel = models.Property || model("Property", propertySchema);