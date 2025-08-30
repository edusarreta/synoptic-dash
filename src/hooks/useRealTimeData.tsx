import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DataQueryParams {
  connectionId: string;
  tableName: string;
  metrics?: string[];
  dimensions?: string[];
  aggregation?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  limit?: number;
}

interface DataCache {
  [key: string]: {
    data: any;
    timestamp: number;
    expires: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useRealTimeData() {
  const [cache, setCache] = useState<DataCache>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCacheKey = useCallback((params: DataQueryParams): string => {
    return JSON.stringify({
      connectionId: params.connectionId,
      tableName: params.tableName,
      metrics: params.metrics?.sort(),
      dimensions: params.dimensions?.sort(),
      aggregation: params.aggregation,
      filters: params.filters,
      limit: params.limit
    });
  }, []);

  const isValidCache = useCallback((cacheEntry: any): boolean => {
    return cacheEntry && cacheEntry.expires > Date.now();
  }, []);

  const queryData = useCallback(async (params: DataQueryParams): Promise<any> => {
    const cacheKey = getCacheKey(params);
    
    // Check cache first
    const cachedResult = cache[cacheKey];
    if (isValidCache(cachedResult)) {
      console.log('📦 Using cached data for:', params.tableName);
      return cachedResult.data;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching real data:', params);
      
      const { data: queryResult, error: queryError } = await supabase.functions.invoke('query-database', {
        body: params
      });

      if (queryError) {
        throw new Error(queryError.message || 'Query failed');
      }

      if (!queryResult?.success) {
        throw new Error(queryResult?.error || 'Query execution failed');
      }

      console.log('✅ Data fetched successfully:', queryResult.data?.length, 'rows');

      // Cache the result
      const result = queryResult.data || [];
      setCache(prev => ({
        ...prev,
        [cacheKey]: {
          data: result,
          timestamp: Date.now(),
          expires: Date.now() + CACHE_DURATION
        }
      }));

      return result;

    } catch (error: any) {
      console.error('❌ Data query error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [cache, getCacheKey, isValidCache]);

  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  const cacheStats = useMemo(() => {
    const entries = Object.values(cache);
    const validEntries = entries.filter(isValidCache);
    return {
      total: entries.length,
      valid: validEntries.length,
      expired: entries.length - validEntries.length
    };
  }, [cache, isValidCache]);

  return {
    queryData,
    loading,
    error,
    clearCache,
    cacheStats
  };
}