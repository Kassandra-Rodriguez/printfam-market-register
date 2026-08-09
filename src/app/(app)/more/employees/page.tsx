import { redirect } from "next/navigation";
import { getCurrentBusinessContext } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { InviteEmployeeDialog } from "@/components/employees/invite-employee-dialog";
import { EmployeeList, type MemberRow, type InvitationRow } from "@/components/employees/employee-list";

export default async function EmployeesPage() {
  const context = await getCurrentBusinessContext();
  if (!context) redirect("/create-business");
  if (context.membership.role !== "owner") redirect("/more");

  const supabase = await createClient();

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("business_members")
      .select("id, role, status, joined_at, profiles(full_name, email)")
      .eq("business_id", context.business.id)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
    supabase
      .from("business_invitations")
      .select("id, email, status, expires_at")
      .eq("business_id", context.business.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const memberRows: MemberRow[] = (members ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
      full_name: profile?.full_name ?? "",
      email: profile?.email ?? "",
    };
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-4 md:py-6">
      <PageHeader
        title="Employees"
        backHref="/more"
        action={
          <InviteEmployeeDialog businessId={context.business.id} businessName={context.business.name} />
        }
      />
      <EmployeeList
        businessId={context.business.id}
        businessName={context.business.name}
        members={memberRows}
        invitations={(invitations ?? []) as InvitationRow[]}
      />
    </div>
  );
}
