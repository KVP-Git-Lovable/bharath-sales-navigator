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
    const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !adminUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if requesting user has admin role or System Administrator profile
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .single()

    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('security_profiles(name)')
      .eq('user_id', adminUser.id)
      .single()

    const isAdmin = userRole?.role === 'admin'
    const isSystemAdmin = (userProfile?.security_profiles as any)?.name === 'System Administrator'

    if (!isAdmin && !isSystemAdmin) {
      console.log('Access denied for user:', adminUser.id)
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the target user ID from request body
    const { targetUserId } = await req.json()

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Target user ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify target user exists
    const { data: { user: targetUser }, error: targetError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)

    if (targetError || !targetUser) {
      console.error('Target user not found:', targetError)
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a magic link for the target user
    // This will create a valid session for the target user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email!,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://field-sales-navigator.lovable.app'}/`
      }
    })

    if (linkError || !linkData) {
      console.error('Failed to generate login link:', linkError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate login session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the impersonation for audit purposes
    console.log(`Admin ${adminUser.email} (${adminUser.id}) is logging in as ${targetUser.email} (${targetUser.id})`)

    // Extract the token from the action link and create a session
    const actionLink = linkData.properties?.action_link
    if (!actionLink) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate login link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return the magic link - the frontend will redirect to it
    return new Response(
      JSON.stringify({ 
        success: true, 
        loginUrl: actionLink,
        message: `Logging in as ${targetUser.email}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-login-as-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
