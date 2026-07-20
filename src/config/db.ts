import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  console.warn("MONGODB_URI is not defined — database routes will fail until it is set");
}

if (!MONGODB_DB_NAME) {
  throw new Error(
    "MONGODB_DB_NAME is not defined in environment variables. " +
      "Set it in your .env file (e.g. MONGODB_DB_NAME=gearloop).",
  );
}

const uri: string = MONGODB_URI || "";

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db(MONGODB_DB_NAME);

  console.log("Connected to MongoDB");
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return db;
}

export function getClient(): MongoClient {
  if (!client) {
    throw new Error("Client not initialized. Call connectToDatabase() first.");
  }
  return client;
}
