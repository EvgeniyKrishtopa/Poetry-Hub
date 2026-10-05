import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { AuthStatus } from "@/features/auth";
import { siteConfig } from "@/shared/config/site";

import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          {/* implements FR-7 of add-supabase-auth: inside Providers so AuthStatus has the query client.
              implements NFR-2 of add-supabase-auth: nothing here reads the session on the server,
              so `/` keeps its rendering mode. */}
          <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold">
              {siteConfig.name}
            </Link>
            <AuthStatus />
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
