"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

const links = [
  { href: "/workspace", label: "Workspace" },
  { href: "/benchmark", label: "Benchmark" },
  { href: "/method", label: "Method" },
];

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="2.5" y="4" width="19" height="16" rx="4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      <circle cx="7.4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="16.6" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="focus-ring flex items-center gap-2 rounded-md pr-2 text-ink">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Holdout</span>
          <span className="ml-1 hidden rounded border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-faint sm:inline">
            beta
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                  active ? "bg-raised text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://github.com/Swapneel-Sethi/holdout"
            target="_blank"
            rel="noreferrer"
            aria-label="Holdout on GitHub"
            className="focus-ring hidden rounded-md p-2 text-muted transition-colors hover:text-ink sm:block"
          >
            <GithubMark />
          </a>
          <Link href="/workspace" className="btn btn-primary focus-ring h-8 px-3 text-[12px]">
            Open workspace
          </Link>
        </div>
      </div>
    </header>
  );
}
