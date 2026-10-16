import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { HeaderAuthLinks } from "@/features/auth";
import { AuthorsNavLink } from "@/features/authors";
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
          {/* Below 600 px the wordmark takes the first row and the nav a right-aligned second one. */}
          <header className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-6 py-4 min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between">
            <Link href="/" className="text-lg font-semibold">
              {siteConfig.name}
            </Link>
            <nav className="flex items-center justify-end gap-4">
              <AuthorsNavLink />
              <HeaderAuthLinks />
            </nav>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
