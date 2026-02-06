 import { useState, useEffect, useMemo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { RefreshCw, Users, AlertTriangle } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { format } from 'date-fns';
 import { useIsMobile } from '@/hooks/use-mobile';
 import { Badge } from '@/components/ui/badge';
 
 interface RetailerProductivity {
   retailer_id: string;
   retailer_name: string;
   planned_visits: number;
   productive_visits: number;
   unproductive_visits: number;
 }
 
 interface RetailerMonthlyProductivitySectionProps {
   selectedUsers: string[];
   dateRange: { from: Date; to: Date };
   allUsers?: { id: string; full_name: string | null }[];
 }
 
 export const RetailerMonthlyProductivitySection = ({ 
   selectedUsers, 
   dateRange,
   allUsers = []
 }: RetailerMonthlyProductivitySectionProps) => {
   const isMobile = useIsMobile();
   const [loading, setLoading] = useState(false);
   const [data, setData] = useState<RetailerProductivity[]>([]);
 
   const fetchData = async () => {
     setLoading(true);
     try {
       const fromDate = format(dateRange.from, 'yyyy-MM-dd');
       const toDate = format(dateRange.to, 'yyyy-MM-dd');
 
      // selectedUsers are already user IDs
      const userIds = selectedUsers;
 
       // Fetch visits within date range with pagination
       const BATCH_SIZE = 500;
       let allVisits: any[] = [];
       let offset = 0;
       let hasMore = true;
 
       while (hasMore) {
         let visitsQuery = supabase
           .from('visits')
           .select('id, retailer_id, status, user_id')
           .gte('planned_date', fromDate)
           .lt('planned_date', toDate)
           .range(offset, offset + BATCH_SIZE - 1);
 
         if (userIds.length > 0) {
           visitsQuery = visitsQuery.in('user_id', userIds);
         }
 
         const { data: visits, error } = await visitsQuery;
         if (error) throw error;
 
         if (visits && visits.length > 0) {
           allVisits.push(...visits);
           offset += BATCH_SIZE;
           hasMore = visits.length === BATCH_SIZE;
         } else {
           hasMore = false;
         }
       }
 
       if (allVisits.length === 0) {
         setData([]);
         setLoading(false);
         return;
       }
 
       // Get unique retailer IDs from visits
       const retailerIdsWithVisits = [...new Set(allVisits.map(v => v.retailer_id).filter(Boolean))];
 
       // Fetch confirmed orders within date range for these retailers
       let allOrders: any[] = [];
       offset = 0;
       hasMore = true;
 
       while (hasMore) {
         let ordersQuery = supabase
           .from('orders')
           .select('id, retailer_id')
           .eq('status', 'confirmed')
           .gte('created_at', `${fromDate}T00:00:00`)
           .lt('created_at', `${toDate}T23:59:59`)
           .in('retailer_id', retailerIdsWithVisits)
           .range(offset, offset + BATCH_SIZE - 1);
 
         const { data: orders, error } = await ordersQuery;
         if (error) throw error;
 
         if (orders && orders.length > 0) {
           allOrders.push(...orders);
           offset += BATCH_SIZE;
           hasMore = orders.length === BATCH_SIZE;
         } else {
           hasMore = false;
         }
       }
 
       // Create set of retailer IDs with confirmed orders
       const retailersWithOrders = new Set(allOrders.map(o => o.retailer_id));
 
       // Fetch retailer details
       const { data: retailers } = await supabase
         .from('retailers')
         .select('id, name')
         .in('id', retailerIdsWithVisits);
 
       const retailerMap = new Map<string, string>();
       retailers?.forEach(r => retailerMap.set(r.id, r.name || 'Unknown'));
 
       // Aggregate visits by retailer
       const retailerVisitMap = new Map<string, { planned: number; productive: number; unproductive: number }>();
 
       allVisits.forEach(visit => {
         if (!visit.retailer_id) return;
         
         if (!retailerVisitMap.has(visit.retailer_id)) {
           retailerVisitMap.set(visit.retailer_id, { planned: 0, productive: 0, unproductive: 0 });
         }
         
         const stats = retailerVisitMap.get(visit.retailer_id)!;
         stats.planned += 1;
         
         if (visit.status === 'productive') {
           stats.productive += 1;
         } else {
           stats.unproductive += 1;
         }
       });
 
       // Filter: retailers with visits but NO confirmed orders
       const results: RetailerProductivity[] = [];
 
       retailerVisitMap.forEach((stats, retailerId) => {
         // Only include if no confirmed orders and at least one visit
         if (!retailersWithOrders.has(retailerId) && stats.planned > 0) {
           results.push({
             retailer_id: retailerId,
             retailer_name: retailerMap.get(retailerId) || 'Unknown',
             planned_visits: stats.planned,
             productive_visits: stats.productive,
             unproductive_visits: stats.unproductive
           });
         }
       });
 
       // Sort by unproductive DESC, planned DESC, name ASC
       results.sort((a, b) => {
         if (b.unproductive_visits !== a.unproductive_visits) {
           return b.unproductive_visits - a.unproductive_visits;
         }
         if (b.planned_visits !== a.planned_visits) {
           return b.planned_visits - a.planned_visits;
         }
         return a.retailer_name.localeCompare(b.retailer_name);
       });
 
       setData(results);
     } catch (error) {
       console.error('Error fetching retailer monthly productivity:', error);
     } finally {
       setLoading(false);
     }
   };
 
   useEffect(() => {
     fetchData();
   }, [selectedUsers, dateRange, allUsers]);
 
   // Calculate totals
   const totals = useMemo(() => {
     return data.reduce(
       (acc, row) => ({
         planned: acc.planned + row.planned_visits,
         productive: acc.productive + row.productive_visits,
         unproductive: acc.unproductive + row.unproductive_visits
       }),
       { planned: 0, productive: 0, unproductive: 0 }
     );
   }, [data]);
 
   return (
     <Card className="mb-4">
       <CardHeader className="pb-2">
         <div className="flex items-center justify-between">
           <CardTitle className="text-base font-semibold flex items-center gap-2">
             <AlertTriangle className="h-4 w-4 text-destructive" />
             Retailer Monthly Productivity
             <Badge variant="outline" className="ml-2 text-xs">
               {data.length} retailers
             </Badge>
           </CardTitle>
           <button
             onClick={fetchData}
             disabled={loading}
             className="p-1 hover:bg-muted rounded"
           >
             <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
           </button>
         </div>
          <p className="text-xs text-muted-foreground mt-1">
            Retailers with visits but no confirmed orders
          </p>
       </CardHeader>
       <CardContent className="pt-0">
         {loading ? (
           <div className="flex items-center justify-center py-8">
             <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
           </div>
         ) : data.length === 0 ? (
           <div className="text-center py-8 text-muted-foreground">
             <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
             <p className="text-sm">No retailers found matching criteria</p>
           </div>
          ) : (
            <div className="scrollbar-always-visible overflow-x-auto">
              <div className={`${data.length > 10 ? 'max-h-[400px] overflow-y-auto scrollbar-always-visible' : ''}`}>
                <Table className="min-w-[400px]">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-[10px] md:text-xs whitespace-nowrap">Retailer Name</TableHead>
                      <TableHead className="text-[10px] md:text-xs text-center whitespace-nowrap">Visits</TableHead>
                      <TableHead className="text-[10px] md:text-xs text-center whitespace-nowrap">Productive</TableHead>
                      <TableHead className="text-[10px] md:text-xs text-center whitespace-nowrap">Unproductive</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.retailer_id}>
                        <TableCell className="text-[10px] md:text-sm font-medium whitespace-nowrap py-2">{row.retailer_name}</TableCell>
                        <TableCell className="text-[10px] md:text-sm text-center py-2">{row.planned_visits}</TableCell>
                        <TableCell className="text-[10px] md:text-sm text-center text-primary py-2">{row.productive_visits}</TableCell>
                        <TableCell className="text-[10px] md:text-sm text-center text-destructive py-2">{row.unproductive_visits}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Sticky Total Row */}
              <Table className="min-w-[400px] border-t">
                <TableBody>
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell className="text-[10px] md:text-sm whitespace-nowrap py-2">Total ({data.length})</TableCell>
                    <TableCell className="text-[10px] md:text-sm text-center py-2">{totals.planned}</TableCell>
                    <TableCell className="text-[10px] md:text-sm text-center text-primary py-2">{totals.productive}</TableCell>
                    <TableCell className="text-[10px] md:text-sm text-center text-destructive py-2">{totals.unproductive}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
       </CardContent>
     </Card>
   );
 };