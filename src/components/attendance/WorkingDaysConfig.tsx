import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Calendar, RefreshCw, Save, Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkingDaysEntry {
  id?: string;
  year: number;
  month: number;
  total_days: number;
  working_days: number;
  week_offs: number;
  holidays: number;
}

interface WeekOffConfig {
  day_of_week: number;
  is_off: boolean;
  alternate_pattern: string | null;
}

interface Holiday {
  date: string;
  holiday_name: string;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WorkingDaysConfig = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [workingDaysData, setWorkingDaysData] = useState<WorkingDaysEntry[]>([]);
  const [weekOffConfig, setWeekOffConfig] = useState<WeekOffConfig[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const year = parseInt(selectedYear);

      const [workingDaysRes, weekOffRes, holidaysRes] = await Promise.all([
        supabase.from('working_days_config').select('*').eq('year', year).order('month'),
        supabase.from('week_off_config').select('*').order('day_of_week'),
        supabase.from('holidays').select('date, holiday_name').eq('year', year),
      ]);

      if (weekOffRes.error) throw weekOffRes.error;
      if (holidaysRes.error) throw holidaysRes.error;

      setWeekOffConfig(weekOffRes.data || []);
      setHolidays(holidaysRes.data || []);

      // Initialize 12 months data
      const existingData = workingDaysRes.data || [];
      const fullYearData: WorkingDaysEntry[] = [];

      for (let month = 1; month <= 12; month++) {
        const existing = existingData.find(d => d.month === month);
        if (existing) {
          fullYearData.push(existing);
        } else {
          const totalDays = new Date(year, month, 0).getDate();
          fullYearData.push({
            year,
            month,
            total_days: totalDays,
            working_days: totalDays,
            week_offs: 0,
            holidays: 0,
          });
        }
      }

      setWorkingDaysData(fullYearData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load working days configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWorkingDays = () => {
    setIsCalculating(true);
    
    const year = parseInt(selectedYear);
    const updatedData: WorkingDaysEntry[] = [];

    for (let month = 1; month <= 12; month++) {
      const totalDays = new Date(year, month, 0).getDate();
      let weekOffs = 0;
      let holidayCount = 0;

      // Count week-offs
      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();

        const config = weekOffConfig.find(c => c.day_of_week === dayOfWeek);
        if (config && config.is_off) {
          if (config.alternate_pattern === 'all') {
            weekOffs++;
          } else if (config.alternate_pattern === '1st_3rd') {
            const weekOfMonth = Math.ceil(day / 7);
            if (weekOfMonth === 1 || weekOfMonth === 3) weekOffs++;
          } else if (config.alternate_pattern === '2nd_4th') {
            const weekOfMonth = Math.ceil(day / 7);
            if (weekOfMonth === 2 || weekOfMonth === 4) weekOffs++;
          }
        }
      }

      // Count holidays (excluding those falling on week-offs)
      const monthHolidays = holidays.filter(h => {
        const holidayDate = new Date(h.date);
        return holidayDate.getMonth() === month - 1;
      });

      for (const holiday of monthHolidays) {
        const holidayDate = new Date(holiday.date);
        const dayOfWeek = holidayDate.getDay();
        const config = weekOffConfig.find(c => c.day_of_week === dayOfWeek);
        
        // Only count if it's not already a week-off
        if (!config?.is_off || config.alternate_pattern === 'none') {
          holidayCount++;
        }
      }

      const workingDays = totalDays - weekOffs - holidayCount;

      const existing = workingDaysData.find(d => d.month === month);
      updatedData.push({
        id: existing?.id,
        year,
        month,
        total_days: totalDays,
        working_days: workingDays,
        week_offs: weekOffs,
        holidays: holidayCount,
      });
    }

    setWorkingDaysData(updatedData);
    setIsCalculating(false);
    toast.success('Working days calculated based on week-off and holiday configuration');
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const year = parseInt(selectedYear);

      // Upsert all months
      for (const entry of workingDaysData) {
        const data = {
          year,
          month: entry.month,
          total_days: entry.total_days,
          working_days: entry.working_days,
          week_offs: entry.week_offs,
          holidays: entry.holidays,
        };

        if (entry.id) {
          await supabase.from('working_days_config').update(data).eq('id', entry.id);
        } else {
          await supabase.from('working_days_config').upsert(data, { onConflict: 'year,month' });
        }
      }

      toast.success('Working days configuration saved successfully');
      fetchData();
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Failed to save working days configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWorkingDaysChange = (month: number, value: number) => {
    setWorkingDaysData(prev =>
      prev.map(entry =>
        entry.month === month ? { ...entry, working_days: value } : entry
      )
    );
  };

  const totalWorkingDays = workingDaysData.reduce((sum, d) => sum + d.working_days, 0);
  const totalWeekOffs = workingDaysData.reduce((sum, d) => sum + d.week_offs, 0);
  const totalHolidays = workingDaysData.reduce((sum, d) => sum + d.holidays, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Working Days Configuration
              </CardTitle>
              <CardDescription>
                Configure and view working days for each month based on week-offs and holidays
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={calculateWorkingDays} disabled={isCalculating}>
                <Calculator className={`h-4 w-4 mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
                Auto Calculate
              </Button>
              <Button onClick={handleSaveAll} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Working Days</div>
              <div className="text-2xl font-bold text-primary">{totalWorkingDays}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Week-Offs</div>
              <div className="text-2xl font-bold">{totalWeekOffs}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Holidays</div>
              <div className="text-2xl font-bold">{totalHolidays}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Calendar Days</div>
              <div className="text-2xl font-bold">{workingDaysData.reduce((sum, d) => sum + d.total_days, 0)}</div>
            </div>
          </div>

          {/* Monthly Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-center">Total Days</TableHead>
                <TableHead className="text-center">Week-Offs</TableHead>
                <TableHead className="text-center">Holidays</TableHead>
                <TableHead className="text-center">Working Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workingDaysData.map((entry) => (
                <TableRow key={entry.month}>
                  <TableCell className="font-medium">{monthNames[entry.month - 1]}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{entry.total_days}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{entry.week_offs}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-orange-100 text-orange-800">{entry.holidays}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      value={entry.working_days}
                      onChange={(e) => handleWorkingDaysChange(entry.month, parseInt(e.target.value) || 0)}
                      className="w-20 text-center mx-auto"
                      min={0}
                      max={entry.total_days}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">How it works</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Click "Auto Calculate" to compute working days based on your week-off and holiday configuration</li>
              <li>• Week-offs are calculated based on the Week-Off Configuration in Attendance Policy</li>
              <li>• Holidays are fetched from the Holidays tab (excluding those falling on week-offs)</li>
              <li>• You can manually override working days for any month if needed</li>
              <li>• Don't forget to click "Save All" to persist your changes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkingDaysConfig;
