// // // import { Hono } from "hono";
// // // import { db } from "../db/client";

// // // const app = new Hono();

// // // // Save Review
// // // app.post("/", async (c) => {
// // //   const { poolId, rating, comment, signature } = await c.req.json();

// // //   // 1. Verify Signature (ensure user owns the wallet)
// // //   // 2. Verify On-Chain: Check if the review transaction exists on Solana
// // //   //    (Call your Solana RPC or check a webhook event)

// // //   if (comment.split(" ").length > 150) {
// // //     return c.json({ error: "Comment too long" }, 400);
// // //   }

// // //   await db
// // //     .prepare(
// // //       `
// // //     INSERT INTO reviews (id, pool_id, reviewer_address, target_address, rating, comment, created_at)
// // //     VALUES (?, ?, ?, ?, ?, ?, ?)
// // //   `,
// // //     )
// // //     .bind(
// // //       crypto.randomUUID(),
// // //       poolId,
// // //       c.get("userAddress"), // From auth token
// // //       targetAddress, // Derived from pool data
// // //       rating,
// // //       comment,
// // //       Date.now(),
// // //     )
// // //     .run();

// // //   return c.json({ success: true });
// // // });

// // // // Get Stats for a User
// // // app.get("/stats/:address", async (c) => {
// // //   const address = c.req.param("address");

// // //   const stats = await db
// // //     .prepare(
// // //       `
// // //     SELECT AVG(rating) as avg_rating, COUNT(*) as count
// // //     FROM reviews
// // //     WHERE target_address = ?
// // //   `,
// // //     )
// // //     .bind(address)
// // //     .first();

// // //   return c.json(stats);
// // // });

// // // export default app;

import { Hono } from "hono";
import type { AppEnv } from "../types.js";

const app = new Hono<AppEnv>();

/**
 * POST /api/reviews
 * Submit a new review (rating + comment) for a completed loan.
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { poolId, rating, comment } = body;

    // 1. Basic Validation
    if (!poolId || !rating || !comment) {
      return c.json(
        { error: "Missing required fields (poolId, rating, comment)" },
        400,
      );
    }

    // 2. Validate Rating Range
    if (rating < 1 || rating > 5) {
      return c.json({ error: "Rating must be between 1 and 5" }, 400);
    }

    // 3. Validate Word Count (Max 150 words)
    const words = comment
      .trim()
      .split(/\s+/)
      .filter((word: string) => word.length > 0);
    if (words.length > 150) {
      return c.json({ error: "Comment exceeds 150 words limit" }, 400);
    }

    // 4. Get Database Instance
    const db = c.env.DB;

    // 5. Fetch Loan Details
    // FIX: Define the expected shape of the result to avoid 'unknown' type
    interface LoanRow {
      borrower: string;
      lender: string;
    }

    const loanStmt = await db
      .prepare("SELECT borrower, lender FROM loan_listings WHERE id = ?")
      .bind(poolId)
      .first<LoanRow>();

    if (!loanStmt) {
      return c.json({ error: "Loan not found" }, 404);
    }

    // 6. Identify Current User and Target
    const currentUserAddress = c.get("userAddress");

    if (!currentUserAddress) {
      return c.json({ error: "User not authenticated" }, 401);
    }

    let targetAddress: string;

    // FIX: TypeScript now knows loanStmt.borrower is a string
    if (currentUserAddress === loanStmt.borrower) {
      targetAddress = loanStmt.lender;
    } else if (currentUserAddress === loanStmt.lender) {
      targetAddress = loanStmt.borrower;
    } else {
      return c.json({ error: "You are not a participant in this loan" }, 403);
    }

    if (!targetAddress) {
      return c.json({ error: "Could not determine review target" }, 500);
    }

    // 7. Insert Review
    const insertId = crypto.randomUUID();
    await db
      .prepare(
        `
      INSERT INTO reviews (id, pool_id, reviewer_address, target_address, rating, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        insertId,
        poolId,
        currentUserAddress,
        targetAddress,
        rating,
        comment,
        Date.now(),
      )
      .run();

    return c.json({ success: true, id: insertId }, 201);
  } catch (e) {
    console.error("[Reviews] Error:", e);
    return c.json({ error: "Internal server error" }, 500);
  }
});

/**
 * GET /api/reviews/stats/:address
 * Get average rating and review count for a specific user.
 */
app.get("/stats/:address", async (c) => {
  const address = c.req.param("address");

  if (!address) {
    return c.json({ error: "Address required" }, 400);
  }

  try {
    const db = c.env.DB;

    const stats = await db
      .prepare(
        `
      SELECT 
        AVG(rating) as avg_rating, 
        COUNT(*) as count
      FROM reviews
      WHERE target_address = ?
    `,
      )
      .bind(address)
      .first();

    // FIX: Cast stats to a known type to avoid 'unknown' and '{}' errors
    const statsTyped = stats as {
      avg_rating: number | null;
      count: number;
    } | null;

    const result = {
      // FIX: Check if avg_rating exists and is a number before calling toFixed
      avgRating: statsTyped?.avg_rating
        ? parseFloat(statsTyped.avg_rating.toFixed(1))
        : null,
      reviewCount: statsTyped?.count || 0,
    };

    return c.json(result);
  } catch (e) {
    console.error("[Reviews] Stats Error:", e);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

export default app;
