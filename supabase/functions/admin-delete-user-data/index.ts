import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Safe delete helper - never throws, returns count of deleted rows
async function safeDelete(supabase: any, table: string, column: string, value: string): Promise<number> {
  try {
    const { data, error } = await supabase.from(table).delete().eq(column, value).select('id')
    if (error) {
      console.warn(`[delete] ${table}.${column}: ${error.message}`)
      return 0
    }
    return data?.length || 0
  } catch (e) {
    console.warn(`[delete] ${table}.${column} failed:`, e)
    return 0
  }
}

// Safe delete by IDs
async function safeDeleteByIds(supabase: any, table: string, column: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0
  try {
    const { data, error } = await supabase.from(table).delete().in(column, ids).select('id')
    if (error) {
      console.warn(`[deleteByIds] ${table}.${column}: ${error.message}`)
      return 0
    }
    return data?.length || 0
  } catch (e) {
    console.warn(`[deleteByIds] ${table}.${column} failed:`, e)
    return 0
  }
}

// Fetch IDs from a table
async function fetchIds(supabase: any, table: string, column: string, value: string): Promise<string[]> {
  try {
    const { data } = await supabase.from(table).select('id').eq(column, value)
    return (data || []).map((r: any) => r.id)
  } catch {
    return []
  }
}

// Fetch all records for archiving
async function fetchRecords(supabase: any, table: string, column: string, value: string): Promise<any[]> {
  try {
    const { data } = await supabase.from(table).select('*').eq(column, value)
    return data || []
  } catch {
    return []
  }
}

// Archive records to recycle bin before deletion
async function archiveToRecycleBin(
  supabase: any,
  tableName: string,
  records: any[],
  deletedBy: string,
  moduleName: string,
  userName: string
): Promise<void> {
  if (!records.length) return
  try {
    const entries = records.map(record => ({
      original_table: tableName,
      original_id: record.id || record.beat_id || 'unknown',
      record_data: record,
      deleted_by: deletedBy,
      module_name: moduleName,
      record_name: `${userName} - ${tableName}`,
    }))
    // Insert in batches of 50
    for (let i = 0; i < entries.length; i += 50) {
      const batch = entries.slice(i, i + 50)
      const { error } = await supabase.from('recycle_bin').insert(batch)
      if (error) console.warn(`[archive] ${tableName}: ${error.message}`)
    }
  } catch (e) {
    console.warn(`[archive] ${tableName} failed:`, e)
  }
}

// Module definitions mapping module keys to table deletion operations
interface TableDef {
  table: string
  column: string
  category: string
}

