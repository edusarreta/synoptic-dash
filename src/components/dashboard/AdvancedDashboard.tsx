import React, { useCallback, useState, useEffect } from 'react';
import { SmartDashboardFilters } from "@/components/dashboard/SmartDashboardFilters";
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  NodeResizer,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { Plus, Settings, Grid3X3, LayoutGrid, Maximize2, Minimize2, Edit2 } from 'lucide-react';
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ChartNodeProps {
  data: {
    chart: any;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    onResize: (id: string, width: number, height: number) => void;
  };
}

const ChartNode = ({ data }: ChartNodeProps) => {
  const { chart, onDelete, onEdit, onResize } = data;
  
  return (
    <>
      <NodeResizer 
        minWidth={250} 
        minHeight={200}
        onResize={(event, params) => {
          onResize(chart.id, params.width, params.height);
        }}
      />
      <Card className="glass-card border-0 shadow-card w-full h-full">
        <CardHeader className="pb-2 px-3 py-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold truncate">{chart.name}</CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={() => onEdit(chart.id)}
                title="Editar Gráfico"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(chart.id)}
                title="Remover Gráfico"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 h-[calc(100%-60px)]">
          <ChartRenderer
            config={{
              type: chart.chart_type,
              title: chart.name,
              description: chart.description,
              xAxis: chart.chart_config?.xAxis || '',
              yAxis: chart.chart_config?.yAxis || [],
              data: chart.filteredData || chart.data || []
            }}
            className="w-full h-full"
          />
        </CardContent>
      </Card>
    </>
  );
};

const nodeTypes = {
  chartNode: ChartNode,
};

interface AdvancedDashboardProps {
  charts: any[];
  onDeleteChart: (id: string) => void;
  onCreateChart: () => void;
  smartFilters?: any;
  onFiltersChange?: (filters: any) => void;
}

export function AdvancedDashboard({ charts, onDeleteChart, onCreateChart, smartFilters, onFiltersChange }: AdvancedDashboardProps) {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layoutMode, setLayoutMode] = useState<'free' | 'grid'>('free');

  useEffect(() => {
    // Convert charts to nodes
    const chartNodes: Node[] = charts.map((chart, index) => ({
      id: chart.id,
      type: 'chartNode',
      position: { 
        x: (index % 3) * 350 + 50, 
        y: Math.floor(index / 3) * 300 + 50 
      },
      data: {
        chart,
        onDelete: handleDeleteChart,
        onEdit: handleEditChart,
        onResize: handleResizeChart,
      },
      style: {
        width: 320,
        height: 250,
      },
    }));
    
    setNodes(chartNodes);
  }, [charts]);

  const handleEditChart = useCallback((chartId: string) => {
    console.log('Navigating to edit chart:', chartId);
    navigate(`/data-hub`);
  }, [navigate]);

  const handleDeleteChart = useCallback((chartId: string) => {
    onDeleteChart(chartId);
    setNodes((nds) => nds.filter((node) => node.id !== chartId));
  }, [onDeleteChart]);

  const handleResizeChart = useCallback((chartId: string, width: number, height: number) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === chartId
          ? { ...node, style: { ...node.style, width, height } }
          : node
      )
    );
    toast.success('Tamanho do gráfico atualizado');
  }, []);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const arrangeInGrid = useCallback(() => {
    setNodes((nds) =>
      nds.map((node, index) => ({
        ...node,
        position: {
          x: (index % 3) * 350 + 50,
          y: Math.floor(index / 3) * 300 + 50,
        },
        style: {
          ...node.style,
          width: 320,
          height: 250,
        },
      }))
    );
    toast.success('Gráficos organizados em grade');
  }, []);

  const autoResize = useCallback((size: 'small' | 'medium' | 'large') => {
    const sizes = {
      small: { width: 280, height: 200 },
      medium: { width: 350, height: 280 },
      large: { width: 450, height: 350 },
    };

    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        style: {
          ...node.style,
          ...sizes[size],
        },
      }))
    );
    toast.success(`Todos os gráficos redimensionados para ${size}`);
  }, []);

  return (
    <div className="space-y-6">
      {/* Smart Filters */}
      {smartFilters && onFiltersChange && charts.length > 0 && (
        <SmartDashboardFilters 
          charts={charts}
          activeFilters={smartFilters}
          onFiltersChange={onFiltersChange}
          className="mb-6"
        />
      )}

      <div className="h-[600px] w-full border rounded-lg bg-background">
        {/* Dashboard Controls */}
        <div className="flex items-center justify-between p-4 border-b bg-background/50">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Dashboard Avançado</h3>
            <span className="text-sm text-muted-foreground">
              {charts.length} gráfico{charts.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Layout Controls */}
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={arrangeInGrid}
                title="Organizar em Grade"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLayoutMode(layoutMode === 'free' ? 'grid' : 'free')}
                title="Alternar Modo de Layout"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>

            {/* Size Controls */}
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => autoResize('small')}
                title="Redimensionar Pequeno"
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => autoResize('medium')}
                title="Redimensionar Médio"
              >
                <Settings className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => autoResize('large')}
                title="Redimensionar Grande"
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>

            <Button size="sm" onClick={() => {
              console.log('Create chart button clicked');
              onCreateChart();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Gráfico
            </Button>
          </div>
        </div>

        {/* React Flow Dashboard */}
        <div className="h-[calc(100%-80px)]">
          {charts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <LayoutGrid className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum gráfico criado ainda</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Comece criando seu primeiro gráfico para visualizar seus dados de forma interativa
              </p>
              <Button onClick={() => {
                console.log('Create first chart button clicked');
                onCreateChart();
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Gráfico
              </Button>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              style={{ backgroundColor: "transparent" }}
              proOptions={{ hideAttribution: true }}
            >
              <Controls />
              <MiniMap 
                zoomable 
                pannable 
                nodeStrokeWidth={3}
                className="!bg-background/80 !border"
              />
              <Background 
                gap={20} 
                size={1}
                className="opacity-30"
              />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  );
}