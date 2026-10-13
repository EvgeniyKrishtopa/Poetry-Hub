import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import { AuthStatus, isSignedIn } from "@/features/auth";
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

/** Awaits the session check and passes a plain value down (design D3). */
async function HeaderSession() {
  return <AuthStatus signedIn={await isSignedIn()} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          {/* implements FR-1, FR-2, FR-3 of remove-browser-session-read: the session part is read
              on the server inside the Suspense boundary; the site link and the page stay in the
              static shell. The fallback keeps the header's width and shows neither link. */}
          <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold">
              {siteConfig.name}
            </Link>
            <Suspense fallback={<div aria-hidden="true" className="min-w-24" />}>
              <HeaderSession />
            </Suspense>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
