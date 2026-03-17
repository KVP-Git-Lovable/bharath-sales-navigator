import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Auto End Day Edge Function
 * 
 * Runs at 10:00 PM IST (16:30 UTC) daily via pg_cron job
 * Automatically closes attendance for users who forgot to check out
 * Uses last activity time from visits, orders, and retailer_visit_logs
 */

interface LastActivity {
  user_id: string
  last_activity_time: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🌙 Auto End Day: Starting midnight cleanup...')
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date in IST (UTC+5:30)
    // When this runs at 11:59 PM IST, we close the CURRENT day's attendance
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000 // IST is UTC+5:30
    const istNow = new Date(now.getTime() + istOffset)
    
    // The date we're closing is TODAY in IST terms since we run at 11:59 PM
    const dateStr = istNow.toISOString().split('T')[0]
    
    console.log(`📅 Processing attendance for date: ${dateStr}`)

    // Step 1: Find all open attendance records (checked in but not checked out)
    const { data: openAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('id, user_id, check_in_time, date')
      .eq('date', dateStr)
      .not('check_in_time', 'is', null)
      .is('check_out_time', null)
      .neq('status', 'leave') // Don't process leave records

    if (attendanceError) {
      console.error('Error fetching open attendance:', attendanceError)
      throw attendanceError
    }

    if (!openAttendance || openAttendance.length === 0) {
      console.log('✅ No open attendance records found. All users have checked out.')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No open attendance records to process',
          date: dateStr,
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${openAttendance.length} open attendance records`)

    // Step 2: For each user, find their last activity time
    const processedUsers: string[] = []
    const errors: string[] = []

    for (const record of openAttendance) {
      try {
        const userId = record.user_id
        console.log(`👤 Processing user: ${userId}`)

        // Find last activity from multiple sources
        const lastActivityTime = await findLastActivityTime(supabase, userId, dateStr, record.check_in_time)
        
        console.log(`⏰ Last activity for ${userId}: ${lastActivityTime}`)

        // Step 3: Update attendance with check_out_time
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: lastActivityTime,
            check_out_address: 'Auto-closed at midnight',
            notes: `Auto-closed by system at midnight. Last activity: ${lastActivityTime}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id)

        if (updateError) {
          console.error(`Error updating attendance for ${userId}:`, updateError)
          errors.push(`User ${userId}: ${updateError.message}`)
          continue
        }

        // Step 4: Close all in-progress visits for this user on this date
        const { data: inProgressVisits } = await supabase
          .from('visits')
          .select('id, updated_at')
          .eq('user_id', userId)
          .eq('planned_date', dateStr)
          .eq('status', 'in-progress')

        if (inProgressVisits && inProgressVisits.length > 0) {
          for (const visit of inProgressVisits) {
            const visitCheckoutTime = visit.updated_at || lastActivityTime
            
            await supabase
              .from('visits')
              .update({
                check_out_time: visitCheckoutTime,
                status: 'unproductive',
                no_order_reason: 'Auto-closed at midnight',
                updated_at: new Date().toISOString()
              })
              .eq('id', visit.id)
          }
          console.log(`  ↳ Closed ${inProgressVisits.length} in-progress visits`)
        }

        // Step 5: Cancel remaining planned visits
        const { data: plannedVisits } = await supabase
          .from('visits')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('planned_date', dateStr)
          .eq('status', 'planned')
          .select('id')

        if (plannedVisits && plannedVisits.length > 0) {
          console.log(`  ↳ Cancelled ${plannedVisits.length} planned visits`)
        }

        // Step 6: Close all active retailer visit logs
        const { data: activeLogs } = await supabase
          .from('retailer_visit_logs')
          .select('id, start_time, updated_at')
          .eq('user_id', userId)
          .eq('visit_date', dateStr)
          .is('end_time', null)

        if (activeLogs && activeLogs.length > 0) {
          for (const log of activeLogs) {
            const endTime = log.updated_at || lastActivityTime
            const startTimeMs = new Date(log.start_time).getTime()
            const endTimeMs = new Date(endTime).getTime()
            const timeSpentSeconds = Math.max(0, Math.floor((endTimeMs - startTimeMs) / 1000))

            await supabase
              .from('retailer_visit_logs')
              .update({
                end_time: endTime,
                time_spent_seconds: timeSpentSeconds
              })
              .eq('id', log.id)
          }
          console.log(`  ↳ Closed ${activeLogs.length} retailer visit logs`)
        }

        // Step 7: Send notification to user
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Day Auto-Closed',
            message: `Your day was automatically closed at midnight. Last activity recorded at ${new Date(lastActivityTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
            type: 'info',
            related_table: 'attendance',
            related_id: record.id
          })

        processedUsers.push(userId)
        console.log(`✅ Successfully processed user: ${userId}`)

      } catch (userError) {
        console.error(`Error processing user ${record.user_id}:`, userError)
        errors.push(`User ${record.user_id}: ${userError.message}`)
      }
    }

    const summary = {
      success: true,
      date: dateStr,
      totalOpen: openAttendance.length,
      processed: processedUsers.length,
      errors: errors.length,
      errorDetails: errors
    }

    console.log('🌙 Auto End Day: Completed!', summary)

    // Refresh pre-computed admin summary tables for today
    // This ensures LiveAttendanceMonitoring stat cards reflect auto-close results immediately
    try {
      console.log('📊 Refreshing admin summary tables...')
      const { error: refreshDailyError } = await supabase.rpc('refresh_daily_admin_summary', { p_date: dateStr })
      if (refreshDailyError) {
        console.error('Warning: Failed to refresh daily summary:', refreshDailyError.message)
      } else {
        console.log('✅ Daily admin summary refreshed')
      }

      // Refresh monthly summary for each processed user
      for (const userId of processedUsers) {
        const [yearStr, monthStr] = dateStr.split('-')
        const { error: refreshMonthlyError } = await supabase.rpc('refresh_user_monthly_summary', {
          p_user_id: userId,
          p_year: parseInt(yearStr),
          p_month: parseInt(monthStr)
        })
        if (refreshMonthlyError) {
          console.error(`Warning: Failed to refresh monthly summary for ${userId}:`, refreshMonthlyError.message)
        }
      }
      console.log(`✅ Monthly summaries refreshed for ${processedUsers.length} users`)
    } catch (refreshError) {
      // Non-fatal: summaries will be refreshed by the DB trigger on next attendance change
      console.error('Warning: Summary refresh failed (non-fatal):', refreshError.message)
    }

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auto End Day Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

/**
 * Find the last activity time for a user on a given date
 * Checks: visits, orders, retailer_visit_logs, attendance itself
 */
async function findLastActivityTime(
  supabase: any, 
  userId: string, 
  dateStr: string,
  checkInTime: string
): Promise<string> {
  const activities: Date[] = []

  // Check visits (use updated_at as activity indicator)
  const { data: visits } = await supabase
    .from('visits')
    .select('updated_at, check_out_time')
    .eq('user_id', userId)
    .eq('planned_date', dateStr)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (visits && visits.length > 0) {
    const visitTime = visits[0].check_out_time || visits[0].updated_at
    if (visitTime) activities.push(new Date(visitTime))
  }

  // Check orders (use created_at as order time)
  const { data: orders } = await supabase
    .from('orders')
    .select('created_at')
    .eq('user_id', userId)
    .eq('order_date', dateStr)
    .order('created_at', { ascending: false })
    .limit(1)

  if (orders && orders.length > 0) {
    activities.push(new Date(orders[0].created_at))
  }

  // Check retailer_visit_logs (use updated_at or end_time)
  const { data: logs } = await supabase
    .from('retailer_visit_logs')
    .select('updated_at, end_time')
    .eq('user_id', userId)
    .eq('visit_date', dateStr)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (logs && logs.length > 0) {
    const logTime = logs[0].end_time || logs[0].updated_at
    if (logTime) activities.push(new Date(logTime))
  }

  // Check user_page_views for last app interaction (clicks/page views)
  const { data: pageViews } = await supabase
    .from('user_page_views')
    .select('visited_at')
    .eq('user_id', userId)
    .gte('visited_at', `${dateStr}T00:00:00`)
    .lte('visited_at', `${dateStr}T23:59:59`)
    .order('visited_at', { ascending: false })
    .limit(1)

  if (pageViews && pageViews.length > 0) {
    activities.push(new Date(pageViews[0].visited_at))
  }

  // Check user_sessions for last session activity
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('logout_at, created_at')
    .eq('user_id', userId)
    .gte('created_at', `${dateStr}T00:00:00`)
    .lte('created_at', `${dateStr}T23:59:59`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (sessions && sessions.length > 0) {
    const sessionTime = sessions[0].logout_at || sessions[0].created_at
    if (sessionTime) activities.push(new Date(sessionTime))
  }

  // If no activity found, use check-in time as fallback
  if (activities.length === 0) {
    console.log(`  ⚠️ No activity found, using check-in time as fallback`)
    return checkInTime
  }

  // Return the most recent activity time
  const latestActivity = new Date(Math.max(...activities.map(d => d.getTime())))
  return latestActivity.toISOString()
}
