import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Safe delete helper - never throws
async function safeDelete(supabase: any, table: string, column: string, value: string) {
  try {
    await supabase.from(table).delete().eq(column, value)
  } catch (e) {
    console.warn(`[delete] ${table}.${column} failed:`, e)
  }
}

// Safe delete by IDs
async function safeDeleteByIds(supabase: any, table: string, column: string, ids: string[]) {
  if (!ids.length) return
  try {
    await supabase.from(table).delete().in(column, ids)
  } catch (e) {
    console.warn(`[deleteByIds] ${table}.${column} failed:`, e)
  }
}

// Safe nullify
async function safeNullify(supabase: any, table: string, column: string, value: string) {
  try {
    await supabase.from(table).update({ [column]: null }).eq(column, value)
  } catch (e) {
    console.warn(`[nullify] ${table}.${column} failed:`, e)
  }
}

// Safe transfer
async function safeTransfer(supabase: any, table: string, column: string, fromId: string, toId: string) {
  try {
    await supabase.from(table).update({ [column]: toId }).eq(column, fromId)
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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

    // Check admin role or System Administrator profile
    const { data: roleData } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', caller.id).single()
    const { data: profileData } = await supabaseAdmin
      .from('user_profiles').select('profile_id, security_profiles!inner(name)')
      .eq('user_id', caller.id).single()

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

    // Prevent self-deletion
    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Admin ${caller.id} initiating ${deleteOption} for user ${userId}`)

    // ============ TRANSFER DATA (if requested) ============
    if (deleteOption === 'transfer' && transferToUserId) {
      console.log(`Transferring data from ${userId} to ${transferToUserId}`)

      // user_id tables
      const transferUserIdTables = [
        'retailers', 'orders', 'visits', 'beat_plans', 'attendance',
        'gps_tracking', 'gps_tracking_stops', 'leave_applications', 'leave_balance',
        'leave_accrual_log', 'additional_expenses', 'user_period_targets',
        'hierarchy_target_allocations', 'user_business_plans',
        'gamification_points', 'gamification_daily_tracking', 'gamification_retailer_sequences',
        'employee_badges', 'employee_competencies', 'employee_documents',
        'employee_recommendations', 'notifications', 'notification_preferences',
        'ai_insights', 'ai_autonomous_actions', 'ai_feature_feedback',
        'analytics_likes', 'analytics_views',
        'coach_user_progress', 'coach_user_badges', 'coach_user_streaks',
        'coach_chat_messages', 'coach_daily_nudges', 'coach_feedback',
        'coach_quiz_attempts', 'coach_scenario_attempts',
        'coach_user_competency_scores', 'coach_user_overall_scores',
        'competition_insights', 'competition_data',
        'branding_requests', 'regularization_requests',
        'profile_attachments', 'education_history', 'emergency_contacts',
        'aspirations_and_preferences', 'approvers',
        'chat_conversations', 'chat_feedback',
        'competency_coaching_notes', 'distributor_retailer_mappings',
        'gamification_redemptions', 'hierarchy_target_history',
        'password_reset_tokens', 'performance_comments',
        'push_content_execution_log', 'push_content_posts',
        'recommendation_feedback', 'recommendations', 'retailer_feedback',
        'sensitive_data_access_log', 'user_monthly_scorecards',
        'user_object_permissions',
      ]

      for (const table of transferUserIdTables) {
        await safeTransfer(supabaseAdmin, table, 'user_id', userId, transferToUserId)
      }

      // created_by tables
      const transferCreatedByTables = [
        'beats', 'invoices', 'packing_lists', 'custom_invoice_templates',
        'distributor_beat_mappings', 'distributor_company_returns',
        'distributor_evaluation_tasks', 'distributor_inventory_transactions',
        'distributor_returns', 'fy_target_config', 'gamification_games',
        'hierarchy_targets', 'holidays', 'inst_invoices', 'inst_leads',
        'inst_order_commitments', 'inst_quotes', 'price_books',
        'push_content_templates', 'retailer_loyalty_plans',
      ]

      for (const table of transferCreatedByTables) {
        await safeTransfer(supabaseAdmin, table, 'created_by', userId, transferToUserId)
      }

      // Special columns
      await safeTransfer(supabaseAdmin, 'territories', 'assigned_user_id', userId, transferToUserId)
      await safeTransfer(supabaseAdmin, 'employees', 'manager_id', userId, transferToUserId)
      await safeTransfer(supabaseAdmin, 'employees', 'secondary_manager_id', userId, transferToUserId)
      await safeTransfer(supabaseAdmin, 'joint_sales_sessions', 'fse_user_id', userId, transferToUserId)
      await safeTransfer(supabaseAdmin, 'joint_sales_sessions', 'manager_id', userId, transferToUserId)
      await safeTransfer(supabaseAdmin, 'joint_sales_feedback', 'fse_user_id', userId, transferToUserId)
      await safeTransfer(supabaseAdmin, 'joint_sales_feedback', 'manager_id', userId, transferToUserId)
      await safeTransfer(supabaseAdmin, 'beats', 'owner_id', userId, transferToUserId)
      await safeTransfer(supabaseAdmin, 'ai_scheme_suggestions', 'reviewed_by', userId, transferToUserId)

      console.log('Data transfer completed')
    }

    // ============ ARCHIVE TO RECYCLE BIN ============
    console.log('Archiving user data to recycle bin...')
    
    // Get profile info
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('*').eq('id', userId).single()
    
    const userName = profile?.full_name || profile?.username || 'Unknown User'

    // Build a lightweight archive (just metadata, not full data copy for performance)
    const archiveMeta = {
      profile: profile || null,
      _meta: {
        archived_at: new Date().toISOString(),
        user_name: userName,
        user_email: profile?.username || '',
        deleted_by_admin: caller.id,
        delete_option: deleteOption,
        transfer_to: transferToUserId || null,
      }
    }

    // Get user role and employee data for archive
    const { data: userRole } = await supabaseAdmin
      .from('user_roles').select('*').eq('user_id', userId).single()
    const { data: employee } = await supabaseAdmin
      .from('employees').select('*').eq('user_id', userId).single()
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles').select('*').eq('user_id', userId).single()

    if (userRole) (archiveMeta as any).user_role = userRole
    if (employee) (archiveMeta as any).employee = employee
    if (userProfile) (archiveMeta as any).user_profile = userProfile

    const { error: archiveError } = await supabaseAdmin
      .from('recycle_bin')
      .insert({
        original_table: 'profiles',
        original_id: userId,
        record_data: archiveMeta,
        deleted_by: caller.id,
        module_name: 'Users & Roles',
        record_name: userName,
      })

    if (archiveError) {
      console.error('Archive error:', archiveError)
      // Continue anyway - deletion is more important
    }

    // ============ CASCADE DELETE ============
    if (deleteOption !== 'transfer') {
      console.log('Cascade deleting user data...')

      // Phase 1: Delete deeply nested child records
      const orderIds = await fetchIds(supabaseAdmin, 'orders', 'user_id', userId)
      await safeDeleteByIds(supabaseAdmin, 'order_items', 'order_id', orderIds)

      const visitIds = await fetchIds(supabaseAdmin, 'visits', 'user_id', userId)
      await safeDeleteByIds(supabaseAdmin, 'retailer_visit_logs', 'visit_id', visitIds)

      const businessPlanIds = await fetchIds(supabaseAdmin, 'user_business_plans', 'user_id', userId)
      if (businessPlanIds.length) {
        const monthIds = await fetchIds(supabaseAdmin, 'user_business_plan_months', 'business_plan_id', businessPlanIds[0])
        // Fetch all month IDs across all plans
        let allMonthIds: string[] = []
        for (const planId of businessPlanIds) {
          const mIds = await fetchIds(supabaseAdmin, 'user_business_plan_months', 'business_plan_id', planId)
          allMonthIds = allMonthIds.concat(mIds)
        }
        await safeDeleteByIds(supabaseAdmin, 'user_business_plan_month_products', 'month_id', allMonthIds)
        for (const planId of businessPlanIds) {
          await safeDelete(supabaseAdmin, 'user_business_plan_months', 'business_plan_id', planId)
        }
      }

      const packingListIds = await fetchIds(supabaseAdmin, 'packing_lists', 'created_by', userId)
      await safeDeleteByIds(supabaseAdmin, 'packing_list_items', 'packing_list_id', packingListIds)

      const conversationIds = await fetchIds(supabaseAdmin, 'chat_conversations', 'user_id', userId)
      await safeDeleteByIds(supabaseAdmin, 'chat_messages', 'conversation_id', conversationIds)
      await safeDeleteByIds(supabaseAdmin, 'chat_feedback', 'message_id', 
        await (async () => {
          let msgIds: string[] = []
          for (const cId of conversationIds) {
            try {
              const { data } = await supabaseAdmin.from('chat_messages').select('id').eq('conversation_id', cId)
              msgIds = msgIds.concat((data || []).map((m: any) => m.id))
            } catch {}
          }
          return msgIds
        })()
      )

      const brandingRequestIds = await fetchIds(supabaseAdmin, 'branding_requests', 'user_id', userId)
      await safeDeleteByIds(supabaseAdmin, 'branding_request_items', 'branding_request_id', brandingRequestIds)

      // Phase 2: Delete parent records with children now removed
      await safeDelete(supabaseAdmin, 'orders', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'visits', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'user_business_plans', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'packing_lists', 'created_by', userId)
      await safeDelete(supabaseAdmin, 'chat_conversations', 'user_id', userId)
      await safeDelete(supabaseAdmin, 'branding_requests', 'user_id', userId)

      // Phase 3: Clear FK references pointing to this user
      await safeNullify(supabaseAdmin, 'territories', 'assigned_user_id', userId)
      await safeNullify(supabaseAdmin, 'employees', 'manager_id', userId)
      await safeNullify(supabaseAdmin, 'employees', 'secondary_manager_id', userId)
      await safeNullify(supabaseAdmin, 'competency_coaching_notes', 'manager_id', userId)
      await safeNullify(supabaseAdmin, 'hierarchy_target_allocations', 'manager_id', userId)
      await safeNullify(supabaseAdmin, 'joint_sales_sessions', 'manager_id', userId)
      await safeNullify(supabaseAdmin, 'joint_sales_feedback', 'manager_id', userId)
      await safeNullify(supabaseAdmin, 'performance_comments', 'manager_id', userId)
      await safeNullify(supabaseAdmin, 'beats', 'owner_id', userId)
      await safeNullify(supabaseAdmin, 'ai_scheme_suggestions', 'reviewed_by', userId)

      // Phase 4: Delete all remaining user data tables
      const userIdTables = [
        'attendance', 'retailers', 'beat_plans', 'beat_allowances',
        'gps_tracking', 'gps_tracking_stops', 'leave_applications', 'leave_balance',
        'leave_accrual_log', 'additional_expenses', 'user_period_targets',
        'hierarchy_target_allocations', 'gamification_points',
        'gamification_daily_tracking', 'gamification_retailer_sequences',
        'employee_badges', 'employee_competencies', 'employee_documents',
        'employee_recommendations', 'notifications', 'notification_preferences',
        'ai_insights', 'ai_autonomous_actions', 'ai_feature_feedback',
        'analytics_likes', 'analytics_views', 'approvers',
        'coach_user_progress', 'coach_user_badges', 'coach_user_streaks',
        'coach_chat_messages', 'coach_daily_nudges', 'coach_feedback',
        'coach_quiz_attempts', 'coach_scenario_attempts',
        'coach_user_competency_scores', 'coach_user_overall_scores',
        'competition_insights', 'competition_data',
        'regularization_requests', 'profile_attachments',
        'education_history', 'emergency_contacts', 'aspirations_and_preferences',
        'chat_feedback', 'distributor_retailer_mappings',
        'gamification_redemptions', 'hierarchy_target_history',
        'password_reset_tokens', 'performance_comments',
        'push_content_execution_log', 'push_content_posts',
        'recommendation_feedback', 'recommendations', 'retailer_feedback',
        'sensitive_data_access_log', 'user_monthly_scorecards',
        'user_object_permissions', 'competency_coaching_notes',
      ]

      for (const table of userIdTables) {
        await safeDelete(supabaseAdmin, table, 'user_id', userId)
      }

      // Joint sales tables use fse_user_id
      await safeDelete(supabaseAdmin, 'joint_sales_sessions', 'fse_user_id', userId)
      await safeDelete(supabaseAdmin, 'joint_sales_feedback', 'fse_user_id', userId)

      // created_by tables
      const createdByTables = [
        'beats', 'invoices', 'custom_invoice_templates',
        'distributor_beat_mappings', 'distributor_company_returns',
        'distributor_evaluation_tasks', 'distributor_inventory_transactions',
        'distributor_returns', 'fy_target_config', 'gamification_games',
        'hierarchy_targets', 'holidays', 'inst_invoices', 'inst_leads',
        'inst_order_commitments', 'inst_quotes', 'price_books',
        'push_content_templates', 'retailer_loyalty_plans',
      ]

      for (const table of createdByTables) {
        await safeDelete(supabaseAdmin, table, 'created_by', userId)
      }
    }

    // Phase 5: Delete core user records (even for transfer mode, these are user-specific)
    await safeDelete(supabaseAdmin, 'employees', 'user_id', userId)
    await safeDelete(supabaseAdmin, 'user_profiles', 'user_id', userId)
    await safeDelete(supabaseAdmin, 'user_roles', 'user_id', userId)

    // Phase 6: Delete the profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles').delete().eq('id', userId)

    if (profileDeleteError) {
      console.error('Profile delete error:', profileDeleteError)
      return new Response(JSON.stringify({
        error: `Failed to delete profile: ${profileDeleteError.message}. There may be remaining FK constraints.`,
        details: profileDeleteError,
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Phase 7: Delete the auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Auth user delete error:', authDeleteError)
      // Profile is already deleted, log the auth error but consider it partial success
      return new Response(JSON.stringify({
        success: true,
        warning: `Profile deleted but auth user removal failed: ${authDeleteError.message}`,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`User ${userId} fully deleted by admin ${caller.id}`)

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
