import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { BookingDoc } from "../types";
import { getParam } from "../utils/params";

export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const bookings = db.collection<BookingDoc>("bookings");

    const { listingId, renterId, startDate, endDate } = req.body;

    if (!ObjectId.isValid(listingId)) {
      res.status(400).json({
        error: { message: "Invalid listing ID", code: "VALIDATION_ERROR" },
      });
      return;
    }

    // Overlap check: find any existing booking for this listing with a
    // non-cancelled status whose date range intersects the requested range.
    const overlap = await bookings.findOne({
      listingId: new ObjectId(listingId),
      status: { $in: ["requested", "confirmed", "completed"] },
      $and: [
        { startDate: { $lt: endDate } },
        { endDate: { $gt: startDate } },
      ],
    });

    if (overlap) {
      res.status(409).json({
        error: {
          message: "The requested dates conflict with an existing booking",
          code: "DATE_CONFLICT",
        },
      });
      return;
    }

    // Compute total days and price
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Fetch listing for price
    const listings = db.collection("listings");
    const listing = await listings.findOne({ _id: new ObjectId(listingId) });

    if (!listing) {
      res.status(404).json({
        error: { message: "Listing not found", code: "NOT_FOUND" },
      });
      return;
    }

    const totalPrice = totalDays * (listing as any).pricePerDay;

    const booking: BookingDoc = {
      _id: new ObjectId(),
      listingId: new ObjectId(listingId),
      renterId,
      startDate,
      endDate,
      totalDays,
      totalPrice,
      paymentProvider: "paddle",
      paymentStatus: "pending",
      status: "requested",
      createdAt: new Date(),
    };

    await bookings.insertOne(booking);

    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
}

export async function getBookingsByRenter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = getDb();
    const bookings = db.collection<BookingDoc>("bookings");

    const renterId = getParam(req, "renterId");

    const results = await bookings
      .find({ renterId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ bookings: results });
  } catch (err) {
    next(err);
  }
}
