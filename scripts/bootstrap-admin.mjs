import { existsSync } from "node:fs";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Pool } = pg;
const scrypt = promisify(scryptCallback);

if ((!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.DATABASE_URL) && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const password = process.env.ADMIN_PASSWORD ?? "";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to create the initial admin.");
if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith("@example.invalid")) {
  throw new Error("Set ADMIN_EMAIL to a real store administrator email before seeding.");
}
if (password.length < 16 || password.length > 200 || password === "change-this-before-running-the-seed") {
  throw new Error("Set ADMIN_PASSWORD to a unique password with 16 to 200 characters before seeding.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10_000 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1)", [21_877_742]);
    const admin = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (admin.rowCount) throw new Error("An admin account already exists; this one-time bootstrap only creates the first admin.");

    const existing = await client.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
    if (existing.rowCount) throw new Error("That email already belongs to an account. Choose another email; changing an account role requires an explicit database operation.");

    const salt = randomBytes(16).toString("hex");
    const key = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const passwordHash = `scrypt$${salt}$${key.toString("hex")}`;
    const created = await client.query(
      "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin') RETURNING email",
      [email, passwordHash, email.split("@")[0]],
    );
    await client.query("COMMIT");
    console.info(`Created initial admin account ${created.rows[0].email}. Store its credentials securely.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
} finally {
  client.release();
  await pool.end();
}
