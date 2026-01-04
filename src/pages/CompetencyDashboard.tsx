import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { useCompetencyScores, useMonthlyScorecard, useCompetencyHistory, useCalculateCompetencyScores, useGenerateCompetencyInsights } from "@/hooks/useCompetencyScores";
import { OverallScoreCard } from "@/components/competency/OverallScoreCard";
import { CompetencyScoreCard } from "@/components/competency/CompetencyScoreCard";
import { ImprovementPlanCard } from "@/components/competency/ImprovementPlanCard";
import { CompetencyHistoryChart } from "@/components/competency/CompetencyHistoryChart";

const getMonthOptions = () => {
  const options = [];
  for (let i = 0; i < 6; i++) {
    const date = startOfMonth(subMonths(new Date(), i));
    options.push({
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'MMMM yyyy'),
    });
  }
  return options;
};

export default function CompetencyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const { data: scores, isLoading: scoresLoading } = useCompetencyScores(selectedMonth);
  const { data: scorecard, isLoading: scorecardLoading } = useMonthlyScorecard(selectedMonth);
  const { data: history } = useCompetencyHistory();
  
  const calculateScores = useCalculateCompetencyScores();
  const generateInsights = useGenerateCompetencyInsights();

  const handleCalculateScores = async () => {
    if (!user?.id) return;
    try {
      await calculateScores.mutateAsync({ userId: user.id, monthYear: selectedMonth });
      toast.success("Competency scores calculated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to calculate scores");
    }
  };

  const handleGenerateInsights = async () => {
    if (!user?.id) return;
    try {
      await generateInsights.mutateAsync({ userId: user.id, monthYear: selectedMonth });
      toast.success("AI insights generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate insights");
    }
  };

  const monthOptions = getMonthOptions();
  const isLoading = scoresLoading || scorecardLoading;
  const hasScores = scores && scores.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Competency Dashboard</h1>
              <p className="text-xs text-muted-foreground">AI-driven performance insights</p>
            </div>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleCalculateScores} disabled={calculateScores.isPending} className="flex-1">
            {calculateScores.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Calculate Scores
          </Button>
          <Button onClick={handleGenerateInsights} disabled={generateInsights.isPending || !hasScores} variant="outline" className="flex-1">
            {generateInsights.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            AI Insights
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasScores ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No competency scores for this month yet.</p>
            <Button onClick={handleCalculateScores} disabled={calculateScores.isPending}>
              Calculate Now
            </Button>
          </div>
        ) : (
          <>
            {/* Overall Score */}
            {scorecard && (
              <OverallScoreCard
                score={scorecard.overall_score}
                performanceBand={scorecard.performance_band}
                previousScore={history?.[history.length - 2]?.overall_score}
                rankInTeam={scorecard.rank_in_team}
                totalTeamMembers={scorecard.total_team_members}
              />
            )}

            {/* History Chart */}
            {history && history.length > 1 && (
              <CompetencyHistoryChart history={history} />
            )}

            {/* Competency Scores Grid */}
            <div>
              <h2 className="text-base font-semibold mb-3">Competency Breakdown</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {scores.map(score => (
                  <CompetencyScoreCard key={score.id} score={score} />
                ))}
              </div>
            </div>

            {/* AI Improvement Plan */}
            {scorecard && (
              <div>
                <h2 className="text-base font-semibold mb-3">AI Recommendations</h2>
                <ImprovementPlanCard scorecard={scorecard} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
