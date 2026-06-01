import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { inferProvinceId, type ProvinceId } from "@/lib/provinces";

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

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "site.json");
const PUBLIC_TOGETHER_DIR = path.join(process.cwd(), "public", "together");
const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const INITIAL_HERO_ORDER = [
  "eafa7a8c5eae30652eaaf708f70fb323",
  "45499b9c6a7067ed8d8e59f3918c43ac",
  "569d34a1e107576b122c5e6f79b97e6e",
  "80dd45989d095178e81f890fe10ccb1b",
  "9b34cf1f7014d865524d73435e89cb62",
  "b34a05e399990cf17be90ac94308ec88",
];

let writeQueue = Promise.resolve();

function baseId(fileName: string) {
  return path.parse(fileName).name;
}

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

async function listPhotoFiles(dir: string) {
  try {
    const files = await fs.readdir(dir);
    return files.filter((file) => /\.(png|jpe?g|webp|gif|avif)$/i.test(file));
  } catch {
    return [];
  }
}

async function makeDefaultData(): Promise<SiteData> {
  const files = await listPhotoFiles(PUBLIC_TOGETHER_DIR);
  const orderedFiles = [...files].sort((a, b) => a.localeCompare(b, "en"));
  const heroPhotoIds = INITIAL_HERO_ORDER.filter((id) =>
    orderedFiles.some((file) => baseId(file) === id),
  );
  const fallbackHeroIds = orderedFiles.slice(0, 6).map((file) => baseId(file));
  const chosenHeroIds = heroPhotoIds.length ? heroPhotoIds : fallbackHeroIds;
  const albumId = "love-archive";

  const photos: Photo[] = orderedFiles.map((file, index) => {
    const id = baseId(file);
    const featured = chosenHeroIds.includes(id);

    return {
      id,
      fileName: file,
      src: `/together/${file}`,
      albumId,
      uploadedAt: nowIso(),
      caption: featured ? "首页合照" : `回忆 ${index + 1}`,
      author: index % 3 === 0 ? "wjc" : index % 3 === 1 ? "lmm" : "共同",
      isFeatured: featured,
      isCover: id === chosenHeroIds[0],
    };
  });

  return {
    settings: {
      siteName: "L & W 的恋爱小站",
      homeTitle: "我们的小宇宙",
      homeSubtitle: "记录每一个平凡却发光的瞬间",
      coupleName: "L & W",
      relationshipStart: "2025-11-11",
      wjcBirthday: "09-26",
      lmmBirthday: "01-31",
      musicUrl:
        "https://music.163.com/playlist?id=818501323&uct2=U2FsdGVkX1+JODoXynHnJiyNNcmfPRHrNV5AjOAn8dM=",
      heroPhotoIds: chosenHeroIds,
    },
    albums: [
      {
        id: albumId,
        name: "约会与合照",
        description: "来自 together 文件夹的第一批回忆。",
        coverPhotoId: chosenHeroIds[0],
        createdAt: nowIso(),
      },
    ],
    photos,
    timeline: [
      {
        id: "timeline-2025-11-11",
        date: "2025-11-11",
        title: "在一起了",
        description: "从这一天开始，我们把彼此写进未来。",
        author: "共同",
      },
      {
        id: "timeline-2025-12-31",
        date: "2025-12-31",
        title: "武汉旅行",
        description: "一起去武汉，把 2025 的尾声留在风和夜色里。",
        author: "共同",
      },
      {
        id: "timeline-2026-01-16",
        date: "2026-01-16",
        title: "广州旅行",
        description: "在广州继续把回忆往前写，留下新的城市片段。",
        author: "共同",
      },
      {
        id: "timeline-2026-01-31",
        date: "2026-01-31",
        title: "lmm 生日",
        description: "给 lmm 的生日，应该要被认真记下来。",
        author: "共同",
      },
    ],
    diaries: [],
    locations: [
      {
        id: "wuhan-2025-12-31",
        city: "武汉",
        provinceId: "hubei",
        date: "2025-12-31",
        note: "在武汉一起旅行的那天。",
        photoIds: [],
        author: "共同",
      },
      {
        id: "guangzhou-2026-01-16",
        city: "广州",
        provinceId: "guangdong",
        date: "2026-01-16",
        note: "广州旅行的回忆点。",
        photoIds: [],
        author: "共同",
      },
    ],
  };
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
    author:
      item.author === "wjc" || item.author === "lmm" || item.author === "共同"
        ? item.author
        : "共同",
  };
}

async function normalizeData(data: Partial<SiteData>): Promise<SiteData> {
  const defaults = await makeDefaultData();

  return {
    settings: {
      ...defaults.settings,
      ...(data.settings ?? {}),
    },
    albums: data.albums ?? defaults.albums,
    photos: data.photos ?? defaults.photos,
    timeline: data.timeline ?? defaults.timeline,
    diaries: data.diaries ?? defaults.diaries,
    locations: Array.isArray(data.locations)
      ? data.locations.map((item) =>
          normalizeLocationItem(item as Partial<LocationItem> & Record<string, unknown>),
        )
      : defaults.locations,
  };
}

async function ensureSeededData() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    const data = await makeDefaultData();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  }
}

export async function loadSiteData(): Promise<SiteData> {
  await ensureSeededData();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return normalizeData(JSON.parse(raw) as Partial<SiteData>);
}

export async function saveSiteData(data: SiteData) {
  await serialize(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  });
}

export async function updateSiteData(
  mutator: (data: SiteData) => Promise<SiteData> | SiteData,
) {
  return serialize(async () => {
    const current = await loadSiteData();
    const next = await mutator(current);
    await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
    return next;
  });
}

export async function saveUploadFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".jpg";
  const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  await fs.mkdir(PUBLIC_UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_UPLOADS_DIR, fileName), buffer);
  return { fileName, src: `/uploads/${fileName}` };
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
