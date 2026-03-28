import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VISLI — License Server",
  description: "License management for VISLI WordPress booking plugin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
