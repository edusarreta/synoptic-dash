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
      
      const { data, error } = await supabase.functions.invoke('datasets-list', {
        body: { org_id, workspace_id }
      });

      if (error) {
        console.error('Error fetching datasets:', error);
        throw error;
      }

      console.log('Datasets fetched:', data?.total || 0);
      return data;
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
        console.error('Error fetching dataset preview:', error);
        throw error;
      }

      console.log('Dataset preview fetched:', data?.columns?.length || 0, 'columns');
      return data;
    },
    enabled: !!dataset_id && !!org_id,
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}