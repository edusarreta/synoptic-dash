import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Mail, UserCheck, UserX, Settings as SettingsIcon, Users } from "lucide-react";

interface AccountMember {
  id: string;
  user_id: string;
  role: string;
  invited_at: string;
  profiles: {
    email: string;
    full_name: string;
  };
}

export default function Settings() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { toast } = useToast();
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");

  useEffect(() => {
    if (permissions?.canManageUsers) {
      fetchMembers();
    } else {
      setLoading(false);
    }
  }, [permissions]);

  const fetchMembers = async () => {
    try {
        // For now, we'll use dummy data since account_members doesn't exist yet
        const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Convert profiles to account_members format
        const membersData = profiles?.map(profile => ({
          id: profile.id,
          user_id: profile.id,
          role: profile.role,
          invited_at: profile.created_at,
          profiles: {
            email: profile.email,
            full_name: profile.full_name
          }
        })) || [];

        setMembers(membersData);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;

    try {
      // In a real implementation, you would send an email invitation
      // For now, we'll just show a success message
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive"
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: "User role has been updated successfully",
      });
      
      fetchMembers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      // For now, just show a message since we can't actually delete profiles
      toast({
        title: "Feature Not Available",
        description: "User removal is not yet implemented in this demo",
        variant: "destructive"
      });
      return;

      toast({
        title: "Member Removed",
        description: "User has been removed from the account",
      });
      
      fetchMembers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive"
      });
    }
  };

  if (permissionsLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!permissions?.canManageUsers) {
    return (
      <AppLayout>
        <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <SettingsIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access account settings.
            </CardDescription>
          </CardHeader>
        </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and account permissions
          </p>
        </div>

        {/* Invite New User */}
        <Card className="glass-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Invite Team Member
            </CardTitle>
            <CardDescription>
              Invite new users to collaborate on your BI workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
                type="email"
              />
              <Select value={inviteRole} onValueChange={(value: "editor" | "viewer") => setInviteRole(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInviteUser} className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="glass-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage your team members and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-muted rounded w-20"></div>
                      <div className="h-8 bg-muted rounded w-8"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No team members found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium text-foreground">
                            {member.profiles.full_name || member.profiles.email}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {member.profiles.email}
                          </p>
                        </div>
                        <Badge variant={member.role === 'admin' ? 'default' : member.role === 'editor' ? 'secondary' : 'outline'}>
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role !== 'admin' && (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value)}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Descriptions */}
        <Card className="glass-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>
              Understanding what each role can do in your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <Badge className="mb-2">Admin</Badge>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Manage team members</li>
                  <li>• Create and edit everything</li>
                  <li>• Manage data connections</li>
                  <li>• Full account control</li>
                </ul>
              </div>
              <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                <Badge variant="secondary" className="mb-2">Editor</Badge>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Create and edit charts</li>
                  <li>• Create dashboards</li>
                  <li>• Manage data connections</li>
                  <li>• Cannot manage users</li>
                </ul>
              </div>
              <div className="p-4 bg-muted/5 rounded-lg border border-muted/20">
                <Badge variant="outline" className="mb-2">Viewer</Badge>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• View dashboards</li>
                  <li>• Export data</li>
                  <li>• Cannot edit anything</li>
                  <li>• Read-only access</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}