import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SuperAdminSetupProps {
  onSetupComplete?: () => void;
}

export function SuperAdminSetup({ onSetupComplete }: SuperAdminSetupProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const promoteToSuperAdmin = async () => {
    if (!userEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter the email address of the user to promote.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, find the user by email
      const { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_super_admin')
        .eq('email', userEmail.trim())
        .single();

      if (findError || !profile) {
        toast({
          title: "User Not Found",
          description: "No user found with that email address.",
          variant: "destructive",
        });
        return;
      }

      if (profile.is_super_admin) {
        toast({
          title: "Already Super Admin",
          description: "This user is already a Super Admin.",
          variant: "destructive",
        });
        return;
      }

      // Promote user to super admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_super_admin: true })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Super Admin Created",
        description: `${profile.full_name || profile.email} has been promoted to Super Admin.`,
      });

      setUserEmail('');
      onSetupComplete?.();
    } catch (error: any) {
      console.error('Error promoting user to super admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to promote user to Super Admin.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Super Admin Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Warning:</strong> Super Admin access provides platform-wide control over all accounts and data. Only grant this to trusted administrators.
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-email">User Email Address</Label>
          <Input
            id="user-email"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="admin@company.com"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Enter the email of an existing user to promote to Super Admin
          </p>
        </div>

        <Button
          onClick={promoteToSuperAdmin}
          disabled={loading || !userEmail.trim()}
          className="w-full"
        >
          {loading ? (
            "Promoting..."
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Promote to Super Admin
            </>
          )}
        </Button>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>Next Steps:</strong> After promotion, the user will need to refresh their browser to access the Super Admin panel at <code>/super-admin</code>.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}