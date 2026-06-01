"use client";

import { useMemo, useRef, useState } from "react";
import china from "@svg-maps/china";
import {
  PROVINCES,
  getProvinceName,
  type ProvinceId,
} from "@/lib/provinces";
import type { LocationItem } from "@/lib/site-data";

type SvgProvince = {
  id: string;
  name: string;
  path: string;
};

type TooltipState = {
  provinceId: ProvinceId;
  x: number;
  y: number;
};

export function ChinaJourneyMap({ locations }: { locations: LocationItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeProvince, setActiveProvince] = useState<ProvinceId | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const locationsByProvince = useMemo(() => {
    const map = new Map<ProvinceId, LocationItem[]>();

    for (const location of locations) {
      if (!location.provinceId) continue;
      const list = map.get(location.provinceId) ?? [];
      list.push(location);
      map.set(location.provinceId, list);
    }

    return map;
  }, [locations]);

  const svgProvinces = china.locations as SvgProvince[];

  const highlightedProvinces = useMemo(
    () =>
      PROVINCES.filter((province) => locationsByProvince.has(province.id)).map(
        (province) => province.id,
      ),
    [locationsByProvince],
  );

  const displayedProvince = activeProvince ?? highlightedProvinces[0] ?? null;
  const displayedVisits = displayedProvince
    ? locationsByProvince.get(displayedProvince) ?? []
    : [];

  function updateTooltip(
    provinceId: ProvinceId,
    event:
      | React.MouseEvent<SVGPathElement>
      | React.FocusEvent<SVGPathElement>
      | React.KeyboardEvent<SVGPathElement>,
  ) {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) {
      setTooltip(null);
      return;
    }

    const x =
      "clientX" in event ? event.clientX - bounds.left : bounds.width * 0.5;
    const y =
      "clientY" in event ? event.clientY - bounds.top : bounds.height * 0.3;

    setTooltip({ provinceId, x, y });
    setActiveProvince(provinceId);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[2rem] border border-[#ead8cb] bg-[linear-gradient(180deg,#fffaf7_0%,#f8ede4_100%)] p-5"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(201,165,143,0.18),transparent_30%),radial-gradient(circle_at_75%_65%,rgba(229,187,196,0.18),transparent_30%)]" />
        <div className="relative rounded-[1.6rem] border border-white/70 bg-white/72 p-4 shadow-[0_18px_50px_rgba(150,104,82,0.08)]">
          <svg
            viewBox={china.viewBox}
            className="h-auto w-full"
            role="img"
            aria-label="中国地图，已去过的省份会高亮显示"
          >
            {svgProvinces.map((location) => {
              const provinceId = location.id as ProvinceId;
              const visited = locationsByProvince.has(provinceId);
              const active = provinceId === activeProvince;
              const visitCount = locationsByProvince.get(provinceId)?.length ?? 0;

              return (
                <path
                  key={provinceId}
                  d={location.path}
                  tabIndex={0}
                  role="button"
                  aria-label={`${getProvinceName(provinceId)}，${visited ? `已记录 ${visitCount} 次` : "暂未记录"}`}
                  fill={
                    active
                      ? "#b86858"
                      : visited
                        ? "#d99684"
                        : "#f8ede4"
                  }
                  stroke={active ? "#8f4f42" : "#d3b7a7"}
                  strokeWidth={active ? 2.2 : 1.4}
                  className="cursor-pointer transition-all duration-200 focus:outline-none"
                  onMouseEnter={(event) => updateTooltip(provinceId, event)}
                  onMouseMove={(event) => updateTooltip(provinceId, event)}
                  onMouseLeave={() => setTooltip(null)}
                  onFocus={(event) => updateTooltip(provinceId, event)}
                  onBlur={() => setTooltip(null)}
                  onClick={() => setActiveProvince(provinceId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      updateTooltip(provinceId, event);
                    }
                  }}
                >
                  <title>
                    {getProvinceName(provinceId)}
                    {visited ? ` · 已记录 ${visitCount} 次` : " · 暂未记录"}
                  </title>
                </path>
              );
            })}
          </svg>

          {tooltip ? (
            <div
              className="pointer-events-none absolute z-10 rounded-2xl border border-white/80 bg-[#5f4339]/92 px-4 py-3 text-white shadow-xl"
              style={{
                left: `min(${Math.max(tooltip.x + 14, 16)}px, calc(100% - 180px))`,
                top: `max(${tooltip.y - 18}px, 16px)`,
              }}
            >
              <p className="text-sm font-semibold">{getProvinceName(tooltip.provinceId)}</p>
              <p className="mt-1 text-xs text-white/75">
                {locationsByProvince.has(tooltip.provinceId)
                  ? `已记录 ${locationsByProvince.get(tooltip.provinceId)?.length ?? 0} 次旅行`
                  : "还没有点亮这片回忆"}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#8b6b60]">
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">鼠标悬停查看省份</span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">去过的省份会加深显示</span>
          <span className="rounded-full bg-white/80 px-3 py-1 shadow">点击省份可固定查看</span>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="soft-card rounded-[1.6rem] px-5 py-4">
          <p className="text-xs uppercase tracking-[0.28em] text-[#b88f7b]">Map insight</p>
          <h3 className="mt-2 text-2xl font-semibold text-[#4f403b]">
            {displayedProvince ? getProvinceName(displayedProvince) : "等待点亮第一段旅程"}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#756056]">
            {displayedProvince
              ? displayedVisits.length
                ? `这里已经留下 ${displayedVisits.length} 次记录，下面可以看到对应的城市和时间。`
                : "这个省份目前还没有旅行记录，等你们之后去把它点亮。"
              : "地图会根据你们录入的地点自动高亮对应省份。"}
          </p>
        </div>

        {displayedVisits.length ? (
          displayedVisits.map((visit) => (
            <article key={visit.id} className="soft-card rounded-[1.6rem] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.28em] text-[#b88f7b]">
                {visit.date} · {visit.author}
              </p>
              <h4 className="mt-2 text-xl font-semibold text-[#4f403b]">{visit.city}</h4>
              <p className="mt-3 text-sm leading-7 text-[#756056]">{visit.note}</p>
            </article>
          ))
        ) : (
          <div className="soft-card rounded-[1.6rem] px-5 py-8 text-sm text-[#8a6f62]">
            暂时还没有这个省份的旅行内容。
          </div>
        )}
      </div>
    </div>
  );
}
