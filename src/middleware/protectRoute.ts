import { Request, Response, NextFunction } from "express";

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface AuthSessionResponse {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
  user: AuthUser;
}

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

    const data = (await response.json()) as AuthSessionResponse;

    if (!data.session || !data.user) {
      res.status(401).json({
        error: {
          message: "Invalid or expired session",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }

    // Check if session is expired
    const expiresAt = new Date(data.session.expiresAt);
    if (expiresAt.getTime() < Date.now()) {
      res.status(401).json({
        error: {
          message: "Session expired, please log in again",
          code: "SESSION_EXPIRED",
        },
      });
      return;
    }

    // Attach user info for downstream controllers
    (req as any).userId = data.user.id;
    (req as any).userEmail = data.user.email;
    (req as any).userName = data.user.name;

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
