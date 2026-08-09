"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket } from "lucide-react";

function extractToken(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/join\/([a-zA-Z0-9]+)/);
  return match ? match[1] : trimmed;
}

export default function JoinLandingPage() {
  const router = useRouter();
  const [value, setValue] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = extractToken(value);
    if (token) router.push(`/join/${token}`);
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Ticket className="size-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Have an invite?</h1>
          <p className="text-sm text-muted-foreground">
            Paste the invite link or code your business owner sent you.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="invite">Invite link or code</Label>
          <Input
            id="invite"
            className="h-11"
            placeholder="https://.../join/..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="h-11" disabled={!value.trim()}>
          Continue
        </Button>
      </form>
    </div>
  );
}
