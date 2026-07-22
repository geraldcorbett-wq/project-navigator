import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Navigator",
  description: "A calm, human-first planning assistant."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
