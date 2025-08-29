import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's account
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating trial state");
      await supabaseClient.from("subscriptions").upsert({
        account_id: profile.account_id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        status: 'trialing',
        plan_type: 'basic',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'account_id' });

      return new Response(JSON.stringify({ 
        subscribed: true, // trialing counts as subscribed
        plan_type: 'basic',
        status: 'trialing',
        trial_days_left: 14
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = 'basic';
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Determine subscription tier from price
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      
      if (amount >= 9999) {
        subscriptionTier = "enterprise";
      } else if (amount >= 2999) {
        subscriptionTier = "pro";
      } else {
        subscriptionTier = "basic";
      }
      
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd, tier: subscriptionTier });
    } else {
      logStep("No active subscription found");
    }

    await supabaseClient.from("subscriptions").upsert({
      account_id: profile.account_id,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
      status: hasActiveSub ? 'active' : 'trialing',
      plan_type: subscriptionTier,
      current_period_start: hasActiveSub ? new Date(subscriptions.data[0].current_period_start * 1000).toISOString() : null,
      current_period_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'account_id' });

    logStep("Updated database with subscription info", { subscribed: hasActiveSub, subscriptionTier });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_type: subscriptionTier,
      status: hasActiveSub ? 'active' : 'trialing',
      current_period_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});