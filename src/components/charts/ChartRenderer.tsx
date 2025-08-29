import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Scatter,
  ScatterChart,
  RadialBarChart,
  RadialBar,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChartConfig {
  type: 'table' | 'bar' | 'line' | 'pie' | 'kpi' | 'area' | 'composed' | 'scatter' | 'radial' | 'treemap' | 'funnel' | 'advanced-table';
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

// Professional color palettes
const COLOR_PALETTES = {
  primary: ['#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#84CC16'],
  gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'],
  pastel: ['#A78BFA', '#FB7185', '#34D399', '#FBBF24', '#60A5FA', '#F472B6', '#A3E635', '#FCA5A5'],
  dark: ['#1E293B', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'],
  business: ['#0F172A', '#1E40AF', '#DC2626', '#059669', '#D97706', '#7C3AED', '#BE185D', '#0891B2']
};

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff8a80 0%, #ea80fc 100%)'
];

export function ChartRenderer({ config, className }: ChartRendererProps) {
  const processedData = useMemo(() => {
    if (config.type === 'kpi' && config.data.length > 0) {
      const yField = config.yAxis?.[0];
      if (yField) {
        return config.data.reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);
      }
    }
    return config.data;
  }, [config.data, config.yAxis, config.type]);

  const renderChart = () => {
    if (!config.data || config.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 opacity-20">
              📊
            </div>
            <p>No data available</p>
          </div>
        </div>
      );
    }

    const colors = COLOR_PALETTES.primary;

    switch (config.type) {
      case 'advanced-table':
        return (
          <div className="w-full">
            <div className="rounded-lg border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    {Object.keys(config.data[0]).map((key, index) => (
                      <TableHead key={key} className="text-white font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{key}</span>
                          <Badge variant="secondary" className="text-xs bg-white/20">
                            {typeof config.data[0][key] === 'number' ? '#' : 'T'}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.data.slice(0, 50).map((row, index) => (
                    <TableRow 
                      key={index}
                      className={`
                        ${index % 2 === 0 ? 'bg-white/50 dark:bg-slate-800/50' : 'bg-slate-50/50 dark:bg-slate-900/50'}
                        hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors
                      `}
                    >
                      {Object.entries(row).map(([key, value], cellIndex) => (
                        <TableCell key={key} className="font-medium">
                          {typeof value === 'number' ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                style={{ 
                                  width: `${Math.min((Math.abs(value) / Math.max(...config.data.map(d => Math.abs(d[key]) || 0))) * 100, 100)}px` 
                                }}
                              />
                              <span className="font-mono text-sm">
                                {value.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300">{String(value)}</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {config.data.length > 50 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Showing first 50 rows of {config.data.length} total
              </p>
            )}
          </div>
        );

      case 'table':
        return (
          <div className="w-full">
            <div className="rounded-lg border overflow-hidden shadow-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800">
                    {Object.keys(config.data[0]).map((key) => (
                      <TableHead key={key} className="text-white font-semibold py-4">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.data.slice(0, 20).map((row, index) => (
                    <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {Object.values(row).map((value, cellIndex) => (
                        <TableCell key={cellIndex} className="py-3">
                          {String(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                {colors.map((color, index) => (
                  <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.3}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis 
                dataKey={config.xAxis} 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                stroke="#64748b"
              />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              {config.yAxis?.map((field, index) => (
                <Bar 
                  key={field} 
                  dataKey={field} 
                  fill={`url(#barGradient${index % colors.length})`}
                  radius={[4, 4, 0, 0]}
                  stroke={colors[index % colors.length]}
                  strokeWidth={1}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                {colors.map((color, index) => (
                  <linearGradient key={index} id={`lineGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.05}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis 
                dataKey={config.xAxis}
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              {config.yAxis?.map((field, index) => (
                <Line 
                  key={field} 
                  type="monotone" 
                  dataKey={field} 
                  stroke={colors[index % colors.length]}
                  strokeWidth={3}
                  dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: colors[index % colors.length], strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                {colors.map((color, index) => (
                  <linearGradient key={index} id={`areaGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.1}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis dataKey={config.xAxis} stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              {config.yAxis?.map((field, index) => (
                <Area 
                  key={field} 
                  type="monotone" 
                  dataKey={field} 
                  stroke={colors[index % colors.length]}
                  fill={`url(#areaGradient${index % colors.length})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <defs>
                {colors.map((color, index) => (
                  <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.9}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.6}/>
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={config.data}
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={2}
                dataKey={config.yAxis?.[0]}
                nameKey={config.xAxis}
              >
                {config.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#pieGradient${index % colors.length})`} />
                ))}
                <LabelList 
                  dataKey={config.xAxis} 
                  position="outside" 
                  fill="#374151"
                  fontSize={12}
                />
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radial':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={config.data}>
              <RadialBar
                dataKey={config.yAxis?.[0]}
                cornerRadius={10}
                fill={colors[0]}
              />
              <Legend />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={config.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
              <XAxis dataKey={config.xAxis} stroke="#64748b" />
              <YAxis dataKey={config.yAxis?.[0]} stroke="#64748b" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Scatter fill={colors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'kpi':
        const kpiValue = typeof processedData === 'number' ? processedData : 0;
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800 shadow-xl">
              <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {kpiValue.toLocaleString()}
              </div>
              <div className="text-lg text-muted-foreground font-medium">
                {config.yAxis?.[0] || 'Total'}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="h-2 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                <span className="text-sm text-green-600 font-medium">+12.5%</span>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Chart type not supported
          </div>
        );
    }
  };

  return (
    <Card className={`glass-card border-0 shadow-card overflow-hidden ${className}`}>
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">
              {config.title}
            </CardTitle>
            {config.description && (
              <CardDescription className="mt-1 text-slate-600 dark:text-slate-400">
                {config.description}
              </CardDescription>
            )}
          </div>
          <Badge 
            variant="secondary" 
            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium"
          >
            {config.type.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {renderChart()}
      </CardContent>
    </Card>
  );
}