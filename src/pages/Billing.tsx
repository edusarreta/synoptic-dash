import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Zap, Building2, Loader2, CreditCard } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

const plans = [
  {
    name: 'Basic',
    id: 'basic',
    price: '$9.99',
    description: 'Perfect for small teams getting started',
    features: [
      '5 Dashboards',
      '3 Data Connections',
      '1,000 Monthly Queries',
      'Basic Support',
      'CSV Export'
    ],
    icon: Zap,
    popular: false
  },
  {
    name: 'Pro',
    id: 'pro',
    price: '$29.99',
    description: 'Great for growing businesses',
    features: [
      '25 Dashboards',
      '10 Data Connections',
      '10,000 Monthly Queries',
      'Priority Support',
      'PDF Export',
      'Scheduled Reports',
      'Advanced Alerts'
    ],
    icon: Crown,
    popular: true
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: '$99.99',
    description: 'For large organizations',
    features: [
      'Unlimited Dashboards',
      'Unlimited Data Connections',
      'Unlimited Queries',
      '24/7 Support',
      'Custom Integrations',
      'Advanced Security',
      'API Access',
      'White-label Options'
    ],
    icon: Building2,
    popular: false
  }
];

export default function Billing() {
  const { subscription, loading, createCheckoutSession, openCustomerPortal, refreshSubscription } = useSubscription();
  const { toast } = useToast();

  const handleUpgrade = async (planType: string) => {
    try {
      await createCheckoutSession(planType);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create checkout session",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to open customer portal",
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshSubscription();
      toast({
        title: "Subscription Updated",
        description: "Your subscription status has been refreshed.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to refresh subscription",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Current Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Subscription</span>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                Refresh Status
              </Button>
            </CardTitle>
            <CardDescription>
              Manage your billing and subscription details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                    {subscription?.plan_type?.toUpperCase() || 'FREE'} PLAN
                  </Badge>
                  <Badge variant="outline">
                    {subscription?.status === 'trialing' ? 'TRIAL' : subscription?.status?.toUpperCase()}
                  </Badge>
                </div>
                {subscription?.status === 'trialing' && subscription.trial_days_left !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.trial_days_left} days left in trial
                  </p>
                )}
                {subscription?.current_period_end && (
                  <p className="text-sm text-muted-foreground">
                    Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              {subscription?.subscribed && (
                <Button onClick={handleManageSubscription} variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Usage & Limits</CardTitle>
            <CardDescription>
              Your current usage limits based on your plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold">Dashboards</h3>
                <p className="text-2xl font-bold text-primary">
                  {subscription?.dashboards_limit === -1 ? '∞' : subscription?.dashboards_limit || 1}
                </p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold">Data Connections</h3>
                <p className="text-2xl font-bold text-primary">
                  {subscription?.data_connections_limit === -1 ? '∞' : subscription?.data_connections_limit || 1}
                </p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h3 className="font-semibold">Monthly Queries</h3>
                <p className="text-2xl font-bold text-primary">
                  {subscription?.monthly_queries_limit === -1 ? '∞' : subscription?.monthly_queries_limit?.toLocaleString() || 100}
                </p>
                <p className="text-sm text-muted-foreground">Limit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Choose Your Plan</h2>
            <p className="text-muted-foreground mt-2">
              Upgrade or change your subscription plan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = subscription?.plan_type === plan.id;
              const isActive = subscription?.subscribed || subscription?.status === 'trialing';
              
              return (
                <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center">
                    <Icon className="h-12 w-12 mx-auto text-primary" />
                    <CardTitle className="flex items-center justify-center gap-2">
                      {plan.name}
                      {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                    </CardTitle>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold">{plan.price}</p>
                      <p className="text-sm text-muted-foreground">per month</p>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan && isActive}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isCurrentPlan && isActive
                        ? "Current Plan"
                        : isCurrentPlan
                        ? "Reactivate"
                        : subscription?.plan_type && plans.findIndex(p => p.id === subscription.plan_type) > plans.findIndex(p => p.id === plan.id)
                        ? "Downgrade"
                        : "Upgrade"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}