import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartRenderer } from "./ChartRenderer";

interface ChartDisplayProps {
  chart: any;
  data?: any[];
  showSelectedFields?: boolean;
}

export function ChartDisplay({ chart, data = [], showSelectedFields = false }: ChartDisplayProps) {
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{chart.name}</CardTitle>
            {chart.description && (
              <CardDescription className="text-sm mt-1">
                {chart.description}
              </CardDescription>
            )}
          </div>
          <Badge variant="secondary" className="ml-2">
            {chart.chart_type?.toUpperCase()}
          </Badge>
        </div>
        
        {showSelectedFields && chart.chart_config && (
          <div className="flex flex-wrap gap-2 mt-3">
            {chart.chart_config.xAxis && (
              <Badge variant="outline" className="text-xs">
                X: {chart.chart_config.xAxis}
              </Badge>
            )}
            {chart.chart_config.yAxis?.map((field: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                Y: {field}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="w-full h-64">
          <ChartRenderer
            config={{
              type: chart.chart_type,
              title: chart.name,
              description: chart.description,
              xAxis: chart.chart_config?.xAxis || '',
              yAxis: chart.chart_config?.yAxis || [],
              data: data || []
            }}
            className="w-full h-full"
          />
        </div>
        
        {data.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground text-center">
            {data.length} registros carregados
          </div>
        )}
      </CardContent>
    </Card>
  );
}