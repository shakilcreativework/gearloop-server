import { connectToDatabase } from "./config/db";
import { ensureIndexes } from "./config/ensureIndexes";
import app from "./app";

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const db = await connectToDatabase();
    await ensureIndexes(db);
    console.log("MongoDB connected and indexes ensured");
  } catch (err) {
    console.warn("MongoDB connection failed — server is running but database routes will error:", (err as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`GearLoop server running on port ${PORT}`);
  });
}

start();
