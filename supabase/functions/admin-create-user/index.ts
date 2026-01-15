import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
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

    // Verify admin role
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Invalid token:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid token or unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      console.error('Error fetching user role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Error checking user permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (roleData?.role !== 'admin') {
      console.error('User is not admin. Role:', roleData?.role)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin verified')

    // Parse request body
    const {
      email,
      password,
      username,
      full_name,
      phone_number,
      recovery_email,
      hint_question,
      hint_answer,
      monthly_salary,
      daily_da_allowance,
      manager_id,
      hq,
      date_of_joining,
      date_of_exit,
      alternate_email,
      address,
      education,
      emergency_contact_number,
      band,
      is_temporary_password
    } = await req.json()

    console.log('Creating user with email:', email)

    // Validate required fields
    if (!email || !password || !username || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, username, and full_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    let authUserId: string
    
    if (existingUser) {
      console.log('User already exists, updating:', existingUser.id)
      
      // Update existing user's password and metadata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: {
          username,
          full_name,
          phone_number,
          recovery_email,
          hint_question,
          hint_answer
        }
      })
      
      if (updateError) {
        console.error('User update error:', updateError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update existing user', 
            details: updateError.message 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      authUserId = existingUser.id
      
      // Check if employee record already exists
      const { data: existingEmployee } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('user_id', existingUser.id)
        .single()
      
      if (existingEmployee) {
        console.log('Employee record already exists, updating')
        const { error: empUpdateError } = await supabaseAdmin
          .from('employees')
          .update({
            monthly_salary: monthly_salary || 0,
            daily_da_allowance: daily_da_allowance || 0,
            manager_id: manager_id || null,
            hq: hq || null,
            date_of_joining: date_of_joining || null,
            date_of_exit: date_of_exit || null,
            alternate_email: alternate_email || null,
            address: address || null,
            education: education || null,
            emergency_contact_number: emergency_contact_number || null,
            band: band || null
          })
          .eq('user_id', existingUser.id)
        
        if (empUpdateError) {
          console.error('Employee update error:', empUpdateError)
        }
        
        // Update must_change_password flag if using temporary password
        if (is_temporary_password) {
          const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({ must_change_password: true })
            .eq('id', existingUser.id)
          
          if (profileUpdateError) {
            console.error('Profile update error:', profileUpdateError)
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User updated successfully',
            user: {
              id: existingUser.id,
              email: existingUser.email,
              username,
              full_name
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Create new auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          username,
          full_name,
          phone_number,
          recovery_email,
          hint_question,
          hint_answer
        },
        email_confirm: true
      })

      if (authError) {
        console.error('Auth creation error:', authError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create user account', 
            details: authError.message 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!authUser.user) {
        console.error('User creation returned no user object')
        return new Response(
          JSON.stringify({ error: 'User creation failed - no user returned' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      authUserId = authUser.user.id
    }

    console.log('Auth user created:', authUser.user.id)

    // Create employee record for new user
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        user_id: authUserId,
        monthly_salary: monthly_salary || 0,
        daily_da_allowance: daily_da_allowance || 0,
        manager_id: manager_id || null,
        hq: hq || null,
        date_of_joining: date_of_joining || null,
        date_of_exit: date_of_exit || null,
        alternate_email: alternate_email || null,
        address: address || null,
        education: education || null,
        emergency_contact_number: emergency_contact_number || null,
        band: band || null
      })

    if (employeeError) {
      console.error('Employee creation error:', employeeError)
      // Clean up auth user if employee creation fails (only for new users)
      if (!existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create employee record', 
          details: employeeError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Employee record created successfully')

    // Set must_change_password flag if using temporary password
    if (is_temporary_password) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', authUserId)
      
      if (profileUpdateError) {
        console.error('Profile update error for must_change_password:', profileUpdateError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authUserId,
          email,
          username,
          full_name
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating user:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create user' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})