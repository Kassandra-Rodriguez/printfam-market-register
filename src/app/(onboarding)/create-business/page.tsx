import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { CreateBusinessForm } from "@/components/onboarding/create-business-form";
import { Store } from "lucide-react";

export default async function CreateBusinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const context = await getCurrentBusinessContext();
  if (context) redirect("/home");

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Store className="size-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Set up your business</h1>
          <p className="text-sm text-muted-foreground">
            This takes about a minute. You can change anything later.
          </p>
        </div>
      </div>
      <CreateBusinessForm email={user.email ?? ""} />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Waiting for an invite from an employer instead?{" "}
        <Link href="/join" className="font-medium text-foreground underline underline-offset-4">
          Enter your invite link
        </Link>
      </p>
    </div>
  );
}
