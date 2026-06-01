import crypto from "crypto";
import bundledSiteData from "../../data/site.json";
import { inferProvinceId, type ProvinceId } from "@/lib/provinces";
import { getSiteCloudflareEnv } from "@/lib/runtime-env";

export type Author = "wjc" | "lmm" | "共同";

export type Album = {
  id: string;
  name: string;
  description: string;
  coverPhotoId?: string;
  createdAt: string;
};

export type Photo = {
  id: string;
  fileName: string;
  src: string;
  albumId: string;
  uploadedAt: string;
  caption: string;
  details?: string;
  author: Author;
  isFeatured: boolean;
  isCover: boolean;
  locationId?: string;
};

export type TimelineItem = {
  id: string;
  date: string;
  title: string;
  description: string;
  author: Author;
};

export type DiaryItem = {
  id: string;
  date: string;
  title: string;
  content: string;
  author: Author;
};

export type LocationItem = {
  id: string;
  city: string;
  provinceId?: ProvinceId;
  date: string;
  note: string;
  photoIds: string[];
  author: Author;
};

export type SiteSettings = {
  siteName: string;
  homeTitle: string;
  homeSubtitle: string;
  coupleName: string;
  relationshipStart: string;
  wjcBirthday: string;
  lmmBirthday: string;
  musicUrl: string;
  heroPhotoIds: string[];
};

export type SiteData = {
  settings: SiteSettings;
  albums: Album[];
  photos: Photo[];
  timeline: TimelineItem[];
  diaries: DiaryItem[];
  locations: LocationItem[];
};

const SITE_DATA_KV_KEY = "site-data";

let inMemoryData: SiteData | null = null;
let writeQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function serialize<T>(task: () => Promise<T>) {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function toLocalDate(value: Date = new Date()) {
  return new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(value)
      .replaceAll("/", "-"),
  );
}

function diffDays(from: Date, to: Date) {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86400000);
}

function deepCloneSiteData(data: SiteData): SiteData {
  return JSON.parse(JSON.stringify(data)) as SiteData;
}

function bundledData(): SiteData {
  return deepCloneSiteData(bundledSiteData as SiteData);
}

function normalizeAuthor(author: unknown): Author {
  return author === "wjc" || author === "lmm" || author === "共同" ? author : "共同";
}

function normalizeLocationItem(item: Partial<LocationItem> & Record<string, unknown>): LocationItem {
  const provinceId = inferProvinceId(
    typeof item.provinceId === "string" ? item.provinceId : undefined,
    typeof item.city === "string" ? item.city : undefined,
    typeof item.region === "string" ? item.region : undefined,
    typeof item.note === "string" ? item.note : undefined,
  );

  return {
    id: String(item.id ?? createSlugId("location", `${item.city ?? "place"}-${item.date ?? nowIso()}`)),
    city: String(item.city ?? "未命名地点"),
    provinceId,
    date: String(item.date ?? ""),
    note: String(item.note ?? ""),
    photoIds: Array.isArray(item.photoIds) ? item.photoIds.map(String) : [],
    author: normalizeAuthor(item.author),
  };
}

