declare global {
  interface CloudflareEnv {
    SITE_DATA?: import("./src/lib/runtime-env").KVNamespaceLike;
    SITE_UPLOADS?: import("./src/lib/runtime-env").R2BucketLike;
    LOVE_ADMIN_USERNAME?: string;
    LOVE_ADMIN_PASSWORD?: string;
    SITE_SESSION_SECRET?: string;
  }
}

export {};
