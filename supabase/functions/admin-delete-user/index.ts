import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Safe delete helper - never throws
async function safeDelete(supabase: any, table: string, column: string, value: string) {
  try {
    const { error } = await supabase.from(table).delete().eq(column, value)
    if (error) console.warn(`[delete] ${table}.${column}: ${error.message}`)
  } catch (e) {
    console.warn(`[delete] ${table}.${column} failed:`, e)
  }
}

// Safe delete by IDs
async function safeDeleteByIds(supabase: any, table: string, column: string, ids: string[]) {
  if (!ids.length) return
  try {
    const { error } = await supabase.from(table).delete().in(column, ids)
    if (error) console.warn(`[deleteByIds] ${table}.${column}: ${error.message}`)
  } catch (e) {
    console.warn(`[deleteByIds] ${table}.${column} failed:`, e)
  }
}

// Safe nullify
async function safeNullify(supabase: any, table: string, column: string, value: string) {
  try {
    const { error } = await supabase.from(table).update({ [column]: null }).eq(column, value)
    if (error) console.warn(`[nullify] ${table}.${column}: ${error.message}`)
  } catch (e) {
    console.warn(`[nullify] ${table}.${column} failed:`, e)
  }
}

// Safe transfer
async function safeTransfer(supabase: any, table: string, column: string, fromId: string, toId: string) {
  try {
    const { error } = await supabase.from(table).update({ [column]: toId }).eq(column, fromId)
    if (error) console.warn(`[transfer] ${table}.${column}: ${error.message}`)
  } catch (e) {
    console.warn(`[transfer] ${table}.${column} failed:`, e)
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

// ================================================================
// COMPLETE LIST OF TABLES WITH DIRECT FK TO auth.users
// Derived from: pg_constraint WHERE confrelid = 'auth.users'::regclass
// ================================================================

// Tables where we DELETE rows by user_id (user owns these records)
const DELETE_BY_USER_ID = [
  'attendance', 'leave_applications', 'leave_balance', 'leave_accrual_log',
  'user_roles', 'approvers', 'user_approvals', 'notifications', 'notification_preferences',
  'regularization_requests', 'gps_tracking', 'gps_tracking_stops',
  'employee_competencies', 'employee_badges',
  'employee_recommendations', 'employee_documents', 'support_requests',
  'sensitive_data_access_log', 'recommendations', 'recommendation_feedback',
  'visit_ai_insights', 'ai_feature_feedback', 'ai_insights', 'ai_autonomous_actions',
  'gamification_points', 'gamification_daily_tracking', 'gamification_retailer_sequences',
  'gamification_redemptions', 'user_badges', 'retailer_visit_logs',
  'chat_conversations', 'chat_feedback', 'saved_reports',
  'social_posts', 'social_likes', 'social_comments', 'social_reactions',
  'push_content_execution_log', 'push_content_posts',
  'user_profiles', 'user_object_permissions',
  'user_business_plans', 'user_period_targets',
  'user_monthly_scorecards', 'user_leave_policy', 'user_onboarding_progress',
  'profile_attachments', 'education_history', 'emergency_contacts',
  'work_experiences', 'aspirations_and_preferences',
  'competition_insights', 'competition_data',
  'coach_user_progress', 'coach_user_badges', 'coach_user_streaks',
  'coach_chat_messages', 'coach_daily_nudges', 'coach_feedback',
  'coach_quiz_attempts', 'coach_scenario_attempts',
  'coach_user_competency_scores', 'coach_user_overall_scores',
  'password_reset_tokens', 'performance_comments',
  'retailer_feedback', 'additional_expenses',
  'analytics_likes', 'analytics_views',
  'distributor_retailer_mappings', 'hierarchy_target_allocations',
  'competency_coaching_notes',
]

// Tables where we DELETE rows by other columns (fse_user_id, follower_id, etc.)
// NOTE: joint_sales_feedback & joint_sales_sessions have NOT NULL manager_id FK to auth.users
// so we must DELETE (not nullify) rows where manager_id = userId
const DELETE_BY_OTHER_COLUMNS = [
  { table: 'joint_sales_sessions', column: 'fse_user_id' },
  { table: 'joint_sales_sessions', column: 'manager_id' },
  { table: 'joint_sales_feedback', column: 'fse_user_id' },
  { table: 'joint_sales_feedback', column: 'manager_id' },
  { table: 'employee_connections', column: 'follower_id' },
  { table: 'employee_connections', column: 'following_id' },
  { table: 'user_approvals', column: 'approver_id' },
]

// Tables where we DELETE rows by created_by
const DELETE_BY_CREATED_BY = [
  'beats', 'invoices', 'custom_invoice_templates', 'holidays',
  'distributor_beat_mappings', 'distributor_company_returns',
  'distributor_evaluation_tasks', 'distributor_inventory_transactions',
  'distributor_returns', 'fy_target_config', 'gamification_games',
  'hierarchy_targets', 'inst_invoices', 'inst_leads',
  'inst_order_commitments', 'inst_quotes', 'price_books',
  'push_content_templates', 'retailer_loyalty_plans',
  'target_setup_master',
]

// Tables where we NULLIFY reference columns (these reference the user but don't belong to them)
// NOTE: joint_sales_feedback.manager_id and joint_sales_sessions.manager_id are NOT NULL
// so they are handled via DELETE in DELETE_BY_OTHER_COLUMNS above
const NULLIFY_COLUMNS = [
  { table: 'beats', column: 'owner_id' },
  { table: 'employees', column: 'manager_id' },
  { table: 'employees', column: 'secondary_manager_id' },
  { table: 'territories', column: 'assigned_user_id' },
  { table: 'territories', column: 'owner_id' },
  { table: 'territories', column: 'created_by' },
  { table: 'territories', column: 'last_updated_by' },
  { table: 'distributors', column: 'owner_id' },
  { table: 'beat_plans', column: 'joint_sales_manager_id' },
  { table: 'employee_competencies', column: 'assessed_by' },
  { table: 'employee_badges', column: 'issued_by' },
  { table: 'employee_recommendations', column: 'recommender_id' },
  { table: 'employee_documents', column: 'uploaded_by' },
  { table: 'support_requests', column: 'resolved_by' },
  { table: 'vans', column: 'assigned_user_id' },
  { table: 'whatsapp_config', column: 'created_by' },
  { table: 'feature_flags', column: 'updated_by' },
  { table: 'feature_flag_audit', column: 'changed_by' },
  { table: 'gamification_redemptions', column: 'processed_by' },
  { table: 'distributor_users', column: 'approved_by' },
  { table: 'distributor_users', column: 'auth_user_id' },
  { table: 'distributor_price_books', column: 'assigned_by' },
  { table: 'profile_attachments', column: 'attached_by' },
  { table: 'distributor_returns', column: 'verified_by' },
  { table: 'distributor_company_returns', column: 'approved_by' },
  { table: 'hierarchy_target_history', column: 'changed_by' },
  { table: 'hierarchy_target_allocations', column: 'manager_id' },
  { table: 'competency_coaching_notes', column: 'manager_id' },
  { table: 'performance_comments', column: 'manager_id' },
  { table: 'ai_scheme_suggestions', column: 'reviewed_by' },
  { table: 'user_invitations', column: 'manager_id' },
  { table: 'user_invitations', column: 'created_by' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify admin access via getClaims
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: callerError } = await supabaseAuth.auth.getUser()
    if (callerError || !caller) {
      console.error('Auth error:', callerError)
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const callerId = caller.id

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check admin role or System Administrator profile
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabaseAdmin.from('user_roles').select('role').eq('user_id', callerId).single(),
      supabaseAdmin.from('user_profiles').select('profile_id, security_profiles!inner(name)')
        .eq('user_id', callerId).single(),
    ])

    const isAdmin = roleData?.role === 'admin' ||
      (profileData as any)?.security_profiles?.name === 'System Administrator'

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { userId, deleteOption, transferToUserId } = body

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (userId === callerId) {
      return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Admin ${callerId} initiating ${deleteOption} for user ${userId}`)

    // ============ ARCHIVE TO RECYCLE BIN ============
    console.log('Archiving user data to recycle bin...')
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single()
    const userName = profile?.full_name || profile?.username || 'Unknown User'

    const archiveMeta: any = {
      profile: profile || null,
      _meta: {
        archived_at: new Date().toISOString(),
        user_name: userName,
        user_email: profile?.username || '',
        deleted_by_admin: callerId,
        delete_option: deleteOption,
        transfer_to: transferToUserId || null,
      }
    }

    const [{ data: userRole }, { data: employee }, { data: userProfile }] = await Promise.all([
      supabaseAdmin.from('user_roles').select('*').eq('user_id', userId).single(),
      supabaseAdmin.from('employees').select('*').eq('user_id', userId).single(),
      supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
    ])

    if (userRole) archiveMeta.user_role = userRole
    if (employee) archiveMeta.employee = employee
    if (userProfile) archiveMeta.user_profile = userProfile

    const { error: archiveError } = await supabaseAdmin.from('recycle_bin').insert({
      original_table: 'profiles',
      original_id: userId,
      record_data: archiveMeta,
      deleted_by: callerId,
      module_name: 'Users & Roles',
      record_name: userName,
    })

    if (archiveError) console.error('Archive error:', archiveError)

    // ============ TRANSFER DATA (if requested) ============
    if (deleteOption === 'transfer' && transferToUserId) {
      console.log(`Transferring data from ${userId} to ${transferToUserId}`)

      for (const table of DELETE_BY_USER_ID) {
        await safeTransfer(supabaseAdmin, table, 'user_id', userId, transferToUserId)
      }
      for (const table of DELETE_BY_CREATED_BY) {
        await safeTransfer(supabaseAdmin, table, 'created_by', userId, transferToUserId)
      }
      for (const { table, column } of DELETE_BY_OTHER_COLUMNS) {
        await safeTransfer(supabaseAdmin, table, column, userId, transferToUserId)
      }
      for (const { table, column } of NULLIFY_COLUMNS) {
        await safeTransfer(supabaseAdmin, table, column, userId, transferToUserId)
      }

      console.log('Data transfer completed')
    }

    // ============ CASCADE DELETE (for delete-all mode) ============
    if (deleteOption !== 'transfer') {
      console.log('Cascade deleting user data...')

      // Phase 1: Delete deeply nested child records first
      const orderIds = await fetchIds(supabaseAdmin, 'orders', 'user_id', userId)
      if (orderIds.length) {
        await safeDeleteByIds(supabaseAdmin, 'order_items', 'order_id', orderIds)
      }

      const visitIds = await fetchIds(supabaseAdmin, 'visits', 'user_id', userId)
      if (visitIds.length) {
        // retailer_visit_logs has FK to both visits and auth.users
        await safeDeleteByIds(supabaseAdmin, 'retailer_visit_logs', 'visit_id', visitIds)
      }

      const businessPlanIds = await fetchIds(supabaseAdmin, 'user_business_plans', 'user_id', userId)
      if (businessPlanIds.length) {
        let allMonthIds: string[] = []
        for (const planId of businessPlanIds) {
          const mIds = await fetchIds(supabaseAdmin, 'user_business_plan_months', 'business_plan_id', planId)
          allMonthIds = allMonthIds.concat(mIds)
        }
        if (allMonthIds.length) {
          await safeDeleteByIds(supabaseAdmin, 'user_business_plan_month_products', 'month_id', allMonthIds)
        }
        for (const planId of businessPlanIds) {
          await safeDelete(supabaseAdmin, 'user_business_plan_months', 'business_plan_id', planId)
        }
      }

      const packingListIds = await fetchIds(supabaseAdmin, 'packing_lists', 'created_by', userId)
      if (packingListIds.length) {
        await safeDeleteByIds(supabaseAdmin, 'packing_list_items', 'packing_list_id', packingListIds)
      }

      // Delete chat messages before conversations (FK dependency)
      const conversationIds = await fetchIds(supabaseAdmin, 'chat_conversations', 'user_id', userId)
      if (conversationIds.length) {
        // Fetch message IDs for chat_feedback FK
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

      const brandingRequestIds = await fetchIds(supabaseAdmin, 'branding_requests', 'user_id', userId)
      if (brandingRequestIds.length) {
        await safeDeleteByIds(supabaseAdmin, 'branding_request_items', 'branding_request_id', brandingRequestIds)
      }

      // Delete social post comments/likes/reactions before posts
      const socialPostIds = await fetchIds(supabaseAdmin, 'social_posts', 'user_id', userId)
      if (socialPostIds.length) {
        await safeDeleteByIds(supabaseAdmin, 'social_comments', 'post_id', socialPostIds)
        await safeDeleteByIds(supabaseAdmin, 'social_likes', 'post_id', socialPostIds)
        await safeDeleteByIds(supabaseAdmin, 'social_reactions', 'post_id', socialPostIds)
      }

      // Phase 2: Delete by other columns FIRST (handles NOT NULL FK columns like
      // joint_sales_feedback.manager_id and joint_sales_sessions.manager_id)
      console.log('Deleting records by other columns (NOT NULL FKs)...')
      for (const { table, column } of DELETE_BY_OTHER_COLUMNS) {
        await safeDelete(supabaseAdmin, table, column, userId)
      }

      // Phase 3: Nullify all nullable reference columns that point to this user
      console.log('Nullifying reference columns...')
      for (const { table, column } of NULLIFY_COLUMNS) {
        await safeNullify(supabaseAdmin, table, column, userId)
      }

      // Phase 4: Delete parent records (orders, visits, etc.)
      console.log('Deleting parent records...')
      await safeDelete(supabaseAdmin, 'orders', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'visits', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'user_business_plans', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'packing_lists', 'created_by', userId)
      await safeDelete(supabaseAdmin, 'chat_conversations', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'branding_requests', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'retailers', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'beat_plans', 'user_id', userId)

      // Phase 5: Delete all user_id tables
      console.log('Deleting all user data tables...')
      for (const table of DELETE_BY_USER_ID) {
        await safeDelete(supabaseAdmin, table, 'user_id', userId)
      }

      // Delete created_by tables
      for (const table of DELETE_BY_CREATED_BY) {
        await safeDelete(supabaseAdmin, table, 'created_by', userId)
      }
    }

    // ============ FINAL CLEANUP: Core user records ============
    console.log('Deleting core user records...')

    // These must be deleted even in transfer mode
    await safeDelete(supabaseAdmin, 'employees', 'user_id', userId)
    await safeDelete(supabaseAdmin, 'user_profiles', 'user_id', userId)
    await safeDelete(supabaseAdmin, 'user_roles', 'user_id', userId)
    await safeDelete(supabaseAdmin, 'user_object_permissions', 'user_id', userId)

    // Delete profile (FK: profiles.id -> auth.users.id)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles').delete().eq('id', userId)

    if (profileDeleteError) {
      console.error('Profile delete error:', profileDeleteError)
      return new Response(JSON.stringify({
        error: `Failed to delete profile: ${profileDeleteError.message}. Remaining FK constraints may exist.`,
        details: profileDeleteError,
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Delete auth user last (all FKs should be cleared by now)
    console.log('Deleting auth user...')
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      // Known Supabase bug: NULL confirmation_token causes "Database error loading user"
      // Also handle "User not found" (already gone)
      const errMsg = authDeleteError.message?.toLowerCase() || ''
      const isNonFatal = errMsg.includes('user not found') ||
                         errMsg.includes('database error') ||
                         (authDeleteError as any)?.status === 404 ||
                         (authDeleteError as any)?.code === 'user_not_found'
      if (isNonFatal) {
        console.warn('Auth user delete non-fatal error (continuing):', authDeleteError.message)
      } else {
        console.error('Auth user delete error:', authDeleteError)
        return new Response(JSON.stringify({
          success: false,
          error: `Profile deleted but auth user removal failed: ${authDeleteError.message}`,
        }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    console.log(`User ${userId} fully deleted by admin ${callerId}`)

    return new Response(JSON.stringify({
      success: true,
      message: `User "${userName}" has been permanently deleted`,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-delete-user:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
