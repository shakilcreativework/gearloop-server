import { Request, Response, NextFunction } from "express";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export function protectInternalRoute(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!INTERNAL_API_KEY) {
    console.error("[protectInternalRoute] INTERNAL_API_KEY is not set on the server");
    res.status(500).json({
      error: { message: "Internal service not configured", code: "INTERNAL_ERROR" },
    });
    return;
  }

  const key = req.headers["x-internal-key"];

  if (typeof key !== "string" || key !== INTERNAL_API_KEY) {
    res.status(401).json({
      error: { message: "Invalid internal API key", code: "UNAUTHORIZED" },
    });
    return;
  }

  next();
}
