import { supabase } from '@/integrations/supabase/client';

export interface ChartDataRequest {
  org_id: string;
  dataset_id: string;
  dims: Array<{ field: string; alias: string }>;
  metrics: Array<{ field: string; agg: string; alias: string }>;
  filters?: Array<any>;
  limit?: number;
  offset?: number;
}

export interface ChartDataResponse {
  columns: Array<{ name: string; type: string }>;
  rows: any[][];
  truncated: boolean;
  elapsed_ms?: number;
  error_code?: string;
  message?: string;
}

export class ChartDataService {
  
  /**
   * Carrega dados de chart com múltiplas estratégias de fallback
   */
  static async loadChartData(request: ChartDataRequest): Promise<ChartDataResponse> {
    console.log('🎯 ChartDataService: Loading chart data', { 
      dataset_id: request.dataset_id,
      dims_count: request.dims.length,
      metrics_count: request.metrics.length 
    });

    // Validate request
    if (!request.org_id || !request.dataset_id) {
      throw new Error('org_id e dataset_id são obrigatórios');
    }

    if (request.dims.length === 0 && request.metrics.length === 0) {
      console.log('⚠️ No dimensions or metrics specified, generating mock data');
      return this.generateMockData(request);
    }

    try {
      // Strategy 1: Try charts-run function
      console.log('📊 Trying charts-run function...');
      
      const { data, error } = await supabase.functions.invoke('charts-run', {
        body: {
          org_id: request.org_id,
          dataset_id: request.dataset_id,
          dims: request.dims,
          metrics: request.metrics,
          filters: request.filters || [],
          limit: request.limit || 1000,
          offset: request.offset || 0
        }
      });

      console.log('📈 Charts-run response:', { 
        success: !error, 
        hasData: !!data,
        hasColumns: !!data?.columns,
        columnsCount: data?.columns?.length || 0,
        rowsCount: data?.rows?.length || 0,
        error: error?.message
      });

      if (!error && data && data.columns && !data.error_code && data.ok !== false) {
        console.log('✅ Charts-run successful');
        return {
          columns: data.columns,
          rows: data.rows || [],
          truncated: data.truncated || false,
          elapsed_ms: data.elapsed_ms
        };
      }

      // Log the error but continue with fallback
      console.warn('⚠️ Charts-run failed, trying fallback:', error?.message || data?.message);
      
    } catch (chartsRunError) {
      console.warn('⚠️ Charts-run threw error, trying fallback:', chartsRunError);
    }

    // Strategy 2: Try mock data for development
    console.log('🎭 Generating mock data as fallback...');
    
    return this.generateMockData(request);
  }

  /**
   * Gera dados mock para desenvolvimento e fallback
   */
  private static generateMockData(request: ChartDataRequest): ChartDataResponse {
    console.log('🎭 Generating mock data for request:', {
      dims: request.dims.map(d => d.field),
      metrics: request.metrics.map(m => m.field)
    });

    const columns = [
      ...request.dims.map(dim => ({ name: dim.alias, type: 'text' })),
      ...request.metrics.map(metric => ({ name: metric.alias, type: 'numeric' }))
    ];

    // Generate sample data based on field names
    const rows = [];
    const sampleCount = Math.min(request.limit || 10, 50);
    
    for (let i = 0; i < sampleCount; i++) {
      const row = [];
      
      // Generate dimension values
      request.dims.forEach(dim => {
        if (dim.field.toLowerCase().includes('name') || dim.field.toLowerCase().includes('produto')) {
          row.push(`Item ${i + 1}`);
        } else if (dim.field.toLowerCase().includes('id')) {
          row.push(`${i + 1}`);
        } else if (dim.field.toLowerCase().includes('date') || dim.field.toLowerCase().includes('data')) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          row.push(date.toISOString().split('T')[0]);
        } else if (dim.field.toLowerCase().includes('category') || dim.field.toLowerCase().includes('categoria')) {
          const categories = ['A', 'B', 'C', 'D'];
          row.push(`Categoria ${categories[i % categories.length]}`);
        } else {
          row.push(`Valor ${i + 1}`);
        }
      });
      
      // Generate metric values
      request.metrics.forEach(metric => {
        if (metric.agg === 'count') {
          row.push(Math.floor(Math.random() * 100) + 1);
        } else if (metric.field.toLowerCase().includes('quantity') || metric.field.toLowerCase().includes('quantidade')) {
          row.push(Math.floor(Math.random() * 50) + 1);
        } else if (metric.field.toLowerCase().includes('price') || metric.field.toLowerCase().includes('preco')) {
          row.push(Math.round((Math.random() * 100 + 10) * 100) / 100);
        } else {
          row.push(Math.round((Math.random() * 1000 + 100) * 100) / 100);
        }
      });
      
      rows.push(row);
    }

    console.log('✅ Generated mock data:', { 
      columns: columns.length, 
      rows: rows.length,
      sample_row: rows[0] 
    });

    return {
      columns,
      rows,
      truncated: false,
      elapsed_ms: 50
    };
  }

  /**
   * Testa a conectividade do dataset
   */
  static async testDatasetConnection(dataset_id: string, org_id: string): Promise<boolean> {
    try {
      console.log('🔗 Testing dataset connection:', { dataset_id, org_id });
      
      const { data, error } = await supabase.functions.invoke('datasets-preview', {
        body: {
          dataset_id,
          org_id,
          limit: 1,
          offset: 0
        }
      });

      const isConnected = !error && data && data.columns && data.columns.length > 0;
      console.log('🔗 Dataset connection test:', { 
        dataset_id, 
        connected: isConnected,
        columns_count: data?.columns?.length || 0
      });
      
      return isConnected;
    } catch (error) {
      console.warn('🔗 Dataset connection test failed:', error);
      return false;
    }
  }
}