import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subMonths, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompetencyScores, useMonthlyScorecard, useCompetencyHistory, useCalculateCompetencyScores, useGenerateCompetencyInsights } from "@/hooks/useCompetencyScores";
import { CompetencyHeader } from "@/components/competency/CompetencyHeader";
import { EmployeeRecognitionBanner } from "@/components/competency/EmployeeRecognitionBanner";
import { OverallScoreCard } from "@/components/competency/OverallScoreCard";
import { CompetencyScoreCard } from "@/components/competency/CompetencyScoreCard";
import { CompetencyRadarChart } from "@/components/competency/CompetencyRadarChart";
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
  const { user, userProfile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [companyName, setCompanyName] = useState("SalesCoach AI");
  
  const { data: scores, isLoading: scoresLoading } = useCompetencyScores(selectedMonth);
  const { data: scorecard, isLoading: scorecardLoading } = useMonthlyScorecard(selectedMonth);
  const { data: history } = useCompetencyHistory();
  
  const calculateScores = useCalculateCompetencyScores();
  const generateInsights = useGenerateCompetencyInsights();

  // Fetch company name
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data } = await supabase.from('companies').select('name').limit(1).single();
        if (data?.name) setCompanyName(data.name);
      } catch (e) { /* use default */ }
    };
    fetchCompany();
  }, []);

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
  const employeeName = userProfile?.full_name || user?.email?.split('@')[0] || 'Team Member';

  return (
    <div className="min-h-screen bg-background">
      {/* Header with hamburger menu and company name */}
      <CompetencyHeader
        title="My Competency Dashboard"
        subtitle="AI-driven performance insights"
        companyName={companyName}
        onBack={() => navigate(-1)}
        rightContent={
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="p-4 space-y-6 pb-24">
        {/* Employee Recognition Banner */}
        <EmployeeRecognitionBanner
          employeeName={employeeName}
          overallScore={scorecard?.overall_score}
          performanceBand={scorecard?.performance_band as any}
        />

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

            {/* Radar Chart */}
            {scores && scores.length > 2 && (
              <CompetencyRadarChart scores={scores} />
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
