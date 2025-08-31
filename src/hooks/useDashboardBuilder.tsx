import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Widget {
  id: number;
  type: 'scorecard' | 'bar' | 'line' | 'pie' | 'filter' | 'table';
  config: any;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  style?: any;
}

interface DataField {
  id: string;
  name: string;
  type: 'dimension' | 'metric' | 'time_dimension';
  dataType: string;
  table: string;
  configuredType?: 'text' | 'number' | 'date' | 'datetime' | 'boolean';
}

export function useDashboardBuilder() {
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: 1,
      type: 'scorecard',
      config: { 
        metrics: ['vendas'],
        aggregation: 'sum'
      },
      layout: { x: 1, y: 1, w: 3, h: 2 }
    },
    {
      id: 2,
      type: 'bar',
      config: { 
        dimensions: ['pais'],
        metrics: ['vendas'],
        aggregation: 'sum'
      },
      layout: { x: 5, y: 1, w: 6, h: 4 }
    }
  ]);

  const [selectedWidget, setSelectedWidget] = useState<number | null>(null);

  const addWidget = useCallback((type: Widget['type']) => {
    const newWidget: Widget = {
      id: Date.now(),
      type,
      config: {},
      layout: { x: 0, y: 0, w: 4, h: 3 }
    };
    setWidgets(prev => [...prev, newWidget]);
    setSelectedWidget(newWidget.id);
    toast.success(`Widget ${type} adicionado`);
  }, []);

  const removeWidget = useCallback((widgetId: number) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    if (selectedWidget === widgetId) {
      setSelectedWidget(null);
    }
    toast.success('Widget removido');
  }, [selectedWidget]);

  const updateWidget = useCallback((widgetId: number, updates: Partial<Widget>) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, ...updates } : w
    ));
  }, []);

  const updateWidgetConfig = useCallback((widgetId: number, configUpdates: any) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId 
        ? { ...w, config: { ...w.config, ...configUpdates } }
        : w
    ));
  }, []);

  const updateWidgetLayout = useCallback((layouts: any[]) => {
    setWidgets(prev => prev.map(widget => {
      const newLayout = layouts.find(l => l.i === widget.id.toString());
      return newLayout ? { ...widget, layout: newLayout } : widget;
    }));
  }, []);

  const processDataForWidget = useCallback(async (widget: Widget, mockData: any, selectedDataSource: string, selectedTable: string, dataFields: DataField[], startDate?: Date, endDate?: Date): Promise<any> => {
    console.log('🔄 Processing data for widget:', widget.type, widget.config);
    
    const isUsingMockData = selectedDataSource === 'Vendas Globais';

    if (!selectedDataSource || (!isUsingMockData && !selectedTable)) {
      console.log('⚠️ No data source or table selected, using mock data');
      return generateMockData(widget.type);
    }

    if (widget.type === 'scorecard') {
      return await processScorecard(widget, mockData, selectedDataSource, selectedTable, dataFields, startDate, endDate, isUsingMockData);
    } else if (widget.type === 'bar') {
      return await processBarChart(widget, mockData, selectedDataSource, selectedTable, dataFields, startDate, endDate, isUsingMockData);
    }

    return generateMockData(widget.type);
  }, []);

  const processScorecard = async (widget: Widget, mockData: any, selectedDataSource: string, selectedTable: string, dataFields: DataField[], startDate?: Date, endDate?: Date, isUsingMockData = true) => {
    const metrics = Array.isArray(widget.config.metrics) ? widget.config.metrics : 
                    typeof widget.config.metrics === 'string' ? [widget.config.metrics] :
                    widget.config.metric ? [widget.config.metric] : [];
    
    if (metrics.length === 0) return { value: 0, label: 'Selecione uma métrica' };
    
    const metric = metrics[0];
    const aggregation = widget.config.aggregation || 'sum';
    
    if (isUsingMockData) {
      const source = mockData[selectedDataSource];
      if (!source || !source.records) {
        return { value: 0, label: 'Dados não encontrados' };
      }
      
      let filteredRecords = source.records;
      if (startDate || endDate) {
        filteredRecords = source.records.filter((record: any) => {
          if (!record.data) return true;
          const recordDate = new Date(record.data);
          if (startDate && recordDate < startDate) return false;
          if (endDate && recordDate > endDate) return false;
          return true;
        });
      }
      
      const field = dataFields.find(f => f.id === metric);
      const metricName = field?.name || metric;
      let result = 0;
      
      switch (aggregation) {
        case 'sum':
          result = filteredRecords.reduce((sum: number, record: any) => sum + (record[metric] || 0), 0);
          break;
        case 'count':
          result = filteredRecords.length;
          break;
        case 'count_distinct':
          result = new Set(filteredRecords.map(record => record[metric])).size;
          break;
        case 'avg':
          result = filteredRecords.reduce((sum: number, record: any) => sum + (record[metric] || 0), 0) / filteredRecords.length;
          break;
        case 'min':
          result = Math.min(...filteredRecords.map(record => record[metric] || 0));
          break;
        case 'max':
          result = Math.max(...filteredRecords.map(record => record[metric] || 0));
          break;
      }
      
      return { 
        label: `${metricName} (${aggregation})`, 
        value: Math.round(result * 100) / 100 
      };
    } else {
      // For real database connections
      try {
        const { data, error } = await supabase.functions.invoke('query-database', {
          body: {
            connectionId: selectedDataSource,
            tableName: selectedTable,
            metrics: [metric],
            aggregation,
            limit: 1
          }
        });

        if (error) throw error;

        if (data?.success && data?.data) {
          const result = data.data[0];
          const field = dataFields.find(f => f.id === metric);
          const metricName = field?.name || metric;
          const value = result[`${metric}_${aggregation}`] || 0;
          
          return {
            label: `${metricName} (${aggregation})`,
            value: Math.round(value * 100) / 100
          };
        }
      } catch (error: any) {
        console.error('❌ Real scorecard data error:', error);
        toast.error(`Erro ao carregar dados: ${error.message}`);
      }
    }

    return { value: 0, label: 'Erro ao carregar dados' };
  };

  const processBarChart = async (widget: Widget, mockData: any, selectedDataSource: string, selectedTable: string, dataFields: DataField[], startDate?: Date, endDate?: Date, isUsingMockData = true) => {
    const dimensions = widget.config.dimensions || [];
    const metrics = widget.config.metrics || [];
    
    if (dimensions.length === 0 || metrics.length === 0) {
      return { labels: [], values: [], metricName: 'Configure dimensões e métricas' };
    }

    if (isUsingMockData) {
      const source = mockData[selectedDataSource];
      if (!source || !source.records) {
        return { labels: [], values: [], metricName: 'Dados não encontrados' };
      }

      let filteredRecords = source.records;
      if (startDate || endDate) {
        filteredRecords = source.records.filter((record: any) => {
          if (!record.data) return true;
          const recordDate = new Date(record.data);
          if (startDate && recordDate < startDate) return false;
          if (endDate && recordDate > endDate) return false;
          return true;
        });
      }

      const dimension = dimensions[0];
      const metric = metrics[0];
      const aggregation = widget.config.aggregation || 'sum';

      const grouped = filteredRecords.reduce((acc: any, record: any) => {
        const key = record[dimension] || 'Não definido';
        if (!acc[key]) acc[key] = [];
        acc[key].push(record[metric] || 0);
        return acc;
      }, {});

      const labels = Object.keys(grouped);
      const values = labels.map(label => {
        const values = grouped[label];
        switch (aggregation) {
          case 'sum':
            return values.reduce((sum: number, val: number) => sum + val, 0);
          case 'avg':
            return values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
          case 'count':
            return values.length;
          case 'min':
            return Math.min(...values);
          case 'max':
            return Math.max(...values);
          default:
            return values.reduce((sum: number, val: number) => sum + val, 0);
        }
      });

      const field = dataFields.find(f => f.id === metric);
      const metricName = field?.name || metric;

      return { labels, values, metricName };
    } else {
      // For real database connections
      try {
        const { data, error } = await supabase.functions.invoke('query-database', {
          body: {
            connectionId: selectedDataSource,
            tableName: selectedTable,
            dimensions,
            metrics,
            aggregation: widget.config.aggregation || 'sum',
            groupBy: dimensions,
            orderBy: [{ field: dimensions[0], direction: 'asc' }]
          }
        });

        if (error) throw error;

        if (data?.success && data?.data) {
          const results = data.data;
          const dimension = dimensions[0];
          const metric = metrics[0];
          const aggregation = widget.config.aggregation || 'sum';

          const labels = results.map((row: any) => row[dimension] || 'Não definido');
          const values = results.map((row: any) => row[`${metric}_${aggregation}`] || 0);
          
          const field = dataFields.find(f => f.id === metric);
          const metricName = field?.name || metric;

          return { labels, values, metricName };
        }
      } catch (error: any) {
        console.error('❌ Real bar chart data error:', error);
        toast.error(`Erro ao carregar dados: ${error.message}`);
      }
    }

    return { labels: [], values: [], metricName: 'Erro ao carregar dados' };
  };

  const generateMockData = (type: string) => {
    switch (type) {
      case 'scorecard':
        return { label: 'Vendas Total', value: 11150 };
      case 'bar':
        return {
          labels: ['Brasil', 'EUA', 'Alemanha'],
          values: [2600, 4900, 3650],
          metricName: 'Vendas'
        };
      default:
        return {};
    }
  };

  const saveDashboard = async (dashboardName: string, permissions: any, userId: string, accountId: string) => {
    if (!permissions?.canCreateCharts) {
      toast.error("Você não tem permissão para salvar dashboards");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('dashboards')
        .insert({
          name: dashboardName,
          org_id: accountId,
          created_by: userId,
          layout_config: {
            widgets: widgets.map(w => ({
              id: w.id,
              type: w.type,
              config: w.config,
              layout: w.layout,
              style: w.style
            }))
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Dashboard "${dashboardName}" salvo com sucesso!`);
      return true;
    } catch (error: any) {
      console.error('❌ Error saving dashboard:', error);
      toast.error(`Erro ao salvar dashboard: ${error.message}`);
      return false;
    }
  };

  return {
    widgets,
    selectedWidget,
    setSelectedWidget,
    addWidget,
    removeWidget,
    updateWidget,
    updateWidgetConfig,
    updateWidgetLayout,
    processDataForWidget,
    saveDashboard
  };
}