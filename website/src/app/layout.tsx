import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PageBackground } from "@/components/PageBackground";
import { WebglBackground } from "@/components/WebglBackground";
import { GoogleOneTap } from "@/components/GoogleOneTap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Only used for code snippets on the account page.
  preload: false,
});

const description =
  "Copy on one device and paste on another. Encrypted text and image clipboard sync for Windows, macOS, Android and iOS. Use the hosted relay or run your own server. $3, paid once.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.everything-clipboard.com"),
  title: {
    default: "Everything Clipboard - clipboard sync for Windows, macOS, Android and iOS",
    template: "%s | Everything Clipboard",
  },
  description,
  applicationName: "Everything Clipboard",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Everything Clipboard",
    url: "/",
    title: "Everything Clipboard - clipboard sync for Windows, macOS, Android and iOS",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Everything Clipboard - clipboard sync for Windows, macOS, Android and iOS",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PageBackground />
          <WebglBackground />
          {children}
          <GoogleOneTap />
        </ThemeProvider>
      </body>
    </html>
  );
}
