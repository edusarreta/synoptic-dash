import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Search, 
  Users, 
  Pause, 
  Play, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Activity
} from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { formatDistanceToNow } from 'date-fns';

export default function SuperAdmin() {
  const { 
    accounts, 
    loading, 
    isSuperAdmin, 
    loadAccounts, 
    suspendAccount, 
    reactivateAccount 
  } = useSuperAdmin();
  
  const [searchQuery, setSearchQuery] = useState('');

  // If user is not super admin, show access denied
  if (!isSuperAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Super Admin privileges are required to access this panel.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAccounts(searchQuery.trim() || undefined);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'suspended':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Suspended</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Unknown</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      basic: 'bg-blue-100 text-blue-800 border-blue-200',
      pro: 'bg-purple-100 text-purple-800 border-purple-200',
      enterprise: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    
    return (
      <Badge className={colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {plan?.charAt(0).toUpperCase() + plan?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Super Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">
              Platform-wide account management and oversight
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              Super Admin Access
            </Badge>
          </div>
        </div>

        {/* Search and Stats */}
        <Card className="glass-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Account Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by account name, admin email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={loading}>
                Search
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  loadAccounts();
                }}
              >
                Clear
              </Button>
            </form>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-foreground">
                  {accounts.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Accounts</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {accounts.filter(a => a.status === 'active').length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">
                  {accounts.filter(a => a.status === 'suspended').length}
                </div>
                <div className="text-sm text-muted-foreground">Suspended</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-primary">
                  {accounts.reduce((sum, account) => sum + account.userCount, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts List */}
        <Card className="glass-card border-0 shadow-card">
          <CardHeader>
            <CardTitle>Platform Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">Loading accounts...</div>
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No accounts found</p>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <Card key={account.id} className="border">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3 flex-1">
                            {/* Account Info */}
                            <div className="flex items-center gap-3">
                              {getStatusIcon(account.status)}
                              <div>
                                <h3 className="text-lg font-semibold">{account.name}</h3>
                                <p className="text-sm text-muted-foreground">@{account.slug}</p>
                              </div>
                              <div className="flex gap-2">
                                {getStatusBadge(account.status)}
                                {account.subscription && getPlanBadge(account.subscription.plan)}
                              </div>
                            </div>

                            <Separator />

                            {/* Admin User */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">Admin User</h4>
                                <div className="space-y-1">
                                  <div className="text-sm">
                                    <span className="font-medium">{account.adminUser.name}</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {account.adminUser.email}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Joined {formatDistanceToNow(new Date(account.adminUser.joinedAt), { addSuffix: true })}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">Account Stats</h4>
                                <div className="space-y-1">
                                  <div className="text-sm flex items-center gap-2">
                                    <Users className="w-3 h-3" />
                                    {account.userCount} users
                                  </div>
                                  {account.subscription && (
                                    <div className="text-sm flex items-center gap-2">
                                      <CreditCard className="w-3 h-3" />
                                      {account.subscription.plan} plan
                                    </div>
                                  )}
                                  <div className="text-sm flex items-center gap-2">
                                    <Activity className="w-3 h-3" />
                                    Created {formatDistanceToNow(new Date(account.createdAt), { addSuffix: true })}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Suspension Info */}
                            {account.status === 'suspended' && account.suspendedAt && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="text-sm text-red-800">
                                  <strong>Account Suspended</strong> - {formatDistanceToNow(new Date(account.suspendedAt), { addSuffix: true })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 ml-4">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            
                            {account.status === 'active' ? (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => suspendAccount(account.id)}
                                disabled={loading}
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                Suspend
                              </Button>
                            ) : (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => reactivateAccount(account.id)}
                                disabled={loading}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}