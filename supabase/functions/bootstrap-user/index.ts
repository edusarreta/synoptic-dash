import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log('Bootstrap user:', user.id, user.email);

    // 1. Ensure profile exists
    const { data: existingProfile, error: profileCheckError } = await supabaseClient
      .from('profiles')
      .select('id, org_id')
      .eq('id', user.id)
      .single();

    let profile = existingProfile;

    let userOrg = null;
    
    if (profileCheckError && profileCheckError.code === 'PGRST116') {
      // Profile doesn't exist, need to create org first then profile
      console.log('Creating new organization and profile for user:', user.id);
      
      const orgName = user.user_metadata?.account_name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || 
                     'Minha Organização';

      const orgSlug = orgName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Create organization first
      const { data: newOrg, error: createOrgError } = await supabaseClient
        .from('organizations')
        .insert({
          name: orgName,
          slug: `${orgSlug}-${user.id.substring(0, 8)}`,
          status: 'active',
          plan_type: 'FREE'
        })
        .select()
        .single();

      if (createOrgError) {
        console.error('Failed to create organization:', createOrgError);
        throw new Error(`Failed to create organization: ${createOrgError.message}`);
      }

      console.log('Organization created:', newOrg.id);
      userOrg = newOrg;

      // Now create profile with the org_id
      const { data: newProfile, error: createProfileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: 'MASTER',
          org_id: userOrg.id
        })
        .select()
        .single();

      if (createProfileError) {
        console.error('Failed to create profile:', createProfileError);
        throw new Error(`Failed to create profile: ${createProfileError.message}`);
      }

      console.log('Profile created:', newProfile.id);
      profile = newProfile;
    } else if (profileCheckError) {
      console.error('Error checking profile:', profileCheckError);
      throw new Error(`Failed to check profile: ${profileCheckError.message}`);
    } else if (profile?.org_id) {
      // User already has profile and org, get the org
      console.log('Fetching existing organization for profile:', profile.org_id);
      const { data: org, error: orgError } = await supabaseClient
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single();

      if (!orgError && org) {
        console.log('Found existing organization:', org.id);
        userOrg = org;
      } else {
        console.error('Error fetching organization or org not found:', orgError);
      }
    } else if (profile && !profile.org_id) {
      // Profile exists but has no organization - create one
      console.log('Profile exists without organization, creating new org for user:', user.id);
      
      const orgName = user.user_metadata?.account_name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || 
                     'Minha Organização';

      const orgSlug = orgName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Create organization
      const { data: newOrg, error: createOrgError } = await supabaseClient
        .from('organizations')
        .insert({
          name: orgName,
          slug: `${orgSlug}-${user.id.substring(0, 8)}`,
          status: 'active',
          plan_type: 'FREE'
        })
        .select()
        .single();

      if (createOrgError) {
        console.error('Failed to create organization for existing profile:', createOrgError);
        throw new Error(`Failed to create organization: ${createOrgError.message}`);
      }

      console.log('Organization created for existing profile:', newOrg.id);
      userOrg = newOrg;

      // Update profile with org_id
      const { error: updateProfileError } = await supabaseClient
        .from('profiles')
        .update({ org_id: userOrg.id })
        .eq('id', user.id);

      if (updateProfileError) {
        console.error('Failed to update profile with org_id:', updateProfileError);
        throw new Error(`Failed to update profile with org: ${updateProfileError.message}`);
      }

      console.log('Profile updated with org_id:', userOrg.id);
    }

    // Final validation - ensure we have both profile and organization
    if (!userOrg) {
      console.error('No organization found or created for user:', user.id);
      throw new Error('Failed to establish user organization');
    }

    if (!profile) {
      console.error('No profile found or created for user:', user.id);
      throw new Error('Failed to establish user profile');
    }

    // 4. Prepare response with user memberships
    const memberships = [{
      org_id: userOrg.id,
      org_name: userOrg.name,
      role: 'MASTER'
    }];

    console.log('Bootstrap completed for user:', user.id, 'org:', userOrg.id);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          org_id: userOrg.id
        },
        organization: userOrg,
        memberships
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Bootstrap error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});