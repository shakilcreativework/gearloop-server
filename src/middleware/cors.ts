import cors from "cors";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

export const corsMiddleware = cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
});
