import { Request } from "express";

/**
 * Extract a single string value from Express route params.
 * Express 5 types union params as `string | string[]`; this helper
 * normalises to a plain string for downstream use.
 */
export function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}
