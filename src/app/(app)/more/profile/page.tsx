import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/profile-form";
import { PageHeader } from "@/components/shared/page-header";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader title="Profile settings" backHref="/more" />
      <ProfileForm
        userId={user.id}
        fullName={profile?.full_name ?? ""}
        email={profile?.email ?? user.email ?? ""}
        phone={profile?.phone ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  );
}
