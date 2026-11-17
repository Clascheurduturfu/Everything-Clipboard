import { ExternalLink } from "lucide-react";

/**
 * Store listings. A null URL renders a disabled "Coming soon" placeholder;
 * set the URL once the listing is public and the badge becomes a link.
 *
 * - Google Play: com.clipsync, closed testing until production access.
 * - Microsoft Store: product 9NM290667HZM, not submitted yet.
 */
export const STORE_LINKS: { name: string; caption: string; url: string | null }[] = [
  { name: "Google Play", caption: "Android", url: null },
  { name: "Microsoft Store", caption: "Windows 10 / 11", url: null },
];

export function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-3 ${className}`} aria-label="App stores">
      {STORE_LINKS.map(({ name, caption, url }) => {
        const body = (
          <>
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {url ? `Get it on · ${caption}` : `Coming soon · ${caption}`}
              </span>
              <span className="text-sm font-medium text-slate-950 dark:text-white">{name}</span>
            </span>
            {url && <ExternalLink className="h-4 w-4 text-slate-500" aria-hidden="true" />}
          </>
        );
        return (
          <li key={name}>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-inner focus-ring inline-flex items-center gap-3 px-4 py-2.5 transition-colors hover:border-blue-400 dark:hover:border-blue-500"
              >
                {body}
              </a>
            ) : (
              <span aria-disabled="true" className="card-inner inline-flex cursor-not-allowed items-center gap-3 px-4 py-2.5 opacity-60">
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
