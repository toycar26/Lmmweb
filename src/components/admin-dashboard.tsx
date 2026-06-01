import Image from "next/image";
import Link from "next/link";
import { PendingSubmit } from "@/components/pending-submit";
import {
  addAlbumAction,
  addDiaryAction,
  addLocationAction,
  addTimelineAction,
  deleteAlbumAction,
  deleteDiaryAction,
  deleteLocationAction,
  deletePhotoAction,
  deleteTimelineAction,
  logoutAction,
  removePhotoFromHeroAction,
  setAlbumCoverAction,
  setHeroPhotoAction,
  updateSettingsAction,
  uploadPhotosAction,
} from "@/app/actions";
import { PROVINCES, getProvinceName } from "@/lib/provinces";
import { formatDisplayDate, type SiteData } from "@/lib/site-data";

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-[1.8rem] px-5 py-5 md:px-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold text-[#4f403b]">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-[#7a6258]">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#7a6258]">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3 outline-none ring-0 placeholder:text-[#b59a8f] ${props.className ?? ""}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[140px] w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3 outline-none ring-0 placeholder:text-[#b59a8f] ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3 outline-none ring-0 ${props.className ?? ""}`}
    />
  );
}

function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-[#7f6255] px-4 py-3 text-sm text-white transition hover:bg-[#6d5349] disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function AdminDashboard({ data, username }: { data: SiteData; username: string }) {
  const heroPhotos = data.photos.filter((photo) => data.settings.heroPhotoIds.includes(photo.id));

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 page-grid opacity-35" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="glass-card flex flex-col gap-4 rounded-[2rem] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#b98d7b]">Admin panel</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#4d3e39]">后台管理台</h1>
            <p className="mt-2 text-sm text-[#7a6258]">当前登录账号：{username}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-[#d8b9a6] bg-white/75 px-4 py-2 text-sm text-[#73594e]"
            >
              返回首页
            </Link>
            <form action={logoutAction}>
              <Button type="submit" className="bg-[#a36f66] hover:bg-[#8b5b53]">
                退出登录
              </Button>
            </form>
          </div>
        </header>

        <Card
          title="基础信息"
          description="这里可以直接修改首页文案、纪念日和网易云歌单，不需要改任何配置文件。"
        >
          <form action={updateSettingsAction} className="grid gap-4 md:grid-cols-2">
            <Field label="网站名">
              <Input name="siteName" defaultValue={data.settings.siteName} />
            </Field>
            <Field label="情侣名">
              <Input name="coupleName" defaultValue={data.settings.coupleName} />
            </Field>
            <Field label="首页主标题">
              <Input name="homeTitle" defaultValue={data.settings.homeTitle} />
            </Field>
            <Field label="首页副标题">
              <Input name="homeSubtitle" defaultValue={data.settings.homeSubtitle} />
            </Field>
            <Field label="在一起日期">
              <Input
                type="date"
                name="relationshipStart"
                defaultValue={data.settings.relationshipStart}
              />
            </Field>
            <Field label="wjc 生日">
              <Input
                type="text"
                name="wjcBirthday"
                defaultValue={data.settings.wjcBirthday}
                placeholder="09-26"
              />
            </Field>
            <Field label="lmm 生日">
              <Input
                type="text"
                name="lmmBirthday"
                defaultValue={data.settings.lmmBirthday}
                placeholder="01-31"
              />
            </Field>
            <Field label="网易云歌单链接">
              <Input name="musicUrl" defaultValue={data.settings.musicUrl} />
            </Field>
            <div className="md:col-span-2">
              <Button type="submit">保存基础信息</Button>
            </div>
          </form>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title="新增内容"
            description="时间轴、日记、相册、照片和地点都可以直接在这里新增。"
          >
            <div className="grid gap-5">
              <form
                action={addTimelineAction}
                className="grid gap-4 rounded-[1.5rem] border border-white/70 bg-white/55 p-4"
              >
                <h3 className="text-lg font-semibold text-[#4f403b]">添加时间轴</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="日期">
                    <Input type="date" name="date" required />
                  </Field>
                  <Field label="作者">
                    <Select name="author" defaultValue="共同">
                      <option value="wjc">wjc</option>
                      <option value="lmm">lmm</option>
                      <option value="共同">共同</option>
                    </Select>
                  </Field>
                </div>
                <Field label="标题">
                  <Input name="title" required />
                </Field>
                <Field label="描述">
                  <Textarea name="description" />
                </Field>
                <Button type="submit">添加时间轴</Button>
              </form>

              <form
                action={addDiaryAction}
                className="grid gap-4 rounded-[1.5rem] border border-white/70 bg-white/55 p-4"
              >
                <h3 className="text-lg font-semibold text-[#4f403b]">添加日记</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="日期">
                    <Input type="date" name="date" required />
                  </Field>
                  <Field label="作者">
                    <Select name="author" defaultValue="共同">
                      <option value="wjc">wjc</option>
                      <option value="lmm">lmm</option>
                      <option value="共同">共同</option>
                    </Select>
                  </Field>
                </div>
                <Field label="标题">
                  <Input name="title" required />
                </Field>
                <Field label="内容">
                  <Textarea name="content" required />
                </Field>
                <PendingSubmit
                  idleLabel="添加日记"
                  pendingLabel="提交中..."
                  idleHint="点击后会自动保存到日记列表。"
                  pendingHint="正在保存日记，请不要重复点击。"
                />
              </form>

              <form
                action={addAlbumAction}
                className="grid gap-4 rounded-[1.5rem] border border-white/70 bg-white/55 p-4"
              >
                <h3 className="text-lg font-semibold text-[#4f403b]">创建相册</h3>
                <Field label="相册名">
                  <Input name="name" required />
                </Field>
                <Field label="简介">
                  <Textarea name="description" />
                </Field>
                <Button type="submit">创建相册</Button>
              </form>

              <form
                action={uploadPhotosAction}
                encType="multipart/form-data"
                className="grid gap-4 rounded-[1.5rem] border border-white/70 bg-white/55 p-4"
              >
                <h3 className="text-lg font-semibold text-[#4f403b]">上传照片</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="相册">
                    <Select name="albumId" defaultValue={data.albums[0]?.id}>
                      {data.albums.map((album) => (
                        <option key={album.id} value={album.id}>
                          {album.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="作者">
                    <Select name="author" defaultValue="共同">
                      <option value="wjc">wjc</option>
                      <option value="lmm">lmm</option>
                      <option value="共同">共同</option>
                    </Select>
                  </Field>
                </div>
                <Field label="图片说明">
                  <Input name="caption" placeholder="可不填" />
                </Field>
                <Field label="详细描述">
                  <Textarea name="details" placeholder="写给这张照片的补充说明" />
                </Field>
                <Field label="上传图片">
                  <Input type="file" name="photos" multiple accept="image/*" required />
                </Field>
                <div className="flex flex-wrap gap-4 text-sm text-[#6d5448]">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="asFeatured" />
                    加入首页轮播
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="asCover" />
                    首张设为封面
                  </label>
                </div>
                <PendingSubmit
                  idleLabel="上传照片"
                  pendingLabel="上传中..."
                  idleHint="选择图片后点击上传，完成后会自动刷新。"
                  pendingHint="图片正在上传，请耐心等待，不要重复点击。"
                />
              </form>

              <form
                action={addLocationAction}
                className="grid gap-4 rounded-[1.5rem] border border-white/70 bg-white/55 p-4"
              >
                <h3 className="text-lg font-semibold text-[#4f403b]">添加地点</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="城市">
                    <Input name="city" required />
                  </Field>
                  <Field label="省份">
                    <Select name="provinceId" required defaultValue="">
                      <option value="" disabled>
                        选择省份
                      </option>
                      {PROVINCES.map((province) => (
                        <option key={province.id} value={province.id}>
                          {province.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="日期">
                    <Input type="date" name="date" required />
                  </Field>
                  <Field label="作者">
                    <Select name="author" defaultValue="共同">
                      <option value="wjc">wjc</option>
                      <option value="lmm">lmm</option>
                      <option value="共同">共同</option>
                    </Select>
                  </Field>
                </div>
                <Field label="地点回忆">
                  <Textarea name="note" />
                </Field>
                <div className="rounded-2xl border border-white/70 bg-white/70 p-3">
                  <p className="mb-3 text-sm text-[#7a6258]">绑定图片</p>
                  <div className="grid max-h-80 grid-cols-2 gap-3 overflow-auto pr-1 md:grid-cols-3">
                    {data.photos.map((photo) => (
                      <label
                        key={photo.id}
                        className="group overflow-hidden rounded-2xl border border-[#ead8cd] bg-white"
                      >
                        <input type="checkbox" name="photoIds" value={photo.id} className="sr-only" />
                        <div className="relative aspect-square">
                          <Image src={photo.src} alt={photo.caption} fill className="object-cover" />
                        </div>
                        <div className="px-3 py-2 text-xs text-[#7a6258]">{photo.caption}</div>
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit">添加地点</Button>
              </form>
            </div>
          </Card>

          <Card
            title="首页轮播与照片管理"
            description="这里可以把照片加入或移出首页轮播，也能删除单张照片。"
          >
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {heroPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-[1.4rem] border border-white/70 bg-white/70"
                  >
                    <div className="relative aspect-[4/3]">
                      <Image src={photo.src} alt={photo.caption} fill className="object-cover" />
                    </div>
                    <div className="space-y-2 px-3 py-3">
                      <p className="text-sm text-[#5c4a44]">{photo.caption}</p>
                      <form action={removePhotoFromHeroAction}>
                        <input type="hidden" name="id" value={photo.id} />
                        <Button type="submit" className="w-full bg-[#ab746a] hover:bg-[#915e55]">
                          移出轮播
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-[1.4rem] border border-white/70 bg-white/70"
                  >
                    <div className="relative aspect-[4/3]">
                      <Image src={photo.src} alt={photo.caption} fill className="object-cover" />
                    </div>
                    <div className="space-y-2 px-3 py-3">
                      <p className="text-sm text-[#5c4a44]">{photo.caption}</p>
                      <p className="text-xs text-[#8b7063]">{photo.albumId}</p>
                      <div className="flex gap-2">
                        <form action={setHeroPhotoAction} className="flex-1">
                          <input type="hidden" name="id" value={photo.id} />
                          <Button type="submit" className="w-full bg-[#d0a184] hover:bg-[#bb8d70]">
                            {data.settings.heroPhotoIds.includes(photo.id) ? "取消轮播" : "加入轮播"}
                          </Button>
                        </form>
                        <form action={deletePhotoAction}>
                          <input type="hidden" name="id" value={photo.id} />
                          <Button type="submit" className="bg-[#8f6259] hover:bg-[#7a5048]">
                            删除
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title="相册管理"
            description="每个相册都可以设置封面图，继续扩展约会、旅游、个人照等分类。"
          >
            <div className="grid gap-4">
              {data.albums.map((album) => {
                const photos = data.photos.filter((photo) => photo.albumId === album.id);
                const cover =
                  data.photos.find((photo) => photo.id === album.coverPhotoId) ?? photos[0];

                return (
                  <div key={album.id} className="rounded-[1.6rem] border border-white/70 bg-white/60 p-4">
                    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                      <div className="relative min-h-[180px] overflow-hidden rounded-[1.2rem]">
                        {cover ? (
                          <Image src={cover.src} alt={album.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[#f5eae0] text-[#9b7b6b]">
                            暂无封面
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold text-[#4f403b]">{album.name}</h3>
                          <p className="mt-2 text-sm text-[#7a6258]">{album.description}</p>
                          <p className="mt-2 text-xs text-[#9a7e71]">共 {photos.length} 张</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {photos.slice(0, 4).map((photo) => (
                            <form key={photo.id} action={setAlbumCoverAction}>
                              <input type="hidden" name="albumId" value={album.id} />
                              <input type="hidden" name="photoId" value={photo.id} />
                              <Button type="submit" className="w-full bg-[#d0a184] hover:bg-[#bb8d70]">
                                设为封面 · {photo.caption}
                              </Button>
                            </form>
                          ))}
                        </div>
                        <form action={deleteAlbumAction}>
                          <input type="hidden" name="id" value={album.id} />
                          <Button type="submit" className="bg-[#8f6259] hover:bg-[#7a5048]">
                            删除相册
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-6">
            <Card
              title="时间轴管理"
              description="可以在这里补充相识、见面、旅行和生日等关键节点。"
            >
              <div className="grid gap-3">
                {data.timeline.map((item) => (
                  <div key={item.id} className="rounded-[1.4rem] border border-white/70 bg-white/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-[#b58c79]">
                          {formatDisplayDate(item.date)}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-[#4f403b]">{item.title}</h3>
                      </div>
                      <form action={deleteTimelineAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" className="bg-[#8f6259] hover:bg-[#7a5048]">
                          删除
                        </Button>
                      </form>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#756056]">{item.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title="日记管理"
              description="我的日记、她的日记、共同日记会在前台自动分组展示。"
            >
              <div className="grid gap-3">
                {data.diaries.map((entry) => (
                  <div key={entry.id} className="rounded-[1.4rem] border border-white/70 bg-white/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-[#b58c79]">
                          {formatDisplayDate(entry.date)} · {entry.author}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-[#4f403b]">{entry.title}</h3>
                      </div>
                      <form action={deleteDiaryAction}>
                        <input type="hidden" name="id" value={entry.id} />
                        <Button type="submit" className="bg-[#8f6259] hover:bg-[#7a5048]">
                          删除
                        </Button>
                      </form>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#756056]">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card
          title="旅行地点管理"
          description="现在地点是按省份管理的，前台地图会自动把去过的省份加深显示。"
        >
          <div className="grid gap-4">
            {data.locations.map((location) => (
              <div key={location.id} className="rounded-[1.6rem] border border-white/70 bg-white/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-[#b58c79]">
                      {formatDisplayDate(location.date)} · {getProvinceName(location.provinceId)}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-[#4f403b]">{location.city}</h3>
                  </div>
                  <form action={deleteLocationAction}>
                    <input type="hidden" name="id" value={location.id} />
                    <Button type="submit" className="bg-[#8f6259] hover:bg-[#7a5048]">
                      删除
                    </Button>
                  </form>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#756056]">{location.note}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {location.photoIds.map((photoId) => {
                    const photo = data.photos.find((item) => item.id === photoId);
                    return photo ? (
                      <span
                        key={photoId}
                        className="rounded-full bg-[#f3e1d6] px-3 py-1 text-xs text-[#7a6258]"
                      >
                        {photo.caption}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
