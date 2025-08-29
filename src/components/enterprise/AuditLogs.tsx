import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Download, Search, Filter, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata: any;
  ip_address: string | unknown;
  user_agent: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    email: string;
  };
}

export function AuditLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');

  useEffect(() => {
    loadAuditLogs();
  }, [user]);

  const loadAuditLogs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's account
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id, role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "Only administrators can view audit logs",
          variant: "destructive",
        });
        return;
      }

      // Load audit logs for the account
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('account_id', profile.account_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Get user profiles separately to avoid join issues
      const userIds = [...new Set((data || []).map(log => log.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Merge the data
      const logsWithProfiles = (data || []).map(log => ({
        ...log,
        profiles: profilesData?.find(p => p.id === log.user_id)
      }));

      setLogs(logsWithProfiles as AuditLog[]);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const filteredLogs = getFilteredLogs();
      const csvContent = generateCSV(filteredLogs);
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Audit logs have been exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export audit logs",
        variant: "destructive",
      });
    }
  };

  const generateCSV = (logs: AuditLog[]) => {
    const headers = ['Date', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address'];
    const rows = logs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.profiles?.email || 'Unknown',
      log.action,
      log.resource_type,
      log.resource_id || '',
      log.ip_address
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesResource = resourceFilter === 'all' || log.resource_type === resourceFilter;
      
      return matchesSearch && matchesAction && matchesResource;
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    if (action.includes('update')) return 'bg-blue-100 text-blue-800';
    if (action.includes('delete')) return 'bg-red-100 text-red-800';
    if (action.includes('login')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueResourceTypes = [...new Set(logs.map(log => log.resource_type))];
  const filteredLogs = getFilteredLogs();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>
                Track all critical actions performed in your organization
              </CardDescription>
            </div>
            <Button onClick={exportLogs} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {uniqueResourceTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            Showing {filteredLogs.length} of {logs.length} logs
          </div>

          {/* Logs table */}
          <ScrollArea className="h-96 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">
                          {log.profiles?.full_name || 'Unknown User'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.profiles?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">
                          {log.resource_type.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        {log.resource_id && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {log.resource_id}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {String(log.ip_address)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found matching your criteria
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}