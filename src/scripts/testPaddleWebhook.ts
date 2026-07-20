/**
 * Paddle Webhook Signature Verification Test
 *
 * Tests SEC5: confirms the Next.js webhook handler at
 *   client/src/app/api/webhooks/paddle/route.ts
 * accepts a correctly-signed "transaction.completed" payload and rejects
 * a tampered/incorrectly-signed one with 400.
 *
 * Prerequisites:
 *   - Express server running on port 5000 (cd server && npm run dev)
 *   - Next.js dev server running on port 3000 (cd client && npm run dev)
 *   - Both .env files configured with matching INTERNAL_API_KEY and
 *     PADDLE_WEBHOOK_SECRET
 *
 * Usage:
 *   cd server && npx tsx src/scripts/testPaddleWebhook.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createHmac, randomUUID } from "crypto";
import { MongoClient, ObjectId } from "mongodb";

// Load both .env files — server's (MONGODB_URI, INTERNAL_API_KEY) and
// client's (PADDLE_WEBHOOK_SECRET). Client's is second so its values win
// on overlap, matching what the real webhook handler sees.
config({ path: resolve(__dirname, "../../../server/.env") });
config({ path: resolve(__dirname, "../../../client/.env") });

// ─── Configuration ───────────────────────────────────────────────────────────

const WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET!;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY!;
const EXPRESS_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const CLIENT_URL = "http://localhost:3000";
const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "gearloop";

const WEBHOOK_ENDPOINT = `${CLIENT_URL}/api/webhooks/paddle`;

// ─── HMAC Signing (mirrors real Paddle v2 signature scheme) ──────────────────

function signPayload(rawBody: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000).toString();
  const signedPayload = `${ts}.${rawBody}`;
  const hmac = createHmac("sha256", secret).update(signedPayload).digest("base64");
  return `ts=${ts};v1=${hmac}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface WebhookResult {
  status: number;
  body: unknown;
}

async function postWebhook(
  payload: object,
  signatureHeader: string,
): Promise<WebhookResult> {
  const rawBody = JSON.stringify(payload);
  const res = await fetch(WEBHOOK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "paddle-signature": signatureHeader,
    },
    body: rawBody,
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function getBookingStatus(
  db: any,
  bookingId: string,
): Promise<{ paymentStatus: string; status: string } | null> {
  const doc = await db
    .collection("bookings")
    .findOne({ _id: new ObjectId(bookingId) });
  if (!doc) return null;
  return { paymentStatus: doc.paymentStatus, status: doc.status };
}

// ─── Main Test Runner ────────────────────────────────────────────────────────

async function runTests() {
  // Validate env
  const missing: string[] = [];
  if (!WEBHOOK_SECRET) missing.push("PADDLE_WEBHOOK_SECRET");
  if (!INTERNAL_API_KEY) missing.push("INTERNAL_API_KEY");
  if (!MONGODB_URI) missing.push("MONGODB_URI");
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    console.error(
      "Set them in client/.env and server/.env, then re-run.",
    );
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   SEC5 — Paddle Webhook Signature Verification     ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // Connect to MongoDB
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);
  console.log("✓ Connected to MongoDB");

  // Verify servers are reachable
  try {
    const health = await fetch(`${EXPRESS_URL}/api/health`);
    if (!health.ok) throw new Error(`Express returned ${health.status}`);
    console.log("✓ Express server reachable");
  } catch (err) {
    console.error("✗ Express server not reachable at", EXPRESS_URL);
    console.error("  Start it with: cd server && npm run dev");
    await client.close();
    process.exit(1);
  }

  try {
    const testPage = await fetch(`${CLIENT_URL}`);
    if (!testPage.ok) throw new Error(`Next.js returned ${testPage.status}`);
    console.log("✓ Next.js dev server reachable\n");
  } catch (err) {
    console.error("✗ Next.js dev server not reachable at", CLIENT_URL);
    console.error("  Start it with: cd client && npm run dev");
    await client.close();
    process.exit(1);
  }

  let allPassed = true;

  // ── Test 1: Valid signature → booking updated to paid/confirmed ──────────

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST 1: Valid signature — booking status updates to paid/confirmed");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const bookingId1 = new ObjectId().toHexString();
  const testListingId = new ObjectId();

  // Insert a test listing (needed if the PATCH route does any listing lookup)
  await db.collection("listings").insertOne({
    _id: testListingId,
    ownerId: "test-owner",
    title: "Test Tent",
    shortDescription: "A test tent",
    fullDescription: "A detailed test tent description",
    category: "camping",
    pricePerDay: 45,
    currency: "USD",
    location: "Testville",
    images: ["https://example.com/tent.jpg"],
    condition: "good",
    available: true,
    rating: 4.5,
    reviewCount: 10,
    tags: ["test"],
    createdAt: new Date(),
  });

  // Insert a pending booking
  await db.collection("bookings").insertOne({
    _id: new ObjectId(bookingId1),
    listingId: testListingId,
    renterId: "test-renter-001",
    startDate: "2026-08-01",
    endDate: "2026-08-03",
    totalDays: 2,
    totalPrice: 90,
    paymentProvider: "paddle",
    paymentStatus: "pending",
    status: "requested",
    createdAt: new Date(),
  });

  console.log(`  Created booking ${bookingId1} (paymentStatus: pending, status: requested)`);

  // Build the Paddle webhook payload
  const payload = {
    event_id: randomUUID(),
    event_type: "transaction.completed",
    data: {
      id: `txn_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
      custom_data: { bookingId: bookingId1 },
      status: "completed",
    },
  };

  const rawBody = JSON.stringify(payload);
  const sig = signPayload(rawBody, WEBHOOK_SECRET);

  console.log(`  Sending signed POST to ${WEBHOOK_ENDPOINT}`);
  console.log(`  Signature: ${sig.slice(0, 40)}...`);

  const result1 = await postWebhook(payload, sig);
  console.log(`  Response: ${result1.status} ${JSON.stringify(result1.body)}`);

  if (result1.status !== 200) {
    console.error("  ✗ FAIL — expected 200, got", result1.status);
    allPassed = false;
  } else {
    console.log("  ✓ Handler accepted the request (200)");
  }

  // Wait briefly for the async Express PATCH to complete
  await new Promise((r) => setTimeout(r, 2000));

  const status1 = await getBookingStatus(db, bookingId1);
  if (!status1) {
    console.error("  ✗ FAIL — booking not found in MongoDB");
    allPassed = false;
  } else if (status1.paymentStatus !== "paid" || status1.status !== "confirmed") {
    console.error(
      `  ✗ FAIL — expected paymentStatus:"paid" status:"confirmed", got paymentStatus:"${status1.paymentStatus}" status:"${status1.status}"`,
    );
    allPassed = false;
  } else {
    console.log(`  ✓ Booking updated in MongoDB: paymentStatus="${status1.paymentStatus}", status="${status1.status}"`);
  }

  console.log("");

  // ── Test 2: Invalid (tampered) signature → rejected with 400 ────────────

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST 2: Invalid signature — rejected with 400");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const bookingId2 = new ObjectId().toHexString();

  await db.collection("bookings").insertOne({
    _id: new ObjectId(bookingId2),
    listingId: testListingId,
    renterId: "test-renter-002",
    startDate: "2026-08-10",
    endDate: "2026-08-12",
    totalDays: 2,
    totalPrice: 90,
    paymentProvider: "paddle",
    paymentStatus: "pending",
    status: "requested",
    createdAt: new Date(),
  });

  console.log(`  Created booking ${bookingId2} (paymentStatus: pending, status: requested)`);

  const tamperedPayload = {
    event_id: randomUUID(),
    event_type: "transaction.completed",
    data: {
      id: `txn_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
      custom_data: { bookingId: bookingId2 },
      status: "completed",
    },
  };

  const tamperedBody = JSON.stringify(tamperedPayload);
  // Use an incorrect secret for signing
  const badSig = signPayload(tamperedBody, "definitely-not-the-real-secret");

  console.log(`  Sending POST with tampered signature to ${WEBHOOK_ENDPOINT}`);

  const result2 = await postWebhook(tamperedPayload, badSig);
  console.log(`  Response: ${result2.status} ${JSON.stringify(result2.body)}`);

  if (result2.status !== 400) {
    console.error("  ✗ FAIL — expected 400, got", result2.status);
    allPassed = false;
  } else {
    console.log("  ✓ Handler rejected the request (400)");
  }

  // Wait briefly and verify booking was NOT updated
  await new Promise((r) => setTimeout(r, 1000));

  const status2 = await getBookingStatus(db, bookingId2);
  if (!status2) {
    console.error("  ✗ FAIL — booking disappeared from MongoDB");
    allPassed = false;
  } else if (status2.paymentStatus !== "pending" || status2.status !== "requested") {
    console.error(
      `  ✗ FAIL — booking was modified despite invalid signature (paymentStatus:"${status2.paymentStatus}" status:"${status2.status}")`,
    );
    allPassed = false;
  } else {
    console.log(`  ✓ Booking unchanged in MongoDB: paymentStatus="${status2.paymentStatus}", status="${status2.status}"`);
  }

  // ── Test 3: Missing signature header → rejected with 400 ────────────────

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST 3: Missing paddle-signature header → rejected with 400");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const noSigPayload = {
    event_id: randomUUID(),
    event_type: "transaction.completed",
    data: {
      id: `txn_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
      custom_data: { bookingId: "does-not-matter" },
      status: "completed",
    },
  };

  const result3 = await postWebhook(noSigPayload, "");
  console.log(`  Response: ${result3.status} ${JSON.stringify(result3.body)}`);

  if (result3.status !== 400) {
    console.error("  ✗ FAIL — expected 400, got", result3.status);
    allPassed = false;
  } else {
    console.log("  ✓ Handler rejected the request (400)");
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  await db.collection("bookings").deleteMany({
    _id: {
      $in: [new ObjectId(bookingId1), new ObjectId(bookingId2)],
    },
  });
  await db.collection("listings").deleteOne({ _id: testListingId });
  console.log("\n✓ Cleaned up test data from MongoDB");

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log("\n══════════════════════════════════════════════════════════");
  if (allPassed) {
    console.log("ALL TESTS PASSED — SEC5 verified ✓");
  } else {
    console.log("SOME TESTS FAILED — see above for details");
  }
  console.log("══════════════════════════════════════════════════════════");

  await client.close();
  process.exit(allPassed ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
