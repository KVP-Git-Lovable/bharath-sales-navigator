import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Sparkles, ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";

export default function ReleaseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["release", slug],
    queryFn: async () => {
      const { data: release, error } = await supabase.from("releases").select("*").eq("slug", slug).single();
      if (error) throw error;
      const [{ data: sections }, { data: likes }, { data: comments }] = await Promise.all([
        supabase.from("release_sections").select("*").eq("release_id", release.id).order("position"),
        supabase.from("release_likes").select("user_id").eq("release_id", release.id),
        supabase.from("release_comments").select("*").eq("release_id", release.id).order("created_at", { ascending: true }),
      ]);
      return {
        release,
        sections: sections ?? [],
        likeCount: likes?.length ?? 0,
        liked: (likes ?? []).some((l: any) => l.user_id === user?.id),
        comments: comments ?? [],
      };
    },
    enabled: !!slug,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user || !data) return;
      if (data.liked) {
        await supabase.from("release_likes").delete().eq("release_id", data.release.id).eq("user_id", user.id);
      } else {
        await supabase.from("release_likes").insert({ release_id: data.release.id, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["release", slug] }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !data) return;
      const { error } = await supabase.from("release_comments").insert({ release_id: data.release.id, user_id: user.id, body: comment });
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["release", slug] }); },
  });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Loading release...</div>;
  const { release, sections, likeCount, liked, comments } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/support/releases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All releases
      </Link>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{release.version}</Badge>
            <span className="text-sm text-muted-foreground">{format(new Date(release.release_date), "MMMM yyyy")}</span>
          </div>
          <h1 className="text-3xl font-bold">{release.title}</h1>
          {release.summary && <p className="text-muted-foreground">{release.summary}</p>}

          {Array.isArray(release.highlights) && release.highlights.length > 0 && (
            <div className="rounded-lg border bg-accent-gold/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Sparkles className="h-4 w-4 text-accent-gold" /> Headline capabilities
              </div>
              <ul className="space-y-1.5 text-sm">
                {release.highlights.map((h: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-accent-gold">•</span><span>{h}</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-4 border-t pt-3">
            <Button
              variant={liked ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => toggleLike.mutate()}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likeCount}
            </Button>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <MessageCircle className="h-4 w-4" /> {comments.length} comments
            </span>
          </div>
        </CardContent>
      </Card>

      {sections.map((s: any) => (
        <Card key={s.id}>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-3">{s.title}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 w-1/3">Feature</th>
                    <th className="py-2">What it means for you</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(s.features) ? s.features : []).map((f: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 align-top">
                      <td className="py-3 pr-4 font-medium">{f.name}</td>
                      <td className="py-3 text-muted-foreground">{f.benefit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold">Comments</h3>
          {comments.length === 0 && <p className="text-sm text-muted-foreground">Be the first to comment.</p>}
          {comments.map((c: any) => (
            <div key={c.id} className="text-sm bg-muted/50 rounded-md px-3 py-2">
              <div className="whitespace-pre-wrap">{c.body}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(c.created_at), "MMM d, HH:mm")}</div>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button size="icon" disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}