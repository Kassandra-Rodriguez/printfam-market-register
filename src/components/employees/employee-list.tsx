"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeEmployee, revokeInvitation } from "@/lib/actions/settings";
import { inviteEmployee } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShareInviteLink } from "@/components/employees/share-invite-link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export type MemberRow = {
  id: string;
  role: string;
  status: string;
  joined_at: string;
  full_name: string;
  email: string;
};

export type InvitationRow = {
  id: string;
  email: string;
  status: string;
  expires_at: string;
};

export function EmployeeList({
  businessId,
  businessName,
  members,
  invitations,
}: {
  businessId: string;
  businessName: string;
  members: MemberRow[];
  invitations: InvitationRow[];
}) {
  const router = useRouter();
  const [resending, setResending] = React.useState<string | null>(null);
  const [resendLink, setResendLink] = React.useState<string | null>(null);

  async function handleRemove(memberId: string) {
    const result = await removeEmployee(memberId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Employee removed");
    router.refresh();
  }

  async function handleRevoke(invitationId: string) {
    const result = await revokeInvitation(invitationId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invitation revoked");
    router.refresh();
  }

  async function handleResend(email: string) {
    setResending(email);
    const result = await inviteEmployee(businessId, { email });
    setResending(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setResendLink(result.link ?? null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials(m.full_name)}
              </AvatarFallback>
            </Avatar>
            <Link href={`/more/employees/${m.id}/activity`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium underline-offset-4 hover:underline">
                {m.full_name || m.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </Link>
            <Badge variant="secondary" className="capitalize">
              {m.role}
            </Badge>
            {m.role !== "owner" && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" />
                  }
                >
                  Remove
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {m.full_name || m.email}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      They&apos;ll immediately lose access to this business. Their past
                      sales and adjustments stay on record.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRemove(m.id)}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No team members yet.
          </p>
        )}
      </div>

      {invitations.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Pending invites</h2>
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={resending === inv.email}
                  onClick={() => handleResend(inv.email)}
                >
                  {resending === inv.email && <Loader2 className="size-4 animate-spin" />}
                  Resend
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRevoke(inv.id)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!resendLink} onOpenChange={(open) => !open && setResendLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New invite link ready</DialogTitle>
            <DialogDescription>
              The old link for this invite no longer works, only this new one does.
            </DialogDescription>
          </DialogHeader>
          {resendLink && <ShareInviteLink link={resendLink} businessName={businessName} />}
          <DialogFooter>
            <Button type="button" onClick={() => setResendLink(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
