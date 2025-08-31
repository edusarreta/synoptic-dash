import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [accountSlug, setAccountSlug] = useState("");

  // Check if user already has a profile
  useEffect(() => {
    if (user) {
      checkUserProfile();
    }
  }, [user]);

  const checkUserProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profile) {
        // User already has a profile, redirect to dashboard
        navigate('/dashboards');
      }
    } catch (error) {
      // User doesn't have a profile, continue with onboarding
    }
  };

  const createAccountAndProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Create account
      const slug = accountSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          name: user.full_name || 'My Organization',
          slug: slug,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          org_id: account.id,
          email: user.email!,
          full_name: user.full_name,
          role: 'ADMIN', // First user is admin
        });

      if (profileError) throw profileError;

      setStep(2);
      
      setTimeout(() => {
        navigate('/dashboards');
      }, 2000);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-elevated">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {step === 1 ? "Complete Setup" : "Welcome!"}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {step === 1 ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground">
                  Let's set up your workspace for{" "}
                  <span className="font-medium text-foreground">
                    {user.full_name || user.email}
                  </span>
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountSlug">Workspace URL</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      app.synopticbi.com/
                    </span>
                    <Input
                      id="accountSlug"
                      value={accountSlug}
                      onChange={(e) => setAccountSlug(e.target.value)}
                      placeholder="your-company"
                      className="rounded-l-none"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose a unique identifier for your workspace
                  </p>
                </div>
              </div>

              <Button
                onClick={createAccountAndProfile}
                disabled={!accountSlug || isLoading}
                className="w-full gradient-primary"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up workspace...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">All set!</h3>
                <p className="text-muted-foreground">
                  Your workspace has been created successfully. 
                  Redirecting to your dashboard...
                </p>
              </div>

              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-2000" 
                  style={{ width: "100%" }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}