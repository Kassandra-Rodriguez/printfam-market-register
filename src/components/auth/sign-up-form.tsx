"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpValues } from "@/lib/validations/auth";
import { signUp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, MailCheck } from "lucide-react";

export function SignUpForm({
  defaultEmail,
  lockEmail,
  onSignedUp,
}: {
  defaultEmail?: string;
  lockEmail?: boolean;
  onSignedUp?: () => void;
}) {
  const [submitted, setSubmitted] = React.useState(false);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: defaultEmail ?? "", password: "" },
  });

  async function onSubmit(values: SignUpValues) {
    const result = await signUp(values);
    if (result.error) {
      form.setError("root", { message: result.error });
      return;
    }
    setSubmitted(true);
    onSignedUp?.();
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center">
        <MailCheck className="size-8 text-primary" />
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to {form.getValues("email")}. Follow it to finish
          creating your account.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your name</FormLabel>
              <FormControl>
                <Input placeholder="Jamie Rivera" autoComplete="name" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-11"
                  disabled={lockEmail}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" size="lg" className="h-11 mt-1" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Create account
        </Button>
      </form>
    </Form>
  );
}
