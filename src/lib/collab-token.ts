import "server-only";
import { SignJWT } from "jose";

// Signs a short-lived token authorizing a client to join a specific Yjs room.
// Minted only after the server has verified the user may access the page, so
// the websocket server can trust it (verifying the same AUTH_SECRET).

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
}

export async function signCollabToken(room: string): Promise<string> {
  return new SignJWT({ room })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret());
}
