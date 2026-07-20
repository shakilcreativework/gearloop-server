import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  validateListingBody,
  validateBookingBody,
  validateBookingUpdateBody,
  validateReviewBody,
} from "../utils/validate";

function mockReq(body: unknown = {}): Request {
  return { body } as Request;
}

function mockRes(): Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  return res;
}

function mockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

// ─── validateListingBody ───────────────────────────────────────────

const VALID_LISTING = {
  title: "Alpine Tent",
  shortDescription: "A lightweight 2-person tent",
  fullDescription: "Full description of the alpine tent with details.",
  category: "camping",
  pricePerDay: 45,
  currency: "USD",
  location: "Denver, CO",
  images: ["https://example.com/tent.jpg"],
  condition: "good",
  available: true,
  tags: ["tent", "outdoor"],
};

describe("validateListingBody", () => {
  it("calls next() on valid body", () => {
    const req = mockReq(VALID_LISTING);
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not a plain object", () => {
    const req = mockReq("not an object");
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: "VALIDATION_ERROR" }) }),
    );
  });

  it("returns 400 when body is an array", () => {
    const req = mockReq([1, 2, 3]);
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects unknown fields", () => {
    const req = mockReq({ ...VALID_LISTING, hacker: "drop" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    const details = body.error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "hacker" })]),
    );
  });

  it("rejects empty title", () => {
    const req = mockReq({ ...VALID_LISTING, title: "" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(expect.arrayContaining([expect.objectContaining({ field: "title" })]));
  });

  it("rejects non-string title", () => {
    const req = mockReq({ ...VALID_LISTING, title: 123 });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects title over 100 characters", () => {
    const req = mockReq({ ...VALID_LISTING, title: "x".repeat(101) });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "title", message: expect.stringContaining("100") })]),
    );
  });

  it("rejects empty shortDescription", () => {
    const req = mockReq({ ...VALID_LISTING, shortDescription: "" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "shortDescription" })]),
    );
  });

  it("rejects shortDescription over 300 characters", () => {
    const req = mockReq({ ...VALID_LISTING, shortDescription: "x".repeat(301) });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects empty fullDescription", () => {
    const req = mockReq({ ...VALID_LISTING, fullDescription: "" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects invalid category enum", () => {
    const req = mockReq({ ...VALID_LISTING, category: "invalid" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "category", message: expect.stringContaining("Category") })]),
    );
  });

  it("rejects non-positive pricePerDay", () => {
    const req = mockReq({ ...VALID_LISTING, pricePerDay: -5 });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "pricePerDay" })]),
    );
  });

  it("rejects zero pricePerDay", () => {
    const req = mockReq({ ...VALID_LISTING, pricePerDay: 0 });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects non-number pricePerDay", () => {
    const req = mockReq({ ...VALID_LISTING, pricePerDay: "free" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects non-array images", () => {
    const req = mockReq({ ...VALID_LISTING, images: "one.jpg" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "images", message: expect.stringContaining("array") })]),
    );
  });

  it("rejects non-string items in images array", () => {
    const req = mockReq({ ...VALID_LISTING, images: [123, "ok.jpg"] });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "images[0]" })]),
    );
  });

  it("rejects invalid condition enum", () => {
    const req = mockReq({ ...VALID_LISTING, condition: "broken" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects non-array tags", () => {
    const req = mockReq({ ...VALID_LISTING, tags: "solo" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects non-string tags in array", () => {
    const req = mockReq({ ...VALID_LISTING, tags: [1, "ok"] });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "tags[0]" })]),
    );
  });

  it("allows body with only optional fields present", () => {
    const req = mockReq({ title: "Test", shortDescription: "Short", fullDescription: "Long", category: "camping" });
    const res = mockRes();
    const next = mockNext();

    validateListingBody(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

// ─── validateBookingBody ───────────────────────────────────────────

const VALID_BOOKING = {
  listingId: "507f1f77bcf86cd799439011",
  renterId: "user123",
  startDate: "2026-08-01",
  endDate: "2026-08-05",
};

describe("validateBookingBody", () => {
  it("calls next() on valid body", () => {
    const req = mockReq(VALID_BOOKING);
    const res = mockRes();
    const next = mockNext();

    validateBookingBody(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not a plain object", () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = mockNext();

    validateBookingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects unknown fields", () => {
    const req = mockReq({ ...VALID_BOOKING, malicious: true });
    const res = mockRes();
    const next = mockNext();

    validateBookingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "malicious" })]),
    );
  });

  it("rejects empty listingId", () => {
    const req = mockReq({ ...VALID_BOOKING, listingId: "" });
    const res = mockRes();
    const next = mockNext();

    validateBookingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "listingId" })]),
    );
  });

  it("rejects invalid startDate format", () => {
    const req = mockReq({ ...VALID_BOOKING, startDate: "08/01/2026" });
    const res = mockRes();
    const next = mockNext();

    validateBookingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "startDate", message: expect.stringContaining("YYYY-MM-DD") })]),
    );
  });

  it("rejects invalid endDate format", () => {
    const req = mockReq({ ...VALID_BOOKING, endDate: "Aug 5" });
    const res = mockRes();
    const next = mockNext();

    validateBookingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects non-string renterId", () => {
    const req = mockReq({ ...VALID_BOOKING, renterId: 42 });
    const res = mockRes();
    const next = mockNext();

    validateBookingBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── validateBookingUpdateBody ─────────────────────────────────────

describe("validateBookingUpdateBody", () => {
  it("calls next() on valid paymentStatus", () => {
    const req = mockReq({ paymentStatus: "paid" });
    const res = mockRes();
    const next = mockNext();

    validateBookingUpdateBody(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("calls next() on valid status", () => {
    const req = mockReq({ status: "confirmed" });
    const res = mockRes();
    const next = mockNext();

    validateBookingUpdateBody(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("calls next() on both valid fields", () => {
    const req = mockReq({ paymentStatus: "paid", status: "confirmed" });
    const res = mockRes();
    const next = mockNext();

    validateBookingUpdateBody(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 400 when body is not a plain object", () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = mockNext();

    validateBookingUpdateBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects unknown fields", () => {
    const req = mockReq({ status: "confirmed", hacker: true });
    const res = mockRes();
    const next = mockNext();

    validateBookingUpdateBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "hacker" })]),
    );
  });

  it("rejects invalid paymentStatus enum", () => {
    const req = mockReq({ paymentStatus: "stolen" });
    const res = mockRes();
    const next = mockNext();

    validateBookingUpdateBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects invalid status enum", () => {
    const req = mockReq({ status: "deleted" });
    const res = mockRes();
    const next = mockNext();

    validateBookingUpdateBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── validateReviewBody ────────────────────────────────────────────

const VALID_REVIEW = {
  listingId: "507f1f77bcf86cd799439011",
  reviewerId: "user123",
  rating: 4,
  comment: "Great tent, kept me dry in the rain.",
};

describe("validateReviewBody", () => {
  it("calls next() on valid body", () => {
    const req = mockReq(VALID_REVIEW);
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not a plain object", () => {
    const req = mockReq(null);
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects unknown fields", () => {
    const req = mockReq({ ...VALID_REVIEW, extra: true });
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "extra" })]),
    );
  });

  it("rejects empty listingId", () => {
    const req = mockReq({ ...VALID_REVIEW, listingId: "" });
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects non-integer rating", () => {
    const req = mockReq({ ...VALID_REVIEW, rating: 3.5 });
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "rating", message: expect.stringContaining("integer") })]),
    );
  });

  it("rejects rating below 1", () => {
    const req = mockReq({ ...VALID_REVIEW, rating: 0 });
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects rating above 5", () => {
    const req = mockReq({ ...VALID_REVIEW, rating: 6 });
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects empty comment", () => {
    const req = mockReq({ ...VALID_REVIEW, comment: "" });
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const details = res.json.mock.calls[0][0].error.details;
    expect(details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "comment" })]),
    );
  });

  it("rejects non-string comment", () => {
    const req = mockReq({ ...VALID_REVIEW, comment: 123 });
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects empty reviewerId", () => {
    const req = mockReq({ ...VALID_REVIEW, reviewerId: "" });
    const res = mockRes();
    const next = mockNext();

    validateReviewBody(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
