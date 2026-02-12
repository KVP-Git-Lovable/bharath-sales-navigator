import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardSectionProps {
  selectedUserIds: string[];
  dateRange: { from: Date; to: Date };
  allUsers: { id: string; full_name: string | null }[];
}

interface RankedUser {
  user_id: string;
  full_name: string;
  total_points: number;
}

export const LeaderboardSection = ({ selectedUserIds, dateRange, allUsers }: LeaderboardSectionProps) => {
  const [scopeFilter, setScopeFilter] = useState<'my_scope' | 'all_team'>('my_scope');
  const [rankings, setRankings] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(false);

  const startDate = useMemo(() => dateRange.from.toISOString(), [dateRange.from]);
  const endDate = useMemo(() => dateRange.to.toISOString(), [dateRange.to]);

  useEffect(() => {
    fetchRankings();
  }, [startDate, endDate, scopeFilter, selectedUserIds]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('gamification_points')
        .select('user_id, points, earned_at')
        .gte('earned_at', startDate)
        .lte('earned_at', endDate);

      // If "my_scope", filter to the selected user IDs from analytics scope
      if (scopeFilter === 'my_scope' && selectedUserIds.length > 0) {
        query = query.in('user_id', selectedUserIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leaderboard rankings:', error);
        setRankings([]);
        setLoading(false);
        return;
      }

      // Aggregate points by user
      const userPointsMap = new Map<string, number>();
      data?.forEach(item => {
        const current = userPointsMap.get(item.user_id) || 0;
        userPointsMap.set(item.user_id, current + item.points);
      });

      const userIds = Array.from(userPointsMap.keys());
      if (userIds.length === 0) {
        setRankings([]);
        setLoading(false);
        return;
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const ranked: RankedUser[] = userIds
        .map(userId => ({
          user_id: userId,
          full_name: profilesData?.find(p => p.id === userId)?.full_name || 'Unknown User',
          total_points: userPointsMap.get(userId) || 0,
        }))
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 20);

      setRankings(ranked);
    } catch (e) {
      console.error('Leaderboard fetch error:', e);
      setRankings([]);
    }
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-base sm:text-lg">Leaderboard</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as 'my_scope' | 'all_team')}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my_scope">My Scope</SelectItem>
                <SelectItem value="all_team">All Team</SelectItem>
              </SelectContent>
            </Select>
            <Select value="role" disabled>
              <SelectTrigger className="w-[100px] h-8 text-xs opacity-50">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">Role</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No leaderboard data for this period
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 */}
            {rankings.slice(0, 3).map((item, index) => (
              <div
                key={item.user_id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/10 dark:to-orange-950/10"
              >
                <div className="text-2xl w-8 text-center">{getRankIcon(index + 1)}</div>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {item.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.full_name}</p>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {item.total_points.toLocaleString()} pts
                </Badge>
              </div>
            ))}

            {/* Rest */}
            {rankings.slice(3).map((item, index) => (
              <div
                key={item.user_id}
                className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50"
              >
                <span className="text-xs font-semibold w-8 text-center text-muted-foreground">
                  #{index + 4}
                </span>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    {item.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <p className="flex-1 text-sm truncate">{item.full_name}</p>
                <Badge variant="outline" className="text-xs">
                  {item.total_points.toLocaleString()} pts
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
