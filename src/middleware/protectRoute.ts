import { Request, Response, NextFunction } from "express";

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export async function protectRoute(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: { message: "Authentication required", code: "UNAUTHORIZED" },
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({
      error: { message: "Invalid authentication token", code: "UNAUTHORIZED" },
    });
    return;
  }

  try {
    const response = await fetch(`${BETTER_AUTH_URL}/api/auth/get-session`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      res.status(401).json({
        error: {
          message: "Invalid or expired session",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      res.status(401).json({
        error: {
          message: "Invalid authentication response",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    if (
      data == null ||
      typeof data !== "object" ||
      !("session" in data) ||
      !("user" in data)
    ) {
      res.status(401).json({
        error: {
          message: "Invalid or expired session",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    const rec = data as Record<string, unknown>;
    const session = rec.session;
    const user = rec.user;

    if (
      session == null ||
      typeof session !== "object" ||
      user == null ||
      typeof user !== "object"
    ) {
      res.status(401).json({
        error: {
          message: "Invalid or expired session",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    const s = session as Record<string, unknown>;
    const u = user as Record<string, unknown>;

    if (
      typeof s.expiresAt !== "string" ||
      isNaN(new Date(s.expiresAt).getTime())
    ) {
      res.status(401).json({
        error: {
          message: "Invalid or expired session",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    const expiresAt = new Date(s.expiresAt);
    if (expiresAt.getTime() < Date.now()) {
      res.status(401).json({
        error: {
          message: "Session expired, please log in again",
          code: "SESSION_EXPIRED",
        },
      });
      return;
    }

    if (typeof u.id !== "string" || typeof u.email !== "string" || typeof u.name !== "string") {
      res.status(401).json({
        error: {
          message: "Invalid or expired session",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    (req as any).userId = u.id;
    (req as any).userEmail = u.email;
    (req as any).userName = u.name;
    (req as any).userRole = typeof u.role === "string" ? u.role : "renter";

    next();
  } catch (err) {
    console.error("[protectRoute] Session verification failed:", err);
    res.status(401).json({
      error: {
        message: "Authentication service unavailable",
        code: "AUTH_SERVICE_ERROR",
      },
    });
  }
}
