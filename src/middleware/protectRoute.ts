import { Request, Response, NextFunction } from "express";

export function protectRoute(req: Request, res: Response, next: NextFunction): void {
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

  // TODO: Replace with real Better Auth session verification
  // For now, store the token for downstream use — the actual session
  // verification against Better Auth's session endpoint will be wired
  // once Better Auth is set up in the client.
  (req as any).userId = token;
  next();
}
