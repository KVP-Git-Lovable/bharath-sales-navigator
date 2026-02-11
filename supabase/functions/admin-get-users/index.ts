import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch profiles directly (avoids Supabase auth.admin.listUsers bug with NULL confirmation_token)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, phone_number, recovery_email, created_at, profile_picture_url, user_status')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role, assigned_at')

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
    }

    // Combine all data
    const usersWithDetails = (profiles || []).map(profile => {
      const roleData = userRoles?.find(r => r.user_id === profile.id)
      
      return {
        id: profile.id,
        email: profile.username || 'No email',
        username: profile.username || 'N/A',
        full_name: profile.full_name || 'N/A',
        phone_number: profile.phone_number || 'N/A',
        recovery_email: profile.recovery_email || 'N/A',
        role: roleData?.role || 'user',
        assigned_at: roleData?.assigned_at || profile.created_at,
        created_at: profile.created_at,
        last_sign_in_at: null,
        email_confirmed_at: null,
        confirmed_at: null,
        phone: null,
        app_metadata: {},
        user_metadata: {},
        profile: {
          id: profile.id,
          username: profile.username || 'N/A',
          full_name: profile.full_name || 'N/A',
          created_at: profile.created_at,
          profile_picture_url: profile.profile_picture_url,
          user_status: profile.user_status || 'active'
        }
      }
    })
    console.log(`Successfully fetched ${usersWithDetails.length} users`)

    return new Response(
      JSON.stringify({ users: usersWithDetails }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-get-users function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})