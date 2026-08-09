"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startEvent, reopenEvent } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { Play, Square, RotateCcw, Loader2 } from "lucide-react";
import type { EventStatus } from "@/types/database.types";

export function EventActions({
  eventId,
  status,
  canManage,
}: {
  eventId: string;
  status: EventStatus;
  canManage: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  if (!canManage) return null;

  async function handleStart() {
    setLoading(true);
    const result = await startEvent(eventId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Event started");
    router.refresh();
  }

  async function handleReopen() {
    setLoading(true);
    const result = await reopenEvent(eventId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Event reopened");
    router.refresh();
  }

  if (status === "upcoming") {
    return (
      <Button size="lg" className="h-11 w-full" onClick={handleStart} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Play />}
        Start event
      </Button>
    );
  }

  if (status === "active") {
    return (
      <Button
        render={<Link href={`/events/${eventId}/close`} />}
        size="lg"
        variant="outline"
        className="h-11 w-full"
      >
        <Square /> Close event
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      variant="outline"
      className="h-11 w-full"
      onClick={handleReopen}
      disabled={loading}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw />}
      Reopen event
    </Button>
  );
}
