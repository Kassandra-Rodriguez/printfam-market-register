"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { login } from "@/lib/actions/auth";
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
import { Loader2 } from "lucide-react";

export function LoginForm({
  defaultEmail,
  lockEmail,
  redirectTo = "/home",
  onSignedIn,
}: {
  defaultEmail?: string;
  lockEmail?: boolean;
  redirectTo?: string;
  onSignedIn?: () => void;
}) {
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: defaultEmail ?? "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    const result = await login(values);
    if (result.error) {
      form.setError("root", { message: result.error });
      return;
    }
    if (onSignedIn) {
      onSignedIn();
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
              </div>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
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
          Log in
        </Button>
      </form>
    </Form>
  );
}
