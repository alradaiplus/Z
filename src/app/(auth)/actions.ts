"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { bootstrapWorkspace } from "@/lib/workspace";
import { rateLimit } from "@/lib/rate-limit";
import { LIMITS } from "@/lib/validation";
import { sendPasswordResetEmail } from "@/lib/email";

export type AuthState = { error?: string; notice?: string; devLink?: string };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOO_MANY = "Too many attempts. Please wait a minute and try again.";

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // 5 signups / 10 min per IP.
  if (!rateLimit(`signup:${await clientIp()}`, 5, 10 * 60_000)) {
    return { error: TOO_MANY };
  }

  if (email.length > LIMITS.email || password.length > LIMITS.password) {
    return { error: "Input is too long." };
  }
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (name.length > 100) return { error: "Name is too long." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      passwordHash: await hashPassword(password),
    },
  });

  await bootstrapWorkspace(user.id, name ? `${name}'s Workspace` : "My Workspace");
  await createSession({ userId: user.id, email: user.email });

  redirect("/app");
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  // 10 attempts / 5 min, keyed by IP + email, to slow brute force.
  if (
    !rateLimit(`login:${await clientIp()}:${email}`, 10, 5 * 60_000) ||
    email.length > LIMITS.email ||
    password.length > LIMITS.password
  ) {
    return { error: TOO_MANY };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession({ userId: user.id, email: user.email });
  redirect("/app");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

const RESET_NOTICE =
  "If an account exists for that email, a reset link is on its way.";

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!rateLimit(`reset:${await clientIp()}`, 5, 10 * 60_000)) {
    return { error: TOO_MANY };
  }
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond the same way to avoid leaking which emails are registered.
  if (!user) return { notice: RESET_NOTICE };

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60_000), // 1 hour
    },
  });

  const url = `${await origin()}/reset?token=${token}`;
  const { devLink } = await sendPasswordResetEmail(email, url);
  return { notice: RESET_NOTICE, devLink };
}

export async function resetPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!rateLimit(`reset-submit:${await clientIp()}`, 10, 10 * 60_000)) {
    return { error: TOO_MANY };
  }
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (password.length > LIMITS.password) return { error: "Password is too long." };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!record || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    // Invalidate all outstanding reset tokens for this user.
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  await createSession({ userId: record.userId, email: record.user.email });
  redirect("/app");
}
