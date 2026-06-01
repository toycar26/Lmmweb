"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Slide = {
  id: string;
  src: string;
  alt: string;
  caption: string;
};

export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-[2rem] border border-white/60 bg-white/50 text-sm text-[#8b6f62] shadow-[0_18px_80px_rgba(158,117,98,0.14)]">
        暂时还没有轮播图
      </div>
    );
  }

  return (
    <div className="glass-card relative overflow-hidden rounded-[2rem] p-3">
      <div className="relative min-h-[420px] overflow-hidden rounded-[1.6rem]">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-700 ease-out ${
              slideIndex === index ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={slideIndex === 0}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(80,50,42,0.08)_40%,rgba(66,45,39,0.48)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.28em] text-white/70">Love archive</p>
              <p className="mt-2 text-lg font-medium">{slide.caption}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between px-2">
        <div className="flex gap-2">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(slideIndex)}
              className={`h-2.5 rounded-full transition-all ${
                slideIndex === index ? "w-9 bg-[#c59d7a]" : "w-2.5 bg-[#ead6ca]"
              }`}
              aria-label={`切换到第 ${slideIndex + 1} 张`}
            />
          ))}
        </div>
        <span className="text-xs text-[#96786c]">
          {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
