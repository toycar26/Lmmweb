import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_ACCOUNT = {
  username: process.env.LOVE_ADMIN_USERNAME ?? "lmmwjc",
  password: process.env.LOVE_ADMIN_PASSWORD ?? "1111",
} as const;

const COOKIE_NAME = "love_site_session";
const SECRET = process.env.SITE_SESSION_SECRET ?? "l-w-love-site-secret";

function sign(value: string) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function isValidCredentials(username: string, password: string) {
  return username === ADMIN_ACCOUNT.username && password === ADMIN_ACCOUNT.password;
}

export async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  try {
    const username = decode(payload);
    if (username !== ADMIN_ACCOUNT.username) return null;
    if (signature !== sign(username)) return null;
    return { username };
  } catch {
    return null;
  }
}

export async function setSession(username: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${encode(username)}.${sign(username)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
