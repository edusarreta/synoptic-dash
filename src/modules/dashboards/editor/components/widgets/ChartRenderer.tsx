import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ChartConfig {
  type: 'table' | 'bar' | 'line' | 'area' | 'pie' | 'kpi';
  dimensions: string[];
  metrics: string[];
  aggregation: 'sum' | 'avg' | 'count' | 'count_distinct' | 'max' | 'min';
}

interface ChartRendererProps {
  data: any[];
  config: ChartConfig;
  loading?: boolean;
  error?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export function ChartRenderer({ data, config, loading, error }: ChartRendererProps) {
  if (loading) {
    return (
      <div className="p-4 text-muted-foreground flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
        Carregando gráfico...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 text-sm">
        Erro: {error}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="p-6 text-muted-foreground text-center">
        Sem dados para exibir
      </div>
    );
  }

  const processedData = processDataForChart(data, config);

  switch (config.type) {
    case 'kpi':
      return renderKPI(processedData, config);
    case 'pie':
      return renderPie(processedData, config);
    case 'bar':
      return renderBar(processedData, config);
    case 'line':
      return renderLine(processedData, config);
    case 'area':
      return renderArea(processedData, config);
    case 'table':
    default:
      return renderTable(processedData, config);
  }
}

function processDataForChart(data: any[], config: ChartConfig) {
  const { dimensions, metrics, aggregation } = config;

  if (dimensions.length === 0) {
    // KPI - aggregate all data
    const result: any = {};
    metrics.forEach(metric => {
      const values = data.map(row => parseFloat(row[metric]) || 0);
      switch (aggregation) {
        case 'sum':
          result[metric] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result[metric] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'count':
          result[metric] = values.length;
          break;
        case 'count_distinct':
          result[metric] = new Set(values).size;
          break;
        case 'max':
          result[metric] = Math.max(...values);
          break;
        case 'min':
          result[metric] = Math.min(...values);
          break;
      }
    });
    return [result];
  }

  // Group by dimensions
  const groups = new Map();
  
  data.forEach(row => {
    const key = dimensions.map(dim => row[dim]).join('|');
    if (!groups.has(key)) {
      const groupData: any = {};
      dimensions.forEach(dim => {
        groupData[dim] = row[dim];
      });
      metrics.forEach(metric => {
        groupData[metric] = [];
      });
      groups.set(key, groupData);
    }
    
    const group = groups.get(key);
    metrics.forEach(metric => {
      const value = parseFloat(row[metric]) || 0;
      group[metric].push(value);
    });
  });

  // Aggregate metrics for each group
  const result = Array.from(groups.values()).map(group => {
    const aggregated: any = {};
    
    dimensions.forEach(dim => {
      aggregated[dim] = group[dim];
    });
    
    metrics.forEach(metric => {
      const values = group[metric];
      switch (aggregation) {
        case 'sum':
          aggregated[metric] = values.reduce((a: number, b: number) => a + b, 0);
          break;
        case 'avg':
          aggregated[metric] = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
          break;
        case 'count':
          aggregated[metric] = values.length;
          break;
        case 'count_distinct':
          aggregated[metric] = new Set(values).size;
          break;
        case 'max':
          aggregated[metric] = values.length > 0 ? Math.max(...values) : 0;
          break;
        case 'min':
          aggregated[metric] = values.length > 0 ? Math.min(...values) : 0;
          break;
        default:
          aggregated[metric] = values.reduce((a: number, b: number) => a + b, 0);
      }
    });
    
    return aggregated;
  });

  return result;
}

function renderKPI(data: any[], config: ChartConfig) {
  const kpiData = data[0] || {};
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {config.metrics.map((metric, index) => (
        <Card key={metric}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(kpiData[metric] || 0)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function renderPie(data: any[], config: ChartConfig) {
  if (config.dimensions.length === 0 || config.metrics.length === 0) {
    return (
      <div className="p-4 text-muted-foreground text-center">
        Gráfico de pizza requer 1 dimensão e 1 métrica
      </div>
    );
  }

  const dimension = config.dimensions[0];
  const metric = config.metrics[0];
  
  const pieData = data.map((item, index) => ({
    name: item[dimension],
    value: item[metric],
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          dataKey="value"
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [formatNumber(value), metric]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function renderBar(data: any[], config: ChartConfig) {
  if (config.dimensions.length === 0) {
    return (
      <div className="p-4 text-muted-foreground text-center">
        Gráfico de barras requer pelo menos 1 dimensão
      </div>
    );
  }

  const xAxisKey = config.dimensions[0];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip formatter={(value) => formatNumber(value)} />
        <Legend />
        {config.metrics.map((metric, index) => (
          <Bar
            key={metric}
            dataKey={metric}
            fill={COLORS[index % COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function renderLine(data: any[], config: ChartConfig) {
  if (config.dimensions.length === 0) {
    return (
      <div className="p-4 text-muted-foreground text-center">
        Gráfico de linha requer pelo menos 1 dimensão
      </div>
    );
  }

  const xAxisKey = config.dimensions[0];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip formatter={(value) => formatNumber(value)} />
        <Legend />
        {config.metrics.map((metric, index) => (
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function renderArea(data: any[], config: ChartConfig) {
  if (config.dimensions.length === 0) {
    return (
      <div className="p-4 text-muted-foreground text-center">
        Gráfico de área requer pelo menos 1 dimensão
      </div>
    );
  }

  const xAxisKey = config.dimensions[0];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip formatter={(value) => formatNumber(value)} />
        <Legend />
        {config.metrics.map((metric, index) => (
          <Area
            key={metric}
            type="monotone"
            dataKey={metric}
            fill={COLORS[index % COLORS.length]}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function renderTable(data: any[], config: ChartConfig) {
  if (!data.length) return null;

  const columns = [...config.dimensions, ...config.metrics];
  
  return (
    <div className="overflow-auto max-h-64">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {columns.map(col => (
              <th key={col} className="text-left p-2 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 100).map((row, i) => (
            <tr key={i} className="border-b">
              {columns.map(col => (
                <td key={col} className="p-2">
                  {config.metrics.includes(col) ? formatNumber(row[col]) : row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 100 && (
        <div className="text-xs text-muted-foreground p-2 border-t">
          Mostrando 100 de {data.length} registros
        </div>
      )}
    </div>
  );
}

function formatNumber(value: any): string {
  const num = parseFloat(value);
  if (isNaN(num)) return String(value || '');
  
  if (num > 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num > 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else {
    return num.toLocaleString('pt-BR');
  }
}