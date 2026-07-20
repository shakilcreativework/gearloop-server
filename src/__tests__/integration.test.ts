import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Db, ObjectId } from "mongodb";
import request from "supertest";
import type { Express } from "express";

// Mock db module BEFORE anything imports it — prevents the MONGODB_DB_NAME throw
vi.mock("../config/db.js", () => ({
  connectToDatabase: vi.fn(),
  getDb: vi.fn(),
  getClient: vi.fn(),
}));

// Mock protectRoute: accept "Bearer mock-session-token", reject everything else
vi.mock("../middleware/protectRoute.js", () => ({
  protectRoute: (req: any, res: any, next: any) => {
    const auth = req.headers?.authorization;
    if (auth === "Bearer mock-session-token") {
      req.userId = "test-user-1";
      req.userEmail = "test@example.com";
      req.userName = "Test User";
      return next();
    }
    res.status(401).json({
      error: { message: "Authentication required", code: "UNAUTHORIZED" },
    });
  },
}));

// Mock protectInternalRoute to always pass
vi.mock("../middleware/protectInternalRoute.js", () => ({
  protectInternalRoute: (_req: any, _res: any, next: any) => next(),
}));

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let app: Express;

beforeAll(async () => {
  process.env.NODE_ENV = "test";

  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db("test");

  // Override the mocked db module so every controller reads from our in-memory DB
  const dbMod = await import("../config/db.js");
  (dbMod.getDb as any).mockReturnValue(db);
  (dbMod.getClient as any).mockReturnValue(client);

  // Import app after db override — controllers now use the in-memory DB
  app = (await import("../app.js")).default as unknown as Express;
});

afterAll(async () => {
  await client?.close();
  await mongod?.stop();
});

beforeEach(async () => {
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
  }
});

// ─── Helper: seed listings ─────────────────────────────────────────

const LISTINGS = [
  {
    _id: new ObjectId(),
    ownerId: "owner1",
    title: "Alpine 2P Tent",
    shortDescription: "Lightweight 2-person tent",
    fullDescription: "A high-quality alpine tent built for two.",
    category: "camping",
    pricePerDay: 45,
    currency: "USD",
    location: "Denver, CO",
    images: ["https://example.com/tent.jpg"],
    condition: "good",
    available: true,
    rating: 4.5,
    reviewCount: 12,
    tags: ["tent", "camping"],
    createdAt: new Date("2026-07-01"),
  },
  {
    _id: new ObjectId(),
    ownerId: "owner2",
    title: "Carbon Road Bike",
    shortDescription: "Fast carbon-frame road bike",
    fullDescription: "A top-of-the-line carbon road bike.",
    category: "cycling",
    pricePerDay: 75,
    currency: "USD",
    location: "Boulder, CO",
    images: ["https://example.com/bike.jpg"],
    condition: "excellent",
    available: true,
    rating: 4.8,
    reviewCount: 8,
    tags: ["bike", "road"],
    createdAt: new Date("2026-07-05"),
  },
  {
    _id: new ObjectId(),
    ownerId: "owner3",
    title: "Pro DSLR Camera Kit",
    shortDescription: "Full-frame DSLR with lenses",
    fullDescription: "Professional camera kit with zoom and prime lenses.",
    category: "photography",
    pricePerDay: 90,
    currency: "USD",
    location: "Aspen, CO",
    images: ["https://example.com/camera.jpg"],
    condition: "new",
    available: true,
    rating: 4.9,
    reviewCount: 20,
    tags: ["camera", "photography"],
    createdAt: new Date("2026-07-10"),
  },
  {
    _id: new ObjectId(),
    ownerId: "owner4",
    title: "Kayak Pro 12",
    shortDescription: "12-foot recreational kayak",
    fullDescription: "Stable and fast recreational kayak.",
    category: "water-sports",
    pricePerDay: 35,
    currency: "USD",
    location: "Fort Collins, CO",
    images: ["https://example.com/kayak.jpg"],
    condition: "good",
    available: true,
    rating: 4.2,
    reviewCount: 5,
    tags: ["kayak", "water"],
    createdAt: new Date("2026-07-15"),
  },
];

async function seedListings() {
  await db.collection("listings").insertMany(LISTINGS);
}

// ─── Integration Tests: Listings Filters ───────────────────────────

describe("GET /api/listings — filters & sort", () => {
  beforeEach(async () => {
    await seedListings();
  });

  it("returns all listings with default pagination", async () => {
    const res = await request(app).get("/api/listings");
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(4);
    expect(res.body.pagination.total).toBe(4);
    expect(res.body.pagination.totalPages).toBe(1);
  });

  it("filters by category", async () => {
    const res = await request(app).get("/api/listings?category=camping");
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.listings[0].category).toBe("camping");
  });

  it("filters by minPrice", async () => {
    const res = await request(app).get("/api/listings?minPrice=70");
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(2);
    for (const l of res.body.listings) {
      expect(l.pricePerDay).toBeGreaterThanOrEqual(70);
    }
  });

  it("filters by maxPrice", async () => {
    const res = await request(app).get("/api/listings?maxPrice=40");
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.listings[0].pricePerDay).toBeLessThanOrEqual(40);
  });

  it("filters by price range (min and max)", async () => {
    const res = await request(app).get("/api/listings?minPrice=40&maxPrice=80");
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(2);
    for (const l of res.body.listings) {
      expect(l.pricePerDay).toBeGreaterThanOrEqual(40);
      expect(l.pricePerDay).toBeLessThanOrEqual(80);
    }
  });

  it("filters by minRating", async () => {
    const res = await request(app).get("/api/listings?minRating=4.5");
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(3);
    for (const l of res.body.listings) {
      expect(l.rating).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("sorts by price ascending", async () => {
    const res = await request(app).get("/api/listings?sort=price-asc");
    expect(res.status).toBe(200);
    const prices = res.body.listings.map((l: any) => l.pricePerDay);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));
  });

  it("sorts by price descending", async () => {
    const res = await request(app).get("/api/listings?sort=price-desc");
    expect(res.status).toBe(200);
    const prices = res.body.listings.map((l: any) => l.pricePerDay);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => b - a));
  });

  it("sorts by rating", async () => {
    const res = await request(app).get("/api/listings?sort=rating");
    expect(res.status).toBe(200);
    const ratings = res.body.listings.map((l: any) => l.rating);
    expect(ratings).toEqual([...ratings].sort((a: number, b: number) => b - a));
  });

  it("combines category + price filter", async () => {
    const res = await request(app).get("/api/listings?category=camping&maxPrice=50");
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(1);
    expect(res.body.listings[0].category).toBe("camping");
    expect(res.body.listings[0].pricePerDay).toBeLessThanOrEqual(50);
  });

  it("returns empty list when no match", async () => {
    const res = await request(app).get("/api/listings?category=nonexistent");
    expect(res.status).toBe(200);
    expect(res.body.listings).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });
});

