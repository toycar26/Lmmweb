import crypto from "crypto";
import { cookies } from "next/headers";
import { getRuntimeEnvVar } from "@/lib/runtime-env";

const COOKIE_NAME = "love_site_session";

async function getAdminAccount() {
  return {
    username: await getRuntimeEnvVar("LOVE_ADMIN_USERNAME", "lmmwjc"),
    password: await getRuntimeEnvVar("LOVE_ADMIN_PASSWORD", "1111"),
  } as const;
}

async function getSessionSecret() {
  return getRuntimeEnvVar("SITE_SESSION_SECRET", "l-w-love-site-secret");
}

async function sign(value: string) {
  const secret = await getSessionSecret();
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export async function isValidCredentials(username: string, password: string) {
  const adminAccount = await getAdminAccount();
  return username === adminAccount.username && password === adminAccount.password;
}

export async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  try {
    const username = decode(payload);
    const adminAccount = await getAdminAccount();

    if (username !== adminAccount.username) return null;
    if (signature !== (await sign(username))) return null;

    return { username };
  } catch {
    return null;
  }
}

export async function setSession(username: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${encode(username)}.${await sign(username)}`, {
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
