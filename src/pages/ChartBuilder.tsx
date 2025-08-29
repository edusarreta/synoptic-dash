import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { BarChart3, LineChart, PieChart, Hash, Table, Play, Save } from "lucide-react";

const SAMPLE_DATA = [
  { month: 'Jan', sales: 4000, profit: 2400, customers: 240 },
  { month: 'Feb', sales: 3000, profit: 1398, customers: 210 },
  { month: 'Mar', sales: 2000, profit: 9800, customers: 290 },
  { month: 'Apr', sales: 2780, profit: 3908, customers: 300 },
  { month: 'May', sales: 1890, profit: 4800, customers: 181 },
  { month: 'Jun', sales: 2390, profit: 3800, customers: 250 },
];

export default function ChartBuilder() {
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const [chartType, setChartType] = useState<'table' | 'bar' | 'line' | 'pie' | 'kpi'>('table');
  const [chartTitle, setChartTitle] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState<string[]>([]);
  const [data, setData] = useState(SAMPLE_DATA);

  const handleExecuteQuery = () => {
    // In a real implementation, this would execute the SQL query
    toast({
      title: "Query Executed",
      description: "Using sample data for preview",
    });
  };

  const handleSaveChart = () => {
    if (!chartTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a chart title",
        variant: "destructive"
      });
      return;
    }

    // In a real implementation, this would save to the database
    toast({
      title: "Chart Saved",
      description: "Your chart has been saved successfully",
    });
  };

  const availableColumns = data.length > 0 ? Object.keys(data[0]) : [];

  if (!permissions?.canCreateCharts) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to create charts.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Chart Builder</h1>
          <p className="text-muted-foreground mt-1">
            Create interactive charts and visualizations from your data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Chart Info */}
            <Card className="glass-card border-0 shadow-card">
              <CardHeader>
                <CardTitle>Chart Configuration</CardTitle>
                <CardDescription>
                  Set up your chart title, type, and data source
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Chart Title</Label>
                  <Input
                    id="title"
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                    placeholder="Enter chart title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={chartDescription}
                    onChange={(e) => setChartDescription(e.target.value)}
                    placeholder="Enter chart description"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Chart Type</Label>
                  <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">
                        <div className="flex items-center gap-2">
                          <Table className="w-4 h-4" />
                          Table
                        </div>
                      </SelectItem>
                      <SelectItem value="bar">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Bar Chart
                        </div>
                      </SelectItem>
                      <SelectItem value="line">
                        <div className="flex items-center gap-2">
                          <LineChart className="w-4 h-4" />
                          Line Chart
                        </div>
                      </SelectItem>
                      <SelectItem value="pie">
                        <div className="flex items-center gap-2">
                          <PieChart className="w-4 h-4" />
                          Pie Chart
                        </div>
                      </SelectItem>
                      <SelectItem value="kpi">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          KPI Card
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Data Configuration */}
            {chartType !== 'table' && chartType !== 'kpi' && (
              <Card className="glass-card border-0 shadow-card">
                <CardHeader>
                  <CardTitle>Data Mapping</CardTitle>
                  <CardDescription>
                    Configure which columns to use for your chart axes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>X-Axis Column</Label>
                    <Select value={xAxis} onValueChange={setXAxis}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select X-axis column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Y-Axis Column(s)</Label>
                    <Select value={yAxis[0] || ''} onValueChange={(value) => setYAxis([value])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Y-axis column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPI Configuration */}
            {chartType === 'kpi' && (
              <Card className="glass-card border-0 shadow-card">
                <CardHeader>
                  <CardTitle>KPI Configuration</CardTitle>
                  <CardDescription>
                    Select the metric to display as a KPI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>Metric Column</Label>
                    <Select value={yAxis[0] || ''} onValueChange={(value) => setYAxis([value])}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select metric column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SQL Query */}
            <Card className="glass-card border-0 shadow-card">
              <CardHeader>
                <CardTitle>SQL Query</CardTitle>
                <CardDescription>
                  Write your SQL query to fetch data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="SELECT * FROM your_table WHERE condition..."
                  className="min-h-32 font-mono"
                />
                <Button onClick={handleExecuteQuery} className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Execute Query
                </Button>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="glass-card border-0 shadow-card">
              <CardContent className="pt-6">
                <Button onClick={handleSaveChart} className="w-full gradient-primary">
                  <Save className="w-4 h-4 mr-2" />
                  Save Chart
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div>
            <ChartRenderer
              config={{
                type: chartType,
                title: chartTitle || 'Chart Preview',
                description: chartDescription,
                xAxis,
                yAxis,
                data
              }}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}