// ─── Integration Tests: Protected Route Rejection ──────────────────

describe("Protected routes — auth rejection", () => {
  beforeEach(async () => {
    await seedListings();
  });

  it("POST /api/listings without token → 401", async () => {
    const res = await request(app)
      .post("/api/listings")
      .send({
        title: "New Gear",
        shortDescription: "Desc",
        fullDescription: "Full desc",
        category: "camping",
        pricePerDay: 25,
        location: "Testville",
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/listings with invalid token → 401", async () => {
    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", "Bearer invalid-token-abc")
      .send({
        title: "New Gear",
        shortDescription: "Desc",
        fullDescription: "Full desc",
        category: "camping",
        pricePerDay: 25,
        location: "Testville",
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/listings with malformed header → 401", async () => {
    const res = await request(app)
      .post("/api/listings")
      .set("Authorization", "NotBearer sometoken")
      .send({
        title: "New Gear",
        shortDescription: "Desc",
        fullDescription: "Full desc",
        category: "camping",
        pricePerDay: 25,
        location: "Testville",
      });
    expect(res.status).toBe(401);
  });

  it("POST /api/bookings without token → 401", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .send({
        listingId: LISTINGS[0]._id.toString(),
        renterId: "user1",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/reviews without token → 401", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .send({
        listingId: LISTINGS[0]._id.toString(),
        reviewerId: "user1",
        rating: 5,
        comment: "Amazing!",
      });
    expect(res.status).toBe(401);
  });
});

// ─── Integration Tests: Booking Overlap 409 ────────────────────────

describe("POST /api/bookings — overlap prevention", () => {
  const LISTING_ID = new ObjectId();

  beforeEach(async () => {
    await db.collection("listings").insertOne({
      _id: LISTING_ID,
      ownerId: "owner1",
      title: "Kayak for Overlap Test",
      shortDescription: "A kayak",
      fullDescription: "Full kayak description",
      category: "water-sports",
      pricePerDay: 40,
      currency: "USD",
      location: "Test Lake, CO",
      images: [],
      condition: "good",
      available: true,
      rating: 4.0,
      reviewCount: 0,
      tags: [],
      createdAt: new Date(),
    });
  });

  it("creates first booking successfully", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter1",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });

    expect(res.status).toBe(201);
    expect(res.body.booking.listingId.toString()).toBe(LISTING_ID.toString());
    expect(res.body.booking.status).toBe("requested");
    expect(res.body.booking.paymentStatus).toBe("pending");
    expect(res.body.booking.totalDays).toBe(4);
    expect(res.body.booking.totalPrice).toBe(160);
  });

  it("returns 409 when second booking overlaps first", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter1",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter2",
        startDate: "2026-09-03",
        endDate: "2026-09-07",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DATE_CONFLICT");
  });

  it("returns 409 when second booking fully contains first", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter1",
        startDate: "2026-09-02",
        endDate: "2026-09-04",
      });

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter2",
        startDate: "2026-09-01",
        endDate: "2026-09-06",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DATE_CONFLICT");
  });

  it("allows adjacent (non-overlapping) bookings", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter1",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter2",
        startDate: "2026-09-05",
        endDate: "2026-09-08",
      });

    expect(res.status).toBe(201);
  });

  it("allows booking on different listing", async () => {
    await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter1",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });

    const OTHER_LISTING_ID = new ObjectId();
    await db.collection("listings").insertOne({
      _id: OTHER_LISTING_ID,
      ownerId: "owner2",
      title: "Another Listing",
      shortDescription: "Desc",
      fullDescription: "Full desc",
      category: "camping",
      pricePerDay: 30,
      currency: "USD",
      location: "Somewhere, CO",
      images: [],
      condition: "good",
      available: true,
      rating: 4.0,
      reviewCount: 0,
      tags: [],
      createdAt: new Date(),
    });

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: OTHER_LISTING_ID.toString(),
        renterId: "renter2",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });

    expect(res.status).toBe(201);
  });

  it("allows rebooking after cancellation", async () => {
    const createRes = await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter1",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });
    const bookingId = createRes.body.booking._id;

    await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { status: "cancelled" } },
    );

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", "Bearer mock-session-token")
      .send({
        listingId: LISTING_ID.toString(),
        renterId: "renter3",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
      });

    expect(res.status).toBe(201);
  });
});
