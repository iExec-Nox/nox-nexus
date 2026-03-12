import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nox Nexus",
  description: "Handle Explorer for Nox Protocol",
  metadataBase: new URL("https://nox-nexus.vercel.app"),
  openGraph: {
    title: "Nox Nexus",
    description: "Handle Explorer for Nox Protocol",
    siteName: "Nox Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nox Nexus",
    description: "Handle Explorer for Nox Protocol",
  },
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
