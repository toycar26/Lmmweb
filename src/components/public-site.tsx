"use client";

import Link from "next/link";
import Image from "next/image";
import china from "@svg-maps/china";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getProvinceName, type ProvinceId } from "@/lib/provinces";
import type { DiaryItem, LocationItem, SiteData } from "@/lib/site-data";

type ExperienceKind = "album" | "travel" | "diary" | "radio";

type ExperienceState = {
  kind: ExperienceKind;
  key: number;
};

type PageRenderContext = {
  goToPage: (page: number) => void;
};

type BookPage = {
  id: string;
  label: string;
  render: (context: PageRenderContext) => ReactNode;
};

type RadioStation = {
  id: string;
  sourceUrl: string;
  embedUrl: string;
  kind: "playlist" | "song";
  label: string;
};

type SvgProvince = {
  id: string;
  name: string;
  path: string;
};

type AlbumRecord = SiteData["albums"][number];
type PhotoRecord = SiteData["photos"][number];
type AlbumView = AlbumRecord & {
  photos: PhotoRecord[];
  coverPhoto?: PhotoRecord;
};

const svgProvinces = china.locations as SvgProvince[];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toShanghaiDate(value: Date = new Date()) {
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

function formatDisplayDate(value: string) {
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

function formatMonthDay(value: string) {
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

function relationshipDays(startDate: string) {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 0;
  return diffDays(start, toShanghaiDate());
}

function countdownToNextMonthDay(monthDay: string) {
  const [month, day] = monthDay.split("-").map(Number);
  if (!month || !day) return null;

  const today = toShanghaiDate();
  const candidate = new Date(today.getFullYear(), month - 1, day);
  if (candidate < today) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return diffDays(today, candidate);
}

function authorLabel(author: string) {
  if (author === "wjc") return "我的";
  if (author === "lmm") return "她的";
  return "两人的";
}

function locationStamp(author: string) {
  if (author === "wjc") return "WJC 记录";
  if (author === "lmm") return "LMM 记录";
  return "共同记录";
}

function diaryGroups(entries: DiaryItem[]) {
  return {
    mine: entries.filter((entry) => entry.author === "wjc"),
    hers: entries.filter((entry) => entry.author === "lmm"),
    ours: entries.filter((entry) => entry.author !== "wjc" && entry.author !== "lmm"),
  };
}

function parseNetEaseLink(value: string): RadioStation | null {
  const raw = value.trim();
  if (!raw) return null;

  const playlistMatch =
    raw.match(/playlist\?(?:.*?&)?id=(\d+)/i) ??
    raw.match(/playlist\/(\d+)/i);
  if (playlistMatch) {
    const id = playlistMatch[1];
    return {
      id: `playlist-${id}`,
      sourceUrl: raw,
      embedUrl: `https://music.163.com/outchain/player?type=0&id=${id}&auto=1&height=430`,
      kind: "playlist",
      label: `歌单 ${id}`,
    };
  }

  const songMatch =
    raw.match(/song\?(?:.*?&)?id=(\d+)/i) ??
    raw.match(/song\/(\d+)/i);
  if (songMatch) {
    const id = songMatch[1];
    return {
      id: `song-${id}`,
      sourceUrl: raw,
      embedUrl: `https://music.163.com/outchain/player?type=2&id=${id}&auto=1&height=66`,
      kind: "song",
      label: `单曲 ${id}`,
    };
  }

  return null;
}

function ShelfTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#d7cbc1]">
      {children}
    </span>
  );
}

function StatSlip({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper-panel rounded-[1.5rem] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[#a8846a]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#3f2d24]">{value}</p>
    </div>
  );
}

function DirectoryButton({ onClick, label = "回到目录页" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-[#d2b093] bg-white/78 px-4 py-2 text-sm font-medium text-[#6d4f40] shadow-[0_8px_24px_rgba(128,90,62,0.12)] transition hover:-translate-y-0.5 hover:bg-white"
    >
      {label}
    </button>
  );
}

function buildAlbumViews(data: SiteData): AlbumView[] {
  return data.albums.map((album) => {
    const photos = data.photos.filter((photo) => photo.albumId === album.id);
    const coverPhoto =
      data.photos.find((photo) => photo.id === album.coverPhotoId) ??
      photos.find((photo) => photo.isCover) ??
      photos[0];

    return {
      ...album,
      photos,
      coverPhoto,
    };
  });
}

function AlbumDirectoryPage({
  albums,
  onOpenAlbum,
}: {
  albums: AlbumView[];
  onOpenAlbum: (albumId: string) => void;
}) {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(albums[0]?.id ?? null);

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId) ?? albums[0];

  if (!selectedAlbum) {
    return (
      <div className="flex min-h-[63vh] items-center justify-center rounded-[2rem] border border-[#ead6c4] bg-[#f5eadb] p-8 text-[#6f5545]">
        暂时还没有相册
      </div>
    );
  }

  return (
    <div className="grid min-h-[63vh] gap-6 lg:grid-cols-[0.74fr_1.26fr]">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#e2c8b0] bg-[linear-gradient(180deg,#fcf5eb_0%,#f1e2d1_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
        <div className="absolute inset-y-6 left-5 w-4 rounded-full bg-[linear-gradient(180deg,#9f6c57,#553830)] opacity-80" />
        <div className="absolute inset-y-6 left-9 w-[3px] rounded-full bg-[linear-gradient(180deg,#f5e7d7,#c89071,#f5e7d7)]" />
        <div className="max-h-[63vh] space-y-3 overflow-auto pl-7 pr-2">
          {albums.map((album, index) => {
            const isActive = album.id === selectedAlbum.id;

            return (
              <button
                key={album.id}
                type="button"
                onClick={() => setSelectedAlbumId(album.id)}
                className={`group w-full rounded-[1.6rem] border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-[#ab7c63] bg-white shadow-[0_16px_34px_rgba(137,98,72,0.16)]"
                    : "border-[#e6d2bf] bg-white/56 hover:-translate-y-0.5 hover:bg-white/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-14 overflow-hidden rounded-[1rem] border border-[#ead6c4] bg-[#f3e5d6]">
                    {album.coverPhoto ? (
                      <Image
                        src={album.coverPhoto.src}
                        alt={album.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-[#9a7a65]">
                        空
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#b18667]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="truncate text-base font-semibold text-[#433027]">{album.name}</p>
                    <p className="text-xs text-[#8b6f61]">{album.photos.length} 张照片</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6">
        <div className="paper-panel rounded-[2rem] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.36em] text-[#aa8367]">Album directory</p>
          <h3 className="mt-3 text-4xl font-semibold text-[#3f2d24]">{selectedAlbum.name}</h3>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#6c5547]">
            {selectedAlbum.description || "这一组照片的简介还没有写太多。"}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatSlip label="相册数量" value={`${albums.length} 个`} />
            <StatSlip label="照片数量" value={`${selectedAlbum.photos.length} 张`} />
            <StatSlip label="创建时间" value={formatDisplayDate(selectedAlbum.createdAt)} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#ead6c4] bg-[#f3e5d6] p-4 shadow-[0_24px_50px_rgba(128,90,62,0.14)]">
            {selectedAlbum.coverPhoto ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
                <Image
                  src={selectedAlbum.coverPhoto.src}
                  alt={selectedAlbum.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(65,44,36,0.08)_55%,rgba(56,39,32,0.42)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/70">Cover memory</p>
                  <p className="mt-2 text-lg font-medium">
                    {selectedAlbum.coverPhoto.caption || "这本相册的封面"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-[1.5rem] bg-white/60 text-[#8a6a58]">
                还没有设置封面图
              </div>
            )}
          </div>

          <div className="paper-panel flex flex-col justify-between rounded-[2rem] px-6 py-6">
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-[0.36em] text-[#ab8265]">Preview</p>
              <p className="text-sm leading-7 text-[#6f594b]">
                选中一本相册，抵达这本相册专属的照片长廊
              </p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => onOpenAlbum(selectedAlbum.id)}
                className="inline-flex items-center justify-center rounded-full border border-[#d2b093] bg-[#4f352c] px-5 py-3 text-sm font-medium text-[#fff4e9] transition hover:bg-[#674339]"
              >
                打开相册
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlbumWallPage({
  album,
  onOpenPhoto,
  onBackToDirectory,
}: {
  album: AlbumView;
  onOpenPhoto: (photoId: string) => void;
  onBackToDirectory: () => void;
}) {
  return (
    <div className="min-h-[63vh] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full border border-[#d2b093] bg-white/72 px-4 py-2 text-[11px] uppercase tracking-[0.34em] text-[#9b755c]">
          {album.name}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#ab8265]">照片数量</p>
            <p className="mt-2 text-2xl font-semibold text-[#4b3429]">{album.photos.length} 张</p>
          </div>
          <DirectoryButton onClick={onBackToDirectory} label="返回相册目录" />
        </div>
      </div>

      <div className="paper-panel rounded-[2rem] px-4 py-4">
        {album.photos.length ? (
          <div className="grid min-h-[54vh] grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {album.photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onOpenPhoto(photo.id)}
                className="group overflow-hidden rounded-[1.3rem] border border-[#e6d0bc] bg-white shadow-[0_10px_26px_rgba(120,86,62,0.08)] transition hover:-translate-y-1"
              >
                <div className="relative aspect-square overflow-hidden rounded-[1.2rem]">
                  <Image
                    src={photo.src}
                    alt={photo.caption || `?? ${index + 1}`}
                    fill
                    sizes="(max-width: 1280px) 50vw, 22vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[54vh] items-center justify-center rounded-[1.5rem] border border-dashed border-[#d8c0aa] bg-white/60 text-[#8a6a58]">
            ??????????
          </div>
        )}
      </div>
    </div>
  );
}
function PhotoDetailPage({
  album,
  photo,
  onBackToAlbum,
}: {
  album: AlbumView;
  photo: PhotoRecord;
  onBackToAlbum: () => void;
}) {
  const detailText = photo.details?.trim() || photo.caption || "这张照片还没有写下更多细节。";

  return (
    <div className="grid min-h-[63vh] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#ead6c4] bg-[#f3e5d6] p-4 shadow-[0_24px_50px_rgba(128,90,62,0.14)]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
          <Image
            src={photo.src}
            alt={photo.caption || album.name}
            fill
            sizes="(max-width: 1024px) 100vw, 46vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="space-y-5">
        <div className="inline-flex rounded-full border border-[#d2b093] bg-white/72 px-4 py-2 text-[11px] uppercase tracking-[0.34em] text-[#9b755c]">
          {album.name}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.36em] text-[#aa8367]">Photo detail</p>
          <h3 className="mt-3 text-4xl font-semibold text-[#3f2d24]">
            {photo.caption || "未命名照片"}
          </h3>
          <p className="mt-2 text-sm text-[#987762]">{formatDisplayDate(photo.uploadedAt)}</p>
        </div>
        <div className="paper-panel rounded-[2rem] px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.36em] text-[#ab8265]">Description</p>
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-[#5f493c]">
            {detailText}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatSlip label="记录者" value={authorLabel(photo.author)} />
          <StatSlip label="所属相册" value={album.name} />
        </div>
        <DirectoryButton onClick={onBackToAlbum} label="返回相册" />
      </div>
    </div>
  );
}

function ShelfBook({
  title,
  subtitle,
  tone,
  tilt,
  spine,
  onClick,
}: {
  title: string;
  subtitle: string;
  tone: string;
  tilt: string;
  spine: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[250px] rounded-[2rem] border border-white/12 bg-gradient-to-br ${tone} p-5 text-left text-[#fff7ed] shadow-[0_28px_80px_rgba(0,0,0,0.28)] transition duration-500 hover:-translate-y-2 hover:rotate-0 ${tilt}`}
    >
      <div className="absolute inset-y-5 left-4 w-4 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(0,0,0,0.3))]" />
      <div className="absolute inset-y-3 left-8 w-[2px] bg-white/14" />
      <div className="absolute inset-0 rounded-[2rem] border border-white/10 opacity-80" />
      <div className="absolute right-5 top-5 rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.34em] text-white/72">
        {spine}
      </div>
      <div className="relative flex h-full flex-col justify-between pl-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.36em] text-white/62">Love archive</p>
          <h3 className="mt-5 max-w-[9ch] text-[2rem] font-semibold leading-[1.02] text-white">
            {title}
          </h3>
        </div>
        <p className="max-w-[16rem] text-sm leading-6 text-white/74">{subtitle}</p>
      </div>
      <div className="absolute bottom-4 right-4 h-14 w-14 rounded-full border border-white/18 bg-white/10" />
    </button>
  );
}

function RadioShelf({
  onClick,
  stationLabel,
}: {
  onClick: () => void;
  stationLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-h-[250px] overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(140deg,#8d5946_0%,#593831_45%,#1d1718_100%)] p-6 text-left text-[#fff7ed] shadow-[0_28px_80px_rgba(0,0,0,0.3)] transition duration-500 hover:-translate-y-2"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(255,190,124,0.16),transparent_20%)]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-white/16 px-3 py-1 text-[10px] uppercase tracking-[0.34em] text-white/70">
            Radio
          </span>
          <span className="text-xs tracking-[0.22em] text-white/55">NETEASE CLOUD</span>
        </div>

        <div className="mt-7 rounded-[2rem] border border-white/10 bg-black/18 px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="radio-reel relative h-16 w-16 rounded-full border border-[#f8e0c8]/60 bg-[radial-gradient(circle,#fae2cc_0%,#d8ad8f_56%,#6f4338_100%)] shadow-[inset_0_0_18px_rgba(64,31,25,0.45)]">
              <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#422a23]" />
              <div className="absolute inset-[13px] rounded-full border border-[#fff4ea]/45" />
            </div>
            <div className="radio-reel relative h-16 w-16 rounded-full border border-[#f8e0c8]/60 bg-[radial-gradient(circle,#fae2cc_0%,#d8ad8f_56%,#6f4338_100%)] shadow-[inset_0_0_18px_rgba(64,31,25,0.45)] [animation-duration:5.4s]">
              <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#422a23]" />
              <div className="absolute inset-[13px] rounded-full border border-[#fff4ea]/45" />
            </div>
            <div className="flex-1 rounded-[1.25rem] border border-white/10 bg-black/28 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/52">Current tape</p>
              <p className="mt-2 text-base font-semibold text-white">{stationLabel}</p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                放你喜欢的音乐
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-white/70">
          <span>可切歌</span>
          <span className="rounded-full border border-white/14 px-3 py-1 text-[11px] uppercase tracking-[0.32em] text-white/70">
            Open
          </span>
        </div>
      </div>
    </button>
  );
}

function TurnSheet({ direction }: { direction: "forward" | "backward" }) {
  return (
    <div
      className={`book-turn-sheet absolute inset-y-5 ${
        direction === "forward" ? "right-4 left-[46%] origin-left" : "left-4 right-[46%] origin-right"
      } rounded-[1.4rem] bg-[linear-gradient(90deg,rgba(255,251,244,0.98)_0%,rgba(248,235,216,0.95)_55%,rgba(214,189,160,0.62)_100%)] shadow-[0_24px_60px_rgba(76,48,29,0.18)] ${
        direction === "forward" ? "turn-forward" : "turn-backward"
      }`}
    />
  );
}

function BookViewer({
  title,
  subtitle,
  accent,
  pages,
  onClose,
}: {
  title: string;
  subtitle: string;
  accent: string;
  pages: BookPage[];
  onClose: () => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [turnState, setTurnState] = useState<null | {
    direction: "forward" | "backward";
    nextPage: number;
  }>(null);

  useEffect(() => {
    if (!turnState) return;

    const pageTimer = window.setTimeout(() => setPageIndex(turnState.nextPage), 240);
    const resetTimer = window.setTimeout(() => setTurnState(null), 760);

    return () => {
      window.clearTimeout(pageTimer);
      window.clearTimeout(resetTimer);
    };
  }, [turnState]);

  function goToPage(nextPage: number) {
    const clampedPage = clamp(nextPage, 0, pages.length - 1);
    if (clampedPage === pageIndex || turnState) return;

    const direction = clampedPage > pageIndex ? "forward" : "backward";
    setTurnState({ direction, nextPage: clampedPage });
  }

  const currentPage = pages[pageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,5,5,0.74)] px-4 py-6 backdrop-blur-md">
      <button
        type="button"
        aria-label="关闭书本"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-6xl">
        <div className="mx-auto max-w-5xl rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,17,16,0.92),rgba(10,8,8,0.96))] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between px-4 pb-4 pt-2 text-[#ede0cf]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#ccbaa3]">{accent}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
              <p className="mt-1 text-sm text-[#d9c7b4]">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/14 bg-white/6 px-4 py-2 text-sm text-white/76 transition hover:bg-white/12"
            >
              合上
            </button>
          </div>

          <div className="relative rounded-[2rem] border border-[#d8bfa4]/28 bg-[#d9bea2] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <div className="absolute bottom-4 left-[48.9%] top-4 w-[2px] rounded-full bg-[linear-gradient(180deg,rgba(106,69,48,0.15),rgba(64,38,27,0.4),rgba(106,69,48,0.12))]" />
            <div className="absolute inset-y-4 left-4 w-5 rounded-full bg-[linear-gradient(180deg,#5e3f34,#2f1f1a)]" />
            <div className="absolute inset-y-4 left-7 w-[3px] rounded-full bg-[linear-gradient(180deg,#92675a,#f1dfca,#92675a)] opacity-70" />
            <div className="paper-panel relative min-h-[70vh] overflow-hidden rounded-[1.75rem] px-6 py-6 sm:px-8">
              {turnState ? <TurnSheet direction={turnState.direction} /> : null}
              <div className="relative z-10 min-h-[63vh]">
                {currentPage.render({ goToPage })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => goToPage(pageIndex - 1)}
                disabled={pageIndex === 0 || Boolean(turnState)}
                className="rounded-full border border-[#b99778] bg-white/56 px-4 py-2 text-sm text-[#5d4436] transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                上一页
              </button>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#9f7b61]">
                  {currentPage.label}
                </p>
                <p className="mt-1 text-sm text-[#6f5545]">
                  第 {pageIndex + 1} / {pages.length} 页
                </p>
              </div>
              <button
                type="button"
                onClick={() => goToPage(pageIndex + 1)}
                disabled={pageIndex === pages.length - 1 || Boolean(turnState)}
                className="rounded-full border border-[#b99778] bg-[#4f352c] px-4 py-2 text-sm text-[#fff4e9] transition hover:bg-[#674339] disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TravelAtlas({
  locations,
  onSelectProvince,
}: {
  locations: LocationItem[];
  onSelectProvince: (provinceId: ProvinceId) => void;
}) {
  const [activeProvince, setActiveProvince] = useState<ProvinceId | null>(
    locations[0]?.provinceId ?? null,
  );

  const visitsByProvince = useMemo(() => {
    const grouped = new Map<ProvinceId, LocationItem[]>();

    for (const location of locations) {
      if (!location.provinceId) continue;
      const list = grouped.get(location.provinceId) ?? [];
      list.push(location);
      grouped.set(location.provinceId, list);
    }

    return grouped;
  }, [locations]);

  const spotlightProvince =
    activeProvince ?? Array.from(visitsByProvince.keys())[0] ?? null;
  const spotlightVisits = spotlightProvince
    ? visitsByProvince.get(spotlightProvince) ?? []
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="rounded-[1.8rem] border border-[#e4cdb8] bg-[linear-gradient(180deg,#fffaf4_0%,#f6eadc_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/74 p-4 shadow-[0_18px_40px_rgba(137,98,72,0.1)]">
          <svg
            viewBox={china.viewBox}
            className="h-auto w-full"
            role="img"
            aria-label="旅行地图"
          >
            {svgProvinces.map((location) => {
              const provinceId = location.id as ProvinceId;
              const hasVisit = visitsByProvince.has(provinceId);
              const isActive = provinceId === spotlightProvince;

              return (
                <path
                  key={provinceId}
                  d={location.path}
                  fill={
                    isActive ? "#8c5848" : hasVisit ? "#d49c83" : "#f6eadc"
                  }
                  stroke={isActive ? "#603e34" : "#d7beab"}
                  strokeWidth={isActive ? 2.1 : 1.3}
                  className={`transition duration-200 ${
                    hasVisit ? "cursor-pointer" : "cursor-default"
                  }`}
                  onMouseEnter={() => {
                    if (!hasVisit) return;
                    setActiveProvince(provinceId);
                  }}
                  onClick={() => {
                    if (!hasVisit) return;
                    setActiveProvince(provinceId);
                    onSelectProvince(provinceId);
                  }}
                >
                  <title>{getProvinceName(provinceId)}</title>
                </path>
              );
            })}
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#8a6b58]">
          <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
            点击去过的省份，看看我们看过的风景
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
            有一天我们要点亮整个地图
          </span>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="paper-panel rounded-[1.6rem] px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#ab8265]">Travel spotlight</p>
          <h3 className="mt-3 text-2xl font-semibold text-[#4b3429]">
            {spotlightProvince ? getProvinceName(spotlightProvince) : "等你点亮下一站"}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#73584a]">
            {spotlightVisits.length
              ? `这里已经留下 ${spotlightVisits.length} 段旅程，点击地图上的高亮省份，直接翻页去那一站。`
              : "先把第一次一起出发写进地图里，书就会记住你们走过的地方。"}
          </p>
        </div>

        {spotlightVisits.length ? (
          spotlightVisits.map((visit) => (
            <button
              key={visit.id}
              type="button"
              onClick={() => {
                if (visit.provinceId) {
                  onSelectProvince(visit.provinceId);
                }
              }}
              className="paper-panel rounded-[1.5rem] px-5 py-4 text-left transition hover:-translate-y-1"
            >
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#b38a6d]">
                {formatDisplayDate(visit.date)}
              </p>
              <h4 className="mt-2 text-lg font-semibold text-[#4a342a]">{visit.city}</h4>
              <p className="mt-3 text-sm leading-7 text-[#745b4d]">{visit.note}</p>
            </button>
          ))
        ) : (
          <div className="paper-panel rounded-[1.5rem] px-5 py-7 text-sm leading-7 text-[#7b6255]">
            这一页还留着空白，等下一次一起出发再把它写满。
          </div>
        )}
      </div>
    </div>
  );
}

function RadioViewer({
  initialStation,
  onClose,
}: {
  initialStation: RadioStation | null;
  onClose: () => void;
}) {
  const [queue, setQueue] = useState<RadioStation[]>(initialStation ? [initialStation] : []);
  const [inputValue, setInputValue] = useState(initialStation?.sourceUrl ?? "");
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [filmLoading, setFilmLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function switchTo(index: number, withFilm: boolean) {
    const station = queue[index];
    if (!station) return;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!withFilm) {
      setFilmLoading(false);
      setCurrentIndex(index);
      setActiveStation(station);
      return;
    }

    setFilmLoading(true);
    setCurrentIndex(index);
    timerRef.current = window.setTimeout(() => {
      setFilmLoading(false);
      setActiveStation(station);
      timerRef.current = null;
    }, 1400);
  }

  function addStation() {
    const parsed = parseNetEaseLink(inputValue);
    if (!parsed) {
      setError("这个链接暂时识别不了，请贴网易云单曲或歌单链接。");
      return;
    }

    setError("");
    setQueue((currentQueue) => {
      const existingIndex = currentQueue.findIndex((station) => station.id === parsed.id);
      if (existingIndex >= 0) {
        switchTo(existingIndex, true);
        return currentQueue;
      }

      const nextQueue = [...currentQueue, parsed];
      switchTo(nextQueue.length - 1, true);
      return nextQueue;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,5,5,0.74)] px-4 py-6 backdrop-blur-md">
      <button type="button" aria-label="关闭收音机" className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(25,19,17,0.94),rgba(11,8,8,0.98))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between px-2 pb-4 text-[#ede0cf]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#cfbca8]">Radio room</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">小收音机</h2>
            <p className="mt-1 text-sm text-[#d9c7b4]">
              别说话，感受
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/14 bg-white/6 px-4 py-2 text-sm text-white/76 transition hover:bg-white/12"
          >
            关掉
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[2rem] border border-[#8e6250]/40 bg-[linear-gradient(180deg,#8c5a47_0%,#603f37_50%,#2b2324_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="rounded-[1.6rem] border border-white/12 bg-black/18 px-4 py-5">
              <div className="flex items-center gap-4">
                <div className={`radio-reel relative h-20 w-20 rounded-full border border-[#f8e0c8]/60 bg-[radial-gradient(circle,#fae2cc_0%,#d8ad8f_56%,#6f4338_100%)] shadow-[inset_0_0_18px_rgba(64,31,25,0.45)] ${filmLoading ? "[animation-duration:1.2s]" : ""}`}>
                  <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#422a23]" />
                  <div className="absolute inset-[16px] rounded-full border border-[#fff4ea]/45" />
                </div>
                <div className={`radio-reel relative h-20 w-20 rounded-full border border-[#f8e0c8]/60 bg-[radial-gradient(circle,#fae2cc_0%,#d8ad8f_56%,#6f4338_100%)] shadow-[inset_0_0_18px_rgba(64,31,25,0.45)] ${filmLoading ? "[animation-duration:1.1s]" : "[animation-duration:4.8s]"}`}>
                  <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#422a23]" />
                  <div className="absolute inset-[16px] rounded-full border border-[#fff4ea]/45" />
                </div>
                <div className="flex-1 rounded-[1.35rem] border border-white/10 bg-black/28 px-4 py-4 text-white">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-white/52">Status</p>
                  <p className="mt-2 text-lg font-semibold">
                    {filmLoading
                      ? "胶片装载中..."
                      : activeStation
                        ? `正在播放 ${activeStation.label}`
                        : "等待启动"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {filmLoading
                      ? "听喜欢的音乐"
                      : activeStation
                        ? "小电台启动！"
                        : "贴一个网易云链接，按下播放，让房间里有一点声音。"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[#120f10]/70 p-4">
                <label className="text-[11px] uppercase tracking-[0.32em] text-white/58">
                  网易云链接
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addStation();
                      }
                    }}
                    placeholder="https://music.163.com/playlist?id=..."
                    className="h-12 flex-1 rounded-full border border-white/10 bg-white/8 px-4 text-sm text-white outline-none placeholder:text-white/36 focus:border-[#f2d1b4]"
                  />
                  <button
                    type="button"
                    onClick={addStation}
                    className="h-12 rounded-full bg-[#f0d1b2] px-5 text-sm font-medium text-[#4b2e24] transition hover:bg-[#f7dcc2]"
                  >
                    装带
                  </button>
                </div>
                {error ? <p className="mt-3 text-sm text-[#ffd5bf]">{error}</p> : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!queue.length) return;
                    const nextIndex = (currentIndex - 1 + queue.length) % queue.length;
                    switchTo(nextIndex, false);
                  }}
                  disabled={queue.length < 2}
                  className="rounded-full border border-white/10 bg-white/8 px-4 py-3 text-sm text-white transition hover:bg-white/12 disabled:opacity-40"
                >
                  上一首
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!queue.length) return;
                    switchTo(currentIndex, true);
                  }}
                  disabled={!queue.length}
                  className="rounded-full bg-[#f0d1b2] px-4 py-3 text-sm font-medium text-[#4b2e24] transition hover:bg-[#f7dcc2] disabled:opacity-40"
                >
                  播放当前
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!queue.length) return;
                    const nextIndex = (currentIndex + 1) % queue.length;
                    switchTo(nextIndex, false);
                  }}
                  disabled={queue.length < 2}
                  className="rounded-full border border-white/10 bg-white/8 px-4 py-3 text-sm text-white transition hover:bg-white/12 disabled:opacity-40"
                >
                  下一首
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-black/14 p-4">
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/52">Queue</p>
              <div className="mt-3 grid gap-2">
                {queue.length ? (
                  queue.map((station, index) => (
                    <button
                      key={station.id}
                      type="button"
                      onClick={() => switchTo(index, false)}
                      className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm transition ${
                        index === currentIndex
                          ? "border-[#f1d2b6] bg-[#f1d2b6]/14 text-white"
                          : "border-white/8 bg-white/6 text-white/72 hover:bg-white/10"
                      }`}
                    >
                      <p className="font-medium">{station.label}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/46">
                        {station.kind === "playlist" ? "Playlist" : "Song"}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border border-white/8 bg-white/6 px-4 py-5 text-sm leading-6 text-white/66">
                    还没有装带，先输入一个网易云链接吧。
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="paper-panel rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#ab8265]">Listening room</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#4b3429]">现在放什么</h3>
              </div>
              {activeStation ? (
                <a
                  href={activeStation.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[#d6b393] bg-white/70 px-4 py-2 text-sm text-[#6c4d3c] transition hover:bg-white"
                >
                  打开网易云
                </a>
              ) : null}
            </div>

            <div className="mt-5 min-h-[31rem] rounded-[1.6rem] border border-[#ead6c4] bg-[linear-gradient(180deg,#fffaf5_0%,#f6ecdf_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              {filmLoading ? (
                <div className="film-loader flex h-full min-h-[27rem] flex-col items-center justify-center rounded-[1.3rem] border border-dashed border-[#cba98c] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(247,237,224,0.92))] text-center">
                  <div className="relative h-28 w-44 overflow-hidden rounded-[1.4rem] border border-[#cba98c] bg-[#302320]">
                    <div className="film-strip absolute inset-y-4 left-[-10%] w-[120%] rounded-[1rem] bg-[repeating-linear-gradient(90deg,#f0dfc8_0_12%,#5a4035_12%_16%,#f0dfc8_16%_28%)] opacity-90" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,234,208,0.3),transparent_58%)]" />
                  </div>
                  <p className="mt-6 text-lg font-semibold text-[#4d372b]">胶片正在穿带</p>
                  <p className="mt-2 max-w-md text-sm leading-7 text-[#786052]">
                    耐心等等
                  </p>
                </div>
              ) : activeStation ? (
                <iframe
                  key={activeStation.id}
                  title={activeStation.label}
                  src={activeStation.embedUrl}
                  className="h-[27rem] w-full rounded-[1.3rem] border-0 bg-white"
                  allow="autoplay; encrypted-media"
                />
              ) : (
                <div className="flex h-full min-h-[27rem] flex-col items-center justify-center rounded-[1.3rem] border border-dashed border-[#ceb39a] bg-white/58 px-8 text-center">
                  <p className="text-lg font-semibold text-[#4d372b]">还没有开始播放</p>
                  <p className="mt-3 max-w-md text-sm leading-7 text-[#786052]">
                    你可以先贴一个歌单链接，也可以保留默认歌单，然后按一次“装带播放”。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicSite({ data }: { data: SiteData }) {
  const [activeExperience, setActiveExperience] = useState<ExperienceState | null>(null);

  const heroPhotos = data.settings.heroPhotoIds
    .map((id) => data.photos.find((photo) => photo.id === id))
    .filter((photo): photo is SiteData["photos"][number] => Boolean(photo));
  const highlightPhotos = heroPhotos.length ? heroPhotos : data.photos;
  const albumViews = useMemo(() => buildAlbumViews(data), [data]);
  const travelLocations = [...data.locations].sort((a, b) => a.date.localeCompare(b.date));
  const diaries = diaryGroups(data.diaries);
  const relationshipDaysCount = relationshipDays(data.settings.relationshipStart);
  const lmmCountdown = countdownToNextMonthDay(data.settings.lmmBirthday);
  const wjcCountdown = countdownToNextMonthDay(data.settings.wjcBirthday);
  const defaultStation = parseNetEaseLink(data.settings.musicUrl);

  const photoPages: BookPage[] = [];
  const albumPageById = new Map<string, number>();
  const photoPageById = new Map<string, number>();

  photoPages.push({
    id: "album-directory",
    label: "Index",
    render: ({ goToPage }) => (
      <AlbumDirectoryPage
        albums={albumViews}
        onOpenAlbum={(albumId) => {
          const page = albumPageById.get(albumId);
          if (typeof page === "number") {
            goToPage(page);
          }
        }}
      />
    ),
  });

  albumViews.forEach((album) => {
    const albumPageIndex = photoPages.length;
    albumPageById.set(album.id, albumPageIndex);

    photoPages.push({
      id: `album-${album.id}`,
      label: album.name,
      render: ({ goToPage }) => (
        <AlbumWallPage
          album={album}
          onOpenPhoto={(photoId) => {
            const page = photoPageById.get(photoId);
            if (typeof page === "number") {
              goToPage(page);
            }
          }}
          onBackToDirectory={() => goToPage(0)}
        />
      ),
    });

    album.photos.forEach((photo, index) => {
      const detailPageIndex = photoPages.length;
      photoPageById.set(photo.id, detailPageIndex);

      photoPages.push({
        id: `photo-${photo.id}`,
        label: photo.caption || `Photo ${index + 1}`,
        render: ({ goToPage }) => (
          <PhotoDetailPage
            album={album}
            photo={photo}
            onBackToAlbum={() => goToPage(albumPageIndex)}
          />
        ),
      });
    });
  });

  const travelPageByProvince = new Map<ProvinceId, number>();
  const travelPages: BookPage[] = [
    {
      id: "travel-cover",
      label: "封面",
      render: () => (
        <div className="grid min-h-[63vh] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.36em] text-[#aa8367]">Travel log</p>
            <h3 className="max-w-[8ch] text-5xl font-semibold leading-[1.02] text-[#3f2d24]">
              旅行日志
            </h3>
            <p className="max-w-xl text-base leading-8 text-[#6c5547]">
              先看地图，点下去就能回到那次一起出发的时间里。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatSlip label="已收录地点" value={`${travelLocations.length} 站`} />
              <StatSlip label="地图模式" value="中国地图" />
            </div>
          </div>

          <div className="paper-panel rounded-[2rem] p-5">
            <p className="text-sm leading-7 text-[#6f594b]">
              第一页是整张地图，后面每一页都是一段旅程。
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "travel-map",
      label: "地图",
      render: ({ goToPage }) => (
        <div className="min-h-[63vh]">
          <TravelAtlas
            locations={travelLocations}
            onSelectProvince={(provinceId) => {
              const page = travelPageByProvince.get(provinceId);
              if (typeof page === "number") {
                goToPage(page);
              }
            }}
          />
        </div>
      ),
    },
  ];

  travelLocations.forEach((location, index) => {
    if (location.provinceId && !travelPageByProvince.has(location.provinceId)) {
      travelPageByProvince.set(location.provinceId, travelPages.length);
    }

    const relatedPhoto =
      (location.photoIds.length
        ? data.photos.find((photo) => location.photoIds.includes(photo.id))
        : undefined) ??
      highlightPhotos[index % Math.max(highlightPhotos.length, 1)];

    travelPages.push({
      id: `travel-${location.id}`,
      label: getProvinceName(location.provinceId),
      render: ({ goToPage }) => (
        <div className="grid min-h-[63vh] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-[#d2b093] bg-white/72 px-4 py-2 text-[11px] uppercase tracking-[0.34em] text-[#9b755c]">
              {getProvinceName(location.provinceId)} / {locationStamp(location.author)}
            </div>
            <div>
              <p className="text-sm text-[#9f7d66]">{formatDisplayDate(location.date)}</p>
              <h3 className="mt-3 text-4xl font-semibold text-[#3f2d24]">{location.city}</h3>
            </div>
            <p className="text-base leading-8 text-[#6d5546]">{location.note}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatSlip label="省份" value={getProvinceName(location.provinceId)} />
              <StatSlip label="记录归档" value={`第 ${index + 1} 段旅程`} />
            </div>
            <DirectoryButton onClick={() => goToPage(1)} />
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[#ead6c4] bg-[#f3e5d6] p-4 shadow-[0_24px_50px_rgba(128,90,62,0.14)]">
            {relatedPhoto ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
                <Image
                  src={relatedPhoto.src}
                  alt={relatedPhoto.caption || location.city}
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-[1.5rem] bg-white/60 text-[#8a6a58]">
                这一站还没有配图
              </div>
            )}
          </div>
        </div>
      ),
    });
  });

  let mineStartPage = 0;
  let herStartPage = 0;
  let ourStartPage = 0;
  const diaryPages: BookPage[] = [
    {
      id: "diary-cover",
      label: "封面",
      render: () => (
        <div className="grid min-h-[63vh] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.36em] text-[#aa8367]">Diary</p>
            <h3 className="max-w-[8ch] text-5xl font-semibold leading-[1.02] text-[#3f2d24]">
              日记本
            </h3>
            <p className="max-w-xl text-base leading-8 text-[#6c5547]">
              把各自的心事和共同记忆都放进来
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatSlip label="玩具车" value={`${diaries.mine.length} 篇`} />
            <StatSlip label="小梦梦" value={`${diaries.hers.length} 篇`} />
            <StatSlip label="小情侣" value={`${diaries.ours.length} 篇`} />
          </div>
        </div>
      ),
    },
    {
      id: "diary-index",
      label: "目录",
      render: ({ goToPage }) => (
        <div className="grid min-h-[63vh] items-center gap-6 lg:grid-cols-3">
          {[
            {
              title: "玩具车",
              description: "写只想对她说的话，也写当下的小小心情",
              count: diaries.mine.length,
              page: mineStartPage,
              tone: "from-[#f7eadf] to-[#f4ddd4]",
            },
            {
              title: "小梦梦",
              description: "梦梦视角里的细节，女明星的自传",
              count: diaries.hers.length,
              page: herStartPage,
              tone: "from-[#f7e5ea] to-[#f4d6df]",
            },
            {
              title: "小情侣",
              description: "适合一起记住的段落，像给未来留下的联合署名",
              count: diaries.ours.length,
              page: ourStartPage,
              tone: "from-[#f5e8d7] to-[#efd8bc]",
            },
          ].map((section) => (
            <button
              key={section.title}
              type="button"
              onClick={() => goToPage(section.page)}
              className={`rounded-[1.8rem] border border-[#e0c3aa] bg-gradient-to-br ${section.tone} px-5 py-6 text-left shadow-[0_18px_40px_rgba(126,90,66,0.12)] transition hover:-translate-y-2`}
            >
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#a37a60]">
                {section.count} 篇
              </p>
              <h3 className="mt-4 text-3xl font-semibold text-[#432f25]">{section.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#6e5648]">{section.description}</p>
              <p className="mt-5 text-sm font-medium text-[#5c4233]">点击翻到这个部分</p>
            </button>
          ))}
        </div>
      ),
    },
  ];

  const diarySections = [
    {
      key: "mine",
      title: "玩具车",
      intro: "这一部分留给我，写那些想告诉她、也想提醒自己的瞬间。",
      entries: diaries.mine,
    },
    {
      key: "hers",
      title: "小梦梦",
      intro: "这一部分留给她，像把情绪折好，放进会被认真翻看的那几页里。",
      entries: diaries.hers,
    },
    {
      key: "ours",
      title: "小情侣",
      intro: "一起写的内容会更像一本共同签名的薄书，平静但很重要。",
      entries: diaries.ours,
    },
  ] as const;

  diarySections.forEach((section) => {
    const startPage = diaryPages.length;
    if (section.key === "mine") mineStartPage = startPage;
    if (section.key === "hers") herStartPage = startPage;
    if (section.key === "ours") ourStartPage = startPage;

    diaryPages.push({
      id: `section-${section.key}`,
      label: `${section.title} · 扉页`,
      render: ({ goToPage }) => (
        <div className="grid min-h-[63vh] items-center gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.36em] text-[#aa8367]">
              {section.title} diary
            </p>
            <h3 className="text-5xl font-semibold text-[#3f2d24]">{section.title}</h3>
            <p className="max-w-xl text-base leading-8 text-[#6c5547]">{section.intro}</p>
            <DirectoryButton onClick={() => goToPage(1)} />
          </div>
          <div className="paper-panel rounded-[2rem] p-6">
            <p className="text-sm leading-7 text-[#6f594b]">
              这一部分现在收着 {section.entries.length} 篇内容。它会像真正的日记本一样，越翻越厚。
            </p>
          </div>
        </div>
      ),
    });

    if (section.entries.length) {
      section.entries.forEach((entry, index) => {
        diaryPages.push({
          id: `entry-${entry.id}`,
          label: `${section.title} ${index + 1}`,
          render: ({ goToPage }) => (
            <div className="grid min-h-[63vh] items-start gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.36em] text-[#aa8367]">Diary entry</p>
                <h3 className="text-4xl font-semibold text-[#3f2d24]">{entry.title}</h3>
                <p className="text-sm text-[#987762]">{formatDisplayDate(entry.date)}</p>
                <div className="inline-flex rounded-full border border-[#d4b294] bg-white/72 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-[#9a745d]">
                  {section.title}
                </div>
                <DirectoryButton onClick={() => goToPage(startPage)} />
              </div>
              <div className="paper-panel rounded-[2rem] p-6">
                <p className="whitespace-pre-wrap text-[15px] leading-8 text-[#5f493c]">
                  {entry.content}
                </p>
              </div>
            </div>
          ),
        });
      });
    } else {
      diaryPages.push({
        id: `entry-empty-${section.key}`,
        label: `${section.title} · 空白`,
        render: ({ goToPage }) => (
          <div className="flex min-h-[63vh] items-center justify-center">
            <div className="paper-panel max-w-2xl rounded-[2rem] px-8 py-10 text-center">
              <p className="text-[11px] uppercase tracking-[0.36em] text-[#ab8265]">Blank page</p>
              <h3 className="mt-4 text-3xl font-semibold text-[#422f25]">这一部分还没有内容</h3>
              <p className="mt-4 text-sm leading-7 text-[#73584a]">
                空白页也很好，它只是说明你们还没把这一段写下来。等准备好了，再把第一篇放进来。
              </p>
              <div className="mt-6">
                <DirectoryButton onClick={() => goToPage(startPage)} />
              </div>
            </div>
          </div>
        ),
      });
    }
  });

  const activeBook = activeExperience?.kind;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080606] text-white">
      <div className="stage-grain absolute inset-0 opacity-60" />
      <div className="theater-light absolute left-1/2 top-[-20%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,235,200,0.34)_0%,rgba(255,217,176,0.12)_32%,transparent_72%)] blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(0,0,0,0.72),transparent)]" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.82))]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-[#cdb8a4]">
              {data.settings.siteName}
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              {data.settings.homeTitle}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShelfTag>{data.settings.coupleName}</ShelfTag>
            <Link
              href="/admin"
              className="inline-flex items-center rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#f3e7db] transition hover:bg-white/14"
            >
              后台
            </Link>
            <ShelfTag>玩具车</ShelfTag>
            <ShelfTag>lmm</ShelfTag>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.88fr_1.12fr] lg:py-14">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.4em] text-[#cdb8a4]">A little archive</p>
            <h2 className="mt-4 text-5xl font-semibold leading-[1.02] text-white md:text-6xl">
              把回忆装订成书
              <br />
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#d7c7bc] md:text-lg">
              本站建于2026.06.01，是玩具车和lmm一起完成的儿童节礼物，承载的是我们最美好的回忆
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <StatSlip label="在一起" value={`${relationshipDaysCount} 天`} />
              <StatSlip
                label="她的生日"
                value={
                  lmmCountdown === null
                    ? formatMonthDay(data.settings.lmmBirthday)
                    : `${lmmCountdown} 天后`
                }
              />
              <StatSlip
                label="我的生日"
                value={
                  wjcCountdown === null
                    ? formatMonthDay(data.settings.wjcBirthday)
                    : `${wjcCountdown} 天后`
                }
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-6 bottom-6 h-9 rounded-full bg-[radial-gradient(circle,rgba(255,227,199,0.34),transparent_68%)] blur-xl" />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_1fr]">
              <ShelfBook
                title="照片集"
                subtitle="一睹女明星风光"
                tone="from-[#7f3f36] via-[#5a2d2c] to-[#2b1d1f]"
                tilt="-rotate-[3deg]"
                spine="album"
                onClick={() => setActiveExperience({ kind: "album", key: Date.now() })}
              />
              <ShelfBook
                title="旅行日志"
                subtitle="一起走遍世界每个角落"
                tone="from-[#c49368] via-[#8f6047] to-[#3d291f]"
                tilt="rotate-[2deg]"
                spine="atlas"
                onClick={() => setActiveExperience({ kind: "travel", key: Date.now() })}
              />
              <ShelfBook
                title="日记本"
                subtitle="记录我们的甜蜜瞬间"
                tone="from-[#d7b69b] via-[#9f755d] to-[#473129]"
                tilt="rotate-[-2deg]"
                spine="diary"
                onClick={() => setActiveExperience({ kind: "diary", key: Date.now() })}
              />
              <RadioShelf
                stationLabel={defaultStation?.label ?? "默认歌单"}
                onClick={() => setActiveExperience({ kind: "radio", key: Date.now() })}
              />
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-4 pb-4 pt-2 text-sm text-[#d7c7bc] md:flex-row md:items-end md:justify-between">
          <p className="max-w-2xl leading-7 text-[#bfaea1]">
            音乐住在小收音机里
          </p>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.28em] text-[#9a8677]">
            <span>{formatMonthDay(data.settings.lmmBirthday)}</span>
            <span>{formatMonthDay(data.settings.wjcBirthday)}</span>
            <span>{formatDisplayDate(data.settings.relationshipStart)}</span>
          </div>
        </footer>
      </div>

      {activeBook === "album" ? (
        <BookViewer
          key={activeExperience?.key}
          title="照片集"
          subtitle="满满照片墙"
          accent="Photo anthology"
          pages={photoPages}
          onClose={() => setActiveExperience(null)}
        />
      ) : null}

      {activeBook === "travel" ? (
        <BookViewer
          key={activeExperience?.key}
          title="旅行日志"
          subtitle="先看地图，再翻到那一站"
          accent="Travel log"
          pages={travelPages}
          onClose={() => setActiveExperience(null)}
        />
      ) : null}

      {activeBook === "diary" ? (
        <BookViewer
          key={activeExperience?.key}
          title="日记本"
          subtitle="记录美好生活"
          accent="Diary"
          pages={diaryPages}
          onClose={() => setActiveExperience(null)}
        />
      ) : null}

      {activeBook === "radio" ? (
        <RadioViewer
          key={activeExperience?.key}
          initialStation={defaultStation}
          onClose={() => setActiveExperience(null)}
        />
      ) : null}
    </main>
  );
}
