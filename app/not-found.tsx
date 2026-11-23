import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-[640px] flex-col justify-center px-4 py-20 sm:px-6">
      <p className="label">404</p>
      <h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.03em]">
        This route has no evidence behind it.
      </h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        The page you asked for does not exist. The workspace and the benchmark do.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/workspace" className="btn btn-primary focus-ring">
          Open the workspace
        </Link>
        <Link href="/" className="btn btn-ghost focus-ring">
          Back to the start
        </Link>
      </div>
    </div>
  );
}
