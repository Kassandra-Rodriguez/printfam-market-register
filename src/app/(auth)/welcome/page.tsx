import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ScanBarcode, Wallet } from "lucide-react";

export default function WelcomePage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="flex flex-col items-center gap-4 px-0 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="size-8" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Your market day, organized.
            </h1>
            <p className="text-muted-foreground text-balance">
              Track inventory and sales together, in real time, from every phone at
              your table.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center">
          <ScanBarcode className="size-5 text-primary" />
          Fast sales, no paper
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center">
          <Wallet className="size-5 text-primary" />
          Know your cash at a glance
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button
          render={<Link href="/sign-up" />}
          nativeButton={false}
          size="lg"
          className="h-12 text-base"
        >
          Get started
        </Button>
        <Button
          render={<Link href="/login" />}
          nativeButton={false}
          variant="outline"
          size="lg"
          className="h-12 text-base"
        >
          I already have an account
        </Button>
      </div>
    </div>
  );
}
