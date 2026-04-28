import mongoose from "mongoose";
import { getEnv } from "@/lib/env";

declare global {
  var mongooseConn:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = global.mongooseConn || { conn: null, promise: null };

const MONGODB_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI || MONGODB_URI.trim() === "") {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  
  console.log("[DB] Connecting to MongoDB...");
  
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      dbName: "property_dealer_crm",
      ...MONGODB_OPTIONS,
    });
  }

  cached.conn = await cached.promise;
  global.mongooseConn = cached;

  return cached.conn;
}

export async function disconnectFromDatabase() {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
