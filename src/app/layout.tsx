import type { Metadata, Viewport } from "next";
import { Comic_Neue, Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Loaded so "Comic Neue" works as a fallback wherever steps ask for Comic Sans
// (it isn't installed on Linux).
const comic = Comic_Neue({
  variable: "--font-comic",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const pixel = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  // WCAG 2.4.2 fail: meaningless title, like an unsaved Flash file.
  title: "Untitled-1",
  description: "Get to the hospital. Eventually.",
};

// WCAG 1.4.4 fail: pinch-zoom disabled.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${pixel.variable} ${comic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
