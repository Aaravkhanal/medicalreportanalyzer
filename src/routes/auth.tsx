import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Min 8 characters").max(72);

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const ep = emailSchema.safeParse(email);
    if (!ep.success) return toast.error(ep.error.issues[0].message);
    const pp = passwordSchema.safeParse(password);
    if (!pp.success) return toast.error(pp.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    nav({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const ep = emailSchema.safeParse(email);
    if (!ep.success) return toast.error(ep.error.issues[0].message);
    const pp = passwordSchema.safeParse(password);
    if (!pp.success) return toast.error(pp.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm your account.");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-6 sm:py-10">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="mb-4 flex justify-start sm:mb-6">
          <Button asChild variant="ghost" className="gap-2 px-0 text-sm text-muted-foreground hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
          </Button>
        </div>
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg gradient-medical">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold">
            MedExplain<span className="text-accent">.AI</span>
          </span>
        </Link>
        <Card className="glass p-5 sm:p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 text-sm sm:text-base">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-4">
              <form onSubmit={signIn} className="space-y-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full gradient-medical text-white"
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={signUp} className="space-y-3">
                <div>
                  <Label>Full name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full gradient-medical text-white"
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree this tool is informational only, not medical advice.
        </p>
      </div>
    </div>
  );
}
