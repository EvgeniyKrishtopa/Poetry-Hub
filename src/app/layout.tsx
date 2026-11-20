import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { AdminNavLink } from "@/features/admin";
import { HeaderAuthLinks } from "@/features/auth";
import { AuthorsNavLink } from "@/features/authors";
import { SiteFooter } from "@/features/site-footer";
import { CONTENT_LANG } from "@/shared/config/constants";
import { siteConfig } from "@/shared/config/site";
import { TITLE_TEMPLATE, getSiteUrl } from "@/shared/lib/seo";
import { HydrationMarker } from "@/shared/ui";

import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Only the base and the title template live here: a field set on the root is inherited by every page, the
// signed-in ones included, so each public page sets its own description, canonical and card (seo-metadata D2).
// A function, not an object, so the site address is read when the metadata is built, not at import (D10).
export function generateMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: siteConfig.name, template: TITLE_TEMPLATE },
  };
}

export default function RootLayout({ children, breadcrumbs }: LayoutProps<"/">) {
  return (
    <html
      lang={CONTENT_LANG}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <HydrationMarker />
        <Providers>
          {/* Below 600 px the wordmark takes the first row and the nav a right-aligned second one. */}
          <header className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-6 py-4 min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between">
            <Link href="/" className="text-lg font-semibold">
              {siteConfig.name}
            </Link>
            {/* An admin's three links don't fit one row below 600 px, so the session block wraps to its own row. */}
            <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
              <AuthorsNavLink />
              <HeaderAuthLinks adminLink={<AdminNavLink />} />
            </nav>
          </header>
          {breadcrumbs}
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
