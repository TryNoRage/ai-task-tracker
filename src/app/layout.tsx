import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Задачі — AI таск-трекер",
  description:
    "Особистий таск-трекер, де задачі додаються природньою мовою. AI сам розбирає назву, дедлайн та пріоритет.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="uk"
        suppressHydrationWarning
        className={`${manrope.variable} h-full antialiased`}
      >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
