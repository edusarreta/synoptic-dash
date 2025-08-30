import { useCallback } from 'react';
import { useRealTimeData } from './useRealTimeData';

interface Widget {
  id: number;
  type: 'scorecard' | 'bar' | 'line' | 'pie' | 'filter' | 'table';
  config: {
    dimension?: string;
    metric?: string;
    dimensions?: string[];
    metrics?: string[];
    timeDimension?: string;
    chartType?: string;
    aggregation?: string;
  };
}

interface DataField {
  id: string;
  name: string;
  type: 'dimension' | 'metric' | 'time_dimension';
  dataType: string;
  table: string;
}

const MOCK_DATA = {
  'Vendas Globais': {
    records: [
      { pais: 'Brasil', categoria: 'Eletrônicos', vendas: 1200, lucro: 250, unidades: 50, data: '2024-01-01' },
      { pais: 'Brasil', categoria: 'Móveis', vendas: 800, lucro: 150, unidades: 20, data: '2024-01-02' },
      { pais: 'EUA', categoria: 'Eletrônicos', vendas: 2500, lucro: 500, unidades: 100, data: '2024-01-03' },
      { pais: 'EUA', categoria: 'Móveis', vendas: 1500, lucro: 300, unidades: 40, data: '2024-01-04' },
      { pais: 'Alemanha', categoria: 'Eletrônicos', vendas: 1800, lucro: 400, unidades: 80, data: '2024-01-05' },
      { pais: 'Alemanha', categoria: 'Móveis', vendas: 1100, lucro: 220, unidades: 35, data: '2024-01-06' },
    ]
  }
};

