import "server-only";
import { SignJWT, jwtVerify } from "jose";

function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error("AUTH_SECRET must contain at least 32 bytes.");
  return new TextEncoder().encode(secret);
}

export async function createOrderLookupToken(publicId: string) {
  return new SignJWT({ scope: "order_lookup" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(publicId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(signingKey());
}

export async function isOrderLookupTokenValid(token: string, publicId: string) {
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    return payload.scope === "order_lookup" && payload.sub === publicId;
  } catch {
    return false;
  }
}
