import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, Heart, MessageCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function ReleasesPage() {
  const { data: releases = [], isLoading } = useQuery({
    queryKey: ["releases"],
    queryFn: async () => {
      const [{ data: rows, error }, { data: likes }, { data: comments }] = await Promise.all([
        supabase.from("releases").select("*").eq("status", "published").order("release_date", { ascending: false }),
        supabase.from("release_likes").select("release_id"),
        supabase.from("release_comments").select("release_id"),
      ]);
      if (error) throw error;
      const likeMap: Record<string, number> = {};
      (likes ?? []).forEach((l: any) => (likeMap[l.release_id] = (likeMap[l.release_id] ?? 0) + 1));
      const commentMap: Record<string, number> = {};
      (comments ?? []).forEach((c: any) => (commentMap[c.release_id] = (commentMap[c.release_id] ?? 0) + 1));
      return (rows ?? []).map((r: any) => ({ ...r, likeCount: likeMap[r.id] ?? 0, commentCount: commentMap[r.id] ?? 0 }));
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Rocket className="h-6 w-6 text-primary" /> Release Notes</h1>
        <p className="text-sm text-muted-foreground">Monthly release highlights and detailed feature lists.</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading releases...</div>
      ) : releases.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No releases published yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {releases.map((r: any) => (
            <Link key={r.id} to={`/support/releases/${r.slug}`}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">{r.version}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(r.release_date), "MMM yyyy")}</span>
                      </div>
                      <h2 className="text-lg font-semibold">{r.title}</h2>
                      {r.summary && <p className="text-sm text-muted-foreground mt-1">{r.summary}</p>}
                      {Array.isArray(r.highlights) && r.highlights.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {r.highlights.slice(0, 4).map((h: string, i: number) => (
                            <span key={i} className="text-[11px] bg-accent-gold/10 text-foreground border border-accent-gold/30 rounded-full px-2 py-0.5">
                              {h.split("—")[0].trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {r.likeCount}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {r.commentCount}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}