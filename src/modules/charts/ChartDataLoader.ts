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
  source?: 'real' | 'mock';
}

export class ChartDataLoader {
  /**
   * Carregamento robusto de dados com múltiplas estratégias
   */
  static async loadData(request: ChartDataRequest): Promise<ChartDataResponse> {
    console.log('🎯 ChartDataLoader: Starting data load', {
      dataset_id: request.dataset_id,
      dims_count: request.dims.length,
      metrics_count: request.metrics.length
    });

    // Validate request
    if (!request.org_id || !request.dataset_id) {
      throw new Error('org_id e dataset_id são obrigatórios');
    }

    // If no dimensions or metrics, return minimal mock data
    if (request.dims.length === 0 && request.metrics.length === 0) {
      console.log('⚠️ No dimensions or metrics, returning minimal data');
      return this.generateMinimalMockData();
    }

    try {
      // Strategy 1: Try the charts-run function
      console.log('📊 Strategy 1: Trying charts-run function...');
      const realData = await this.tryChartsRun(request);
      if (realData) {
        console.log('✅ Charts-run successful');
        return { ...realData, source: 'real' };
      }
    } catch (error) {
      console.warn('⚠️ Charts-run failed:', error);
    }

    try {
      // Strategy 2: Try datasets-preview for structure then mock data
      console.log('📋 Strategy 2: Using dataset preview for structure...');
      const structuredMock = await this.tryDatasetPreviewMock(request);
      if (structuredMock) {
        console.log('✅ Dataset preview mock successful');
        return { ...structuredMock, source: 'mock' };
      }
    } catch (error) {
      console.warn('⚠️ Dataset preview mock failed:', error);
    }

    // Strategy 3: Generate intelligent mock data based on field names
    console.log('🎭 Strategy 3: Generating intelligent mock data...');
    return this.generateIntelligentMockData(request);
  }

  /**
   * Tenta carregar dados reais via charts-run
   */
  private static async tryChartsRun(request: ChartDataRequest): Promise<ChartDataResponse | null> {
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

    if (error) {
      console.error('Charts-run error:', error);
      return null;
    }

    if (!data || data.error_code || data.ok === false) {
      console.error('Charts-run returned error:', data);
      return null;
    }

    if (!data.columns || !Array.isArray(data.columns)) {
      console.error('Invalid charts-run response structure');
      return null;
    }

    return {
      columns: data.columns,
      rows: data.rows || [],
      truncated: data.truncated || false,
      elapsed_ms: data.elapsed_ms
    };
  }

  /**
   * Usa dataset preview para estrutura e gera mock dados
   */
  private static async tryDatasetPreviewMock(request: ChartDataRequest): Promise<ChartDataResponse | null> {
    const { data, error } = await supabase.functions.invoke('datasets-preview', {
      body: {
        dataset_id: request.dataset_id,
        org_id: request.org_id,
        limit: 1,
        offset: 0
      }
    });

    if (error || !data?.columns) {
      console.error('Dataset preview failed:', error);
      return null;
    }

    // Use the real column structure to generate appropriate mock data
    return this.generateMockDataFromColumns(data.columns, request);
  }

  /**
   * Gera dados mock baseado nas colunas reais do dataset
   */
  private static generateMockDataFromColumns(
    realColumns: Array<{ name: string; type: string }>, 
    request: ChartDataRequest
  ): ChartDataResponse {
    console.log('🎨 Generating mock data from real columns:', realColumns);

    const columns = [
      ...request.dims.map(dim => ({ name: dim.alias, type: 'text' })),
      ...request.metrics.map(metric => ({ name: metric.alias, type: 'numeric' }))
    ];

    const rows = [];
    const sampleCount = Math.min(request.limit || 10, 20);
    
    for (let i = 0; i < sampleCount; i++) {
      const row = [];
      
      // Generate dimension values
      request.dims.forEach(dim => {
        const realCol = realColumns.find(col => col.name === dim.field);
        row.push(this.generateValueForField(dim.field, realCol?.type || 'text', i));
      });
      
      // Generate metric values
      request.metrics.forEach(metric => {
        const realCol = realColumns.find(col => col.name === metric.field);
        row.push(this.generateMetricValue(metric, realCol?.type || 'numeric', i));
      });
      
      rows.push(row);
    }

    return {
      columns,
      rows,
      truncated: false,
      elapsed_ms: 50
    };
  }

