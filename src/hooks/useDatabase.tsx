import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface DatabaseTable {
  name: string;
  type: string;
  columns: DatabaseColumn[];
}

export interface DatabaseColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  position: number;
}

export interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  database_name?: string;
}

export function useDatabase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [tables, setTables] = useState<DatabaseTable[]>([]);

  const loadConnections = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data } = await supabase
          .from('data_connections')
          .select('id, name, connection_type, database_name')
          .eq('account_id', profile.org_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        setConnections(data || []);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast({
        title: "Error",
        description: "Failed to load database connections",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTables = useCallback(async (connectionId: string) => {
    if (!connectionId) {
      setTables([]);
      return [];
    }
    
    console.log('🔍 Loading tables for connection:', connectionId);
    
    // Force clear tables immediately
    setTables([]);
    setLoading(true);
    
    try {
      console.log('📤 Calling get-database-schema with:', { connectionId });
      
      const { data, error } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId }
      });

      console.log('📥 Schema response received:', data);

      if (error) {
        console.error('❌ Schema error:', error);
        throw error;
      }

      if (data?.success && data?.tables) {
        console.log('✅ Tables loaded successfully:', {
          count: data.tables.length,
          databaseName: data.databaseName,
          firstFewTables: data.tables.slice(0, 3).map(t => t.name),
          connectionId
        });
        setTables(data.tables);
        return data.tables;
      } else {
        console.error('❌ Schema response failed:', data);
        throw new Error(data?.error || 'Failed to fetch database schema');
      }
    } catch (error: any) {
      console.error('💥 Error loading tables:', error);
      toast({
        title: "Schema Error",
        description: error.message || 'Failed to load database tables',
        variant: "destructive"
      });
      setTables([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const executeQuery = async (connectionId: string, sqlQuery: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-sql-query', {
        body: {
          connectionId,
          sqlQuery
        }
      });

      if (error) {
        console.error('Function invoke error:', error);
        throw error;
      }

      if (data && data.success && data.data) {
        return {
          data: data.data,
          rowCount: data.rowCount,
          columns: data.columns
        };
      } else {
        throw new Error(data?.details || data?.error || 'Query execution failed');
      }
    } catch (error: any) {
      console.error('Error executing query:', error);
      toast({
        title: "Query Error",
        description: error.message || 'Failed to execute query',
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    connections,
    tables,
    loading,
    loadConnections,
    loadTables,
    executeQuery
  };
}