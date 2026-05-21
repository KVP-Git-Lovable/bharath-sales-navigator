import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Shield, Download, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type Bucket =
  | "OK_PRESENT_OWNED_BY_SARDAR"
  | "MISSING"
  | "OWNED_BY_OTHER_USER"
  | "FIELDS_DRIFTED"
  | "DUPLICATE_BY_PHONE_OR_NAME";

interface AuditResponse {
  ok: boolean;
  read_only: boolean;
  run_id: string | null;
  summary: {
    snapshot_count: number;
    sardar_retailers_now: number | null;
    buckets: Record<Bucket, number>;
    orphan_orders_may_20_21: number;
    window: { from: string; to: string };
    mode: string;
    generated_at: string;
  };
  audit_csv: string;
  orphan_orders_csv: string;
}

const BUCKET_LABELS: Record<Bucket, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  OK_PRESENT_OWNED_BY_SARDAR: { label: "OK (owned by Sardar)", tone: "secondary" },
  MISSING: { label: "Missing (candidate for insert)", tone: "default" },
  OWNED_BY_OTHER_USER: { label: "Conflict: owned by other user", tone: "destructive" },
  FIELDS_DRIFTED: { label: "Field drift (Sardar)", tone: "outline" },
  DUPLICATE_BY_PHONE_OR_NAME: { label: "Conflict: duplicate phone/name", tone: "destructive" },
};

const SardarRestoreAudit = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("sardar-restore-audit", {
        body: { mode: "audit" },
      });
      if (error) throw error;
      setResult(data as AuditResponse);
      toast.success("Audit complete — no data was modified.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Audit failed";
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <Card className="m-4">
          <CardHeader>
            <CardTitle>Forbidden</CardTitle>
            <CardDescription>System admins only.</CardDescription>
          </CardHeader>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4 max-w-4xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-xl md:text-2xl font-semibold">Sardar Restore — Audit</h1>
          <Badge variant="secondary" className="ml-2">
            <Shield className="h-3 w-3 mr-1" /> Read-only
          </Badge>
        </div>

        <Alert>
          <AlertTitle>Phase 1: Audit &amp; Dry-Run only</AlertTitle>
          <AlertDescription>
            This page runs a read-only comparison between the Sardar snapshot (371 retailers) and
            the current database. No retailers, orders, or visits will be modified. Any restore
            action requires a separate, explicit approval with the exact retailer IDs.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Run audit</CardTitle>
            <CardDescription>
              Classifies each snapshot retailer and counts orphan orders for May 20–21.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runAudit} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Run Sardar restore audit
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Run ID: <code className="text-xs">{result.run_id}</code> ·{" "}
                Snapshot: {result.summary.snapshot_count} ·{" "}
                Sardar retailers now: {result.summary.sardar_retailers_now ?? "?"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(Object.keys(result.summary.buckets) as Bucket[]).map((b) => (
                  <div
                    key={b}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={BUCKET_LABELS[b].tone}>{BUCKET_LABELS[b].label}</Badge>
                    </div>
                    <span className="font-mono font-semibold">{result.summary.buckets[b]}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Orphan orders (May 20–21)</div>
                  <div className="text-xs text-muted-foreground">
                    Orders whose retailer is missing, owned-by-other, duplicate, or has NULL retailer_id.
                  </div>
                </div>
                <span className="font-mono font-semibold">
                  {result.summary.orphan_orders_may_20_21}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadCsv(
                      result.audit_csv,
                      `sardar_restore_audit_${Date.now()}.csv`,
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" /> Download retailer audit CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadCsv(
                      result.orphan_orders_csv,
                      `sardar_orphan_orders_${Date.now()}.csv`,
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" /> Download orphan orders CSV
                </Button>
              </div>

              <Alert>
                <AlertTitle>Next step</AlertTitle>
                <AlertDescription>
                  Review both CSVs offline. To proceed to Phase 3 (apply), reply with the exact
                  retailer IDs you authorize for insert / field-update / forced reassignment.
                  Nothing will be written without that explicit list.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SardarRestoreAudit;