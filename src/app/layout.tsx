import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nox Nexus",
  description: "Graph debugger for Nox protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[var(--color-void)] text-[var(--color-text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
