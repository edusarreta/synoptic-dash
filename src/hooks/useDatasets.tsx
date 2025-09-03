import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  columns: Array<{ name: string; type: string }>;
  created_at: string;
  sql_query: string;
  connection_id: string;
  type: 'dataset' | 'saved_query';
  source_type: string;
}

export function useDatasets(org_id?: string, workspace_id?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['datasets', org_id, workspace_id],
    queryFn: async () => {
      if (!org_id) {
        console.log('No org_id provided, skipping datasets fetch');
        return { items: [], total: 0 };
      }

      console.log('Fetching datasets for org_id:', org_id, 'workspace_id:', workspace_id);
      
      try {
        // Try edge function first
        const { data, error } = await supabase.functions.invoke('datasets-list', {
          body: { org_id, workspace_id }
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch datasets via function');
        }

        console.log('Datasets fetched via function:', data?.total || 0);
        return data;
      } catch (error) {
        console.warn('Edge function failed, falling back to direct query:', error);
        
        // Fallback to direct Supabase query
        let datasetsQuery = supabase
          .from('datasets')
          .select('id, name, description, columns, created_at, sql_query, connection_id, source_type')
          .eq('org_id', org_id)
          .order('created_at', { ascending: false });

        if (workspace_id) {
          datasetsQuery = datasetsQuery.eq('workspace_id', workspace_id);
        }

        const [datasetsResult, savedQueriesResult] = await Promise.all([
          datasetsQuery,
          supabase
            .from('saved_queries')
            .select('id, name, description, created_at, sql_query, connection_id')
            .eq('org_id', org_id)
            .order('created_at', { ascending: false })
        ]);

        if (datasetsResult.error) throw datasetsResult.error;
        if (savedQueriesResult.error) throw savedQueriesResult.error;

        const datasets = (datasetsResult.data || []).map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          columns: item.columns || [],
          created_at: item.created_at,
          sql_query: item.sql_query,
          connection_id: item.connection_id,
          type: 'dataset' as const,
          source_type: item.source_type || 'sql'
        }));

        const savedQueries = (savedQueriesResult.data || []).map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          columns: [],
          created_at: item.created_at,
          sql_query: item.sql_query,
          connection_id: item.connection_id,
          type: 'saved_query' as const,
          source_type: 'sql'
        }));

        const items = [...datasets, ...savedQueries];
        console.log('Datasets fetched via fallback:', items.length);
        return { items, total: items.length };
      }
    },
    enabled: !!org_id,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const invalidateDatasets = () => {
    queryClient.invalidateQueries({ queryKey: ['datasets'] });
  };

  return {
    datasets: data?.items || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch,
    invalidateDatasets
  };
}

export function useDatasetPreview(dataset_id?: string, org_id?: string, workspace_id?: string) {
  return useQuery({
    queryKey: ['dataset-preview', dataset_id, org_id, workspace_id],
    queryFn: async () => {
      if (!dataset_id || !org_id) {
        return null;
      }

      console.log('Fetching dataset preview for:', dataset_id);
      
      try {
        // Try edge function first
        const { data, error } = await supabase.functions.invoke('datasets-preview', {
          body: { 
            dataset_id, 
            org_id,
            workspace_id,
            limit: 100, 
            offset: 0 
          }
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch dataset preview via function');
        }

        console.log('Dataset preview fetched via function:', data?.columns?.length || 0, 'columns');
        return data;
      } catch (error) {
        console.warn('Edge function failed for preview, falling back to direct query:', error);
        
        // Fallback: get dataset info directly from database
        const { data: dataset, error: datasetError } = await supabase
          .from('datasets')
          .select('*')
          .eq('id', dataset_id)
          .eq('org_id', org_id)
          .single();

        if (datasetError || !dataset) {
          throw new Error('Dataset not found');
        }

        // Return basic dataset info - for actual data preview we'd need to execute the SQL
        // For now, just return the structure
        return {
          columns: dataset.columns || [],
          rows: [],
          truncated: false,
          dataset: {
            id: dataset.id,
            name: dataset.name,
            created_at: dataset.created_at
          }
        };
      }
    },
    enabled: !!dataset_id && !!org_id,
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}