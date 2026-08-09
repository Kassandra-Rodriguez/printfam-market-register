"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Share } from "lucide-react";
import { toast } from "sonner";

export function ShareInviteLink({ link, businessName }: { link: string; businessName: string }) {
  const [copied, setCopied] = React.useState(false);
  // Only rendered once a link exists (after a successful invite/resend), so
  // reading `navigator` directly here can't cause a server/client mismatch.
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleShare() {
    try {
      await navigator.share({
        title: `Join ${businessName}`,
        text: `You've been invited to join ${businessName} on Market Register. Tap the link to accept:`,
        url: link,
      });
    } catch {
      // User cancelled the share sheet, or the browser blocked it -- no error needed.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Share this link with them. It expires in 7 days.
      </p>
      <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm">{link}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast.success("Link copied");
          }}
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      </div>
      {canShare && (
        <Button type="button" variant="outline" className="h-11" onClick={handleShare}>
          <Share /> Share link
        </Button>
      )}
    </div>
  );
}
