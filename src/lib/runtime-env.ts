import { getCloudflareContext } from "@opennextjs/cloudflare";

export type KVNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

export type R2BucketLike = {
  get(
    key: string,
  ): Promise<{
    body: ReadableStream | null;
    httpEtag: string;
    writeHttpMetadata(headers: Headers): void;
  } | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<void>;
};

export type SiteCloudflareEnv = CloudflareEnv & {
  SITE_DATA?: KVNamespaceLike;
  SITE_UPLOADS?: R2BucketLike;
  LOVE_ADMIN_USERNAME?: string;
  LOVE_ADMIN_PASSWORD?: string;
  SITE_SESSION_SECRET?: string;
};

export async function getSiteCloudflareEnv(): Promise<SiteCloudflareEnv | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as SiteCloudflareEnv;
  } catch {
    return null;
  }
}

export async function getRuntimeEnvVar(
  name: keyof SiteCloudflareEnv & string,
  fallback = "",
) {
  const env = await getSiteCloudflareEnv();
  const cloudflareValue = env?.[name];

  if (typeof cloudflareValue === "string" && cloudflareValue.length > 0) {
    return cloudflareValue;
  }

  return process.env[name] ?? fallback;
}
