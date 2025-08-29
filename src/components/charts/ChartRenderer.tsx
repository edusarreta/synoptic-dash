import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartConfig {
  type: 'table' | 'bar' | 'line' | 'pie' | 'kpi';
  title: string;
  description?: string;
  xAxis?: string;
  yAxis?: string[];
  data: any[];
}

interface ChartRendererProps {
  config: ChartConfig;
  className?: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export function ChartRenderer({ config, className }: ChartRendererProps) {
  const processedData = useMemo(() => {
    if (!config.data || config.data.length === 0) return [];
    
    // For KPI charts, we need to aggregate the data
    if (config.type === 'kpi' && config.yAxis?.[0]) {
      const values = config.data.map(row => parseFloat(row[config.yAxis![0]]) || 0);
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = sum / values.length;
      const count = values.length;
      
      return {
        value: sum,
        average: avg,
        count: count,
        label: config.yAxis[0]
      };
    }
    
    return config.data;
  }, [config.data, config.type, config.yAxis]);

  const renderChart = () => {
    switch (config.type) {
      case 'table':
        return (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-muted">
                  {config.data.length > 0 && Object.keys(config.data[0]).map((key) => (
                    <th key={key} className="text-left p-2 font-medium text-muted-foreground">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.data.map((row, index) => (
                  <tr key={index} className="border-b border-muted/30">
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex} className="p-2 text-foreground">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={config.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey={config.xAxis} 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              {config.yAxis?.map((yKey, index) => (
                <Bar 
                  key={yKey} 
                  dataKey={yKey} 
                  fill={COLORS[index % COLORS.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={config.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey={config.xAxis} 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              {config.yAxis?.map((yKey, index) => (
                <Line 
                  key={yKey} 
                  type="monotone" 
                  dataKey={yKey} 
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = config.data.map((row) => ({
          name: row[config.xAxis || Object.keys(row)[0]],
          value: parseFloat(row[config.yAxis?.[0] || Object.keys(row)[1]]) || 0
        }));

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'kpi':
        const kpiData = processedData as any;
        return (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {kpiData.value?.toLocaleString() || '0'}
              </div>
              <div className="text-lg text-muted-foreground">
                {kpiData.label || 'Total'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Average</div>
                <div className="text-lg font-semibold">
                  {kpiData.average?.toFixed(2) || '0'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Count</div>
                <div className="text-lg font-semibold">
                  {kpiData.count || '0'}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            Unsupported chart type
          </div>
        );
    }
  };

  return (
    <Card className={`glass-card border-0 shadow-card ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg">{config.title}</CardTitle>
        {config.description && (
          <CardDescription>{config.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {config.data && config.data.length > 0 ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}