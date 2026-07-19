import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { ListingDoc } from "../types";
import { getParam } from "../utils/params";

export async function getListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const collection = db.collection<ListingDoc>("listings");

    const {
      search,
      category,
      minPrice,
      maxPrice,
      minRating,
      sort,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (category) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.pricePerDay = {};
      if (minPrice) filter.pricePerDay.$gte = parseFloat(minPrice);
      if (maxPrice) filter.pricePerDay.$lte = parseFloat(maxPrice);
    }

    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "price-asc") sortOption = { pricePerDay: 1 };
    else if (sort === "price-desc") sortOption = { pricePerDay: -1 };
    else if (sort === "rating") sortOption = { rating: -1 };
    else if (sort === "newest") sortOption = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [listings, total] = await Promise.all([
      collection.find(filter).sort(sortOption).skip(skip).limit(limitNum).toArray(),
      collection.countDocuments(filter),
    ]);

    res.json({
      listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getFeaturedListings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const collection = db.collection<ListingDoc>("listings");

    const listings = await collection
      .find({ available: true })
      .sort({ rating: -1 })
      .limit(8)
      .toArray();

    res.json({ listings });
  } catch (err) {
    next(err);
  }
}

export async function getListingById(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const listing = await collection.findOne({ _id: new ObjectId(id) });

    if (!listing) {
      res.status(404).json({
        error: { message: "Listing not found", code: "NOT_FOUND" },
      });
      return;
    }

    const related = await collection
      .find({ category: listing.category, _id: { $ne: listing._id } })
      .limit(4)
      .toArray();

    res.json({ listing, related });
  } catch (err) {
    next(err);
  }
}

export async function getOwnerListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const collection = db.collection<ListingDoc>("listings");

    const ownerId = getParam(req, "ownerId");

    const listings = await collection
      .find({ ownerId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ listings });
  } catch (err) {
    next(err);
  }
}

export async function createListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const collection = db.collection<ListingDoc>("listings");

    const {
      title,
      shortDescription,
      fullDescription,
      category,
      pricePerDay,
      currency,
      location,
      images,
      condition,
      available,
      tags,
    } = req.body;

    const userId = (req as any).userId;

    const listing: ListingDoc = {
      _id: new ObjectId(),
      ownerId: userId,
      title,
      shortDescription,
      fullDescription: fullDescription || "",
      category,
      pricePerDay,
      currency: currency || "USD",
      location,
      images: images || [],
      condition: condition || "good",
      available: available !== undefined ? available : true,
      rating: 0,
      reviewCount: 0,
      tags: tags || [],
      createdAt: new Date(),
    };

    await collection.insertOne(listing);

    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
}

export async function updateListing(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const userId = (req as any).userId;

    if (existing.ownerId !== userId) {
      res.status(403).json({
        error: { message: "You can only update your own listings", code: "FORBIDDEN" },
      });
      return;
    }

    const updates: Record<string, unknown> = {};
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

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    updates.updatedAt = new Date();

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: "after" }
    );

    res.json({ listing: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const userId = (req as any).userId;

    if (existing.ownerId !== userId) {
      res.status(403).json({
        error: { message: "You can only delete your own listings", code: "FORBIDDEN" },
      });
      return;
    }

    await collection.deleteOne({ _id: new ObjectId(id) });

    res.json({ message: "Listing deleted" });
  } catch (err) {
    next(err);
  }
}

export async function getListingAvailability(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDb();
    const bookings = db.collection("bookings");

    const id = getParam(req, "id");

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        error: { message: "Invalid listing ID", code: "VALIDATION_ERROR" },
      });
      return;
    }

    const bookedDates = await bookings
      .find({
        listingId: new ObjectId(id),
        status: { $in: ["requested", "confirmed", "completed"] },
      })
      .project({ startDate: 1, endDate: 1, _id: 0 })
      .toArray();

    res.json({ bookedDates });
  } catch (err) {
    next(err);
  }
}
