import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, PencilLine, ShieldAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const nameSchema = z.string().trim().min(1, "Name is required").max(100);
const passwordSchema = z.string().min(8, "Min 8 characters").max(72);

function ProfilePage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      const [{ data: profile }, { data: authData }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.auth.getUser(),
      ]);

      const authEmail = authData.user?.email ?? user.email ?? "";
      setFullName(profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? authEmail.split("@")[0]);
      setEmail(authEmail);
      setLoaded(true);
    }

    loadProfile();
  }, [user]);

  const passwordSummary = useMemo(
    () => "Passwords are never shown for security. Use the field below to set a new password.",
    [],
  );

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const nameCheck = nameSchema.safeParse(fullName);
    if (!nameCheck.success) return toast.error(nameCheck.error.issues[0].message);

    const emailCheck = emailSchema.safeParse(email);
    if (!emailCheck.success) return toast.error(emailCheck.error.issues[0].message);

    const passwordCheck = newPassword ? passwordSchema.safeParse(newPassword) : null;
    if (passwordCheck && !passwordCheck.success) return toast.error(passwordCheck.error.issues[0].message);

    setSaving(true);
    try {
      const errors: string[] = [];

      const profileUpdate = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
      if (profileUpdate.error) errors.push(profileUpdate.error.message);

      const metadataUpdate = await supabase.auth.updateUser({ data: { full_name: fullName } });
      if (metadataUpdate.error) errors.push(metadataUpdate.error.message);

      if (email !== user.email) {
        const emailUpdate = await supabase.auth.updateUser({ email });
        if (emailUpdate.error) errors.push(emailUpdate.error.message);
      }

      if (newPassword) {
        const passwordUpdate = await supabase.auth.updateUser({ password: newPassword });
        if (passwordUpdate.error) errors.push(passwordUpdate.error.message);
      }

      if (errors.length > 0) {
        throw new Error(errors[0]);
      }

      setNewPassword("");
      toast.success(
        email !== user.email
          ? "Profile updated. Check your inbox to confirm the email change if prompted."
          : "Profile updated.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || !loaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Button asChild variant="ghost" className="gap-2 px-0 text-sm sm:text-base">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4" /> Profile settings
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold sm:text-3xl">Your profile</h1>
          <p className="mt-2 text-muted-foreground">Edit your account details or update your password.</p>
        </div>

        <form onSubmit={saveProfile} className="mt-8 space-y-6">
          <Card className="p-6">
            <div className="mb-6 flex items-center gap-2">
              <PencilLine className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Account information</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {passwordSummary} If you update your email, Supabase may ask you to confirm the
                  change by email.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-6 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Password</h2>
            </div>

            <div className="mb-4 flex flex-col items-start justify-between gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium">Current password</p>
                <p className="text-sm text-muted-foreground">••••••••</p>
              </div>
              <Button type="button" variant="outline" onClick={() => newPasswordRef.current?.focus()}>
                Edit
              </Button>
            </div>

            <div className="max-w-lg space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                ref={newPasswordRef}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter a new password"
              />
              <p className="text-xs text-muted-foreground">
                Leave this empty if you do not want to change your password.
              </p>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving} className="gradient-medical text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}