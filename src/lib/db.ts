// Database connection with cached mongoose connection for hot reloads
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

// Cache mongoose connection across hot reloads in development
declare global {
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

global.mongooseCache ||= {
  conn: null,
  promise: null,
};

/**
 * Connect to MongoDB with connection caching
 * Reuses existing connection in development to prevent too many connections
 */
async function dbConnect(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
  }

  if (global.mongooseCache.conn) {
    return global.mongooseCache.conn;
  }

  if (!global.mongooseCache.promise) {
    const opts = { bufferCommands: false };
    global.mongooseCache.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    global.mongooseCache.conn = await global.mongooseCache.promise;
  } catch (err) {
    global.mongooseCache.promise = null;
    throw err;
  }

  return global.mongooseCache.conn;
}

export default dbConnect;
