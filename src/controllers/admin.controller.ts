import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { ListingDoc, ReviewDoc, UserDoc } from "../types";
import { getParam } from "../utils/params";

interface AdminUserSummary {
  _id: string;
  name: string;
  email: string;
  createdAt: Date;
  listingCount: number;
  bookingCount: number;
}

interface AdminStats {
  totalUsers: number;
  totalListings: number;
  totalBookings: number;
  totalRevenue: number;
}

interface AdminReviewSummary {
  _id: string;
  listingId: string;
  listingTitle: string;
  reviewerId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export async function getAdminUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const db = getDb();
    const usersCol = db.collection<UserDoc>("users");
    const listingsCol = db.collection<ListingDoc>("listings");
    const bookingsCol = db.collection("bookings");

    const users = await usersCol.find().sort({ createdAt: -1 }).toArray();

    const summaries: AdminUserSummary[] = await Promise.all(
      users.map(async (u) => {
        const uid = u._id.toString();
        const [listingCount, bookingCount] = await Promise.all([
          listingsCol.countDocuments({ ownerId: uid }),
          bookingsCol.countDocuments({ renterId: uid }),
        ]);
        return {
          _id: uid,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          listingCount,
          bookingCount,
        };
      }),
    );

    res.json({ users: summaries });
  } catch (err) {
    next(err);
  }
}

export async function getAdminStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const db = getDb();
    const usersCol = db.collection<UserDoc>("users");
    const listingsCol = db.collection<ListingDoc>("listings");
    const bookingsCol = db.collection("bookings");

    const [totalUsers, totalListings, totalBookings, revenueResult] =
      await Promise.all([
        usersCol.countDocuments(),
        listingsCol.countDocuments(),
        bookingsCol.countDocuments(),
        bookingsCol
          .aggregate([
            { $match: { paymentStatus: "paid" } },
            {
              $group: {
                _id: null,
                total: { $sum: "$totalPrice" },
              },
            },
          ])
          .toArray(),
      ]);

    const totalRevenue =
      revenueResult.length > 0 ? (revenueResult[0] as any).total : 0;

    const stats: AdminStats = {
      totalUsers,
      totalListings,
      totalBookings,
      totalRevenue,
    };

    res.json({ stats });
  } catch (err) {
    next(err);
  }
}

export async function getAdminListings(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const db = getDb();
    const collection = db.collection<ListingDoc>("listings");

    const listings = await collection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ listings });
  } catch (err) {
    next(err);
  }
}

export async function getAdminReviews(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const db = getDb();
    const reviewsCol = db.collection<ReviewDoc>("reviews");
    const listingsCol = db.collection<ListingDoc>("listings");

    const reviews = await reviewsCol.find().sort({ createdAt: -1 }).toArray();

    const listingIds = [...new Set(reviews.map((r) => r.listingId.toString()))];
    const listings = await listingsCol
      .find({ _id: { $in: listingIds.map((id) => new ObjectId(id)) } })
      .toArray();

    const listingMap = new Map(
      listings.map((l) => [l._id.toString(), l.title]),
    );

    const summaries: AdminReviewSummary[] = reviews.map((r) => ({
      _id: r._id.toString(),
      listingId: r.listingId.toString(),
      listingTitle: listingMap.get(r.listingId.toString()) ?? "Unknown",
      reviewerId: r.reviewerId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));

    res.json({ reviews: summaries });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteListing(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const db = getDb();
    const collection = db.collection<ListingDoc>("listings");

    const id = getParam(req, "id");

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        error: { message: "Invalid listing ID", code: "VALIDATION_ERROR" },
      });
      return;
    }

    const existing = await collection.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      res.status(404).json({
        error: { message: "Listing not found", code: "NOT_FOUND" },
      });
      return;
    }

    await collection.deleteOne({ _id: new ObjectId(id) });

    res.json({ message: "Listing deleted by admin" });
  } catch (err) {
    next(err);
  }
}

export async function adminDeleteReview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const db = getDb();
    const reviewsCol = db.collection<ReviewDoc>("reviews");
    const listingsCol = db.collection<ListingDoc>("listings");

    const id = getParam(req, "id");

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        error: { message: "Invalid review ID", code: "VALIDATION_ERROR" },
      });
      return;
    }

    const existing = await reviewsCol.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      res.status(404).json({
        error: { message: "Review not found", code: "NOT_FOUND" },
      });
      return;
    }

    await reviewsCol.deleteOne({ _id: new ObjectId(id) });

    const remainingReviews = await reviewsCol
      .find({ listingId: existing.listingId })
      .toArray();

    if (remainingReviews.length > 0) {
      const totalRating = remainingReviews.reduce(
        (sum, r) => sum + r.rating,
        0,
      );
      const avgRating = totalRating / remainingReviews.length;
      await listingsCol.updateOne(
        { _id: existing.listingId },
        {
          $set: {
            rating: Math.round(avgRating * 10) / 10,
            reviewCount: remainingReviews.length,
            updatedAt: new Date(),
          },
        },
      );
    } else {
      await listingsCol.updateOne(
        { _id: existing.listingId },
        {
          $set: {
            rating: 0,
            reviewCount: 0,
            updatedAt: new Date(),
          },
        },
      );
    }

    res.json({ message: "Review deleted by admin" });
  } catch (err) {
    next(err);
  }
}
