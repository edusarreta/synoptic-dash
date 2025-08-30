import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  host?: string;
  port?: number;
  database_name?: string;
  username?: string;
  ssl_enabled: boolean;
  is_active: boolean;
  connection_config: any;
  created_at: string;
}

interface DatabaseTable {
  name: string;
  type: string;
  columns: DatabaseColumn[];
}

interface DatabaseColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  position: number;
}

interface DataField {
  id: string;
  name: string;
  type: 'dimension' | 'metric' | 'time_dimension';
  dataType: string;
  table: string;
  configuredType?: 'text' | 'number' | 'date' | 'datetime' | 'boolean';
}

export function useDataConnections() {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Load connections from database
  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('data_connections')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
      
      console.log('✅ Connections loaded:', data?.length || 0);
    } catch (error: any) {
      console.error('❌ Error loading connections:', error);
      toast.error('Falha ao carregar conexões de dados');
    } finally {
      setIsLoading(false);
    }
  };

  // Load tables for a specific connection
  const loadTables = async (connectionId: string) => {
    if (!connectionId) return;
    
    try {
      setIsLoadingFields(true);
      setTables([]);
      
      console.log('🔄 Loading tables for connection:', connectionId);
      
      const { data, error } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId }
      });

      if (error) throw error;
      
      if (data?.success && data?.tables) {
        console.log('✅ Tables loaded:', data.tables.length);
        setTables(data.tables);
        return data.tables;
      } else {
        throw new Error(data?.error || 'Nenhuma tabela encontrada');
      }
    } catch (error: any) {
      console.error('❌ Error loading tables:', error);
      toast.error(`Erro ao carregar tabelas: ${error.message}`);
      setTables([]);
      return [];
    } finally {
      setIsLoadingFields(false);
    }
  };

  // Load fields for a specific table
  const loadTableFields = async (connectionId: string, tableName: string) => {
    if (!connectionId || !tableName) return;
    
    try {
      setIsLoadingFields(true);
      setDataFields([]);
      
      console.log('🔄 Loading fields for table:', tableName, 'in connection:', connectionId);
      
      const { data, error } = await supabase.functions.invoke('get-database-schema', {
        body: { connectionId }
      });

      if (error) throw error;
      
      console.log('📊 Raw schema data:', data);
      
      // Find the specific table in the schema
      const table = data.tables?.find((t: any) => t.name === tableName);
      if (!table || !table.columns) {
        throw new Error(`Tabela ${tableName} não encontrada no schema`);
      }
      
      // Process fields to match our DataField interface with better type detection
      const processedFields: DataField[] = table.columns?.map((field: any) => {
        const fieldType = field.dataType?.toLowerCase() || '';
        const fieldName = field.name?.toLowerCase() || '';
        
        // Better logic for determining if field is dimension or metric
        const isMetric = 
          fieldType.includes('int') || 
          fieldType.includes('decimal') || 
          fieldType.includes('float') || 
          fieldType.includes('numeric') || 
          fieldType.includes('real') || 
          fieldType.includes('double') ||
          fieldName.includes('amount') ||
          fieldName.includes('price') ||
          fieldName.includes('cost') ||
          fieldName.includes('total') ||
          fieldName.includes('count') ||
          fieldName.includes('sum') ||
          fieldName.includes('value') ||
          fieldName.includes('vendas') ||
          fieldName.includes('valor');

        const isTimeField = 
          fieldType.includes('date') || 
          fieldType.includes('time') || 
          fieldType.includes('timestamp') ||
          fieldName.includes('data') ||
          fieldName.includes('date') ||
          fieldName.includes('created') ||
          fieldName.includes('updated');

        let type: 'dimension' | 'metric' | 'time_dimension' = 'dimension';
        let configuredType: 'text' | 'number' | 'date' | 'datetime' | 'boolean' = 'text';

        if (isTimeField) {
          type = 'time_dimension';
          configuredType = fieldType.includes('timestamp') || fieldType.includes('datetime') ? 'datetime' : 'date';
        } else if (isMetric) {
          type = 'metric';
          configuredType = 'number';
        } else if (fieldType.includes('bool')) {
          type = 'dimension';
          configuredType = 'boolean';
        }

        return {
          id: field.name,
          name: field.name.charAt(0).toUpperCase() + field.name.slice(1),
          type,
          dataType: field.dataType,
          table: tableName,
          configuredType
        };
      }) || [];

      console.log('✅ Fields processed:', processedFields.length, 'for table:', tableName);
      setDataFields(processedFields);
      return processedFields;
    } catch (error: any) {
      console.error('❌ Error loading fields:', error);
      toast.error(`Erro ao carregar campos: ${error.message}`);
      setDataFields([]);
      return [];
    } finally {
      setIsLoadingFields(false);
    }
  };

  // Test connection
  const testConnection = async (connection: DataConnection) => {
    try {
      const testConfig = {
        connectionType: connection.connection_type,
        config: {}
      };

      if (connection.connection_type === 'postgresql') {
        testConfig.config = {
          host: connection.host,
          port: connection.port,
          database_name: connection.database_name,
          username: connection.username,
          password: (connection as any).encrypted_password,
          ssl_enabled: connection.ssl_enabled
        };
      } else if (connection.connection_type === 'supabase') {
        testConfig.config = {
          supabase_url: connection.connection_config?.url,
          anon_key: connection.connection_config?.anon_key,
          service_key: connection.connection_config?.service_key
        };
      } else if (connection.connection_type === 'rest_api') {
        testConfig.config = {
          base_url: connection.connection_config?.base_url,
          bearer_token: connection.connection_config?.bearer_token,
          api_key: connection.connection_config?.api_key,
          header_name: connection.connection_config?.header_name
        };
      }

      const { data, error } = await supabase.functions.invoke('test-connection', {
        body: testConfig
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Conexão bem-sucedida com ${connection.name}`);
        return true;
      } else {
        throw new Error(data?.error || data?.message || 'Teste de conexão falhou');
      }
    } catch (error: any) {
      console.error('❌ Connection test error:', error);
      toast.error(`Falha na conexão: ${error.message}`);
      return false;
    }
  };

  // Execute query
  const executeQuery = async (connectionId: string, query: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('execute-sql-query', {
        body: {
          connectionId,
          sqlQuery: query
        }
      });

      if (error) throw error;

      if (data?.success) {
        return {
          data: data.data,
          rowCount: data.rowCount,
          columns: data.columns
        };
      } else {
        throw new Error(data?.error || 'Falha na execução da query');
      }
    } catch (error: any) {
      console.error('❌ Query execution error:', error);
      toast.error(`Erro na query: ${error.message}`);
      throw error;
    }
  };

  return {
    connections,
    tables,
    dataFields,
    isLoading,
    isLoadingFields,
    loadConnections,
    loadTables,
    loadTableFields,
    testConnection,
    executeQuery
  };
}