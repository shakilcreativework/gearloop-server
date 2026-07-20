import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import listingsRouter from "./routes/listings.routes";
import bookingsRouter from "./routes/bookings.routes";
import reviewsRouter from "./routes/reviews.routes";
import usersRouter from "./routes/users.routes";
import adminRouter from "./routes/admin.routes";

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: "10mb" }));

// Rate limiting on write routes
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: { message: "Too many requests, please try again later", code: "RATE_LIMIT" } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Public routes (no rate limiting)
app.use("/api", listingsRouter);
app.use("/api", reviewsRouter);
app.use("/api", usersRouter);
app.use("/api", adminRouter);

// Protected write routes (with rate limiting)
app.post("/api/listings", writeLimiter);
app.put("/api/listings/:id", writeLimiter);
app.delete("/api/listings/:id", writeLimiter);
app.post("/api/bookings", writeLimiter);
app.post("/api/reviews", writeLimiter);
app.delete("/api/admin/listings/:id", writeLimiter);
app.delete("/api/admin/reviews/:id", writeLimiter);

app.use("/api", bookingsRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
