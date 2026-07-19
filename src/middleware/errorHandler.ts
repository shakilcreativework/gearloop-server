import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  console.error(`[Error] ${statusCode} - ${err.message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  const response: { error: { message: string; code: string } } = {
    error: {
      message: statusCode === 500 && process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
      code,
    },
  };

  res.status(statusCode).json(response);
}
