import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { Activity, FileSearch, Sparkles, ShieldCheck, Upload, Brain, FileText } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-primary blur-3xl" />
          <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-20 sm:pb-24">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> AI-powered medical insights
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Understand your{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              medical reports
            </span>{" "}
            in plain English
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Upload lab reports, prescriptions or discharge summaries. MedExplain AI extracts the
            text and writes a clear, patient-friendly summary in seconds.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" className="gradient-medical text-white hover:opacity-90">
              <Link to="/dashboard">
                <Upload className="mr-2 h-4 w-4" /> Upload a report
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            {
              icon: FileSearch,
              t: "OCR extraction",
              d: "Reads scanned PDFs and images of lab reports, prescriptions and X-ray notes.",
            },
            {
              icon: Brain,
              t: "AI analysis",
              d: "Identifies key findings and explains them in language anyone can understand.",
            },
            {
              icon: Activity,
              t: "Abnormal value alerts",
              d: "Highlights values outside the reference range with severity.",
            },
            {
              icon: ShieldCheck,
              t: "Private & secure",
              d: "Reports are stored privately to your account only.",
            },
          ].map((f) => (
            <Card key={f.t} className="glass p-6">
              <f.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            { n: 1, icon: Upload, t: "Upload report", d: "Drag-drop a PDF, JPG or PNG." },
            { n: 2, icon: FileSearch, t: "OCR extracts text", d: "Runs locally in your browser." },
            { n: 3, icon: Brain, t: "AI summarizes", d: "Sections you can actually understand." },
            { n: 4, icon: FileText, t: "Read & download", d: "Export as PDF or text." },
          ].map((s) => (
            <div key={s.n} className="relative rounded-2xl border bg-card p-6">
              <div className="absolute -top-3 left-6 rounded-full gradient-medical px-3 py-0.5 text-xs font-semibold text-white">
                Step {s.n}
              </div>
              <s.icon className="mt-2 h-6 w-6 text-accent" />
              <h3 className="mt-3 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Button asChild size="lg" className="gradient-medical text-white hover:opacity-90">
            <Link to="/dashboard">Get started — it's free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        MedExplain AI · Informational only — not a substitute for professional medical advice.
      </footer>
    </div>
  );
}

function Nav() {
  const { user, signOut } = useAuth();
  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg gradient-medical">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            MedExplain<span className="text-accent">.AI</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
          {user ? (
            <Button variant="outline" onClick={signOut}>
              Sign out
            </Button>
          ) : (
            <Button asChild className="gradient-medical text-white hover:opacity-90">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
