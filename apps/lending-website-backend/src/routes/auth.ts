import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { verifyAsync as ed25519Verify } from "@noble/ed25519";
import bs58 from "bs58";
import { createAppDb } from "../db/client.js";
import { authNonces, profiles } from "../db/schema.js";
import { authenticate, createToken } from "../middleware/session.js";
import type { AppEnv } from "../types.js";

/**
 * Signing message displayed to the user in their wallet. 
 * Must match the frontend exactly.
 */
function buildSignMessage(nonce: string): Uint8Array {
  return new TextEncoder().encode(
    `Sign this message to authenticate with OpenVouch Originate.\n\nNonce: ${nonce}`,
  );
}

const authRoutes = new Hono<AppEnv>();

/**
 * POST /api/auth/challenge — issue a unique nonce for a wallet address to sign.
 */
authRoutes.post("/challenge", async (c) => {
  const { address } = await c.req.json<{ address?: string }>();
  if (!address) return c.json({ error: "address_required" }, 400);

  const d1 = c.env?.DB;
  if (!d1) return c.json({ error: "not_implemented" }, 501);
  const db = createAppDb(d1);

  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db
    .insert(authNonces)
    .values({ address, nonce, expiresAt })
    .onConflictDoUpdate({
      target: authNonces.address,
      set: { nonce, expiresAt },
    });

  return c.json({ nonce });
});

/**
 * POST /api/auth/verify — verify signed nonce, create profile if needed, and return JWT.
 */
authRoutes.post("/verify", async (c) => {
  const {
    address,
    nonce: clientNonce,
    signature,
  } = await c.req.json<{
    address?: string;
    nonce?: string;
    signature?: string;
  }>();

  if (!address || !clientNonce || !signature) {
    return c.json({ error: "missing_fields" }, 400);
  }

  const d1 = c.env?.DB;
  if (!d1) return c.json({ error: "not_implemented" }, 501);
  const db = createAppDb(d1);

  const [row] = await db
    .select()
    .from(authNonces)
    .where(eq(authNonces.address, address));

  if (!row) return c.json({ error: "nonce_not_found" }, 401);
  if (row.expiresAt < new Date()) return c.json({ error: "nonce_expired" }, 401);
  if (row.nonce !== clientNonce) return c.json({ error: "nonce_mismatch" }, 401);

  let sigBytes: Uint8Array;
  try {
    sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  } catch {
    return c.json({ error: "invalid_signature_encoding" }, 400);
  }

  let pubKeyBytes: Uint8Array;
  try {
    pubKeyBytes = bs58.decode(address);
  } catch {
    return c.json({ error: "invalid_address" }, 400);
  }

  const isValid = await ed25519Verify(
    sigBytes,
    buildSignMessage(row.nonce),
    pubKeyBytes,
  );
  if (!isValid) return c.json({ error: "invalid_signature" }, 401);

  await db.delete(authNonces).where(eq(authNonces.address, address));

  // Auto-create profile on first successful login
  const now = new Date();
  await db
    .insert(profiles)
    .values({ address, createdAt: now, updatedAt: now })
    .onConflictDoNothing();

  const secret = c.get("config").jwtSecret;
  if (!secret) return c.json({ error: "not_configured" }, 501);

  const token = await createToken(secret, address);

  return c.json({ token });
});

/**
 * GET /api/auth/me — validate current session and return user info.
 */
authRoutes.get("/me", authenticate, async (c) => {
  const user = c.get("user");
  return c.json({
    address: user.address,
  });
});

/**
 * DELETE /api/auth/session — stateless logout.
 */
authRoutes.delete("/session", authenticate, async (c) => {
  return c.body(null, 204);
});

export default authRoutes;
