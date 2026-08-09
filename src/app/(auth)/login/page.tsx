import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to your business.</p>
      </div>
      <LoginForm redirectTo={next || "/home"} />
      <div className="flex flex-col items-center gap-2 text-sm">
        <Link href="/forgot-password" className="text-muted-foreground underline underline-offset-4">
          Forgot your password?
        </Link>
        <p className="text-muted-foreground">
          New here?{" "}
          <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
