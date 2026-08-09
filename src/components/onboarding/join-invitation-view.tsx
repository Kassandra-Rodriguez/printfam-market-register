"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { LoginForm } from "@/components/auth/login-form";
import { acceptInvitation } from "@/lib/actions/business";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Building2 } from "lucide-react";

type Preview = {
  business_id: string;
  business_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export function JoinInvitationView({
  token,
  preview,
  currentUserEmail,
}: {
  token: string;
  preview: Preview;
  currentUserEmail: string | null;
}) {
  const router = useRouter();
  const [authedEmail, setAuthedEmail] = React.useState(currentUserEmail);
  const [error, setError] = React.useState<string | null>(null);
  const [accepting, setAccepting] = React.useState(false);

  const emailMatches =
    authedEmail && authedEmail.toLowerCase() === preview.email.toLowerCase();

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    const result = await acceptInvitation(token);
    setAccepting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  async function refreshAuthState() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setAuthedEmail(user?.email ?? null);
  }

  if (authedEmail) {
    return (
      <div className="flex flex-col gap-4">
        {emailMatches ? (
          <>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{authedEmail}</span>.
            </p>
            <Button size="lg" className="h-11" onClick={handleAccept} disabled={accepting}>
              {accepting && <Loader2 className="size-4 animate-spin" />}
              Join {preview.business_name}
            </Button>
          </>
        ) : (
          <p className="text-sm text-destructive">
            This invitation was sent to {preview.email}, but you&apos;re signed in as{" "}
            {authedEmail}. Log out and sign in with the invited email to accept it.
          </p>
        )}
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <Tabs defaultValue="sign-up" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="sign-up" className="flex-1">
          Create account
        </TabsTrigger>
        <TabsTrigger value="login" className="flex-1">
          I have an account
        </TabsTrigger>
      </TabsList>
      <TabsContent value="sign-up" className="pt-4">
        <SignUpForm defaultEmail={preview.email} lockEmail />
        <p className="mt-3 text-center text-xs text-muted-foreground">
          After confirming your email, come back to this link to finish joining.
        </p>
      </TabsContent>
      <TabsContent value="login" className="pt-4">
        <LoginForm
          defaultEmail={preview.email}
          lockEmail
          onSignedIn={refreshAuthState}
        />
      </TabsContent>
    </Tabs>
  );
}

export function InvitationHeader({ businessName }: { businessName: string }) {
  return (
    <div className="mb-6 flex flex-col items-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Building2 className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Join {businessName}</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ve been invited to help run sales and inventory.
        </p>
      </div>
    </div>
  );
}