const MODULE_TABLES: Record<string, TableDef[]> = {
  orders: [
    // HARD DELETE DISABLED for orders/invoices/packing_lists.
    // These are financial records — must never be wiped by admin cleanup.
    // Use explicit cancellation/void flows instead.
  ],
  retailers: [
    { table: 'retailers', column: 'user_id', category: 'Retailers' },
    { table: 'retailer_visit_logs', column: 'user_id', category: 'Retailers' },
    { table: 'retailer_feedback', column: 'user_id', category: 'Retailers' },
  ],
  beats: [
    // HARD DELETE DISABLED for beats. Beats are shared business data
    // referenced by retailers/visits/orders. Use soft-delete + recycle_bin.
    { table: 'beat_plans', column: 'user_id', category: 'Beats' },
    { table: 'beat_allowances', column: 'user_id', category: 'Beats' },
  ],
  visits: [
    { table: 'visits', column: 'user_id', category: 'Visits' },
  ],
  attendance: [
    { table: 'attendance', column: 'user_id', category: 'Attendance' },
    { table: 'leave_applications', column: 'user_id', category: 'Attendance' },
    { table: 'leave_balance', column: 'user_id', category: 'Attendance' },
    { table: 'leave_accrual_log', column: 'user_id', category: 'Attendance' },
    { table: 'regularization_requests', column: 'user_id', category: 'Attendance' },
    { table: 'holidays', column: 'created_by', category: 'Attendance' },
  ],
  targets: [
    { table: 'user_period_targets', column: 'user_id', category: 'Targets' },
    { table: 'hierarchy_target_allocations', column: 'user_id', category: 'Targets' },
    { table: 'user_business_plans', column: 'user_id', category: 'Targets' },
    { table: 'fy_target_config', column: 'created_by', category: 'Targets' },
    { table: 'hierarchy_targets', column: 'created_by', category: 'Targets' },
  ],
  gamification: [
    { table: 'gamification_points', column: 'user_id', category: 'Gamification' },
    { table: 'gamification_daily_tracking', column: 'user_id', category: 'Gamification' },
    { table: 'gamification_retailer_sequences', column: 'user_id', category: 'Gamification' },
    { table: 'gamification_games', column: 'created_by', category: 'Gamification' },
    { table: 'gamification_redemptions', column: 'user_id', category: 'Gamification' },
  ],
  gps: [
    { table: 'gps_tracking', column: 'user_id', category: 'GPS' },
    { table: 'gps_tracking_stops', column: 'user_id', category: 'GPS' },
  ],
  communication: [
    { table: 'notifications', column: 'user_id', category: 'Communication' },
    { table: 'notification_preferences', column: 'user_id', category: 'Communication' },
    { table: 'chat_conversations', column: 'user_id', category: 'Communication' },
    { table: 'push_content_templates', column: 'created_by', category: 'Communication' },
    { table: 'push_content_posts', column: 'user_id', category: 'Communication' },
    { table: 'push_content_execution_log', column: 'user_id', category: 'Communication' },
  ],
  learning: [
    { table: 'coach_user_progress', column: 'user_id', category: 'Learning' },
    { table: 'coach_user_badges', column: 'user_id', category: 'Learning' },
    { table: 'coach_user_streaks', column: 'user_id', category: 'Learning' },
    { table: 'coach_chat_messages', column: 'user_id', category: 'Learning' },
    { table: 'coach_daily_nudges', column: 'user_id', category: 'Learning' },
    { table: 'coach_feedback', column: 'user_id', category: 'Learning' },
    { table: 'coach_quiz_attempts', column: 'user_id', category: 'Learning' },
    { table: 'coach_scenario_attempts', column: 'user_id', category: 'Learning' },
    { table: 'coach_user_competency_scores', column: 'user_id', category: 'Learning' },
    { table: 'coach_user_overall_scores', column: 'user_id', category: 'Learning' },
  ],
  expenses: [
    { table: 'additional_expenses', column: 'user_id', category: 'Expenses' },
  ],
  performance: [
    { table: 'user_monthly_scorecards', column: 'user_id', category: 'Performance' },
    { table: 'competency_coaching_notes', column: 'user_id', category: 'Performance' },
    { table: 'performance_comments', column: 'user_id', category: 'Performance' },
  ],
  competition: [
    { table: 'competition_insights', column: 'user_id', category: 'Competition' },
    { table: 'competition_data', column: 'user_id', category: 'Competition' },
  ],
  branding: [
    { table: 'branding_requests', column: 'user_id', category: 'Branding' },
  ],
  analytics: [
    { table: 'analytics_views', column: 'user_id', category: 'Analytics' },
    { table: 'analytics_likes', column: 'user_id', category: 'Analytics' },
  ],
  employee: [
    { table: 'employee_badges', column: 'user_id', category: 'Employee' },
    { table: 'employee_competencies', column: 'user_id', category: 'Employee' },
    { table: 'employee_documents', column: 'user_id', category: 'Employee' },
    { table: 'employee_recommendations', column: 'user_id', category: 'Employee' },
    { table: 'profile_attachments', column: 'user_id', category: 'Employee' },
    { table: 'education_history', column: 'user_id', category: 'Employee' },
    { table: 'emergency_contacts', column: 'user_id', category: 'Employee' },
    { table: 'aspirations_and_preferences', column: 'user_id', category: 'Employee' },
  ],
  jointSales: [
    { table: 'joint_sales_sessions', column: 'fse_user_id', category: 'Joint Sales' },
    { table: 'joint_sales_feedback', column: 'fse_user_id', category: 'Joint Sales' },
  ],
  distributor: [
    { table: 'distributor_inventory_transactions', column: 'created_by', category: 'Distributor' },
    { table: 'distributor_returns', column: 'created_by', category: 'Distributor' },
    { table: 'distributor_company_returns', column: 'created_by', category: 'Distributor' },
    { table: 'distributor_retailer_mappings', column: 'user_id', category: 'Distributor' },
  ],
  institutional: [
    { table: 'inst_invoices', column: 'created_by', category: 'Institutional' },
    { table: 'inst_leads', column: 'created_by', category: 'Institutional' },
    { table: 'inst_order_commitments', column: 'created_by', category: 'Institutional' },
    { table: 'inst_quotes', column: 'created_by', category: 'Institutional' },
  ],
  ai: [
    { table: 'ai_insights', column: 'user_id', category: 'AI' },
    { table: 'ai_autonomous_actions', column: 'user_id', category: 'AI' },
    { table: 'ai_feature_feedback', column: 'user_id', category: 'AI' },
  ],
  other: [
    { table: 'sensitive_data_access_log', column: 'user_id', category: 'Security' },
    { table: 'password_reset_tokens', column: 'user_id', category: 'Security' },
    { table: 'price_books', column: 'created_by', category: 'Other' },
    { table: 'retailer_loyalty_plans', column: 'created_by', category: 'Other' },
    { table: 'custom_invoice_templates', column: 'created_by', category: 'Other' },
    { table: 'recommendations', column: 'user_id', category: 'Other' },
    { table: 'recommendation_feedback', column: 'user_id', category: 'Other' },
    { table: 'social_posts', column: 'user_id', category: 'Other' },
    { table: 'social_likes', column: 'user_id', category: 'Other' },
    { table: 'social_comments', column: 'user_id', category: 'Other' },
    { table: 'social_reactions', column: 'user_id', category: 'Other' },
  ],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify admin access
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check permission via profile_object_permissions
    const { data: profileData } = await supabaseAdmin
      .from('user_profiles')
      .select('profile_id')
      .eq('user_id', caller.id)
      .single()

    let hasPermission = false
    if (profileData?.profile_id) {
      const { data: perms } = await supabaseAdmin
        .from('profile_object_permissions')
        .select('can_delete')
        .eq('profile_id', profileData.profile_id)
        .eq('object_name', 'admin_user_delete')
        .eq('can_delete', true)
        .limit(1)
      hasPermission = (perms && perms.length > 0) || false
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'You do not have permission to delete user data' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { userId, deleteMode, selectedModules } = body

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!deleteMode || !['all', 'selective'].includes(deleteMode)) {
      return new Response(JSON.stringify({ error: 'deleteMode must be "all" or "selective"' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (deleteMode === 'selective' && (!selectedModules || !selectedModules.length)) {
      return new Response(JSON.stringify({ error: 'selectedModules required for selective mode' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get user name for logging
    const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, username').eq('id', userId).single()
    const userName = profile?.full_name || profile?.username || 'Unknown User'

    console.log(`Admin ${caller.id} deleting data for user ${userId} (${userName}), mode: ${deleteMode}`)

    // Determine which modules to process
    const modulesToProcess = deleteMode === 'all'
      ? Object.keys(MODULE_TABLES)
      : (selectedModules as string[]).filter((m: string) => MODULE_TABLES[m])

    let totalDeleted = 0
    const deletionSummary: Record<string, number> = {}

    for (const moduleKey of modulesToProcess) {
      const tables = MODULE_TABLES[moduleKey]
      if (!tables) continue

      let moduleDeleted = 0

      for (const tableDef of tables) {
        // === Handle cascading child records first ===
        
        // Orders: delete order_items before orders
        if (tableDef.table === 'orders') {
          const orderIds = await fetchIds(supabaseAdmin, 'orders', 'user_id', userId)
          if (orderIds.length) {
            // Archive order_items
            for (const orderId of orderIds) {
              const items = await fetchRecords(supabaseAdmin, 'order_items', 'order_id', orderId)
              await archiveToRecycleBin(supabaseAdmin, 'order_items', items, caller.id, 'Orders', userName)
            }
            const childCount = await safeDeleteByIds(supabaseAdmin, 'order_items', 'order_id', orderIds)
            moduleDeleted += childCount
          }
        }

        // Visits: delete retailer_visit_logs by visit_id first
        if (tableDef.table === 'visits') {
          const visitIds = await fetchIds(supabaseAdmin, 'visits', 'user_id', userId)
          if (visitIds.length) {
            const logs = []
            for (const vId of visitIds) {
              const vLogs = await fetchRecords(supabaseAdmin, 'retailer_visit_logs', 'visit_id', vId)
              logs.push(...vLogs)
            }
            await archiveToRecycleBin(supabaseAdmin, 'retailer_visit_logs', logs, caller.id, 'Visits', userName)
            await safeDeleteByIds(supabaseAdmin, 'retailer_visit_logs', 'visit_id', visitIds)
            
            // Also delete visit_ai_insights
            await safeDeleteByIds(supabaseAdmin, 'visit_ai_insights', 'visit_id', visitIds)
          }
        }

        // Packing lists: delete packing_list_items first
        if (tableDef.table === 'packing_lists') {
          const packingListIds = await fetchIds(supabaseAdmin, 'packing_lists', 'created_by', userId)
          if (packingListIds.length) {
            await safeDeleteByIds(supabaseAdmin, 'packing_list_items', 'packing_list_id', packingListIds)
          }
        }

        // Chat conversations: delete chat_messages and chat_feedback first
        if (tableDef.table === 'chat_conversations') {
          const conversationIds = await fetchIds(supabaseAdmin, 'chat_conversations', 'user_id', userId)
          if (conversationIds.length) {
            let allMsgIds: string[] = []
            for (const cId of conversationIds) {
              const msgIds = await fetchIds(supabaseAdmin, 'chat_messages', 'conversation_id', cId)
              allMsgIds = allMsgIds.concat(msgIds)
            }
            if (allMsgIds.length) {
              await safeDeleteByIds(supabaseAdmin, 'chat_feedback', 'message_id', allMsgIds)
            }
            await safeDeleteByIds(supabaseAdmin, 'chat_messages', 'conversation_id', conversationIds)
          }
        }

        // Business plans: delete month products -> months -> plans
        if (tableDef.table === 'user_business_plans') {
          const planIds = await fetchIds(supabaseAdmin, 'user_business_plans', 'user_id', userId)
          if (planIds.length) {
            let allMonthIds: string[] = []
            for (const planId of planIds) {
              const mIds = await fetchIds(supabaseAdmin, 'user_business_plan_months', 'business_plan_id', planId)
              allMonthIds = allMonthIds.concat(mIds)
            }
            if (allMonthIds.length) {
              await safeDeleteByIds(supabaseAdmin, 'user_business_plan_month_products', 'month_id', allMonthIds)
            }
            for (const planId of planIds) {
              await safeDelete(supabaseAdmin, 'user_business_plan_months', 'business_plan_id', planId)
            }
          }
        }

        // Branding requests: delete items first
        if (tableDef.table === 'branding_requests') {
          const brandingIds = await fetchIds(supabaseAdmin, 'branding_requests', 'user_id', userId)
          if (brandingIds.length) {
            await safeDeleteByIds(supabaseAdmin, 'branding_request_items', 'branding_request_id', brandingIds)
          }
        }

        // Social posts: delete comments/likes/reactions first
        if (tableDef.table === 'social_posts') {
          const postIds = await fetchIds(supabaseAdmin, 'social_posts', 'user_id', userId)
          if (postIds.length) {
            await safeDeleteByIds(supabaseAdmin, 'social_comments', 'post_id', postIds)
            await safeDeleteByIds(supabaseAdmin, 'social_likes', 'post_id', postIds)
            await safeDeleteByIds(supabaseAdmin, 'social_reactions', 'post_id', postIds)
          }
        }

        // Joint sales: delete feedback before sessions
        if (tableDef.table === 'joint_sales_sessions') {
          await safeDelete(supabaseAdmin, 'joint_sales_feedback', 'fse_user_id', userId)
        }

        // === Archive records ===
        const records = await fetchRecords(supabaseAdmin, tableDef.table, tableDef.column, userId)
        if (records.length > 0) {
          await archiveToRecycleBin(supabaseAdmin, tableDef.table, records, caller.id, tableDef.category, userName)
        }

        // === Delete ===
        const deleted = await safeDelete(supabaseAdmin, tableDef.table, tableDef.column, userId)
        moduleDeleted += deleted
      }

      if (moduleDeleted > 0) {
        deletionSummary[moduleKey] = moduleDeleted
      }
      totalDeleted += moduleDeleted
    }

    console.log(`Data deletion complete for user ${userId}. Total deleted: ${totalDeleted}`)
    console.log('Deletion summary:', JSON.stringify(deletionSummary))

    return new Response(JSON.stringify({
      success: true,
      totalDeleted,
      deletionSummary,
      message: `Deleted ${totalDeleted} records for "${userName}". Data archived to Recycle Bin.`,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-delete-user-data:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
