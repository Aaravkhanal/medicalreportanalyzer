import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  FileText,
} from "lucide-react";
import { ThemeToggle } from "@/lib/theme";
import { toast } from "sonner";
import { ReportChat } from "@/components/ReportChat";

export const Route = createFileRoute("/report/$id")({ component: ReportPage });

type Summary = {
  simplified_summary: string;
  test_explanation?: {
    tests_performed: string;
    reason_for_test: string;
    overall_indication: string;
    actionable_advice: string;
  };
  key_findings: string[];
  abnormal_values: {
    name: string;
    value: string;
    reference_range?: string;
    severity: string;
    explanation: string;
  }[];
  medical_conditions?: {
    condition: string;
    explanation: string;
    likelihood: string;
  }[];
  term_explanations: { term: string; meaning: string }[];
  suggested_followup: string[];
  emergency_alert: { present: boolean; reason?: string };
  disclaimer: string;
};

type ReportRecord = {
  id: string;
  filename: string;
  created_at: string;
  file_path: string;
  mime_type: string;
  extracted_text: string | null;
  status: string;
  summary: Summary | null;
};

function ReportPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    // Guest access allowed
  }, [user, loading, nav]);

  useEffect(() => {
    (async () => {
      const guestData = sessionStorage.getItem(`report_${id}`);
      if (guestData) {
        const parsed = JSON.parse(guestData);
        setReport(parsed);
        setFileUrl(parsed.file_path);
        setBusy(false);
        return;
      }

      if (!user) {
        setBusy(false);
        return;
      }

      const { data, error } = await supabase.from("reports").select("*").eq("id", id).single();
      if (error) {
        toast.error(error.message);
        return;
      }
      setReport(data as ReportRecord);
      const signed = await supabase.storage
        .from("medical-reports")
        .createSignedUrl(data.file_path, 3600);
      setFileUrl(signed.data?.signedUrl ?? null);
      setBusy(false);
    })();
  }, [id, user]);

  async function downloadPdf() {
    if (!report?.summary) return;
    const { default: jsPDF } = await import("jspdf");
    const s: Summary = report.summary;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = margin;
    const W = doc.internal.pageSize.getWidth() - margin * 2;
    const line = (txt: string, size = 11, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(txt, W);
      for (const l of lines) {
        if (y > 780) {
          doc.addPage();
          y = margin;
        }
        doc.text(l, margin, y);
        y += size + 4;
      }
    };
    line("MedExplain AI — Summary", 18, true);
    y += 6;
    line(report.filename, 10);
    y += 6;
    line("Summary", 13, true);
    line(s.simplified_summary);
    y += 6;
    if (s.test_explanation) {
      line("Test Details", 13, true);
      line("What test was done: " + s.test_explanation.tests_performed);
      line("Why it was done: " + s.test_explanation.reason_for_test);
      line("Overall indication: " + s.test_explanation.overall_indication);
      line("Actionable advice: " + s.test_explanation.actionable_advice);
      y += 6;
    }
    if (s.emergency_alert?.present) {
      line("⚠ Urgent attention", 13, true);
      line(s.emergency_alert.reason || "");
      y += 6;
    }
    line("Key findings", 13, true);
    s.key_findings.forEach((f) => line("• " + f));
    y += 6;
    if (s.abnormal_values?.length) {
      line("Abnormal values", 13, true);
      s.abnormal_values.forEach((a) =>
        line(
          `• ${a.name}: ${a.value} (${a.severity})${a.reference_range ? ` — ref ${a.reference_range}` : ""} — ${a.explanation}`,
        ),
      );
      y += 6;
    }
    if (s.medical_conditions?.length) {
      line("Potential Medical Conditions", 13, true);
      s.medical_conditions.forEach((c) =>
        line(`• ${c.condition} (${c.likelihood}): ${c.explanation}`),
      );
      y += 6;
    }
    if (s.term_explanations?.length) {
      line("Medical terms", 13, true);
      s.term_explanations.forEach((t) => line(`• ${t.term}: ${t.meaning}`));
      y += 6;
    }
    if (s.suggested_followup?.length) {
      line("Suggested follow-up", 13, true);
      s.suggested_followup.forEach((f) => line("• " + f));
      y += 6;
    }
    line("Disclaimer", 13, true);
    line(s.disclaimer);
    doc.save(`${report.filename}-summary.pdf`);
  }

  function downloadTxt() {
    if (!report?.summary) return;
    const s: Summary = report.summary;
    const txt = [
      `MedExplain AI Summary — ${report.filename}`,
      "",
      "SUMMARY",
      s.simplified_summary,
      "",
      ...(s.test_explanation
        ? [
            "TEST DETAILS",
            `What test was done: ${s.test_explanation.tests_performed}`,
            `Why it was done: ${s.test_explanation.reason_for_test}`,
            `Overall indication: ${s.test_explanation.overall_indication}`,
            `Actionable advice: ${s.test_explanation.actionable_advice}`,
            "",
          ]
        : []),
      s.emergency_alert?.present ? `URGENT: ${s.emergency_alert.reason}\n` : "",
      "KEY FINDINGS",
      ...s.key_findings.map((f) => "• " + f),
      "",
      "ABNORMAL VALUES",
      ...s.abnormal_values.map((a) => `• ${a.name}: ${a.value} (${a.severity}) — ${a.explanation}`),
      "",
      "POTENTIAL MEDICAL CONDITIONS",
      ...(s.medical_conditions || []).map(
        (c) => `• ${c.condition} (${c.likelihood}): ${c.explanation}`,
      ),
      "",
      "MEDICAL TERMS",
      ...s.term_explanations.map((t) => `• ${t.term}: ${t.meaning}`),
      "",
      "SUGGESTED FOLLOW-UP",
      ...s.suggested_followup.map((f) => "• " + f),
      "",
      "DISCLAIMER",
      s.disclaimer,
    ].join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${report.filename}-summary.txt`;
    a.click();
  }

  if (loading || busy)
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (!report) return null;
  const s: Summary | null = report.summary;
  const sevColor = (v: string): BadgeProps["variant"] =>
    v === "critical" ? "destructive" : v === "high" || v === "low" ? "default" : "secondary";

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 glass">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
              <Link to="/dashboard">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg gradient-medical">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">
                MedExplain<span className="text-accent">.AI</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 self-end sm:self-auto">
            <ThemeToggle />
            {s && (
              <>
                <Button variant="outline" size="sm" onClick={downloadTxt}>
                  <Download className="mr-1 h-4 w-4" />
                  TXT
                </Button>
                <Button size="sm" className="gradient-medical text-white" onClick={downloadPdf}>
                  <Download className="mr-1 h-4 w-4" />
                  PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="break-words text-xl font-bold sm:text-2xl">{report.filename}</h1>
        <p className="text-sm text-muted-foreground">
          Uploaded {new Date(report.created_at).toLocaleString()}
        </p>

        {s?.emergency_alert?.present && (
          <Card className="mt-4 border-destructive bg-destructive/5 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Possible urgent finding</p>
                <p className="text-sm">{s.emergency_alert.reason}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          {/* Original */}
          <Card className="overflow-hidden">
            <div className="border-b p-3 text-sm font-semibold">Original file</div>
            {fileUrl ? (
              report.mime_type === "application/pdf" ? (
                <iframe src={fileUrl} className="h-[45vh] w-full sm:h-[70vh]" title="original" />
              ) : (
                <img
                  src={fileUrl}
                  alt="report"
                  className="max-h-[45vh] w-full object-contain sm:max-h-[70vh]"
                />
              )
            ) : (
              <div className="p-6 text-sm text-muted-foreground">Preview unavailable</div>
            )}
          </Card>

          {/* Summary */}
          <Card className="flex flex-col">
            <div className="flex items-center justify-between border-b p-3">
              <span className="text-sm font-semibold">AI summary</span>
              {report.status !== "done" && (
                <Badge variant="secondary">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {report.status}
                </Badge>
              )}
            </div>
            <ScrollArea className="h-[45vh] p-4 sm:h-[70vh] sm:p-5">
              {!s ? (
                <div className="text-sm text-muted-foreground">Summary not available.</div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                      <FileText className="h-4 w-4" /> Simplified summary
                    </h3>
                    <p className="text-sm leading-relaxed">{s.simplified_summary}</p>
                  </section>
                  {s.test_explanation && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-primary">
                        Test details & explanation
                      </h3>
                      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            What test was done
                          </p>
                          <p className="mt-0.5 text-sm">{s.test_explanation.tests_performed}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Why it was likely done
                          </p>
                          <p className="mt-0.5 text-sm">{s.test_explanation.reason_for_test}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            What the results indicate
                          </p>
                          <p className="mt-0.5 text-sm">{s.test_explanation.overall_indication}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Actionable advice
                          </p>
                          <p className="mt-0.5 text-sm">{s.test_explanation.actionable_advice}</p>
                        </div>
                      </div>
                    </section>
                  )}
                  {s.key_findings.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-primary">Key findings</h3>
                      <ul className="space-y-1 text-sm list-disc pl-5">
                        {s.key_findings.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {s.abnormal_values.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-primary">Abnormal values</h3>
                      <div className="space-y-2">
                        {s.abnormal_values.map((a, i) => (
                          <div key={i} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                {a.name}: {a.value}
                              </span>
                              <Badge variant={sevColor(a.severity)}>{a.severity}</Badge>
                            </div>
                            {a.reference_range && (
                              <p className="text-xs text-muted-foreground">
                                Reference: {a.reference_range}
                              </p>
                            )}
                            <p className="mt-1 text-sm">{a.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {s.medical_conditions && s.medical_conditions.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-primary">
                        Potential medical conditions
                      </h3>
                      <div className="space-y-2">
                        {s.medical_conditions.map((c, i) => (
                          <div key={i} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{c.condition}</span>
                              <Badge variant="outline">{c.likelihood}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{c.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {s.term_explanations.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-primary">
                        Medical terms explained
                      </h3>
                      <dl className="space-y-2 text-sm">
                        {s.term_explanations.map((t, i) => (
                          <div key={i}>
                            <dt className="font-medium">{t.term}</dt>
                            <dd className="text-muted-foreground">{t.meaning}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}
                  {s.suggested_followup.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-primary">
                        Suggested follow-up
                      </h3>
                      <ul className="space-y-1 text-sm list-disc pl-5">
                        {s.suggested_followup.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                  <p className="rounded-md bg-muted p-3 text-xs italic text-muted-foreground">
                    {s.disclaimer}
                  </p>
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      </main>
      <ReportChat reportText={report.extracted_text || ""} />
    </div>
  );
}
