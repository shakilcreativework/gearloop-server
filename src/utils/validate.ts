import { Request, Response, NextFunction } from "express";

const VALID_CATEGORIES = [
  "camping",
  "water-sports",
  "cycling",
  "climbing",
  "photography",
  "winter-sports",
] as const;

const VALID_CONDITIONS = ["new", "excellent", "good", "fair"] as const;

const VALID_BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
] as const;

const VALID_PAYMENT_STATUSES = ["pending", "paid", "refunded"] as const;

interface ValidationError {
  field: string;
  message: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownFields(
  body: Record<string, unknown>,
  allowedFields: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const key of Object.keys(body)) {
    if (!allowedFields.includes(key)) {
      errors.push({ field: key, message: `Unknown field "${key}"` });
    }
  }
  return errors;
}

export function validateListingBody(req: Request, res: Response, next: NextFunction): void {
  if (!isPlainObject(req.body)) {
    res.status(400).json({
      error: { message: "Request body must be a JSON object", code: "VALIDATION_ERROR" },
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const errors: ValidationError[] = [];

  const allowedFields = [
    "title",
    "shortDescription",
    "fullDescription",
    "category",
    "pricePerDay",
    "currency",
    "location",
    "images",
    "condition",
    "available",
    "tags",
  ];

  errors.push(...rejectUnknownFields(body, allowedFields));

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      errors.push({ field: "title", message: "Title is required and must be a non-empty string" });
    } else if (body.title.length > 100) {
      errors.push({ field: "title", message: "Title must be 100 characters or fewer" });
    }
  }

  if (body.shortDescription !== undefined) {
    if (typeof body.shortDescription !== "string" || body.shortDescription.trim().length === 0) {
      errors.push({
        field: "shortDescription",
        message: "Short description is required and must be a non-empty string",
      });
    } else if (body.shortDescription.length > 300) {
      errors.push({
        field: "shortDescription",
        message: "Short description must be 300 characters or fewer",
      });
    }
  }

  if (body.fullDescription !== undefined) {
    if (typeof body.fullDescription !== "string" || body.fullDescription.trim().length === 0) {
      errors.push({
        field: "fullDescription",
        message: "Full description is required and must be a non-empty string",
      });
    }
  }

  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category as typeof VALID_CATEGORIES[number])) {
      errors.push({
        field: "category",
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
    }
  }

  if (body.pricePerDay !== undefined) {
    if (typeof body.pricePerDay !== "number" || body.pricePerDay <= 0) {
      errors.push({
        field: "pricePerDay",
        message: "Price per day is required and must be a positive number",
      });
    }
  }

  if (body.currency !== undefined) {
    if (typeof body.currency !== "string" || body.currency.trim().length === 0) {
      errors.push({ field: "currency", message: "Currency is required and must be a string" });
    }
  }

  if (body.location !== undefined) {
    if (typeof body.location !== "string" || body.location.trim().length === 0) {
      errors.push({ field: "location", message: "Location is required and must be a string" });
    }
  }

  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) {
      errors.push({ field: "images", message: "Images must be an array" });
    } else {
      for (let i = 0; i < body.images.length; i++) {
        if (typeof body.images[i] !== "string") {
          errors.push({ field: `images[${i}]`, message: "Each image must be a string URL" });
        }
      }
    }
  }

  if (body.condition !== undefined) {
    if (!VALID_CONDITIONS.includes(body.condition as typeof VALID_CONDITIONS[number])) {
      errors.push({
        field: "condition",
        message: `Condition must be one of: ${VALID_CONDITIONS.join(", ")}`,
      });
    }
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      errors.push({ field: "tags", message: "Tags must be an array" });
    } else {
      for (let i = 0; i < body.tags.length; i++) {
        if (typeof body.tags[i] !== "string") {
          errors.push({ field: `tags[${i}]`, message: "Each tag must be a string" });
        }
      }
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: { message: "Validation failed", code: "VALIDATION_ERROR", details: errors },
    });
    return;
  }

  next();
}

export function validateBookingBody(req: Request, res: Response, next: NextFunction): void {
  if (!isPlainObject(req.body)) {
    res.status(400).json({
      error: { message: "Request body must be a JSON object", code: "VALIDATION_ERROR" },
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const errors: ValidationError[] = [];

  const allowedFields = ["listingId", "renterId", "startDate", "endDate"];

  errors.push(...rejectUnknownFields(body, allowedFields));

  if (body.listingId !== undefined) {
    if (typeof body.listingId !== "string" || body.listingId.trim().length === 0) {
      errors.push({ field: "listingId", message: "Listing ID is required and must be a string" });
    }
  }

  if (body.renterId !== undefined) {
    if (typeof body.renterId !== "string" || body.renterId.trim().length === 0) {
      errors.push({ field: "renterId", message: "Renter ID is required and must be a string" });
    }
  }

  if (body.startDate !== undefined) {
    if (typeof body.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
      errors.push({
        field: "startDate",
        message: "Start date is required and must be in YYYY-MM-DD format",
      });
    }
  }

  if (body.endDate !== undefined) {
    if (typeof body.endDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.endDate)) {
      errors.push({
        field: "endDate",
        message: "End date is required and must be in YYYY-MM-DD format",
      });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: { message: "Validation failed", code: "VALIDATION_ERROR", details: errors },
    });
    return;
  }

  next();
}

export function validateReviewBody(req: Request, res: Response, next: NextFunction): void {
  if (!isPlainObject(req.body)) {
    res.status(400).json({
      error: { message: "Request body must be a JSON object", code: "VALIDATION_ERROR" },
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const errors: ValidationError[] = [];

  const allowedFields = ["listingId", "reviewerId", "rating", "comment"];

  errors.push(...rejectUnknownFields(body, allowedFields));

  if (body.listingId !== undefined) {
    if (typeof body.listingId !== "string" || body.listingId.trim().length === 0) {
      errors.push({ field: "listingId", message: "Listing ID is required and must be a string" });
    }
  }

  if (body.reviewerId !== undefined) {
    if (typeof body.reviewerId !== "string" || body.reviewerId.trim().length === 0) {
      errors.push({ field: "reviewerId", message: "Reviewer ID is required and must be a string" });
    }
  }

  if (body.rating !== undefined) {
    if (typeof body.rating !== "number" || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      errors.push({
        field: "rating",
        message: "Rating is required and must be an integer between 1 and 5",
      });
    }
  }

  if (body.comment !== undefined) {
    if (typeof body.comment !== "string" || body.comment.trim().length === 0) {
      errors.push({ field: "comment", message: "Comment is required and must be a non-empty string" });
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: { message: "Validation failed", code: "VALIDATION_ERROR", details: errors },
    });
    return;
  }

  next();
}
