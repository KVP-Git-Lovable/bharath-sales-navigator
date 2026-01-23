import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ProductivityData {
  full_name: string;
  planned_date: string;
  productive_visits: number;
  unproductive_visits: number;
  total_visits: number;
  productivity_percentage: number;
}

interface ProductivitySummarySectionProps {
  selectedUser: string;
  dateRange: { from: Date; to: Date };
}

export const ProductivitySummarySection = ({ selectedUser, dateRange }: ProductivitySummarySectionProps) => {
  const [loading, setLoading] = useState(false);
  const [productivityData, setProductivityData] = useState<ProductivityData[]>([]);

  // Fetch productivity data
  const fetchProductivityData = async () => {
    if (selectedUser === 'all') {
      setProductivityData([]);
      return;
    }

    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      const { data, error } = await supabase.rpc('get_productivity_summary', {
        user_full_name: selectedUser,
        start_date: fromDate,
        end_date: toDate
      });

      if (error) {
        console.error('Error fetching productivity data:', error);
        setProductivityData([]);
        return;
      }

      if (data && data.length > 0) {
        setProductivityData(data);
      } else {
        setProductivityData([]);
      }
    } catch (error) {
      console.error('Error in productivity fetch:', error);
      setProductivityData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when props change
  useEffect(() => {
    fetchProductivityData();
  }, [selectedUser, dateRange.from, dateRange.to]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalProductive = productivityData.reduce((sum, row) => sum + row.productive_visits, 0);
    const totalUnproductive = productivityData.reduce((sum, row) => sum + row.unproductive_visits, 0);
    const totalVisits = productivityData.reduce((sum, row) => sum + row.total_visits, 0);
    const avgProductivity = totalVisits > 0 ? Math.round((totalProductive / totalVisits) * 100 * 100) / 100 : 0;
    
    return {
      productive: totalProductive,
      unproductive: totalUnproductive,
      total: totalVisits,
      avgProductivity
    };
  }, [productivityData]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Productivity Summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visit productivity by date • {selectedUser === 'all' ? 'Select a user' : selectedUser} • {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedUser === 'all' ? (
          <div className="text-center py-8 text-muted-foreground">
            Please select a specific user to view productivity data
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
            <p className="text-muted-foreground">Loading productivity data...</p>
          </div>
        ) : productivityData.length > 0 ? (
          <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Productive</TableHead>
                  <TableHead className="text-right">Unproductive</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Productivity %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productivityData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{row.planned_date}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {row.productive_visits}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {row.unproductive_visits}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.total_visits}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className={
                        row.productivity_percentage >= 70 
                          ? 'text-green-600' 
                          : row.productivity_percentage >= 50 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                      }>
                        {row.productivity_percentage}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot className="bg-muted/30 sticky bottom-0">
                <TableRow>
                  <TableCell className="font-semibold">Total ({productivityData.length} days)</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {totals.productive}
                  </TableCell>
                  <TableCell className="text-right font-bold text-orange-600">
                    {totals.unproductive}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {totals.total}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {totals.avgProductivity}%
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No productivity data found for the selected filters
          </div>
        )}
      </CardContent>
    </Card>
  );
};
