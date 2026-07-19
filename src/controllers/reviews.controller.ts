import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { ReviewDoc, ListingDoc } from "../types";
import { getParam } from "../utils/params";

export async function createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const reviews = db.collection<ReviewDoc>("reviews");
    const listings = db.collection<ListingDoc>("listings");

    const { listingId, reviewerId, rating, comment } = req.body;

    if (!ObjectId.isValid(listingId)) {
      res.status(400).json({
        error: { message: "Invalid listing ID", code: "VALIDATION_ERROR" },
      });
      return;
    }

    const review: ReviewDoc = {
      _id: new ObjectId(),
      listingId: new ObjectId(listingId),
      reviewerId,
      rating,
      comment,
      createdAt: new Date(),
    };

    await reviews.insertOne(review);

    // Update listing's average rating and review count
    const allReviews = await reviews
      .find({ listingId: new ObjectId(listingId) })
      .toArray();

    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / allReviews.length;

    await listings.updateOne(
      { _id: new ObjectId(listingId) },
      {
        $set: {
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: allReviews.length,
          updatedAt: new Date(),
        },
      }
    );

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
}

export async function getReviewsByListing(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDb();
    const reviews = db.collection<ReviewDoc>("reviews");

    const listingId = getParam(req, "listingId");

    if (!ObjectId.isValid(listingId)) {
      res.status(400).json({
        error: { message: "Invalid listing ID", code: "VALIDATION_ERROR" },
      });
      return;
    }

    const results = await reviews
      .find({ listingId: new ObjectId(listingId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ reviews: results });
  } catch (err) {
    next(err);
  }
}