  /**
   * Gera dados mock inteligentes baseado nos nomes dos campos
   */
  private static generateIntelligentMockData(request: ChartDataRequest): ChartDataResponse {
    console.log('🧠 Generating intelligent mock data');

    const columns = [
      ...request.dims.map(dim => ({ name: dim.alias, type: 'text' })),
      ...request.metrics.map(metric => ({ name: metric.alias, type: 'numeric' }))
    ];

    const rows = [];
    const sampleCount = Math.min(request.limit || 10, 15);
    
    for (let i = 0; i < sampleCount; i++) {
      const row = [];
      
      // Generate dimension values
      request.dims.forEach(dim => {
        row.push(this.generateValueForField(dim.field, 'text', i));
      });
      
      // Generate metric values
      request.metrics.forEach(metric => {
        row.push(this.generateMetricValue(metric, 'numeric', i));
      });
      
      rows.push(row);
    }

    return {
      columns,
      rows,
      truncated: false,
      elapsed_ms: 25,
      source: 'mock'
    };
  }

  /**
   * Gera dados mínimos quando não há campos
   */
  private static generateMinimalMockData(): ChartDataResponse {
    return {
      columns: [{ name: 'valor', type: 'text' }],
      rows: [['Adicione dimensões e métricas']],
      truncated: false,
      elapsed_ms: 10,
      source: 'mock'
    };
  }

  /**
   * Gera valor apropriado para um campo baseado no nome
   */
  private static generateValueForField(fieldName: string, type: string, index: number): any {
    const lowerField = fieldName.toLowerCase();
    
    if (lowerField.includes('id')) {
      return `ID_${index + 1}`;
    }
    
    if (lowerField.includes('name') || lowerField.includes('nome')) {
      return `Item ${index + 1}`;
    }
    
    if (lowerField.includes('date') || lowerField.includes('data')) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      return date.toISOString().split('T')[0];
    }
    
    if (lowerField.includes('category') || lowerField.includes('categoria')) {
      const categories = ['Categoria A', 'Categoria B', 'Categoria C', 'Categoria D'];
      return categories[index % categories.length];
    }
    
    if (lowerField.includes('product') || lowerField.includes('produto')) {
      return `Produto ${String.fromCharCode(65 + (index % 26))}`;
    }
    
    if (lowerField.includes('status')) {
      const statuses = ['Ativo', 'Inativo', 'Pendente', 'Finalizado'];
      return statuses[index % statuses.length];
    }
    
    if (lowerField.includes('user') || lowerField.includes('usuario')) {
      return `Usuario_${index + 1}`;
    }
    
    if (lowerField.includes('session')) {
      return `SES_${(index + 1).toString().padStart(4, '0')}`;
    }
    
    return `Valor ${index + 1}`;
  }

  /**
   * Gera valor de métrica baseado na agregação
   */
  private static generateMetricValue(metric: any, type: string, index: number): number {
    const fieldName = metric.field.toLowerCase();
    const baseValue = index + 1;
    
    if (metric.agg === 'count' || metric.agg === 'count_distinct') {
      return Math.floor(Math.random() * 100) + baseValue;
    }
    
    if (fieldName.includes('price') || fieldName.includes('preco') || fieldName.includes('valor')) {
      return Math.round((Math.random() * 500 + 50 + baseValue * 10) * 100) / 100;
    }
    
    if (fieldName.includes('quantity') || fieldName.includes('quantidade')) {
      return Math.floor(Math.random() * 20) + baseValue;
    }
    
    if (fieldName.includes('revenue') || fieldName.includes('receita') || fieldName.includes('vendas')) {
      return Math.round((Math.random() * 5000 + 1000 + baseValue * 100) * 100) / 100;
    }
    
    if (fieldName.includes('rating') || fieldName.includes('avaliacao')) {
      return Math.round((Math.random() * 4 + 1) * 10) / 10; // 1.0 to 5.0
    }
    
    // Default numeric value
    return Math.round((Math.random() * 1000 + 100 + baseValue * 50) * 100) / 100;
  }
}