export function useWidgetData() {
  const { queryData, loading, error } = useRealTimeData();

  const generateMockData = useCallback((widgetType: string): any => {
    switch (widgetType) {
      case 'scorecard':
        return {
          value: Math.floor(Math.random() * 10000) + 1000,
          label: 'Mock Metric'
        };
      case 'bar':
      case 'line':
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [{
            label: 'Mock Data',
            data: Array.from({ length: 5 }, () => Math.floor(Math.random() * 1000) + 100),
            backgroundColor: 'hsl(var(--primary))',
            borderColor: 'hsl(var(--primary))',
            borderWidth: 2
          }]
        };
      case 'pie':
        return {
          labels: ['A', 'B', 'C', 'D'],
          datasets: [{
            data: Array.from({ length: 4 }, () => Math.floor(Math.random() * 500) + 100),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
            borderWidth: 1
          }]
        };
      case 'table':
        return Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `Item ${i + 1}`,
          value: Math.floor(Math.random() * 1000) + 100
        }));
      default:
        return {};
    }
  }, []);

  const processWidgetData = useCallback(async (
    widget: Widget, 
    selectedDataSource: string,
    selectedTable: string,
    dataFields: DataField[],
    startDate?: Date,
    endDate?: Date
  ): Promise<any> => {
    console.log('🔄 Processing widget data:', widget.type, widget.config);

    const isUsingMockData = selectedDataSource === 'Vendas Globais';

    if (!selectedDataSource || (!isUsingMockData && !selectedTable)) {
      console.log('⚠️ No data source selected, using mock data');
      return generateMockData(widget.type);
    }

    // Handle mock data
    if (isUsingMockData) {
      return processMockData(widget, dataFields, startDate, endDate);
    }

    // Handle real data
    try {
      const queryParams = {
        connectionId: selectedDataSource,
        tableName: selectedTable,
        metrics: widget.config.metrics || [],
        dimensions: widget.config.dimensions || [],
        aggregation: widget.config.aggregation || 'sum',
        limit: 1000
      };

      const data = await queryData(queryParams);
      return processRealData(widget, data, dataFields);

    } catch (error: any) {
      console.error('❌ Error processing real data, falling back to mock:', error);
      return generateMockData(widget.type);
    }
  }, [queryData, generateMockData]);

  const processMockData = useCallback((
    widget: Widget,
    dataFields: DataField[],
    startDate?: Date,
    endDate?: Date
  ): any => {
    const source = MOCK_DATA['Vendas Globais'];
    let filteredRecords = source.records;

    // Apply date filter if specified
    if (startDate || endDate) {
      filteredRecords = source.records.filter((record: any) => {
        if (!record.data) return true;
        const recordDate = new Date(record.data);
        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
        return true;
      });
    }

    if (widget.type === 'scorecard') {
      const metrics = widget.config.metrics || [];
      if (metrics.length === 0) return { value: 0, label: 'Selecione uma métrica' };
      
      const metric = metrics[0];
      const aggregation = widget.config.aggregation || 'sum';
      const field = dataFields.find(f => f.id === metric);
      
      let result = 0;
      switch (aggregation) {
        case 'sum':
          result = filteredRecords.reduce((sum: number, record: any) => sum + (record[metric] || 0), 0);
          break;
        case 'count':
          result = filteredRecords.length;
          break;
        case 'avg':
          result = filteredRecords.reduce((sum: number, record: any) => sum + (record[metric] || 0), 0) / filteredRecords.length;
          break;
        case 'min':
          result = Math.min(...filteredRecords.map((record: any) => record[metric] || 0));
          break;
        case 'max':
          result = Math.max(...filteredRecords.map((record: any) => record[metric] || 0));
          break;
      }
      
      return {
        value: Math.round(result * 100) / 100,
        label: field?.name || metric
      };
    }

    if (widget.type === 'bar' || widget.type === 'line') {
      const dimensions = widget.config.dimensions || [];
      const metrics = widget.config.metrics || [];
      
      if (dimensions.length === 0 || metrics.length === 0) {
        return generateMockData(widget.type);
      }
      
      const dimension = dimensions[0];
      const metric = metrics[0];
      
      // Group by dimension and aggregate metric
      const grouped = filteredRecords.reduce((acc: any, record: any) => {
        const key = record[dimension] || 'N/A';
        if (!acc[key]) acc[key] = [];
        acc[key].push(record[metric] || 0);
        return acc;
      }, {});
      
      const labels = Object.keys(grouped);
      const values = labels.map(label => {
        const groupValues = grouped[label];
        switch (widget.config.aggregation) {
          case 'count': return groupValues.length;
          case 'avg': return groupValues.reduce((a: number, b: number) => a + b, 0) / groupValues.length;
          case 'min': return Math.min(...groupValues);
          case 'max': return Math.max(...groupValues);
          default: return groupValues.reduce((a: number, b: number) => a + b, 0); // sum
        }
      });
      
      return {
        labels,
        datasets: [{
          label: dataFields.find(f => f.id === metric)?.name || metric,
          data: values,
          backgroundColor: 'hsl(var(--primary))',
          borderColor: 'hsl(var(--primary))',
          borderWidth: 2
        }]
      };
    }

    if (widget.type === 'table') {
      return filteredRecords.slice(0, 10);
    }

    return generateMockData(widget.type);
  }, [generateMockData]);

  const processRealData = useCallback((
    widget: Widget,
    data: any[],
    dataFields: DataField[]
  ): any => {
    if (!data || data.length === 0) {
      return generateMockData(widget.type);
    }

    if (widget.type === 'scorecard') {
      const metrics = widget.config.metrics || [];
      if (metrics.length === 0) return { value: 0, label: 'Selecione uma métrica' };
      
      const metric = metrics[0];
      const aggregatedField = `${metric}_${widget.config.aggregation || 'sum'}`;
      const value = data[0]?.[aggregatedField] || data[0]?.[metric] || 0;
      
      return {
        value: Number(value),
        label: dataFields.find(f => f.id === metric)?.name || metric
      };
    }

    if (widget.type === 'bar' || widget.type === 'line') {
      const dimensions = widget.config.dimensions || [];
      const metrics = widget.config.metrics || [];
      
      if (dimensions.length === 0 || metrics.length === 0) {
        return generateMockData(widget.type);
      }
      
      const dimension = dimensions[0];
      const metric = metrics[0];
      const aggregatedField = `${metric}_${widget.config.aggregation || 'sum'}`;
      
      return {
        labels: data.map(row => row[dimension] || 'N/A'),
        datasets: [{
          label: dataFields.find(f => f.id === metric)?.name || metric,
          data: data.map(row => Number(row[aggregatedField] || row[metric] || 0)),
          backgroundColor: 'hsl(var(--primary))',
          borderColor: 'hsl(var(--primary))',
          borderWidth: 2
        }]
      };
    }

    if (widget.type === 'table') {
      return data.slice(0, 10);
    }

    return generateMockData(widget.type);
  }, [generateMockData]);

  return {
    processWidgetData,
    loading,
    error
  };
}