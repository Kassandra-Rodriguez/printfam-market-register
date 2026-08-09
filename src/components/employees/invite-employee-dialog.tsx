"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  inviteEmployeeSchema,
  type InviteEmployeeValues,
} from "@/lib/validations/business";
import { inviteEmployee } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ShareInviteLink } from "@/components/employees/share-invite-link";
import { Loader2, UserPlus } from "lucide-react";

export function InviteEmployeeDialog({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [link, setLink] = React.useState<string | null>(null);

  const form = useForm<InviteEmployeeValues>({
    resolver: zodResolver(inviteEmployeeSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: InviteEmployeeValues) {
    const result = await inviteEmployee(businessId, values);
    if (result.error) {
      form.setError("root", { message: result.error });
      return;
    }
    setLink(result.link ?? null);
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setLink(null);
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlus /> Invite
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite an employee</DialogTitle>
          <DialogDescription>
            They&apos;ll be able to record sales and view inventory once they join.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="flex flex-col gap-3">
            <ShareInviteLink link={link} businessName={businessName} />
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="employee@example.com" className="h-11" {...field} />
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
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Send invite
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
