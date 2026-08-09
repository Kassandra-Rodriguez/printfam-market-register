"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  updateProfileSchema,
  type UpdateProfileValues,
} from "@/lib/validations/settings";
import { updateProfile } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

export function ProfileForm({
  userId,
  fullName,
  email,
  phone,
  avatarUrl,
}: {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}) {
  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName, phone: phone ?? "", avatarUrl },
  });

  async function onSubmit(values: UpdateProfileValues) {
    const result = await updateProfile(values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Profile updated");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Photo</FormLabel>
              <FormControl>
                <ImageUpload
                  bucket="avatars"
                  folder={userId}
                  shape="circle"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Email</FormLabel>
          <Input value={email} disabled className="h-11" />
        </FormItem>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (optional)</FormLabel>
              <FormControl>
                <Input type="tel" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="h-11 mt-1" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </form>
    </Form>
  );
}
