import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* Birthday Quest typography */
const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-px-pixel",
  display: "swap",
});

const elegantFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-px-elegant",
  display: "swap",
});

const retroFont = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-px-retro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Birthday Quest — The Secret Gift",
  description:
    "A magical pixel-art birthday adventure made just for a beloved brother. Explore the enchanted night, play three wonders of the Astral Fair, and unwrap the secret gift.",
  keywords: ["birthday", "game", "pixel art", "adventure", "gift"],
  authors: [{ name: "With love" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Birthday Quest — The Secret Gift",
    description: "An adventure made just for you. Today is not an ordinary day...",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070a18",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} ${elegantFont.variable} ${retroFont.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
