/**
 * Autenticação por E-mail e Senha — Projeto Local
 * - Senhas armazenadas com bcrypt (12 rounds)
 * - Sessões via JWT em cookie HttpOnly + Secure
 * - Tokens expiram em 7 dias
 */
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-secret-in-production-min-32-chars";
const COOKIE_NAME = "lab_session";
const SALT_ROUNDS = 12;

// ─── Password helpers ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

export function signToken(payload: { userId: number; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string; role: string };
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function getTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

// ─── Lookup de usuário autenticado ────────────────────────────────────────────

export async function getUserFromRequest(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  const user = result[0];
  if (!user || !user.isActive) return null;
  return user;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  const user = result[0];
  if (!user) throw new Error("E-mail ou senha incorretos.");
  if (!user.isActive) throw new Error("Conta desativada. Contate o administrador.");
  if (!user.passwordHash) throw new Error("Conta sem senha configurada. Contate o administrador.");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new Error("E-mail ou senha incorretos.");

  // Atualizar lastSignedIn
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

  return user;
}

// ─── Criar usuário (pelo admin) ───────────────────────────────────────────────

export async function createUser(
  name: string,
  email: string,
  temporaryPassword: string,
  role: "collaborator" | "supervisor" | "admin" = "collaborator"
) {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) throw new Error("E-mail já cadastrado.");

  const passwordHash = await hashPassword(temporaryPassword);

  await db.insert(users).values({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    mustChangePassword: true,
    role,
    isActive: true,
  });

  const created = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return created[0]!;
}

// ─── Alterar senha ────────────────────────────────────────────────────────────

export async function changePassword(userId: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  if (newPassword.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, userId));
}
