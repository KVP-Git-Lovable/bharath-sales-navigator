import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Unauthorized' })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    )
    if (claimsErr || !claimsData?.claims) return json(401, { error: 'Invalid token' })
    const callerId = claimsData.claims.sub as string

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    // Verify caller is system admin
    const { data: isAdmin, error: adminErr } = await admin.rpc('is_system_admin', {
      _user_id: callerId,
    })
    if (adminErr || !isAdmin) return json(403, { error: 'Forbidden: system admin only' })

    const body = await req.json().catch(() => ({}))
    const recycle_bin_id: string = body.recycle_bin_id
    const temp_password: string = body.temp_password
    if (!recycle_bin_id || !temp_password || temp_password.length < 8) {
      return json(400, { error: 'recycle_bin_id and temp_password (>=8 chars) required' })
    }

    // Load archive
    const { data: rb, error: rbErr } = await admin
      .from('recycle_bin')
      .select('*')
      .eq('id', recycle_bin_id)
      .maybeSingle()
    if (rbErr) return json(500, { error: 'recycle_bin read failed', detail: rbErr.message })
    if (!rb) return json(404, { error: 'recycle_bin row not found' })

    const payload: any = rb.record_data ?? {}
    const profile = payload.profile
    const userRole = payload.user_role
    const userProfile = payload.user_profile
    const employee = payload.employee
    if (!profile?.id) return json(400, { error: 'archive missing profile.id' })

    const userId: string = profile.id
    const phone: string | null = profile.phone_number || null
    const fullName: string = profile.full_name || profile.username || 'Restored User'

    const report: Record<string, unknown> = { user_id: userId }

    // 1. Recreate auth.users
    // Check if already exists first
    const { data: existing } = await admin.auth.admin.getUserById(userId)
    if (existing?.user) {
      report.auth_user = 'already_exists'
    } else {
      const createPayload: any = {
        id: userId,
        password: temp_password,
        user_metadata: { full_name: fullName },
        email_confirm: true,
        phone_confirm: true,
      }
      if (phone) createPayload.phone = phone
      // Fallback synthetic email if no phone (auth.users requires email or phone)
      if (!phone) createPayload.email = `restored+${userId}@placeholder.local`

      const { data: created, error: createErr } = await admin.auth.admin.createUser(createPayload)
      if (createErr || !created?.user) {
        return json(500, {
          error: 'auth.admin.createUser failed',
          detail: createErr?.message,
          hint: 'May need SQL fallback if custom id not accepted',
        })
      }
      if (created.user.id !== userId) {
        // SDK ignored our id — abort so we don't corrupt FKs
        await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
        return json(500, {
          error: 'auth.admin.createUser returned a different id; UUID preservation failed',
          returned_id: created.user.id,
          expected_id: userId,
        })
      }
      report.auth_user = 'created'
    }

    // 2. profiles
    const { error: pErr } = await admin.from('profiles').upsert(profile, { onConflict: 'id' })
    report.profiles = pErr ? { error: pErr.message } : 'ok'

    // 3. user_roles
    if (userRole) {
      const { error } = await admin.from('user_roles').upsert(userRole, { onConflict: 'id' })
      report.user_roles = error ? { error: error.message } : 'ok'
    }

    // 4. user_profiles (security profile assignment)
    if (userProfile) {
      const { error } = await admin
        .from('user_profiles')
        .upsert(userProfile, { onConflict: 'id' })
      report.user_profiles = error ? { error: error.message } : 'ok'
    }

    // 5. employees
    if (employee) {
      const { error } = await admin.from('employees').upsert(employee, { onConflict: 'user_id' })
      report.employees = error ? { error: error.message } : 'ok'
    }

    // 6. Remove recycle_bin row
    const { error: delErr } = await admin.from('recycle_bin').delete().eq('id', recycle_bin_id)
    report.recycle_bin_cleared = delErr ? { error: delErr.message } : 'ok'

    return json(200, { success: true, report })
  } catch (e) {
    return json(500, { error: 'unexpected', detail: String(e) })
  }
})