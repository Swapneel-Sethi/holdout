import Link from "next/link";
import { Logo } from "./site-nav";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 text-ink">
            <Logo size={18} />
            <span className="text-[14px] font-semibold tracking-tight">Holdout</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-faint">
            Dataset integrity audit. Built by Swapneel Sethi.
          </p>
        </div>
        <div className="flex gap-12 text-[12px]">
          <div className="space-y-2">
            <p className="label">Product</p>
            <Link href="/workspace" className="block text-muted hover:text-ink">
              Workspace
            </Link>
            <Link href="/benchmark" className="block text-muted hover:text-ink">
              Benchmark
            </Link>
            <Link href="/method" className="block text-muted hover:text-ink">
              Method
            </Link>
          </div>
          <div className="space-y-2">
            <p className="label">Project</p>
            <a
              href="https://github.com/Swapneel-Sethi/holdout"
              target="_blank"
              rel="noreferrer"
              className="block text-muted hover:text-ink"
            >
              Repository
            </a>
            <a
              href="https://github.com/Swapneel-Sethi/holdout/blob/main/docs/evaluation.md"
              target="_blank"
              rel="noreferrer"
              className="block text-muted hover:text-ink"
            >
              Evaluation notes
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-faint sm:px-6">
          <p>Audits run in the browser. Files are not uploaded.</p>
          <p className="mono">engine 1.4.0</p>
        </div>
      </div>
    </footer>
  );
}
