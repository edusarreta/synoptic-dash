import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  BarChart3, 
  LineChart, 
  PieChart, 
  AreaChart, 
  ScatterChart,
  TrendingUp,
  Map,
  Grid3X3
} from "lucide-react";

interface ChartTypePickerProps {
  onSelect: (chartType: string) => void;
  onClose: () => void;
}

const chartTypes = [
  {
    id: 'table',
    name: 'Tabela',
    icon: Table,
    description: 'Dados em formato tabular'
  },
  {
    id: 'scorecard',
    name: 'Cartão de Pontuação',
    icon: TrendingUp,
    description: 'KPI único com comparação'
  },
  {
    id: 'bar',
    name: 'Gráfico de Barras',
    icon: BarChart3,
    description: 'Comparar categorias'
  },
  {
    id: 'column',
    name: 'Gráfico de Colunas',
    icon: BarChart3,
    description: 'Barras verticais'
  },
  {
    id: 'line',
    name: 'Gráfico de Linhas',
    icon: LineChart,
    description: 'Tendências ao longo do tempo'
  },
  {
    id: 'area',
    name: 'Gráfico de Área',
    icon: AreaChart,
    description: 'Volume ao longo do tempo'
  },
  {
    id: 'pie',
    name: 'Gráfico de Pizza',
    icon: PieChart,
    description: 'Proporções de um total'
  },
  {
    id: 'donut',
    name: 'Gráfico de Rosca',
    icon: PieChart,
    description: 'Pizza com centro vazio'
  },
  {
    id: 'scatter',
    name: 'Gráfico de Dispersão',
    icon: ScatterChart,
    description: 'Correlação entre variáveis'
  },
  {
    id: 'geo',
    name: 'Mapa Geográfico',
    icon: Map,
    description: 'Dados por localização'
  },
  {
    id: 'treemap',
    name: 'Mapa de Árvore',
    icon: Grid3X3,
    description: 'Hierarquia de dados'
  }
];

export function ChartTypePicker({ onSelect, onClose }: ChartTypePickerProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-[600px] max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Escolher Tipo de Gráfico</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {chartTypes.map((chart) => {
              const Icon = chart.icon;
              return (
                <Button
                  key={chart.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/50"
                  onClick={() => onSelect(chart.id)}
                >
                  <Icon className="w-8 h-8 text-primary" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{chart.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {chart.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}