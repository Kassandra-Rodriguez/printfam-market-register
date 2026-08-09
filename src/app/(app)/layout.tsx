import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { BusinessProvider } from "@/components/providers/business-provider";
import { BottomNav } from "@/components/nav/bottom-nav";
import { SideNav } from "@/components/nav/side-nav";
import { TopBar } from "@/components/nav/top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", context.userId)
    .single();

  return (
    <BusinessProvider
      value={{
        userId: context.userId,
        business: context.business,
        membership: context.membership,
        settings: context.settings,
      }}
    >
      <div className="flex min-h-svh flex-col md:pl-60">
        <SideNav />
        <TopBar fullName={profile?.full_name || context.business.email} />
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
        <BottomNav />
      </div>
    </BusinessProvider>
  );
}
