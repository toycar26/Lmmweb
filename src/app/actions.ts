"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, getSession, isValidCredentials, setSession } from "@/lib/auth";
import { inferProvinceId } from "@/lib/provinces";
import {
  createSlugId,
  loadSiteData,
  saveUploadFile,
  updateSiteData,
  type Author,
} from "@/lib/site-data";

type FormState = {
  error?: string;
};

function requireAuthor(value: FormDataEntryValue | null): Author {
  return value === "wjc" || value === "lmm" || value === "共同" ? value : "共同";
}

function refreshSite() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function loginAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!isValidCredentials(username, password)) {
    return { error: "账号或密码不正确。" };
  }

  await setSession(username);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function updateSettingsAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  await updateSiteData(async (data) => ({
    ...data,
    settings: {
      ...data.settings,
      siteName: String(formData.get("siteName") ?? data.settings.siteName).trim(),
      homeTitle: String(formData.get("homeTitle") ?? data.settings.homeTitle).trim(),
      homeSubtitle: String(formData.get("homeSubtitle") ?? data.settings.homeSubtitle).trim(),
      coupleName: String(formData.get("coupleName") ?? data.settings.coupleName).trim(),
      relationshipStart: String(
        formData.get("relationshipStart") ?? data.settings.relationshipStart,
      ).trim(),
      wjcBirthday: String(formData.get("wjcBirthday") ?? data.settings.wjcBirthday).trim(),
      lmmBirthday: String(formData.get("lmmBirthday") ?? data.settings.lmmBirthday).trim(),
      musicUrl: String(formData.get("musicUrl") ?? data.settings.musicUrl).trim(),
    },
  }));

  refreshSite();
}

export async function addTimelineAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const date = String(formData.get("date") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const author = requireAuthor(formData.get("author"));

  if (!date || !title) return;

  await updateSiteData(async (data) => ({
    ...data,
    timeline: [
      {
        id: createSlugId("timeline", `${date}-${title}`),
        date,
        title,
        description,
        author,
      },
      ...data.timeline,
    ],
  }));

  refreshSite();
}

export async function deleteTimelineAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  await updateSiteData(async (data) => ({
    ...data,
    timeline: data.timeline.filter((item) => item.id !== id),
  }));

  refreshSite();
}

export async function addDiaryAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const date = String(formData.get("date") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const author = requireAuthor(formData.get("author"));

  if (!date || !title || !content) return;

  await updateSiteData(async (data) => ({
    ...data,
    diaries: [
      {
        id: createSlugId("diary", `${date}-${title}`),
        date,
        title,
        content,
        author,
      },
      ...data.diaries,
    ],
  }));

  refreshSite();
}

export async function deleteDiaryAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  await updateSiteData(async (data) => ({
    ...data,
    diaries: data.diaries.filter((item) => item.id !== id),
  }));

  refreshSite();
}

export async function addAlbumAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return;

  await updateSiteData(async (data) => ({
    ...data,
    albums: [
      {
        id: createSlugId("album", name),
        name,
        description,
        coverPhotoId: undefined,
        createdAt: new Date().toISOString(),
      },
      ...data.albums,
    ],
  }));

  refreshSite();
}

export async function deleteAlbumAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const id = String(formData.get("id") ?? "");

  await updateSiteData(async (data) => {
    const remaining = data.albums.filter((item) => item.id !== id);
    const fallbackAlbumId = remaining[0]?.id ?? data.albums[0]?.id ?? "default-album";

    return {
      ...data,
      albums: remaining.length
        ? remaining
        : [
            {
              id: fallbackAlbumId,
              name: "默认相册",
              description: "自动生成的默认相册。",
              createdAt: new Date().toISOString(),
            },
          ],
      photos: data.photos.map((photo) =>
        photo.albumId === id ? { ...photo, albumId: fallbackAlbumId } : photo,
      ),
    };
  });

  refreshSite();
}

