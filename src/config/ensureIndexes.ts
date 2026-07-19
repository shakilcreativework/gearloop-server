import { Db } from "mongodb";

export async function ensureIndexes(db: Db): Promise<void> {
  const listings = db.collection("listings");
  const bookings = db.collection("bookings");
  const reviews = db.collection("reviews");
  const users = db.collection("users");

  await Promise.all([
    listings.createIndex({ category: 1, pricePerDay: 1 }),
    listings.createIndex(
      { title: "text", shortDescription: "text", fullDescription: "text" }
    ),
    listings.createIndex({ rating: -1 }),
    bookings.createIndex({ listingId: 1, startDate: 1, endDate: 1 }),
    bookings.createIndex({ renterId: 1 }),
    reviews.createIndex({ listingId: 1 }),
    users.createIndex({ email: 1 }, { unique: true }),
  ]);

  console.log("Database indexes ensured");
}
