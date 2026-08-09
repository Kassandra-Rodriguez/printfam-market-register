import { createClient } from "@/lib/supabase/server";
import { getInvitationPreview } from "@/lib/actions/business";
import {
  JoinInvitationView,
  InvitationHeader,
} from "@/components/onboarding/join-invitation-view";
import { AlertTriangle } from "lucide-react";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getInvitationPreview(token);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!preview || preview.status !== "pending" || new Date(preview.expires_at) < new Date()) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-sm flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertTriangle className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">This invitation isn&apos;t valid</h1>
        <p className="text-sm text-muted-foreground">
          It may have expired or already been used. Ask the business owner to send a
          new invite.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-4 py-10">
      <InvitationHeader businessName={preview.business_name} />
      <JoinInvitationView token={token} preview={preview} currentUserEmail={user?.email ?? null} />
    </div>
  );
}