async function normalizeData(data: Partial<SiteData>): Promise<SiteData> {
  const defaults = bundledData();

  return {
    settings: {
      ...defaults.settings,
      ...(data.settings ?? {}),
      heroPhotoIds: Array.isArray(data.settings?.heroPhotoIds)
        ? data.settings.heroPhotoIds.map(String)
        : defaults.settings.heroPhotoIds,
    },
    albums: Array.isArray(data.albums)
      ? data.albums.map((album) => ({
          id: String(album.id ?? createSlugId("album", String(album.name ?? "album"))),
          name: String(album.name ?? "未命名相册"),
          description: String(album.description ?? ""),
          coverPhotoId: typeof album.coverPhotoId === "string" ? album.coverPhotoId : undefined,
          createdAt: String(album.createdAt ?? nowIso()),
        }))
      : defaults.albums,
    photos: Array.isArray(data.photos)
      ? data.photos.map((photo) => ({
          id: String(photo.id ?? createSlugId("photo", String(photo.fileName ?? nowIso()))),
          fileName: String(photo.fileName ?? `${photo.id ?? crypto.randomUUID()}.jpg`),
          src: String(photo.src ?? ""),
          albumId: String(photo.albumId ?? defaults.albums[0]?.id ?? "love-archive"),
          uploadedAt: String(photo.uploadedAt ?? nowIso()),
          caption: String(photo.caption ?? ""),
          details: typeof photo.details === "string" ? photo.details : undefined,
          author: normalizeAuthor(photo.author),
          isFeatured: Boolean(photo.isFeatured),
          isCover: Boolean(photo.isCover),
          locationId: typeof photo.locationId === "string" ? photo.locationId : undefined,
        }))
      : defaults.photos,
    timeline: Array.isArray(data.timeline)
      ? data.timeline.map((item) => ({
          id: String(item.id ?? createSlugId("timeline", `${item.date ?? nowIso()}-${item.title ?? "timeline"}`)),
          date: String(item.date ?? ""),
          title: String(item.title ?? ""),
          description: String(item.description ?? ""),
          author: normalizeAuthor(item.author),
        }))
      : defaults.timeline,
    diaries: Array.isArray(data.diaries)
      ? data.diaries.map((item) => ({
          id: String(item.id ?? createSlugId("diary", `${item.date ?? nowIso()}-${item.title ?? "diary"}`)),
          date: String(item.date ?? ""),
          title: String(item.title ?? ""),
          content: String(item.content ?? ""),
          author: normalizeAuthor(item.author),
        }))
      : defaults.diaries,
    locations: Array.isArray(data.locations)
      ? data.locations.map((item) =>
          normalizeLocationItem(item as Partial<LocationItem> & Record<string, unknown>),
        )
      : defaults.locations,
  };
}

async function writeCloudflareSiteData(data: SiteData) {
  const env = await getSiteCloudflareEnv();
  if (!env?.SITE_DATA) {
    throw new Error("Cloudflare KV binding SITE_DATA is missing.");
  }

  await env.SITE_DATA.put(SITE_DATA_KV_KEY, JSON.stringify(data));
}

async function writeLocalSiteData(data: SiteData) {
  inMemoryData = deepCloneSiteData(data);
}

async function ensureSeededCloudflareData() {
  const env = await getSiteCloudflareEnv();
  if (!env?.SITE_DATA) return null;

  const current = await env.SITE_DATA.get(SITE_DATA_KV_KEY);
  if (current) {
    return normalizeData(JSON.parse(current) as Partial<SiteData>);
  }

  const seeded = bundledData();
  await env.SITE_DATA.put(SITE_DATA_KV_KEY, JSON.stringify(seeded));
  return seeded;
}

export async function loadSiteData(): Promise<SiteData> {
  const env = await getSiteCloudflareEnv();

  if (env?.SITE_DATA) {
    const seeded = await ensureSeededCloudflareData();
    return normalizeData(seeded ?? bundledData());
  }

  if (!inMemoryData) {
    inMemoryData = bundledData();
  }

  return deepCloneSiteData(inMemoryData);
}

export async function saveSiteData(data: SiteData) {
  const normalized = await normalizeData(data);
  const env = await getSiteCloudflareEnv();

  if (env?.SITE_DATA) {
    await writeCloudflareSiteData(normalized);
    return;
  }

  await writeLocalSiteData(normalized);
}

export async function updateSiteData(
  mutator: (data: SiteData) => Promise<SiteData> | SiteData,
) {
  return serialize(async () => {
    const current = await loadSiteData();
    const next = await mutator(current);
    const normalized = await normalizeData(next);
    await saveSiteData(normalized);
    return normalized;
  });
}

export async function saveUploadFile(file: File) {
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
  const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const env = await getSiteCloudflareEnv();

  if (env?.SITE_UPLOADS) {
    await env.SITE_UPLOADS.put(fileName, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "image/jpeg" },
    });

    return {
      fileName,
      src: `/api/uploads/${fileName}`,
    };
  }

  return {
    fileName,
    src: `/uploads/${fileName}`,
  };
}

export function formatDisplayDate(value: string) {
  if (!value) return "未填写";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatMonthDay(value: string) {
  if (!value) return "未填写";
  const normalized = value.includes("-") ? value : `2000-${value}`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function relationshipDays(startDate: string) {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 0;
  return diffDays(start, toLocalDate());
}

export function countdownToNextMonthDay(monthDay: string) {
  const [month, day] = monthDay.split("-").map(Number);
  if (!month || !day) return null;

  const today = toLocalDate();
  const candidate = new Date(today.getFullYear(), month - 1, day);
  if (candidate < today) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return diffDays(today, candidate);
}

export function createSlugId(prefix: string, value: string) {
  return `${prefix}-${slug(value)}-${Math.random().toString(36).slice(2, 6)}`;
}