export async function uploadPhotosAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const data = await loadSiteData();
  const albumId = String(formData.get("albumId") ?? "").trim() || data.albums[0]?.id;
  const author = requireAuthor(formData.get("author"));
  const caption = String(formData.get("caption") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const asFeatured = formData.get("asFeatured") === "on";
  const asCover = formData.get("asCover") === "on";
  const files = formData
    .getAll("photos")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (!files.length || !albumId) return;

  const saved = await Promise.all(files.map((file) => saveUploadFile(file)));

  await updateSiteData(async (site) => {
    const uploadedPhotos = saved.map((item, index) => {
      const id = item.fileName.replace(/\.[^.]+$/, "");

      return {
        id,
        fileName: item.fileName,
        src: item.src,
        albumId,
        uploadedAt: new Date().toISOString(),
        caption: caption || `新照片 ${index + 1}`,
        details,
        author,
        isFeatured: asFeatured,
        isCover: asCover && index === 0,
      };
    });

    const nextHeroIds = asFeatured
      ? Array.from(new Set([...site.settings.heroPhotoIds, ...uploadedPhotos.map((photo) => photo.id)]))
      : site.settings.heroPhotoIds;

    return {
      ...site,
      photos: [...uploadedPhotos, ...site.photos],
      settings: {
        ...site.settings,
        heroPhotoIds: nextHeroIds,
      },
      albums: site.albums.map((album) =>
        album.id === albumId && (asCover || !album.coverPhotoId)
          ? { ...album, coverPhotoId: uploadedPhotos[0]?.id ?? album.coverPhotoId }
          : album,
      ),
    };
  });

  refreshSite();
}

export async function setHeroPhotoAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const photoId = String(formData.get("id") ?? "");

  await updateSiteData(async (data) => {
    const exists = data.settings.heroPhotoIds.includes(photoId);

    return {
      ...data,
      settings: {
        ...data.settings,
        heroPhotoIds: exists
          ? data.settings.heroPhotoIds.filter((item) => item !== photoId)
          : [...data.settings.heroPhotoIds, photoId],
      },
      photos: data.photos.map((photo) =>
        photo.id === photoId ? { ...photo, isFeatured: !exists } : photo,
      ),
    };
  });

  refreshSite();
}

export async function removePhotoFromHeroAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const id = String(formData.get("id") ?? "");

  await updateSiteData(async (data) => ({
    ...data,
    settings: {
      ...data.settings,
      heroPhotoIds: data.settings.heroPhotoIds.filter((item) => item !== id),
    },
    photos: data.photos.map((photo) =>
      photo.id === id ? { ...photo, isFeatured: false } : photo,
    ),
  }));

  refreshSite();
}

export async function setAlbumCoverAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const albumId = String(formData.get("albumId") ?? "");
  const photoId = String(formData.get("photoId") ?? "");

  await updateSiteData(async (data) => ({
    ...data,
    albums: data.albums.map((album) =>
      album.id === albumId ? { ...album, coverPhotoId: photoId } : album,
    ),
    photos: data.photos.map((photo) =>
      photo.albumId === albumId ? { ...photo, isCover: photo.id === photoId } : photo,
    ),
  }));

  refreshSite();
}

export async function addLocationAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const city = String(formData.get("city") ?? "").trim();
  const provinceId = inferProvinceId(String(formData.get("provinceId") ?? "").trim());
  const date = String(formData.get("date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const author = requireAuthor(formData.get("author"));
  const photoIds = formData.getAll("photoIds").map(String).filter(Boolean);

  if (!city || !date || !provinceId) return;

  await updateSiteData(async (data) => ({
    ...data,
    locations: [
      {
        id: createSlugId("location", `${city}-${date}`),
        city,
        provinceId,
        date,
        note,
        photoIds,
        author,
      },
      ...data.locations,
    ],
  }));

  refreshSite();
}

export async function deleteLocationAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const id = String(formData.get("id") ?? "");
  await updateSiteData(async (data) => ({
    ...data,
    locations: data.locations.filter((item) => item.id !== id),
  }));

  refreshSite();
}

export async function deletePhotoAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const id = String(formData.get("id") ?? "");

  await updateSiteData(async (data) => ({
    ...data,
    photos: data.photos.filter((photo) => photo.id !== id),
    settings: {
      ...data.settings,
      heroPhotoIds: data.settings.heroPhotoIds.filter((item) => item !== id),
    },
    albums: data.albums.map((album) =>
      album.coverPhotoId === id ? { ...album, coverPhotoId: undefined } : album,
    ),
    locations: data.locations.map((location) => ({
      ...location,
      photoIds: location.photoIds.filter((photoId) => photoId !== id),
    })),
  }));

  refreshSite();
}
