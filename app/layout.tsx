import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Website Auditor 🚀",
  description: "Free AI-style website audit for hackathon demos",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
