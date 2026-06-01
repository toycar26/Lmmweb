import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const displayFont = Noto_Serif_SC({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "L & W 的恋爱书架",
  description: "把照片、旅行、日记和音乐装进一本本会翻页的书里。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#080606] text-[#f2e7dc]">
        {children}
      </body>
    </html>
  );
}
