import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEditorStore } from '../store/editorStore';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Table, 
  TrendingUp,
  Activity,
  Plus,
  Database,
  Layers,
  Settings
} from 'lucide-react';

const chartTypes = [
  { type: 'table' as const, icon: Table, label: 'Tabela' },
  { type: 'bar' as const, icon: BarChart3, label: 'Barra' },
  { type: 'line' as const, icon: LineChart, label: 'Linha' },
  { type: 'area' as const, icon: TrendingUp, label: 'Área' },
  { type: 'timeseries' as const, icon: Activity, label: 'Série Temporal' },
  { type: 'pie' as const, icon: PieChart, label: 'Pizza' },
  { type: 'kpi' as const, icon: Activity, label: 'KPI' }
];

export function EditorSidebar() {
  const { addChart, selectedChartId, charts } = useEditorStore();
  const [collapsed, setCollapsed] = useState(false);
  
  const selectedChart = charts.find(c => c.id === selectedChartId);

  if (collapsed) {
    return (
      <div className="w-12 border-r bg-muted/30 flex flex-col items-center py-4 gap-2">
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => setCollapsed(false)}
        >
          <Layers className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Painel de Ferramentas</h2>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setCollapsed(true)}
          >
            <Layers className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="charts" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="flex-1 p-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Adicionar Gráfico</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {chartTypes.map(({ type, icon: Icon, label }) => (
                <Button
                  key={type}
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => addChart(type)}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {selectedChart && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Gráfico Selecionado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Título</label>
                  <input 
                    className="w-full mt-1 px-3 py-1 text-sm border rounded"
                    value={selectedChart.title}
                    onChange={(e) => {
                      // updateChart logic here
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Tipo</label>
                  <select className="w-full mt-1 px-3 py-1 text-sm border rounded">
                    {chartTypes.map(({ type, label }) => (
                      <option key={type} value={type}>{label}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="data" className="flex-1 p-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                Fontes de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-8">
                Selecione um dataset para começar
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="flex-1 p-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-8">
                Configurações do dashboard
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}