"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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

export type AuthState = { error?: string };

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
