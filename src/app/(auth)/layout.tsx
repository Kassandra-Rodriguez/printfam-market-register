import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex items-center justify-center py-8">
        <Link href="/welcome" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            M
          </span>
          <span className="text-lg font-semibold tracking-tight">Market Register</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-start px-4 pb-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
