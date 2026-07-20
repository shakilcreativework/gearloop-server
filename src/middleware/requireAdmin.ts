import { Request, Response, NextFunction } from "express";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if ((req as any).userRole !== "admin") {
    res.status(403).json({
      error: { message: "Admin access required", code: "FORBIDDEN" },
    });
    return;
  }
  next();
}
