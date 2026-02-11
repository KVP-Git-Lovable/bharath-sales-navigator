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

    // Get all users from auth with admin privileges (paginated)
    let authUsers: any[] = [];
    let page = 1;
    const perPage = 50;
    let fetchMore = true;

    while (fetchMore) {
      const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      
      if (authError) {
        console.error('Error fetching auth users (page ' + page + '):', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch auth users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUsers = authUsers.concat(data.users || []);
      fetchMore = (data.users?.length || 0) === perPage;
      page++;
    }

    // Get profiles data
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
    const usersWithDetails = authUsers.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id)
      const roleData = userRoles?.find(r => r.user_id === authUser.id)
      
      return {
        id: authUser.id,
        email: authUser.email || 'No email',
        username: profile?.username || 'N/A',
        full_name: profile?.full_name || 'N/A',
        phone_number: profile?.phone_number || 'N/A',
        recovery_email: profile?.recovery_email || 'N/A',
        role: roleData?.role || 'user',
        assigned_at: roleData?.assigned_at || authUser.created_at,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at,
        confirmed_at: authUser.confirmed_at,
        phone: authUser.phone,
        app_metadata: authUser.app_metadata,
        user_metadata: authUser.user_metadata,
        profile: {
          id: profile?.id || authUser.id,
          username: profile?.username || 'N/A',
          full_name: profile?.full_name || 'N/A',
          created_at: profile?.created_at || authUser.created_at,
          profile_picture_url: profile?.profile_picture_url,
          user_status: profile?.user_status || 'active'
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