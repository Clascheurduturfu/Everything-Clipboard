import type { Metadata } from "next";

/**
 * Per-page metadata. Next replaces a parent's `openGraph` / `twitter` objects
 * wholesale when a page sets its own, so every page that overrides the title
 * has to carry the full social card itself. The image routes are the
 * file-based opengraph-image.png and twitter-image.png in /app.
 */
export function pageMetadata({
  title,
  description,
  path,
  indexable = true,
}: {
  title: string;
  description: string;
  path: string;
  indexable?: boolean;
}): Metadata {
  const fullTitle = `${title} | Everything Clipboard`;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      type: "website",
      siteName: "Everything Clipboard",
      url: path,
      title: fullTitle,
      description,
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/twitter-image.png"],
    },
  };
}
