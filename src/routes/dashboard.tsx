import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Upload,
  FileText,
  Loader2,
  Search,
  Trash2,
  ArrowRight,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { ACCEPTED_TYPES, MAX_BYTES, extractTextFromFile } from "@/lib/ocr";
import { summarizeReport } from "@/lib/summarize";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

type ReportRow = {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  summary: unknown;
};

function Dashboard() {
  const nav = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ msg: string; pct: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    // Guest access allowed
  }, [user, loading, nav]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("reports")
      .select("id, filename, status, created_at, summary")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setReports(data as ReportRow[]);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => reports.filter((r) => r.filename.toLowerCase().includes(search.toLowerCase())),
    [reports, search],
  );

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    for (const file of arr) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`Unsupported: ${file.name}`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} exceeds 20MB`);
        continue;
      }
      await processOne(file);
    }
  }

  async function processOne(file: File) {
    setBusy(true);
    setProgress({ msg: `Uploading ${file.name}`, pct: 5 });
    try {
      let reportId: string;
      let path = "";

      if (user) {
        path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const up = await supabase.storage
          .from("medical-reports")
          .upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;

        const ins = await supabase
          .from("reports")
          .insert({
            user_id: user.id,
            filename: file.name,
            file_path: path,
            mime_type: file.type,
            status: "ocr",
          })
          .select("id")
          .single();
        if (ins.error) throw ins.error;
        reportId = ins.data.id;
      } else {
        reportId = `guest_${Date.now()}`;
        path = URL.createObjectURL(file);
      }

      setProgress({ msg: "Extracting text…", pct: 15 });
      const text = await extractTextFromFile(file, (msg, ratio) => {
        setProgress({ msg, pct: 15 + Math.round(ratio * 60) });
      });
      if (!text || text.length < 20)
        throw new Error("Couldn't extract readable text from this file.");

      if (user) {
        await supabase
          .from("reports")
          .update({ extracted_text: text, status: "summarizing" })
          .eq("id", reportId);
      }

      setProgress({ msg: "Generating AI summary…", pct: 85 });
      const summaryData = await summarizeReport(text);

      if (user) {
        await supabase
          .from("reports")
          .update({ summary: summaryData, status: "done" })
          .eq("id", reportId);
      } else {
        const guestReport = {
          id: reportId,
          filename: file.name,
          created_at: new Date().toISOString(),
          file_path: path,
          mime_type: file.type,
          extracted_text: text,
          status: "done",
          summary: summaryData,
        };
        sessionStorage.setItem(`report_${reportId}`, JSON.stringify(guestReport));
      }

      setProgress({ msg: "Done", pct: 100 });
      toast.success(`Summarized ${file.name}`);
      await load();
      setTimeout(() => nav({ to: "/report/$id", params: { id: reportId } }), 400);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(null), 1500);
    }
  }

  async function del(id: string, path?: string) {
    if (!confirm("Delete this report?")) return;
    const r = await supabase.from("reports").select("file_path").eq("id", id).single();
    if (r.data?.file_path)
      await supabase.storage.from("medical-reports").remove([r.data.file_path]);
    await supabase.from("reports").delete().eq("id", id);
    toast.success("Deleted");
    load();
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 glass">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg gradient-medical">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">
              MedExplain<span className="text-accent">.AI</span>
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {user ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
                <Button asChild variant="ghost" size="icon" className="rounded-full">
                  <Link to="/profile" aria-label="Open profile settings">
                    <UserRound className="h-4 w-4" />
                  </Link>
                </Button>
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={signOut} className="px-3 sm:px-4">
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <ThemeToggle />
                <Button asChild variant="outline" size="sm" className="px-3 sm:px-4">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-3xl font-bold">Your reports</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a medical report and get an instant patient-friendly summary.
        </p>

        {/* Upload card */}
        <Card
          className={`mt-6 border-2 border-dashed p-10 text-center transition ${drag ? "border-primary bg-primary/5" : "border-primary/40"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full gradient-medical">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Drag & drop reports here</h3>
          <p className="mt-1 text-sm text-muted-foreground">PDF, JPG, PNG, TIFF · up to 20MB</p>
          <div className="mt-4">
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="gradient-medical text-white"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                </>
              ) : (
                "Choose files"
              )}
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              accept={ACCEPTED_TYPES.join(",")}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
          {progress && (
            <div className="mx-auto mt-6 max-w-md text-left">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.msg}</span>
                <span>{progress.pct}%</span>
              </div>
              <Progress value={progress.pct} className="mt-2" />
            </div>
          )}
        </Card>

        {/* Search + list */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Recent reports</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename"
              className="pl-8"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="mt-4 p-10 text-center text-muted-foreground">
            No reports yet. Upload one above to get started.
          </Card>
        ) : (
          <div className="mt-4 grid gap-3">
            {filtered.map((r) => (
              <Card
                key={r.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} ·{" "}
                      {r.status === "done" ? "Ready" : `Processing (${r.status})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/report/$id" params={{ id: r.id }}>
                      Open <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
